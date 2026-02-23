/**
 * Ship a Shipment
 * POST /v1/shipments/[id]/ship - Mark as shipped with tracking info
 * Triggers the shipment/shipped Inngest event for wallet settlement
 */

import { NextRequest } from 'next/server';
import { getServiceClient } from '@/lib/supabase';
import { verifyAdminRequest, successResponse, errorResponse } from '@/lib/auth';
import { inngest } from '@/lib/inngest';
import { ApiError } from '@whitelabel-peptides/shared';
import { isValidShipmentTransition } from '@/lib/order-helpers';

export async function POST(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        await verifyAdminRequest(request);

        const body = await request.json();
        const { tracking_number, tracking_url, carrier, actual_cost_cents } = body;

        const supabase = getServiceClient();

        // Get shipment + order details
        const { data: shipment, error: shipError } = await supabase
            .from('shipments')
            .select('id, order_id, status, carrier')
            .eq('id', params.id)
            .single();

        if (shipError || !shipment) {
            throw new ApiError('SHIPMENT_NOT_FOUND', 'Shipment not found', 404);
        }

        if (!isValidShipmentTransition(shipment.status, 'IN_TRANSIT')) {
            throw new ApiError(
                'INVALID_SHIPMENT_TRANSITION',
                `Cannot transition shipment from ${shipment.status} to IN_TRANSIT`,
                400
            );
        }

        // Get order to find merchant and store
        const { data: order } = await supabase
            .from('orders')
            .select('id, merchant_id, store_id')
            .eq('id', shipment.order_id)
            .single();

        if (!order) {
            throw new ApiError('ORDER_NOT_FOUND', 'Associated order not found', 404);
        }

        const shipmentUpdate: Record<string, unknown> = {
            status: 'IN_TRANSIT',
            tracking_number: tracking_number || null,
            tracking_url: tracking_url || null,
            carrier: carrier || shipment.carrier,
            shipped_at: new Date().toISOString(),
        };
        if (actual_cost_cents != null) {
            shipmentUpdate.actual_cost_cents = actual_cost_cents;
        }

        await supabase
            .from('shipments')
            .update(shipmentUpdate)
            .eq('id', params.id);

        // Trigger the shipment/shipped Inngest event for wallet settlement
        await inngest.send({
            name: 'shipment/shipped',
            data: {
                shipmentId: shipment.id,
                orderId: shipment.order_id,
                merchantId: order.merchant_id,
                storeId: order.store_id || '',
                trackingNumber: tracking_number || '',
                carrier: carrier || shipment.carrier || '',
            },
        });

        await supabase.from('audit_events').insert({
            merchant_id: order.merchant_id,
            action: 'shipment.shipped',
            entity_type: 'shipment',
            entity_id: shipment.id,
            metadata: { tracking_number, carrier: carrier || shipment.carrier },
        }).then(() => {}, () => {});

        return successResponse({
            shipment_id: shipment.id,
            order_id: shipment.order_id,
            status: 'IN_TRANSIT',
            tracking_number,
        });

    } catch (error) {
        return errorResponse(error as Error);
    }
}
