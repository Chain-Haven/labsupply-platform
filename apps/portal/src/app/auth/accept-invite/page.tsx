'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function AcceptInvitePage() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const token = searchParams.get('token');

    const [status, setStatus] = useState<'loading' | 'success' | 'error' | 'redirect'>('loading');
    const [message, setMessage] = useState('');
    const [redirectTo, setRedirectTo] = useState('');

    useEffect(() => {
        if (!token) {
            setStatus('error');
            setMessage('Invalid invitation link. No token provided.');
            return;
        }

        const acceptInvite = async () => {
            try {
                const res = await fetch(`/api/v1/auth/accept-invite?token=${token}`, {
                    method: 'POST',
                    credentials: 'include',
                });
                const data = await res.json();

                if (data.redirect) {
                    setStatus('redirect');
                    setMessage(data.message || 'Redirecting...');
                    setRedirectTo(data.redirect);
                    setTimeout(() => router.push(data.redirect), 1500);
                    return;
                }

                if (!res.ok) {
                    setStatus('error');
                    setMessage(data.error || 'Failed to accept invitation.');
                    return;
                }

                setStatus('success');
                setMessage(data.message || 'Invitation accepted!');
                const dest = data.scope === 'admin' ? '/admin' : '/dashboard';
                setTimeout(() => router.push(dest), 2000);
            } catch {
                setStatus('error');
                setMessage('An unexpected error occurred. Please try again.');
            }
        };

        acceptInvite();
    }, [token, router]);

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
            <Card className="w-full max-w-md">
                <CardHeader className="text-center">
                    <CardTitle className="text-lg">
                        {status === 'loading' && 'Accepting Invitation...'}
                        {status === 'success' && 'Invitation Accepted'}
                        {status === 'error' && 'Invitation Error'}
                        {status === 'redirect' && 'Almost There'}
                    </CardTitle>
                </CardHeader>
                <CardContent className="text-center space-y-4">
                    {status === 'loading' && (
                        <Loader2 className="w-8 h-8 animate-spin text-violet-600 mx-auto" />
                    )}
                    {status === 'success' && (
                        <CheckCircle className="w-8 h-8 text-green-600 mx-auto" />
                    )}
                    {status === 'error' && (
                        <XCircle className="w-8 h-8 text-red-600 mx-auto" />
                    )}
                    {status === 'redirect' && (
                        <Loader2 className="w-8 h-8 animate-spin text-violet-600 mx-auto" />
                    )}
                    <p className="text-sm text-gray-600">{message}</p>
                    {status === 'error' && (
                        <div className="flex gap-2 justify-center pt-2">
                            <Button variant="outline" onClick={() => router.push('/login')}>
                                Go to Login
                            </Button>
                            <Button variant="outline" onClick={() => router.push('/register')}>
                                Register
                            </Button>
                        </div>
                    )}
                    {redirectTo && status === 'redirect' && (
                        <Button variant="outline" onClick={() => router.push(redirectTo)}>
                            Continue
                        </Button>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
