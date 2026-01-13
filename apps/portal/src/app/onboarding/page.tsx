'use client';

import { useRouter } from 'next/navigation';
import { useOnboarding } from '@/hooks/use-onboarding';
import { OnboardingProgress } from '@/components/onboarding/onboarding-progress';
import { Card, CardContent } from '@/components/ui/card';

// Step components
import Step1Welcome from './steps/step-1';
import Step2Business from './steps/step-2';
import Step3Address from './steps/step-3';
import Step4Contact from './steps/step-4';
import Step5Documents from './steps/step-5';
import Step6Review from './steps/step-6';

const steps = [
    { title: 'Welcome', description: 'Account type' },
    { title: 'Business', description: 'Company info' },
    { title: 'Address', description: 'Locations' },
    { title: 'Contact', description: 'Representative' },
    { title: 'Documents', description: 'Verification' },
    { title: 'Review', description: 'Submit' },
];

export default function OnboardingPage() {
    const router = useRouter();
    const { currentStep, totalSteps, nextStep, prevStep, isStepValid } = useOnboarding();

    const handleNext = () => {
        if (currentStep === totalSteps) {
            // Submit the application
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
                return <Step2Business onNext={handleNext} onPrev={prevStep} />;
            case 3:
                return <Step3Address onNext={handleNext} onPrev={prevStep} />;
            case 4:
                return <Step4Contact onNext={handleNext} onPrev={prevStep} />;
            case 5:
                return <Step5Documents onNext={handleNext} onPrev={prevStep} />;
            case 6:
                return <Step6Review onNext={handleNext} onPrev={prevStep} />;
            default:
                return <Step1Welcome onNext={handleNext} onPrev={prevStep} />;
        }
    };

    return (
        <div className="px-4 pb-12">
            <div className="max-w-5xl mx-auto flex gap-8">
                {/* Progress sidebar */}
                <OnboardingProgress
                    currentStep={currentStep}
                    totalSteps={totalSteps}
                    steps={steps}
                />

                {/* Step content */}
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
