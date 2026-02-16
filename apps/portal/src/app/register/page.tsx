'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Package, ArrowRight, ArrowLeft, Loader2, Check, Building, MapPin, Mail, FileText, Shield, FileCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useMerchantAuth } from '@/lib/merchant-auth';
import { StepBusinessInfo, StepBillingAddress, StepPaymentDocs, StepKYBDocs, StepRUOCompliance, StepReview } from '@/components/registration';

const STEPS = [
    { id: 1, name: 'Business', icon: Building },
    { id: 2, name: 'Billing', icon: MapPin },
    { id: 3, name: 'Billing', icon: Mail },
    { id: 4, name: 'KYB Docs', icon: FileText },
    { id: 5, name: 'Compliance', icon: Shield },
    { id: 6, name: 'Review', icon: FileCheck },
];

export default function RegisterPage() {
    const router = useRouter();
    const { register } = useMerchantAuth();
    const [currentStep, setCurrentStep] = useState(1);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    const [agreedToTerms, setAgreedToTerms] = useState(false);

    // Form data for all steps
    const [businessInfo, setBusinessInfo] = useState({
        companyName: '',
        contactName: '',
        email: '',
        password: '',
        confirmPassword: '',
    });

    const [billingAddress, setBillingAddress] = useState({
        billingName: '',
        street: '',
        city: '',
        state: '',
        zipCode: '',
        country: 'USA',
    });

    const [paymentDocs, setPaymentDocs] = useState({
        billingEmail: '',
        lowBalanceThreshold: '1000',
        targetBalance: '3000',
    });

    const [kybDocs, setKybDocs] = useState({
        ownerIdDoc: { file: null as File | null, name: '' },
        articlesOfOrg: { file: null as File | null, name: '' },
        einDoc: { file: null as File | null, name: '' },
        voidedCheck: { file: null as File | null, name: '' },
        legalOpinionLetter: { file: null as File | null, name: '' },
        website: '',
        phone: '',
    });

    const [ruoCompliance, setRuoCompliance] = useState({
        labelingCompliant: false,
        noMedicalClaims: false,
        researchOnly: false,
        websiteCompliant: false,
        recordKeeping: false,
        qualifiedPurchasers: false,
        acknowledgeEnforcement: false,
    });

    const [errors, setErrors] = useState<Record<string, string>>({});

    const validateStep = (step: number): boolean => {
        const newErrors: Record<string, string> = {};

        if (step === 1) {
            if (!businessInfo.companyName) newErrors.companyName = 'Company name is required';
            if (!businessInfo.contactName) newErrors.contactName = 'Contact name is required';
            if (!businessInfo.email) newErrors.email = 'Email is required';
            if (!businessInfo.password) newErrors.password = 'Password is required';
            if (businessInfo.password.length < 8) newErrors.password = 'Password must be at least 8 characters';
            if (businessInfo.password !== businessInfo.confirmPassword) {
                newErrors.confirmPassword = 'Passwords do not match';
            }
        }

        if (step === 2) {
            if (!billingAddress.billingName) newErrors.billingName = 'Billing name is required';
            if (!billingAddress.street) newErrors.street = 'Street address is required';
            if (!billingAddress.city) newErrors.city = 'City is required';
            if (!billingAddress.state) newErrors.state = 'State is required';
            if (!billingAddress.zipCode) newErrors.zipCode = 'ZIP code is required';
            if (billingAddress.zipCode && !/^\d{5}$/.test(billingAddress.zipCode)) {
                newErrors.zipCode = 'Invalid ZIP code';
            }
        }

        if (step === 3) {
            if (!paymentDocs.billingEmail) {
                newErrors.billingEmail = 'Billing email is required';
            } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(paymentDocs.billingEmail)) {
                newErrors.billingEmail = 'Invalid email address';
            }
            const threshold = parseInt(paymentDocs.lowBalanceThreshold, 10);
            const target = parseInt(paymentDocs.targetBalance, 10);
            if (!threshold || threshold < 100) {
                newErrors.lowBalanceThreshold = 'Threshold must be at least $100';
            }
            if (!target || target < 100) {
                newErrors.targetBalance = 'Target balance must be at least $100';
            }
            if (threshold && target && target < threshold) {
                newErrors.targetBalance = 'Target balance must be at least equal to the threshold';
            }
        }

        if (step === 4) {
            if (!kybDocs.phone) newErrors.phone = 'Business phone is required';
            if (!kybDocs.ownerIdDoc.file) newErrors.ownerIdDoc = 'Owner ID is required';
            if (!kybDocs.articlesOfOrg.file) newErrors.articlesOfOrg = 'Articles of Organization is required';
            if (!kybDocs.einDoc.file) newErrors.einDoc = 'EIN document is required';
            if (!kybDocs.voidedCheck.file) newErrors.voidedCheck = 'Voided check or bank letter is required';
            if (!kybDocs.legalOpinionLetter.file) newErrors.legalOpinionLetter = 'Legal opinion letter is required';
            if (Object.keys(newErrors).length > 0) newErrors.documents = 'Please upload all required documents';
        }

        if (step === 5) {
            const allChecked = ruoCompliance.labelingCompliant &&
                ruoCompliance.noMedicalClaims &&
                ruoCompliance.researchOnly &&
                ruoCompliance.websiteCompliant &&
                ruoCompliance.recordKeeping &&
                ruoCompliance.qualifiedPurchasers &&
                ruoCompliance.acknowledgeEnforcement;
            if (!allChecked) {
                newErrors.ruoCompliance = 'You must confirm all compliance requirements';
            }
        }

        if (step === 6) {
            if (!agreedToTerms) {
                newErrors.terms = 'You must agree to the terms';
            }
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleNext = () => {
        if (validateStep(currentStep)) {
            // Auto-populate billing name from company name if empty
            if (currentStep === 1 && !billingAddress.billingName) {
                setBillingAddress(prev => ({ ...prev, billingName: businessInfo.companyName }));
            }
            // Auto-populate billing email from business email if empty
            if (currentStep === 2 && !paymentDocs.billingEmail) {
                setPaymentDocs(prev => ({ ...prev, billingEmail: businessInfo.email }));
            }
            setCurrentStep(prev => Math.min(prev + 1, 6));
        }
    };

    const handleBack = () => {
        setCurrentStep(prev => Math.max(prev - 1, 1));
        setError('');
    };

    const handleSubmit = async () => {
        if (!validateStep(6)) return;

        setIsLoading(true);
        setError('');

        try {
            // 1. Register the user with Supabase
            const result = await register(businessInfo.email, businessInfo.password, businessInfo.companyName);

            if (!result.success) {
                throw new Error(result.error || 'Registration failed');
            }

            // 2. The merchant-auth hook creates the merchant record.
            // Save billing settings (Mercury customer creation happens server-side
            // during onboarding approval when the merchant becomes ACTIVE).

            setSuccess(true);
            setTimeout(() => {
                router.push('/onboarding/pending');
            }, 2000);

        } catch (err) {
            setError(err instanceof Error ? err.message : 'Registration failed. Please try again.');
            setIsLoading(false);
        }
    };

    if (success) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
                <div className="absolute inset-0 overflow-hidden">
                    <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-violet-500/20 rounded-full blur-3xl" />
                    <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-500/20 rounded-full blur-3xl" />
                </div>
                <Card className="relative border-white/10 bg-white/5 backdrop-blur-xl max-w-md w-full">
                    <CardContent className="pt-8 pb-8 text-center">
                        <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
                            <Check className="w-8 h-8 text-green-400" />
                        </div>
                        <h2 className="text-2xl font-bold text-white mb-2">Account Created!</h2>
                        <p className="text-white/60 mb-4">
                            Your account is pending KYB verification. You'll receive an email once approved.
                        </p>
                        <Loader2 className="w-6 h-6 animate-spin text-violet-400 mx-auto" />
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
            {/* Background effects */}
            <div className="absolute inset-0 overflow-hidden">
                <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-violet-500/20 rounded-full blur-3xl" />
                <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-500/20 rounded-full blur-3xl" />
            </div>

            <div className="relative w-full max-w-xl">
                {/* Logo */}
                <div className="text-center mb-8">
                    <Link href="/" className="inline-flex items-center gap-2">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center">
                            <Package className="w-7 h-7 text-white" />
                        </div>
                        <span className="text-2xl font-bold text-white">LabSupply</span>
                    </Link>
                </div>

                {/* Progress Steps */}
                <div className="flex justify-between mb-8">
                    {STEPS.map((step, index) => {
                        const Icon = step.icon;
                        const isActive = currentStep === step.id;
                        const isCompleted = currentStep > step.id;

                        return (
                            <div key={step.id} className="flex items-center">
                                <div className="flex flex-col items-center">
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${isCompleted ? 'bg-green-500' :
                                        isActive ? 'bg-violet-600' : 'bg-white/10'
                                        }`}>
                                        {isCompleted ? (
                                            <Check className="w-5 h-5 text-white" />
                                        ) : (
                                            <Icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-white/40'}`} />
                                        )}
                                    </div>
                                    <span className={`text-xs mt-2 ${isActive ? 'text-white' : 'text-white/40'}`}>
                                        {step.name}
                                    </span>
                                </div>
                                {index < STEPS.length - 1 && (
                                    <div className={`w-12 h-0.5 mx-2 ${isCompleted ? 'bg-green-500' : 'bg-white/10'
                                        }`} />
                                )}
                            </div>
                        );
                    })}
                </div>

                {/* Form Card */}
                <Card className="border-white/10 bg-white/5 backdrop-blur-xl">
                    <CardHeader className="text-center">
                        <CardTitle className="text-2xl text-white">
                            {currentStep === 1 && 'Business Information'}
                            {currentStep === 2 && 'Billing Address'}
                            {currentStep === 3 && 'Billing Setup'}
                            {currentStep === 4 && 'KYB Documents'}
                            {currentStep === 5 && 'RUO Compliance'}
                            {currentStep === 6 && 'Review & Submit'}
                        </CardTitle>
                        <CardDescription className="text-white/60">
                            {currentStep === 1 && 'Tell us about your research business'}
                            {currentStep === 2 && 'Enter your billing address'}
                            {currentStep === 3 && 'Configure invoicing and funding preferences'}
                            {currentStep === 4 && 'Upload required verification documents'}
                            {currentStep === 5 && 'Confirm regulatory compliance requirements'}
                            {currentStep === 6 && 'Review your information and subscription terms'}
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {error && (
                            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                                {error}
                            </div>
                        )}

                        {/* Step Content */}
                        {currentStep === 1 && (
                            <StepBusinessInfo
                                data={businessInfo}
                                onChange={setBusinessInfo}
                                errors={errors}
                            />
                        )}

                        {currentStep === 2 && (
                            <StepBillingAddress
                                data={billingAddress}
                                companyName={businessInfo.companyName}
                                onChange={setBillingAddress}
                                errors={errors}
                            />
                        )}

                        {currentStep === 3 && (
                            <StepPaymentDocs
                                data={paymentDocs}
                                onChange={setPaymentDocs}
                                errors={errors}
                            />
                        )}

                        {currentStep === 4 && (
                            <StepKYBDocs
                                data={kybDocs}
                                onChange={setKybDocs}
                                errors={errors}
                            />
                        )}

                        {currentStep === 5 && (
                            <StepRUOCompliance
                                data={ruoCompliance}
                                onChange={setRuoCompliance}
                                errors={errors}
                            />
                        )}

                        {currentStep === 6 && (
                            <StepReview
                                data={{
                                    companyName: businessInfo.companyName,
                                    contactName: businessInfo.contactName,
                                    email: businessInfo.email,
                                    billingName: billingAddress.billingName,
                                    street: billingAddress.street,
                                    city: billingAddress.city,
                                    state: billingAddress.state,
                                    zipCode: billingAddress.zipCode,
                                    billingEmail: paymentDocs.billingEmail,
                                    lowBalanceThreshold: paymentDocs.lowBalanceThreshold,
                                    targetBalance: paymentDocs.targetBalance,
                                    hasLegalOpinion: !!kybDocs.legalOpinionLetter.file,
                                    legalOpinionFileName: kybDocs.legalOpinionLetter.name || '',
                                }}
                                agreedToTerms={agreedToTerms}
                                onAgreedToTermsChange={setAgreedToTerms}
                            />
                        )}

                        {/* Navigation Buttons */}
                        <div className="flex gap-3 pt-4">
                            {currentStep > 1 && (
                                <Button
                                    type="button"
                                    variant="ghost"
                                    onClick={handleBack}
                                    disabled={isLoading}
                                    className="flex-1 bg-white/10 border border-white/20 text-white hover:bg-white/20"
                                >
                                    <ArrowLeft className="w-4 h-4 mr-2" />
                                    Back
                                </Button>
                            )}

                            {currentStep < 6 ? (
                                <Button
                                    type="button"
                                    onClick={handleNext}
                                    className="flex-1 bg-gradient-to-r from-violet-600 to-indigo-600 hover:opacity-90"
                                >
                                    Next
                                    <ArrowRight className="w-4 h-4 ml-2" />
                                </Button>
                            ) : (
                                <Button
                                    type="button"
                                    onClick={handleSubmit}
                                    disabled={isLoading || !agreedToTerms}
                                    className="flex-1 bg-gradient-to-r from-violet-600 to-indigo-600 hover:opacity-90"
                                >
                                    {isLoading ? (
                                        <>
                                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                            Creating Account...
                                        </>
                                    ) : (
                                        <>
                                            Create Account
                                            <ArrowRight className="w-4 h-4 ml-2" />
                                        </>
                                    )}
                                </Button>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Footer */}
                <div className="mt-6 text-center">
                    <p className="text-white/60 text-sm">
                        Already have an account?{' '}
                        <Link href="/login" className="text-violet-400 hover:text-violet-300 font-medium">
                            Sign in
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
}
