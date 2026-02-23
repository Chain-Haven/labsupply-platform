import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth, logAdminAction, AdminAuthResult } from '@/lib/admin-auth';
import { getSupabaseAdmin } from '@/lib/supabase';
import { z } from 'zod';
import { sendKybApprovedEmail, sendKybRejectedEmail } from '@/lib/email-templates';

const kybDecisionSchema = z.object({
    decision: z.enum(['approved', 'rejected', 'more_info_requested']),
    reason: z.string().optional(),
    internal_notes: z.string().optional(),
    documents_reviewed: z.array(z.string()).optional(),
    verification_checklist: z.record(z.boolean()).optional(),
});

/**
 * POST /v1/admin/merchants/[id]/kyb
 * Submit KYB review decision
 */
async function handlePost(
    request: NextRequest,
    auth: AdminAuthResult,
    context: { params: { id: string } }
) {
    const merchantId = context.params.id;
    const body = await request.json();
    const validated = kybDecisionSchema.parse(body);

    if (!auth.adminId) {
        return NextResponse.json(
            { error: 'Session-based authentication required for KYB reviews' },
            { status: 403 }
        );
    }

    // Get current merchant
    const { data: merchant, error: fetchError } = await getSupabaseAdmin()
        .from('merchants')
        .select('*')
        .eq('id', merchantId)
        .single();

    if (fetchError || !merchant) {
        return NextResponse.json(
            { error: 'Merchant not found' },
            { status: 404 }
        );
    }

    // Create KYB review record
    const { data: review, error: reviewError } = await getSupabaseAdmin()
        .from('kyb_reviews')
        .insert({
            merchant_id: merchantId,
            reviewer_id: auth.adminId,
            decision: validated.decision,
            reason: validated.reason,
            internal_notes: validated.internal_notes,
            documents_reviewed: validated.documents_reviewed || [],
            verification_checklist: validated.verification_checklist || {},
        })
        .select()
        .single();

    if (reviewError) {
        return NextResponse.json({ error: reviewError.message }, { status: 500 });
    }

    // Update merchant KYB status
    const newStatus = validated.decision === 'more_info_requested'
        ? 'more_info_requested'
        : validated.decision;

    const { error: updateError } = await getSupabaseAdmin()
        .from('merchants')
        .update({
            kyb_status: newStatus,
            kyb_reviewed_at: new Date().toISOString(),
            kyb_reviewer_id: auth.adminId,
            updated_at: new Date().toISOString(),
        })
        .eq('id', merchantId);

    if (updateError) {
        return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    // Log action
    await logAdminAction(
        auth,
        'kyb_review',
        'merchant',
        merchantId,
        {
            before: { status: merchant.kyb_status },
            after: {
                decision: validated.decision,
                status: newStatus,
            },
        },
        request
    );

    try {
        const { data: merchantData } = await getSupabaseAdmin()
            .from('merchants')
            .select('email, company_name')
            .eq('id', merchantId)
            .single();

        if (merchantData?.email) {
            if (newStatus === 'approved') {
                await sendKybApprovedEmail(merchantData.email, merchantData.company_name || 'Merchant');
            } else if (newStatus === 'rejected') {
                await sendKybRejectedEmail(merchantData.email, merchantData.company_name || 'Merchant', validated.reason || 'Your application did not meet our requirements.');
            }
        }
    } catch (emailErr) {
        console.error('Failed to send KYB email:', emailErr);
    }

    return NextResponse.json({
        message: `KYB ${validated.decision}`,
        review,
        new_status: newStatus,
    });
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
            { requiredPermission: 'merchants', requireWrite: true }
        )(request);
    };
}

export const POST = withParams(handlePost);
