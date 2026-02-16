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
        const search = searchParams.get('search');
        const category = searchParams.get('category');
        const lowStock = searchParams.get('low_stock') === 'true';
        const page = parseInt(searchParams.get('page') || '1', 10);
        const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 100);
        const offset = (page - 1) * limit;

        let query = supabase
            .from('products')
            .select(`
                id, sku, name, description, category, cost_cents, active,
                min_order_qty, max_order_qty, tags,
                created_at, updated_at,
                inventory(on_hand, reserved, incoming, reorder_point)
            `, { count: 'exact' })
            .order('name', { ascending: true })
            .range(offset, offset + limit - 1);

        if (search) {
            query = query.or(`name.ilike.%${search}%,sku.ilike.%${search}%`);
        }
        if (category) {
            query = query.eq('category', category);
        }

        const { data, count, error } = await query;

        if (error) {
            console.error('Inventory fetch error:', error);
            return NextResponse.json({ error: 'Failed to fetch inventory' }, { status: 500 });
        }

        let products = (data || []).map((p: Record<string, unknown>) => {
            const inv = Array.isArray(p.inventory) ? p.inventory[0] : p.inventory;
            const invData = inv as Record<string, number> | undefined;
            return {
                id: p.id,
                sku: p.sku,
                name: p.name,
                description: p.description,
                category: p.category || 'Uncategorized',
                wholesale_price_cents: p.cost_cents,
                available_qty: (invData?.on_hand || 0) - (invData?.reserved || 0),
                on_hand: invData?.on_hand || 0,
                reserved: invData?.reserved || 0,
                incoming: invData?.incoming || 0,
                low_stock_threshold: invData?.reorder_point || 10,
                is_active: p.active,
                created_at: p.created_at,
            };
        });

        if (lowStock) {
            products = products.filter((p: { available_qty: number; low_stock_threshold: number }) =>
                p.available_qty <= p.low_stock_threshold
            );
        }

        return NextResponse.json({
            data: products,
            pagination: { page, limit, total: count || 0, has_more: (count || 0) > offset + limit },
        });
    } catch (error) {
        console.error('Inventory API error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function PATCH(request: NextRequest) {
    try {
        const supabase = getServiceClient();
        const body = await request.json();
        const { product_id, on_hand, reorder_point, active, reason } = body;

        if (!product_id) {
            return NextResponse.json({ error: 'product_id required' }, { status: 400 });
        }

        // Update product active status
        if (active !== undefined) {
            await supabase.from('products').update({ active }).eq('id', product_id);
        }

        // Update inventory
        if (on_hand !== undefined || reorder_point !== undefined) {
            const invUpdates: Record<string, unknown> = {};
            if (on_hand !== undefined) invUpdates.on_hand = on_hand;
            if (reorder_point !== undefined) invUpdates.reorder_point = reorder_point;

            const { error } = await supabase
                .from('inventory')
                .update(invUpdates)
                .eq('product_id', product_id);

            if (error) {
                // May not exist yet - try upsert
                await supabase.from('inventory').upsert({
                    product_id,
                    ...invUpdates,
                });
            }
        }

        await supabase.from('audit_events').insert({
            action: 'inventory.adjusted',
            entity_type: 'product',
            entity_id: product_id,
            metadata: { on_hand, reorder_point, active, reason: reason || 'Admin adjustment' },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Inventory PATCH error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
