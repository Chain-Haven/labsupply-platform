'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle, X } from 'lucide-react';

export default function AuthErrorHandler() {
    const [error, setError] = useState<string | null>(null);
    const router = useRouter();

    useEffect(() => {
        // Check for auth errors in hash fragment
        const hash = window.location.hash.substring(1);
        if (hash) {
            const params = new URLSearchParams(hash);
            const errorType = params.get('error');
            const errorCode = params.get('error_code');
            const errorDescription = params.get('error_description');

            if (errorType === 'access_denied') {
                let message = 'Authentication error';

                if (errorCode === 'otp_expired') {
                    message = 'Your password reset link has expired. Please request a new one.';
                } else if (errorDescription) {
                    message = decodeURIComponent(errorDescription.replace(/\+/g, ' '));
                }

                setError(message);

                // Clear the hash from URL without reloading
                window.history.replaceState(null, '', window.location.pathname);
            }
        }
    }, []);

    if (!error) return null;

    return (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 w-full max-w-md px-4">
            <div className="bg-red-500/10 backdrop-blur-xl border border-red-500/30 rounded-xl p-4 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                    <p className="text-red-400 font-medium">{error}</p>
                    <button
                        onClick={() => router.push('/admin/login')}
                        className="mt-2 text-sm text-red-300 hover:text-white underline"
                    >
                        Go to Admin Login
                    </button>
                </div>
                <button
                    onClick={() => setError(null)}
                    className="text-red-400 hover:text-white transition-colors"
                >
                    <X className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
}
