/**
 * Shipments API
 * POST /v1/shipments - Create a shipment for an order (admin action)
 */

import { NextRequest } from 'next/server';
import { getServiceClient } from '@/lib/supabase';
import { verifyAdminRequest, successResponse, errorResponse } from '@/lib/auth';
import { ApiError, OrderStatus, isValidStatusTransition } from '@whitelabel-peptides/shared';
import { recordStatusChange } from '@/lib/order-helpers';
import { getShippingProvider, getOriginAddress, type ShippingAddress } from '@/lib/shipping';

export async function POST(request: NextRequest) {
    try {
        await verifyAdminRequest(request);

        const body = await request.json();
        const { order_id, carrier, service, weight_oz } = body;

        if (!order_id || !carrier || !service) {
            throw new ApiError('VALIDATION_ERROR', 'order_id, carrier, and service are required', 400);
        }

        const supabase = getServiceClient();

        const { data: order, error: orderError } = await supabase
            .from('orders')
            .select('id, status, merchant_id, store_id, shipping_address')
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
            throw new ApiError('SHIPMENT_CREATE_FAILED', 'Failed to create shipment record. The database rejected the insert — verify the order is in a shippable state.', 500);
        }

        // Attempt to buy a label via the configured shipping provider
        let labelResult: {
            tracking_number?: string;
            tracking_url?: string;
            label_url?: string;
            rate_cents?: number;
        } = {};

        const provider = getShippingProvider();
        if (provider.name !== 'stub') {
            try {
                const addr = order.shipping_address as Record<string, string>;
                const toAddress: ShippingAddress = {
                    name: [addr.first_name, addr.last_name].filter(Boolean).join(' '),
                    company: addr.company,
                    street1: addr.address_1,
                    street2: addr.address_2,
                    city: addr.city,
                    state: addr.state,
                    zip: addr.postcode,
                    country: addr.country,
                    phone: addr.phone,
                    email: addr.email,
                };

                const label = await provider.buyLabel(
                    getOriginAddress(),
                    toAddress,
                    { length: 10, width: 8, height: 4, weight: weight_oz || 16, unit: 'oz', dimensionUnit: 'in' },
                    carrier,
                    service
                );

                labelResult = {
                    tracking_number: label.trackingNumber,
                    tracking_url: label.trackingUrl,
                    label_url: label.labelUrl,
                    rate_cents: label.rate,
                };

                await supabase
                    .from('shipments')
                    .update({
                        status: 'LABEL_CREATED',
                        tracking_number: label.trackingNumber,
                        tracking_url: label.trackingUrl,
                        label_storage_path: label.labelUrl,
                        rate_cents: label.rate,
                    })
                    .eq('id', shipment.id);
            } catch (labelErr) {
                console.error('[Shipping] Label purchase failed, shipment stays PENDING:', labelErr);
            }
        }

        // Advance order status with validated transition
        const targetStatus = OrderStatus.PACKED;
        if (isValidStatusTransition(order.status, targetStatus)) {
            await supabase
                .from('orders')
                .update({ status: targetStatus })
                .eq('id', order_id);

            await recordStatusChange(supabase, order_id, order.status, targetStatus, undefined, 'Shipment created');
        }

        await supabase.from('audit_events').insert({
            merchant_id: order.merchant_id,
            action: 'shipment.created',
            entity_type: 'shipment',
            entity_id: shipment.id,
            metadata: { order_id, carrier, service, ...labelResult },
        }).then(() => {}, () => {});

        return successResponse({
            shipment_id: shipment.id,
            order_id,
            status: labelResult.tracking_number ? 'LABEL_CREATED' : 'PENDING',
            carrier,
            service,
            tracking_number: labelResult.tracking_number || null,
            tracking_url: labelResult.tracking_url || null,
            label_url: labelResult.label_url || null,
            rate_cents: labelResult.rate_cents || null,
        }, 201);

    } catch (error) {
        return errorResponse(error as Error);
    }
}
