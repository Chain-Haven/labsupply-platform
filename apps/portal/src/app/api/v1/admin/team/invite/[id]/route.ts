/**
 * DELETE /api/v1/admin/team/invite/[id] - Revoke a pending admin invitation
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireAdmin } from '@/lib/admin-api-auth';

export const dynamic = 'force-dynamic';

function getServiceClient() {
    return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
}

export async function DELETE(
    _request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const authResult = await requireAdmin();
        if (authResult instanceof NextResponse) return authResult;
        const { admin } = authResult;

        if (admin.role !== 'super_admin') {
            return NextResponse.json({ error: 'Only super admins can revoke invitations.' }, { status: 403 });
        }

        const serviceClient = getServiceClient();

        const { data: invitation } = await serviceClient
            .from('invitations')
            .select('id, status')
            .eq('id', params.id)
            .eq('scope', 'admin')
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

        return NextResponse.json({ success: true });
    } catch (err) {
        console.error('Error in DELETE /api/v1/admin/team/invite/[id]:', err);
        return NextResponse.json({ error: 'Failed to revoke invitation.' }, { status: 500 });
    }
}
