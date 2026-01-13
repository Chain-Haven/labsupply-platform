import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { withAdminAuth, logAdminAction, AdminAuthResult } from '@/lib/admin-auth';
import { z } from 'zod';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Validation schema for bulk update
const bulkUpdateSchema = z.object({
    updates: z.array(z.object({
        sku: z.string().min(1),
        available_qty: z.number().int().min(0),
        reason: z.string().optional(),
    })).min(1).max(500),
    replace: z.boolean().default(false), // If true, set qty; if false, add/subtract
});

/**
 * POST /v1/admin/inventory/bulk
 * Bulk update stock levels for multiple products
 */
async function handlePost(request: NextRequest, auth: AdminAuthResult) {
    const body = await request.json();
    const { updates, replace } = bulkUpdateSchema.parse(body);

    const results: {
        success: Array<{ sku: string; before: number; after: number }>;
        errors: Array<{ sku: string; error: string }>;
    } = {
        success: [],
        errors: [],
    };

    // Process each update
    for (const update of updates) {
        try {
            // Get current product
            const { data: product, error: fetchError } = await supabase
                .from('products')
                .select('id, sku, available_qty')
                .eq('sku', update.sku)
                .single();

            if (fetchError || !product) {
                results.errors.push({
                    sku: update.sku,
                    error: 'Product not found',
                });
                continue;
            }

            // Calculate new quantity
            const newQty = replace
                ? update.available_qty
                : product.available_qty + update.available_qty;

            // Ensure non-negative
            const finalQty = Math.max(0, newQty);

            // Update product
            const { error: updateError } = await supabase
                .from('products')
                .update({
                    available_qty: finalQty,
                    updated_at: new Date().toISOString(),
                })
                .eq('sku', update.sku);

            if (updateError) {
                results.errors.push({
                    sku: update.sku,
                    error: updateError.message,
                });
                continue;
            }

            // Log inventory change
            await supabase.from('inventory_log').insert({
                product_id: product.id,
                sku: product.sku,
                change_type: replace ? 'adjustment' : (update.available_qty >= 0 ? 'restock' : 'adjustment'),
                quantity_before: product.available_qty,
                quantity_after: finalQty,
                reason: update.reason || `Bulk ${replace ? 'set' : 'adjust'} via API`,
                source: auth.apiKeyId ? 'api' : 'admin_portal',
                performed_by: auth.adminId,
                api_key_id: auth.apiKeyId,
            });

            results.success.push({
                sku: update.sku,
                before: product.available_qty,
                after: finalQty,
            });
        } catch (err) {
            results.errors.push({
                sku: update.sku,
                error: err instanceof Error ? err.message : 'Unknown error',
            });
        }
    }

    // Log bulk action
    await logAdminAction(
        auth,
        'bulk_inventory_update',
        'inventory',
        null,
        {
            total_requested: updates.length,
            successful: results.success.length,
            failed: results.errors.length,
            mode: replace ? 'replace' : 'adjust',
        },
        request
    );

    return NextResponse.json({
        message: `Processed ${updates.length} updates`,
        summary: {
            total: updates.length,
            successful: results.success.length,
            failed: results.errors.length,
        },
        results,
    });
}

export const POST = withAdminAuth(handlePost, {
    requiredPermission: 'inventory',
    requireWrite: true
});
