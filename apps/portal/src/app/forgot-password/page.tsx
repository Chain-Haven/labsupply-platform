'use client';

import { Suspense, useState, useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Package, Mail, ArrowLeft, Loader2, CheckCircle, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { createBrowserClient } from '@/lib/supabase';
import { CANONICAL_ORIGIN } from '@/lib/constants';

export default function ForgotPasswordPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
                <Loader2 className="w-8 h-8 animate-spin text-violet-400" />
            </div>
        }>
            <ForgotPasswordContent />
        </Suspense>
    );
}

function ForgotPasswordContent() {
    const searchParams = useSearchParams();
    const [email, setEmail] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    // Handle error redirect from auth confirm (e.g., expired recovery link)
    useEffect(() => {
        const errorParam = searchParams.get('error');
        if (errorParam) {
            const errorMessages: Record<string, string> = {
                otp_expired: 'Your password reset link has expired. Please request a new one.',
                expired: 'Your password reset link has expired. Please request a new one.',
                flow_state: 'Please open the reset link in the same browser you used to request it. In-app email browsers (Gmail, Outlook) may not work.',
                invalid_code: 'Your reset link is invalid. Please request a new one.',
                redirect_mismatch: 'There was a redirect configuration error. Please try again.',
            };
            setError(errorMessages[errorParam] || 'Your password reset link has expired or is invalid. Please request a new one.');
        }
    }, [searchParams]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        if (!email) {
            setError('Please enter your email address');
            setIsLoading(false);
            return;
        }

        try {
            // Use Supabase's built-in resetPasswordForEmail — reliable, no SMTP config needed.
            // The reset link goes to /auth/confirm which exchanges the code and redirects
            // to /auth/reset-password where the user can set a new password.
            const supabase = createBrowserClient();
            const { error: resetError } = await supabase.auth.resetPasswordForEmail(
                email.toLowerCase().trim(),
                {
                    redirectTo: `${CANONICAL_ORIGIN}/auth/confirm?type=recovery&next=/auth/reset-password`,
                }
            );

            if (resetError) {
                setError(resetError.message || 'Failed to send reset link. Please try again.');
                return;
            }

            setSuccess(true);
        } catch (err) {
            setError('An error occurred. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    if (success) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
                {/* Background effects */}
                <div className="absolute inset-0 overflow-hidden">
                    <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-violet-500/20 rounded-full blur-3xl" />
                    <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-500/20 rounded-full blur-3xl" />
                </div>

                <div className="relative w-full max-w-md">
                    {/* Logo */}
                    <div className="text-center mb-8">
                        <Link href="/" className="inline-flex items-center gap-2">
                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center">
                                <Package className="w-7 h-7 text-white" />
                            </div>
                            <span className="text-2xl font-bold text-white">WhiteLabel Peptides</span>
                        </Link>
                    </div>

                    <Card className="border-white/10 bg-white/5 backdrop-blur-xl">
                        <CardContent className="pt-6">
                            <div className="text-center space-y-4">
                                <div className="mx-auto w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center">
                                    <CheckCircle className="w-8 h-8 text-green-400" />
                                </div>
                                <h2 className="text-xl font-semibold text-white">Check your email</h2>
                                <p className="text-white/60 text-sm">
                                    We've sent a password reset link to <strong className="text-white">{email}</strong>.
                                    Click the link in your inbox to set a new password.
                                </p>
                                <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-left">
                                    <Info className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
                                    <p className="text-amber-300/80 text-xs">
                                        <strong>Important:</strong> Open the reset link in this same browser — it won't work if opened in a different browser or email app. Links expire in 1 hour.
                                    </p>
                                </div>
                                <p className="text-white/40 text-xs">
                                    Didn't receive it? Check your spam folder or{' '}
                                    <button
                                        onClick={() => setSuccess(false)}
                                        className="text-violet-400 hover:text-violet-300 underline"
                                    >
                                        try again
                                    </button>.
                                </p>
                                <Link href="/login">
                                    <Button variant="outline" className="mt-4 border-white/20 text-white hover:bg-white/10">
                                        <ArrowLeft className="w-4 h-4 mr-2" />
                                        Back to Login
                                    </Button>
                                </Link>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
            {/* Background effects */}
            <div className="absolute inset-0 overflow-hidden">
                <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-violet-500/20 rounded-full blur-3xl" />
                <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-500/20 rounded-full blur-3xl" />
            </div>

            <div className="relative w-full max-w-md">
                {/* Logo */}
                <div className="text-center mb-8">
                    <Link href="/" className="inline-flex items-center gap-2">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center">
                            <Package className="w-7 h-7 text-white" />
                        </div>
                        <span className="text-2xl font-bold text-white">WhiteLabel Peptides</span>
                    </Link>
                </div>

                {/* Forgot Password Card */}
                <Card className="border-white/10 bg-white/5 backdrop-blur-xl">
                    <CardHeader className="text-center">
                        <CardTitle className="text-2xl text-white">Reset Password</CardTitle>
                        <CardDescription className="text-white/60">
                            Enter your email address and we'll send you a link to reset your password.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            {error && (
                                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                                    {error}
                                </div>
                            )}

                            <div className="space-y-2">
                                <label className="text-sm font-medium text-white/80">Email</label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
                                    <Input
                                        type="email"
                                        placeholder="you@company.com"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-violet-500"
                                    />
                                </div>
                            </div>

                            <Button
                                type="submit"
                                disabled={isLoading}
                                className="w-full bg-gradient-to-r from-violet-600 to-indigo-600 hover:opacity-90"
                            >
                                {isLoading ? (
                                    <>
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        Sending...
                                    </>
                                ) : (
                                    'Send Reset Link'
                                )}
                            </Button>
                        </form>

                        <div className="mt-6 text-center">
                            <Link href="/login" className="text-violet-400 hover:text-violet-300 text-sm inline-flex items-center gap-1">
                                <ArrowLeft className="w-4 h-4" />
                                Back to Login
                            </Link>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
