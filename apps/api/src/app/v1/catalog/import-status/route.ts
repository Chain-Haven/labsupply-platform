/**
 * POST /v1/catalog/import-status
 * Receives import status updates from the WooCommerce plugin.
 * Reports which products were successfully imported, updated, or failed.
 */

import { NextRequest } from 'next/server';
import { getServiceClient } from '@/lib/supabase';
import { verifyStoreRequest, successResponse, errorResponse } from '@/lib/auth';

export async function POST(request: NextRequest) {
    try {
        const store = await verifyStoreRequest(request);
        const body = JSON.parse(store.body || '{}');

        const { products } = body;
        if (!products || !Array.isArray(products)) {
            return successResponse({ received: 0 });
        }

        const supabase = getServiceClient();

        // Log the import status for each product
        for (const product of products) {
            if (product.supplier_product_id && product.woo_product_id) {
                // Update the merchant_products table with the WooCommerce product ID
                await supabase
                    .from('merchant_products')
                    .update({
                        woo_product_id: product.woo_product_id,
                        sync_status: product.status || 'synced',
                        last_sync_at: new Date().toISOString(),
                    })
                    .eq('product_id', product.supplier_product_id)
                    .eq('merchant_id', store.merchantId)
                    .then(() => {}, () => {}); // Ignore errors if table doesn't exist
            }
        }

        // Log audit event
        await supabase.from('audit_events').insert({
            merchant_id: store.merchantId,
            action: 'catalog.import_status',
            entity_type: 'store',
            entity_id: store.storeId,
            metadata: {
                total: products.length,
                created: products.filter((p: Record<string, string>) => p.status === 'created').length,
                updated: products.filter((p: Record<string, string>) => p.status === 'updated').length,
                failed: products.filter((p: Record<string, string>) => p.status === 'failed').length,
            },
        }).then(() => {}, () => {});

        return successResponse({ received: products.length });
    } catch (error) {
        return errorResponse(error as Error);
    }
}
