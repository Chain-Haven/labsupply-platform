/**
 * Single Order API
 * GET /v1/orders/[id] - Get order details
 * POST /v1/orders/[id]/cancel - Cancel an order
 */

import { NextRequest } from 'next/server';
import { getServiceClient } from '@/lib/supabase';
import { verifyStoreRequest, successResponse, errorResponse } from '@/lib/auth';
import { ApiError, OrderStatus, isValidStatusTransition } from '@labsupply/shared';

export async function GET(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const store = await verifyStoreRequest(request);
        const supabase = getServiceClient();

        const { data: order, error } = await supabase
            .from('orders')
            .select(`
        *,
        order_items(*),
        shipments(*)
      `)
            .eq('id', params.id)
            .eq('store_id', store.storeId)
            .single();

        if (error || !order) {
            throw new ApiError('ORDER_NOT_FOUND', 'Order not found', 404);
        }

        return successResponse(order);

    } catch (error) {
        return errorResponse(error as Error);
    }
}
