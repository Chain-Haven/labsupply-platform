/**
 * GET /api/v1/merchant/invoices
 * List Mercury invoices for the authenticated merchant
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireMerchant, getServiceClient } from '@/lib/merchant-api-auth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    try {
        const authResult = await requireMerchant();
        if (authResult instanceof NextResponse) return authResult;
        const { merchant } = authResult.data;

        const { searchParams } = new URL(request.url);
        const status = searchParams.get('status');
        const page = parseInt(searchParams.get('page') || '1', 10);
        const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 100);
        const offset = (page - 1) * limit;

        const supabase = getServiceClient();
        let query = supabase
            .from('mercury_invoices')
            .select('*', { count: 'exact' })
            .eq('merchant_id', merchant.id)
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1);

        if (status) {
            query = query.eq('status', status);
        }

        const { data: invoices, count, error } = await query;

        if (error) {
            console.error('Error fetching invoices:', error);
            return NextResponse.json({ error: 'Failed to load invoices from the database. Please refresh and try again.' }, { status: 500 });
        }

        return NextResponse.json({
            data: invoices || [],
            pagination: {
                page,
                limit,
                total: count || 0,
                has_more: (count || 0) > offset + limit,
            },
        });
    } catch (error) {
        console.error('Invoice list error:', error);
        return NextResponse.json({ error: 'Failed to load invoices due to an unexpected error. Please try again.' }, { status: 500 });
    }
}
