'use client';

import { useState, useRef } from 'react';
import { CreditCard, Upload, FileText, ExternalLink, X, Check } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface PaymentDocsData {
    cardNumber: string;
    cardExpiry: string;
    cardCvc: string;
    cardName: string;
    legalOpinionFile: File | null;
}

interface StepPaymentDocsProps {
    data: PaymentDocsData;
    onChange: (data: PaymentDocsData) => void;
    errors: Record<string, string>;
}

export default function StepPaymentDocs({ data, onChange, errors }: StepPaymentDocsProps) {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [dragOver, setDragOver] = useState(false);

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

    const handleFileSelect = (file: File | null) => {
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
        onChange({ ...data, legalOpinionFile: file });
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setDragOver(false);
        const file = e.dataTransfer.files[0];
        if (file) handleFileSelect(file);
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

            {/* Legal Opinion Letter Section */}
            <div className="space-y-4 pt-4 border-t border-white/10">
                <div className="flex items-center gap-2 text-white">
                    <FileText className="w-5 h-5 text-violet-400" />
                    <h3 className="font-semibold">Legal Opinion Letter</h3>
                </div>
                <p className="text-white/60 text-sm">
                    Upload a legal opinion letter from a licensed attorney confirming your business operations comply with applicable laws.
                </p>

                <div
                    className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer ${dragOver ? 'border-violet-400 bg-violet-500/10' : 'border-white/20 hover:border-white/40'
                        }`}
                    onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                >
                    {data.legalOpinionFile ? (
                        <div className="flex items-center justify-center gap-3">
                            <Check className="w-5 h-5 text-green-400" />
                            <span className="text-white">{data.legalOpinionFile.name}</span>
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleFileSelect(null);
                                }}
                                className="p-1 hover:bg-white/10 rounded"
                            >
                                <X className="w-4 h-4 text-white/60" />
                            </button>
                        </div>
                    ) : (
                        <>
                            <Upload className="w-8 h-8 text-white/40 mx-auto mb-2" />
                            <p className="text-white/60 text-sm">
                                Drag and drop or click to upload
                            </p>
                            <p className="text-white/40 text-xs mt-1">
                                PDF, JPG, or PNG (max 10MB)
                            </p>
                        </>
                    )}
                </div>
                {errors.legalOpinionFile && (
                    <p className="text-red-400 text-xs">{errors.legalOpinionFile}</p>
                )}

                <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={(e) => handleFileSelect(e.target.files?.[0] || null)}
                    className="hidden"
                />

                <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                    <p className="text-blue-400 text-sm">
                        Need a Legal Opinion? Contact a Law Firm such as:{' '}
                        <a
                            href="https://floridahealthcarelawfirm.com/"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-blue-300 hover:text-blue-200 underline"
                        >
                            Florida Healthcare Law Firm
                            <ExternalLink className="w-3 h-3" />
                        </a>
                    </p>
                </div>
            </div>
        </div>
    );
}
