/**
 * GET /api/v1/admin/me — Return the authenticated user's admin profile.
 * Uses service role for DB queries to avoid client-side RLS issues.
 */

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createRouteHandlerClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const supabase = createRouteHandlerClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
        }

        const serviceClient = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );

        const email = user.email?.toLowerCase() || '';

        // Admin must exist in admin_users table -- no auto-creation or email-based bypass
        const { data: adminData, error: dbError } = await serviceClient
            .from('admin_users')
            .select('*')
            .eq('email', email)
            .single();

        if (dbError && dbError.code !== 'PGRST116') {
            console.error('Error checking admin status:', dbError);
        }

        if (adminData) {
            // Link user_id if not already set
            if (!adminData.user_id && user.id) {
                await serviceClient
                    .from('admin_users')
                    .update({ user_id: user.id })
                    .eq('id', adminData.id);
            }
            return NextResponse.json({ admin: adminData });
        }

        return NextResponse.json({ error: 'Not an admin' }, { status: 403 });
    } catch (err) {
        console.error('Error in GET /api/v1/admin/me:', err);
        return NextResponse.json({ error: 'Failed to verify admin session. Please log in again.' }, { status: 500 });
    }
}
