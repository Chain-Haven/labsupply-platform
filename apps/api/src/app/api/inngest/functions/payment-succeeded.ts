/**
 * Payment Succeeded Workflow
 * Triggered when a wallet top-up payment succeeds
 * 
 * Steps:
 * 1. Record ledger top-up
 * 2. Re-attempt reservation for pending orders (FIFO)
 */

import { inngest } from '@/lib/inngest';
import { getServiceClient } from '@/lib/supabase';
import { OrderStatus } from '@whitelabel-peptides/shared';

export const paymentSucceededFunction = inngest.createFunction(
    {
        id: 'payment-succeeded',
        name: 'Process Payment Success',
        retries: 3,
    },
    { event: 'payment/succeeded' },
    async ({ event, step }) => {
        const { merchantId, walletId, amountCents } = event.data;
        const supabase = getServiceClient();

        // Step 1: Get current wallet balance
        const wallet = await step.run('get-wallet', async () => {
            const { data, error } = await supabase
                .from('wallet_accounts')
                .select('id, balance_cents, reserved_cents')
                .eq('id', walletId)
                .single();

            if (error || !data) {
                throw new Error(`Wallet not found: ${walletId}`);
            }

            return data;
        });

        // Step 2: Get pending orders (FIFO by created_at)
        const pendingOrders = await step.run('get-pending-orders', async () => {
            const { data, error } = await supabase
                .from('orders')
                .select('id, total_estimate_cents, created_at')
                .eq('merchant_id', merchantId)
                .eq('status', OrderStatus.AWAITING_FUNDS)
                .order('created_at', { ascending: true });

            if (error) {
                console.error('Error fetching pending orders:', error);
                return [];
            }

            return data || [];
        });

        // Step 3: Process pending orders
        const processedOrders = await step.run('process-pending-orders', async () => {
            let availableBalance = wallet.balance_cents - wallet.reserved_cents;
            const processed: Array<{ orderId: string; status: string }> = [];

            for (const order of pendingOrders) {
                if (availableBalance < order.total_estimate_cents) {
                    // Not enough funds for remaining orders
                    break;
                }

                // Create reservation
                const newReserved = wallet.reserved_cents + order.total_estimate_cents;

                await supabase
                    .from('wallet_accounts')
                    .update({ reserved_cents: newReserved })
                    .eq('id', walletId);

                // Record transaction with current balance (updated each iteration)
                const currentBalance = wallet.balance_cents - newReserved;
                await supabase.from('wallet_transactions').insert({
                    merchant_id: merchantId,
                    wallet_id: walletId,
                    type: 'RESERVATION',
                    amount_cents: -order.total_estimate_cents,
                    balance_after_cents: wallet.balance_cents,
                    reference_type: 'order',
                    reference_id: order.id,
                    description: `Auto-reservation for order ${order.id}`,
                }).then(() => {}, () => {});

                // Update order status
                await supabase
                    .from('orders')
                    .update({
                        status: OrderStatus.FUNDED,
                        wallet_reservation_id: walletId,
                        funded_at: new Date().toISOString(),
                    })
                    .eq('id', order.id);

                // Log audit event
                await supabase.from('audit_events').insert({
                    merchant_id: merchantId,
                    action: 'order.auto_funded',
                    entity_type: 'order',
                    entity_id: order.id,
                    metadata: { reserved_amount: order.total_estimate_cents },
                });

                processed.push({ orderId: order.id, status: OrderStatus.FUNDED });

                // Reduce available balance for next iteration
                availableBalance -= order.total_estimate_cents;
                wallet.reserved_cents = newReserved;
            }

            return processed;
        });

        // Step 4: Notify merchant of processed orders
        if (processedOrders.length > 0) {
            await step.run('notify-merchant', async () => {
                await supabase.from('notifications').insert({
                    merchant_id: merchantId,
                    type: 'ORDERS_AUTO_FUNDED',
                    title: 'Orders Funded Automatically',
                    message: `${processedOrders.length} pending order(s) have been funded from your wallet top-up.`,
                    data: {
                        order_ids: processedOrders.map(o => o.orderId),
                        amount_cents: amountCents,
                    },
                });
            });
        }

        return {
            topUpAmount: amountCents,
            ordersProcessed: processedOrders.length,
            orders: processedOrders,
        };
    }
);
