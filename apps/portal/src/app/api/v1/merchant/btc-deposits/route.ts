/**
 * GET /api/v1/merchant/btc-deposits
 * List BTC deposits for the authenticated merchant (pending + confirmed + credited).
 */

import { NextResponse } from 'next/server';
import { requireMerchant, getServiceClient } from '@/lib/merchant-api-auth';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const authResult = await requireMerchant();
        if (authResult instanceof NextResponse) return authResult;
        const { merchant } = authResult.data;

        const sc = getServiceClient();

        const { data: deposits, error } = await sc
            .from('btc_deposits')
            .select('id, purpose, address, txid, vout, amount_sats, confirmations, block_height, status, first_seen_at, credited_at')
            .eq('merchant_id', merchant.id)
            .order('first_seen_at', { ascending: false })
            .limit(50);

        if (error) {
            console.error('Error fetching BTC deposits:', error);
            return NextResponse.json({ error: 'Failed to load BTC deposit history. Please refresh and try again.' }, { status: 500 });
        }

        return NextResponse.json({ data: deposits || [] });
    } catch (error) {
        console.error('BTC deposits fetch error:', error);
        return NextResponse.json({ error: 'BTC deposit lookup failed unexpectedly. Please try again.' }, { status: 500 });
    }
}
