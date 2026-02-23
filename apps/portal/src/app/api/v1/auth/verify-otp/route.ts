import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

/**
 * POST /api/v1/auth/verify-otp
 * Verify the 8-digit OTP code and return a Supabase session token.
 * Uses admin.generateLink to create a magic link token that the client
 * can exchange for a proper Supabase session via verifyOtp.
 */
export async function POST(request: NextRequest) {
    try {
        const { email, code } = await request.json();

        if (!email || !code) {
            return NextResponse.json(
                { error: 'Email and code are required' },
                { status: 400 }
            );
        }

        const normalizedEmail = email.toLowerCase().trim();
        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        // Throttle: max 5 failed attempts per email per 15 minutes
        const fifteenMinAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();
        const { count: recentAttempts } = await supabase
            .from('admin_login_codes')
            .select('id', { count: 'exact', head: true })
            .eq('email', normalizedEmail)
            .gte('created_at', fifteenMinAgo)
            .eq('used', true)
            .not('code', 'like', 'session:%');

        if ((recentAttempts || 0) >= 5) {
            return NextResponse.json(
                { error: 'Too many attempts. Please wait and try again.' },
                { status: 429 }
            );
        }

        // Find the matching code
        const { data: codeData, error: fetchError } = await supabase
            .from('admin_login_codes')
            .select()
            .eq('email', normalizedEmail)
            .eq('code', code)
            .eq('used', false)
            .gt('expires_at', new Date().toISOString())
            .single();

        if (fetchError || !codeData) {
            return NextResponse.json(
                { error: 'Invalid or expired code' },
                { status: 401 }
            );
        }

        // Mark code as used
        await supabase
            .from('admin_login_codes')
            .update({ used: true, used_at: new Date().toISOString() })
            .eq('id', codeData.id);

        // Generate a magic link token for this user using admin API.
        // The client will use verifyOtp with this token_hash to establish a session.
        const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
            type: 'magiclink',
            email: normalizedEmail,
        });

        if (linkError || !linkData) {
            console.error('generateLink error:', linkError);
            return NextResponse.json(
                { error: 'Login code verified, but failed to create a session. Ensure your account has been registered and try again.' },
                { status: 500 }
            );
        }

        const tokenHash = linkData.properties.hashed_token;

        return NextResponse.json({
            success: true,
            token_hash: tokenHash,
        });
    } catch (error) {
        console.error('Verify OTP error:', error);
        return NextResponse.json(
            { error: 'Login code verification encountered an unexpected error. Please request a new code and try again.' },
            { status: 500 }
        );
    }
}
