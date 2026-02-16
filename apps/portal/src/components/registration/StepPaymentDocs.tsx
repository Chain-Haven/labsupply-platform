'use client';

import { Mail, DollarSign, Info } from 'lucide-react';
import { Input } from '@/components/ui/input';

interface PaymentDocsData {
    billingEmail: string;
    lowBalanceThreshold: string;
    targetBalance: string;
}

interface StepPaymentDocsProps {
    data: PaymentDocsData;
    onChange: (data: PaymentDocsData) => void;
    errors: Record<string, string>;
}

const THRESHOLD_PRESETS = [
    { label: '$500', value: '500' },
    { label: '$1,000', value: '1000' },
    { label: '$2,500', value: '2500' },
    { label: '$5,000', value: '5000' },
];

const TARGET_PRESETS = [
    { label: '$1,000', value: '1000' },
    { label: '$3,000', value: '3000' },
    { label: '$5,000', value: '5000' },
    { label: '$10,000', value: '10000' },
];

export default function StepPaymentDocs({ data, onChange, errors }: StepPaymentDocsProps) {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        onChange({ ...data, [name]: value });
    };

    const handlePresetClick = (field: 'lowBalanceThreshold' | 'targetBalance', value: string) => {
        onChange({ ...data, [field]: value });
    };

    return (
        <div className="space-y-6">
            {/* Info Banner */}
            <div className="p-4 rounded-lg bg-violet-500/10 border border-violet-500/20 text-violet-300 text-sm">
                <div className="flex gap-3">
                    <Info className="w-5 h-5 flex-shrink-0 mt-0.5" />
                    <div>
                        <p className="font-medium mb-1">How billing works</p>
                        <p className="text-violet-300/80">
                            You&apos;ll receive invoices from Mercury when your wallet balance drops
                            below your configured threshold. Pay via ACH for seamless funding.
                            Funds become available once payment settles into our account.
                        </p>
                    </div>
                </div>
            </div>

            {/* Billing Email */}
            <div className="space-y-4">
                <div className="flex items-center gap-2 text-white">
                    <Mail className="w-5 h-5 text-violet-400" />
                    <h3 className="font-semibold">Billing Email</h3>
                </div>
                <p className="text-white/60 text-sm">
                    Invoices will be sent to this email address. You can pay directly from the invoice link.
                </p>

                <div className="space-y-2">
                    <label className="text-sm font-medium text-white/80">Invoice Email Address</label>
                    <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
                        <Input
                            type="email"
                            name="billingEmail"
                            placeholder="billing@yourcompany.com"
                            value={data.billingEmail}
                            onChange={handleChange}
                            required
                            className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-violet-500"
                        />
                    </div>
                    {errors.billingEmail && (
                        <p className="text-red-400 text-xs">{errors.billingEmail}</p>
                    )}
                </div>
            </div>

            {/* Low Balance Threshold */}
            <div className="space-y-4">
                <div className="flex items-center gap-2 text-white">
                    <DollarSign className="w-5 h-5 text-violet-400" />
                    <h3 className="font-semibold">Auto-Invoice Threshold</h3>
                </div>
                <p className="text-white/60 text-sm">
                    We&apos;ll send you an invoice when your available balance drops below this amount.
                </p>

                <div className="flex flex-wrap gap-2 mb-2">
                    {THRESHOLD_PRESETS.map((preset) => (
                        <button
                            key={preset.value}
                            type="button"
                            onClick={() => handlePresetClick('lowBalanceThreshold', preset.value)}
                            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                                data.lowBalanceThreshold === preset.value
                                    ? 'bg-violet-600 text-white'
                                    : 'bg-white/10 text-white/60 hover:bg-white/20'
                            }`}
                        >
                            {preset.label}
                        </button>
                    ))}
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-medium text-white/80">Custom Amount ($)</label>
                    <div className="relative">
                        <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
                        <Input
                            type="number"
                            name="lowBalanceThreshold"
                            placeholder="1000"
                            min="100"
                            value={data.lowBalanceThreshold}
                            onChange={handleChange}
                            required
                            className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-violet-500 font-mono"
                        />
                    </div>
                    {errors.lowBalanceThreshold && (
                        <p className="text-red-400 text-xs">{errors.lowBalanceThreshold}</p>
                    )}
                </div>
            </div>

            {/* Target Balance */}
            <div className="space-y-4">
                <div className="flex items-center gap-2 text-white">
                    <DollarSign className="w-5 h-5 text-violet-400" />
                    <h3 className="font-semibold">Target Balance</h3>
                </div>
                <p className="text-white/60 text-sm">
                    When invoiced, the amount will be calculated to bring your balance up to this target.
                </p>

                <div className="flex flex-wrap gap-2 mb-2">
                    {TARGET_PRESETS.map((preset) => (
                        <button
                            key={preset.value}
                            type="button"
                            onClick={() => handlePresetClick('targetBalance', preset.value)}
                            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                                data.targetBalance === preset.value
                                    ? 'bg-violet-600 text-white'
                                    : 'bg-white/10 text-white/60 hover:bg-white/20'
                            }`}
                        >
                            {preset.label}
                        </button>
                    ))}
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-medium text-white/80">Custom Amount ($)</label>
                    <div className="relative">
                        <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
                        <Input
                            type="number"
                            name="targetBalance"
                            placeholder="3000"
                            min="100"
                            value={data.targetBalance}
                            onChange={handleChange}
                            required
                            className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-violet-500 font-mono"
                        />
                    </div>
                    {errors.targetBalance && (
                        <p className="text-red-400 text-xs">{errors.targetBalance}</p>
                    )}
                </div>
            </div>

            {/* Reserve Notice */}
            <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 text-sm">
                <strong>Note:</strong> A mandatory $500 compliance reserve is maintained at all times.
                This reserve cannot be used for orders and is separate from your available balance.
            </div>
        </div>
    );
}
