/**
 * GET /api/v1/admin/team - List admin users and pending admin invitations
 */

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireAdmin } from '@/lib/admin-api-auth';

export const dynamic = 'force-dynamic';

function getServiceClient() {
    return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
}

export async function GET() {
    try {
        const authResult = await requireAdmin();
        if (authResult instanceof NextResponse) return authResult;

        const serviceClient = getServiceClient();

        const [adminsResult, invitationsResult] = await Promise.all([
            serviceClient
                .from('admin_users')
                .select('*')
                .order('created_at', { ascending: true }),
            serviceClient
                .from('invitations')
                .select('*')
                .eq('scope', 'admin')
                .eq('status', 'pending')
                .order('created_at', { ascending: false }),
        ]);

        return NextResponse.json({
            admins: adminsResult.data ?? [],
            invitations: invitationsResult.data ?? [],
        });
    } catch (err) {
        console.error('Error in GET /api/v1/admin/team:', err);
        return NextResponse.json({ error: 'Failed to load admin team data' }, { status: 500 });
    }
}
