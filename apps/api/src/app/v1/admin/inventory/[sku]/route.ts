import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { withAdminAuth, logAdminAction, AdminAuthResult } from '@/lib/admin-auth';
import { z } from 'zod';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Validation schemas
const updateProductSchema = z.object({
    name: z.string().min(1).max(200).optional(),
    description: z.string().optional(),
    category: z.string().optional(),
    wholesale_price_cents: z.number().int().min(0).optional(),
    map_price_cents: z.number().int().min(0).optional(),
    retail_price_cents: z.number().int().min(0).optional(),
    available_qty: z.number().int().min(0).optional(),
    low_stock_threshold: z.number().int().min(0).optional(),
    reorder_quantity: z.number().int().min(0).optional(),
    weight_grams: z.number().int().min(0).optional(),
    is_active: z.boolean().optional(),
    requires_coa: z.boolean().optional(),
    metadata: z.record(z.any()).optional(),
});

/**
 * GET /v1/admin/inventory/[sku]
 * Get product details by SKU
 */
async function handleGet(
    request: NextRequest,
    auth: AdminAuthResult,
    context: { params: { sku: string } }
) {
    const sku = context.params.sku;

    const { data: product, error } = await supabase
        .from('products')
        .select('*')
        .eq('sku', sku)
        .single();

    if (error || !product) {
        return NextResponse.json(
            { error: 'Product not found' },
            { status: 404 }
        );
    }

    // Get recent inventory history
    const { data: inventoryHistory } = await supabase
        .from('inventory_log')
        .select('*')
        .eq('product_id', product.id)
        .order('created_at', { ascending: false })
        .limit(20);

    return NextResponse.json({
        product,
        inventory_history: inventoryHistory || [],
    });
}

/**
 * PATCH /v1/admin/inventory/[sku]
 * Update product details or stock
 */
async function handlePatch(
    request: NextRequest,
    auth: AdminAuthResult,
    context: { params: { sku: string } }
) {
    const sku = context.params.sku;
    const body = await request.json();
    const validated = updateProductSchema.parse(body);

    // Get current product
    const { data: currentProduct, error: fetchError } = await supabase
        .from('products')
        .select('*')
        .eq('sku', sku)
        .single();

    if (fetchError || !currentProduct) {
        return NextResponse.json(
            { error: 'Product not found' },
            { status: 404 }
        );
    }

    // Check if stock is being updated
    const stockChanged = validated.available_qty !== undefined &&
        validated.available_qty !== currentProduct.available_qty;

    // Update product
    const { data: updatedProduct, error: updateError } = await supabase
        .from('products')
        .update({
            ...validated,
            updated_at: new Date().toISOString(),
        })
        .eq('sku', sku)
        .select()
        .single();

    if (updateError) {
        return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    // Log inventory change if stock was updated
    if (stockChanged) {
        await supabase.from('inventory_log').insert({
            product_id: currentProduct.id,
            sku: currentProduct.sku,
            change_type: 'adjustment',
            quantity_before: currentProduct.available_qty,
            quantity_after: validated.available_qty!,
            reason: body.reason || 'Manual adjustment via API',
            source: auth.apiKeyId ? 'api' : 'admin_portal',
            performed_by: auth.adminId,
            api_key_id: auth.apiKeyId,
        });
    }

    // Log admin action
    await logAdminAction(
        auth,
        'update_product',
        'product',
        currentProduct.id,
        { before: currentProduct, after: updatedProduct },
        request
    );

    return NextResponse.json({ product: updatedProduct });
}

/**
 * DELETE /v1/admin/inventory/[sku]
 * Archive/deactivate a product (soft delete)
 */
async function handleDelete(
    request: NextRequest,
    auth: AdminAuthResult,
    context: { params: { sku: string } }
) {
    const sku = context.params.sku;

    // Get current product
    const { data: currentProduct, error: fetchError } = await supabase
        .from('products')
        .select('*')
        .eq('sku', sku)
        .single();

    if (fetchError || !currentProduct) {
        return NextResponse.json(
            { error: 'Product not found' },
            { status: 404 }
        );
    }

    // Soft delete by setting is_active = false
    const { error: updateError } = await supabase
        .from('products')
        .update({
            is_active: false,
            updated_at: new Date().toISOString(),
        })
        .eq('sku', sku);

    if (updateError) {
        return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    // Log admin action
    await logAdminAction(
        auth,
        'archive_product',
        'product',
        currentProduct.id,
        { before: currentProduct },
        request
    );

    return NextResponse.json({ message: 'Product archived successfully' });
}

// Wrapper to pass params
function withParams(
    handler: (
        request: NextRequest,
        auth: AdminAuthResult,
        context: { params: { sku: string } }
    ) => Promise<NextResponse>
) {
    return (request: NextRequest, context: { params: { sku: string } }) => {
        return withAdminAuth(
            (req, auth) => handler(req, auth, context),
            { requiredPermission: 'inventory', requireWrite: handler !== handleGet }
        )(request);
    };
}

export const GET = withParams(handleGet);
export const PATCH = withParams(handlePatch);
export const DELETE = withParams(handleDelete);
