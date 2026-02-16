/**
 * POST /v1/tracking/acknowledge
 * Acknowledges that tracking updates have been processed by the WooCommerce plugin.
 * Body: { order_ids: string[] }
 */

import { NextRequest } from 'next/server';
import { getServiceClient } from '@/lib/supabase';
import { verifyStoreRequest, successResponse, errorResponse } from '@/lib/auth';

export async function POST(request: NextRequest) {
    try {
        const store = await verifyStoreRequest(request);
        const body = JSON.parse(store.body || '{}');
        const orderIds: string[] = body.order_ids || [];

        if (!orderIds.length) {
            return successResponse({ acknowledged: 0 });
        }

        const supabase = getServiceClient();

        // Mark these orders as complete (tracking delivered to WooCommerce)
        const { error, count } = await supabase
            .from('orders')
            .update({ status: 'COMPLETE', completed_at: new Date().toISOString() })
            .eq('store_id', store.storeId)
            .eq('status', 'SHIPPED')
            .in('id', orderIds);

        if (error) {
            // Table may not exist
            return successResponse({ acknowledged: 0 });
        }

        return successResponse({ acknowledged: count || 0 });
    } catch (error) {
        return errorResponse(error as Error);
    }
}
