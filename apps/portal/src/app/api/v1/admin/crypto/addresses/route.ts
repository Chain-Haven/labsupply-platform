/**
 * GET /api/v1/admin/crypto/addresses
 * List derived BTC addresses per merchant with purpose, index, status.
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

export async function GET(request: NextRequest) {
    try {
        if (!(await verifyAdmin())) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const { searchParams } = new URL(request.url);
        const merchantId = searchParams.get('merchant_id');
        const purpose = searchParams.get('purpose');
        const limit = Math.min(parseInt(searchParams.get('limit') || '100'), 500);
        const offset = parseInt(searchParams.get('offset') || '0');

        const sc = getServiceClient();

        let query = sc
            .from('btc_addresses')
            .select('id, merchant_id, purpose, derivation_index, address, status, created_at, used_at')
            .order('derivation_index', { ascending: true })
            .range(offset, offset + limit - 1);

        if (merchantId) query = query.eq('merchant_id', merchantId);
        if (purpose) query = query.eq('purpose', purpose);

        const { data: addresses, error } = await query;

        if (error) {
            return NextResponse.json({ error: 'Failed to fetch addresses' }, { status: 500 });
        }

        // Enrich with merchant names
        const merchantIds = [...new Set((addresses || []).map(a => a.merchant_id))];
        const { data: merchants } = await sc
            .from('merchants')
            .select('id, name, company_name')
            .in('id', merchantIds);

        const merchantMap = new Map(
            (merchants || []).map(m => [m.id, m])
        );

        const enriched = (addresses || []).map(a => ({
            ...a,
            merchant_name: merchantMap.get(a.merchant_id)?.company_name || merchantMap.get(a.merchant_id)?.name || 'Unknown',
        }));

        return NextResponse.json({ data: enriched });
    } catch (error) {
        console.error('Admin addresses fetch error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
