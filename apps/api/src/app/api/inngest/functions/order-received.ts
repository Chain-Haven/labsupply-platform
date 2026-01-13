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
import { OrderStatus } from '@labsupply/shared';

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
                    // Mark order on hold for compliance/inventory
                    await supabase
                        .from('orders')
                        .update({
                            status: OrderStatus.ON_HOLD_COMPLIANCE,
                            supplier_notes: `Insufficient inventory for product ${item.product_id}`,
                        })
                        .eq('id', orderId);

                    throw new Error(`Insufficient inventory for product ${item.product_id}`);
                }
            }

            return true;
        });

        // Step 3: Attempt wallet reservation
        const reservationResult = await step.run('attempt-wallet-reservation', async () => {
            // Get wallet
            const { data: wallet, error: walletError } = await supabase
                .from('wallet_accounts')
                .select('id, balance_cents, reserved_cents')
                .eq('merchant_id', merchantId)
                .single();

            if (walletError || !wallet) {
                return { success: false, reason: 'Wallet not found' };
            }

            const availableBalance = wallet.balance_cents - wallet.reserved_cents;

            if (availableBalance < totalEstimateCents) {
                return {
                    success: false,
                    reason: 'Insufficient funds',
                    available: availableBalance,
                    required: totalEstimateCents,
                };
            }

            // Create reservation
            const newReserved = wallet.reserved_cents + totalEstimateCents;

            const { error: updateError } = await supabase
                .from('wallet_accounts')
                .update({ reserved_cents: newReserved })
                .eq('id', wallet.id);

            if (updateError) {
                return { success: false, reason: 'Failed to create reservation' };
            }

            // Record reservation transaction
            await supabase.from('wallet_transactions').insert({
                merchant_id: merchantId,
                wallet_id: wallet.id,
                type: 'RESERVATION',
                amount_cents: -totalEstimateCents,
                balance_after_cents: wallet.balance_cents,
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
            if (reservationResult.success) {
                // Mark as funded
                await supabase
                    .from('orders')
                    .update({
                        status: OrderStatus.FUNDED,
                        wallet_reservation_id: reservationResult.walletId,
                        funded_at: new Date().toISOString(),
                    })
                    .eq('id', orderId);

                // Log audit event
                await supabase.from('audit_events').insert({
                    merchant_id: merchantId,
                    action: 'order.funded',
                    entity_type: 'order',
                    entity_id: orderId,
                    metadata: { reserved_amount: totalEstimateCents },
                });

                return { status: OrderStatus.FUNDED };
            } else {
                // Mark as awaiting funds
                await supabase
                    .from('orders')
                    .update({
                        status: OrderStatus.AWAITING_FUNDS,
                    })
                    .eq('id', orderId);

                // Create notification for merchant
                await supabase.from('notifications').insert({
                    merchant_id: merchantId,
                    type: 'ORDER_AWAITING_FUNDS',
                    title: 'Order Awaiting Payment',
                    message: `Order requires funding. Available: $${(reservationResult.available! / 100).toFixed(2)}, Required: $${(reservationResult.required! / 100).toFixed(2)}`,
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
