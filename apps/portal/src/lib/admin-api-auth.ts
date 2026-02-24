/**
 * Server-side admin authentication for API routes.
 * Verifies the caller is an authenticated admin via Supabase session
 * or backup session cookie before allowing access to admin endpoints.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createRouteHandlerClient } from '@/lib/supabase-server';
import { cookies } from 'next/headers';

interface AdminUser {
    id: string;
    email: string;
    role: 'super_admin' | 'admin';
}

/**
 * Verify the request is from an authenticated admin.
 * The user MUST exist in the admin_users table -- there is no fallback
 * or auto-promotion based on email address.
 */
export async function getAuthenticatedAdmin(request?: NextRequest): Promise<AdminUser | null> {
    const serviceClient = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Method 1: Check Supabase session via cookies
    try {
        const supabase = createRouteHandlerClient();
        const { data: { user }, error } = await supabase.auth.getUser();

        if (!error && user?.email) {
            const email = user.email.toLowerCase();

            const { data: admin } = await serviceClient
                .from('admin_users')
                .select('id, email, role, is_active')
                .eq('email', email)
                .single();

            if (admin && admin.is_active !== false) {
                return { id: admin.id, email: admin.email, role: admin.role };
            }
        }
    } catch {
        // Session check failed, try backup
    }

    // Method 2: Check backup session cookie
    try {
        const cookieStore = cookies();
        const sessionToken = cookieStore.get('admin_backup_session')?.value;

        if (sessionToken) {
            const { data: sessionData } = await serviceClient
                .from('admin_login_codes')
                .select('email')
                .eq('code', `session:${sessionToken}`)
                .gt('expires_at', new Date().toISOString())
                .single();

            if (sessionData?.email) {
                const email = sessionData.email.toLowerCase();

                const { data: admin } = await serviceClient
                    .from('admin_users')
                    .select('id, email, role, is_active')
                    .eq('email', email)
                    .single();

                if (admin && admin.is_active !== false) {
                    return { id: admin.id, email: admin.email, role: admin.role };
                }
            }
        }
    } catch {
        // Backup session check failed
    }

    return null;
}

/**
 * Returns 401 response if not authenticated as admin.
 * Use at the top of any admin API route handler.
 */
export async function requireAdmin(request?: NextRequest): Promise<{ admin: AdminUser } | NextResponse> {
    const admin = await getAuthenticatedAdmin(request);
    if (!admin) {
        return NextResponse.json(
            { error: 'Unauthorized. Admin authentication required.' },
            { status: 401 }
        );
    }
    return { admin };
}
