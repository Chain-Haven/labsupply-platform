/**
 * Catalog API
 * GET /v1/catalog
 * 
 * Get whitelisted products for the authenticated store's merchant
 */

import { NextRequest } from 'next/server';
import { getServiceClient } from '@/lib/supabase';
import { verifyStoreRequest, successResponse, errorResponse } from '@/lib/auth';

export async function GET(request: NextRequest) {
    try {
        const store = await verifyStoreRequest(request);

        const supabase = getServiceClient();

        // Get whitelisted products for this merchant
        const { data: merchantProducts, error } = await supabase
            .from('merchant_products')
            .select(`
        id,
        wholesale_price_cents,
        map_price_cents,
        custom_title,
        custom_description,
        sync_title,
        sync_description,
        sync_price,
        min_qty,
        max_qty,
        region_restrictions,
        products!inner(
          id,
          sku,
          name,
          description,
          short_description,
          cost_cents,
          attributes,
          dimensions,
          weight_grams,
          shipping_class,
          category,
          tags,
          compliance_copy,
          disclaimer,
          requires_coa,
          min_order_qty,
          max_order_qty
        ),
        product_assets:products!inner(
          product_assets(
            id,
            type,
            storage_path,
            filename
          )
        )
      `)
            .eq('merchant_id', store.merchantId)
            .eq('allowed', true);

        if (error) {
            console.error('Catalog fetch error:', error);
            throw new Error('Failed to load product catalog from the database. Please try again.');
        }

        // Fetch merchant's global price adjustment for products without explicit overrides
        const { data: merchantRecord } = await supabase
            .from('merchants')
            .select('price_adjustment_percent')
            .eq('id', store.merchantId)
            .single();

        const globalAdjustmentPct = Number(merchantRecord?.price_adjustment_percent) || 0;

        // Get inventory for products
        const productIds = merchantProducts?.map((mp: any) => mp.products.id) || [];

        const { data: inventory } = await supabase
            .from('inventory')
            .select('product_id, on_hand, reserved')
            .in('product_id', productIds);

        const inventoryMap = new Map(
            inventory?.map((inv: any) => [inv.product_id, inv]) || []
        );

        // Format response
        const products = merchantProducts?.map((mp: any) => {
            const product = mp.products;
            const inv = inventoryMap.get(product.id);
            const available = inv ? inv.on_hand - inv.reserved : 0;

            // Get product images
            const images = Array.isArray(product.product_assets)
                ? product.product_assets.flatMap((pa: any) =>
                    pa.product_assets?.filter((a: any) => a.type === 'IMAGE') || []
                )
                : [];

            return {
                id: product.id,
                sku: product.sku,
                name: mp.sync_title && mp.custom_title ? mp.custom_title : product.name,
                description: mp.sync_description && mp.custom_description
                    ? mp.custom_description
                    : product.description,
                short_description: product.short_description,
                images: images.map((img: any) => ({
                    id: img.id,
                    url: `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/product-images/${img.storage_path}`,
                })),
                wholesale_price_cents: mp.wholesale_price_cents ??
                    Math.round((product.cost_cents || 0) * (1 + globalAdjustmentPct / 100)),
                map_price_cents: mp.map_price_cents,
                dimensions: product.dimensions,
                weight_grams: product.weight_grams,
                shipping_class: product.shipping_class,
                category: product.category,
                tags: product.tags,
                attributes: product.attributes,
                compliance_copy: product.compliance_copy,
                disclaimer: product.disclaimer,
                requires_coa: product.requires_coa,
                in_stock: available > 0,
                available_qty: Math.max(0, available),
                min_qty: mp.min_qty || product.min_order_qty || 1,
                max_qty: mp.max_qty || product.max_order_qty,
                region_restrictions: mp.region_restrictions,
            };
        }) || [];

        return successResponse({
            products,
            last_updated: new Date().toISOString(),
        });

    } catch (error) {
        return errorResponse(error as Error);
    }
}
