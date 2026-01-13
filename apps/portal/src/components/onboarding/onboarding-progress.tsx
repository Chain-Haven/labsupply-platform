'use client';

import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface OnboardingProgressProps {
    currentStep: number;
    totalSteps: number;
    steps: { title: string; description: string }[];
}

export function OnboardingProgress({ currentStep, totalSteps, steps }: OnboardingProgressProps) {
    return (
        <div className="hidden lg:block w-72 shrink-0">
            <div className="sticky top-8">
                <h2 className="text-lg font-semibold text-white mb-6">Account Setup</h2>
                <nav className="space-y-2">
                    {steps.map((step, index) => {
                        const stepNumber = index + 1;
                        const isComplete = stepNumber < currentStep;
                        const isCurrent = stepNumber === currentStep;

                        return (
                            <div
                                key={index}
                                className={cn(
                                    'flex items-start gap-3 p-3 rounded-lg transition-colors',
                                    isCurrent && 'bg-white/10',
                                    !isCurrent && !isComplete && 'opacity-50'
                                )}
                            >
                                <div
                                    className={cn(
                                        'w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium shrink-0',
                                        isComplete && 'bg-green-500 text-white',
                                        isCurrent && 'bg-white text-violet-600',
                                        !isComplete && !isCurrent && 'bg-white/20 text-white'
                                    )}
                                >
                                    {isComplete ? <Check className="w-4 h-4" /> : stepNumber}
                                </div>
                                <div>
                                    <p className={cn(
                                        'font-medium',
                                        isCurrent ? 'text-white' : 'text-white/80'
                                    )}>
                                        {step.title}
                                    </p>
                                    <p className="text-sm text-white/60">{step.description}</p>
                                </div>
                            </div>
                        );
                    })}
                </nav>

                {/* Progress bar */}
                <div className="mt-8">
                    <div className="flex justify-between text-sm text-white/60 mb-2">
                        <span>Progress</span>
                        <span>{Math.round(((currentStep - 1) / (totalSteps - 1)) * 100)}%</span>
                    </div>
                    <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-gradient-to-r from-green-400 to-emerald-500 transition-all duration-300"
                            style={{ width: `${((currentStep - 1) / (totalSteps - 1)) * 100}%` }}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}
