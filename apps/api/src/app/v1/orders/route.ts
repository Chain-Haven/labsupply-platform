/**
 * Orders API
 * POST /v1/orders - Create a new order
 * GET /v1/orders - List orders for the store
 */

import { NextRequest } from 'next/server';
import { getServiceClient } from '@/lib/supabase';
import { verifyStoreRequest, successResponse, errorResponse } from '@/lib/auth';
import { inngest } from '@/lib/inngest';
import {
    createOrderSchema,
    generateOrderIdempotencyKey,
    ApiError,
    OrderStatus,
} from '@whitelabel-peptides/shared';

export async function POST(request: NextRequest) {
    try {
        const store = await verifyStoreRequest(request);

        // Parse body from auth result (request stream already consumed by verifyStoreRequest)
        const body = JSON.parse(store.body || '{}');
        const parsed = createOrderSchema.safeParse(body);

        if (!parsed.success) {
            throw new ApiError('VALIDATION_ERROR', 'Invalid order data', 400, {
                errors: parsed.error.flatten().fieldErrors,
            });
        }

        const orderData = parsed.data;
        const supabase = getServiceClient();

        // Generate idempotency key
        const idempotencyKey = generateOrderIdempotencyKey(
            store.storeId,
            orderData.woo_order_id,
            'create'
        );

        // Check for existing order (idempotency)
        const { data: existingOrder } = await supabase
            .from('orders')
            .select('id, status')
            .eq('idempotency_key', idempotencyKey)
            .single();

        if (existingOrder) {
            // Return existing order (idempotent)
            const { data: wallet } = await supabase
                .from('wallet_accounts')
                .select('balance_cents, reserved_cents')
                .eq('merchant_id', store.merchantId)
                .eq('currency', 'USD')
                .single();

            return successResponse({
                supplier_order_id: existingOrder.id,
                status: existingOrder.status,
                is_duplicate: true,
                wallet_balance_cents: wallet?.balance_cents || 0,
                is_funded: existingOrder.status !== OrderStatus.AWAITING_FUNDS,
            });
        }

        // Validate and resolve products
        const skus = orderData.items.map((item) => item.supplier_sku);

        const { data: products, error: productsError } = await supabase
            .from('products')
            .select('id, sku, name, cost_cents')
            .in('sku', skus)
            .eq('active', true);

        if (productsError || !products?.length) {
            throw new ApiError('PRODUCTS_NOT_FOUND', 'One or more products not found', 400);
        }

        const productMap = new Map(products.map((p) => [p.sku, p]));

        // Verify all SKUs are whitelisted for this merchant
        const { data: merchantProducts } = await supabase
            .from('merchant_products')
            .select('product_id, wholesale_price_cents')
            .eq('merchant_id', store.merchantId)
            .eq('allowed', true)
            .in('product_id', products.map((p) => p.id));

        const whitelistedIds = new Set(merchantProducts?.map((mp) => mp.product_id) || []);
        const priceMap = new Map(merchantProducts?.map((mp) => [mp.product_id, mp.wholesale_price_cents]) || []);

        // Build order items and calculate totals
        const orderItems: Array<{
            product_id: string;
            sku: string;
            name: string;
            qty: number;
            unit_price_cents: number;
        }> = [];

        let subtotalCents = 0;

        for (const item of orderData.items) {
            const product = productMap.get(item.supplier_sku);
            if (!product) {
                throw new ApiError(
                    'PRODUCT_NOT_FOUND',
                    `Product not found: ${item.supplier_sku}`,
                    400
                );
            }

            if (!whitelistedIds.has(product.id)) {
                throw new ApiError(
                    'PRODUCT_NOT_WHITELISTED',
                    `Product not available: ${item.supplier_sku}`,
                    400
                );
            }

            const unitPrice = priceMap.get(product.id) || product.cost_cents;
            const lineTotal = unitPrice * item.qty;
            subtotalCents += lineTotal;

            orderItems.push({
                product_id: product.id,
                sku: product.sku,
                name: item.name || product.name,
                qty: item.qty,
                unit_price_cents: unitPrice,
            });
        }

        // Calculate estimates
        const handlingCents = 0; // Configurable
        const shippingEstimateCents = 895; // $8.95 default estimate
        const totalEstimateCents = subtotalCents + handlingCents + shippingEstimateCents;

        // Create the order
        const { data: order, error: orderError } = await supabase
            .from('orders')
            .insert({
                store_id: store.storeId,
                merchant_id: store.merchantId,
                woo_order_id: orderData.woo_order_id,
                woo_order_number: orderData.woo_order_number,
                status: OrderStatus.RECEIVED,
                currency: orderData.currency,
                subtotal_cents: subtotalCents,
                handling_cents: handlingCents,
                shipping_estimate_cents: shippingEstimateCents,
                total_estimate_cents: totalEstimateCents,
                shipping_address: orderData.shipping_address,
                billing_address: orderData.billing_address,
                customer_email: orderData.customer_email,
                customer_note: orderData.customer_note,
                idempotency_key: idempotencyKey,
            })
            .select()
            .single();

        if (orderError || !order) {
            console.error('Order creation error:', orderError);
            throw new ApiError('ORDER_CREATE_FAILED', 'Failed to create order', 500);
        }

        // Insert order items
        const { error: itemsError } = await supabase
            .from('order_items')
            .insert(
                orderItems.map((item) => ({
                    order_id: order.id,
                    ...item,
                }))
            );

        if (itemsError) {
            console.error('Order items error:', itemsError);
            // Rollback order
            await supabase.from('orders').delete().eq('id', order.id);
            throw new ApiError('ORDER_ITEMS_FAILED', 'Failed to create order items', 500);
        }

        // Get USD wallet balance (orders use USD)
        const { data: wallet } = await supabase
            .from('wallet_accounts')
            .select('id, balance_cents, reserved_cents')
            .eq('merchant_id', store.merchantId)
            .eq('currency', 'USD')
            .single();

        // MANDATORY $500 COMPLIANCE RESERVE CHECK
        const COMPLIANCE_RESERVE_CENTS = 50000; // $500.00
        const totalBalance = wallet?.balance_cents || 0;
        const reservedBalance = wallet?.reserved_cents || 0;
        const availableBalance = totalBalance - reservedBalance - COMPLIANCE_RESERVE_CENTS;
        const canFund = availableBalance >= totalEstimateCents;

        // Determine initial status based on funding availability
        const initialStatus = canFund ? OrderStatus.RECEIVED : OrderStatus.AWAITING_FUNDS;

        // Update order status if insufficient funds (including compliance reserve)
        if (!canFund) {
            await supabase
                .from('orders')
                .update({
                    status: OrderStatus.AWAITING_FUNDS,
                    metadata: {
                        compliance_blocked: true,
                        required_balance: totalEstimateCents + COMPLIANCE_RESERVE_CENTS,
                        current_balance: totalBalance,
                    }
                })
                .eq('id', order.id);
        }

        // Only trigger processing if order can be funded while maintaining compliance reserve
        if (canFund) {
            await inngest.send({
                name: 'order/received',
                data: {
                    orderId: order.id,
                    storeId: store.storeId,
                    merchantId: store.merchantId,
                    wooOrderId: orderData.woo_order_id,
                    totalEstimateCents,
                },
            });
        }

        // Log audit event
        await supabase.from('audit_events').insert({
            merchant_id: store.merchantId,
            action: 'order.created',
            entity_type: 'order',
            entity_id: order.id,
            metadata: {
                woo_order_id: orderData.woo_order_id,
                item_count: orderItems.length,
                total_estimate_cents: totalEstimateCents,
                compliance_reserve_cents: COMPLIANCE_RESERVE_CENTS,
                is_funded: canFund,
            },
        });

        return successResponse({
            supplier_order_id: order.id,
            status: canFund ? order.status : OrderStatus.AWAITING_FUNDS,
            estimated_total_cents: totalEstimateCents,
            wallet_balance_cents: totalBalance,
            available_after_reserve_cents: Math.max(0, availableBalance),
            compliance_reserve_cents: COMPLIANCE_RESERVE_CENTS,
            is_funded: canFund,
            compliance_message: !canFund
                ? `Insufficient funds. $${(COMPLIANCE_RESERVE_CENTS / 100).toFixed(2)} compliance reserve must be maintained.`
                : null,
        }, 201);

    } catch (error) {
        return errorResponse(error as Error);
    }
}

export async function GET(request: NextRequest) {
    try {
        const store = await verifyStoreRequest(request);

        const { searchParams } = new URL(request.url);
        const status = searchParams.get('status');
        const page = parseInt(searchParams.get('page') || '1', 10);
        const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 100);
        const offset = (page - 1) * limit;

        const supabase = getServiceClient();

        let query = supabase
            .from('orders')
            .select(`
        id,
        woo_order_id,
        woo_order_number,
        status,
        currency,
        subtotal_cents,
        total_estimate_cents,
        actual_total_cents,
        created_at,
        shipped_at,
        order_items(
          id,
          sku,
          name,
          qty,
          unit_price_cents
        )
      `, { count: 'exact' })
            .eq('store_id', store.storeId)
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1);

        if (status) {
            query = query.eq('status', status);
        }

        const { data: orders, count, error } = await query;

        if (error) {
            throw new ApiError('FETCH_FAILED', 'Failed to fetch orders', 500);
        }

        return successResponse({
            data: orders || [],
            pagination: {
                page,
                limit,
                total: count || 0,
                has_more: (count || 0) > offset + limit,
            },
        });

    } catch (error) {
        return errorResponse(error as Error);
    }
}
