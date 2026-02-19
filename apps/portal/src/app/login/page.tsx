'use client';

import { Suspense, useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
    Package, Mail, Lock, ArrowRight, Loader2,
    CheckCircle, Wand2, AlertCircle, KeyRound,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useMerchantAuth } from '@/lib/merchant-auth';

type LoginMode = 'password' | 'magic-link';

export default function LoginPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
                <Loader2 className="w-8 h-8 animate-spin text-violet-400" />
            </div>
        }>
            <LoginContent />
        </Suspense>
    );
}

function LoginContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const {
        login, loginWithMagicLink, verifyOtp,
        isLoading: authLoading, isAuthenticated,
    } = useMerchantAuth();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [loginMode, setLoginMode] = useState<LoginMode>('magic-link');

    // OTP state
    const [otpSent, setOtpSent] = useState(false);
    const [otpCode, setOtpCode] = useState('');

    // Redirect if already authenticated
    useEffect(() => {
        if (!authLoading && isAuthenticated) {
            router.push('/dashboard');
        }
    }, [authLoading, isAuthenticated, router]);

    // Show messages from redirects (password reset, auth errors)
    useEffect(() => {
        const message = searchParams.get('message');
        if (message === 'password_reset') {
            setSuccess('Password updated successfully. Please sign in with your new password.');
        }

        const errorParam = searchParams.get('error');
        if (errorParam) {
            const errorMessages: Record<string, string> = {
                auth_failed: 'Authentication failed. Please try again.',
                no_account: 'No merchant account found for this email. Please register first.',
                not_merchant: 'This account does not have merchant access. If you are an admin, use the admin login.',
                flow_state: 'Please open the magic link in the same browser you used to request it. In-app email browsers (Gmail, Outlook) may not work.',
                otp_expired: 'Your login link has expired. Please request a new one.',
                invalid_code: 'Your login link is invalid. Please request a new one.',
                redirect_mismatch: 'There was a redirect configuration error. Please try again.',
            };
            setError(errorMessages[errorParam] || 'An error occurred. Please try again.');
        }
    }, [searchParams]);

    const switchMode = (mode: LoginMode) => {
        setLoginMode(mode);
        setError('');
        setSuccess('');
        setOtpSent(false);
        setOtpCode('');
    };

    // --- Password login ---
    const handlePasswordLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        if (!email || !password) {
            setError('Please enter email and password');
            return;
        }

        setIsLoading(true);
        try {
            const result = await login(email, password);
            if (result.success) {
                router.push('/dashboard');
            } else {
                setError(result.error || 'Invalid email or password');
            }
        } catch {
            setError('An error occurred. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    // --- Send OTP code ---
    const handleSendOtp = async () => {
        if (!email) { setError('Please enter your email address'); return; }
        setError('');
        setSuccess('');
        setIsLoading(true);
        try {
            const result = await loginWithMagicLink(email);
            if (result.success) {
                setOtpSent(true);
                setSuccess('A verification code has been sent to your email.');
            } else {
                setError(result.error || 'Failed to send code.');
            }
        } catch {
            setError('Failed to send code. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    // --- Verify OTP code ---
    const handleVerifyOtp = async () => {
        if (!otpCode || otpCode.length < 6) {
            setError('Please enter the verification code from your email');
            return;
        }
        setError('');
        setIsLoading(true);
        try {
            const result = await verifyOtp(email, otpCode);
            if (result.success) {
                router.push('/dashboard');
            } else {
                setError(result.error || 'Invalid or expired code.');
            }
        } catch {
            setError('Failed to verify code. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    if (authLoading || isAuthenticated) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
                <Loader2 className="w-8 h-8 animate-spin text-violet-400" />
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

                {/* Login Card */}
                <Card className="border-white/10 bg-white/5 backdrop-blur-xl">
                    <CardHeader className="text-center pb-4">
                        <CardTitle className="text-2xl text-white">Welcome back</CardTitle>
                        <CardDescription className="text-white/60">
                            Sign in to your merchant account
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {/* Login mode tabs */}
                        <div className="flex rounded-lg bg-white/5 border border-white/10 p-1 gap-1">
                            {([
                                { id: 'magic-link' as LoginMode, label: 'Email Code', icon: Mail },
                                { id: 'password' as LoginMode, label: 'Password', icon: Lock },
                            ]).map((tab) => (
                                <button
                                    key={tab.id}
                                    onClick={() => switchMode(tab.id)}
                                    className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                                        loginMode === tab.id
                                            ? 'bg-white/10 text-white shadow-sm'
                                            : 'text-white/40 hover:text-white/70'
                                    }`}
                                >
                                    <tab.icon className="w-4 h-4" />
                                    {tab.label}
                                </button>
                            ))}
                        </div>

                        {/* Error / Success banners */}
                        {error && (
                            <div className="flex items-start gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                                <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
                                <p className="text-sm text-red-400">{error}</p>
                            </div>
                        )}
                        {success && (
                            <div className="flex items-start gap-2 p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                                <CheckCircle className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                                <p className="text-sm text-green-400">{success}</p>
                            </div>
                        )}

                        {/* Email field (shared across all modes) */}
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
                                    autoComplete="email"
                                />
                            </div>
                        </div>

                        {/* === EMAIL CODE MODE === */}
                        {loginMode === 'magic-link' && (
                            <div className="space-y-4">
                                {!otpSent ? (
                                    <>
                                        <Button
                                            onClick={handleSendOtp}
                                            className="w-full bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700"
                                            disabled={isLoading}
                                        >
                                            {isLoading ? (
                                                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Sending code...</>
                                            ) : (
                                                <><Mail className="w-4 h-4 mr-2" /> Send Sign-In Code</>
                                            )}
                                        </Button>
                                        <p className="text-xs text-center text-white/40">
                                            A verification code will be sent to your email. No password needed.
                                        </p>
                                    </>
                                ) : (
                                    <div className="space-y-4">
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium text-white/80">Enter verification code</label>
                                            <div className="relative">
                                                <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
                                                <Input
                                                    type="text"
                                                    inputMode="numeric"
                                                    maxLength={8}
                                                    placeholder="Enter code"
                                                    value={otpCode}
                                                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 8))}
                                                    className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-violet-500 text-center text-xl tracking-[0.3em] font-mono"
                                                    autoComplete="one-time-code"
                                                    autoFocus
                                                />
                                            </div>
                                            <p className="text-xs text-white/40 text-center">
                                                Code sent to <span className="text-white/70">{email}</span>.
                                                You can also click the link in the email.
                                            </p>
                                        </div>
                                        <Button
                                            onClick={handleVerifyOtp}
                                            className="w-full bg-gradient-to-r from-violet-600 to-indigo-600 hover:opacity-90"
                                            disabled={isLoading || otpCode.length < 6}
                                        >
                                            {isLoading ? (
                                                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Verifying...</>
                                            ) : (
                                                <>Verify &amp; Sign In <ArrowRight className="w-4 h-4 ml-2" /></>
                                            )}
                                        </Button>
                                        <div className="flex items-center justify-between">
                                            <button
                                                onClick={() => { setOtpSent(false); setOtpCode(''); setSuccess(''); setError(''); }}
                                                className="text-xs text-white/40 hover:text-white/70"
                                            >
                                                Change email
                                            </button>
                                            <button
                                                onClick={handleSendOtp}
                                                className="text-xs text-violet-400 hover:text-violet-300"
                                            >
                                                Resend code
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* === PASSWORD MODE === */}
                        {loginMode === 'password' && (
                            <form onSubmit={handlePasswordLogin} className="space-y-4">
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <label className="text-sm font-medium text-white/80">Password</label>
                                        <Link href="/forgot-password" className="text-sm text-violet-400 hover:text-violet-300">
                                            Forgot password?
                                        </Link>
                                    </div>
                                    <div className="relative">
                                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
                                        <Input
                                            type="password"
                                            placeholder="Enter your password"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-violet-500"
                                            autoComplete="current-password"
                                        />
                                    </div>
                                </div>
                                <Button
                                    type="submit"
                                    disabled={isLoading || authLoading}
                                    className="w-full bg-gradient-to-r from-violet-600 to-indigo-600 hover:opacity-90"
                                >
                                    {isLoading ? (
                                        <>
                                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                            Signing in...
                                        </>
                                    ) : (
                                        <>
                                            Sign In
                                            <ArrowRight className="w-4 h-4 ml-2" />
                                        </>
                                    )}
                                </Button>
                            </form>
                        )}

                        <div className="mt-6 text-center">
                            <p className="text-white/60 text-sm">
                                Don&apos;t have an account?{' '}
                                <Link href="/register" className="text-violet-400 hover:text-violet-300 font-medium">
                                    Create one
                                </Link>
                            </p>
                        </div>
                    </CardContent>
                </Card>

                {/* Footer */}
                <p className="mt-8 text-center text-white/40 text-sm">
                    By signing in, you agree to our{' '}
                    <Link href="/terms" className="text-white/60 hover:text-white">Terms</Link>
                    {' '}and{' '}
                    <Link href="/privacy" className="text-white/60 hover:text-white">Privacy Policy</Link>
                </p>
            </div>
        </div>
    );
}
