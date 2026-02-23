import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

// Mark as dynamic
export const dynamic = 'force-dynamic';

// Supabase client for server-side operations
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

/**
 * POST /api/v1/admin/logout-backup-session
 * Clear the backup session cookie and invalidate the session token
 */
export async function POST(request: NextRequest) {
    try {
        const cookieStore = await cookies();
        const sessionToken = cookieStore.get('admin_backup_session')?.value;

        if (sessionToken) {
            const supabase = createClient(supabaseUrl, supabaseServiceKey);

            // Delete the session token from the database
            await supabase
                .from('admin_login_codes')
                .delete()
                .eq('code', `session:${sessionToken}`);
        }

        // Clear the cookie
        const response = NextResponse.json({ success: true });
        response.cookies.set('admin_backup_session', '', {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            expires: new Date(0), // Expire immediately
            path: '/',
        });

        return response;
    } catch (error) {
        console.error('Logout backup session error:', error);
        return NextResponse.json({ error: 'Failed to end admin session. You can clear your browser cookies to force logout.' }, { status: 500 });
    }
}
