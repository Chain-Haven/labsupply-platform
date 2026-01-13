import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { withAdminAuth, logAdminAction, AdminAuthResult } from '@/lib/admin-auth';
import { z } from 'zod';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const updateMerchantSchema = z.object({
    kyb_status: z.enum(['pending', 'in_review', 'approved', 'rejected', 'more_info_requested']).optional(),
    suspended_at: z.string().nullable().optional(),
    suspension_reason: z.string().nullable().optional(),
});

/**
 * GET /v1/admin/merchants/[id]
 * Get merchant details with full history
 */
async function handleGet(
    request: NextRequest,
    auth: AdminAuthResult,
    context: { params: { id: string } }
) {
    const merchantId = context.params.id;

    // Get merchant
    const { data: merchant, error } = await supabase
        .from('merchants')
        .select('*')
        .eq('id', merchantId)
        .single();

    if (error || !merchant) {
        return NextResponse.json(
            { error: 'Merchant not found' },
            { status: 404 }
        );
    }

    // Get related data in parallel
    const [stores, orders, wallet, kybReviews] = await Promise.all([
        supabase.from('stores').select('*').eq('merchant_id', merchantId),
        supabase.from('orders').select('id, status, total_cents, created_at').eq('merchant_id', merchantId).order('created_at', { ascending: false }).limit(10),
        supabase.from('wallets').select('*').eq('merchant_id', merchantId).single(),
        supabase.from('kyb_reviews').select('*').eq('merchant_id', merchantId).order('created_at', { ascending: false }),
    ]);

    // Calculate stats
    const { count: totalOrders } = await supabase
        .from('orders')
        .select('*', { count: 'exact', head: true })
        .eq('merchant_id', merchantId);

    const { data: revenueData } = await supabase
        .from('orders')
        .select('total_cents')
        .eq('merchant_id', merchantId)
        .in('status', ['COMPLETE', 'SHIPPED']);

    const lifetimeSpend = revenueData?.reduce((sum, o) => sum + (o.total_cents || 0), 0) || 0;

    return NextResponse.json({
        merchant,
        stores: stores.data || [],
        recent_orders: orders.data || [],
        wallet: wallet.data,
        kyb_reviews: kybReviews.data || [],
        stats: {
            total_orders: totalOrders || 0,
            lifetime_spend_cents: lifetimeSpend,
            stores_count: stores.data?.length || 0,
        },
    });
}

/**
 * PATCH /v1/admin/merchants/[id]
 * Update merchant status (suspend, update KYB status, etc.)
 */
async function handlePatch(
    request: NextRequest,
    auth: AdminAuthResult,
    context: { params: { id: string } }
) {
    const merchantId = context.params.id;
    const body = await request.json();
    const validated = updateMerchantSchema.parse(body);

    // Get current merchant
    const { data: currentMerchant, error: fetchError } = await supabase
        .from('merchants')
        .select('*')
        .eq('id', merchantId)
        .single();

    if (fetchError || !currentMerchant) {
        return NextResponse.json(
            { error: 'Merchant not found' },
            { status: 404 }
        );
    }

    // Build update object
    const updateData: Record<string, any> = {
        updated_at: new Date().toISOString(),
    };

    if (validated.kyb_status !== undefined) {
        updateData.kyb_status = validated.kyb_status;
        if (validated.kyb_status === 'approved' || validated.kyb_status === 'rejected') {
            updateData.kyb_reviewed_at = new Date().toISOString();
            updateData.kyb_reviewer_id = auth.adminId;
        }
    }

    if (validated.suspended_at !== undefined) {
        updateData.suspended_at = validated.suspended_at;
    }

    if (validated.suspension_reason !== undefined) {
        updateData.suspension_reason = validated.suspension_reason;
    }

    // Update merchant
    const { data: updatedMerchant, error: updateError } = await supabase
        .from('merchants')
        .update(updateData)
        .eq('id', merchantId)
        .select()
        .single();

    if (updateError) {
        return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    // Log action
    await logAdminAction(
        auth,
        'update_merchant',
        'merchant',
        merchantId,
        { before: currentMerchant, after: updatedMerchant },
        request
    );

    return NextResponse.json({ merchant: updatedMerchant });
}

// Wrapper to pass params
function withParams(
    handler: (
        request: NextRequest,
        auth: AdminAuthResult,
        context: { params: { id: string } }
    ) => Promise<NextResponse>
) {
    return (request: NextRequest, context: { params: { id: string } }) => {
        return withAdminAuth(
            (req, auth) => handler(req, auth, context),
            { requiredPermission: 'merchants', requireWrite: handler !== handleGet }
        )(request);
    };
}

export const GET = withParams(handleGet);
export const PATCH = withParams(handlePatch);
