'use client';

import { useEffect } from 'react';

export default function AdminError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
    useEffect(() => { console.error('Admin error:', error); }, [error]);

    return (
        <div className="p-8 text-center">
            <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01" /></svg>
            </div>
            <h2 className="text-lg font-semibold text-white mb-2">Admin Panel Error</h2>
            <p className="text-gray-400 text-sm mb-4">Something went wrong loading this page.</p>
            <button onClick={reset} className="px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 text-sm font-medium">Retry</button>
        </div>
    );
}
