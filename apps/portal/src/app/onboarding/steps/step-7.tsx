'use client';

import { useState } from 'react';
import { useOnboarding } from '@/hooks/use-onboarding';
import { StepNavigation } from '@/components/onboarding/step-navigation';
import {
    Building,
    MapPin,
    User,
    FileText,
    Check,
    AlertCircle,
    Edit2
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface StepProps {
    onNext: () => void;
    onPrev: () => void;
}

export default function Step6Review({ onNext, onPrev }: StepProps) {
    const { data, updateData, currentStep, totalSteps, isStepValid, goToStep } = useOnboarding();
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async () => {
        setIsSubmitting(true);
        // Simulate API call
        await new Promise((resolve) => setTimeout(resolve, 2000));
        onNext();
    };

    const businessTypeLabels: Record<string, string> = {
        llc: 'Limited Liability Company (LLC)',
        corporation: 'Corporation',
        partnership: 'Partnership',
        sole_prop: 'Sole Proprietorship',
    };

    const accountTypeLabels: Record<string, string> = {
        researcher: 'Researcher',
        reseller: 'Reseller',
        institution: 'Institution',
    };

    const Section = ({
        title,
        icon: Icon,
        onEdit,
        children
    }: {
        title: string;
        icon: React.ElementType;
        onEdit: () => void;
        children: React.ReactNode;
    }) => (
        <div className="border rounded-lg overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-800 border-b">
                <div className="flex items-center gap-2">
                    <Icon className="w-4 h-4 text-gray-500" />
                    <h3 className="font-medium text-gray-900 dark:text-white">{title}</h3>
                </div>
                <Button variant="ghost" size="sm" onClick={onEdit}>
                    <Edit2 className="w-3 h-3 mr-1" />
                    Edit
                </Button>
            </div>
            <div className="p-4">{children}</div>
        </div>
    );

    const Field = ({ label, value }: { label: string; value: string }) => (
        <div>
            <dt className="text-sm text-gray-500">{label}</dt>
            <dd className="font-medium text-gray-900 dark:text-white">{value || '—'}</dd>
        </div>
    );

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                    Review & Submit
                </h1>
                <p className="text-gray-500 dark:text-gray-400 mt-1">
                    Please review your information before submitting your application.
                </p>
            </div>

            {/* Summary Sections */}
            <div className="space-y-4">
                <Section title="Business Information" icon={Building} onEdit={() => goToStep(2)}>
                    <dl className="grid gap-4 md:grid-cols-2">
                        <Field label="Account Type" value={accountTypeLabels[data.accountType] || ''} />
                        <Field label="Legal Name" value={data.legalBusinessName} />
                        <Field label="Business Type" value={businessTypeLabels[data.businessType] || ''} />
                        <Field label="EIN" value={data.ein} />
                        <Field label="Phone" value={data.businessPhone} />
                        <Field label="Website" value={data.website} />
                    </dl>
                </Section>

                <Section title="Business Address" icon={MapPin} onEdit={() => goToStep(3)}>
                    <p className="text-gray-900 dark:text-white">
                        {data.businessAddress.street1}
                        {data.businessAddress.street2 && `, ${data.businessAddress.street2}`}
                        <br />
                        {data.businessAddress.city}, {data.businessAddress.state} {data.businessAddress.zip}
                    </p>
                    {!data.sameAsShipping && data.shippingAddress.street1 && (
                        <div className="mt-3 pt-3 border-t">
                            <p className="text-sm text-gray-500 mb-1">Shipping Address:</p>
                            <p className="text-gray-900 dark:text-white">
                                {data.shippingAddress.street1}
                                {data.shippingAddress.street2 && `, ${data.shippingAddress.street2}`}
                                <br />
                                {data.shippingAddress.city}, {data.shippingAddress.state} {data.shippingAddress.zip}
                            </p>
                        </div>
                    )}
                </Section>

                <Section title="Primary Contact" icon={User} onEdit={() => goToStep(4)}>
                    <dl className="grid gap-4 md:grid-cols-2">
                        <Field label="Name" value={`${data.contactFirstName} ${data.contactLastName}`} />
                        <Field label="Title" value={data.contactTitle} />
                        <Field label="Email" value={data.contactEmail} />
                        <Field label="Phone" value={data.contactPhone} />
                    </dl>
                </Section>

                <Section title="Documents" icon={FileText} onEdit={() => goToStep(5)}>
                    <div className="space-y-2">
                        {Object.entries(data.documentStatus).map(([key, status]) => {
                            if (status === 'pending') return null;
                            const labels: Record<string, string> = {
                                businessLicense: 'Business License',
                                articlesOfIncorporation: 'Articles of Incorporation',
                                taxExemptCertificate: 'Tax Exemption Certificate',
                                researchCredentials: 'Research Credentials',
                                governmentId: 'Government ID',
                            };
                            return (
                                <div key={key} className="flex items-center gap-2">
                                    <Check className="w-4 h-4 text-green-500" />
                                    <span className="text-gray-700 dark:text-gray-300">{labels[key]}</span>
                                </div>
                            );
                        })}
                    </div>
                </Section>
            </div>

            {/* Final Acknowledgments */}
            <div className="space-y-4 pt-4 border-t">
                <h3 className="font-medium text-gray-900 dark:text-white">Final Acknowledgments</h3>

                <label className="flex items-start gap-3 cursor-pointer">
                    <input
                        type="checkbox"
                        checked={data.acknowledgeResearchOnly}
                        onChange={(e) => updateData({ acknowledgeResearchOnly: e.target.checked })}
                        className="mt-1 h-4 w-4 rounded border-gray-300 text-violet-600 focus:ring-violet-500"
                    />
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                        I confirm that all products purchased will be used exclusively for{' '}
                        <strong>legitimate research purposes</strong> in accordance with applicable laws.
                    </span>
                </label>

                <label className="flex items-start gap-3 cursor-pointer">
                    <input
                        type="checkbox"
                        checked={data.acknowledgeNoHumanConsumption}
                        onChange={(e) => updateData({ acknowledgeNoHumanConsumption: e.target.checked })}
                        className="mt-1 h-4 w-4 rounded border-gray-300 text-violet-600 focus:ring-violet-500"
                    />
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                        I understand that these products are{' '}
                        <strong>NOT intended for human or animal consumption</strong> and agree not
                        to market or sell them for such purposes.
                    </span>
                </label>

                <label className="flex items-start gap-3 cursor-pointer">
                    <input
                        type="checkbox"
                        checked={data.acknowledgeCompliance}
                        onChange={(e) => updateData({ acknowledgeCompliance: e.target.checked })}
                        className="mt-1 h-4 w-4 rounded border-gray-300 text-violet-600 focus:ring-violet-500"
                    />
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                        I certify that all information provided is accurate and complete, and I am
                        authorized to enter into agreements on behalf of the listed business.
                    </span>
                </label>
            </div>

            {/* Review Notice */}
            <div className="p-4 rounded-lg bg-violet-50 dark:bg-violet-900/20 border border-violet-200 dark:border-violet-800 flex gap-3">
                <AlertCircle className="w-5 h-5 text-violet-600 shrink-0 mt-0.5" />
                <div>
                    <h4 className="font-medium text-violet-800 dark:text-violet-200 mb-1">
                        What happens next?
                    </h4>
                    <p className="text-sm text-violet-700 dark:text-violet-300">
                        Your application will be reviewed by our compliance team within 1-2 business days.
                        You'll receive an email notification once your account is approved and ready to use.
                    </p>
                </div>
            </div>

            {/* Navigation */}
            <StepNavigation
                currentStep={currentStep}
                totalSteps={totalSteps}
                onNext={handleSubmit}
                onPrev={onPrev}
                canProceed={isStepValid(7)}
                isSubmitting={isSubmitting}
            />
        </div>
    );
}
