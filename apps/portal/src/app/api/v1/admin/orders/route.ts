import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

function getServiceClient() {
    return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
}

export async function GET(request: NextRequest) {
    try {
        const supabase = getServiceClient();
        const { searchParams } = new URL(request.url);
        const status = searchParams.get('status');
        const search = searchParams.get('search');
        const page = parseInt(searchParams.get('page') || '1', 10);
        const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 100);
        const offset = (page - 1) * limit;

        let query = supabase
            .from('orders')
            .select(`
                id, store_id, merchant_id, woo_order_id, woo_order_number,
                status, currency,
                subtotal_cents, total_estimate_cents, actual_total_cents,
                shipping_address, customer_email, supplier_notes,
                created_at, shipped_at,
                merchants!inner(company_name, email)
            `, { count: 'exact' })
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1);

        if (status) {
            query = query.eq('status', status);
        }
        if (search) {
            query = query.or(`woo_order_id.ilike.%${search}%,woo_order_number.ilike.%${search}%,customer_email.ilike.%${search}%`);
        }

        const { data, count, error } = await query;

        if (error) {
            console.error('Orders fetch error:', error);
            return NextResponse.json({ error: 'Failed to fetch orders' }, { status: 500 });
        }

        const orders = (data || []).map((o: Record<string, unknown>) => {
            const merchant = o.merchants as Record<string, unknown> | undefined;
            return {
                ...o,
                merchant_name: merchant?.company_name || merchant?.email || 'Unknown',
                merchants: undefined,
            };
        });

        return NextResponse.json({
            data: orders,
            pagination: { page, limit, total: count || 0, has_more: (count || 0) > offset + limit },
        });
    } catch (error) {
        console.error('Orders API error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function PATCH(request: NextRequest) {
    try {
        const supabase = getServiceClient();
        const body = await request.json();
        const { id, status, supplier_notes } = body;

        if (!id) {
            return NextResponse.json({ error: 'Order ID required' }, { status: 400 });
        }

        const updates: Record<string, unknown> = {};
        if (status) updates.status = status;
        if (supplier_notes !== undefined) updates.supplier_notes = supplier_notes;

        if (Object.keys(updates).length === 0) {
            return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
        }

        const { data, error } = await supabase
            .from('orders')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (error) {
            console.error('Order update error:', error);
            return NextResponse.json({ error: 'Failed to update order' }, { status: 500 });
        }

        await supabase.from('audit_events').insert({
            action: 'order.updated',
            entity_type: 'order',
            entity_id: id,
            new_values: updates,
        });

        return NextResponse.json({ data });
    } catch (error) {
        console.error('Orders PATCH error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
