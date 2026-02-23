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

/**
 * GET /api/v1/admin/merchants/[id]/pricing
 * Returns all active products with this merchant's effective pricing.
 */
export async function GET(
    _request: NextRequest,
    { params }: { params: { id: string } }
) {
    const authResult = await requireAdmin();
    if (authResult instanceof NextResponse) return authResult;

    const merchantId = params.id;
    const supabase = getServiceClient();

    const { data: merchant, error: merchantErr } = await supabase
        .from('merchants')
        .select('id, company_name, price_adjustment_percent')
        .eq('id', merchantId)
        .single();

    if (merchantErr || !merchant) {
        return NextResponse.json({ error: 'Merchant not found' }, { status: 404 });
    }

    const { data: products, error: productsErr } = await supabase
        .from('products')
        .select('id, sku, name, cost_cents, active')
        .eq('active', true)
        .order('sku');

    if (productsErr) {
        return NextResponse.json({ error: 'Failed to load product catalog for pricing. Please refresh and try again.' }, { status: 500 });
    }

    const { data: overrides } = await supabase
        .from('merchant_products')
        .select('product_id, wholesale_price_cents')
        .eq('merchant_id', merchantId);

    const overrideMap = new Map(
        (overrides || []).map((o) => [o.product_id, o.wholesale_price_cents])
    );

    const adjustmentPct = Number(merchant.price_adjustment_percent) || 0;

    const pricing = (products || []).map((p) => {
        const override = overrideMap.get(p.id);
        const adjustedPrice = Math.round(p.cost_cents * (1 + adjustmentPct / 100));
        return {
            product_id: p.id,
            sku: p.sku,
            name: p.name,
            base_cost_cents: p.cost_cents,
            adjusted_price_cents: adjustedPrice,
            override_price_cents: override ?? null,
            effective_price_cents: override ?? adjustedPrice,
            has_override: override != null,
        };
    });

    return NextResponse.json({
        merchant: {
            id: merchant.id,
            company_name: merchant.company_name,
            price_adjustment_percent: adjustmentPct,
        },
        pricing,
    });
}

/**
 * PATCH /api/v1/admin/merchants/[id]/pricing
 * Upsert per-SKU price overrides or clear them.
 * Body: { overrides: [{ product_id, wholesale_price_cents | null }] }
 */
export async function PATCH(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    const authResult = await requireAdmin();
    if (authResult instanceof NextResponse) return authResult;

    const merchantId = params.id;
    const supabase = getServiceClient();
    const body = await request.json();
    const entries: { product_id: string; wholesale_price_cents: number | null }[] = body.overrides;

    if (!Array.isArray(entries) || entries.length === 0) {
        return NextResponse.json({ error: 'overrides array is required' }, { status: 400 });
    }

    const toUpsert: { merchant_id: string; product_id: string; wholesale_price_cents: number; allowed: boolean }[] = [];
    const toDelete: string[] = [];

    for (const entry of entries) {
        if (entry.wholesale_price_cents == null) {
            toDelete.push(entry.product_id);
        } else {
            toUpsert.push({
                merchant_id: merchantId,
                product_id: entry.product_id,
                wholesale_price_cents: entry.wholesale_price_cents,
                allowed: true,
            });
        }
    }

    if (toDelete.length > 0) {
        await supabase
            .from('merchant_products')
            .delete()
            .eq('merchant_id', merchantId)
            .in('product_id', toDelete);
    }

    if (toUpsert.length > 0) {
        const { error } = await supabase
            .from('merchant_products')
            .upsert(toUpsert, { onConflict: 'merchant_id,product_id' });

        if (error) {
            console.error('Upsert error:', error);
            return NextResponse.json({ error: 'Failed to save pricing overrides. Verify the values are valid and try again.' }, { status: 500 });
        }
    }

    return NextResponse.json({ success: true, upserted: toUpsert.length, cleared: toDelete.length });
}

/**
 * POST /api/v1/admin/merchants/[id]/pricing
 * Bulk-apply a percentage adjustment to all active products.
 * Writes computed wholesale_price_cents into merchant_products for every product.
 * Body: { adjustment_percent: number }
 */
export async function POST(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    const authResult = await requireAdmin();
    if (authResult instanceof NextResponse) return authResult;

    const merchantId = params.id;
    const supabase = getServiceClient();
    const body = await request.json();
    const adjustmentPercent = Number(body.adjustment_percent);

    if (isNaN(adjustmentPercent)) {
        return NextResponse.json({ error: 'adjustment_percent is required' }, { status: 400 });
    }

    const { data: products, error: productsErr } = await supabase
        .from('products')
        .select('id, cost_cents')
        .eq('active', true);

    if (productsErr || !products) {
        return NextResponse.json({ error: 'Failed to load product catalog for pricing. Please refresh and try again.' }, { status: 500 });
    }

    const rows = products.map((p) => ({
        merchant_id: merchantId,
        product_id: p.id,
        wholesale_price_cents: Math.round(p.cost_cents * (1 + adjustmentPercent / 100)),
        allowed: true,
    }));

    const { error } = await supabase
        .from('merchant_products')
        .upsert(rows, { onConflict: 'merchant_id,product_id' });

    if (error) {
        console.error('Bulk upsert error:', error);
        return NextResponse.json({ error: 'Failed to apply bulk pricing adjustment. Verify the percentage is valid and try again.' }, { status: 500 });
    }

    // Also save the adjustment percent on the merchant for display purposes
    await supabase
        .from('merchants')
        .update({ price_adjustment_percent: adjustmentPercent })
        .eq('id', merchantId);

    return NextResponse.json({ success: true, products_updated: rows.length });
}
