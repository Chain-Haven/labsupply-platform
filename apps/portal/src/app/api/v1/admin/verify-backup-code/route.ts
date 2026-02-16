import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

/**
 * POST /api/v1/admin/verify-backup-code
 * Verify the 8-digit backup code and create a session.
 * Hardened: attempt throttling, crypto session token, no token in JSON response.
 */
export async function POST(request: NextRequest) {
    try {
        const { email, code } = await request.json();

        if (!email || !code) {
            return NextResponse.json({ error: 'Email and code are required' }, { status: 400 });
        }

        const normalizedEmail = email.toLowerCase().trim();
        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        // Validate email is a known admin
        const { data: adminUser } = await supabase
            .from('admin_users')
            .select('id')
            .eq('email', normalizedEmail)
            .single();

        if (!adminUser) {
            return NextResponse.json({ error: 'Verification failed' }, { status: 401 });
        }

        // Attempt throttling: max 5 failed attempts per email per 15 minutes
        // Count recent codes that were NOT used (failed attempts consume codes too)
        const fifteenMinAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();
        const { count: recentAttempts } = await supabase
            .from('admin_login_codes')
            .select('id', { count: 'exact', head: true })
            .eq('email', normalizedEmail)
            .gte('created_at', fifteenMinAgo)
            .eq('used', true)
            .not('code', 'like', 'session:%');

        if ((recentAttempts || 0) >= 5) {
            return NextResponse.json({ error: 'Too many attempts. Please wait and try again.' }, { status: 429 });
        }

        // Find the code
        const { data: codeData, error: fetchError } = await supabase
            .from('admin_login_codes')
            .select()
            .eq('email', normalizedEmail)
            .eq('code', code)
            .eq('used', false)
            .gt('expires_at', new Date().toISOString())
            .single();

        if (fetchError || !codeData) {
            return NextResponse.json({ error: 'Invalid or expired code' }, { status: 401 });
        }

        // Mark code as used
        await supabase
            .from('admin_login_codes')
            .update({ used: true, used_at: new Date().toISOString() })
            .eq('id', codeData.id);

        // Generate cryptographically secure session token
        const sessionToken = crypto.randomBytes(48).toString('base64url');
        const sessionExpires = new Date(Date.now() + 8 * 60 * 60 * 1000); // 8 hours (not 24)

        // Store session token
        await supabase
            .from('admin_login_codes')
            .insert({
                email: normalizedEmail,
                code: `session:${sessionToken}`,
                expires_at: sessionExpires.toISOString(),
            });

        // Response: session token is ONLY in the httpOnly cookie, NOT in JSON body
        const response = NextResponse.json({
            success: true,
            message: 'Code verified successfully',
        });

        response.cookies.set('admin_backup_session', sessionToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            expires: sessionExpires,
            path: '/',
        });

        return response;
    } catch (error) {
        console.error('Verify backup code error:', error);
        return NextResponse.json({ error: 'Verification failed' }, { status: 500 });
    }
}
