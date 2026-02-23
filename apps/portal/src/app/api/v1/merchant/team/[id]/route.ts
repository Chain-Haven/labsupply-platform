/**
 * PATCH /api/v1/merchant/team/[id] - Update team member role or deactivate
 * DELETE /api/v1/merchant/team/[id] - Remove team member
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireMerchantRole, getServiceClient } from '@/lib/merchant-api-auth';

export const dynamic = 'force-dynamic';

export async function PATCH(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const authResult = await requireMerchantRole('MERCHANT_ADMIN');
        if (authResult instanceof NextResponse) return authResult;
        const { merchant, role: callerRole, userId } = authResult.data;

        const body = await request.json();
        const serviceClient = getServiceClient();

        const { data: member } = await serviceClient
            .from('merchant_users')
            .select('*')
            .eq('id', params.id)
            .eq('merchant_id', merchant.id)
            .single();

        if (!member) {
            return NextResponse.json({ error: 'Team member not found.' }, { status: 404 });
        }

        // Cannot modify the merchant owner
        if (member.role === 'MERCHANT_OWNER') {
            return NextResponse.json({ error: 'Cannot modify the account owner.' }, { status: 403 });
        }

        // MERCHANT_ADMIN can only modify MERCHANT_USER
        if (callerRole === 'MERCHANT_ADMIN' && member.role !== 'MERCHANT_USER') {
            return NextResponse.json(
                { error: 'Insufficient permissions to modify this member.' },
                { status: 403 }
            );
        }

        const updates: Record<string, unknown> = {};

        if (body.role !== undefined) {
            const validRoles = ['MERCHANT_ADMIN', 'MERCHANT_USER'];
            if (!validRoles.includes(body.role)) {
                return NextResponse.json({ error: 'Invalid role.' }, { status: 400 });
            }
            // Only OWNER can promote to ADMIN
            if (body.role === 'MERCHANT_ADMIN' && callerRole !== 'MERCHANT_OWNER') {
                return NextResponse.json(
                    { error: 'Only the account owner can promote to Admin.' },
                    { status: 403 }
                );
            }
            updates.role = body.role;
        }

        if (body.is_active !== undefined) {
            updates.is_active = body.is_active;
        }

        if (Object.keys(updates).length === 0) {
            return NextResponse.json({ error: 'No valid fields to update.' }, { status: 400 });
        }

        const { data: updated, error } = await serviceClient
            .from('merchant_users')
            .update(updates)
            .eq('id', params.id)
            .select()
            .single();

        if (error) {
            return NextResponse.json({ error: 'Failed to update team member.' }, { status: 500 });
        }

        await serviceClient.from('audit_events').insert({
            actor_user_id: userId,
            merchant_id: merchant.id,
            action: 'team.member_updated',
            entity_type: 'merchant_user',
            entity_id: params.id,
            old_values: { role: member.role, is_active: member.is_active },
            new_values: updates,
        }).then(() => {}, () => {});

        return NextResponse.json(updated);
    } catch (err) {
        console.error('Error in PATCH /api/v1/merchant/team/[id]:', err);
        return NextResponse.json({ error: 'Failed to update team member.' }, { status: 500 });
    }
}

export async function DELETE(
    _request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const authResult = await requireMerchantRole('MERCHANT_ADMIN');
        if (authResult instanceof NextResponse) return authResult;
        const { merchant, role: callerRole, userId } = authResult.data;

        const serviceClient = getServiceClient();

        const { data: member } = await serviceClient
            .from('merchant_users')
            .select('*')
            .eq('id', params.id)
            .eq('merchant_id', merchant.id)
            .single();

        if (!member) {
            return NextResponse.json({ error: 'Team member not found.' }, { status: 404 });
        }

        if (member.role === 'MERCHANT_OWNER') {
            return NextResponse.json({ error: 'Cannot remove the account owner.' }, { status: 403 });
        }

        // Cannot remove yourself
        if (member.user_id === userId) {
            return NextResponse.json({ error: 'Cannot remove yourself from the team.' }, { status: 403 });
        }

        // MERCHANT_ADMIN can only remove MERCHANT_USER
        if (callerRole === 'MERCHANT_ADMIN' && member.role !== 'MERCHANT_USER') {
            return NextResponse.json(
                { error: 'Insufficient permissions to remove this member.' },
                { status: 403 }
            );
        }

        const { error } = await serviceClient
            .from('merchant_users')
            .delete()
            .eq('id', params.id);

        if (error) {
            return NextResponse.json({ error: 'Failed to remove team member.' }, { status: 500 });
        }

        await serviceClient.from('audit_events').insert({
            actor_user_id: userId,
            merchant_id: merchant.id,
            action: 'team.member_removed',
            entity_type: 'merchant_user',
            entity_id: params.id,
            old_values: { email: member.email, role: member.role },
        }).then(() => {}, () => {});

        return NextResponse.json({ success: true });
    } catch (err) {
        console.error('Error in DELETE /api/v1/merchant/team/[id]:', err);
        return NextResponse.json({ error: 'Failed to remove team member.' }, { status: 500 });
    }
}
