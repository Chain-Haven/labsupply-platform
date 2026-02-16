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

        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

        const [
            ordersRes,
            totalRevenueRes,
            orderCountRes,
            merchantCountRes,
            statusBreakdownRes,
        ] = await Promise.all([
            // Recent orders with totals for daily revenue
            supabase.from('orders')
                .select('actual_total_cents, shipped_at, created_at, status')
                .gte('created_at', thirtyDaysAgo)
                .order('created_at', { ascending: true }),
            // Total lifetime revenue
            supabase.from('orders')
                .select('actual_total_cents')
                .eq('status', 'COMPLETE')
                .not('actual_total_cents', 'is', null),
            // Total order count
            supabase.from('orders').select('id', { count: 'exact', head: true }),
            // Active merchant count
            supabase.from('merchants').select('id', { count: 'exact', head: true }).eq('status', 'approved'),
            // Orders by status
            supabase.from('orders').select('status'),
        ]);

        // Compute daily revenue for last 30 days
        const dailyRevenue: Record<string, number> = {};
        for (const order of (ordersRes.data || [])) {
            const o = order as { actual_total_cents?: number; shipped_at?: string; created_at: string; status: string };
            if (o.actual_total_cents && o.shipped_at) {
                const day = o.shipped_at.split('T')[0];
                dailyRevenue[day] = (dailyRevenue[day] || 0) + o.actual_total_cents;
            }
        }
        const revenueByDay = Object.entries(dailyRevenue)
            .map(([date, amount]) => ({ date, amount }))
            .sort((a, b) => a.date.localeCompare(b.date));

        // Total revenue
        const totalRevenue = (totalRevenueRes.data || []).reduce(
            (sum: number, r: { actual_total_cents: number }) => sum + (r.actual_total_cents || 0), 0
        );

        // Status breakdown
        const statusCounts: Record<string, number> = {};
        for (const order of (statusBreakdownRes.data || [])) {
            const o = order as { status: string };
            statusCounts[o.status] = (statusCounts[o.status] || 0) + 1;
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
