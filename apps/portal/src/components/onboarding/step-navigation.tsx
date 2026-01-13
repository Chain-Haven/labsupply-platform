'use client';

import { ArrowLeft, ArrowRight, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface StepNavigationProps {
    currentStep: number;
    totalSteps: number;
    onNext: () => void;
    onPrev: () => void;
    canProceed: boolean;
    isSubmitting?: boolean;
    nextLabel?: string;
}

export function StepNavigation({
    currentStep,
    totalSteps,
    onNext,
    onPrev,
    canProceed,
    isSubmitting = false,
    nextLabel,
}: StepNavigationProps) {
    const isFirstStep = currentStep === 1;
    const isLastStep = currentStep === totalSteps;

    return (
        <div className="flex items-center justify-between pt-6 border-t border-gray-200 dark:border-gray-700">
            <Button
                type="button"
                variant="outline"
                onClick={onPrev}
                disabled={isFirstStep || isSubmitting}
                className={isFirstStep ? 'invisible' : ''}
            >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
            </Button>

            <div className="flex items-center gap-2 lg:hidden">
                {Array.from({ length: totalSteps }).map((_, i) => (
                    <div
                        key={i}
                        className={`w-2 h-2 rounded-full ${i + 1 === currentStep
                                ? 'bg-violet-600'
                                : i + 1 < currentStep
                                    ? 'bg-green-500'
                                    : 'bg-gray-300'
                            }`}
                    />
                ))}
            </div>

            <Button
                type="button"
                onClick={onNext}
                disabled={!canProceed || isSubmitting}
                className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:opacity-90"
            >
                {isSubmitting ? (
                    <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Submitting...
                    </>
                ) : (
                    <>
                        {nextLabel || (isLastStep ? 'Submit Application' : 'Continue')}
                        {!isLastStep && <ArrowRight className="w-4 h-4 ml-2" />}
                    </>
                )}
            </Button>
        </div>
    );
}
