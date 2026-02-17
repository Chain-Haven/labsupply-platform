import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Determine the correct login page based on the `next` hint.
 * Admin-targeted flows go to /admin/login, everything else to /login.
 */
function getErrorRedirectPath(next: string | null): string {
    if (next && next.startsWith('/admin')) {
        return '/admin/login';
    }
    return '/login';
}

/**
 * Create a Supabase service-role client for cross-table lookups.
 * Required because the session-scoped client may not have access
 * to admin_users or merchants for other users via RLS.
 */
function getServiceClient() {
    return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { auth: { autoRefreshToken: false, persistSession: false } }
    );
}

export async function GET(request: NextRequest) {
    const requestUrl = new URL(request.url);
    const code = requestUrl.searchParams.get('code');
    const next = requestUrl.searchParams.get('next');
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

            const errorLoginPath = getErrorRedirectPath(next);
            return NextResponse.redirect(
                new URL(`${errorLoginPath}?error=auth_failed`, requestUrl.origin)
            );
        }

        // Password recovery flow
        if (type === 'recovery' || next === '/auth/reset-password') {
            return NextResponse.redirect(
                new URL('/auth/reset-password', requestUrl.origin)
            );
        }

        // If the caller specified a non-standard next (e.g. /auth/reset-password),
        // honour it directly without role checks
        if (next && next !== '/admin' && next !== '/dashboard') {
            return NextResponse.redirect(new URL(next, requestUrl.origin));
        }

        // --- Role-based routing ---
        // Determine whether the authenticated user is an admin, a merchant, or both,
        // then route them to the correct portal.
        try {
            const { data: { user } } = await supabase.auth.getUser();

            if (user) {
                const serviceClient = getServiceClient();
                const email = user.email?.toLowerCase() || '';

                const [adminResult, merchantResult] = await Promise.all([
                    serviceClient
                        .from('admin_users')
                        .select('id')
                        .eq('email', email)
                        .maybeSingle(),
                    serviceClient
                        .from('merchants')
                        .select('id')
                        .eq('user_id', user.id)
                        .maybeSingle(),
                ]);

                const isAdmin = !!adminResult.data;
                const isMerchant = !!merchantResult.data;

                // If the `next` hint says /admin and the user is an admin, go there
                if (next === '/admin' && isAdmin) {
                    return NextResponse.redirect(new URL('/admin', requestUrl.origin));
                }

                // If the `next` hint says /dashboard and the user is a merchant, go there
                if (next === '/dashboard' && isMerchant) {
                    return NextResponse.redirect(new URL('/dashboard', requestUrl.origin));
                }

                // No hint or hint didn't match -- route based on role
                if (isMerchant) {
                    return NextResponse.redirect(new URL('/dashboard', requestUrl.origin));
                }
                if (isAdmin) {
                    return NextResponse.redirect(new URL('/admin', requestUrl.origin));
                }

                // User exists in auth but has no merchant or admin record
                return NextResponse.redirect(
                    new URL('/login?error=no_account', requestUrl.origin)
                );
            }
        } catch (roleCheckError) {
            console.error('Role check error in auth callback:', roleCheckError);
        }

        // Fallback: if role check failed, use the `next` hint or default to /login
        if (next) {
            return NextResponse.redirect(new URL(next, requestUrl.origin));
        }
        return NextResponse.redirect(new URL('/login', requestUrl.origin));
    }

    // Handle token_hash flow (some Supabase versions use this for email links)
    const tokenHash = requestUrl.searchParams.get('token_hash');
    if (tokenHash && type === 'recovery') {
        const resetUrl = new URL('/auth/reset-password', requestUrl.origin);
        resetUrl.searchParams.set('token_hash', tokenHash);
        resetUrl.searchParams.set('type', type);
        return NextResponse.redirect(resetUrl);
    }

    // No code provided -- redirect to the appropriate login page
    if (next && next.startsWith('/admin')) {
        return NextResponse.redirect(new URL('/admin/login', requestUrl.origin));
    }
    return NextResponse.redirect(new URL('/login', requestUrl.origin));
}
