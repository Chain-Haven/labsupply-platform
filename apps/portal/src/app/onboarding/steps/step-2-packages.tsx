'use client';

import { useOnboarding } from '@/hooks/use-onboarding';
import { SERVICE_PACKAGES, formatPrice, type PackageSlug } from '@/lib/packages';
import { CheckCircle, X, ArrowRight, ArrowLeft, Sparkles } from 'lucide-react';

interface StepProps {
    onNext: () => void;
    onPrev: () => void;
}

export default function Step2Packages({ onNext, onPrev }: StepProps) {
    const { data, updateData } = useOnboarding();

    const handleSelect = (slug: PackageSlug) => {
        updateData({ selectedPackage: slug });
    };

    return (
        <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                Choose Your Launch Package
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-8">
                Select the package that fits your needs. You can always upgrade later.
                Paid packages are invoiced after your account is approved.
            </p>

            <div className="grid lg:grid-cols-3 gap-4">
                {SERVICE_PACKAGES.map((pkg) => {
                    const isSelected = data.selectedPackage === pkg.slug;
                    return (
                        <button
                            key={pkg.slug}
                            type="button"
                            onClick={() => handleSelect(pkg.slug)}
                            className={`relative text-left rounded-xl border-2 p-5 transition-all ${
                                isSelected
                                    ? 'border-violet-500 bg-violet-50 dark:bg-violet-500/10 shadow-md shadow-violet-500/10'
                                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                            }`}
                        >
                            {pkg.isPopular && (
                                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-violet-600 text-white text-xs font-semibold">
                                        <Sparkles className="w-3 h-3" />
                                        Most Popular
                                    </span>
                                </div>
                            )}

                            <div className="mb-4">
                                <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                                    {pkg.name}
                                </h3>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                    {pkg.tagline}
                                </p>
                            </div>

                            <div className="mb-5">
                                <div className="flex items-baseline gap-2">
                                    <span className="text-3xl font-bold text-gray-900 dark:text-white">
                                        {formatPrice(pkg.priceCents)}
                                    </span>
                                    {pkg.priceCents > 0 && (
                                        <span className="text-sm text-gray-400 dark:text-gray-500">one-time</span>
                                    )}
                                </div>
                                {pkg.originalPriceCents && (
                                    <div className="flex items-center gap-2 mt-1">
                                        <span className="text-sm text-gray-400 line-through">
                                            {formatPrice(pkg.originalPriceCents)}
                                        </span>
                                        <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                                            SAVE {formatPrice(pkg.originalPriceCents - pkg.priceCents)}
                                        </span>
                                    </div>
                                )}
                            </div>

                            <ul className="space-y-2 mb-5">
                                {pkg.features.map((feat, i) => (
                                    <li key={i} className="flex items-start gap-2 text-sm">
                                        {feat.included ? (
                                            <CheckCircle className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                                        ) : (
                                            <X className="w-4 h-4 text-gray-300 dark:text-gray-600 mt-0.5 flex-shrink-0" />
                                        )}
                                        <span className={feat.included
                                            ? 'text-gray-700 dark:text-gray-300'
                                            : 'text-gray-400 dark:text-gray-600'
                                        }>
                                            {feat.text}
                                        </span>
                                    </li>
                                ))}
                            </ul>

                            <div className={`w-full py-2.5 rounded-lg text-center text-sm font-semibold transition-colors ${
                                isSelected
                                    ? 'bg-violet-600 text-white'
                                    : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                            }`}>
                                {isSelected ? 'Selected' : 'Select Package'}
                            </div>
                        </button>
                    );
                })}
            </div>

            <p className="text-xs text-gray-400 dark:text-gray-500 text-center mt-6">
                All packages include access to our core fulfillment platform.
                Paid packages are invoiced via ACH after your account is approved &mdash; no payment required now.
            </p>

            <div className="flex justify-between mt-8">
                <button
                    type="button"
                    onClick={onPrev}
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Back
                </button>
                <button
                    type="button"
                    onClick={onNext}
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-violet-600 text-white text-sm font-semibold hover:bg-violet-500 transition-colors"
                >
                    Continue
                    <ArrowRight className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
}
