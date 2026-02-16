import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Mark as dynamic
export const dynamic = 'force-dynamic';

// Supabase client for server-side operations
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

/**
 * POST /api/v1/admin/verify-backup-code
 * Verify the 8-digit backup code and create a session
 */
export async function POST(request: NextRequest) {
    try {
        const { email, code } = await request.json();

        if (!email || !code) {
            return NextResponse.json({ error: 'Email and code are required' }, { status: 400 });
        }

        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        // Validate email is a known admin (check admin_users table)
        const { data: adminUser } = await supabase
            .from('admin_users')
            .select('id')
            .eq('email', email.toLowerCase())
            .single();

        if (!adminUser) {
            return NextResponse.json({ error: 'Invalid admin email' }, { status: 403 });
        }

        // Find the code
        const { data: codeData, error: fetchError } = await supabase
            .from('admin_login_codes')
            .select()
            .eq('email', email.toLowerCase())
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

        // Generate a session token for the admin
        // We'll use a simple token stored in cookies for now
        const sessionToken = generateSessionToken();
        const sessionExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

        // Store session token
        await supabase
            .from('admin_login_codes')
            .insert({
                email: email.toLowerCase(),
                code: `session:${sessionToken}`,
                expires_at: sessionExpires.toISOString(),
            });

        // Create response with session cookie
        const response = NextResponse.json({
            success: true,
            message: 'Code verified successfully',
            sessionToken,
        });

        // Set secure cookie
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
        return NextResponse.json({ error: 'Failed to verify code' }, { status: 500 });
    }
}

function generateSessionToken(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 64; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}
