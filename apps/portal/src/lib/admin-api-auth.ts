/**
 * Server-side admin authentication for API routes.
 * Verifies the caller is an authenticated admin via Supabase session
 * or backup session cookie before allowing access to admin endpoints.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createRouteHandlerClient } from '@/lib/supabase-server';
import { cookies } from 'next/headers';

const SUPER_ADMIN_EMAIL = process.env.SUPER_ADMIN_EMAIL || 'info@chainhaven.co';

interface AdminUser {
    id: string;
    email: string;
    role: 'super_admin' | 'admin';
}

/**
 * Verify the request is from an authenticated admin.
 * Checks Supabase auth session first, then backup session cookie.
 * Returns the admin user or null.
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

            // Check admin_users table
            const { data: admin } = await serviceClient
                .from('admin_users')
                .select('id, email, role')
                .eq('email', email)
                .single();

            if (admin) {
                return { id: admin.id, email: admin.email, role: admin.role };
            }

            // Auto-create super admin if they're in admin_users but not found
            if (email === SUPER_ADMIN_EMAIL.toLowerCase()) {
                return { id: user.id, email, role: 'super_admin' };
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

                if (email === SUPER_ADMIN_EMAIL.toLowerCase()) {
                    return { id: 'backup-session', email, role: 'super_admin' };
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
