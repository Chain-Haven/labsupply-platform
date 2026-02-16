import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

function getServiceClient() {
    return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
}

export async function GET() {
    try {
        const supabase = getServiceClient();

        const now = new Date();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();

        const [
            merchantsRes,
            pendingKybRes,
            activeOrdersRes,
            revenueTodayRes,
            revenueWeekRes,
            pendingReviewsRes,
            recentActivityRes,
        ] = await Promise.all([
            supabase.from('merchants').select('id', { count: 'exact', head: true }),
            supabase.from('merchants').select('id', { count: 'exact', head: true })
                .in('kyb_status', ['not_started', 'in_progress']),
            supabase.from('orders').select('id', { count: 'exact', head: true })
                .not('status', 'in', '("COMPLETE","CANCELLED","REFUNDED")'),
            supabase.from('orders').select('actual_total_cents')
                .gte('shipped_at', todayStart).not('actual_total_cents', 'is', null),
            supabase.from('orders').select('actual_total_cents')
                .gte('shipped_at', weekAgo).not('actual_total_cents', 'is', null),
            supabase.from('merchants').select('id, company_name, email, kyb_status, created_at')
                .in('kyb_status', ['in_progress', 'not_started'])
                .order('created_at', { ascending: false }).limit(5),
            supabase.from('audit_events').select('id, action, entity_type, entity_id, metadata, created_at')
                .order('created_at', { ascending: false }).limit(10),
        ]);

        const revenueToday = (revenueTodayRes.data || []).reduce(
            (sum: number, r: { actual_total_cents: number }) => sum + (r.actual_total_cents || 0), 0
        );
        const revenueThisWeek = (revenueWeekRes.data || []).reduce(
            (sum: number, r: { actual_total_cents: number }) => sum + (r.actual_total_cents || 0), 0
        );

        return NextResponse.json({
            data: {
                totalMerchants: merchantsRes.count || 0,
                pendingKyb: pendingKybRes.count || 0,
                activeOrders: activeOrdersRes.count || 0,
                lowStockProducts: 0,
                revenueToday,
                revenueThisWeek,
                pendingReviews: (pendingReviewsRes.data || []).map((m: Record<string, unknown>) => ({
                    id: m.id,
                    company: m.company_name || m.email,
                    type: m.kyb_status === 'in_progress' ? 'KYB Review' : 'Pending Start',
                    submittedAt: m.created_at,
                })),
                recentActivity: (recentActivityRes.data || []).map((a: Record<string, unknown>) => ({
                    id: a.id,
                    type: a.action,
                    entity: `${a.entity_type}:${a.entity_id}`,
                    time: a.created_at,
                    metadata: a.metadata,
                })),
            },
        });
    } catch (error) {
        console.error('Dashboard API error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
