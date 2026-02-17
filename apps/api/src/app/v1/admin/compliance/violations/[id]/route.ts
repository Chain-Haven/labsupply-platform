/**
 * Admin Compliance API - Single Violation Actions
 * GET /v1/admin/compliance/violations/:id
 * PATCH /v1/admin/compliance/violations/:id
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { withAdminAuth, AdminAuthResult, logAdminAction } from '@/lib/admin-auth';
import { z } from 'zod';
import { sendComplianceNotificationEmail, sendComplianceBlockEmail } from '@/lib/compliance-emails';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const patchSchema = z.object({
    action: z.enum(['ignored', 'notified', 'blocked']),
    ignore_reason: z.string().optional(),
});

async function handleGet(
    request: NextRequest,
    auth: AdminAuthResult,
    { params }: { params: { id: string } }
) {
    const { data, error } = await supabase
        .from('compliance_violations')
        .select(`
            *,
            merchants!inner(company_name, email, contact_email, website_url, status, can_ship),
            compliance_scans!inner(scan_url, pages_crawled, created_at)
        `)
        .eq('id', params.id)
        .single();

    if (error || !data) {
        return NextResponse.json({ error: 'Violation not found' }, { status: 404 });
    }

    const merchant = data.merchants as Record<string, unknown> | undefined;
    const scan = data.compliance_scans as Record<string, unknown> | undefined;

    return NextResponse.json({
        data: {
            ...data,
            merchant_name: merchant?.company_name || merchant?.email || 'Unknown',
            merchant_email: merchant?.contact_email || merchant?.email || '',
            merchant_status: merchant?.status,
            merchant_can_ship: merchant?.can_ship,
            scan_url: scan?.scan_url,
            scan_pages_crawled: scan?.pages_crawled,
            scan_date: scan?.created_at,
            merchants: undefined,
            compliance_scans: undefined,
        },
    });
}

async function handlePatch(
    request: NextRequest,
    auth: AdminAuthResult,
    { params }: { params: { id: string } }
) {
    const body = await request.json();
    const parsed = patchSchema.parse(body);

    // Get the violation with merchant info
    const { data: violation, error: fetchError } = await supabase
        .from('compliance_violations')
        .select(`
            *,
            merchants!inner(id, company_name, email, contact_email, status, can_ship)
        `)
        .eq('id', params.id)
        .single();

    if (fetchError || !violation) {
        return NextResponse.json({ error: 'Violation not found' }, { status: 404 });
    }

    const merchant = violation.merchants as Record<string, unknown>;
    const merchantEmail = (merchant.contact_email || merchant.email) as string;
    const merchantName = (merchant.company_name || merchant.email) as string;
    const now = new Date().toISOString();

    // Update the violation record
    const updates: Record<string, unknown> = {
        admin_action: parsed.action,
        admin_action_by: auth.adminId,
        admin_action_at: now,
    };

    if (parsed.action === 'ignored') {
        if (!parsed.ignore_reason) {
            return NextResponse.json(
                { error: 'ignore_reason is required when ignoring a violation' },
                { status: 400 }
            );
        }
        updates.ignore_reason = parsed.ignore_reason;
    }

    if (parsed.action === 'notified') {
        updates.notified_at = now;
    }

    const { data: updated, error: updateError } = await supabase
        .from('compliance_violations')
        .update(updates)
        .eq('id', params.id)
        .select()
        .single();

    if (updateError) {
        console.error('Failed to update violation:', updateError);
        return NextResponse.json({ error: 'Failed to update violation' }, { status: 500 });
    }

    // Execute the action side effects
    if (parsed.action === 'notified') {
        try {
            await sendComplianceNotificationEmail({
                to: merchantEmail,
                merchantName,
                pageUrl: violation.page_url,
                violationType: violation.violation_type,
                description: violation.description,
                violatingText: violation.violating_text,
                suggestedFix: violation.suggested_fix,
            });
        } catch (emailError) {
            console.error('Failed to send compliance notification email:', emailError);
        }

        // Create in-app notification
        await supabase.from('notifications').insert({
            merchant_id: merchant.id,
            type: 'COMPLIANCE_VIOLATION',
            title: 'Compliance Issue Found',
            message: `A compliance violation was found on ${violation.page_url}: ${violation.description}`,
            data: {
                violation_id: params.id,
                page_url: violation.page_url,
                violation_type: violation.violation_type,
                suggested_fix: violation.suggested_fix,
            },
        });
    }

    if (parsed.action === 'blocked') {
        // Suspend the merchant
        await supabase
            .from('merchants')
            .update({
                status: 'suspended',
                can_ship: false,
                suspended_at: now,
                suspension_reason: `Compliance violation: ${violation.description}`,
            })
            .eq('id', merchant.id);

        // Put all pending orders on compliance hold
        await supabase
            .from('orders')
            .update({
                status: 'ON_HOLD_COMPLIANCE',
                supplier_notes: `Order held due to compliance violation on merchant website: ${violation.page_url}`,
            })
            .eq('merchant_id', merchant.id)
            .in('status', ['RECEIVED', 'AWAITING_FUNDS', 'FUNDED', 'RELEASED_TO_FULFILLMENT']);

        // Send block notification email
        try {
            await sendComplianceBlockEmail({
                to: merchantEmail,
                merchantName,
                pageUrl: violation.page_url,
                violationType: violation.violation_type,
                description: violation.description,
                violatingText: violation.violating_text,
                suggestedFix: violation.suggested_fix,
            });
        } catch (emailError) {
            console.error('Failed to send compliance block email:', emailError);
        }

        // Create in-app notification
        await supabase.from('notifications').insert({
            merchant_id: merchant.id,
            type: 'COMPLIANCE_BLOCKED',
            title: 'Services Blocked - Compliance Violation',
            message: `Your services have been blocked due to a compliance violation found on ${violation.page_url}. Shipping and fund access are suspended until the issue is resolved.`,
            data: {
                violation_id: params.id,
                page_url: violation.page_url,
                violation_type: violation.violation_type,
            },
        });
    }

    // Log audit
    await logAdminAction(
        auth,
        `compliance.violation.${parsed.action}`,
        'compliance_violation',
        params.id,
        {
            before: { admin_action: violation.admin_action },
            after: { admin_action: parsed.action, ignore_reason: parsed.ignore_reason },
        },
        request
    );

    return NextResponse.json({ data: updated });
}

// Wrap handlers with admin auth - Next.js dynamic route handler
export const GET = withAdminAuth(
    (request: NextRequest, auth: AdminAuthResult) => {
        const id = request.url.split('/violations/')[1]?.split('?')[0];
        return handleGet(request, auth, { params: { id } });
    }
);

export const PATCH = withAdminAuth(
    (request: NextRequest, auth: AdminAuthResult) => {
        const id = request.url.split('/violations/')[1]?.split('?')[0];
        return handlePatch(request, auth, { params: { id } });
    }
);
