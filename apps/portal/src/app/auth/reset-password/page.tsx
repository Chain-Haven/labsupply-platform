'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@/lib/supabase';
import { Lock, ArrowLeft, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import Link from 'next/link';

export default function ResetPasswordPage() {
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isInitializing, setIsInitializing] = useState(true);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    const [sessionReady, setSessionReady] = useState(false);
    const router = useRouter();
    const supabase = createBrowserClient();
    const subscriptionRef = useRef<{ unsubscribe: () => void } | null>(null);

    useEffect(() => {
        let mounted = true;

        const initSession = async () => {
            try {
                // Set up auth state listener
                const { data: { subscription } } = supabase.auth.onAuthStateChange(
                    (event, session) => {
                        if (!mounted) return;

                        if (event === 'PASSWORD_RECOVERY' && session) {
                            setSessionReady(true);
                            setIsInitializing(false);
                        } else if (event === 'SIGNED_IN' && session) {
                            setSessionReady(true);
                            setIsInitializing(false);
                        }
                    }
                );
                subscriptionRef.current = subscription;

                // Check for existing session (set by /auth/callback code exchange)
                const { data: { session } } = await supabase.auth.getSession();
                if (session && mounted) {
                    setSessionReady(true);
                    setIsInitializing(false);
                    return;
                }

                // Handle hash fragment (implicit flow fallback)
                const hash = window.location.hash.substring(1);
                if (hash) {
                    const hashParams = new URLSearchParams(hash);
                    const accessToken = hashParams.get('access_token');
                    const refreshToken = hashParams.get('refresh_token');
                    const errorCode = hashParams.get('error_code');
                    const errorDescription = hashParams.get('error_description');

                    // Clean up hash from URL
                    window.history.replaceState(
                        null, '', window.location.pathname + window.location.search
                    );

                    if (errorCode) {
                        const message = errorDescription?.replace(/\+/g, ' ')
                            || 'Invalid or expired reset link';
                        if (mounted) {
                            setError(message);
                            setIsInitializing(false);
                        }
                        return;
                    }

                    if (accessToken) {
                        const { error: sessionError } = await supabase.auth.setSession({
                            access_token: accessToken,
                            refresh_token: refreshToken || '',
                        });

                        if (sessionError) {
                            if (mounted) {
                                setError('Invalid or expired reset link. Please request a new one.');
                                setIsInitializing(false);
                            }
                        } else if (mounted) {
                            setSessionReady(true);
                            setIsInitializing(false);
                        }
                        return;
                    }
                }

                // Handle code parameter (PKCE flow direct -- fallback)
                const urlParams = new URLSearchParams(window.location.search);
                const codeParam = urlParams.get('code');
                if (codeParam) {
                    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(
                        codeParam
                    );
                    if (exchangeError) {
                        if (mounted) {
                            setError('Invalid or expired reset link. Please request a new one.');
                            setIsInitializing(false);
                        }
                    } else if (mounted) {
                        setSessionReady(true);
                        setIsInitializing(false);
                    }
                    return;
                }

                // No tokens found -- give the auth listener a moment to fire
                setTimeout(() => {
                    if (mounted && !sessionReady) {
                        setIsInitializing(false);
                        setError(
                            'Invalid password reset link. Please request a new one from the login page.'
                        );
                    }
                }, 3000);

            } catch (err) {
                console.error('Error initializing reset session:', err);
                if (mounted) {
                    setError('An error occurred. Please try requesting a new reset link.');
                    setIsInitializing(false);
                }
            }
        };

        initSession();

        return () => {
            mounted = false;
            subscriptionRef.current?.unsubscribe();
        };
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
            // Re-validate session before updating
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                setError('Your session has expired. Please request a new password reset link.');
                setIsLoading(false);
                return;
            }

            // Race the updateUser call against a timeout
            const updatePromise = supabase.auth.updateUser({ password });
            const timeoutPromise = new Promise<{ data: null; error: { message: string } }>(
                (resolve) => {
                    setTimeout(() => {
                        resolve({
                            data: null,
                            error: { message: 'Request timed out. Please try again.' },
                        });
                    }, 15000);
                }
            );

            const { error: updateError } = await Promise.race([updatePromise, timeoutPromise]);

            if (updateError) {
                console.error('Password update error:', updateError);
                const msg = updateError.message || 'Failed to update password';
                if (msg.toLowerCase().includes('same_password') || msg.toLowerCase().includes('different')) {
                    setError('New password must be different from your current password.');
                } else {
                    setError(msg);
                }
                setIsLoading(false);
                return;
            }

            setSuccess(true);
            setIsLoading(false);

            // Sign out and redirect to login after a delay
            setTimeout(async () => {
                try {
                    await supabase.auth.signOut();
                } catch {
                    // Sign out may fail if session is already invalidated
                }
                router.push('/login?message=password_reset');
            }, 3000);

        } catch (err) {
            console.error('Unexpected error during password update:', err);
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
                        <p className="text-white/60 mb-6">
                            Your password has been successfully reset. Redirecting to login...
                        </p>
                        <div className="flex flex-col items-center gap-2">
                            <Link
                                href="/login"
                                className="inline-flex items-center gap-2 text-violet-400 hover:text-violet-300 transition-colors"
                            >
                                <ArrowLeft className="w-4 h-4" />
                                Merchant Login
                            </Link>
                            <Link
                                href="/admin/login"
                                className="inline-flex items-center gap-2 text-white/40 hover:text-white/60 transition-colors text-sm"
                            >
                                Admin Login
                            </Link>
                        </div>
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
                            <label className="block text-sm font-medium text-white/80 mb-2">
                                New Password
                            </label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/20 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent disabled:opacity-50"
                                placeholder="Minimum 8 characters"
                                required
                                minLength={8}
                                disabled={!sessionReady || isLoading}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-white/80 mb-2">
                                Confirm Password
                            </label>
                            <input
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/20 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent disabled:opacity-50"
                                placeholder="Re-enter your new password"
                                required
                                minLength={8}
                                disabled={!sessionReady || isLoading}
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading || !sessionReady}
                            className="w-full py-3 px-4 rounded-lg bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Updating...
                                </>
                            ) : (
                                'Update Password'
                            )}
                        </button>
                    </form>

                    <div className="mt-6 text-center space-y-2">
                        <Link
                            href="/forgot-password"
                            className="block text-white/60 hover:text-white transition-colors text-sm"
                        >
                            Request a new reset link
                        </Link>
                        <Link
                            href="/login"
                            className="inline-flex items-center gap-2 text-white/60 hover:text-white transition-colors text-sm"
                        >
                            <ArrowLeft className="w-4 h-4" />
                            Back to Login
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
