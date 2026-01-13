'use client';

import { MapPin } from 'lucide-react';
import { Input } from '@/components/ui/input';

interface BillingAddressData {
    billingName: string;
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
}

interface StepBillingAddressProps {
    data: BillingAddressData;
    companyName: string;
    onChange: (data: BillingAddressData) => void;
    errors: Record<string, string>;
}

const US_STATES = [
    'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
    'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
    'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
    'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
    'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'
];

export default function StepBillingAddress({ data, companyName, onChange, errors }: StepBillingAddressProps) {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        onChange({ ...data, [e.target.name]: e.target.value });
    };

    return (
        <div className="space-y-4">
            <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 text-sm">
                <strong>Important:</strong> Billing information must match the credit card holder and business entity.
            </div>

            <div className="space-y-2">
                <label className="text-sm font-medium text-white/80">Billing Name (as appears on card)</label>
                <Input
                    type="text"
                    name="billingName"
                    placeholder={companyName || "Company or Cardholder Name"}
                    value={data.billingName}
                    onChange={handleChange}
                    required
                    className="bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-violet-500"
                />
                {errors.billingName && (
                    <p className="text-red-400 text-xs">{errors.billingName}</p>
                )}
            </div>

            <div className="space-y-2">
                <label className="text-sm font-medium text-white/80">Street Address</label>
                <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
                    <Input
                        type="text"
                        name="street"
                        placeholder="123 Business Ave, Suite 100"
                        value={data.street}
                        onChange={handleChange}
                        required
                        className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-violet-500"
                    />
                </div>
                {errors.street && (
                    <p className="text-red-400 text-xs">{errors.street}</p>
                )}
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <label className="text-sm font-medium text-white/80">City</label>
                    <Input
                        type="text"
                        name="city"
                        placeholder="Miami"
                        value={data.city}
                        onChange={handleChange}
                        required
                        className="bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-violet-500"
                    />
                    {errors.city && (
                        <p className="text-red-400 text-xs">{errors.city}</p>
                    )}
                </div>
                <div className="space-y-2">
                    <label className="text-sm font-medium text-white/80">State</label>
                    <select
                        name="state"
                        value={data.state}
                        onChange={handleChange}
                        required
                        className="w-full h-10 rounded-md bg-white/5 border border-white/10 text-white px-3 focus:border-violet-500 focus:outline-none"
                    >
                        <option value="" className="bg-slate-900">Select State</option>
                        {US_STATES.map(state => (
                            <option key={state} value={state} className="bg-slate-900">{state}</option>
                        ))}
                    </select>
                    {errors.state && (
                        <p className="text-red-400 text-xs">{errors.state}</p>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <label className="text-sm font-medium text-white/80">ZIP Code</label>
                    <Input
                        type="text"
                        name="zipCode"
                        placeholder="33101"
                        value={data.zipCode}
                        onChange={handleChange}
                        required
                        pattern="[0-9]{5}"
                        maxLength={5}
                        className="bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-violet-500"
                    />
                    {errors.zipCode && (
                        <p className="text-red-400 text-xs">{errors.zipCode}</p>
                    )}
                </div>
                <div className="space-y-2">
                    <label className="text-sm font-medium text-white/80">Country</label>
                    <Input
                        type="text"
                        name="country"
                        value="United States"
                        disabled
                        className="bg-white/5 border-white/10 text-white/60"
                    />
                </div>
            </div>
        </div>
    );
}
