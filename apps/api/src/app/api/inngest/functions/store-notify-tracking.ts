/**
 * Store Notify Tracking
 * Triggered after a shipment is shipped.
 * Pushes tracking info back to the merchant's WooCommerce store via signed webhook,
 * with polling as a fallback (tracking/pending endpoint).
 */

import { inngest } from '@/lib/inngest';
import { getServiceClient } from '@/lib/supabase';
import { generateSignature, generateNonce, nowMs } from '@whitelabel-peptides/shared';

export const storeNotifyTrackingFunction = inngest.createFunction(
    {
        id: 'store-notify-tracking',
        name: 'Notify Store of Tracking Update',
        retries: 5,
    },
    { event: 'store/notify-tracking' },
    async ({ event, step }) => {
        const { storeId, orderId, trackingNumber, trackingUrl, carrier } = event.data;
        const supabase = getServiceClient();

        const store = await step.run('get-store', async () => {
            const { data, error } = await supabase
                .from('stores')
                .select('id, url, status, store_secrets!inner(secret_hash)')
                .eq('id', storeId)
                .single();

            if (error || !data) {
                throw new Error(`Store not found: ${storeId}`);
            }

            if (data.status !== 'CONNECTED') {
                throw new Error(`Store ${storeId} is not connected (status: ${data.status})`);
            }

            return data;
        });

        const order = await step.run('get-order', async () => {
            const { data, error } = await supabase
                .from('orders')
                .select('woo_order_id, woo_order_number')
                .eq('id', orderId)
                .single();

            if (error || !data) {
                throw new Error(`Order not found: ${orderId}`);
            }

            return data;
        });

        // Push tracking update to the store's webhook endpoint
        const pushResult = await step.run('push-tracking-to-store', async () => {
            const storeUrl = store.url?.replace(/\/$/, '');
            if (!storeUrl) {
                return { pushed: false, reason: 'No store URL' };
            }

            const secrets = (store as Record<string, unknown>).store_secrets as Array<{ secret_hash: string }> | undefined;
            const secret = secrets?.[0]?.secret_hash;
            if (!secret) {
                return { pushed: false, reason: 'No store secret available' };
            }

            const payload = {
                updates: [{
                    woo_order_id: order.woo_order_id,
                    supplier_order_id: orderId,
                    status: 'shipped' as const,
                    tracking_number: trackingNumber,
                    tracking_url: trackingUrl || '',
                    carrier,
                    shipped_at: new Date().toISOString(),
                }],
            };

            const bodyStr = JSON.stringify(payload);
            const timestamp = nowMs().toString();
            const nonce = generateNonce();
            const signature = generateSignature({
                storeId,
                timestamp,
                nonce,
                body: bodyStr,
                secret,
            });

            const webhookUrl = `${storeUrl}/wp-json/wlp/v1/tracking`;

            try {
                const response = await fetch(webhookUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-Store-Id': storeId,
                        'X-Timestamp': timestamp,
                        'X-Nonce': nonce,
                        'X-Signature': signature,
                    },
                    body: bodyStr,
                    signal: AbortSignal.timeout(15000),
                });

                if (!response.ok) {
                    const text = await response.text().catch(() => '');
                    console.warn(`[StoreNotify] Push to ${webhookUrl} failed (${response.status}): ${text}`);
                    return { pushed: false, reason: `HTTP ${response.status}` };
                }

                return { pushed: true };
            } catch (err) {
                console.warn('[StoreNotify] Push request failed:', (err as Error).message);
                return { pushed: false, reason: (err as Error).message };
            }
        });

        await step.run('record-audit', async () => {
            await supabase.from('audit_events').insert({
                merchant_id: null,
                action: pushResult.pushed ? 'tracking.pushed' : 'tracking.push_failed',
                entity_type: 'order',
                entity_id: orderId,
                metadata: {
                    store_id: storeId,
                    woo_order_id: order.woo_order_id,
                    tracking_number: trackingNumber,
                    carrier,
                    tracking_url: trackingUrl,
                    push_result: pushResult,
                },
            }).then(() => {}, () => {});
        });

        return {
            storeId,
            orderId,
            wooOrderId: order.woo_order_id,
            trackingNumber,
            pushed: pushResult.pushed,
        };
    }
);
