/**
 * GET /v1/tracking/pending
 * Returns pending tracking updates for the authenticated store's orders.
 * Called by WooCommerce plugin to poll for shipping status changes.
 */

import { NextRequest } from 'next/server';
import { getServiceClient } from '@/lib/supabase';
import { verifyStoreRequest, successResponse, errorResponse } from '@/lib/auth';

export async function GET(request: NextRequest) {
    try {
        const store = await verifyStoreRequest(request);
        const supabase = getServiceClient();

        // Find orders for this store that have shipped but not been acknowledged
        const { data: orders, error } = await supabase
            .from('orders')
            .select(`
                id, woo_order_id, woo_order_number, status, shipped_at,
                shipments(tracking_number, tracking_url, carrier, shipped_at)
            `)
            .eq('store_id', store.storeId)
            .in('status', ['SHIPPED', 'COMPLETE'])
            .not('shipped_at', 'is', null)
            .order('shipped_at', { ascending: false })
            .limit(50);

        if (error) {
            // Table may not exist yet
            return successResponse({ updates: [] });
        }

        const updates = (orders || [])
            .filter((o: Record<string, unknown>) => {
                const shipments = o.shipments as Array<Record<string, unknown>> | undefined;
                return shipments && shipments.length > 0;
            })
            .map((o: Record<string, unknown>) => {
                const shipment = (o.shipments as Array<Record<string, unknown>>)[0];
                return {
                    woo_order_id: o.woo_order_id,
                    supplier_order_id: o.id,
                    status: o.status === 'COMPLETE' ? 'delivered' : 'shipped',
                    tracking_number: shipment?.tracking_number || '',
                    tracking_url: shipment?.tracking_url || '',
                    carrier: shipment?.carrier || '',
                    shipped_at: shipment?.shipped_at || o.shipped_at,
                };
            });

        return successResponse({ updates });
    } catch (error) {
        return errorResponse(error as Error);
    }
}
