'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Package, Lock, Mail, AlertCircle, Loader2, KeyRound, CheckCircle } from 'lucide-react';
import { useAdminAuth } from '@/lib/admin-auth';

export default function AdminLoginPage() {
    const router = useRouter();
    const { login, isAuthenticated, isLoading } = useAdminAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Backup code authentication state
    const [showBackupAuth, setShowBackupAuth] = useState(false);
    const [backupCode, setBackupCode] = useState('');
    const [codeSent, setCodeSent] = useState(false);
    const [sendingCode, setSendingCode] = useState(false);

    // Redirect if already authenticated
    useEffect(() => {
        if (!isLoading && isAuthenticated) {
            router.push('/admin');
        }
    }, [isLoading, isAuthenticated, router]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        setIsSubmitting(true);

        try {
            const result = await login(email, password);
            if (result.success) {
                router.push('/admin');
            } else {
                setError(result.error || 'Invalid credentials. Only authorized administrators can access this portal.');
            }
        } catch (err) {
            setError('An error occurred. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleSendBackupCode = async () => {
        if (!email) {
            setError('Please enter your admin email address');
            return;
        }

        setSendingCode(true);
        setError('');
        setSuccess('');

        try {
            const response = await fetch('/api/v1/admin/send-backup-code', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: email.toLowerCase() }),
            });

            const data = await response.json();

            if (!response.ok) {
                setError(data.error || 'Failed to send backup code');
                setSendingCode(false);
                return;
            }

            setCodeSent(true);
            setSuccess('A backup login code has been sent to your email. Please check your inbox.');
        } catch (err) {
            console.error('Send code error:', err);
            setError('Failed to send backup code. Please try again.');
        } finally {
            setSendingCode(false);
        }
    };

    const handleBackupLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        setIsSubmitting(true);

        try {
            const response = await fetch('/api/v1/admin/verify-backup-code', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: email.toLowerCase(),
                    code: backupCode,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                setError(data.error || 'Invalid or expired code');
                setIsSubmitting(false);
                return;
            }

            setSuccess('Code verified! Redirecting...');
            // The API sets a session cookie, redirect to admin
            setTimeout(() => router.push('/admin'), 1000);
        } catch (err) {
            console.error('Verify code error:', err);
            setError('An error occurred. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-950">
                <Loader2 className="w-8 h-8 animate-spin text-violet-600" />
            </div>
        );
    }

    if (isAuthenticated) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-950">
                <Loader2 className="w-8 h-8 animate-spin text-violet-600" />
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-4">
            <Card className="w-full max-w-md">
                <CardHeader className="text-center pb-8">
                    <div className="flex justify-center mb-4">
                        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center shadow-lg">
                            <Package className="w-8 h-8 text-white" />
                        </div>
                    </div>
                    <CardTitle className="text-2xl font-bold">Admin Portal</CardTitle>
                    <CardDescription>
                        {showBackupAuth
                            ? 'Use backup code to access admin dashboard'
                            : 'Sign in to access the LabSupply admin dashboard'
                        }
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {!showBackupAuth ? (
                        // Regular login form
                        <form onSubmit={handleSubmit} className="space-y-4">
                            {error && (
                                <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                                    <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                                    <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                                </div>
                            )}

                            {success && (
                                <div className="flex items-start gap-2 p-3 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
                                    <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                    <p className="text-sm text-green-600 dark:text-green-400">{success}</p>
                                </div>
                            )}

                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                    Email Address
                                </label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                    <Input
                                        type="email"
                                        placeholder="admin@example.com"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="pl-10"
                                        required
                                        autoComplete="email"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                        Password
                                    </label>
                                    <a href="/forgot-password" className="text-sm text-orange-600 hover:text-orange-500">
                                        Forgot password?
                                    </a>
                                </div>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                    <Input
                                        type="password"
                                        placeholder="Enter your password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="pl-10"
                                        required
                                        autoComplete="current-password"
                                    />
                                </div>
                            </div>

                            <Button
                                type="submit"
                                className="w-full bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700"
                                disabled={isSubmitting}
                            >
                                {isSubmitting ? (
                                    <>
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        Signing in...
                                    </>
                                ) : (
                                    'Sign In'
                                )}
                            </Button>

                            {/* Backup Authentication Link */}
                            <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                                <button
                                    type="button"
                                    onClick={() => setShowBackupAuth(true)}
                                    className="w-full flex items-center justify-center gap-2 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-orange-600 dark:hover:text-orange-400 transition-colors"
                                >
                                    <KeyRound className="w-4 h-4" />
                                    Use Backup Code (Email Verification)
                                </button>
                            </div>

                            <p className="text-xs text-center text-gray-500 mt-4">
                                This is a restricted area. Only authorized administrators can access this portal.
                            </p>
                        </form>
                    ) : (
                        // Backup code authentication form
                        <form onSubmit={handleBackupLogin} className="space-y-4">
                            {error && (
                                <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                                    <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                                    <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                                </div>
                            )}

                            {success && (
                                <div className="flex items-start gap-2 p-3 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
                                    <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                    <p className="text-sm text-green-600 dark:text-green-400">{success}</p>
                                </div>
                            )}

                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                    Admin Email
                                </label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                    <Input
                                        type="email"
                                        placeholder="info@chainhaven.co"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="pl-10"
                                        required
                                        autoComplete="email"
                                    />
                                </div>
                            </div>

                            {!codeSent ? (
                                <Button
                                    type="button"
                                    onClick={handleSendBackupCode}
                                    className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700"
                                    disabled={sendingCode}
                                >
                                    {sendingCode ? (
                                        <>
                                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                            Sending Code...
                                        </>
                                    ) : (
                                        <>
                                            <Mail className="w-4 h-4 mr-2" />
                                            Send 8-Digit Code to Email
                                        </>
                                    )}
                                </Button>
                            ) : (
                                <>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                            Enter 8-Digit Code from Email
                                        </label>
                                        <div className="relative">
                                            <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                            <Input
                                                type="text"
                                                placeholder="12345678"
                                                value={backupCode}
                                                onChange={(e) => setBackupCode(e.target.value.replace(/\D/g, '').slice(0, 8))}
                                                className="pl-10 font-mono text-lg tracking-widest"
                                                required
                                                maxLength={8}
                                            />
                                        </div>
                                    </div>

                                    <Button
                                        type="submit"
                                        className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700"
                                        disabled={isSubmitting || backupCode.length !== 8}
                                    >
                                        {isSubmitting ? (
                                            <>
                                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                                Verifying...
                                            </>
                                        ) : (
                                            <>
                                                <CheckCircle className="w-4 h-4 mr-2" />
                                                Verify & Sign In
                                            </>
                                        )}
                                    </Button>

                                    <button
                                        type="button"
                                        onClick={() => { setCodeSent(false); setSuccess(''); setBackupCode(''); }}
                                        className="w-full text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                                    >
                                        Resend Code
                                    </button>
                                </>
                            )}

                            {/* Back to regular login */}
                            <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                                <button
                                    type="button"
                                    onClick={() => { setShowBackupAuth(false); setCodeSent(false); setError(''); setSuccess(''); setBackupCode(''); }}
                                    className="w-full flex items-center justify-center gap-2 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-orange-600 dark:hover:text-orange-400 transition-colors"
                                >
                                    <Lock className="w-4 h-4" />
                                    Back to Password Login
                                </button>
                            </div>
                        </form>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
