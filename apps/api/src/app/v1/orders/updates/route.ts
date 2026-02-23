/**
 * GET /v1/orders/updates
 * Delta-sync endpoint: returns orders updated since a given timestamp.
 * Used by the WooCommerce plugin for lightweight status polling.
 */

import { NextRequest } from 'next/server';
import { getServiceClient } from '@/lib/supabase';
import { verifyStoreRequest, successResponse, errorResponse } from '@/lib/auth';

export async function GET(request: NextRequest) {
    try {
        const store = await verifyStoreRequest(request);
        const { searchParams } = new URL(request.url);
        const since = searchParams.get('since');
        const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 200);

        const supabase = getServiceClient();

        let query = supabase
            .from('orders')
            .select('id, status, updated_at')
            .eq('store_id', store.storeId)
            .order('updated_at', { ascending: true })
            .limit(limit);

        if (since) {
            query = query.gt('updated_at', since);
        }

        const { data: orders, error } = await query;

        if (error) {
            return successResponse({ updates: [] });
        }

        const updates = (orders || []).map((o) => ({
            order_id: o.id,
            status: o.status,
            updated_at: o.updated_at,
        }));

        return successResponse({ updates });
    } catch (error) {
        return errorResponse(error as Error);
    }
}
