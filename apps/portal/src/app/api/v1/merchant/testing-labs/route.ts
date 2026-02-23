/**
 * GET /api/v1/merchant/testing-labs
 * Returns active testing labs for merchant-facing testing order flow.
 * Authenticated merchants can see active labs but cannot modify them.
 */

import { NextResponse } from 'next/server';
import { requireMerchant, getServiceClient } from '@/lib/merchant-api-auth';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const authResult = await requireMerchant();
        if (authResult instanceof NextResponse) return authResult;

        const sc = getServiceClient();

        const { data, error } = await sc
            .from('testing_labs')
            .select('id, name, email, phone, is_default, active')
            .eq('active', true)
            .order('is_default', { ascending: false })
            .order('name', { ascending: true });

        if (error) {
            return NextResponse.json({ data: [] });
        }

        return NextResponse.json({ data: data || [] });
    } catch (error) {
        console.error('Merchant testing labs error:', error);
        return NextResponse.json({ data: [] });
    }
}
