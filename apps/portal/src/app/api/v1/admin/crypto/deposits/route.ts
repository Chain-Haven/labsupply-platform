/**
 * GET /api/v1/admin/crypto/deposits
 * List all BTC deposits across merchants with optional status filter.
 * Includes merchant info and explorer links.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createRouteHandlerClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

function getServiceClient() {
    return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
}

async function verifyAdmin(): Promise<boolean> {
    const supabase = createRouteHandlerClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) return false;

    const sc = getServiceClient();
    const { data: admin } = await sc
        .from('supplier_users')
        .select('user_id')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .single();

    return !!admin;
}

function getExplorerUrl(txid: string): string {
    const base = process.env.ESPLORA_BASE_URL || 'https://blockstream.info/api';
    if (base.includes('mempool.space')) return `https://mempool.space/tx/${txid}`;
    return `https://blockstream.info/tx/${txid}`;
}

export async function GET(request: NextRequest) {
    try {
        if (!(await verifyAdmin())) {
            return NextResponse.json({ error: 'Admin access required to view crypto deposits.' }, { status: 403 });
        }

        const { searchParams } = new URL(request.url);
        const status = searchParams.get('status');
        const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 200);
        const offset = parseInt(searchParams.get('offset') || '0');

        const sc = getServiceClient();

        let query = sc
            .from('btc_deposits')
            .select(`
                id, merchant_id, purpose, address, derivation_index,
                txid, vout, amount_sats, confirmations, block_height,
                status, first_seen_at, credited_at
            `)
            .order('first_seen_at', { ascending: false })
            .range(offset, offset + limit - 1);

        if (status) {
            query = query.eq('status', status);
        }

        const { data: deposits, error } = await query;

        if (error) {
            return NextResponse.json({ error: 'Failed to load crypto deposits from the database. Please refresh and try again.' }, { status: 500 });
        }

        // Enrich with merchant names
        const merchantIds = [...new Set((deposits || []).map(d => d.merchant_id))];
        const { data: merchants } = await sc
            .from('merchants')
            .select('id, name, company_name, contact_email')
            .in('id', merchantIds);

        const merchantMap = new Map(
            (merchants || []).map(m => [m.id, m])
        );

        const enriched = (deposits || []).map(d => ({
            ...d,
            merchant_name: merchantMap.get(d.merchant_id)?.company_name || merchantMap.get(d.merchant_id)?.name || 'Unknown',
            merchant_email: merchantMap.get(d.merchant_id)?.contact_email || '',
            explorer_url: getExplorerUrl(d.txid),
        }));

        return NextResponse.json({ data: enriched });
    } catch (error) {
        console.error('Admin deposits fetch error:', error);
        return NextResponse.json({ error: 'Crypto deposits operation failed unexpectedly. Please try again.' }, { status: 500 });
    }
}
