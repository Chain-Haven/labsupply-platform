/**
 * Portal proxy: Admin Compliance - Single violation GET/PATCH
 * GET /api/v1/admin/compliance/violations/:id
 * PATCH /api/v1/admin/compliance/violations/:id
 */

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

export async function GET(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const authResult = await requireAdmin();
        if (authResult instanceof NextResponse) return authResult;

        const supabase = getServiceClient();

        const { data, error } = await supabase
            .from('compliance_violations')
            .select('*, merchants!inner(company_name, email, contact_email), compliance_scans!inner(scan_url, pages_crawled, created_at)')
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
                scan_url: scan?.scan_url,
                merchants: undefined,
                compliance_scans: undefined,
            },
        });
    } catch (error) {
        console.error('Violation GET error:', error);
        return NextResponse.json({ error: 'Compliance violation operation failed unexpectedly. Please try again.' }, { status: 500 });
    }
}

export async function PATCH(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const authResult = await requireAdmin();
        if (authResult instanceof NextResponse) return authResult;
        const { admin } = authResult;

        const supabase = getServiceClient();
        const body = await request.json();
        const { action, ignore_reason } = body;

        if (!action || !['ignored', 'notified', 'blocked'].includes(action)) {
            return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
        }

        // Get violation with merchant info
        const { data: violation, error: fetchError } = await supabase
            .from('compliance_violations')
            .select('*, merchants!inner(id, company_name, email, contact_email, status, can_ship)')
            .eq('id', params.id)
            .single();

        if (fetchError || !violation) {
            return NextResponse.json({ error: 'Violation not found' }, { status: 404 });
        }

        const merchant = violation.merchants as Record<string, unknown>;
        const now = new Date().toISOString();

        // Build update
        const updates: Record<string, unknown> = {
            admin_action: action,
            admin_action_by: admin.id,
            admin_action_at: now,
        };

        if (action === 'ignored') {
            if (!ignore_reason) {
                return NextResponse.json({ error: 'ignore_reason is required when ignoring' }, { status: 400 });
            }
            updates.ignore_reason = ignore_reason;
        }

        if (action === 'notified') {
            updates.notified_at = now;
        }

        const { data: updated, error: updateError } = await supabase
            .from('compliance_violations')
            .update(updates)
            .eq('id', params.id)
            .select()
            .single();

        if (updateError) {
            return NextResponse.json({ error: 'Failed to update violation status. The database rejected the change — please try again.' }, { status: 500 });
        }

        // Side effects for notify and block actions
        if (action === 'notified') {
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

        if (action === 'blocked') {
            await supabase
                .from('merchants')
                .update({
                    status: 'suspended',
                    can_ship: false,
                    suspended_at: now,
                    suspension_reason: `Compliance violation: ${violation.description}`,
                })
                .eq('id', merchant.id);

            await supabase
                .from('orders')
                .update({
                    status: 'ON_HOLD_COMPLIANCE',
                    supplier_notes: `Order held due to compliance violation: ${violation.page_url}`,
                })
                .eq('merchant_id', merchant.id)
                .in('status', ['RECEIVED', 'AWAITING_FUNDS', 'FUNDED', 'RELEASED_TO_FULFILLMENT']);

            await supabase.from('notifications').insert({
                merchant_id: merchant.id,
                type: 'COMPLIANCE_BLOCKED',
                title: 'Services Blocked - Compliance Violation',
                message: `Your services have been blocked due to a compliance violation on ${violation.page_url}. Shipping and funds are suspended until the issue is resolved.`,
                data: { violation_id: params.id, page_url: violation.page_url },
            });
        }

        // Audit log
        await supabase.from('audit_events').insert({
            action: `compliance.violation.${action}`,
            entity_type: 'compliance_violation',
            entity_id: params.id,
            new_values: { admin_action: action, ignore_reason },
        }).then(() => {}, () => {});

        return NextResponse.json({ data: updated });
    } catch (error) {
        console.error('Violation PATCH error:', error);
        return NextResponse.json({ error: 'Compliance violation operation failed unexpectedly. Please try again.' }, { status: 500 });
    }
}
