import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireAdmin } from '@/lib/admin-api-auth';

const ORDER_STATUS_TRANSITIONS: Record<string, string[]> = {
    RECEIVED: ['AWAITING_FUNDS', 'FUNDED', 'ON_HOLD_COMPLIANCE', 'CANCELLED'],
    AWAITING_FUNDS: ['FUNDED', 'ON_HOLD_PAYMENT', 'CANCELLED'],
    ON_HOLD_PAYMENT: ['AWAITING_FUNDS', 'FUNDED', 'CANCELLED'],
    ON_HOLD_COMPLIANCE: ['RECEIVED', 'CANCELLED'],
    FUNDED: ['RELEASED_TO_FULFILLMENT', 'ON_HOLD_COMPLIANCE', 'CANCELLED', 'REFUNDED'],
    RELEASED_TO_FULFILLMENT: ['PICKING', 'CANCELLED'],
    PICKING: ['PACKED', 'RELEASED_TO_FULFILLMENT'],
    PACKED: ['SHIPPED'],
    SHIPPED: ['COMPLETE', 'DELIVERED'],
    DELIVERED: ['COMPLETE'],
    COMPLETE: [],
    CANCELLED: [],
    REFUNDED: [],
};

function isValidStatusTransition(from: string, to: string): boolean {
    return ORDER_STATUS_TRANSITIONS[from]?.includes(to) ?? false;
}

export const dynamic = 'force-dynamic';

function getServiceClient() {
    return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
}

export async function GET(request: NextRequest) {
    try {
        const authResult = await requireAdmin();
        if (authResult instanceof NextResponse) return authResult;

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
                merchants!inner(company_name, email),
                order_items(id, sku, name, qty, unit_price_cents)
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
            // orders table likely doesn't exist yet -- return empty
            console.warn('Orders fetch error (table may not exist):', error.code, error.message);
            return NextResponse.json({ data: [], pagination: { page, limit, total: 0, has_more: false } });
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
        return NextResponse.json({ error: 'Failed to load orders. Please refresh the page or contact support if this persists.' }, { status: 500 });
    }
}

export async function PATCH(request: NextRequest) {
    try {
        const authResult = await requireAdmin();
        if (authResult instanceof NextResponse) return authResult;

        const supabase = getServiceClient();
        const body = await request.json();
        const { id, status, supplier_notes } = body;

        if (!id) {
            return NextResponse.json({ error: 'Order ID required' }, { status: 400 });
        }

        // Fetch current order for status transition validation
        const { data: currentOrder, error: fetchErr } = await supabase
            .from('orders')
            .select('status')
            .eq('id', id)
            .single();

        if (fetchErr || !currentOrder) {
            return NextResponse.json({ error: 'Order not found' }, { status: 404 });
        }

        const updates: Record<string, unknown> = {};
        if (supplier_notes !== undefined) updates.supplier_notes = supplier_notes;

        if (status) {
            if (currentOrder.status === status) {
                return NextResponse.json({ error: 'Order is already in this status' }, { status: 400 });
            }

            if (!isValidStatusTransition(currentOrder.status, status)) {
                const allowed = ORDER_STATUS_TRANSITIONS[currentOrder.status] ?? [];
                return NextResponse.json({
                    error: `Invalid status transition: ${currentOrder.status} -> ${status}. Allowed: [${allowed.join(', ')}]`,
                }, { status: 400 });
            }

            updates.status = status;
        }

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
            return NextResponse.json({ error: 'Failed to update order. The database rejected the changes — verify the order ID is valid and try again.' }, { status: 500 });
        }

        if (status) {
            await supabase.from('order_status_history').insert({
                order_id: id,
                from_status: currentOrder.status,
                to_status: status,
                notes: supplier_notes || null,
            }).then(() => {}, () => {});
        }

        await supabase.from('audit_events').insert({
            action: 'order.updated',
            entity_type: 'order',
            entity_id: id,
            new_values: updates,
        }).then(() => {}, () => {});

        return NextResponse.json({ data });
    } catch (error) {
        console.error('Orders PATCH error:', error);
        return NextResponse.json({ error: 'Failed to update order due to an unexpected error. Please try again or contact support.' }, { status: 500 });
    }
}
