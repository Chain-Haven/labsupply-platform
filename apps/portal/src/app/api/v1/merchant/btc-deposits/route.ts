/**
 * GET /api/v1/merchant/btc-deposits
 * List BTC deposits for the authenticated merchant (pending + confirmed + credited).
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

export async function GET() {
    try {
        const merchantId = await getAuthenticatedMerchantId();
        if (!merchantId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const sc = getServiceClient();

        const { data: deposits, error } = await sc
            .from('btc_deposits')
            .select('id, purpose, address, txid, vout, amount_sats, confirmations, block_height, status, first_seen_at, credited_at')
            .eq('merchant_id', merchantId)
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
