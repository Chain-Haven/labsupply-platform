'use client';

import { Suspense, useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { CANONICAL_ORIGIN } from '@/lib/constants';
import { Loader2 } from 'lucide-react';

/**
 * Legacy /auth/callback page — now a thin redirect shim.
 *
 * The primary auth entry point is /auth/confirm (a server Route Handler that
 * can reliably exchange PKCE codes using server-side cookies). If a user
 * lands here (e.g. from an old bookmark or stale email link), we simply
 * forward them to /auth/confirm with the same query parameters so all
 * exchange logic lives in one place.
 */
export default function AuthCallbackPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
                <Loader2 className="w-8 h-8 animate-spin text-violet-400 mb-4" />
                <p className="text-white/60 text-sm">Signing you in...</p>
            </div>
        }>
            <AuthCallbackRedirect />
        </Suspense>
    );
}

function AuthCallbackRedirect() {
    const searchParams = useSearchParams();
    const handledRef = useRef(false);

    useEffect(() => {
        if (handledRef.current) return;
        handledRef.current = true;

        const confirmUrl = new URL('/auth/confirm', CANONICAL_ORIGIN);

        searchParams.forEach((value, key) => {
            confirmUrl.searchParams.set(key, value);
        });

        window.location.href = confirmUrl.toString();
    }, [searchParams]);

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
            <Loader2 className="w-8 h-8 animate-spin text-violet-400 mb-4" />
            <p className="text-white/60 text-sm">Redirecting...</p>
        </div>
    );
}
