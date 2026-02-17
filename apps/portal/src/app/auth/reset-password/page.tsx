'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@/lib/supabase';
import { Lock, ArrowLeft, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import Link from 'next/link';

/**
 * Password reset page.
 *
 * The user arrives here from our custom reset email with ?email=xxx&token=yyy
 * We call verifyOtp({ email, token, type: 'recovery' }) to establish a session,
 * then the user can set their new password via updateUser({ password }).
 *
 * This approach has ZERO dependency on PKCE, cookies, or code exchange.
 */
export default function ResetPasswordPage() {
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isInitializing, setIsInitializing] = useState(true);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    const [sessionReady, setSessionReady] = useState(false);
    const router = useRouter();
    const supabaseRef = useRef(createBrowserClient());
    const mountedRef = useRef(true);

    useEffect(() => {
        mountedRef.current = true;
        const supabase = supabaseRef.current;

        const initSession = async () => {
            try {
                const urlParams = new URLSearchParams(window.location.search);
                const emailParam = urlParams.get('email');
                const tokenParam = urlParams.get('token');
                const tokenHashParam = urlParams.get('token_hash');
                const codeParam = urlParams.get('code');

                // Clean params from URL immediately (they're one-time use)
                if (emailParam || tokenParam || tokenHashParam || codeParam) {
                    window.history.replaceState(null, '', window.location.pathname);
                }

                // === PRIMARY PATH: email + OTP token (from our custom reset email) ===
                if (emailParam && tokenParam) {
                    const { data: otpData, error: verifyError } = await supabase.auth.verifyOtp({
                        email: emailParam,
                        token: tokenParam,
                        type: 'recovery',
                    });

                    if (mountedRef.current) {
                        if (verifyError) {
                            console.error('OTP verify failed:', verifyError.message, 'code:', verifyError.status);
                            setError(`Reset link error: ${verifyError.message}. Please request a new one.`);
                        } else if (!otpData.session) {
                            console.error('OTP verify succeeded but no session returned');
                            setError('Verification succeeded but no session was created. Please try again.');
                        } else {
                            setSessionReady(true);
                        }
                        setIsInitializing(false);
                    }
                    return;
                }

                // === FALLBACK: token_hash (from Supabase default emails or /auth/confirm) ===
                if (tokenHashParam) {
                    const { error: verifyError } = await supabase.auth.verifyOtp({
                        token_hash: tokenHashParam,
                        type: 'recovery',
                    });

                    if (mountedRef.current) {
                        if (verifyError) {
                            console.error('token_hash verify failed:', verifyError.message);
                            setError('Your reset link has expired or is invalid. Please request a new one.');
                        } else {
                            setSessionReady(true);
                        }
                        setIsInitializing(false);
                    }
                    return;
                }

                // === FALLBACK: PKCE code (from /auth/confirm server redirect) ===
                if (codeParam) {
                    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(codeParam);

                    if (mountedRef.current) {
                        if (exchangeError) {
                            console.error('Code exchange failed:', exchangeError.message);
                            setError('Your reset link has expired or is invalid. Please request a new one.');
                        } else {
                            setSessionReady(true);
                        }
                        setIsInitializing(false);
                    }
                    return;
                }

                // === FALLBACK: existing session (already logged in via callback) ===
                const { data: { session } } = await supabase.auth.getSession();
                if (session && mountedRef.current) {
                    setSessionReady(true);
                    setIsInitializing(false);
                    return;
                }

                // === FALLBACK: hash-fragment tokens ===
                const hash = window.location.hash.substring(1);
                if (hash) {
                    const hashParams = new URLSearchParams(hash);
                    const accessToken = hashParams.get('access_token');
                    const refreshToken = hashParams.get('refresh_token');
                    window.history.replaceState(null, '', window.location.pathname);

                    if (accessToken) {
                        const { error: sessionError } = await supabase.auth.setSession({
                            access_token: accessToken,
                            refresh_token: refreshToken || '',
                        });
                        if (mountedRef.current) {
                            if (sessionError) {
                                setError('Your reset link has expired or is invalid. Please request a new one.');
                            } else {
                                setSessionReady(true);
                            }
                            setIsInitializing(false);
                        }
                        return;
                    }
                }

                // Nothing worked
                if (mountedRef.current) {
                    setIsInitializing(false);
                    setError('Invalid password reset link. Please request a new one from the login page.');
                }

            } catch (err) {
                console.error('Error initializing reset session:', err);
                if (mountedRef.current) {
                    setError('An error occurred. Please try requesting a new reset link.');
                    setIsInitializing(false);
                }
            }
        };

        initSession();

        return () => { mountedRef.current = false; };
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (password.length < 8) {
            setError('Password must be at least 8 characters');
            return;
        }
        if (password !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }
        if (!sessionReady) {
            setError('Session expired. Please request a new password reset link.');
            return;
        }

        setIsLoading(true);

        try {
            const supabase = supabaseRef.current;
            const { error: updateError } = await supabase.auth.updateUser({ password });

            if (updateError) {
                console.error('Password update error:', updateError);
                const msg = updateError.message || 'Failed to update password';
                if (msg.toLowerCase().includes('same') || msg.toLowerCase().includes('different')) {
                    setError('New password must be different from your current password.');
                } else {
                    setError(msg);
                }
                setIsLoading(false);
                return;
            }

            setSuccess(true);
            setIsLoading(false);

            setTimeout(async () => {
                try { await supabase.auth.signOut(); } catch { /* ignore */ }
                router.push('/login?message=password_reset');
            }, 3000);
        } catch (err) {
            console.error('Password update error:', err);
            setError('An unexpected error occurred. Please try again.');
            setIsLoading(false);
        }
    };

    if (isInitializing) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-6">
                <div className="w-full max-w-md">
                    <div className="bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 p-8 text-center">
                        <Loader2 className="w-8 h-8 text-violet-400 animate-spin mx-auto mb-4" />
                        <p className="text-white/60">Validating reset link...</p>
                    </div>
                </div>
            </div>
        );
    }

    if (success) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-6">
                <div className="w-full max-w-md">
                    <div className="bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 p-8 text-center">
                        <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-6">
                            <CheckCircle className="w-8 h-8 text-green-400" />
                        </div>
                        <h1 className="text-2xl font-bold text-white mb-2">Password Updated!</h1>
                        <p className="text-white/60 mb-6">Your password has been successfully reset. Redirecting to login...</p>
                        <Link href="/login" className="inline-flex items-center gap-2 text-violet-400 hover:text-violet-300 transition-colors">
                            <ArrowLeft className="w-4 h-4" /> Go to Login
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-6">
            <div className="w-full max-w-md">
                <div className="bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 p-8">
                    <div className="text-center mb-8">
                        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center mx-auto mb-4">
                            <Lock className="w-8 h-8 text-white" />
                        </div>
                        <h1 className="text-2xl font-bold text-white mb-2">Reset Password</h1>
                        <p className="text-white/60">Enter your new password below</p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        {error && (
                            <div className="flex items-start gap-2 p-3 rounded-lg bg-red-500/20 border border-red-500/30 text-red-400 text-sm">
                                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                                <span>{error}</span>
                            </div>
                        )}

                        {!sessionReady && !error && (
                            <div className="flex items-center gap-2 p-3 rounded-lg bg-yellow-500/20 border border-yellow-500/30 text-yellow-400 text-sm">
                                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                                No valid session. Please use a valid password reset link.
                            </div>
                        )}

                        <div>
                            <label className="block text-sm font-medium text-white/80 mb-2">New Password</label>
                            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                                className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/20 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent disabled:opacity-50"
                                placeholder="Minimum 8 characters" required minLength={8} disabled={!sessionReady || isLoading} />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-white/80 mb-2">Confirm Password</label>
                            <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
                                className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/20 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent disabled:opacity-50"
                                placeholder="Re-enter your new password" required minLength={8} disabled={!sessionReady || isLoading} />
                        </div>

                        <button type="submit" disabled={isLoading || !sessionReady}
                            className="w-full py-3 px-4 rounded-lg bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                            {isLoading ? <><Loader2 className="w-4 h-4 animate-spin" /> Updating...</> : 'Update Password'}
                        </button>
                    </form>

                    <div className="mt-6 text-center space-y-2">
                        <Link href="/forgot-password" className="block text-white/60 hover:text-white transition-colors text-sm">Request a new reset link</Link>
                        <Link href="/login" className="inline-flex items-center gap-2 text-white/60 hover:text-white transition-colors text-sm">
                            <ArrowLeft className="w-4 h-4" /> Back to Login
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
