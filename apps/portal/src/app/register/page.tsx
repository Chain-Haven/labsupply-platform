'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Package, Loader2, Mail, Lock, Building, ArrowRight, CheckCircle, KeyRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useMerchantAuth } from '@/lib/merchant-auth';

export default function RegisterPage() {
    const router = useRouter();
    const { register, verifySignupOtp } = useMerchantAuth();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [emailSent, setEmailSent] = useState(false);
    const [otpCode, setOtpCode] = useState('');

    const [companyName, setCompanyName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!companyName.trim()) {
            setError('Company name is required');
            return;
        }
        if (!email.trim()) {
            setError('Email is required');
            return;
        }
        if (password.length < 8) {
            setError('Password must be at least 8 characters');
            return;
        }
        if (password !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        setIsLoading(true);

        try {
            const result = await register(email, password, companyName.trim());

            if (!result.success) {
                throw new Error(result.error || 'Registration failed');
            }

            setEmailSent(true);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Registration failed. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleVerifyOtp = async () => {
        if (!otpCode || otpCode.length < 6) {
            setError('Please enter the verification code from your email');
            return;
        }
        setError('');
        setIsLoading(true);
        try {
            const result = await verifySignupOtp(email, otpCode);
            if (result.success) {
                router.push('/onboarding');
            } else {
                setError(result.error || 'Invalid or expired code.');
            }
        } catch {
            setError('Failed to verify code. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    if (emailSent) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
                <div className="absolute inset-0 overflow-hidden">
                    <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-violet-500/20 rounded-full blur-3xl" />
                    <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-500/20 rounded-full blur-3xl" />
                </div>

                <div className="relative w-full max-w-md">
                    <div className="text-center mb-8">
                        <Link href="/" className="inline-flex items-center gap-2">
                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center">
                                <Package className="w-7 h-7 text-white" />
                            </div>
                            <span className="text-2xl font-bold text-white">WhiteLabel Peptides</span>
                        </Link>
                    </div>

                    <Card className="border-white/10 bg-white/5 backdrop-blur-xl">
                        <CardContent className="pt-8 pb-8">
                            <div className="text-center space-y-4">
                                <div className="mx-auto w-16 h-16 rounded-full bg-violet-500/20 flex items-center justify-center">
                                    <Mail className="w-8 h-8 text-violet-400" />
                                </div>
                                <h2 className="text-2xl font-bold text-white">Verify your email</h2>
                                <p className="text-white/60 text-sm">
                                    We sent a 6-digit code to <strong className="text-white">{email}</strong>.
                                    Enter it below to verify your account.
                                </p>

                                {error && (
                                    <div className="flex items-start gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-left">
                                        <p className="text-sm text-red-400">{error}</p>
                                    </div>
                                )}

                                <div className="space-y-2">
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
                                </div>

                                <Button
                                    onClick={handleVerifyOtp}
                                    disabled={isLoading || otpCode.length < 6}
                                    className="w-full bg-gradient-to-r from-violet-600 to-indigo-600 hover:opacity-90"
                                >
                                    {isLoading ? (
                                        <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Verifying...</>
                                    ) : (
                                        <>Verify Email <ArrowRight className="w-4 h-4 ml-2" /></>
                                    )}
                                </Button>

                                <div className="p-3 rounded-lg bg-violet-500/10 border border-violet-500/20">
                                    <p className="text-xs text-violet-300">
                                        You can also click the verification link in the email.
                                        After verifying, you&apos;ll complete onboarding to set up your merchant account.
                                    </p>
                                </div>

                                <p className="text-white/40 text-xs">
                                    Didn&apos;t receive the email? Check your spam folder or{' '}
                                    <button
                                        onClick={() => { setEmailSent(false); setError(''); setOtpCode(''); }}
                                        className="text-violet-400 hover:text-violet-300"
                                    >
                                        try again
                                    </button>.
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
            <div className="absolute inset-0 overflow-hidden">
                <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-violet-500/20 rounded-full blur-3xl" />
                <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-500/20 rounded-full blur-3xl" />
            </div>

            <div className="relative w-full max-w-md">
                <div className="text-center mb-8">
                    <Link href="/" className="inline-flex items-center gap-2">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center">
                            <Package className="w-7 h-7 text-white" />
                        </div>
                        <span className="text-2xl font-bold text-white">WhiteLabel Peptides</span>
                    </Link>
                </div>

                <Card className="border-white/10 bg-white/5 backdrop-blur-xl">
                    <CardHeader className="text-center">
                        <CardTitle className="text-2xl text-white">Create your account</CardTitle>
                        <CardDescription className="text-white/60">
                            Sign up to start your merchant application
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
                                <label className="text-sm font-medium text-white/80">Company Name</label>
                                <div className="relative">
                                    <Building className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
                                    <Input
                                        type="text"
                                        placeholder="Your Company LLC"
                                        value={companyName}
                                        onChange={(e) => setCompanyName(e.target.value)}
                                        className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-violet-500"
                                    />
                                </div>
                            </div>

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

                            <div className="space-y-2">
                                <label className="text-sm font-medium text-white/80">Password</label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
                                    <Input
                                        type="password"
                                        placeholder="Minimum 8 characters"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-violet-500"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium text-white/80">Confirm Password</label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
                                    <Input
                                        type="password"
                                        placeholder="Re-enter your password"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-violet-500"
                                    />
                                </div>
                            </div>

                            <div className="p-3 rounded-lg bg-violet-500/10 border border-violet-500/20">
                                <div className="flex items-start gap-2">
                                    <CheckCircle className="w-4 h-4 text-violet-400 mt-0.5 flex-shrink-0" />
                                    <p className="text-xs text-violet-300">
                                        After verifying your email, you will complete a short onboarding
                                        process with your business details and compliance documents.
                                    </p>
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
                                        Creating Account...
                                    </>
                                ) : (
                                    <>
                                        Create Account
                                        <ArrowRight className="w-4 h-4 ml-2" />
                                    </>
                                )}
                            </Button>
                        </form>

                        <div className="mt-6 text-center">
                            <p className="text-white/60 text-sm">
                                Already have an account?{' '}
                                <Link href="/login" className="text-violet-400 hover:text-violet-300 font-medium">
                                    Sign in
                                </Link>
                            </p>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
