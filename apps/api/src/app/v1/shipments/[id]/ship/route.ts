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

export async function POST(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        await verifyAdminRequest(request);

        const body = await request.json();
        const { tracking_number, tracking_url, carrier } = body;

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

        if (shipment.status === 'DELIVERED' || shipment.status === 'IN_TRANSIT') {
            throw new ApiError('ALREADY_SHIPPED', 'Shipment has already been shipped', 400);
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

        // Update shipment with tracking
        await supabase
            .from('shipments')
            .update({
                status: 'IN_TRANSIT',
                tracking_number: tracking_number || null,
                tracking_url: tracking_url || null,
                carrier: carrier || shipment.carrier,
                shipped_at: new Date().toISOString(),
            })
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
