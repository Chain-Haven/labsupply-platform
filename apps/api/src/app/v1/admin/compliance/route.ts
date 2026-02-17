/**
 * Admin Compliance API - Scans & Violations List
 * GET /v1/admin/compliance?tab=scans|violations
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { withAdminAuth, AdminAuthResult } from '@/lib/admin-auth';
import { z } from 'zod';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const violationsQuerySchema = z.object({
    page: z.coerce.number().min(1).default(1),
    limit: z.coerce.number().min(1).max(100).default(20),
    merchant_id: z.string().uuid().optional(),
    violation_type: z.string().optional(),
    severity: z.string().optional(),
    admin_action: z.string().optional(),
    date_from: z.string().optional(),
    date_to: z.string().optional(),
    search: z.string().optional(),
    tab: z.enum(['violations', 'scans']).default('violations'),
});

async function handleGet(request: NextRequest, _auth: AdminAuthResult) {
    const url = new URL(request.url);
    const params = Object.fromEntries(url.searchParams);
    const query = violationsQuerySchema.parse(params);
    const offset = (query.page - 1) * query.limit;

    if (query.tab === 'scans') {
        return handleGetScans(query, offset);
    }

    return handleGetViolations(query, offset);
}

async function handleGetViolations(
    query: z.infer<typeof violationsQuerySchema>,
    offset: number
) {
    let dbQuery = supabase
        .from('compliance_violations')
        .select(`
            *,
            merchants!inner(company_name, email, contact_email),
            compliance_scans!inner(scan_url)
        `, { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(offset, offset + query.limit - 1);

    if (query.merchant_id) {
        dbQuery = dbQuery.eq('merchant_id', query.merchant_id);
    }
    if (query.violation_type && query.violation_type !== 'all') {
        dbQuery = dbQuery.eq('violation_type', query.violation_type);
    }
    if (query.severity && query.severity !== 'all') {
        dbQuery = dbQuery.eq('severity', query.severity);
    }
    if (query.admin_action && query.admin_action !== 'all') {
        dbQuery = dbQuery.eq('admin_action', query.admin_action);
    }
    if (query.date_from) {
        dbQuery = dbQuery.gte('created_at', query.date_from);
    }
    if (query.date_to) {
        dbQuery = dbQuery.lte('created_at', query.date_to);
    }
    if (query.search) {
        dbQuery = dbQuery.or(
            `description.ilike.%${query.search}%,violating_text.ilike.%${query.search}%,page_url.ilike.%${query.search}%`
        );
    }

    const { data, count, error } = await dbQuery;

    if (error) {
        console.error('Compliance violations fetch error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const violations = (data || []).map((v: Record<string, unknown>) => {
        const merchant = v.merchants as Record<string, unknown> | undefined;
        const scan = v.compliance_scans as Record<string, unknown> | undefined;
        return {
            ...v,
            merchant_name: merchant?.company_name || merchant?.email || 'Unknown',
            merchant_email: merchant?.contact_email || merchant?.email || '',
            scan_url: scan?.scan_url || '',
            merchants: undefined,
            compliance_scans: undefined,
        };
    });

    // Get summary counts
    const [pendingCount, criticalCount, highCount, todayScansCount] = await Promise.all([
        supabase
            .from('compliance_violations')
            .select('*', { count: 'exact', head: true })
            .eq('admin_action', 'pending'),
        supabase
            .from('compliance_violations')
            .select('*', { count: 'exact', head: true })
            .eq('severity', 'critical')
            .eq('admin_action', 'pending'),
        supabase
            .from('compliance_violations')
            .select('*', { count: 'exact', head: true })
            .eq('severity', 'high')
            .eq('admin_action', 'pending'),
        supabase
            .from('compliance_scans')
            .select('*', { count: 'exact', head: true })
            .gte('created_at', new Date(new Date().setHours(0, 0, 0, 0)).toISOString()),
    ]);

    return NextResponse.json({
        data: violations,
        pagination: {
            page: query.page,
            limit: query.limit,
            total: count || 0,
            has_more: (count || 0) > offset + query.limit,
        },
        summary: {
            pending: pendingCount.count || 0,
            critical: criticalCount.count || 0,
            high: highCount.count || 0,
            scans_today: todayScansCount.count || 0,
        },
    });
}

async function handleGetScans(
    query: z.infer<typeof violationsQuerySchema>,
    offset: number
) {
    let dbQuery = supabase
        .from('compliance_scans')
        .select(`
            *,
            merchants!inner(company_name, email)
        `, { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(offset, offset + query.limit - 1);

    if (query.merchant_id) {
        dbQuery = dbQuery.eq('merchant_id', query.merchant_id);
    }
    if (query.date_from) {
        dbQuery = dbQuery.gte('created_at', query.date_from);
    }
    if (query.date_to) {
        dbQuery = dbQuery.lte('created_at', query.date_to);
    }

    const { data, count, error } = await dbQuery;

    if (error) {
        console.error('Compliance scans fetch error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const scans = (data || []).map((s: Record<string, unknown>) => {
        const merchant = s.merchants as Record<string, unknown> | undefined;
        return {
            ...s,
            merchant_name: merchant?.company_name || merchant?.email || 'Unknown',
            merchants: undefined,
        };
    });

    return NextResponse.json({
        data: scans,
        pagination: {
            page: query.page,
            limit: query.limit,
            total: count || 0,
            has_more: (count || 0) > offset + query.limit,
        },
    });
}

export const GET = withAdminAuth(handleGet);
