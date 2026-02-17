'use client';

import { useRef, useState, useCallback, useEffect } from 'react';
import { useOnboarding } from '@/hooks/use-onboarding';
import { StepNavigation } from '@/components/onboarding/step-navigation';
import { SignaturePad } from '@/components/onboarding/signature-pad';
import {
  TERMS_OF_SERVICE_SECTIONS,
  PRIVACY_POLICY_SECTIONS,
  COMPANY,
  EFFECTIVE_DATE,
} from '@/lib/legal-documents';
import { FileText, Shield, AlertTriangle, CheckCircle, Loader2 } from 'lucide-react';

interface StepProps {
  onNext: () => void;
  onPrev: () => void;
}

export default function Step6Agreement({ onNext, onPrev }: StepProps) {
  const { data, updateData, currentStep, totalSteps, isStepValid } = useOnboarding();
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [isSigning, setIsSigning] = useState(false);
  const [signError, setSignError] = useState('');

  const handleScroll = useCallback(() => {
    const el = scrollContainerRef.current;
    if (!el) return;

    const { scrollTop, scrollHeight, clientHeight } = el;
    const progress = Math.min(scrollTop / (scrollHeight - clientHeight), 1);
    setScrollProgress(progress);

    if (scrollHeight - scrollTop - clientHeight < 50) {
      setHasScrolledToBottom(true);
    }
  }, []);

  useEffect(() => {
    const el = scrollContainerRef.current;
    if (el) {
      el.addEventListener('scroll', handleScroll, { passive: true });
      handleScroll();
      return () => el.removeEventListener('scroll', handleScroll);
    }
  }, [handleScroll]);

  const handleSignatureChange = useCallback(
    (dataUrl: string) => {
      updateData({ agreementSignature: dataUrl });
      setSignError('');
    },
    [updateData]
  );

  const handleSignAndContinue = async () => {
    if (!data.agreementSignature) {
      setSignError('Please draw your signature before continuing.');
      return;
    }

    setIsSigning(true);
    setSignError('');

    try {
      const res = await fetch('/api/v1/onboarding/sign-agreement', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          signatureDataUrl: data.agreementSignature,
          merchantName:
            data.legalBusinessName || `${data.contactFirstName} ${data.contactLastName}`,
          merchantEmail: data.contactEmail,
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || 'Failed to process agreement. Please try again.');
      }

      updateData({ agreementSignedAt: new Date().toISOString() });
      onNext();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'An unexpected error occurred.';
      setSignError(message);
    } finally {
      setIsSigning(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Merchant Agreement &amp; Privacy Policy
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          Please read the entire agreement below, then sign at the bottom.
          A signed copy will be emailed to you and to {COMPANY.email}.
        </p>
      </div>

      {/* Scroll Progress Bar */}
      <div className="space-y-1">
        <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
          <span className="flex items-center gap-1">
            <FileText className="w-3 h-3" />
            Agreement Document
          </span>
          <span>{Math.round(scrollProgress * 100)}% read</span>
        </div>
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
          <div
            className="bg-gradient-to-r from-violet-600 to-indigo-600 h-1.5 rounded-full transition-all duration-300"
            style={{ width: `${scrollProgress * 100}%` }}
          />
        </div>
      </div>

      {/* Scrollable Legal Document */}
      <div
        ref={scrollContainerRef}
        className="border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800/50 overflow-y-auto"
        style={{ maxHeight: '500px' }}
      >
        <div className="px-6 py-6 space-y-8">
          {/* --- Terms of Service --- */}
          <div className="flex items-center gap-2 pb-3 border-b border-gray-300 dark:border-gray-600">
            <Shield className="w-5 h-5 text-violet-600" />
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">
              Terms of Service &amp; Merchant Agreement
            </h2>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {COMPANY.name} &mdash; Effective {EFFECTIVE_DATE}
          </p>

          {TERMS_OF_SERVICE_SECTIONS.map((section, idx) => (
            <section key={`tos-${idx}`}>
              <h3 className="text-sm font-bold text-gray-800 dark:text-gray-200 mb-2 uppercase tracking-wide">
                {section.title}
              </h3>
              <div className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
                {section.content}
              </div>
            </section>
          ))}

          {/* --- Privacy Policy --- */}
          <div className="flex items-center gap-2 pb-3 pt-6 border-b border-gray-300 dark:border-gray-600 border-t">
            <Shield className="w-5 h-5 text-violet-600" />
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">
              Privacy Policy
            </h2>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {COMPANY.name} &mdash; Effective {EFFECTIVE_DATE}
          </p>

          {PRIVACY_POLICY_SECTIONS.map((section, idx) => (
            <section key={`pp-${idx}`}>
              <h3 className="text-sm font-bold text-gray-800 dark:text-gray-200 mb-2 uppercase tracking-wide">
                {section.title}
              </h3>
              <div className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
                {section.content}
              </div>
            </section>
          ))}

          {/* End of document marker */}
          <div className="text-center py-4 border-t border-gray-300 dark:border-gray-600">
            <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">
              — End of Agreement Document —
            </p>
          </div>
        </div>
      </div>

      {/* Scroll Reminder */}
      {!hasScrolledToBottom && (
        <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 flex items-start gap-3">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <p className="text-sm text-amber-700 dark:text-amber-300">
            Please scroll through the entire agreement to enable the signature pad.
          </p>
        </div>
      )}

      {hasScrolledToBottom && !data.agreementSignature && (
        <div className="p-3 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 flex items-start gap-3">
          <CheckCircle className="w-4 h-4 text-green-600 shrink-0 mt-0.5" />
          <p className="text-sm text-green-700 dark:text-green-300">
            You have read the entire agreement. Please draw your signature below to proceed.
          </p>
        </div>
      )}

      {/* Signature Pad */}
      <SignaturePad
        onSignatureChange={handleSignatureChange}
        disabled={!hasScrolledToBottom}
      />

      {/* Error Message */}
      {signError && (
        <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
          <p className="text-sm text-red-700 dark:text-red-300">{signError}</p>
        </div>
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between pt-6 border-t border-gray-200 dark:border-gray-700">
        <button
          type="button"
          onClick={onPrev}
          disabled={isSigning}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
        >
          Back
        </button>

        <button
          type="button"
          onClick={handleSignAndContinue}
          disabled={!isStepValid(6) || isSigning}
          className="inline-flex items-center gap-2 px-6 py-2 text-sm font-medium text-white bg-gradient-to-r from-violet-600 to-indigo-600 rounded-md hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSigning ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Processing Agreement...
            </>
          ) : (
            'Sign & Continue'
          )}
        </button>
      </div>
    </div>
  );
}
