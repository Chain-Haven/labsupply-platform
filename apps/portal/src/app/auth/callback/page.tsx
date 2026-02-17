'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { createBrowserClient } from '@/lib/supabase';
import { Loader2 } from 'lucide-react';

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
    const searchParams = useSearchParams();
    const [status, setStatus] = useState('Signing you in...');
    const handledRef = useRef(false);

    useEffect(() => {
        if (handledRef.current) return;
        handledRef.current = true;

        const handleCallback = async () => {
            const supabase = createBrowserClient();

            const code = searchParams.get('code');
            const next = searchParams.get('next');
            const type = searchParams.get('type');
            const tokenHash = searchParams.get('token_hash');

            // Detect if this is a password-recovery flow via ANY signal
            const isRecovery =
                type === 'recovery' ||
                next === '/auth/reset-password' ||
                (next && next.includes('reset-password'));

            // =================================================================
            // PASSWORD RECOVERY — exchange code then redirect to reset page
            // =================================================================
            if (isRecovery) {
                setStatus('Validating reset link...');

                if (code) {
                    try {
                        await supabase.auth.exchangeCodeForSession(code);
                    } catch (e) {
                        console.error('Recovery code exchange error:', e);
                    }
                } else if (tokenHash) {
                    try {
                        await supabase.auth.verifyOtp({ token_hash: tokenHash, type: 'recovery' });
                    } catch (e) {
                        console.error('Recovery token_hash error:', e);
                    }
                }

                // Use window.location for a hard redirect — router.replace
                // can silently fail in certain edge cases.
                window.location.href = '/auth/reset-password';
                return;
            }

            // =================================================================
            // MAGIC LINK / SIGN-IN — exchange code then route by role
            // =================================================================
            if (code) {
                const { error } = await supabase.auth.exchangeCodeForSession(code);
                if (error) {
                    console.error('Code exchange error:', error.message);
                }
            }

            if (!code && tokenHash) {
                const otpType = (type === 'signup' ? 'signup' : 'magiclink') as 'signup' | 'magiclink';
                try {
                    await supabase.auth.verifyOtp({ token_hash: tokenHash, type: otpType });
                } catch (e) {
                    console.error('Token hash verify error:', e);
                }
            }

            // Brief pause for session to settle in cookies
            await new Promise((r) => setTimeout(r, 500));

            const { data: { session } } = await supabase.auth.getSession();

            if (!session) {
                const errorPath = next?.startsWith('/admin') ? '/admin/login' : '/login';
                window.location.href = `${errorPath}?error=auth_failed`;
                return;
            }

            // If caller gave an explicit non-standard `next`, honour it
            if (next && next !== '/admin' && next !== '/dashboard') {
                window.location.href = next;
                return;
            }

            // Role-based routing
            setStatus('Checking your account...');
            try {
                const user = session.user;
                const email = user.email?.toLowerCase() || '';

                const [merchantRes, adminRes] = await Promise.all([
                    supabase.from('merchants').select('id').eq('user_id', user.id).maybeSingle(),
                    supabase.from('admin_users').select('id').eq('email', email).maybeSingle(),
                ]);

                const isMerchant = !!merchantRes.data;
                const isAdmin = !!adminRes.data;

                if (next === '/admin' && isAdmin) { window.location.href = '/admin'; return; }
                if (next === '/dashboard' && isMerchant) { window.location.href = '/dashboard'; return; }
                if (isMerchant) { window.location.href = '/dashboard'; return; }
                if (isAdmin) { window.location.href = '/admin'; return; }

                window.location.href = '/login?error=no_account';
            } catch (err) {
                console.error('Role check error:', err);
                window.location.href = next || '/login';
            }
        };

        // Hard timeout: if nothing has happened after 15 seconds, redirect to login
        const timeout = setTimeout(() => {
            window.location.href = '/login?error=auth_failed';
        }, 15000);

        handleCallback().finally(() => clearTimeout(timeout));
    }, [searchParams]);

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
            <Loader2 className="w-8 h-8 animate-spin text-violet-400 mb-4" />
            <p className="text-white/60 text-sm">{status}</p>
        </div>
    );
}
