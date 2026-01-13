'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
    Clock,
    CheckCircle,
    XCircle,
    AlertCircle,
    FileText,
    Building,
    User,
    Calendar,
    ChevronRight,
    Eye
} from 'lucide-react';
import { cn, formatRelativeTime } from '@/lib/utils';

// Mock KYB review queue
const pendingReviews = [
    {
        id: '1',
        merchant_id: '3',
        company_name: 'New Research Corp',
        contact_name: 'John Smith',
        contact_email: 'john@newresearch.com',
        account_type: 'reseller',
        kyb_status: 'pending',
        submitted_at: '2024-01-10T09:00:00Z',
        documents: [
            { type: 'business_license', name: 'business_license.pdf', status: 'pending' },
            { type: 'articles_of_incorporation', name: 'articles.pdf', status: 'pending' },
            { type: 'government_id', name: 'drivers_license.jpg', status: 'pending' },
        ],
    },
    {
        id: '2',
        merchant_id: '4',
        company_name: 'BioScience Labs',
        contact_name: 'Sarah Johnson',
        contact_email: 'sarah@bioscience.com',
        account_type: 'institution',
        kyb_status: 'pending',
        submitted_at: '2024-01-10T11:30:00Z',
        documents: [
            { type: 'business_license', name: 'license.pdf', status: 'pending' },
            { type: 'research_credentials', name: 'credentials.pdf', status: 'pending' },
            { type: 'government_id', name: 'passport.jpg', status: 'pending' },
        ],
    },
    {
        id: '3',
        merchant_id: '5',
        company_name: 'Peptide Traders LLC',
        contact_name: 'Mike Williams',
        contact_email: 'mike@peptidetraders.com',
        account_type: 'reseller',
        kyb_status: 'in_review',
        submitted_at: '2024-01-09T14:20:00Z',
        documents: [
            { type: 'business_license', name: 'license.pdf', status: 'approved' },
            { type: 'government_id', name: 'id.jpg', status: 'pending' },
        ],
    },
];

export default function KybReviewPage() {
    const [selectedMerchant, setSelectedMerchant] = useState<typeof pendingReviews[0] | null>(null);

    const handleApprove = () => {
        alert('Would approve KYB for ' + selectedMerchant?.company_name);
        setSelectedMerchant(null);
    };

    const handleReject = () => {
        alert('Would reject KYB for ' + selectedMerchant?.company_name);
        setSelectedMerchant(null);
    };

    const handleRequestInfo = () => {
        alert('Would request more info from ' + selectedMerchant?.company_name);
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">KYB Review Queue</h1>
                <p className="text-gray-500">Review and approve merchant verification applications</p>
            </div>

            {/* Stats */}
            <div className="grid gap-4 md:grid-cols-3">
                <Card>
                    <CardContent className="p-4 flex items-center gap-3">
                        <div className="w-12 h-12 rounded-lg bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center">
                            <Clock className="w-6 h-6 text-yellow-600" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-gray-900 dark:text-white">
                                {pendingReviews.filter(r => r.kyb_status === 'pending').length}
                            </p>
                            <p className="text-sm text-gray-500">Pending Review</p>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-4 flex items-center gap-3">
                        <div className="w-12 h-12 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                            <AlertCircle className="w-6 h-6 text-blue-600" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-gray-900 dark:text-white">
                                {pendingReviews.filter(r => r.kyb_status === 'in_review').length}
                            </p>
                            <p className="text-sm text-gray-500">In Review</p>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-4 flex items-center gap-3">
                        <div className="w-12 h-12 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                            <CheckCircle className="w-6 h-6 text-green-600" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-gray-900 dark:text-white">24</p>
                            <p className="text-sm text-gray-500">Approved This Month</p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
                {/* Review Queue */}
                <Card>
                    <CardHeader>
                        <CardTitle>Review Queue</CardTitle>
                        <CardDescription>Click on an application to review</CardDescription>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="divide-y">
                            {pendingReviews.map((review) => (
                                <button
                                    key={review.id}
                                    onClick={() => setSelectedMerchant(review)}
                                    className={cn(
                                        'w-full p-4 text-left flex items-center gap-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors',
                                        selectedMerchant?.id === review.id && 'bg-violet-50 dark:bg-violet-900/20'
                                    )}
                                >
                                    <div className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                                        <Building className="w-5 h-5 text-gray-500" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-medium text-gray-900 dark:text-white truncate">
                                            {review.company_name}
                                        </p>
                                        <p className="text-sm text-gray-500">
                                            {review.account_type} • {formatRelativeTime(review.submitted_at)}
                                        </p>
                                    </div>
                                    <span className={cn(
                                        'px-2 py-1 rounded-full text-xs font-medium',
                                        review.kyb_status === 'pending'
                                            ? 'bg-yellow-100 text-yellow-700'
                                            : 'bg-blue-100 text-blue-700'
                                    )}>
                                        {review.kyb_status === 'pending' ? 'Pending' : 'In Review'}
                                    </span>
                                    <ChevronRight className="w-4 h-4 text-gray-400" />
                                </button>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                {/* Review Panel */}
                <Card>
                    {selectedMerchant ? (
                        <>
                            <CardHeader>
                                <div className="flex items-center justify-between">
                                    <div>
                                        <CardTitle>{selectedMerchant.company_name}</CardTitle>
                                        <CardDescription className="capitalize">
                                            {selectedMerchant.account_type} Application
                                        </CardDescription>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                {/* Contact Info */}
                                <div className="space-y-3">
                                    <h4 className="font-medium text-gray-900 dark:text-white flex items-center gap-2">
                                        <User className="w-4 h-4" />
                                        Contact Information
                                    </h4>
                                    <div className="grid gap-2 text-sm pl-6">
                                        <div className="flex justify-between">
                                            <span className="text-gray-500">Name</span>
                                            <span className="font-medium">{selectedMerchant.contact_name}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-500">Email</span>
                                            <span className="font-medium">{selectedMerchant.contact_email}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Documents */}
                                <div className="space-y-3">
                                    <h4 className="font-medium text-gray-900 dark:text-white flex items-center gap-2">
                                        <FileText className="w-4 h-4" />
                                        Submitted Documents
                                    </h4>
                                    <div className="space-y-2 pl-6">
                                        {selectedMerchant.documents.map((doc, index) => (
                                            <div
                                                key={index}
                                                className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-800"
                                            >
                                                <div className="flex items-center gap-3">
                                                    <FileText className="w-5 h-5 text-gray-400" />
                                                    <div>
                                                        <p className="font-medium text-sm text-gray-900 dark:text-white">
                                                            {doc.type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                                        </p>
                                                        <p className="text-xs text-gray-500">{doc.name}</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    {doc.status === 'approved' ? (
                                                        <CheckCircle className="w-5 h-5 text-green-500" />
                                                    ) : (
                                                        <>
                                                            <Button size="sm" variant="outline">
                                                                <Eye className="w-4 h-4 mr-1" />
                                                                View
                                                            </Button>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Verification Checklist */}
                                <div className="space-y-3">
                                    <h4 className="font-medium text-gray-900 dark:text-white">Verification Checklist</h4>
                                    <div className="space-y-2 pl-6">
                                        {[
                                            'Business name matches documents',
                                            'EIN/Tax ID verified',
                                            'Address is valid and complete',
                                            'Government ID matches contact name',
                                            'Business type appropriate for account',
                                        ].map((item, index) => (
                                            <label key={index} className="flex items-center gap-3 cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    className="h-4 w-4 rounded border-gray-300 text-violet-600"
                                                />
                                                <span className="text-sm text-gray-700 dark:text-gray-300">{item}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className="flex gap-3 pt-4 border-t">
                                    <Button
                                        className="flex-1 bg-green-600 hover:bg-green-700"
                                        onClick={handleApprove}
                                    >
                                        <CheckCircle className="w-4 h-4 mr-2" />
                                        Approve
                                    </Button>
                                    <Button
                                        variant="outline"
                                        onClick={handleRequestInfo}
                                    >
                                        Request Info
                                    </Button>
                                    <Button
                                        variant="destructive"
                                        onClick={handleReject}
                                    >
                                        <XCircle className="w-4 h-4 mr-2" />
                                        Reject
                                    </Button>
                                </div>
                            </CardContent>
                        </>
                    ) : (
                        <CardContent className="p-12 text-center">
                            <FileText className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                            <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                                Select an Application
                            </h3>
                            <p className="text-gray-500">
                                Click on a merchant from the queue to review their KYB application
                            </p>
                        </CardContent>
                    )}
                </Card>
            </div>
        </div>
    );
}
