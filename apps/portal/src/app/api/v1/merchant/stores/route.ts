/**
 * GET /api/v1/merchant/stores
 * List connected stores for the authenticated merchant
 */

import { NextResponse } from 'next/server';
import { requireMerchant, getServiceClient } from '@/lib/merchant-api-auth';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const authResult = await requireMerchant();
        if (authResult instanceof NextResponse) return authResult;
        const { merchant } = authResult.data;

        const serviceClient = getServiceClient();
        const { data: stores, error } = await serviceClient
            .from('stores')
            .select('id, name, url, status, type, currency, last_sync_at, created_at')
            .eq('merchant_id', merchant.id)
            .order('created_at', { ascending: false });

        if (error) {
            return NextResponse.json({ data: [] });
        }

        return NextResponse.json({ data: stores || [] });
    } catch (error) {
        console.error('Merchant stores error:', error);
        return NextResponse.json({ data: [] });
    }
}
