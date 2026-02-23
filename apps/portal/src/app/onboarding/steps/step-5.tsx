'use client';

import { useEffect, useState } from 'react';
import { useOnboarding } from '@/hooks/use-onboarding';
import { StepNavigation } from '@/components/onboarding/step-navigation';
import { DocumentUploader } from '@/components/onboarding/document-uploader';
import { Shield, Loader2 } from 'lucide-react';

interface StepProps {
    onNext: () => void;
    onPrev: () => void;
}

export default function Step5Documents({ onNext, onPrev }: StepProps) {
    const { data, updateData, currentStep, totalSteps, isStepValid } = useOnboarding();
    const [loadingDocs, setLoadingDocs] = useState(true);

    useEffect(() => {
        async function loadExistingDocs() {
            try {
                const res = await fetch('/api/v1/onboarding/documents');
                if (!res.ok) return;
                const json = await res.json();
                const docs = json.data || [];

                if (docs.length > 0) {
                    const newDocStatus = { ...data.documentStatus };
                    const newDocNames: Record<string, string> = {};

                    for (const doc of docs) {
                        const docType = doc.document_type as keyof typeof newDocStatus;
                        if (docType in newDocStatus) {
                            newDocStatus[docType] = doc.status === 'approved' ? 'approved'
                                : doc.status === 'rejected' ? 'rejected'
                                : 'uploaded';
                            newDocNames[docType] = doc.file_name;
                        }
                    }

                    updateData({
                        documentStatus: newDocStatus,
                        documentFileNames: newDocNames,
                    });
                }
            } catch {
                // Non-critical — user can still upload
            } finally {
                setLoadingDocs(false);
            }
        }

        loadExistingDocs();
    }, []);

    const handleUploaded = (docType: string, fileName: string) => {
        const key = docType as keyof typeof data.documentStatus;
        updateData({
            documentStatus: {
                ...data.documentStatus,
                [key]: 'uploaded',
            },
            documentFileNames: {
                ...(data.documentFileNames || {}),
                [key]: fileName,
            },
        });
    };

    const handleRemove = (docType: keyof typeof data.documentStatus) => {
        updateData({
            documentStatus: {
                ...data.documentStatus,
                [docType]: 'pending',
            },
            documentFileNames: {
                ...(data.documentFileNames || {}),
                [docType]: undefined,
            },
        });
    };

    const isResearcher = data.accountType === 'researcher';
    const isInstitution = data.accountType === 'institution';
    const requiresArticles = data.businessType === 'llc' || data.businessType === 'corporation';

    if (loadingDocs) {
        return (
            <div className="flex items-center justify-center py-16">
                <Loader2 className="w-6 h-6 animate-spin text-violet-600" />
                <span className="ml-2 text-gray-500">Loading your documents...</span>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                    Compliance Documents
                </h1>
                <p className="text-gray-500 dark:text-gray-400 mt-1">
                    Upload the required documents for account verification.
                    All required documents must be submitted before you can proceed.
                </p>
            </div>

            <div className="space-y-4">
                <DocumentUploader
                    label="Business License"
                    description="Valid state/local business registration or license"
                    documentType="businessLicense"
                    required={true}
                    status={data.documentStatus.businessLicense}
                    onUploaded={handleUploaded}
                    onRemove={() => handleRemove('businessLicense')}
                    fileName={data.documentFileNames?.businessLicense || data.documents.businessLicense?.name}
                />

                {requiresArticles && (
                    <DocumentUploader
                        label="Articles of Incorporation / Formation"
                        description="Certificate of formation, articles of incorporation, or operating agreement"
                        documentType="articlesOfIncorporation"
                        required={true}
                        status={data.documentStatus.articlesOfIncorporation}
                        onUploaded={handleUploaded}
                        onRemove={() => handleRemove('articlesOfIncorporation')}
                        fileName={data.documentFileNames?.articlesOfIncorporation || data.documents.articlesOfIncorporation?.name}
                    />
                )}

                <DocumentUploader
                    label="Tax Exemption Certificate"
                    description="If your business is tax-exempt (e.g., 501(c)(3) or reseller certificate)"
                    documentType="taxExemptCertificate"
                    required={false}
                    status={data.documentStatus.taxExemptCertificate}
                    onUploaded={handleUploaded}
                    onRemove={() => handleRemove('taxExemptCertificate')}
                    fileName={data.documentFileNames?.taxExemptCertificate || data.documents.taxExemptCertificate?.name}
                />

                {(isResearcher || isInstitution) && (
                    <DocumentUploader
                        label="Research Credentials"
                        description="Institution affiliation letter, research license, or credentials"
                        documentType="researchCredentials"
                        required={true}
                        status={data.documentStatus.researchCredentials}
                        onUploaded={handleUploaded}
                        onRemove={() => handleRemove('researchCredentials')}
                        fileName={data.documentFileNames?.researchCredentials || data.documents.researchCredentials?.name}
                    />
                )}

                <DocumentUploader
                    label="Government-Issued ID"
                    description="Driver's license, passport, or state ID of authorized representative"
                    documentType="governmentId"
                    required={true}
                    status={data.documentStatus.governmentId}
                    onUploaded={handleUploaded}
                    onRemove={() => handleRemove('governmentId')}
                    fileName={data.documentFileNames?.governmentId || data.documents.governmentId?.name}
                />
            </div>

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

            <StepNavigation
                currentStep={currentStep}
                totalSteps={totalSteps}
                onNext={onNext}
                onPrev={onPrev}
                canProceed={isStepValid(6)}
            />
        </div>
    );
}
