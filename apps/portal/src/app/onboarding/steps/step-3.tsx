'use client';

import { useOnboarding } from '@/hooks/use-onboarding';
import { StepNavigation } from '@/components/onboarding/step-navigation';
import { Input } from '@/components/ui/input';

interface StepProps {
    onNext: () => void;
    onPrev: () => void;
}

const usStates = [
    'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
    'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
    'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
    'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
    'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'
];

export default function Step3Address({ onNext, onPrev }: StepProps) {
    const { data, updateData, currentStep, totalSteps, isStepValid } = useOnboarding();

    const updateBusinessAddress = (field: string, value: string) => {
        updateData({
            businessAddress: {
                ...data.businessAddress,
                [field]: value,
            },
        });
    };

    const updateShippingAddress = (field: string, value: string) => {
        updateData({
            shippingAddress: {
                ...data.shippingAddress,
                [field]: value,
            },
        });
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                    Business Address
                </h1>
                <p className="text-gray-500 dark:text-gray-400 mt-1">
                    Your official business address for correspondence and billing.
                </p>
            </div>

            {/* Business Address */}
            <div className="space-y-4">
                <h3 className="font-medium text-gray-900 dark:text-white">Business Address</h3>

                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Street Address <span className="text-red-500">*</span>
                    </label>
                    <Input
                        value={data.businessAddress.street1}
                        onChange={(e) => updateBusinessAddress('street1', e.target.value)}
                        placeholder="123 Business Street"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Suite / Unit <span className="text-gray-400">(optional)</span>
                    </label>
                    <Input
                        value={data.businessAddress.street2}
                        onChange={(e) => updateBusinessAddress('street2', e.target.value)}
                        placeholder="Suite 100"
                    />
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            City <span className="text-red-500">*</span>
                        </label>
                        <Input
                            value={data.businessAddress.city}
                            onChange={(e) => updateBusinessAddress('city', e.target.value)}
                            placeholder="City"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            State <span className="text-red-500">*</span>
                        </label>
                        <select
                            value={data.businessAddress.state}
                            onChange={(e) => updateBusinessAddress('state', e.target.value)}
                            className="w-full h-10 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 text-sm"
                        >
                            <option value="">Select...</option>
                            {usStates.map((state) => (
                                <option key={state} value={state}>{state}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            ZIP Code <span className="text-red-500">*</span>
                        </label>
                        <Input
                            value={data.businessAddress.zip}
                            onChange={(e) => updateBusinessAddress('zip', e.target.value)}
                            placeholder="12345"
                            maxLength={10}
                        />
                    </div>
                </div>
            </div>

            {/* Same as shipping checkbox */}
            <div className="pt-4 border-t">
                <label className="flex items-center gap-3 cursor-pointer">
                    <input
                        type="checkbox"
                        checked={data.sameAsShipping}
                        onChange={(e) => updateData({ sameAsShipping: e.target.checked })}
                        className="h-4 w-4 rounded border-gray-300 text-violet-600 focus:ring-violet-500"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                        Shipping address is the same as business address
                    </span>
                </label>
            </div>

            {/* Shipping Address (conditional) */}
            {!data.sameAsShipping && (
                <div className="space-y-4 pt-4 border-t">
                    <h3 className="font-medium text-gray-900 dark:text-white">Shipping Address</h3>
                    <p className="text-sm text-gray-500">
                        Where orders should be shipped from your suppliers
                    </p>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Street Address <span className="text-red-500">*</span>
                        </label>
                        <Input
                            value={data.shippingAddress.street1}
                            onChange={(e) => updateShippingAddress('street1', e.target.value)}
                            placeholder="123 Warehouse Ave"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Suite / Unit <span className="text-gray-400">(optional)</span>
                        </label>
                        <Input
                            value={data.shippingAddress.street2}
                            onChange={(e) => updateShippingAddress('street2', e.target.value)}
                            placeholder="Unit B"
                        />
                    </div>

                    <div className="grid gap-4 md:grid-cols-3">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                City <span className="text-red-500">*</span>
                            </label>
                            <Input
                                value={data.shippingAddress.city}
                                onChange={(e) => updateShippingAddress('city', e.target.value)}
                                placeholder="City"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                State <span className="text-red-500">*</span>
                            </label>
                            <select
                                value={data.shippingAddress.state}
                                onChange={(e) => updateShippingAddress('state', e.target.value)}
                                className="w-full h-10 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 text-sm"
                            >
                                <option value="">Select...</option>
                                {usStates.map((state) => (
                                    <option key={state} value={state}>{state}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                ZIP Code <span className="text-red-500">*</span>
                            </label>
                            <Input
                                value={data.shippingAddress.zip}
                                onChange={(e) => updateShippingAddress('zip', e.target.value)}
                                placeholder="12345"
                                maxLength={10}
                            />
                        </div>
                    </div>
                </div>
            )}

            {/* Navigation */}
            <StepNavigation
                currentStep={currentStep}
                totalSteps={totalSteps}
                onNext={onNext}
                onPrev={onPrev}
                canProceed={isStepValid(3)}
            />
        </div>
    );
}
