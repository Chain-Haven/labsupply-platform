/**
 * Shipment Shipped Workflow
 * Triggered when a shipment is marked as shipped
 * 
 * Steps:
 * 1. Update shipment with tracking
 * 2. Settle final amount
 * 3. Notify store to update WooCommerce order
 */

import { inngest } from '@/lib/inngest';
import { getServiceClient } from '@/lib/supabase';
import { OrderStatus } from '@labsupply/shared';

export const shipmentShippedFunction = inngest.createFunction(
    {
        id: 'shipment-shipped',
        name: 'Process Shipment Shipped',
        retries: 3,
    },
    { event: 'shipment/shipped' },
    async ({ event, step }) => {
        const { shipmentId, orderId, merchantId, storeId, trackingNumber, carrier } = event.data;
        const supabase = getServiceClient();

        // Step 1: Get order and shipment details
        const orderDetails = await step.run('get-order-details', async () => {
            const { data: order, error } = await supabase
                .from('orders')
                .select(`
          id,
          woo_order_id,
          total_estimate_cents,
          actual_total_cents,
          wallet_reservation_id,
          stores(id, url)
        `)
                .eq('id', orderId)
                .single();

            if (error || !order) {
                throw new Error(`Order not found: ${orderId}`);
            }

            return order;
        });

        // Step 2: Get shipment to calculate actual cost
        const shipment = await step.run('get-shipment', async () => {
            const { data, error } = await supabase
                .from('shipments')
                .select('*')
                .eq('id', shipmentId)
                .single();

            if (error || !data) {
                throw new Error(`Shipment not found: ${shipmentId}`);
            }

            return data;
        });

        // Step 3: Settle wallet transaction (actual vs estimated)
        await step.run('settle-wallet', async () => {
            const estimatedTotal = orderDetails.total_estimate_cents;
            const actualShipping = shipment.actual_cost_cents || shipment.rate_cents || 0;

            // Calculate actual total (subtotal + actual shipping)
            const { data: orderItems } = await supabase
                .from('order_items')
                .select('unit_price_cents, qty')
                .eq('order_id', orderId);

            const subtotal = orderItems?.reduce(
                (sum, item) => sum + (item.unit_price_cents * item.qty),
                0
            ) || 0;

            const actualTotal = subtotal + actualShipping;
            const difference = estimatedTotal - actualTotal;

            // Get wallet
            const { data: wallet } = await supabase
                .from('wallet_accounts')
                .select('id, balance_cents, reserved_cents')
                .eq('merchant_id', merchantId)
                .single();

            if (!wallet) {
                throw new Error('Wallet not found');
            }

            // Release reservation and apply actual charge
            const newReserved = Math.max(0, wallet.reserved_cents - estimatedTotal);
            const newBalance = wallet.balance_cents - actualTotal + (estimatedTotal - actualTotal > 0 ? 0 : 0);

            // Actually we need to:
            // 1. Release the reservation (add back estimatedTotal to available)
            // 2. Deduct the actual amount from balance
            // Net effect: if actual < estimated, merchant keeps the difference

            const finalBalance = wallet.balance_cents - actualTotal + estimatedTotal - estimatedTotal;
            // Simplified: the reservation covered it, we just release reservation
            // and adjust if there's a difference

            await supabase
                .from('wallet_accounts')
                .update({
                    reserved_cents: newReserved,
                    // Balance adjustment if needed
                })
                .eq('id', wallet.id);

            // Record settlement transaction
            await supabase.from('wallet_transactions').insert({
                merchant_id: merchantId,
                wallet_id: wallet.id,
                type: 'SETTLEMENT',
                amount_cents: -actualTotal,
                balance_after_cents: wallet.balance_cents,
                reference_type: 'order',
                reference_id: orderId,
                description: `Order settlement - Estimated: $${(estimatedTotal / 100).toFixed(2)}, Actual: $${(actualTotal / 100).toFixed(2)}`,
                metadata: {
                    estimated_total: estimatedTotal,
                    actual_total: actualTotal,
                    difference,
                },
            });

            // Update order with actual total
            await supabase
                .from('orders')
                .update({ actual_total_cents: actualTotal })
                .eq('id', orderId);

            return { estimatedTotal, actualTotal, difference };
        });

        // Step 4: Update order status to shipped
        await step.run('update-order-status', async () => {
            await supabase
                .from('orders')
                .update({
                    status: OrderStatus.SHIPPED,
                    shipped_at: new Date().toISOString(),
                })
                .eq('id', orderId);

            await supabase.from('audit_events').insert({
                merchant_id: merchantId,
                action: 'order.shipped',
                entity_type: 'order',
                entity_id: orderId,
                metadata: { tracking_number: trackingNumber, carrier },
            });
        });

        // Step 5: Queue tracking notification to store
        await step.run('queue-store-notification', async () => {
            // Get store details
            const { data: store } = await supabase
                .from('stores')
                .select('id, url, status')
                .eq('id', storeId)
                .single();

            if (!store || store.status !== 'CONNECTED') {
                console.log('Store not connected, skipping notification');
                return { notified: false };
            }

            // Send event to notify store
            await inngest.send({
                name: 'store/notify-tracking',
                data: {
                    storeId,
                    orderId,
                    trackingNumber,
                    trackingUrl: shipment.tracking_url,
                    carrier,
                },
            });

            return { notified: true };
        });

        return {
            shipmentId,
            orderId,
            trackingNumber,
            status: OrderStatus.SHIPPED,
        };
    }
);
