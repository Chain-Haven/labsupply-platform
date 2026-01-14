'use client';

import { useState, useRef } from 'react';
import { Upload, FileText, Check, X, Phone, Globe, Building2, CreditCard, FileCheck, User } from 'lucide-react';
import { Input } from '@/components/ui/input';

interface KYBDocument {
    file: File | null;
    name: string;
}

interface KYBDocsData {
    ownerIdDoc: KYBDocument;
    articlesOfOrg: KYBDocument;
    einDoc: KYBDocument;
    voidedCheck: KYBDocument;
    legalOpinionLetter: KYBDocument;
    website: string;
    phone: string;
}

interface StepKYBDocsProps {
    data: KYBDocsData;
    onChange: (data: KYBDocsData) => void;
    errors: Record<string, string>;
}

const documentFields = [
    { key: 'ownerIdDoc', label: 'Owner ID (Driver License or Passport)', icon: User, required: true },
    { key: 'articlesOfOrg', label: 'Articles of Organization', icon: Building2, required: true },
    { key: 'einDoc', label: 'EIN Document (IRS Letter)', icon: FileCheck, required: true },
    { key: 'voidedCheck', label: 'Voided Check or Bank Letter', icon: CreditCard, required: true },
    { key: 'legalOpinionLetter', label: 'Legal Opinion Letter', icon: FileText, required: true },
] as const;

export default function StepKYBDocs({ data, onChange, errors }: StepKYBDocsProps) {
    const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

    const handleFileSelect = (key: keyof KYBDocsData, file: File | null) => {
        if (file) {
            // Validate file type
            const validTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
            if (!validTypes.includes(file.type)) {
                alert('Please upload a PDF or image file (JPG, PNG)');
                return;
            }
            // Validate file size (max 10MB)
            if (file.size > 10 * 1024 * 1024) {
                alert('File size must be less than 10MB');
                return;
            }
        }
        onChange({
            ...data,
            [key]: { file, name: file?.name || '' }
        });
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        onChange({ ...data, [e.target.name]: e.target.value });
    };

    return (
        <div className="space-y-6">
            {/* Contact Info */}
            <div className="space-y-4">
                <h3 className="text-white font-semibold flex items-center gap-2">
                    <Phone className="w-5 h-5 text-violet-400" />
                    Business Contact Information
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-white/80">Business Phone</label>
                        <div className="relative">
                            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                            <Input
                                type="tel"
                                name="phone"
                                placeholder="(555) 123-4567"
                                value={data.phone}
                                onChange={handleInputChange}
                                required
                                className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-violet-500"
                            />
                        </div>
                        {errors.phone && <p className="text-red-400 text-xs">{errors.phone}</p>}
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-white/80">Business Website</label>
                        <div className="relative">
                            <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                            <Input
                                type="url"
                                name="website"
                                placeholder="https://yourcompany.com"
                                value={data.website}
                                onChange={handleInputChange}
                                className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-violet-500"
                            />
                        </div>
                        {errors.website && <p className="text-red-400 text-xs">{errors.website}</p>}
                    </div>
                </div>
            </div>

            {/* Document Uploads */}
            <div className="space-y-4">
                <h3 className="text-white font-semibold flex items-center gap-2">
                    <FileText className="w-5 h-5 text-violet-400" />
                    KYB Documents
                </h3>
                <p className="text-white/60 text-sm">
                    Upload the following documents for business verification. All files must be PDF or image format (max 10MB each).
                </p>

                <div className="space-y-3">
                    {documentFields.map(({ key, label, icon: Icon, required }) => {
                        const docData = data[key as keyof KYBDocsData] as KYBDocument;
                        const hasFile = docData?.file;

                        return (
                            <div key={key} className="flex items-center gap-3">
                                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${hasFile ? 'bg-green-500/20' : 'bg-white/5'}`}>
                                    {hasFile ? (
                                        <Check className="w-5 h-5 text-green-400" />
                                    ) : (
                                        <Icon className="w-5 h-5 text-white/40" />
                                    )}
                                </div>
                                <div className="flex-1">
                                    <p className="text-sm text-white">
                                        {label}
                                        {required && <span className="text-red-400">*</span>}
                                    </p>
                                    {hasFile && (
                                        <p className="text-xs text-white/60 truncate">{docData.name}</p>
                                    )}
                                </div>
                                <div className="flex gap-2">
                                    {hasFile && (
                                        <button
                                            type="button"
                                            onClick={() => handleFileSelect(key as keyof KYBDocsData, null)}
                                            className="p-2 text-white/40 hover:text-red-400 transition-colors"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    )}
                                    <button
                                        type="button"
                                        onClick={() => fileInputRefs.current[key]?.click()}
                                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${hasFile
                                                ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                                                : 'bg-violet-500/20 text-violet-400 hover:bg-violet-500/30'
                                            }`}
                                    >
                                        {hasFile ? 'Replace' : 'Upload'}
                                    </button>
                                    <input
                                        ref={(el) => { fileInputRefs.current[key] = el; }}
                                        type="file"
                                        accept=".pdf,.jpg,.jpeg,.png"
                                        onChange={(e) => handleFileSelect(key as keyof KYBDocsData, e.target.files?.[0] || null)}
                                        className="hidden"
                                    />
                                </div>
                            </div>
                        );
                    })}
                </div>

                {errors.documents && (
                    <p className="text-red-400 text-xs">{errors.documents}</p>
                )}
            </div>

            {/* Legal Opinion Letter Help */}
            <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                <p className="text-blue-400 text-sm">
                    Need a Legal Opinion Letter? Contact a Law Firm such as:{' '}
                    <a
                        href="https://floridahealthcarelawfirm.com/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-blue-300 hover:text-blue-200 underline"
                    >
                        Florida Healthcare Law Firm
                        <Globe className="w-3 h-3" />
                    </a>
                </p>
            </div>
        </div>
    );
}
