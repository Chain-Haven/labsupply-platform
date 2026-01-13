import Link from 'next/link';
import { Package } from 'lucide-react';
import { OnboardingProvider } from '@/hooks/use-onboarding';

export default function OnboardingLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <OnboardingProvider>
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
                {/* Background effects */}
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-violet-500/20 rounded-full blur-3xl" />
                    <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-500/20 rounded-full blur-3xl" />
                </div>

                {/* Header */}
                <header className="relative z-10 px-6 py-4">
                    <Link href="/" className="inline-flex items-center gap-2">
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center">
                            <Package className="w-6 h-6 text-white" />
                        </div>
                        <span className="text-xl font-bold text-white">LabSupply</span>
                    </Link>
                </header>

                {/* Content */}
                <main className="relative z-10">
                    {children}
                </main>
            </div>
        </OnboardingProvider>
    );
}
