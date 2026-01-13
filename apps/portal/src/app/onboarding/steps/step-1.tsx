'use client';

import { useOnboarding } from '@/hooks/use-onboarding';
import { StepNavigation } from '@/components/onboarding/step-navigation';
import { Building, GraduationCap, Users, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StepProps {
    onNext: () => void;
    onPrev: () => void;
}

const accountTypes = [
    {
        id: 'researcher',
        title: 'Researcher',
        description: 'Academic or independent researcher conducting studies',
        icon: GraduationCap,
    },
    {
        id: 'reseller',
        title: 'Reseller',
        description: 'Business reselling research compounds to verified buyers',
        icon: Building,
    },
    {
        id: 'institution',
        title: 'Institution',
        description: 'University, lab, or research organization',
        icon: Users,
    },
];

export default function Step1Welcome({ onNext, onPrev }: StepProps) {
    const { data, updateData, currentStep, totalSteps, isStepValid } = useOnboarding();

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                    Welcome to LabSupply
                </h1>
                <p className="text-gray-500 dark:text-gray-400 mt-1">
                    Let's set up your merchant account. This process takes about 10 minutes.
                </p>
            </div>

            {/* Account Type Selection */}
            <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                    What type of account do you need?
                </label>
                <div className="grid gap-3">
                    {accountTypes.map((type) => (
                        <button
                            key={type.id}
                            type="button"
                            onClick={() => updateData({ accountType: type.id as any })}
                            className={cn(
                                'flex items-center gap-4 p-4 rounded-lg border-2 text-left transition-all',
                                data.accountType === type.id
                                    ? 'border-violet-500 bg-violet-50 dark:bg-violet-900/20'
                                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                            )}
                        >
                            <div className={cn(
                                'w-12 h-12 rounded-lg flex items-center justify-center',
                                data.accountType === type.id
                                    ? 'bg-violet-500 text-white'
                                    : 'bg-gray-100 dark:bg-gray-800 text-gray-500'
                            )}>
                                <type.icon className="w-6 h-6" />
                            </div>
                            <div className="flex-1">
                                <p className="font-medium text-gray-900 dark:text-white">{type.title}</p>
                                <p className="text-sm text-gray-500">{type.description}</p>
                            </div>
                            {data.accountType === type.id && (
                                <Check className="w-5 h-5 text-violet-500" />
                            )}
                        </button>
                    ))}
                </div>
            </div>

            {/* Agreements */}
            <div className="space-y-4 pt-4 border-t">
                <h3 className="font-medium text-gray-900 dark:text-white">Agreements</h3>

                <label className="flex items-start gap-3 cursor-pointer">
                    <input
                        type="checkbox"
                        checked={data.agreedToTerms}
                        onChange={(e) => updateData({ agreedToTerms: e.target.checked })}
                        className="mt-1 h-4 w-4 rounded border-gray-300 text-violet-600 focus:ring-violet-500"
                    />
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                        I agree to the{' '}
                        <a href="/terms" target="_blank" className="text-violet-600 hover:underline">
                            Terms of Service
                        </a>
                        {' '}and{' '}
                        <a href="/privacy" target="_blank" className="text-violet-600 hover:underline">
                            Privacy Policy
                        </a>
                    </span>
                </label>

                <label className="flex items-start gap-3 cursor-pointer">
                    <input
                        type="checkbox"
                        checked={data.agreedToResearchUse}
                        onChange={(e) => updateData({ agreedToResearchUse: e.target.checked })}
                        className="mt-1 h-4 w-4 rounded border-gray-300 text-violet-600 focus:ring-violet-500"
                    />
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                        I understand that all products available through LabSupply are strictly for{' '}
                        <strong>research purposes only</strong> and are not intended for human
                        consumption or any clinical/therapeutic use.
                    </span>
                </label>
            </div>

            {/* Important Notice */}
            <div className="p-4 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                <h4 className="font-medium text-amber-800 dark:text-amber-200 mb-1">
                    Important Information
                </h4>
                <p className="text-sm text-amber-700 dark:text-amber-300">
                    You will need to provide business documentation including your business license,
                    EIN/Tax ID, and proof of research credentials. Applications are reviewed within
                    1-2 business days.
                </p>
            </div>

            {/* Navigation */}
            <StepNavigation
                currentStep={currentStep}
                totalSteps={totalSteps}
                onNext={onNext}
                onPrev={onPrev}
                canProceed={isStepValid(1)}
                nextLabel="Get Started"
            />
        </div>
    );
}
