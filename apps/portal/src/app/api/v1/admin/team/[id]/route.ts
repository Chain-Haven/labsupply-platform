/**
 * PATCH /api/v1/admin/team/[id] - Deactivate/reactivate an admin user
 * DELETE /api/v1/admin/team/[id] - Remove an admin user
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

export async function PATCH(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const authResult = await requireAdmin();
        if (authResult instanceof NextResponse) return authResult;
        const { admin } = authResult;

        if (admin.role !== 'super_admin') {
            return NextResponse.json({ error: 'Only super admins can manage admin users.' }, { status: 403 });
        }

        const body = await request.json();
        const serviceClient = getServiceClient();

        const { data: target } = await serviceClient
            .from('admin_users')
            .select('*')
            .eq('id', params.id)
            .single();

        if (!target) {
            return NextResponse.json({ error: 'Admin user not found.' }, { status: 404 });
        }

        if (target.role === 'super_admin') {
            return NextResponse.json({ error: 'Cannot modify the super admin.' }, { status: 403 });
        }

        const updates: Record<string, unknown> = {};
        if (body.is_active !== undefined) updates.is_active = body.is_active;

        if (Object.keys(updates).length === 0) {
            return NextResponse.json({ error: 'No valid fields to update.' }, { status: 400 });
        }

        const { data: updated, error } = await serviceClient
            .from('admin_users')
            .update(updates)
            .eq('id', params.id)
            .select()
            .single();

        if (error) {
            return NextResponse.json({ error: 'Failed to update admin user.' }, { status: 500 });
        }

        return NextResponse.json(updated);
    } catch (err) {
        console.error('Error in PATCH /api/v1/admin/team/[id]:', err);
        return NextResponse.json({ error: 'Failed to update admin user.' }, { status: 500 });
    }
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
            return NextResponse.json({ error: 'Only super admins can remove admin users.' }, { status: 403 });
        }

        const serviceClient = getServiceClient();

        const { data: target } = await serviceClient
            .from('admin_users')
            .select('*')
            .eq('id', params.id)
            .single();

        if (!target) {
            return NextResponse.json({ error: 'Admin user not found.' }, { status: 404 });
        }

        if (target.role === 'super_admin') {
            return NextResponse.json({ error: 'Cannot remove the super admin.' }, { status: 403 });
        }

        if (target.id === admin.id) {
            return NextResponse.json({ error: 'Cannot remove yourself.' }, { status: 403 });
        }

        const { error } = await serviceClient
            .from('admin_users')
            .delete()
            .eq('id', params.id);

        if (error) {
            return NextResponse.json({ error: 'Failed to remove admin user.' }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    } catch (err) {
        console.error('Error in DELETE /api/v1/admin/team/[id]:', err);
        return NextResponse.json({ error: 'Failed to remove admin user.' }, { status: 500 });
    }
}
