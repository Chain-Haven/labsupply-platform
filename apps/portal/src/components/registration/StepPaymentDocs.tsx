'use client';

import { CreditCard } from 'lucide-react';
import { Input } from '@/components/ui/input';

interface PaymentDocsData {
    cardNumber: string;
    cardExpiry: string;
    cardCvc: string;
    cardName: string;
}

interface StepPaymentDocsProps {
    data: PaymentDocsData;
    onChange: (data: PaymentDocsData) => void;
    errors: Record<string, string>;
}

export default function StepPaymentDocs({ data, onChange, errors }: StepPaymentDocsProps) {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        let value = e.target.value;
        const name = e.target.name;

        // Format card number with spaces
        if (name === 'cardNumber') {
            value = value.replace(/\D/g, '').slice(0, 16);
            value = value.replace(/(\d{4})/g, '$1 ').trim();
        }

        // Format expiry as MM/YY
        if (name === 'cardExpiry') {
            value = value.replace(/\D/g, '').slice(0, 4);
            if (value.length >= 2) {
                value = value.slice(0, 2) + '/' + value.slice(2);
            }
        }

        // Limit CVC to 4 digits
        if (name === 'cardCvc') {
            value = value.replace(/\D/g, '').slice(0, 4);
        }

        onChange({ ...data, [name]: value });
    };

    return (
        <div className="space-y-6">
            {/* Credit Card Section */}
            <div className="space-y-4">
                <div className="flex items-center gap-2 text-white">
                    <CreditCard className="w-5 h-5 text-violet-400" />
                    <h3 className="font-semibold">Payment Information</h3>
                </div>
                <p className="text-white/60 text-sm">
                    Your card will be charged $199.99/month after a 14-day free trial.
                    A $500 reserve hold will also be placed on your card.
                </p>

                <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 text-sm">
                    <strong>Note:</strong> The billing name must match your business entity name.
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-medium text-white/80">Name on Card</label>
                    <Input
                        type="text"
                        name="cardName"
                        placeholder="Company Name or Cardholder"
                        value={data.cardName}
                        onChange={handleChange}
                        required
                        className="bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-violet-500"
                    />
                    {errors.cardName && (
                        <p className="text-red-400 text-xs">{errors.cardName}</p>
                    )}
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-medium text-white/80">Card Number</label>
                    <div className="relative">
                        <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
                        <Input
                            type="text"
                            name="cardNumber"
                            placeholder="1234 5678 9012 3456"
                            value={data.cardNumber}
                            onChange={handleChange}
                            required
                            className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-violet-500 font-mono"
                        />
                    </div>
                    {errors.cardNumber && (
                        <p className="text-red-400 text-xs">{errors.cardNumber}</p>
                    )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-white/80">Expiry Date</label>
                        <Input
                            type="text"
                            name="cardExpiry"
                            placeholder="MM/YY"
                            value={data.cardExpiry}
                            onChange={handleChange}
                            required
                            className="bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-violet-500 font-mono"
                        />
                        {errors.cardExpiry && (
                            <p className="text-red-400 text-xs">{errors.cardExpiry}</p>
                        )}
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-white/80">CVC</label>
                        <Input
                            type="text"
                            name="cardCvc"
                            placeholder="123"
                            value={data.cardCvc}
                            onChange={handleChange}
                            required
                            className="bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-violet-500 font-mono"
                        />
                        {errors.cardCvc && (
                            <p className="text-red-400 text-xs">{errors.cardCvc}</p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
