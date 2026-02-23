/**
 * DELETE /api/v1/merchant/team/invite/[id] - Revoke a pending invitation
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireMerchantRole, getServiceClient } from '@/lib/merchant-api-auth';

export const dynamic = 'force-dynamic';

export async function DELETE(
    _request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const authResult = await requireMerchantRole('MERCHANT_ADMIN');
        if (authResult instanceof NextResponse) return authResult;
        const { merchant, userId } = authResult.data;

        const serviceClient = getServiceClient();

        const { data: invitation } = await serviceClient
            .from('invitations')
            .select('id, status')
            .eq('id', params.id)
            .eq('merchant_id', merchant.id)
            .eq('status', 'pending')
            .single();

        if (!invitation) {
            return NextResponse.json({ error: 'Invitation not found or already processed.' }, { status: 404 });
        }

        const { error } = await serviceClient
            .from('invitations')
            .update({ status: 'revoked' })
            .eq('id', params.id);

        if (error) {
            return NextResponse.json({ error: 'Failed to revoke invitation.' }, { status: 500 });
        }

        await serviceClient.from('audit_events').insert({
            actor_user_id: userId,
            merchant_id: merchant.id,
            action: 'team.invite_revoked',
            entity_type: 'invitation',
            entity_id: params.id,
        }).then(() => {}, () => {});

        return NextResponse.json({ success: true });
    } catch (err) {
        console.error('Error in DELETE /api/v1/merchant/team/invite/[id]:', err);
        return NextResponse.json({ error: 'Failed to revoke invitation.' }, { status: 500 });
    }
}
