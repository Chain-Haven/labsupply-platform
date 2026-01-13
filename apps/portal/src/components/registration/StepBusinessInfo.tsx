'use client';

import { Building, User } from 'lucide-react';
import { Input } from '@/components/ui/input';

interface BusinessInfoData {
    companyName: string;
    contactName: string;
    email: string;
    password: string;
    confirmPassword: string;
}

interface StepBusinessInfoProps {
    data: BusinessInfoData;
    onChange: (data: BusinessInfoData) => void;
    errors: Record<string, string>;
}

export default function StepBusinessInfo({ data, onChange, errors }: StepBusinessInfoProps) {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        onChange({ ...data, [e.target.name]: e.target.value });
    };

    return (
        <div className="space-y-4">
            <div className="space-y-2">
                <label className="text-sm font-medium text-white/80">Company Name (Legal Entity)</label>
                <div className="relative">
                    <Building className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
                    <Input
                        type="text"
                        name="companyName"
                        placeholder="Your Research Company LLC"
                        value={data.companyName}
                        onChange={handleChange}
                        required
                        className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-violet-500"
                    />
                </div>
                {errors.companyName && (
                    <p className="text-red-400 text-xs">{errors.companyName}</p>
                )}
                <p className="text-white/40 text-xs">
                    This must match the name on your credit card billing statement.
                </p>
            </div>

            <div className="space-y-2">
                <label className="text-sm font-medium text-white/80">Contact Name</label>
                <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
                    <Input
                        type="text"
                        name="contactName"
                        placeholder="John Doe"
                        value={data.contactName}
                        onChange={handleChange}
                        required
                        className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-violet-500"
                    />
                </div>
                {errors.contactName && (
                    <p className="text-red-400 text-xs">{errors.contactName}</p>
                )}
            </div>

            <div className="space-y-2">
                <label className="text-sm font-medium text-white/80">Email</label>
                <Input
                    type="email"
                    name="email"
                    placeholder="you@company.com"
                    value={data.email}
                    onChange={handleChange}
                    required
                    className="bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-violet-500"
                />
                {errors.email && (
                    <p className="text-red-400 text-xs">{errors.email}</p>
                )}
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <label className="text-sm font-medium text-white/80">Password</label>
                    <Input
                        type="password"
                        name="password"
                        placeholder="••••••••"
                        value={data.password}
                        onChange={handleChange}
                        required
                        minLength={8}
                        className="bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-violet-500"
                    />
                    {errors.password && (
                        <p className="text-red-400 text-xs">{errors.password}</p>
                    )}
                </div>
                <div className="space-y-2">
                    <label className="text-sm font-medium text-white/80">Confirm</label>
                    <Input
                        type="password"
                        name="confirmPassword"
                        placeholder="••••••••"
                        value={data.confirmPassword}
                        onChange={handleChange}
                        required
                        className="bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-violet-500"
                    />
                    {errors.confirmPassword && (
                        <p className="text-red-400 text-xs">{errors.confirmPassword}</p>
                    )}
                </div>
            </div>
        </div>
    );
}
