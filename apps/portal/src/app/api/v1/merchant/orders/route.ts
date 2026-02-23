/**
 * GET /api/v1/merchant/orders
 * Returns orders for the authenticated merchant with pagination and filtering.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createRouteHandlerClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

function getServiceClient() {
    return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
}

async function getAuthMerchant() {
    const supabase = createRouteHandlerClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) return null;

    const { data: merchant } = await getServiceClient()
        .from('merchants')
        .select('id')
        .eq('user_id', user.id)
        .single();

    return merchant;
}

export async function GET(request: NextRequest) {
    try {
        const merchant = await getAuthMerchant();
        if (!merchant) {
            return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
        }

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
                status, currency, shipping_method,
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
