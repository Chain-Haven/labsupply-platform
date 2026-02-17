/**
 * Server-side auth confirmation Route Handler.
 *
 * ALL Supabase email links (magic link, password reset, email confirmation)
 * redirect here. The server exchanges the PKCE code for a session using
 * cookies() from next/headers — which can reliably read the code_verifier
 * cookie that was set when the user initiated the flow.
 *
 * This is the Supabase-recommended approach for Next.js App Router.
 */

import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import type { EmailOtpType } from '@supabase/supabase-js';

function getServiceClient() {
    return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { auth: { autoRefreshToken: false, persistSession: false } }
    );
}

export async function GET(request: NextRequest) {
    const { searchParams, origin } = new URL(request.url);
    const code = searchParams.get('code');
    const tokenHash = searchParams.get('token_hash');
    const type = searchParams.get('type') as EmailOtpType | null;
    const next = searchParams.get('next') || '/dashboard';

    // Detect recovery flow
    const isRecovery =
        type === 'recovery' ||
        next === '/auth/reset-password' ||
        next.includes('reset-password');

    // Build a Supabase server client that can read/write cookies
    const cookieStore = cookies();
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return cookieStore.getAll();
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value, options }) => {
                        try {
                            cookieStore.set(name, value, options);
                        } catch {
                            // May throw in edge runtime
                        }
                    });
                },
            },
        }
    );

    // ---- Exchange the code or token_hash for a session ----
    let exchangeError: string | null = null;

    if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) {
            console.error('Auth confirm code exchange error:', error.message);
            exchangeError = error.message;
        }
    } else if (tokenHash && type) {
        const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
        if (error) {
            console.error('Auth confirm token_hash error:', error.message);
            exchangeError = error.message;
        }
    } else {
        exchangeError = 'No code or token_hash provided';
    }

    // ---- On error, redirect to the appropriate login/error page ----
    if (exchangeError) {
        if (isRecovery) {
            return NextResponse.redirect(
                new URL('/forgot-password?error=expired', origin)
            );
        }
        const errorPath = next.startsWith('/admin') ? '/admin/login' : '/login';
        return NextResponse.redirect(
            new URL(`${errorPath}?error=auth_failed`, origin)
        );
    }

    // ---- Recovery: redirect straight to reset-password page ----
    if (isRecovery) {
        return NextResponse.redirect(new URL('/auth/reset-password', origin));
    }

    // ---- Non-standard next: redirect directly ----
    if (next !== '/admin' && next !== '/dashboard') {
        return NextResponse.redirect(new URL(next, origin));
    }

    // ---- Role-based routing for magic link / email confirmation ----
    try {
        const { data: { user } } = await supabase.auth.getUser();

        if (user) {
            const serviceClient = getServiceClient();
            const email = user.email?.toLowerCase() || '';

            const [adminResult, merchantResult] = await Promise.all([
                serviceClient.from('admin_users').select('id').eq('email', email).maybeSingle(),
                serviceClient.from('merchants').select('id').eq('user_id', user.id).maybeSingle(),
            ]);

            const isAdmin = !!adminResult.data;
            const isMerchant = !!merchantResult.data;

            if (next === '/admin' && isAdmin) {
                return NextResponse.redirect(new URL('/admin', origin));
            }
            if (next === '/dashboard' && isMerchant) {
                return NextResponse.redirect(new URL('/dashboard', origin));
            }
            if (isMerchant) {
                return NextResponse.redirect(new URL('/dashboard', origin));
            }
            if (isAdmin) {
                return NextResponse.redirect(new URL('/admin', origin));
            }

            return NextResponse.redirect(new URL('/login?error=no_account', origin));
        }
    } catch (err) {
        console.error('Role check error in auth confirm:', err);
    }

    // Fallback
    return NextResponse.redirect(new URL(next, origin));
}
