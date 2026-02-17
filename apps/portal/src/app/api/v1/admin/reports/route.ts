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

        // Orders table may not exist
        const ordersRes = await safeQuery(() =>
            supabase.from('orders')
                .select('actual_total_cents, shipped_at, created_at, status')
                .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
                .order('created_at', { ascending: true })
        );

        const totalRevenueRes = await safeQuery(() =>
            supabase.from('orders')
                .select('actual_total_cents')
                .eq('status', 'COMPLETE')
                .not('actual_total_cents', 'is', null)
        );

        const orderCountRes = await safeQuery(() =>
            supabase.from('orders').select('id', { count: 'exact', head: true })
        );

        const merchantCountRes = await safeQuery(() =>
            supabase.from('merchants').select('id', { count: 'exact', head: true }).eq('status', 'approved')
        );

        const statusBreakdownRes = await safeQuery(() =>
            supabase.from('orders').select('status')
        );

        // Compute daily revenue
        const dailyRevenue: Record<string, number> = {};
        for (const order of ((ordersRes.data || []) as Record<string, unknown>[])) {
            if (order.actual_total_cents && order.shipped_at) {
                const day = (order.shipped_at as string).split('T')[0];
                dailyRevenue[day] = (dailyRevenue[day] || 0) + (order.actual_total_cents as number);
            }
        }
        const revenueByDay = Object.entries(dailyRevenue)
            .map(([date, amount]) => ({ date, amount }))
            .sort((a, b) => a.date.localeCompare(b.date));

        const totalRevenue = ((totalRevenueRes.data || []) as Record<string, number>[]).reduce(
            (sum, r) => sum + (r.actual_total_cents || 0), 0
        );

        const statusCounts: Record<string, number> = {};
        for (const order of ((statusBreakdownRes.data || []) as Record<string, string>[])) {
            statusCounts[order.status] = (statusCounts[order.status] || 0) + 1;
        }

        return NextResponse.json({
            data: {
                totalRevenue,
                totalOrders: orderCountRes.count || 0,
                activeMerchants: merchantCountRes.count || 0,
                revenueByDay,
                ordersByStatus: Object.entries(statusCounts).map(([status, count]) => ({ status, count })),
            },
        });
    } catch (error) {
        console.error('Reports API error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
