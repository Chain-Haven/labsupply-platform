'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createBrowserClient } from '@/lib/supabase';
import { Loader2 } from 'lucide-react';

/**
 * Client-side auth callback page.
 *
 * Magic links and password-recovery links from Supabase redirect here with
 * a `code` query parameter.  The PKCE code exchange MUST happen in the
 * browser (not a server Route Handler) because the `code_verifier` cookie
 * is only accessible to the browser that initiated the sign-in request.
 *
 * Flow:
 *  1. Read `code`, `next`, and `type` from the URL.
 *  2. Exchange the code for a session via the browser Supabase client.
 *  3. Determine the user's role (merchant / admin) and redirect.
 */
export default function AuthCallbackPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
                <Loader2 className="w-8 h-8 animate-spin text-violet-400 mb-4" />
                <p className="text-white/60 text-sm">Signing you in...</p>
            </div>
        }>
            <AuthCallbackContent />
        </Suspense>
    );
}

function AuthCallbackContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [status, setStatus] = useState('Signing you in...');

    useEffect(() => {
        const handleCallback = async () => {
            const supabase = createBrowserClient();
            const code = searchParams.get('code');
            const next = searchParams.get('next');
            const type = searchParams.get('type');
            const tokenHash = searchParams.get('token_hash');

            // ---- Password recovery ----
            // Forward the code/token_hash to the reset-password page so it can
            // handle the exchange in the same client instance as the password update.
            if (type === 'recovery') {
                if (code) {
                    router.replace(`/auth/reset-password?code=${encodeURIComponent(code)}`);
                } else if (tokenHash) {
                    router.replace(`/auth/reset-password?token_hash=${encodeURIComponent(tokenHash)}&type=recovery`);
                } else {
                    router.replace('/auth/reset-password');
                }
                return;
            }

            // Also handle explicit next=/auth/reset-password (legacy links)
            if (next === '/auth/reset-password') {
                if (code) {
                    router.replace(`/auth/reset-password?code=${encodeURIComponent(code)}`);
                } else {
                    router.replace('/auth/reset-password');
                }
                return;
            }

            // ---- Code exchange (magic-link / email confirmation) ----
            if (code) {
                const { error } = await supabase.auth.exchangeCodeForSession(code);
                if (error) {
                    console.error('Code exchange error:', error.message);
                    // Don't bail out yet — the session might still have been
                    // established via onAuthStateChange / URL hash.
                }
            }

            // ---- token_hash fallback (older Supabase versions) ----
            if (!code && tokenHash) {
                const otpType = (type === 'signup' ? 'signup' : 'magiclink') as 'signup' | 'magiclink';
                await supabase.auth.verifyOtp({ token_hash: tokenHash, type: otpType });
            }

            // Give the client a moment to settle the session.
            await new Promise((r) => setTimeout(r, 300));

            // ---- Check session ----
            const { data: { session } } = await supabase.auth.getSession();

            if (!session) {
                setStatus('Authentication failed. Redirecting...');
                const errorPath = next?.startsWith('/admin') ? '/admin/login' : '/login';
                router.replace(`${errorPath}?error=auth_failed`);
                return;
            }

            // ---- If caller gave an explicit non-standard `next`, honour it ----
            if (next && next !== '/admin' && next !== '/dashboard') {
                router.replace(next);
                return;
            }

            // ---- Role-based routing ----
            setStatus('Checking your account...');
            try {
                const user = session.user;
                const email = user.email?.toLowerCase() || '';

                // Check merchant first (most common)
                const { data: merchantRow } = await supabase
                    .from('merchants')
                    .select('id')
                    .eq('user_id', user.id)
                    .maybeSingle();

                // Check admin
                const { data: adminRow } = await supabase
                    .from('admin_users')
                    .select('id')
                    .eq('email', email)
                    .maybeSingle();

                const isMerchant = !!merchantRow;
                const isAdmin = !!adminRow;

                if (next === '/admin' && isAdmin) {
                    router.replace('/admin');
                    return;
                }
                if (next === '/dashboard' && isMerchant) {
                    router.replace('/dashboard');
                    return;
                }
                if (isMerchant) {
                    router.replace('/dashboard');
                    return;
                }
                if (isAdmin) {
                    router.replace('/admin');
                    return;
                }

                // No role found
                router.replace('/login?error=no_account');
            } catch (err) {
                console.error('Role check error:', err);
                // Fallback: use the next hint or go to /login
                router.replace(next || '/login');
            }
        };

        handleCallback();
    }, [router, searchParams]);

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
            <Loader2 className="w-8 h-8 animate-spin text-violet-400 mb-4" />
            <p className="text-white/60 text-sm">{status}</p>
        </div>
    );
}
