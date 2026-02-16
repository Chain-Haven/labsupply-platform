/**
 * Shipments API
 * POST /v1/shipments - Create a shipment for an order (admin action)
 */

import { NextRequest } from 'next/server';
import { getServiceClient } from '@/lib/supabase';
import { verifyAdminRequest, successResponse, errorResponse } from '@/lib/auth';
import { ApiError, OrderStatus } from '@labsupply/shared';

export async function POST(request: NextRequest) {
    try {
        await verifyAdminRequest(request);

        const body = await request.json();
        const { order_id, carrier, service, weight_oz } = body;

        if (!order_id || !carrier || !service) {
            throw new ApiError('VALIDATION_ERROR', 'order_id, carrier, and service are required', 400);
        }

        const supabase = getServiceClient();

        // Verify order exists and is in a shippable state
        const { data: order, error: orderError } = await supabase
            .from('orders')
            .select('id, status, merchant_id, store_id')
            .eq('id', order_id)
            .single();

        if (orderError || !order) {
            throw new ApiError('ORDER_NOT_FOUND', 'Order not found', 404);
        }

        const shippableStatuses = [OrderStatus.FUNDED, 'RELEASED_TO_FULFILLMENT', 'PICKING', 'PACKED'];
        if (!shippableStatuses.includes(order.status)) {
            throw new ApiError('ORDER_NOT_SHIPPABLE', `Order is in ${order.status} status and cannot be shipped`, 400);
        }

        // Create shipment record
        const { data: shipment, error: shipError } = await supabase
            .from('shipments')
            .insert({
                order_id,
                status: 'PENDING',
                carrier,
                service,
                weight_oz: weight_oz || null,
            })
            .select()
            .single();

        if (shipError || !shipment) {
            throw new ApiError('SHIPMENT_CREATE_FAILED', 'Failed to create shipment', 500);
        }

        // Advance order status
        await supabase
            .from('orders')
            .update({ status: 'PACKED' })
            .eq('id', order_id);

        await supabase.from('audit_events').insert({
            merchant_id: order.merchant_id,
            action: 'shipment.created',
            entity_type: 'shipment',
            entity_id: shipment.id,
            metadata: { order_id, carrier, service },
        }).then(() => {}, () => {});

        return successResponse({
            shipment_id: shipment.id,
            order_id,
            status: 'PENDING',
            carrier,
            service,
        }, 201);

    } catch (error) {
        return errorResponse(error as Error);
    }
}
