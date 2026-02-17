'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Package, Loader2, Mail, Lock, Building, ArrowRight, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useMerchantAuth } from '@/lib/merchant-auth';

export default function RegisterPage() {
    const { register } = useMerchantAuth();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [emailSent, setEmailSent] = useState(false);

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
                                    We sent a confirmation link to <strong className="text-white">{email}</strong>.
                                    Please check your inbox and click the link to verify your account.
                                </p>
                                <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/20">
                                    <p className="text-sm text-amber-300">
                                        After verifying your email, you will be guided through the onboarding
                                        process to complete your merchant application.
                                    </p>
                                </div>
                                <p className="text-white/40 text-xs">
                                    Didn't receive the email? Check your spam folder or try registering again.
                                </p>
                                <Link href="/login">
                                    <Button variant="outline" className="mt-4 border-white/20 text-white hover:bg-white/10">
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
