'use client';

import Link from 'next/link';
import { Clock, Check, FileText, Building, ArrowRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function OnboardingPendingPage() {
    const steps = [
        {
            icon: Check,
            title: 'Account Created',
            description: 'Your merchant account has been created successfully.',
            status: 'complete',
        },
        {
            icon: FileText,
            title: 'Documents Submitted',
            description: 'We received your legal opinion letter.',
            status: 'complete',
        },
        {
            icon: Clock,
            title: 'KYB Verification',
            description: 'Our team is reviewing your business information. This typically takes 1-2 business days.',
            status: 'pending',
        },
        {
            icon: Building,
            title: 'Start Shipping',
            description: 'Once approved, you can start fulfilling orders.',
            status: 'upcoming',
        },
    ];

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
            {/* Background effects */}
            <div className="absolute inset-0 overflow-hidden">
                <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-violet-500/20 rounded-full blur-3xl" />
                <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-500/20 rounded-full blur-3xl" />
            </div>

            <div className="relative w-full max-w-lg">
                <Card className="border-white/10 bg-white/5 backdrop-blur-xl">
                    <CardContent className="pt-8 pb-8">
                        {/* Header */}
                        <div className="text-center mb-8">
                            <div className="w-16 h-16 rounded-full bg-amber-500/20 flex items-center justify-center mx-auto mb-4">
                                <Clock className="w-8 h-8 text-amber-400" />
                            </div>
                            <h1 className="text-2xl font-bold text-white mb-2">
                                Verification In Progress
                            </h1>
                            <p className="text-white/60">
                                Your account is pending KYB (Know Your Business) verification.
                            </p>
                        </div>

                        {/* Timeline */}
                        <div className="space-y-4 mb-8">
                            {steps.map((step, index) => {
                                const Icon = step.icon;
                                const isComplete = step.status === 'complete';
                                const isPending = step.status === 'pending';

                                return (
                                    <div key={index} className="flex gap-4">
                                        <div className="flex flex-col items-center">
                                            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isComplete ? 'bg-green-500' :
                                                    isPending ? 'bg-amber-500' : 'bg-white/10'
                                                }`}>
                                                <Icon className={`w-5 h-5 ${isComplete || isPending ? 'text-white' : 'text-white/40'
                                                    }`} />
                                            </div>
                                            {index < steps.length - 1 && (
                                                <div className={`w-0.5 h-12 ${isComplete ? 'bg-green-500' : 'bg-white/10'
                                                    }`} />
                                            )}
                                        </div>
                                        <div className="flex-1 pb-4">
                                            <h3 className={`font-medium ${isComplete ? 'text-green-400' :
                                                    isPending ? 'text-amber-400' : 'text-white/40'
                                                }`}>
                                                {step.title}
                                                {isPending && (
                                                    <span className="ml-2 text-xs font-normal bg-amber-500/20 px-2 py-0.5 rounded-full">
                                                        In Review
                                                    </span>
                                                )}
                                            </h3>
                                            <p className="text-sm text-white/60 mt-1">
                                                {step.description}
                                            </p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Notice */}
                        <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/20 mb-6">
                            <p className="text-sm text-amber-300">
                                <strong>Note:</strong> You will not be able to ship orders until your KYB verification is approved by our team.
                                We'll send you an email once your account is activated.
                            </p>
                        </div>

                        {/* Actions */}
                        <div className="space-y-3">
                            <Link href="/dashboard">
                                <Button className="w-full bg-gradient-to-r from-violet-600 to-indigo-600 hover:opacity-90">
                                    Go to Dashboard
                                    <ArrowRight className="w-4 h-4 ml-2" />
                                </Button>
                            </Link>
                            <p className="text-center text-white/40 text-sm">
                                You can explore the dashboard while waiting for approval.
                            </p>
                        </div>
                    </CardContent>
                </Card>

                {/* Help text */}
                <p className="mt-6 text-center text-white/40 text-sm">
                    Questions? Contact{' '}
                    <a href="mailto:support@whitelabel.peptidetech.co" className="text-violet-400 hover:text-violet-300">
                        support@whitelabel.peptidetech.co
                    </a>
                </p>
            </div>
        </div>
    );
}
