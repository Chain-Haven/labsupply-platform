/**
 * Order Received Workflow
 * Triggered when a new order is created
 * 
 * Steps:
 * 1. Validate SKUs and whitelist
 * 2. Compute estimate
 * 3. Attempt wallet reservation
 * 4. If reserved -> mark FUNDED and enqueue release
 * 5. Else -> mark AWAITING_FUNDS and notify merchant
 */

import { inngest } from '@/lib/inngest';
import { getServiceClient } from '@/lib/supabase';
import { OrderStatus } from '@whitelabel-peptides/shared';
import { recordStatusChange } from '@/lib/order-helpers';

export const orderReceivedFunction = inngest.createFunction(
    {
        id: 'order-received',
        name: 'Process Order Received',
        retries: 3,
    },
    { event: 'order/received' },
    async ({ event, step }) => {
        const { orderId, merchantId, totalEstimateCents } = event.data;
        const supabase = getServiceClient();

        // Step 1: Validate order exists and get details
        const order = await step.run('validate-order', async () => {
            const { data, error } = await supabase
                .from('orders')
                .select(`
          id,
          status,
          merchant_id,
          store_id,
          total_estimate_cents,
          order_items(product_id, qty)
        `)
                .eq('id', orderId)
                .single();

            if (error || !data) {
                throw new Error(`Order not found: ${orderId}`);
            }

            return data;
        });

        // Step 2: Validate inventory availability
        await step.run('validate-inventory', async () => {
            const productIds = order.order_items.map((item: any) => item.product_id);

            const { data: inventory } = await supabase
                .from('inventory')
                .select('product_id, on_hand, reserved')
                .in('product_id', productIds);

            const inventoryMap = new Map(
                inventory?.map((inv: any) => [inv.product_id, inv]) || []
            );

            for (const item of order.order_items) {
                const inv = inventoryMap.get(item.product_id);
                const available = inv ? inv.on_hand - inv.reserved : 0;

                if (available < item.qty) {
                    await supabase
                        .from('orders')
                        .update({
                            status: OrderStatus.ON_HOLD_COMPLIANCE,
                            supplier_notes: `Insufficient inventory for product ${item.product_id}`,
                        })
                        .eq('id', orderId);

                    await recordStatusChange(supabase, orderId, order.status, OrderStatus.ON_HOLD_COMPLIANCE, undefined, `Insufficient inventory for product ${item.product_id}`);
                    throw new Error(`Insufficient inventory for product ${item.product_id}`);
                }
            }

            // Reserve inventory for each item
            for (const item of order.order_items) {
                const inv = inventoryMap.get(item.product_id);
                if (inv) {
                    await supabase
                        .from('inventory')
                        .update({ reserved: inv.reserved + item.qty })
                        .eq('product_id', item.product_id)
                        .eq('reserved', inv.reserved); // optimistic lock
                }
            }

            return true;
        });

        // Step 3: Attempt wallet reservation
        const reservationResult = await step.run('attempt-wallet-reservation', async () => {
            // Get USD wallet (orders use USD)
            const { data: wallet, error: walletError } = await supabase
                .from('wallet_accounts')
                .select('id, balance_cents, reserved_cents')
                .eq('merchant_id', merchantId)
                .eq('currency', 'USD')
                .single();

            if (walletError || !wallet) {
                return { success: false, reason: 'Wallet not found' };
            }

            // Subtract $500 compliance reserve from available balance (consistent with orders/route.ts)
            const COMPLIANCE_RESERVE_CENTS = 50000;
            const availableBalance = wallet.balance_cents - wallet.reserved_cents - COMPLIANCE_RESERVE_CENTS;

            if (availableBalance < totalEstimateCents) {
                return {
                    success: false,
                    reason: 'Insufficient funds',
                    available: availableBalance,
                    required: totalEstimateCents,
                };
            }

            // Create reservation with optimistic locking to prevent race conditions
            const newReserved = wallet.reserved_cents + totalEstimateCents;

            const { error: updateError, count } = await supabase
                .from('wallet_accounts')
                .update({ reserved_cents: newReserved })
                .eq('id', wallet.id)
                .eq('reserved_cents', wallet.reserved_cents); // optimistic lock

            if (updateError || count === 0) {
                return { success: false, reason: 'Reservation conflict (concurrent update). Will retry.' };
            }

            // Record reservation transaction
            await supabase.from('wallet_transactions').insert({
                merchant_id: merchantId,
                wallet_id: wallet.id,
                type: 'RESERVATION',
                amount_cents: -totalEstimateCents,
                balance_after_cents: wallet.balance_cents - totalEstimateCents,
                reference_type: 'order',
                reference_id: orderId,
                description: `Reservation for order ${orderId}`,
            });

            return {
                success: true,
                walletId: wallet.id,
                reservedAmount: totalEstimateCents,
            };
        });

        // Step 4: Update order status based on reservation result
        await step.run('update-order-status', async () => {
            if (reservationResult.success && 'walletId' in reservationResult) {
                // Mark as funded
                await supabase
                    .from('orders')
                    .update({
                        status: OrderStatus.FUNDED,
                        wallet_reservation_id: reservationResult.walletId,
                        funded_at: new Date().toISOString(),
                    })
                    .eq('id', orderId);

                await recordStatusChange(supabase, orderId, order.status, OrderStatus.FUNDED, undefined, 'Wallet reservation succeeded');

                await supabase.from('audit_events').insert({
                    merchant_id: merchantId,
                    action: 'order.funded',
                    entity_type: 'order',
                    entity_id: orderId,
                    metadata: { reserved_amount: totalEstimateCents },
                });

                return { status: OrderStatus.FUNDED };
            } else {
                await supabase
                    .from('orders')
                    .update({
                        status: OrderStatus.AWAITING_FUNDS,
                    })
                    .eq('id', orderId);

                await recordStatusChange(supabase, orderId, order.status, OrderStatus.AWAITING_FUNDS, undefined, 'Insufficient funds');

                const available = 'available' in reservationResult ? (reservationResult.available as number) : 0;
                const required = 'required' in reservationResult ? (reservationResult.required as number) : totalEstimateCents;

                // Create notification for merchant
                await supabase.from('notifications').insert({
                    merchant_id: merchantId,
                    type: 'ORDER_AWAITING_FUNDS',
                    title: 'Order Awaiting Payment',
                    message: `Order requires funding. Available: $${(available / 100).toFixed(2)}, Required: $${(required / 100).toFixed(2)}`,
                    data: { order_id: orderId },
                });

                return { status: OrderStatus.AWAITING_FUNDS };
            }
        });

        return {
            orderId,
            funded: reservationResult.success,
            finalStatus: reservationResult.success ? OrderStatus.FUNDED : OrderStatus.AWAITING_FUNDS,
        };
    }
);
