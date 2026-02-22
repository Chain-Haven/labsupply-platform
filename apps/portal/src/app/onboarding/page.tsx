'use client';

import { useRouter } from 'next/navigation';
import { useOnboarding } from '@/hooks/use-onboarding';
import { OnboardingProgress } from '@/components/onboarding/onboarding-progress';
import { Card, CardContent } from '@/components/ui/card';

// Step components
import Step1Welcome from './steps/step-1';
import Step2Packages from './steps/step-2-packages';
import Step3Business from './steps/step-2';
import Step4Address from './steps/step-3';
import Step5Contact from './steps/step-4';
import Step6Documents from './steps/step-5';
import Step7Agreement from './steps/step-6-agreement';
import Step8Review from './steps/step-7';

const steps = [
    { title: 'Welcome', description: 'Account type' },
    { title: 'Package', description: 'Choose plan' },
    { title: 'Business', description: 'Company info' },
    { title: 'Address', description: 'Locations' },
    { title: 'Contact', description: 'Representative' },
    { title: 'Documents', description: 'Verification' },
    { title: 'Agreement', description: 'Sign' },
    { title: 'Review', description: 'Submit' },
];

export default function OnboardingPage() {
    const router = useRouter();
    const { currentStep, totalSteps, nextStep, prevStep, isStepValid } = useOnboarding();

    const handleNext = () => {
        if (currentStep === totalSteps) {
            router.push('/onboarding/complete');
        } else {
            nextStep();
        }
    };

    const renderStep = () => {
        switch (currentStep) {
            case 1:
                return <Step1Welcome onNext={handleNext} onPrev={prevStep} />;
            case 2:
                return <Step2Packages onNext={handleNext} onPrev={prevStep} />;
            case 3:
                return <Step3Business onNext={handleNext} onPrev={prevStep} />;
            case 4:
                return <Step4Address onNext={handleNext} onPrev={prevStep} />;
            case 5:
                return <Step5Contact onNext={handleNext} onPrev={prevStep} />;
            case 6:
                return <Step6Documents onNext={handleNext} onPrev={prevStep} />;
            case 7:
                return <Step7Agreement onNext={handleNext} onPrev={prevStep} />;
            case 8:
                return <Step8Review onNext={handleNext} onPrev={prevStep} />;
            default:
                return <Step1Welcome onNext={handleNext} onPrev={prevStep} />;
        }
    };

    return (
        <div className="px-4 pb-12">
            <div className="max-w-5xl mx-auto flex gap-8">
                <OnboardingProgress
                    currentStep={currentStep}
                    totalSteps={totalSteps}
                    steps={steps}
                />

                <div className="flex-1 min-w-0">
                    <Card className="bg-white dark:bg-gray-900 border-white/10">
                        <CardContent className="p-6 md:p-8">
                            {renderStep()}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
