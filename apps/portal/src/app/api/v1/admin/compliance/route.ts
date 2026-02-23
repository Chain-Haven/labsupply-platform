/**
 * Portal proxy: Admin Compliance - List violations and scans
 * GET /api/v1/admin/compliance
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

export async function GET(request: NextRequest) {
    try {
        const authResult = await requireAdmin();
        if (authResult instanceof NextResponse) return authResult;

        const supabase = getServiceClient();
        const { searchParams } = new URL(request.url);
        const tab = searchParams.get('tab') || 'violations';
        const page = parseInt(searchParams.get('page') || '1', 10);
        const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 100);
        const offset = (page - 1) * limit;
        const merchantId = searchParams.get('merchant_id');
        const violationType = searchParams.get('violation_type');
        const severity = searchParams.get('severity');
        const adminAction = searchParams.get('admin_action');
        const search = searchParams.get('search');

        if (tab === 'scans') {
            let query = supabase
                .from('compliance_scans')
                .select('*, merchants!inner(company_name, email)', { count: 'exact' })
                .order('created_at', { ascending: false })
                .range(offset, offset + limit - 1);

            if (merchantId) query = query.eq('merchant_id', merchantId);

            const { data, count, error } = await query;

            if (error) {
                console.warn('Compliance scans fetch error:', error.code, error.message);
                return NextResponse.json({ data: [], pagination: { page, limit, total: 0, has_more: false } });
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
                pagination: { page, limit, total: count || 0, has_more: (count || 0) > offset + limit },
            });
        }

        // Violations tab (default)
        let query = supabase
            .from('compliance_violations')
            .select('*, merchants!inner(company_name, email, contact_email), compliance_scans!inner(scan_url)', { count: 'exact' })
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1);

        if (merchantId) query = query.eq('merchant_id', merchantId);
        if (violationType && violationType !== 'all') query = query.eq('violation_type', violationType);
        if (severity && severity !== 'all') query = query.eq('severity', severity);
        if (adminAction && adminAction !== 'all') query = query.eq('admin_action', adminAction);
        if (search) {
            query = query.or(`description.ilike.%${search}%,violating_text.ilike.%${search}%,page_url.ilike.%${search}%`);
        }

        const { data, count, error } = await query;

        if (error) {
            console.warn('Compliance violations fetch error:', error.code, error.message);
            return NextResponse.json({
                data: [],
                pagination: { page, limit, total: 0, has_more: false },
                summary: { pending: 0, critical: 0, high: 0, scans_today: 0 },
            });
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

        // Summary counts
        const [pendingCount, criticalCount, highCount, todayScansCount] = await Promise.all([
            supabase.from('compliance_violations').select('*', { count: 'exact', head: true }).eq('admin_action', 'pending'),
            supabase.from('compliance_violations').select('*', { count: 'exact', head: true }).eq('severity', 'critical').eq('admin_action', 'pending'),
            supabase.from('compliance_violations').select('*', { count: 'exact', head: true }).eq('severity', 'high').eq('admin_action', 'pending'),
            supabase.from('compliance_scans').select('*', { count: 'exact', head: true }).gte('created_at', new Date(new Date().setHours(0, 0, 0, 0)).toISOString()),
        ]);

        return NextResponse.json({
            data: violations,
            pagination: { page, limit, total: count || 0, has_more: (count || 0) > offset + limit },
            summary: {
                pending: pendingCount.count || 0,
                critical: criticalCount.count || 0,
                high: highCount.count || 0,
                scans_today: todayScansCount.count || 0,
            },
        });
    } catch (error) {
        console.error('Compliance API error:', error);
        return NextResponse.json({ error: 'Failed to load compliance data. Please refresh and try again.' }, { status: 500 });
    }
}
