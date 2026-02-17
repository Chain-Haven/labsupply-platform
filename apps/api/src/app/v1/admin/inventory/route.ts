import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth, logAdminAction, AdminAuthResult } from '@/lib/admin-auth';
import { getSupabaseAdmin } from '@/lib/supabase';
import { z } from 'zod';

// Validation schemas
const listQuerySchema = z.object({
    page: z.coerce.number().min(1).default(1),
    limit: z.coerce.number().min(1).max(100).default(50),
    search: z.string().optional(),
    category: z.string().optional(),
    low_stock: z.coerce.boolean().optional(),
    status: z.enum(['active', 'inactive', 'all']).default('all'),
    sort_by: z.enum(['sku', 'name', 'stock', 'updated_at']).default('sku'),
    sort_order: z.enum(['asc', 'desc']).default('asc'),
});

const createProductSchema = z.object({
    sku: z.string().min(1).max(50),
    name: z.string().min(1).max(200),
    description: z.string().optional(),
    category: z.string().optional(),
    wholesale_price_cents: z.number().int().min(0),
    map_price_cents: z.number().int().min(0).optional(),
    retail_price_cents: z.number().int().min(0).optional(),
    available_qty: z.number().int().min(0).default(0),
    low_stock_threshold: z.number().int().min(0).default(10),
    reorder_quantity: z.number().int().min(0).default(50),
    weight_grams: z.number().int().min(0).optional(),
    is_active: z.boolean().default(true),
    requires_coa: z.boolean().default(false),
    metadata: z.record(z.any()).optional(),
});

/**
 * GET /v1/admin/inventory
 * List all products with filtering and pagination
 */
async function handleGet(request: NextRequest, auth: AdminAuthResult) {
    const url = new URL(request.url);
    const params = Object.fromEntries(url.searchParams);

    const query = listQuerySchema.parse(params);
    const offset = (query.page - 1) * query.limit;

    let dbQuery = getSupabaseAdmin()
        .from('products')
        .select('*', { count: 'exact' });

    // Apply filters
    if (query.search) {
        dbQuery = dbQuery.or(`sku.ilike.%${query.search}%,name.ilike.%${query.search}%`);
    }

    if (query.category) {
        dbQuery = dbQuery.eq('category', query.category);
    }

    if (query.low_stock) {
        dbQuery = dbQuery.lt('available_qty', getSupabaseAdmin().rpc('get_low_stock_threshold'));
    }

    if (query.status !== 'all') {
        dbQuery = dbQuery.eq('is_active', query.status === 'active');
    }

    // Apply sorting
    dbQuery = dbQuery.order(query.sort_by, { ascending: query.sort_order === 'asc' });

    // Apply pagination
    dbQuery = dbQuery.range(offset, offset + query.limit - 1);

    const { data: products, error, count } = await dbQuery;

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Get low stock count
    const { count: lowStockCount } = await getSupabaseAdmin()
        .from('products')
        .select('*', { count: 'exact', head: true })
        .lt('available_qty', 10) // Default threshold
        .eq('is_active', true);

    return NextResponse.json({
        products,
        pagination: {
            page: query.page,
            limit: query.limit,
            total: count || 0,
            total_pages: Math.ceil((count || 0) / query.limit),
        },
        summary: {
            total_products: count || 0,
            low_stock_count: lowStockCount || 0,
        },
    });
}

/**
 * POST /v1/admin/inventory
 * Create a new product
 */
async function handlePost(request: NextRequest, auth: AdminAuthResult) {
    const body = await request.json();
    const validated = createProductSchema.parse(body);

    // Check if SKU already exists
    const { data: existing } = await getSupabaseAdmin()
        .from('products')
        .select('id')
        .eq('sku', validated.sku)
        .single();

    if (existing) {
        return NextResponse.json(
            { error: 'A product with this SKU already exists' },
            { status: 409 }
        );
    }

    const { data: product, error } = await getSupabaseAdmin()
        .from('products')
        .insert({
            ...validated,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        })
        .select()
        .single();

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Log the action
    await logAdminAction(
        auth,
        'create_product',
        'product',
        product.id,
        { after: product },
        request
    );

    // Log initial inventory
    if (validated.available_qty > 0) {
        await getSupabaseAdmin().from('inventory_log').insert({
            product_id: product.id,
            sku: product.sku,
            change_type: 'import',
            quantity_before: 0,
            quantity_after: validated.available_qty,
            reason: 'Initial product creation',
            source: auth.apiKeyId ? 'api' : 'admin_portal',
            performed_by: auth.adminId,
            api_key_id: auth.apiKeyId,
        });
    }

    return NextResponse.json({ product }, { status: 201 });
}

// Export wrapped handlers
export const GET = withAdminAuth(handleGet, { requiredPermission: 'inventory' });
export const POST = withAdminAuth(handlePost, { requiredPermission: 'inventory', requireWrite: true });
