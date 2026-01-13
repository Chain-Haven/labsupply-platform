'use client';

import { useOnboarding } from '@/hooks/use-onboarding';
import { StepNavigation } from '@/components/onboarding/step-navigation';
import { DocumentUploader } from '@/components/onboarding/document-uploader';
import { Shield } from 'lucide-react';

interface StepProps {
    onNext: () => void;
    onPrev: () => void;
}

export default function Step5Documents({ onNext, onPrev }: StepProps) {
    const { data, updateData, currentStep, totalSteps, isStepValid } = useOnboarding();

    const handleUpload = (docType: keyof typeof data.documents, file: File) => {
        updateData({
            documents: {
                ...data.documents,
                [docType]: file,
            },
            documentStatus: {
                ...data.documentStatus,
                [docType]: 'uploaded',
            },
        });
    };

    const handleRemove = (docType: keyof typeof data.documents) => {
        updateData({
            documents: {
                ...data.documents,
                [docType]: null,
            },
            documentStatus: {
                ...data.documentStatus,
                [docType]: 'pending',
            },
        });
    };

    const isResearcher = data.accountType === 'researcher';
    const isInstitution = data.accountType === 'institution';
    const requiresArticles = data.businessType === 'llc' || data.businessType === 'corporation';

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                    Compliance Documents
                </h1>
                <p className="text-gray-500 dark:text-gray-400 mt-1">
                    Upload the required documents for account verification.
                </p>
            </div>

            {/* Documents */}
            <div className="space-y-4">
                <DocumentUploader
                    label="Business License"
                    description="Valid state/local business registration or license"
                    required={true}
                    status={data.documentStatus.businessLicense}
                    onUpload={(file) => handleUpload('businessLicense', file)}
                    onRemove={() => handleRemove('businessLicense')}
                    fileName={data.documents.businessLicense?.name}
                />

                {requiresArticles && (
                    <DocumentUploader
                        label="Articles of Incorporation / Formation"
                        description="Certificate of formation, articles of incorporation, or operating agreement"
                        required={true}
                        status={data.documentStatus.articlesOfIncorporation}
                        onUpload={(file) => handleUpload('articlesOfIncorporation', file)}
                        onRemove={() => handleRemove('articlesOfIncorporation')}
                        fileName={data.documents.articlesOfIncorporation?.name}
                    />
                )}

                <DocumentUploader
                    label="Tax Exemption Certificate"
                    description="If your business is tax-exempt (e.g., 501(c)(3) or reseller certificate)"
                    required={false}
                    status={data.documentStatus.taxExemptCertificate}
                    onUpload={(file) => handleUpload('taxExemptCertificate', file)}
                    onRemove={() => handleRemove('taxExemptCertificate')}
                    fileName={data.documents.taxExemptCertificate?.name}
                />

                {(isResearcher || isInstitution) && (
                    <DocumentUploader
                        label="Research Credentials"
                        description="Institution affiliation letter, research license, or credentials"
                        required={true}
                        status={data.documentStatus.researchCredentials}
                        onUpload={(file) => handleUpload('researchCredentials', file)}
                        onRemove={() => handleRemove('researchCredentials')}
                        fileName={data.documents.researchCredentials?.name}
                    />
                )}

                <DocumentUploader
                    label="Government-Issued ID"
                    description="Driver's license, passport, or state ID of authorized representative"
                    required={true}
                    status={data.documentStatus.governmentId}
                    onUpload={(file) => handleUpload('governmentId', file)}
                    onRemove={() => handleRemove('governmentId')}
                    fileName={data.documents.governmentId?.name}
                />
            </div>

            {/* Security Notice */}
            <div className="p-4 rounded-lg bg-gray-50 dark:bg-gray-800 flex gap-3">
                <Shield className="w-5 h-5 text-gray-500 shrink-0 mt-0.5" />
                <div>
                    <h4 className="font-medium text-gray-700 dark:text-gray-200 mb-1">
                        Document Security
                    </h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                        Your documents are encrypted in transit and at rest. They are only
                        accessible to our verification team and are deleted after 90 days
                        of account inactivity.
                    </p>
                </div>
            </div>

            {/* Navigation */}
            <StepNavigation
                currentStep={currentStep}
                totalSteps={totalSteps}
                onNext={onNext}
                onPrev={onPrev}
                canProceed={isStepValid(5)}
            />
        </div>
    );
}
