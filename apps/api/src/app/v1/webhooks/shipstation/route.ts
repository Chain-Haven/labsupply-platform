/**
 * POST /v1/webhooks/shipstation
 * Receives ShipStation webhook events (SHIP_NOTIFY, ITEM_SHIP_NOTIFY, etc.)
 * Updates shipment + order status based on event type.
 *
 * Security:
 * - Validates resource_url is from ssapi.shipstation.com (SSRF prevention)
 * - Optionally verifies SHIPSTATION_WEBHOOK_SECRET header
 * - Fetch timeout of 10 seconds
 *
 * Event mapping:
 * - SHIP_NOTIFY / ITEM_SHIP_NOTIFY -> shipment IN_TRANSIT (do NOT complete order)
 * - Delivered status from ShipStation -> shipment DELIVERED, order COMPLETE
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServiceClient } from '@/lib/supabase';
import { recordStatusChange } from '@/lib/order-helpers';

const ALLOWED_HOSTS = new Set(['ssapi.shipstation.com']);

export async function POST(request: NextRequest) {
    try {
        const webhookSecret = process.env.SHIPSTATION_WEBHOOK_SECRET;
        if (webhookSecret) {
            const headerSecret = request.headers.get('x-ss-webhook-secret')
                || request.headers.get('x-shipstation-webhook-secret');
            if (headerSecret !== webhookSecret) {
                return NextResponse.json({ error: 'Invalid webhook secret' }, { status: 401 });
            }
        }

        const body = await request.json();
        const { resource_url, resource_type } = body;

        if (!resource_url) {
            return NextResponse.json({ error: 'Missing resource_url' }, { status: 400 });
        }

        let parsedUrl: URL;
        try {
            parsedUrl = new URL(resource_url);
        } catch {
            return NextResponse.json({ error: 'Invalid resource_url' }, { status: 400 });
        }

        if (!ALLOWED_HOSTS.has(parsedUrl.hostname)) {
            console.warn(`[ShipStation Webhook] Blocked fetch to disallowed host: ${parsedUrl.hostname}`);
            return NextResponse.json({ error: 'Resource URL host not allowed' }, { status: 400 });
        }

        const supabase = getServiceClient();

        const ssApiKey = process.env.SHIPSTATION_API_KEY || '';
        const ssApiSecret = process.env.SHIPSTATION_API_SECRET || '';
        const authHeader = `Basic ${Buffer.from(`${ssApiKey}:${ssApiSecret}`).toString('base64')}`;

        const ssResponse = await fetch(resource_url, {
            headers: { Authorization: authHeader },
            signal: AbortSignal.timeout(10000),
        });

        if (!ssResponse.ok) {
            console.error(`[ShipStation Webhook] Failed to fetch resource: ${ssResponse.status}`);
            return NextResponse.json({ error: 'Failed to fetch ShipStation resource' }, { status: 502 });
        }

        const data = await ssResponse.json();
        const shipments = data.shipments || data.fulfillments || [data];

        let processed = 0;

        for (const ss of shipments) {
            const trackingNumber = ss.trackingNumber;
            if (!trackingNumber) continue;

            const { data: shipment } = await supabase
                .from('shipments')
                .select('id, order_id, status')
                .eq('tracking_number', trackingNumber)
                .single();

            if (!shipment) continue;

            const isDelivered = ss.shipmentStatus === 'Delivered';
            const isShipped = resource_type === 'ITEM_SHIP_NOTIFY'
                || resource_type === 'SHIP_NOTIFY'
                || ss.shipmentStatus === 'Shipped'
                || ss.shipmentStatus === 'In Transit';

            if (isDelivered && shipment.status !== 'DELIVERED') {
                await supabase
                    .from('shipments')
                    .update({
                        status: 'DELIVERED',
                        delivered_at: ss.deliveryDate || new Date().toISOString(),
                    })
                    .eq('id', shipment.id);

                const { data: order } = await supabase
                    .from('orders')
                    .select('id, status')
                    .eq('id', shipment.order_id)
                    .single();

                if (order && order.status === 'SHIPPED') {
                    await supabase
                        .from('orders')
                        .update({
                            status: 'COMPLETE',
                            completed_at: new Date().toISOString(),
                        })
                        .eq('id', order.id);

                    await recordStatusChange(supabase, order.id, 'SHIPPED', 'COMPLETE', undefined, 'Delivery confirmed via ShipStation webhook');
                }

                processed++;
            } else if (isShipped && (shipment.status === 'PENDING' || shipment.status === 'LABEL_CREATED')) {
                await supabase
                    .from('shipments')
                    .update({
                        status: 'IN_TRANSIT',
                        shipped_at: ss.shipDate || new Date().toISOString(),
                        tracking_url: ss.trackingUrl || undefined,
                    })
                    .eq('id', shipment.id);

                processed++;
            }
        }

        return NextResponse.json({ success: true, processed });
    } catch (error) {
        console.error('[ShipStation Webhook] Error:', error);
        return NextResponse.json({ error: 'ShipStation webhook processing failed' }, { status: 500 });
    }
}
