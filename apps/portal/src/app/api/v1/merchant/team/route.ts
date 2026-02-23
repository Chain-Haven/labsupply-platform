/**
 * GET /api/v1/merchant/team - List team members and pending invitations
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

        const [membersResult, invitationsResult] = await Promise.all([
            serviceClient
                .from('merchant_users')
                .select('*')
                .eq('merchant_id', merchant.id)
                .order('created_at', { ascending: true }),
            serviceClient
                .from('invitations')
                .select('*')
                .eq('merchant_id', merchant.id)
                .eq('scope', 'merchant')
                .eq('status', 'pending')
                .order('created_at', { ascending: false }),
        ]);

        return NextResponse.json({
            members: membersResult.data ?? [],
            invitations: invitationsResult.data ?? [],
        });
    } catch (err) {
        console.error('Error in GET /api/v1/merchant/team:', err);
        return NextResponse.json({ error: 'Failed to load team data' }, { status: 500 });
    }
}
