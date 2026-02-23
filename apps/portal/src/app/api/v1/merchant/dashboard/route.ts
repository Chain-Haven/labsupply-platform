/**
 * GET /api/v1/merchant/dashboard
 * Returns dashboard summary data for the authenticated merchant.
 */

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createRouteHandlerClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

function getServiceClient() {
    return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
}

async function getAuthMerchant() {
    const supabase = createRouteHandlerClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) return null;

    const { data: merchant } = await getServiceClient()
        .from('merchants')
        .select('id')
        .eq('user_id', user.id)
        .single();

    return merchant;
}

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
        const merchant = await getAuthMerchant();
        if (!merchant) {
            return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
        }

        const supabase = getServiceClient();

        const now = new Date();
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

        const [walletRes, activeOrdersRes, productCountRes, monthlySpendRes, recentOrdersRes, thresholdRes] =
            await Promise.all([
                safeQuery(() =>
                    supabase
                        .from('wallet_accounts')
                        .select('balance_cents, reserved_cents')
                        .eq('merchant_id', merchant.id)
                        .eq('currency', 'USD')
                        .single()
                ),
                safeQuery(() =>
                    supabase
                        .from('orders')
                        .select('id', { count: 'exact', head: true })
                        .eq('merchant_id', merchant.id)
                        .not('status', 'in', '("COMPLETE","CANCELLED","REFUNDED")')
                ),
                safeQuery(() =>
                    supabase
                        .from('merchant_products')
                        .select('id', { count: 'exact', head: true })
                        .eq('merchant_id', merchant.id)
                        .eq('allowed', true)
                ),
                safeQuery(() =>
                    supabase
                        .from('orders')
                        .select('actual_total_cents')
                        .eq('merchant_id', merchant.id)
                        .in('status', ['SHIPPED', 'COMPLETE'])
                        .gte('shipped_at', monthStart)
                ),
                safeQuery(() =>
                    supabase
                        .from('orders')
                        .select('id, woo_order_id, woo_order_number, status, total_estimate_cents, created_at')
                        .eq('merchant_id', merchant.id)
                        .order('created_at', { ascending: false })
                        .limit(5)
                ),
                safeQuery(() =>
                    supabase
                        .from('merchants')
                        .select('low_balance_threshold_cents')
                        .eq('id', merchant.id)
                        .single()
                ),
            ]);

        const walletBalanceCents = walletRes.data?.balance_cents ?? 0;
        const reservedCents = walletRes.data?.reserved_cents ?? 0;
        const activeOrders = activeOrdersRes.count || 0;
        const productCount = productCountRes.count || 0;

        const monthlySpendCents = ((monthlySpendRes.data || []) as { actual_total_cents: number | null }[])
            .reduce((sum, row) => sum + (row.actual_total_cents ?? 0), 0);

        const recentOrders = ((recentOrdersRes.data || []) as Record<string, any>[]).map((o) => ({
            id: o.id,
            wooOrderId: o.woo_order_id,
            wooOrderNumber: o.woo_order_number,
            status: o.status,
            totalEstimateCents: o.total_estimate_cents,
            createdAt: o.created_at,
        }));

        const alerts: { type: string; message: string }[] = [];
        const threshold = thresholdRes.data?.low_balance_threshold_cents ?? 0;
        const available = walletBalanceCents - reservedCents;
        if (threshold > 0 && available < threshold) {
            alerts.push({
                type: 'low_balance',
                message: `Your wallet balance is low. Available funds: $${(available / 100).toFixed(2)}`,
            });
        }

        return NextResponse.json({
            data: {
                walletBalanceCents,
                reservedCents,
                activeOrders,
                productCount,
                monthlySpendCents,
                recentOrders,
                alerts,
            },
        });
    } catch (error) {
        console.error('Merchant dashboard API error:', error);
        return NextResponse.json(
            { error: 'Failed to load dashboard data. Please refresh the page.' },
            { status: 500 }
        );
    }
}
