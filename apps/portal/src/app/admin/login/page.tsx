'use client';

import { Suspense, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Package, Lock, Mail, AlertCircle, Loader2, KeyRound, CheckCircle, Wand2 } from 'lucide-react';
import { useAdminAuth } from '@/lib/admin-auth';

type LoginMode = 'password' | 'magic-link' | 'backup-code';

export default function AdminLoginPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-950">
                <Loader2 className="w-8 h-8 animate-spin text-violet-600" />
            </div>
        }>
            <AdminLoginContent />
        </Suspense>
    );
}

function AdminLoginContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { login, loginWithMagicLink, isAuthenticated, isLoading } = useAdminAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [loginMode, setLoginMode] = useState<LoginMode>('magic-link');

    // Backup code state
    const [backupCode, setBackupCode] = useState('');
    const [codeSent, setCodeSent] = useState(false);
    const [sendingCode, setSendingCode] = useState(false);

    // Magic link state
    const [magicLinkSent, setMagicLinkSent] = useState(false);

    useEffect(() => {
        if (!isLoading && isAuthenticated) {
            router.push('/admin');
        }
    }, [isLoading, isAuthenticated, router]);

    // Show error messages from auth redirects
    useEffect(() => {
        const errorParam = searchParams.get('error');
        if (errorParam) {
            const errorMessages: Record<string, string> = {
                auth_failed: 'Authentication failed. Please try again.',
                not_admin: 'This account does not have admin access. Contact your administrator.',
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
        setCodeSent(false);
        setBackupCode('');
        setMagicLinkSent(false);
    };

    const handlePasswordLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        setIsSubmitting(true);
        try {
            const result = await login(email, password);
            if (result.success) {
                router.push('/admin');
            } else {
                setError(result.error || 'Invalid credentials.');
            }
        } catch {
            setError('An error occurred. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleSendMagicLink = async () => {
        if (!email) { setError('Please enter your email address'); return; }
        setError('');
        setSuccess('');
        setIsSubmitting(true);
        try {
            const result = await loginWithMagicLink(email);
            if (result.success) {
                setMagicLinkSent(true);
                setSuccess('Magic link sent! Check your email and click the link to sign in.');
            } else {
                setError(result.error || 'Failed to send magic link.');
            }
        } catch {
            setError('Failed to send magic link. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleSendBackupCode = async () => {
        if (!email) { setError('Please enter your email address'); return; }
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
            } else {
                setCodeSent(true);
                setSuccess('Backup code sent to your email.');
            }
        } catch {
            setError('Failed to send backup code.');
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
                body: JSON.stringify({ email: email.toLowerCase(), code: backupCode }),
            });
            const data = await response.json();
            if (!response.ok) {
                setError(data.error || 'Invalid or expired code');
            } else {
                setSuccess('Verified! Redirecting...');
                setTimeout(() => router.push('/admin'), 1000);
            }
        } catch {
            setError('An error occurred. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isLoading || isAuthenticated) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-950">
                <Loader2 className="w-8 h-8 animate-spin text-violet-600" />
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-4">
            <Card className="w-full max-w-md">
                <CardHeader className="text-center pb-4">
                    <div className="flex justify-center mb-4">
                        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center shadow-lg">
                            <Package className="w-8 h-8 text-white" />
                        </div>
                    </div>
                    <CardTitle className="text-2xl font-bold">Admin Portal</CardTitle>
                    <CardDescription>Sign in to access the WhiteLabel Peptides admin dashboard</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {/* Login mode tabs */}
                    <div className="flex rounded-lg bg-gray-100 dark:bg-gray-800 p-1 gap-1">
                        {([
                            { id: 'magic-link' as LoginMode, label: 'Magic Link', icon: Wand2 },
                            { id: 'password' as LoginMode, label: 'Password', icon: Lock },
                            { id: 'backup-code' as LoginMode, label: 'Backup Code', icon: KeyRound },
                        ]).map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => switchMode(tab.id)}
                                className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-2 rounded-md text-xs font-medium transition-colors ${
                                    loginMode === tab.id
                                        ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                                        : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                                }`}
                            >
                                <tab.icon className="w-3.5 h-3.5" />
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    {/* Error / Success banners */}
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

                    {/* Email field (shared across all modes) */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Email Address</label>
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

                    {/* === MAGIC LINK MODE === */}
                    {loginMode === 'magic-link' && (
                        <div className="space-y-4">
                            {!magicLinkSent ? (
                                <Button
                                    onClick={handleSendMagicLink}
                                    className="w-full bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700"
                                    disabled={isSubmitting}
                                >
                                    {isSubmitting ? (
                                        <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Sending...</>
                                    ) : (
                                        <><Wand2 className="w-4 h-4 mr-2" /> Send Magic Link</>
                                    )}
                                </Button>
                            ) : (
                                <div className="text-center py-4 space-y-3">
                                    <Mail className="w-10 h-10 mx-auto text-violet-500" />
                                    <p className="text-sm text-gray-600 dark:text-gray-400">
                                        Check your email and click the link to sign in. You can close this tab.
                                    </p>
                                    <button
                                        onClick={() => { setMagicLinkSent(false); setSuccess(''); }}
                                        className="text-sm text-violet-600 hover:text-violet-500"
                                    >
                                        Resend link
                                    </button>
                                </div>
                            )}
                            <p className="text-xs text-center text-gray-500">
                                A sign-in link will be sent to your email. No password needed.
                            </p>
                        </div>
                    )}

                    {/* === PASSWORD MODE === */}
                    {loginMode === 'password' && (
                        <form onSubmit={handlePasswordLogin} className="space-y-4">
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Password</label>
                                    <a href="/forgot-password" className="text-xs text-orange-600 hover:text-orange-500">Forgot password?</a>
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
                                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Signing in...</>
                                ) : 'Sign In'}
                            </Button>
                        </form>
                    )}

                    {/* === BACKUP CODE MODE === */}
                    {loginMode === 'backup-code' && (
                        <form onSubmit={handleBackupLogin} className="space-y-4">
                            {!codeSent ? (
                                <Button
                                    type="button"
                                    onClick={handleSendBackupCode}
                                    className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700"
                                    disabled={sendingCode}
                                >
                                    {sendingCode ? (
                                        <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Sending Code...</>
                                    ) : (
                                        <><Mail className="w-4 h-4 mr-2" /> Send 8-Digit Code</>
                                    )}
                                </Button>
                            ) : (
                                <>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Enter 8-Digit Code</label>
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
                                            <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Verifying...</>
                                        ) : (
                                            <><CheckCircle className="w-4 h-4 mr-2" /> Verify & Sign In</>
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
                        </form>
                    )}

                    <p className="text-xs text-center text-gray-500 pt-2">
                        This is a restricted area. Only authorized administrators can access this portal.
                    </p>
                </CardContent>
            </Card>
        </div>
    );
}
