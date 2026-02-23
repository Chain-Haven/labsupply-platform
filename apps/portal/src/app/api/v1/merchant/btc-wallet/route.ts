/**
 * GET /api/v1/merchant/btc-wallet
 * Returns BTC wallet balance for the authenticated merchant.
 */

import { NextResponse } from 'next/server';
import { requireMerchant, getServiceClient } from '@/lib/merchant-api-auth';

export const dynamic = 'force-dynamic';

function formatBtc(sats: number): string {
    return (sats / 100_000_000).toFixed(8);
}

export async function GET() {
    try {
        const authResult = await requireMerchant();
        if (authResult instanceof NextResponse) return authResult;
        const { merchant } = authResult.data;

        const sc = getServiceClient();

        // Get BTC wallet
        const { data: wallet } = await sc
            .from('wallet_accounts')
            .select('balance_cents, reserved_cents')
            .eq('merchant_id', merchant.id)
            .eq('currency', 'BTC')
            .single();

        const balanceSats = wallet?.balance_cents || 0;
        const reservedSats = wallet?.reserved_cents || 0;
        const availableSats = Math.max(0, balanceSats - reservedSats);

        // Count pending deposits
        const { count: pendingCount } = await sc
            .from('btc_deposits')
            .select('id', { count: 'exact', head: true })
            .eq('merchant_id', merchant.id)
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
        return NextResponse.json({ error: 'Failed to load BTC wallet data. Please refresh and try again.' }, { status: 500 });
    }
}
