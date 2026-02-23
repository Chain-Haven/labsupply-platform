/**
 * GET /api/v1/admin/me — Return the authenticated user's admin profile.
 * Uses service role for DB queries to avoid client-side RLS issues.
 */

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createRouteHandlerClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

const SUPER_ADMIN_EMAIL = process.env.NEXT_PUBLIC_SUPER_ADMIN_EMAIL || 'info@chainhaven.co';

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

        // Check admin_users table
        const { data: adminData, error: dbError } = await serviceClient
            .from('admin_users')
            .select('*')
            .eq('email', email)
            .single();

        if (dbError && dbError.code !== 'PGRST116') {
            console.error('Error checking admin status:', dbError);
        }

        // Auto-create super admin if not in table
        if (!adminData && email === SUPER_ADMIN_EMAIL) {
            const { data: newAdmin, error: insertError } = await serviceClient
                .from('admin_users')
                .insert({
                    user_id: user.id,
                    email,
                    name: 'WhiteLabel Admin',
                    role: 'super_admin',
                })
                .select()
                .single();

            if (!insertError && newAdmin) {
                return NextResponse.json({ admin: newAdmin });
            }
        }

        if (adminData) {
            return NextResponse.json({ admin: adminData });
        }

        return NextResponse.json({ error: 'Not an admin' }, { status: 403 });
    } catch (err) {
        console.error('Error in GET /api/v1/admin/me:', err);
        return NextResponse.json({ error: 'Failed to verify admin session. Please log in again.' }, { status: 500 });
    }
}
