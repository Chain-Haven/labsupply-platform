import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireAdmin } from '@/lib/admin-api-auth';

export const dynamic = 'force-dynamic';

function getServiceClient() {
    return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
}

// Safe query helper -- returns empty on missing table/column errors
async function safeQuery(queryFn: () => any): Promise<{ data: any; count: number; error: null }> {
    try {
        const result = await queryFn();
        if (result.error && (result.error.code === '42P01' || result.error.code === '42703')) {
            return { data: null, count: 0, error: null };
        }
        return { data: result.data, count: result.count ?? 0, error: null };
    } catch {
        return { data: null, count: 0, error: null };
    }
}

export async function GET() {
    try {
        const authResult = await requireAdmin();
        if (authResult instanceof NextResponse) return authResult;

        const supabase = getServiceClient();

        // Merchants (table exists in production)
        const merchantsRes = await safeQuery(() =>
            supabase.from('merchants').select('id', { count: 'exact', head: true })
        );
        const pendingKybRes = await safeQuery(() =>
            supabase.from('merchants').select('id', { count: 'exact', head: true })
                .in('kyb_status', ['not_started', 'in_progress'])
        );
        const pendingReviewsRes = await safeQuery(() =>
            supabase.from('merchants').select('id, company_name, email, kyb_status, created_at')
                .in('kyb_status', ['in_progress', 'not_started'])
                .order('created_at', { ascending: false }).limit(5)
        );

        // Orders (table may not exist)
        const activeOrdersRes = await safeQuery(() =>
            supabase.from('orders').select('id', { count: 'exact', head: true })
                .not('status', 'in', '("COMPLETE","CANCELLED","REFUNDED")')
        );

        // Audit events (table may not exist)
        const recentActivityRes = await safeQuery(() =>
            supabase.from('audit_events').select('id, action, entity_type, entity_id, metadata, created_at')
                .order('created_at', { ascending: false }).limit(10)
        );

        return NextResponse.json({
            data: {
                totalMerchants: merchantsRes.count || 0,
                pendingKyb: pendingKybRes.count || 0,
                activeOrders: activeOrdersRes.count || 0,
                lowStockProducts: 0,
                revenueToday: 0,
                revenueThisWeek: 0,
                pendingReviews: ((pendingReviewsRes.data || []) as Record<string, unknown>[]).map((m) => ({
                    id: m.id,
                    company: m.company_name || m.email,
                    type: m.kyb_status === 'in_progress' ? 'KYB Review' : 'Pending Start',
                    submittedAt: m.created_at,
                })),
                recentActivity: ((recentActivityRes.data || []) as Record<string, unknown>[]).map((a) => ({
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
        return NextResponse.json({ error: 'Failed to load dashboard data. Please refresh the page.' }, { status: 500 });
    }
}
