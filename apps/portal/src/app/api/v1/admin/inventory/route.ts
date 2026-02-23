import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireAdmin } from '@/lib/admin-api-auth';

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
            // products/inventory tables likely don't exist yet -- return empty
            console.warn('Inventory fetch error (table may not exist):', error.code, error.message);
            return NextResponse.json({ data: [], pagination: { page, limit, total: 0, has_more: false } });
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
        return NextResponse.json({ error: 'Inventory operation failed unexpectedly. Please try again.' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const authResult = await requireAdmin();
        if (authResult instanceof NextResponse) return authResult;

        const supabase = getServiceClient();
        const body = await request.json();
        const { sku, name, category, wholesale_price_cents, on_hand, reorder_point } = body;

        if (!sku || !name || wholesale_price_cents === undefined) {
            return NextResponse.json({
                error: 'Missing required fields: sku, name, and wholesale_price_cents are all required.',
            }, { status: 400 });
        }

        const { data: existing } = await supabase
            .from('products')
            .select('id')
            .eq('sku', sku.toUpperCase())
            .maybeSingle();

        if (existing) {
            return NextResponse.json({
                error: `A product with SKU "${sku}" already exists. Use a unique SKU or edit the existing product.`,
            }, { status: 409 });
        }

        const { data: product, error: insertError } = await supabase
            .from('products')
            .insert({
                sku: sku.toUpperCase(),
                name,
                category: category || null,
                cost_cents: wholesale_price_cents,
                active: true,
            })
            .select('id')
            .single();

        if (insertError || !product) {
            console.error('Product insert error:', insertError);
            return NextResponse.json({
                error: 'Failed to create product. The database rejected the insert — check the data and try again.',
            }, { status: 500 });
        }

        await supabase.from('inventory').insert({
            product_id: product.id,
            on_hand: on_hand || 0,
            reorder_point: reorder_point || 10,
        });

        await supabase.from('audit_events').insert({
            action: 'inventory.product_created',
            entity_type: 'product',
            entity_id: product.id,
            metadata: { sku, name, cost_cents: wholesale_price_cents },
        }).then(() => {}, () => {});

        return NextResponse.json({ data: { id: product.id, sku } }, { status: 201 });
    } catch (error) {
        console.error('Inventory POST error:', error);
        return NextResponse.json({ error: 'Product creation failed unexpectedly. Please try again.' }, { status: 500 });
    }
}

export async function PATCH(request: NextRequest) {
    try {
        const authResult = await requireAdmin();
        if (authResult instanceof NextResponse) return authResult;

        const supabase = getServiceClient();
        const body = await request.json();
        const { product_id, name, category, cost_cents, on_hand, reorder_point, active, reason } = body;

        if (!product_id) {
            return NextResponse.json({ error: 'product_id required' }, { status: 400 });
        }

        // Update product fields (name, category, price, active)
        const productUpdates: Record<string, unknown> = {};
        if (name !== undefined) productUpdates.name = name;
        if (category !== undefined) productUpdates.category = category;
        if (cost_cents !== undefined) productUpdates.cost_cents = cost_cents;
        if (active !== undefined) productUpdates.active = active;

        if (Object.keys(productUpdates).length > 0) {
            const { error: productError } = await supabase
                .from('products')
                .update(productUpdates)
                .eq('id', product_id);

            if (productError) {
                console.error('Product update error:', productError);
                return NextResponse.json({ error: 'Failed to update product details.' }, { status: 500 });
            }
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
            metadata: { ...productUpdates, on_hand, reorder_point, reason: reason || 'Admin adjustment' },
        }).then(() => {}, () => {});

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Inventory PATCH error:', error);
        return NextResponse.json({ error: 'Inventory operation failed unexpectedly. Please try again.' }, { status: 500 });
    }
}
