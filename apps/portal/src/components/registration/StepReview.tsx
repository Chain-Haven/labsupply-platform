'use client';

import { Check, Mail, FileText, Building, AlertTriangle, DollarSign } from 'lucide-react';

interface ReviewData {
    companyName: string;
    contactName: string;
    email: string;
    billingName: string;
    street: string;
    city: string;
    state: string;
    zipCode: string;
    billingEmail: string;
    lowBalanceThreshold: string;
    targetBalance: string;
    hasLegalOpinion: boolean;
    legalOpinionFileName: string;
}

interface StepReviewProps {
    data: ReviewData;
    agreedToTerms: boolean;
    onAgreedToTermsChange: (agreed: boolean) => void;
}

export default function StepReview({ data, agreedToTerms, onAgreedToTermsChange }: StepReviewProps) {
    const formatDollars = (val: string) => {
        const num = parseInt(val, 10);
        return isNaN(num) ? '$0' : `$${num.toLocaleString()}`;
    };

    return (
        <div className="space-y-6">
            {/* Summary Sections */}
            <div className="space-y-4">
                {/* Business Info */}
                <div className="p-4 rounded-lg bg-white/5 border border-white/10">
                    <div className="flex items-center gap-2 mb-3">
                        <Building className="w-4 h-4 text-violet-400" />
                        <h4 className="font-medium text-white">Business Information</h4>
                    </div>
                    <div className="space-y-1 text-sm">
                        <p className="text-white/80">{data.companyName}</p>
                        <p className="text-white/60">{data.contactName}</p>
                        <p className="text-white/60">{data.email}</p>
                    </div>
                </div>

                {/* Billing Address */}
                <div className="p-4 rounded-lg bg-white/5 border border-white/10">
                    <div className="flex items-center gap-2 mb-3">
                        <Mail className="w-4 h-4 text-violet-400" />
                        <h4 className="font-medium text-white">Billing Information</h4>
                    </div>
                    <div className="space-y-1 text-sm">
                        <p className="text-white/80">{data.billingName}</p>
                        <p className="text-white/60">{data.street}</p>
                        <p className="text-white/60">{data.city}, {data.state} {data.zipCode}</p>
                    </div>
                </div>

                {/* Invoice Settings */}
                <div className="p-4 rounded-lg bg-white/5 border border-white/10">
                    <div className="flex items-center gap-2 mb-3">
                        <DollarSign className="w-4 h-4 text-violet-400" />
                        <h4 className="font-medium text-white">Invoicing Settings</h4>
                    </div>
                    <div className="space-y-1 text-sm">
                        <p className="text-white/60">
                            Invoice email: <span className="text-white/80">{data.billingEmail}</span>
                        </p>
                        <p className="text-white/60">
                            Auto-invoice threshold: <span className="text-white/80">{formatDollars(data.lowBalanceThreshold)}</span>
                        </p>
                        <p className="text-white/60">
                            Target balance: <span className="text-white/80">{formatDollars(data.targetBalance)}</span>
                        </p>
                    </div>
                </div>

                {/* Documents */}
                <div className="p-4 rounded-lg bg-white/5 border border-white/10">
                    <div className="flex items-center gap-2 mb-3">
                        <FileText className="w-4 h-4 text-violet-400" />
                        <h4 className="font-medium text-white">Documents</h4>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                        {data.hasLegalOpinion ? (
                            <>
                                <Check className="w-4 h-4 text-green-400" />
                                <span className="text-white/80">{data.legalOpinionFileName}</span>
                            </>
                        ) : (
                            <>
                                <AlertTriangle className="w-4 h-4 text-amber-400" />
                                <span className="text-amber-400">No legal opinion letter uploaded</span>
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* Billing Terms */}
            <div className="p-4 rounded-lg bg-violet-500/10 border border-violet-500/20">
                <h4 className="font-semibold text-white mb-3">Billing Terms</h4>
                <ul className="space-y-2 text-sm text-white/80">
                    <li className="flex items-start gap-2">
                        <Check className="w-4 h-4 text-violet-400 mt-0.5 shrink-0" />
                        <span><strong>Mercury invoicing</strong> - Invoices sent via email with ACH payment links</span>
                    </li>
                    <li className="flex items-start gap-2">
                        <Check className="w-4 h-4 text-violet-400 mt-0.5 shrink-0" />
                        <span><strong>Auto-invoicing</strong> - Invoiced when balance drops below {formatDollars(data.lowBalanceThreshold)}</span>
                    </li>
                    <li className="flex items-start gap-2">
                        <Check className="w-4 h-4 text-violet-400 mt-0.5 shrink-0" />
                        <span><strong>$500 compliance reserve</strong> maintained at all times (not available for orders)</span>
                    </li>
                    <li className="flex items-start gap-2">
                        <Check className="w-4 h-4 text-violet-400 mt-0.5 shrink-0" />
                        <span><strong>Settled funds only</strong> - Only paid and settled invoice amounts can be used for orders</span>
                    </li>
                </ul>
            </div>

            {/* KYB Notice */}
            <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/20">
                <div className="flex items-start gap-2">
                    <AlertTriangle className="w-5 h-5 text-amber-400 mt-0.5 shrink-0" />
                    <div>
                        <h4 className="font-semibold text-amber-400">KYB Verification Required</h4>
                        <p className="text-sm text-amber-300/80 mt-1">
                            Your account will be pending KYB (Know Your Business) verification.
                            <strong> You will not be able to ship orders until an admin approves your account.</strong>
                        </p>
                    </div>
                </div>
            </div>

            {/* Terms Agreement */}
            <div className="flex items-start gap-3 p-4 rounded-lg bg-white/5 border border-white/10">
                <input
                    type="checkbox"
                    id="terms"
                    checked={agreedToTerms}
                    onChange={(e) => onAgreedToTermsChange(e.target.checked)}
                    className="mt-1 h-4 w-4 rounded border-white/20 bg-white/5 text-violet-600 focus:ring-violet-500"
                />
                <label htmlFor="terms" className="text-sm text-white/80">
                    I agree to the{' '}
                    <a href="/terms" className="text-violet-400 hover:text-violet-300" target="_blank">
                        Terms of Service
                    </a>
                    {' '}and{' '}
                    <a href="/privacy" className="text-violet-400 hover:text-violet-300" target="_blank">
                        Privacy Policy
                    </a>
                    . I understand that a $500 compliance reserve is required and that I will be invoiced
                    via Mercury when my balance falls below my configured threshold.
                    I confirm that all products are for research use only.
                </label>
            </div>
        </div>
    );
}
