/**
 * POST /v1/webhooks/shipstation
 * Receives ShipStation webhook events (SHIP_NOTIFY, ITEM_SHIP_NOTIFY, etc.)
 * Updates shipment + order status when delivery is confirmed.
 *
 * Configure in ShipStation: Settings > Stores > Webhook URL
 * ShipStation sends a resource_url that we fetch for full data.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServiceClient } from '@/lib/supabase';
import { recordStatusChange } from '@/lib/order-helpers';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { resource_url, resource_type } = body;

        if (!resource_url) {
            return NextResponse.json({ error: 'Missing resource_url' }, { status: 400 });
        }

        const supabase = getServiceClient();

        // ShipStation sends a URL we must fetch for the actual data
        const ssApiKey = process.env.SHIPSTATION_API_KEY || '';
        const ssApiSecret = process.env.SHIPSTATION_API_SECRET || '';
        const authHeader = `Basic ${Buffer.from(`${ssApiKey}:${ssApiSecret}`).toString('base64')}`;

        const ssResponse = await fetch(resource_url, {
            headers: { Authorization: authHeader },
        });

        if (!ssResponse.ok) {
            console.error(`[ShipStation Webhook] Failed to fetch resource: ${ssResponse.status}`);
            return NextResponse.json({ error: 'Failed to fetch ShipStation resource. The ShipStation API returned an error for the provided resource_url.' }, { status: 502 });
        }

        const data = await ssResponse.json();
        const shipments = data.shipments || data.fulfillments || [data];

        let processed = 0;

        for (const ss of shipments) {
            const trackingNumber = ss.trackingNumber;
            if (!trackingNumber) continue;

            // Find matching shipment by tracking number
            const { data: shipment } = await supabase
                .from('shipments')
                .select('id, order_id, status')
                .eq('tracking_number', trackingNumber)
                .single();

            if (!shipment) continue;

            // Determine new status from ShipStation event
            const isDelivered = resource_type === 'ITEM_SHIP_NOTIFY'
                || ss.shipmentStatus === 'Delivered'
                || ss.deliveryDate;

            if (isDelivered && shipment.status !== 'DELIVERED') {
                await supabase
                    .from('shipments')
                    .update({
                        status: 'DELIVERED',
                        delivered_at: ss.deliveryDate || new Date().toISOString(),
                    })
                    .eq('id', shipment.id);

                // Transition order to COMPLETE
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
            }
        }

        return NextResponse.json({ success: true, processed });
    } catch (error) {
        console.error('[ShipStation Webhook] Error:', error);
        return NextResponse.json({ error: 'ShipStation webhook processing failed unexpectedly. The event was not processed.' }, { status: 500 });
    }
}
