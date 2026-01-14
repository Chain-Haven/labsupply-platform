import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

// Mark as dynamic
export const dynamic = 'force-dynamic';

// Supabase client for server-side operations
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

/**
 * GET /api/v1/admin/validate-backup-session
 * Validate the backup session cookie and return admin info if valid
 */
export async function GET(request: NextRequest) {
    try {
        const cookieStore = await cookies();
        const sessionToken = cookieStore.get('admin_backup_session')?.value;

        if (!sessionToken) {
            return NextResponse.json({ valid: false }, { status: 401 });
        }

        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        // Look up the session token in admin_login_codes table
        // Session tokens are stored with prefix "session:" in the code field
        const { data: sessionData, error } = await supabase
            .from('admin_login_codes')
            .select('*')
            .eq('code', `session:${sessionToken}`)
            .gt('expires_at', new Date().toISOString())
            .single();

        if (error || !sessionData) {
            return NextResponse.json({ valid: false }, { status: 401 });
        }

        return NextResponse.json({
            valid: true,
            email: sessionData.email,
            expiresAt: sessionData.expires_at,
        });
    } catch (error) {
        console.error('Validate backup session error:', error);
        return NextResponse.json({ valid: false, error: 'Failed to validate session' }, { status: 500 });
    }
}
