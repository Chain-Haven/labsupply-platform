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

        const { error } = await supabase.auth.exchangeCodeForSession(code);

        if (error) {
            console.error('Auth callback error:', error);
            if (type === 'recovery') {
                return NextResponse.redirect(
                    new URL('/forgot-password?error=expired', requestUrl.origin)
                );
            }
            return NextResponse.redirect(
                new URL('/admin/login?error=auth_failed', requestUrl.origin)
            );
        }

        // Password recovery flow -- redirect to reset password page
        if (type === 'recovery' || next === '/auth/reset-password') {
            return NextResponse.redirect(
                new URL('/auth/reset-password', requestUrl.origin)
            );
        }

        return NextResponse.redirect(new URL(next, requestUrl.origin));
    }

    // Handle token_hash flow (some Supabase versions use this for email links)
    const tokenHash = requestUrl.searchParams.get('token_hash');
    if (tokenHash && type === 'recovery') {
        const resetUrl = new URL('/auth/reset-password', requestUrl.origin);
        resetUrl.searchParams.set('token_hash', tokenHash);
        resetUrl.searchParams.set('type', type);
        return NextResponse.redirect(resetUrl);
    }

    // No code provided, redirect based on context
    if (next && next !== '/admin') {
        return NextResponse.redirect(new URL(next, requestUrl.origin));
    }
    return NextResponse.redirect(new URL('/admin/login', requestUrl.origin));
}
