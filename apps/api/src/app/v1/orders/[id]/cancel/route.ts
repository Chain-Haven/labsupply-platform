/**
 * Cancel Order API
 * POST /v1/orders/[id]/cancel
 */

import { NextRequest } from 'next/server';
import { getServiceClient } from '@/lib/supabase';
import { verifyStoreRequest, successResponse, errorResponse } from '@/lib/auth';
import { cancelOrderSchema, ApiError, OrderStatus, isValidStatusTransition } from '@whitelabel-peptides/shared';

export async function POST(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const store = await verifyStoreRequest(request);

        const body = JSON.parse(store.body || '{}');
        const parsed = cancelOrderSchema.safeParse(body);

        if (!parsed.success) {
            throw new ApiError('VALIDATION_ERROR', 'Invalid request', 400);
        }

        const supabase = getServiceClient();

        // Get current order
        const { data: order, error } = await supabase
            .from('orders')
            .select('id, status, merchant_id, wallet_reservation_id, total_estimate_cents')
            .eq('id', params.id)
            .eq('store_id', store.storeId)
            .single();

        if (error || !order) {
            throw new ApiError('ORDER_NOT_FOUND', 'Order not found', 404);
        }

        // Check if cancellation is allowed
        if (!isValidStatusTransition(order.status, OrderStatus.CANCELLED)) {
            throw new ApiError(
                'ORDER_NOT_CANCELLABLE',
                `Cannot cancel order in ${order.status} status`,
                400
            );
        }

        // Release wallet reservation if exists
        if (order.wallet_reservation_id && parsed.data.refund_to_wallet) {
            const { data: wallet } = await supabase
                .from('wallet_accounts')
                .select('id, balance_cents, reserved_cents')
                .eq('merchant_id', order.merchant_id)
                .eq('currency', 'USD')
                .single();

            if (wallet) {
                // Release the reservation
                await supabase
                    .from('wallet_accounts')
                    .update({
                        reserved_cents: Math.max(0, wallet.reserved_cents - order.total_estimate_cents),
                    })
                    .eq('id', wallet.id);

                // Record the release
                await supabase.from('wallet_transactions').insert({
                    merchant_id: order.merchant_id,
                    wallet_id: wallet.id,
                    type: 'RESERVATION_RELEASE',
                    amount_cents: order.total_estimate_cents,
                    balance_after_cents: wallet.balance_cents,
                    reference_type: 'order',
                    reference_id: order.id,
                    description: 'Order cancelled - reservation released',
                });
            }
        }

        // Release inventory reservations for this order's items
        const { data: orderItems } = await supabase
            .from('order_items')
            .select('product_id, qty')
            .eq('order_id', order.id);

        if (orderItems && orderItems.length > 0) {
            for (const item of orderItems) {
                if (item.product_id) {
                    const { data: inv } = await supabase
                        .from('inventory')
                        .select('reserved')
                        .eq('product_id', item.product_id)
                        .single();

                    if (inv) {
                        await supabase
                            .from('inventory')
                            .update({ reserved: Math.max(0, inv.reserved - item.qty) })
                            .eq('product_id', item.product_id);
                    }
                }
            }
        }

        // Update order status
        const { error: updateError } = await supabase
            .from('orders')
            .update({
                status: OrderStatus.CANCELLED,
                supplier_notes: parsed.data.reason
                    ? `Cancelled: ${parsed.data.reason}`
                    : 'Cancelled by merchant',
            })
            .eq('id', order.id);

        if (updateError) {
            throw new ApiError('CANCEL_FAILED', 'Failed to cancel order', 500);
        }

        // Audit log
        await supabase.from('audit_events').insert({
            merchant_id: order.merchant_id,
            action: 'order.cancelled',
            entity_type: 'order',
            entity_id: order.id,
            metadata: { reason: parsed.data.reason },
        });

        return successResponse({ success: true, status: OrderStatus.CANCELLED });

    } catch (error) {
        return errorResponse(error as Error);
    }
}
