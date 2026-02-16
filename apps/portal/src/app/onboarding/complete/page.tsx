'use client';

import Link from 'next/link';
import { CheckCircle, Mail, ArrowRight, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export default function OnboardingCompletePage() {
    return (
        <div className="px-4 pb-12">
            <div className="max-w-lg mx-auto">
                <Card className="bg-white dark:bg-gray-900 border-white/10 text-center">
                    <CardContent className="p-8 md:p-12">
                        {/* Success icon */}
                        <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                            <CheckCircle className="w-10 h-10 text-green-600" />
                        </div>

                        {/* Title */}
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                            Application Submitted!
                        </h1>

                        <p className="text-gray-500 dark:text-gray-400 mb-6">
                            Thank you for completing your merchant application. Our compliance team
                            will review your information and documents.
                        </p>

                        {/* Timeline */}
                        <div className="text-left bg-gray-50 dark:bg-gray-800 rounded-lg p-4 mb-6">
                            <h3 className="font-medium text-gray-900 dark:text-white mb-3">What's next?</h3>
                            <ol className="space-y-3">
                                <li className="flex gap-3">
                                    <div className="w-6 h-6 rounded-full bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center text-sm font-medium text-violet-600 shrink-0">
                                        1
                                    </div>
                                    <div>
                                        <p className="font-medium text-gray-900 dark:text-white text-sm">
                                            Document Verification
                                        </p>
                                        <p className="text-xs text-gray-500">
                                            We verify your business documents and credentials
                                        </p>
                                    </div>
                                </li>
                                <li className="flex gap-3">
                                    <div className="w-6 h-6 rounded-full bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center text-sm font-medium text-violet-600 shrink-0">
                                        2
                                    </div>
                                    <div>
                                        <p className="font-medium text-gray-900 dark:text-white text-sm">
                                            Account Approval
                                        </p>
                                        <p className="text-xs text-gray-500">
                                            Typically completed within 1-2 business days
                                        </p>
                                    </div>
                                </li>
                                <li className="flex gap-3">
                                    <div className="w-6 h-6 rounded-full bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center text-sm font-medium text-violet-600 shrink-0">
                                        3
                                    </div>
                                    <div>
                                        <p className="font-medium text-gray-900 dark:text-white text-sm">
                                            Start Selling
                                        </p>
                                        <p className="text-xs text-gray-500">
                                            Connect your store and browse the catalog
                                        </p>
                                    </div>
                                </li>
                            </ol>
                        </div>

                        {/* Email notice */}
                        <div className="flex items-center justify-center gap-2 text-sm text-gray-500 mb-6">
                            <Mail className="w-4 h-4" />
                            <span>You'll receive an email when your account is approved</span>
                        </div>

                        {/* Mercury Recommendation */}
                        <div className="text-left bg-sky-50 dark:bg-sky-900/20 border border-sky-200 dark:border-sky-800 rounded-lg p-4 mb-6">
                            <h3 className="font-medium text-sky-900 dark:text-sky-100 mb-1">
                                While you wait &mdash; set up your business bank
                            </h3>
                            <p className="text-sm text-sky-700 dark:text-sky-300">
                                We recommend <strong>Mercury</strong> for your business banking.
                                Mercury offers free checking, fast ACH transfers, and works seamlessly
                                with our wallet invoicing system for quick funding.
                            </p>
                            <a
                                href="https://mercury.com/r/peptide-tech-llc"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 mt-2 text-sm font-medium text-sky-600 dark:text-sky-400 hover:underline"
                            >
                                Open a free Mercury account
                                <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                        </div>

                        {/* Actions */}
                        <div className="space-y-3">
                            <Link href="/dashboard">
                                <Button className="w-full bg-gradient-to-r from-violet-600 to-indigo-600 hover:opacity-90">
                                    Go to Dashboard
                                    <ArrowRight className="w-4 h-4 ml-2" />
                                </Button>
                            </Link>
                            <Link href="/">
                                <Button variant="outline" className="w-full">
                                    Return to Home
                                </Button>
                            </Link>
                        </div>
                    </CardContent>
                </Card>

                {/* Support link */}
                <p className="text-center text-sm text-white/60 mt-6">
                    Have questions?{' '}
                    <a href="mailto:support@whitelabel.peptidetech.co" className="text-white/80 hover:text-white underline">
                        Contact our support team
                    </a>
                </p>
            </div>
        </div>
    );
}
