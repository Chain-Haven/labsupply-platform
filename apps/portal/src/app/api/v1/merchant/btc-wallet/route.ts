/**
 * GET /api/v1/merchant/btc-wallet
 * Returns BTC wallet balance for the authenticated merchant.
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

async function getAuthenticatedMerchantId(): Promise<string | null> {
    const supabase = createRouteHandlerClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) return null;

    const sc = getServiceClient();
    const { data: merchant } = await sc
        .from('merchants')
        .select('id')
        .eq('user_id', user.id)
        .single();

    return merchant?.id || null;
}

function formatBtc(sats: number): string {
    return (sats / 100_000_000).toFixed(8);
}

export async function GET() {
    try {
        const merchantId = await getAuthenticatedMerchantId();
        if (!merchantId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const sc = getServiceClient();

        // Get BTC wallet
        const { data: wallet } = await sc
            .from('wallet_accounts')
            .select('balance_cents, reserved_cents')
            .eq('merchant_id', merchantId)
            .eq('currency', 'BTC')
            .single();

        const balanceSats = wallet?.balance_cents || 0;
        const reservedSats = wallet?.reserved_cents || 0;
        const availableSats = Math.max(0, balanceSats - reservedSats);

        // Count pending deposits
        const { count: pendingCount } = await sc
            .from('btc_deposits')
            .select('id', { count: 'exact', head: true })
            .eq('merchant_id', merchantId)
            .in('status', ['PENDING', 'CONFIRMED']);

        return NextResponse.json({
            data: {
                balance_sats: balanceSats,
                reserved_sats: reservedSats,
                available_sats: availableSats,
                balance_btc: formatBtc(balanceSats),
                pending_deposits: pendingCount || 0,
            },
        });
    } catch (error) {
        console.error('BTC wallet fetch error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
