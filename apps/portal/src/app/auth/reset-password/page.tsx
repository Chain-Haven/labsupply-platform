'use client';

import { useState, useEffect } from 'react';
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

    // Check if there's an active session from the recovery link
    useEffect(() => {
        let mounted = true;

        const checkSession = async () => {
            try {
                // Listen for auth state changes (important for recovery links)
                const { data: { subscription } } = supabase.auth.onAuthStateChange(
                    async (event, session) => {
                        // Auth event received

                        if (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') {
                            if (session && mounted) {
                                setSessionReady(true);
                                setIsInitializing(false);
                            }
                        }
                    }
                );

                // First check if we already have a session
                const { data: { session } } = await supabase.auth.getSession();

                if (session) {
                    if (mounted) {
                        setSessionReady(true);
                        setIsInitializing(false);
                    }
                    return;
                }

                // No session, try to handle the hash fragment from recovery link
                const hashParams = new URLSearchParams(window.location.hash.substring(1));
                const accessToken = hashParams.get('access_token');
                const refreshToken = hashParams.get('refresh_token');
                const type = hashParams.get('type');
                const errorCode = hashParams.get('error_code');
                const errorDescription = hashParams.get('error_description');

                // Check for reset password tokens
                const hasToken = !!accessToken;

                // Handle expired/invalid tokens
                if (errorCode) {
                    const message = errorDescription?.replace(/\+/g, ' ') || 'Invalid or expired reset link';
                    if (mounted) {
                        setError(message);
                        setIsInitializing(false);
                    }
                    return;
                }

                if (accessToken && type === 'recovery') {
                    // Set the session manually
                    const { error: sessionError } = await supabase.auth.setSession({
                        access_token: accessToken,
                        refresh_token: refreshToken || '',
                    });

                    if (sessionError) {
                        console.error('Session error:', sessionError);
                        if (mounted) {
                            setError(sessionError.message || 'Failed to validate reset link. Please request a new one.');
                            setIsInitializing(false);
                        }
                        return;
                    }

                    if (mounted) {
                        setSessionReady(true);
                        setIsInitializing(false);
                    }
                } else if (accessToken) {
                    // Has access token but type is not 'recovery' - still try to use it
                    // Access token present but type is not 'recovery' - still try to use it
                    const { error: sessionError } = await supabase.auth.setSession({
                        access_token: accessToken,
                        refresh_token: refreshToken || '',
                    });

                    if (sessionError) {
                        console.error('Session error:', sessionError);
                        if (mounted) {
                            setError('Failed to validate reset link. The link may have expired. Please request a new one.');
                            setIsInitializing(false);
                        }
                        return;
                    }

                    if (mounted) {
                        setSessionReady(true);
                        setIsInitializing(false);
                    }
                } else {
                    // Check URL params as well (some Supabase versions use query params)
                    const urlParams = new URLSearchParams(window.location.search);
                    const codeParam = urlParams.get('code');

                    if (codeParam) {
                        // Exchange code for session
                        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(codeParam);

                        if (exchangeError) {
                            console.error('Code exchange error:', exchangeError);
                            if (mounted) {
                                setError('Invalid or expired reset link. Please request a new one.');
                                setIsInitializing(false);
                            }
                            return;
                        }

                        if (mounted) {
                            setSessionReady(true);
                            setIsInitializing(false);
                        }
                    } else {
                        // No valid recovery tokens found
                        if (mounted) {
                            setError('Invalid password reset link. Please request a new one from the login page.');
                            setIsInitializing(false);
                        }
                    }
                }

                // Cleanup subscription
                return () => {
                    subscription.unsubscribe();
                };
            } catch (err) {
                console.error('Error checking session:', err);
                if (mounted) {
                    setError('An error occurred validating your reset link. Please try again.');
                    setIsInitializing(false);
                }
            }
        };

        checkSession();

        return () => {
            mounted = false;
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
            const { error: updateError } = await supabase.auth.updateUser({
                password: password
            });

            if (updateError) {
                console.error('Update error:', updateError);
                setError(updateError.message || 'Failed to update password');
                setIsLoading(false);
                return;
            }

            setSuccess(true);
            setIsLoading(false);

            // Sign out and redirect to login after 3 seconds
            setTimeout(async () => {
                await supabase.auth.signOut();
                router.push('/admin/login?message=password_reset');
            }, 3000);
        } catch (err) {
            console.error('Unexpected error:', err);
            setError('An unexpected error occurred. Please try again.');
            setIsLoading(false);
        }
    };

    // Loading state while checking session
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
                        <Link
                            href="/admin/login"
                            className="inline-flex items-center gap-2 text-violet-400 hover:text-violet-300 transition-colors"
                        >
                            <ArrowLeft className="w-4 h-4" />
                            Go to Login
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
                            <label className="block text-sm font-medium text-white/80 mb-2">
                                New Password
                            </label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/20 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent disabled:opacity-50"
                                placeholder="••••••••"
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
                                placeholder="••••••••"
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

                    <div className="mt-6 text-center">
                        <Link
                            href="/admin/login"
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
