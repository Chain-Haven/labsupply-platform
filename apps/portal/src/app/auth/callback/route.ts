import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
    const requestUrl = new URL(request.url);
    const code = requestUrl.searchParams.get('code');
    const next = requestUrl.searchParams.get('next') || '/admin';
    const type = requestUrl.searchParams.get('type');

    if (code) {
        const supabase = createRouteHandlerClient({ cookies });

        // Exchange the code for a session
        const { error } = await supabase.auth.exchangeCodeForSession(code);

        if (error) {
            console.error('Auth callback error:', error);
            // Redirect to login with error
            return NextResponse.redirect(new URL('/admin/login?error=auth_failed', requestUrl.origin));
        }

        // If this is a password recovery, redirect to reset password page
        if (type === 'recovery') {
            return NextResponse.redirect(new URL('/auth/reset-password', requestUrl.origin));
        }

        // Default redirect to next or admin
        return NextResponse.redirect(new URL(next, requestUrl.origin));
    }

    // If there's a token_hash and type (for password reset via email link)
    const tokenHash = requestUrl.searchParams.get('token_hash');
    if (tokenHash && type === 'recovery') {
        // Redirect to reset password with the token in the URL
        const resetUrl = new URL('/auth/reset-password', requestUrl.origin);
        resetUrl.searchParams.set('token_hash', tokenHash);
        resetUrl.searchParams.set('type', type);
        return NextResponse.redirect(resetUrl);
    }

    // No code provided, redirect to login
    return NextResponse.redirect(new URL('/admin/login', requestUrl.origin));
}
