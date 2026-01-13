'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Package, Mail, Lock, ArrowRight, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useMerchantAuth } from '@/lib/merchant-auth';

export default function LoginPage() {
    const router = useRouter();
    const { login, isLoading: authLoading } = useMerchantAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        if (!email || !password) {
            setError('Please enter email and password');
            setIsLoading(false);
            return;
        }

        const result = await login(email, password);

        if (result.success) {
            router.push('/dashboard');
        } else {
            setError(result.error || 'Invalid email or password');
            setIsLoading(false);
        }
    };

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
                        <span className="text-2xl font-bold text-white">LabSupply</span>
                    </Link>
                </div>

                {/* Login Card */}
                <Card className="border-white/10 bg-white/5 backdrop-blur-xl">
                    <CardHeader className="text-center">
                        <CardTitle className="text-2xl text-white">Welcome back</CardTitle>
                        <CardDescription className="text-white/60">
                            Sign in to your merchant account
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
                                        placeholder="••••••••"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-violet-500"
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

                        <div className="mt-6 text-center">
                            <p className="text-white/60 text-sm">
                                Don't have an account?{' '}
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
