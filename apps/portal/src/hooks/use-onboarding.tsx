'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

// Onboarding data interface
export interface OnboardingData {
    // Step 1: Account Type
    accountType: 'researcher' | 'reseller' | 'institution' | '';
    agreedToTerms: boolean;
    agreedToResearchUse: boolean;

    // Step 2: Business Info
    legalBusinessName: string;
    dba: string;
    businessType: 'llc' | 'corporation' | 'partnership' | 'sole_prop' | '';
    ein: string;
    yearEstablished: string;
    website: string;
    businessPhone: string;

    // Step 3: Addresses
    businessAddress: {
        street1: string;
        street2: string;
        city: string;
        state: string;
        zip: string;
        country: string;
    };
    sameAsShipping: boolean;
    shippingAddress: {
        street1: string;
        street2: string;
        city: string;
        state: string;
        zip: string;
        country: string;
    };

    // Step 4: Contact
    contactFirstName: string;
    contactLastName: string;
    contactTitle: string;
    contactEmail: string;
    contactPhone: string;
    contactDob: string;

    // Step 5: Documents
    documents: {
        businessLicense: File | null;
        articlesOfIncorporation: File | null;
        taxExemptCertificate: File | null;
        researchCredentials: File | null;
        governmentId: File | null;
    };
    documentStatus: {
        businessLicense: 'pending' | 'uploaded' | 'approved' | 'rejected';
        articlesOfIncorporation: 'pending' | 'uploaded' | 'approved' | 'rejected';
        taxExemptCertificate: 'pending' | 'uploaded' | 'approved' | 'rejected';
        researchCredentials: 'pending' | 'uploaded' | 'approved' | 'rejected';
        governmentId: 'pending' | 'uploaded' | 'approved' | 'rejected';
    };

    // Step 6: Agreement & Signature
    agreementSignature: string;  // base64 data URL of drawn signature
    agreementSignedAt: string;   // ISO timestamp

    // Step 7: Acknowledgments
    acknowledgeResearchOnly: boolean;
    acknowledgeNoHumanConsumption: boolean;
    acknowledgeCompliance: boolean;
}

const initialData: OnboardingData = {
    accountType: '',
    agreedToTerms: false,
    agreedToResearchUse: false,
    legalBusinessName: '',
    dba: '',
    businessType: '',
    ein: '',
    yearEstablished: '',
    website: '',
    businessPhone: '',
    businessAddress: {
        street1: '',
        street2: '',
        city: '',
        state: '',
        zip: '',
        country: 'US',
    },
    sameAsShipping: true,
    shippingAddress: {
        street1: '',
        street2: '',
        city: '',
        state: '',
        zip: '',
        country: 'US',
    },
    contactFirstName: '',
    contactLastName: '',
    contactTitle: '',
    contactEmail: '',
    contactPhone: '',
    contactDob: '',
    documents: {
        businessLicense: null,
        articlesOfIncorporation: null,
        taxExemptCertificate: null,
        researchCredentials: null,
        governmentId: null,
    },
    documentStatus: {
        businessLicense: 'pending',
        articlesOfIncorporation: 'pending',
        taxExemptCertificate: 'pending',
        researchCredentials: 'pending',
        governmentId: 'pending',
    },
    agreementSignature: '',
    agreementSignedAt: '',
    acknowledgeResearchOnly: false,
    acknowledgeNoHumanConsumption: false,
    acknowledgeCompliance: false,
};

interface OnboardingContextType {
    data: OnboardingData;
    currentStep: number;
    totalSteps: number;
    updateData: (updates: Partial<OnboardingData>) => void;
    nextStep: () => void;
    prevStep: () => void;
    goToStep: (step: number) => void;
    isStepValid: (step: number) => boolean;
    resetOnboarding: () => void;
}

const OnboardingContext = createContext<OnboardingContextType | null>(null);

const STORAGE_KEY = 'wlp_onboarding';

export function OnboardingProvider({ children }: { children: ReactNode }) {
    const [data, setData] = useState<OnboardingData>(initialData);
    const [currentStep, setCurrentStep] = useState(1);
    const totalSteps = 7;

    // Load from localStorage on mount
    useEffect(() => {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                // Don't restore file objects from localStorage
                setData({
                    ...parsed.data,
                    documents: initialData.documents,
                });
                setCurrentStep(parsed.currentStep || 1);
            } catch (e) {
                console.error('Failed to parse onboarding data:', e);
            }
        }
    }, []);

    // Save to localStorage on change
    useEffect(() => {
        const toSave = {
            data: {
                ...data,
                documents: {}, // Don't save file objects
            },
            currentStep,
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
    }, [data, currentStep]);

    const updateData = (updates: Partial<OnboardingData>) => {
        setData((prev) => ({ ...prev, ...updates }));
    };

    const nextStep = () => {
        if (currentStep < totalSteps) {
            setCurrentStep(currentStep + 1);
        }
    };

    const prevStep = () => {
        if (currentStep > 1) {
            setCurrentStep(currentStep - 1);
        }
    };

    const goToStep = (step: number) => {
        if (step >= 1 && step <= totalSteps) {
            setCurrentStep(step);
        }
    };

    const isStepValid = (step: number): boolean => {
        switch (step) {
            case 1:
                return data.accountType !== '' && data.agreedToTerms && data.agreedToResearchUse;
            case 2:
                return (
                    data.legalBusinessName.trim() !== '' &&
                    data.businessType !== '' &&
                    data.ein.trim() !== '' &&
                    data.businessPhone.trim() !== ''
                );
            case 3:
                return (
                    data.businessAddress.street1.trim() !== '' &&
                    data.businessAddress.city.trim() !== '' &&
                    data.businessAddress.state.trim() !== '' &&
                    data.businessAddress.zip.trim() !== ''
                );
            case 4:
                return (
                    data.contactFirstName.trim() !== '' &&
                    data.contactLastName.trim() !== '' &&
                    data.contactTitle.trim() !== '' &&
                    data.contactPhone.trim() !== ''
                );
            case 5:
                // At minimum, business license is required
                return data.documentStatus.businessLicense === 'uploaded';
            case 6:
                // Agreement must be signed
                return data.agreementSignature !== '';
            case 7:
                return (
                    data.acknowledgeResearchOnly &&
                    data.acknowledgeNoHumanConsumption &&
                    data.acknowledgeCompliance
                );
            default:
                return false;
        }
    };

    const resetOnboarding = () => {
        setData(initialData);
        setCurrentStep(1);
        localStorage.removeItem(STORAGE_KEY);
    };

    return (
        <OnboardingContext.Provider
            value={{
                data,
                currentStep,
                totalSteps,
                updateData,
                nextStep,
                prevStep,
                goToStep,
                isStepValid,
                resetOnboarding,
            }}
        >
            {children}
        </OnboardingContext.Provider>
    );
}

export function useOnboarding() {
    const context = useContext(OnboardingContext);
    if (!context) {
        throw new Error('useOnboarding must be used within OnboardingProvider');
    }
    return context;
}
