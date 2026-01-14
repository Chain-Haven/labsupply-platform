'use client';

import { useState } from 'react';
import { Shield, CheckCircle2, AlertTriangle, ExternalLink, Scale } from 'lucide-react';

interface RUOComplianceData {
    labelingCompliant: boolean;
    noMedicalClaims: boolean;
    researchOnly: boolean;
    websiteCompliant: boolean;
    recordKeeping: boolean;
    qualifiedPurchasers: boolean;
    acknowledgeEnforcement: boolean;
}

interface StepRUOComplianceProps {
    data: RUOComplianceData;
    onChange: (data: RUOComplianceData) => void;
    errors: Record<string, string>;
}

const complianceItems = [
    {
        key: 'labelingCompliant',
        title: 'Product Labeling Compliance',
        description: 'All products display the required statement: "For Research Use Only. Not for use in diagnostic procedures" as mandated by 21 CFR 809.10(c)(2)(i).',
        citation: '21 CFR § 809.10(c)(2)(i)',
    },
    {
        key: 'noMedicalClaims',
        title: 'No Medical or Diagnostic Claims',
        description: 'Website, marketing materials, and communications do not make any claims regarding diagnosis, treatment, cure, or prevention of disease.',
        citation: 'FD&C Act § 201(g)(1)',
    },
    {
        key: 'researchOnly',
        title: 'Research Use Intended Use',
        description: 'Products are sold exclusively for legitimate research purposes including basic research, pharmaceutical research, and laboratory investigation.',
        citation: 'FDA RUO/IUO Guidance (2013)',
    },
    {
        key: 'websiteCompliant',
        title: 'Website & Marketing Compliance',
        description: 'Business website clearly states research-use-only intent, does not target consumers, and includes appropriate disclaimers on all product pages.',
        citation: '21 CFR § 809.10',
    },
    {
        key: 'recordKeeping',
        title: 'Record Keeping & Documentation',
        description: 'Maintain records of sales, purchaser qualifications, and intended research use documentation for each transaction.',
        citation: 'FDA Best Practices',
    },
    {
        key: 'qualifiedPurchasers',
        title: 'Qualified Purchaser Verification',
        description: 'Sales are made only to qualified research entities, academic institutions, or verified research professionals.',
        citation: 'Industry Standard',
    },
] as const;

export default function StepRUOCompliance({ data, onChange, errors }: StepRUOComplianceProps) {
    const handleToggle = (key: keyof RUOComplianceData) => {
        onChange({ ...data, [key]: !data[key] });
    };

    const allChecked = Object.values(data).filter((v, i) => i < 6).every(Boolean);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="space-y-2">
                <div className="flex items-center gap-2 text-white">
                    <Shield className="w-6 h-6 text-violet-400" />
                    <h3 className="text-lg font-semibold">RUO Compliance Requirements</h3>
                </div>
                <p className="text-white/60 text-sm">
                    As a merchant selling research compounds, you must comply with FDA regulations regarding
                    <strong> Research Use Only (RUO) </strong> products under 21 CFR Part 809.
                </p>
            </div>

            {/* Legal Citation Box */}
            <div className="p-4 rounded-lg bg-violet-500/10 border border-violet-500/20">
                <div className="flex items-start gap-3">
                    <Scale className="w-5 h-5 text-violet-400 mt-0.5 shrink-0" />
                    <div className="space-y-2">
                        <p className="text-white text-sm font-medium">21 CFR § 809.10(c)(2)(i) - Required Labeling</p>
                        <blockquote className="text-white/80 text-sm italic border-l-2 border-violet-400 pl-3">
                            "For a product in the laboratory research phase of development... all labeling shall bear the
                            statement, prominently placed: <strong>'For Research Use Only. Not for use in diagnostic procedures.'</strong>"
                        </blockquote>
                        <a
                            href="https://www.ecfr.gov/current/title-21/chapter-I/subchapter-H/part-809/subpart-B/section-809.10"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-violet-400 hover:text-violet-300 text-xs"
                        >
                            View Full Regulation <ExternalLink className="w-3 h-3" />
                        </a>
                    </div>
                </div>
            </div>

            {/* Compliance Checklist */}
            <div className="space-y-3">
                <p className="text-white/80 text-sm font-medium">
                    Confirm compliance with each requirement:
                </p>

                {complianceItems.map(({ key, title, description, citation }) => {
                    const isChecked = data[key as keyof RUOComplianceData];

                    return (
                        <div
                            key={key}
                            onClick={() => handleToggle(key as keyof RUOComplianceData)}
                            className={`p-4 rounded-lg border cursor-pointer transition-all ${isChecked
                                    ? 'bg-green-500/10 border-green-500/30'
                                    : 'bg-white/5 border-white/10 hover:border-white/20'
                                }`}
                        >
                            <div className="flex items-start gap-3">
                                <div className={`w-6 h-6 rounded-md flex items-center justify-center shrink-0 ${isChecked ? 'bg-green-500' : 'bg-white/10'
                                    }`}>
                                    {isChecked && <CheckCircle2 className="w-4 h-4 text-white" />}
                                </div>
                                <div className="flex-1">
                                    <p className={`font-medium ${isChecked ? 'text-green-400' : 'text-white'}`}>
                                        {title}
                                    </p>
                                    <p className="text-white/60 text-sm mt-1">{description}</p>
                                    <p className="text-violet-400/80 text-xs mt-2">{citation}</p>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {errors.ruoCompliance && (
                <p className="text-red-400 text-sm">{errors.ruoCompliance}</p>
            )}

            {/* Enforcement Warning */}
            <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20">
                <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-red-400 mt-0.5 shrink-0" />
                    <div className="space-y-2">
                        <p className="text-red-400 font-semibold">Compliance Enforcement Notice</p>
                        <p className="text-red-300/80 text-sm">
                            Pursuant to the Federal Food, Drug, and Cosmetic Act (FD&C Act) and 21 CFR Part 809,
                            merchant accounts found to be in violation of RUO compliance requirements—including but not limited to
                            improper labeling, unapproved medical claims, or sales for diagnostic use—may be subject to:
                        </p>
                        <ul className="text-red-300/80 text-sm list-disc list-inside space-y-1 ml-2">
                            <li><strong>Immediate account suspension</strong> pending compliance review</li>
                            <li><strong>Termination of merchant agreement</strong> for repeated violations</li>
                            <li><strong>Reporting to regulatory authorities</strong> as required by law</li>
                        </ul>
                        <p className="text-red-300/80 text-sm mt-2">
                            LabSupply reserves the right to audit merchant websites, product listings, and marketing
                            materials at any time to ensure ongoing compliance with applicable regulations.
                        </p>
                    </div>
                </div>
            </div>

            {/* Final Acknowledgment */}
            <div
                onClick={() => handleToggle('acknowledgeEnforcement')}
                className={`p-4 rounded-lg border cursor-pointer transition-all ${data.acknowledgeEnforcement
                        ? 'bg-amber-500/10 border-amber-500/30'
                        : 'bg-white/5 border-white/10 hover:border-white/20'
                    }`}
            >
                <div className="flex items-start gap-3">
                    <div className={`w-6 h-6 rounded-md flex items-center justify-center shrink-0 ${data.acknowledgeEnforcement ? 'bg-amber-500' : 'bg-white/10'
                        }`}>
                        {data.acknowledgeEnforcement && <CheckCircle2 className="w-4 h-4 text-white" />}
                    </div>
                    <div>
                        <p className={`font-medium ${data.acknowledgeEnforcement ? 'text-amber-400' : 'text-white'}`}>
                            I Acknowledge Compliance Requirements
                        </p>
                        <p className="text-white/60 text-sm mt-1">
                            I understand that my business must maintain full compliance with RUO regulations, and that
                            failure to comply may result in account suspension or termination. I confirm that my products,
                            website, labels, and business practices adhere to the requirements outlined above.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
