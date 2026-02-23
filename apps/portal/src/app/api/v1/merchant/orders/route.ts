/**
 * GET /api/v1/merchant/orders
 * Returns orders for the authenticated merchant with pagination and filtering.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireMerchant, getServiceClient } from '@/lib/merchant-api-auth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    try {
        const authResult = await requireMerchant();
        if (authResult instanceof NextResponse) return authResult;
        const { merchant } = authResult.data;

        const supabase = getServiceClient();
        const { searchParams } = new URL(request.url);
        const status = searchParams.get('status');
        const page = parseInt(searchParams.get('page') || '1', 10);
        const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 100);
        const offset = (page - 1) * limit;

        let query = supabase
            .from('orders')
            .select(`
                id, woo_order_id, woo_order_number,
                status, currency, shipping_method, order_type,
                subtotal_cents, total_estimate_cents, actual_total_cents,
                shipping_address, customer_email, customer_note,
                created_at, shipped_at, completed_at,
                metadata,
                order_items(id, sku, name, qty, unit_price_cents),
                shipments(id, status, carrier, tracking_number, tracking_url, shipped_at, delivered_at)
            `, { count: 'exact' })
            .eq('merchant_id', merchant.id)
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1);

        if (status) {
            query = query.eq('status', status);
        }

        const { data, count, error } = await query;

        if (error) {
            console.warn('Merchant orders fetch error:', error.code, error.message);
            return NextResponse.json({ data: [], pagination: { page, limit, total: 0, has_more: false } });
        }

        return NextResponse.json({
            data: data || [],
            pagination: { page, limit, total: count || 0, has_more: (count || 0) > offset + limit },
        });
    } catch (error) {
        console.error('Merchant orders API error:', error);
        return NextResponse.json({ error: 'Failed to load orders due to an unexpected error. Please refresh and try again.' }, { status: 500 });
    }
}
