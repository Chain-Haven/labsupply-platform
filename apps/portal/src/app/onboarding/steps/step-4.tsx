'use client';

import { useOnboarding } from '@/hooks/use-onboarding';
import { StepNavigation } from '@/components/onboarding/step-navigation';
import { Input } from '@/components/ui/input';
import { AlertCircle } from 'lucide-react';

interface StepProps {
    onNext: () => void;
    onPrev: () => void;
}

export default function Step4Contact({ onNext, onPrev }: StepProps) {
    const { data, updateData, currentStep, totalSteps, isStepValid } = useOnboarding();

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                    Primary Contact
                </h1>
                <p className="text-gray-500 dark:text-gray-400 mt-1">
                    Information about the authorized representative for this account.
                </p>
            </div>

            {/* Form */}
            <div className="space-y-5">
                <div className="grid gap-5 md:grid-cols-2">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            First Name <span className="text-red-500">*</span>
                        </label>
                        <Input
                            value={data.contactFirstName}
                            onChange={(e) => updateData({ contactFirstName: e.target.value })}
                            placeholder="John"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Last Name <span className="text-red-500">*</span>
                        </label>
                        <Input
                            value={data.contactLastName}
                            onChange={(e) => updateData({ contactLastName: e.target.value })}
                            placeholder="Smith"
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Title / Position <span className="text-red-500">*</span>
                    </label>
                    <Input
                        value={data.contactTitle}
                        onChange={(e) => updateData({ contactTitle: e.target.value })}
                        placeholder="e.g., CEO, Director, Owner"
                    />
                </div>

                <div className="grid gap-5 md:grid-cols-2">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Email Address <span className="text-red-500">*</span>
                        </label>
                        <Input
                            type="email"
                            value={data.contactEmail}
                            onChange={(e) => updateData({ contactEmail: e.target.value })}
                            placeholder="john@company.com"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                            Must match your account login email
                        </p>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Phone Number <span className="text-red-500">*</span>
                        </label>
                        <Input
                            type="tel"
                            value={data.contactPhone}
                            onChange={(e) => updateData({ contactPhone: e.target.value })}
                            placeholder="(555) 123-4567"
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Date of Birth <span className="text-gray-400">(optional)</span>
                    </label>
                    <Input
                        type="date"
                        value={data.contactDob}
                        onChange={(e) => updateData({ contactDob: e.target.value })}
                        max={new Date().toISOString().split('T')[0]}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                        Used for identity verification purposes only
                    </p>
                </div>
            </div>

            {/* Notice */}
            <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 flex gap-3">
                <AlertCircle className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                <div>
                    <h4 className="font-medium text-blue-800 dark:text-blue-200 mb-1">
                        Authorized Representative
                    </h4>
                    <p className="text-sm text-blue-700 dark:text-blue-300">
                        The person listed here must have authority to bind the company to agreements
                        and make purchasing decisions. This information is kept confidential and
                        used only for verification.
                    </p>
                </div>
            </div>

            {/* Navigation */}
            <StepNavigation
                currentStep={currentStep}
                totalSteps={totalSteps}
                onNext={onNext}
                onPrev={onPrev}
                canProceed={isStepValid(4)}
            />
        </div>
    );
}
