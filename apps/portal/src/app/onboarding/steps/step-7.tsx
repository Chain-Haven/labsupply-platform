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
    Edit2,
    PackageIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getPackageBySlug, formatPrice } from '@/lib/packages';

interface StepProps {
    onNext: () => void;
    onPrev: () => void;
}

export default function Step6Review({ onNext, onPrev }: StepProps) {
    const { data, updateData, currentStep, totalSteps, isStepValid, goToStep, resetOnboarding } = useOnboarding();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState('');

    const handleSubmit = async () => {
        setIsSubmitting(true);
        setSubmitError('');

        try {
            // Update the merchant's kyb_status to 'in_progress' and save onboarding data.
            // This is what the middleware checks to allow access to /dashboard.
            const res = await fetch('/api/v1/merchant/me', {
                method: 'PATCH',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    kyb_status: 'in_progress',
                    company_name: data.legalBusinessName || undefined,
                    website_url: data.website || undefined,
                    phone: data.businessPhone || undefined,
                    selected_package_slug: data.selectedPackage || 'self-service',
                }),
            });

            if (!res.ok) {
                const body = await res.json().catch(() => ({}));
                throw new Error(body.error || 'Failed to submit application');
            }

            // Clear localStorage onboarding state so it doesn't reload step 7 next time
            resetOnboarding();

            onNext();
        } catch (err) {
            setSubmitError(err instanceof Error ? err.message : 'Submission failed. Please try again.');
            setIsSubmitting(false);
        }
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
                <Section title="Selected Package" icon={PackageIcon} onEdit={() => goToStep(2)}>
                    {(() => {
                        const pkg = getPackageBySlug(data.selectedPackage);
                        return pkg ? (
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="font-semibold text-gray-900 dark:text-white">{pkg.name}</p>
                                    <p className="text-sm text-gray-500">{pkg.tagline}</p>
                                </div>
                                <div className="text-right">
                                    <p className="font-bold text-gray-900 dark:text-white">{formatPrice(pkg.priceCents)}</p>
                                    {pkg.priceCents > 0 && <p className="text-xs text-gray-400">one-time, invoiced after approval</p>}
                                </div>
                            </div>
                        ) : null;
                    })()}
                </Section>

                <Section title="Business Information" icon={Building} onEdit={() => goToStep(3)}>
                    <dl className="grid gap-4 md:grid-cols-2">
                        <Field label="Account Type" value={accountTypeLabels[data.accountType] || ''} />
                        <Field label="Legal Name" value={data.legalBusinessName} />
                        <Field label="Business Type" value={businessTypeLabels[data.businessType] || ''} />
                        <Field label="EIN" value={data.ein} />
                        <Field label="Phone" value={data.businessPhone} />
                        <Field label="Website" value={data.website} />
                    </dl>
                </Section>

                <Section title="Business Address" icon={MapPin} onEdit={() => goToStep(4)}>
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

                <Section title="Primary Contact" icon={User} onEdit={() => goToStep(5)}>
                    <dl className="grid gap-4 md:grid-cols-2">
                        <Field label="Name" value={`${data.contactFirstName} ${data.contactLastName}`} />
                        <Field label="Title" value={data.contactTitle} />
                        <Field label="Email" value={data.contactEmail} />
                        <Field label="Phone" value={data.contactPhone} />
                    </dl>
                </Section>

                <Section title="Documents" icon={FileText} onEdit={() => goToStep(6)}>
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

            {/* Submit error */}
            {submitError && (
                <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 flex gap-2 text-sm text-red-700 dark:text-red-300">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    {submitError}
                </div>
            )}

            {/* Navigation */}
            <StepNavigation
                currentStep={currentStep}
                totalSteps={totalSteps}
                onNext={handleSubmit}
                onPrev={onPrev}
                canProceed={isStepValid(8)}
                isSubmitting={isSubmitting}
            />
        </div>
    );
}
