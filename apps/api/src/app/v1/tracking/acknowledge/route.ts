/**
 * POST /v1/tracking/acknowledge
 * Acknowledges that tracking updates have been processed by the WooCommerce plugin.
 * Body: { order_ids: string[] }
 *
 * Behavior depends on admin_settings.auto_complete_on_acknowledge:
 *   true  (default) -- legacy behavior: transitions SHIPPED -> COMPLETE
 *   false           -- only stamps tracking_acknowledged_at; COMPLETE happens on delivery
 */

import { NextRequest } from 'next/server';
import { getServiceClient } from '@/lib/supabase';
import { verifyStoreRequest, successResponse, errorResponse } from '@/lib/auth';
import { recordStatusChange } from '@/lib/order-helpers';

async function getAutoCompleteFlag(supabase: ReturnType<typeof getServiceClient>): Promise<boolean> {
    const { data } = await supabase
        .from('admin_settings')
        .select('settings')
        .eq('id', 'global')
        .single();

    if (!data?.settings) return true;
    const settings = data.settings as Record<string, unknown>;
    return settings.auto_complete_on_acknowledge !== false;
}

export async function POST(request: NextRequest) {
    try {
        const store = await verifyStoreRequest(request);
        const body = JSON.parse(store.body || '{}');
        const orderIds: string[] = body.order_ids || [];

        if (!orderIds.length) {
            return successResponse({ acknowledged: 0 });
        }

        const supabase = getServiceClient();
        const autoComplete = await getAutoCompleteFlag(supabase);

        if (autoComplete) {
            const { error, count } = await supabase
                .from('orders')
                .update({ status: 'COMPLETE', completed_at: new Date().toISOString(), tracking_acknowledged_at: new Date().toISOString() })
                .eq('store_id', store.storeId)
                .eq('status', 'SHIPPED')
                .in('id', orderIds);

            if (error) {
                return successResponse({ acknowledged: 0 });
            }

            for (const oid of orderIds) {
                await recordStatusChange(supabase, oid, 'SHIPPED', 'COMPLETE', undefined, 'Tracking acknowledged by store');
            }

            return successResponse({ acknowledged: count || 0 });
        }

        // Non-auto-complete: only stamp the acknowledgment timestamp
        const { error, count } = await supabase
            .from('orders')
            .update({ tracking_acknowledged_at: new Date().toISOString() })
            .eq('store_id', store.storeId)
            .eq('status', 'SHIPPED')
            .in('id', orderIds);

        if (error) {
            return successResponse({ acknowledged: 0 });
        }

        return successResponse({ acknowledged: count || 0 });
    } catch (error) {
        return errorResponse(error as Error);
    }
}
