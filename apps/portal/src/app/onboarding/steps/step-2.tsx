'use client';

import { useOnboarding } from '@/hooks/use-onboarding';
import { StepNavigation } from '@/components/onboarding/step-navigation';
import { Input } from '@/components/ui/input';
import { ExternalLink } from 'lucide-react';

interface StepProps {
    onNext: () => void;
    onPrev: () => void;
}

const businessTypes = [
    { value: 'llc', label: 'Limited Liability Company (LLC)' },
    { value: 'corporation', label: 'Corporation (C-Corp or S-Corp)' },
    { value: 'partnership', label: 'Partnership' },
    { value: 'sole_prop', label: 'Sole Proprietorship' },
];

const currentYear = new Date().getFullYear();
const years = Array.from({ length: 100 }, (_, i) => currentYear - i);

export default function Step2Business({ onNext, onPrev }: StepProps) {
    const { data, updateData, currentStep, totalSteps, isStepValid } = useOnboarding();

    // Format EIN as XX-XXXXXXX
    const formatEin = (value: string) => {
        const digits = value.replace(/\D/g, '').slice(0, 9);
        if (digits.length > 2) {
            return `${digits.slice(0, 2)}-${digits.slice(2)}`;
        }
        return digits;
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                    Business Information
                </h1>
                <p className="text-gray-500 dark:text-gray-400 mt-1">
                    Tell us about your business. This information is used for verification.
                </p>
            </div>

            {/* Form */}
            <div className="space-y-5">
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Legal Business Name <span className="text-red-500">*</span>
                    </label>
                    <Input
                        value={data.legalBusinessName}
                        onChange={(e) => updateData({ legalBusinessName: e.target.value })}
                        placeholder="Your Company LLC"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                        As it appears on your business registration
                    </p>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        DBA / Trade Name <span className="text-gray-400">(optional)</span>
                    </label>
                    <Input
                        value={data.dba}
                        onChange={(e) => updateData({ dba: e.target.value })}
                        placeholder="Doing Business As"
                    />
                </div>

                <div className="grid gap-5 md:grid-cols-2">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Business Type <span className="text-red-500">*</span>
                        </label>
                        <select
                            value={data.businessType}
                            onChange={(e) => updateData({ businessType: e.target.value as any })}
                            className="w-full h-10 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 text-sm"
                        >
                            <option value="">Select business type...</option>
                            {businessTypes.map((type) => (
                                <option key={type.value} value={type.value}>
                                    {type.label}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            EIN / Tax ID <span className="text-red-500">*</span>
                        </label>
                        <Input
                            value={data.ein}
                            onChange={(e) => updateData({ ein: formatEin(e.target.value) })}
                            placeholder="XX-XXXXXXX"
                            maxLength={10}
                        />
                    </div>
                </div>

                <div className="grid gap-5 md:grid-cols-2">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Year Established
                        </label>
                        <select
                            value={data.yearEstablished}
                            onChange={(e) => updateData({ yearEstablished: e.target.value })}
                            className="w-full h-10 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 text-sm"
                        >
                            <option value="">Select year...</option>
                            {years.map((year) => (
                                <option key={year} value={year}>
                                    {year}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Business Phone <span className="text-red-500">*</span>
                        </label>
                        <Input
                            type="tel"
                            value={data.businessPhone}
                            onChange={(e) => updateData({ businessPhone: e.target.value })}
                            placeholder="(555) 123-4567"
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Website <span className="text-gray-400">(optional)</span>
                    </label>
                    <Input
                        type="url"
                        value={data.website}
                        onChange={(e) => updateData({ website: e.target.value })}
                        placeholder="https://yourcompany.com"
                    />
                </div>
            </div>

            {/* Mercury Bank Recommendation */}
            <div className="p-4 rounded-lg bg-sky-50 dark:bg-sky-900/20 border border-sky-200 dark:border-sky-800">
                <h4 className="font-medium text-sky-800 dark:text-sky-200 mb-1">
                    Recommended: Mercury Business Banking
                </h4>
                <p className="text-sm text-sky-700 dark:text-sky-300">
                    Need a business bank account? We recommend{' '}
                    <strong>Mercury</strong> for fast ACH transfers, free business checking, and
                    seamless integration with our invoicing system.
                </p>
                <a
                    href="https://mercury.com/r/peptide-tech-llc"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 mt-2 text-sm font-medium text-sky-600 dark:text-sky-400 hover:underline"
                >
                    Open a free Mercury account
                    <ExternalLink className="w-3.5 h-3.5" />
                </a>
            </div>

            {/* Navigation */}
            <StepNavigation
                currentStep={currentStep}
                totalSteps={totalSteps}
                onNext={onNext}
                onPrev={onPrev}
                canProceed={isStepValid(2)}
            />
        </div>
    );
}
