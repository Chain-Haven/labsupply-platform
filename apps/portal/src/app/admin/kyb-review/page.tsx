'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Clock,
    CheckCircle,
    XCircle,
    AlertCircle,
    FileText,
    Building,
    User,
    ChevronRight,
    Eye,
    Loader2,
} from 'lucide-react';
import { cn, formatRelativeTime } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';
import { SERVICE_PACKAGES, formatPrice } from '@/lib/packages';

type KybReviewItem = {
    id: string;
    company_name: string;
    email: string;
    contact_email: string;
    phone: string | null;
    status: string;
    kyb_status: string;
    can_ship: boolean;
    billing_email: string | null;
    legal_opinion_letter_url: string | null;
    billing_name: string | null;
    billing_address_street: string | null;
    billing_address_city: string | null;
    billing_address_state: string | null;
    billing_address_zip: string | null;
    selected_package_id: string | null;
    service_packages: { slug: string; name: string; price_cents: number } | null;
    created_at: string;
};

type ApiResponse = {
    data: KybReviewItem[];
    stats: { approvedCount: number };
};

export default function KybReviewPage() {
    const [reviews, setReviews] = useState<KybReviewItem[]>([]);
    const [stats, setStats] = useState<{ approvedCount: number }>({ approvedCount: 0 });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedMerchant, setSelectedMerchant] = useState<KybReviewItem | null>(null);
    const [actionLoading, setActionLoading] = useState<'approve' | 'reject' | null>(null);
    const [showRejectForm, setShowRejectForm] = useState(false);
    const [rejectReason, setRejectReason] = useState('');

    const fetchReviews = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch('/api/v1/admin/kyb-review');
            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.error || 'Failed to fetch KYB reviews');
            }
            const json: ApiResponse = await res.json();
            setReviews(json.data || []);
            setStats(json.stats || { approvedCount: 0 });
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Failed to load reviews');
            setReviews([]);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchReviews();
    }, [fetchReviews]);

    const handleApprove = async () => {
        if (!selectedMerchant) return;
        setActionLoading('approve');
        try {
            const res = await fetch('/api/v1/admin/kyb-review', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ merchantId: selectedMerchant.id, action: 'approve' }),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
                throw new Error(data.error || 'Failed to approve');
            }
            toast({
                title: 'KYB Approved',
                description: `${selectedMerchant.company_name} has been approved.`,
            });
            setSelectedMerchant(null);
            await fetchReviews();
        } catch (e) {
            toast({
                title: 'Approval failed',
                description: e instanceof Error ? e.message : 'Failed to approve merchant',
                variant: 'destructive',
            });
        } finally {
            setActionLoading(null);
        }
    };

    const handleRejectClick = () => {
        setShowRejectForm(true);
    };

    const handleRejectConfirm = async () => {
        if (!selectedMerchant) return;
        setActionLoading('reject');
        try {
            const res = await fetch('/api/v1/admin/kyb-review', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    merchantId: selectedMerchant.id,
                    action: 'reject',
                    reason: rejectReason.trim() || 'Not specified',
                }),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
                throw new Error(data.error || 'Failed to reject');
            }
            toast({
                title: 'KYB Rejected',
                description: `${selectedMerchant.company_name} has been rejected.`,
            });
            setSelectedMerchant(null);
            setShowRejectForm(false);
            setRejectReason('');
            await fetchReviews();
        } catch (e) {
            toast({
                title: 'Rejection failed',
                description: e instanceof Error ? e.message : 'Failed to reject merchant',
                variant: 'destructive',
            });
        } finally {
            setActionLoading(null);
        }
    };

    const handleRejectCancel = () => {
        setShowRejectForm(false);
        setRejectReason('');
    };

    const handleRequestInfo = () => {
        toast({
            title: 'Request Info',
            description: `Request for more info from ${selectedMerchant?.company_name} - feature coming soon.`,
        });
    };

    const documents: { type: string; name: string; status: string; url?: string }[] =
        selectedMerchant
            ? [
                  ...(selectedMerchant.legal_opinion_letter_url
                      ? [
                            {
                                type: 'Legal Opinion Letter',
                                name: 'Legal Opinion Letter',
                                status: 'pending',
                                url: selectedMerchant.legal_opinion_letter_url,
                            },
                        ]
                      : []),
              ]
            : [];

    const pendingCount = reviews.filter((r) => r.kyb_status === 'not_started').length;
    const inReviewCount = reviews.filter((r) => r.kyb_status === 'in_progress').length;

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
                                {loading ? '—' : pendingCount}
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
                                {loading ? '—' : inReviewCount}
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
                            <p className="text-2xl font-bold text-gray-900 dark:text-white">
                                {loading ? '—' : stats.approvedCount}
                            </p>
                            <p className="text-sm text-gray-500">Approved This Month</p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {error && (
                <div className="rounded-lg bg-red-50 dark:bg-red-900/20 p-4 flex items-center gap-3">
                    <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                    <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
                    <Button variant="outline" size="sm" onClick={fetchReviews}>
                        Retry
                    </Button>
                </div>
            )}

            <div className="grid gap-6 lg:grid-cols-2">
                {/* Review Queue */}
                <Card>
                    <CardHeader>
                        <CardTitle>Review Queue</CardTitle>
                        <CardDescription>Click on an application to review</CardDescription>
                    </CardHeader>
                    <CardContent className="p-0">
                        {loading ? (
                            <div className="p-12 flex items-center justify-center">
                                <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
                            </div>
                        ) : (
                            <div className="divide-y">
                                {reviews.map((review) => (
                                    <button
                                        key={review.id}
                                        onClick={() => {
                                            setSelectedMerchant(review);
                                            setShowRejectForm(false);
                                            setRejectReason('');
                                        }}
                                        className={cn(
                                            'w-full p-4 text-left flex items-center gap-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors',
                                            selectedMerchant?.id === review.id &&
                                                'bg-violet-50 dark:bg-violet-900/20'
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
                                                Merchant • {formatRelativeTime(review.created_at)}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-1.5 flex-shrink-0">
                                            {review.service_packages && review.service_packages.slug !== 'self-service' && (
                                                <span className="px-2 py-1 rounded-full text-xs font-medium bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400">
                                                    {review.service_packages.name}
                                                </span>
                                            )}
                                            <span
                                                className={cn(
                                                    'px-2 py-1 rounded-full text-xs font-medium',
                                                    review.kyb_status === 'not_started'
                                                        ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                                                        : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                                                )}
                                            >
                                                {review.kyb_status === 'not_started' ? 'Pending' : 'In Review'}
                                            </span>
                                        </div>
                                        <ChevronRight className="w-4 h-4 text-gray-400" />
                                    </button>
                                ))}
                            </div>
                        )}
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
                                        <CardDescription>Merchant Application</CardDescription>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                {/* Selected Package */}
                                {selectedMerchant.service_packages && (
                                    <div className="p-3 rounded-lg bg-violet-50 dark:bg-violet-900/20 border border-violet-200 dark:border-violet-800">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="text-xs text-violet-600 dark:text-violet-400 font-medium uppercase tracking-wider">Selected Package</p>
                                                <p className="font-semibold text-gray-900 dark:text-white">{selectedMerchant.service_packages.name}</p>
                                            </div>
                                            <span className="text-lg font-bold text-gray-900 dark:text-white">
                                                {selectedMerchant.service_packages.price_cents === 0 ? 'Free' : formatPrice(selectedMerchant.service_packages.price_cents)}
                                            </span>
                                        </div>
                                        {selectedMerchant.service_packages.price_cents > 0 && (
                                            <p className="text-xs text-violet-500 mt-1">Mercury invoice will be created automatically on approval</p>
                                        )}
                                    </div>
                                )}

                                {/* Contact Info */}
                                <div className="space-y-3">
                                    <h4 className="font-medium text-gray-900 dark:text-white flex items-center gap-2">
                                        <User className="w-4 h-4" />
                                        Contact Information
                                    </h4>
                                    <div className="grid gap-2 text-sm pl-6">
                                        <div className="flex justify-between">
                                            <span className="text-gray-500">Name</span>
                                            <span className="font-medium">
                                                {selectedMerchant.billing_name ||
                                                    selectedMerchant.company_name ||
                                                    '—'}
                                            </span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-500">Email</span>
                                            <span className="font-medium">
                                                {selectedMerchant.contact_email ||
                                                    selectedMerchant.email ||
                                                    '—'}
                                            </span>
                                        </div>
                                        {selectedMerchant.phone && (
                                            <div className="flex justify-between">
                                                <span className="text-gray-500">Phone</span>
                                                <span className="font-medium">{selectedMerchant.phone}</span>
                                            </div>
                                        )}
                                        {selectedMerchant.billing_address_street && (
                                            <div className="flex justify-between">
                                                <span className="text-gray-500">Address</span>
                                                <span className="font-medium text-right">
                                                    {[
                                                        selectedMerchant.billing_address_street,
                                                        selectedMerchant.billing_address_city,
                                                        selectedMerchant.billing_address_state,
                                                        selectedMerchant.billing_address_zip,
                                                    ]
                                                        .filter(Boolean)
                                                        .join(', ')}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Documents */}
                                <div className="space-y-3">
                                    <h4 className="font-medium text-gray-900 dark:text-white flex items-center gap-2">
                                        <FileText className="w-4 h-4" />
                                        Submitted Documents
                                    </h4>
                                    <div className="space-y-2 pl-6">
                                        {documents.length > 0 ? (
                                            documents.map((doc, index) => (
                                                <div
                                                    key={index}
                                                    className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-800"
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <FileText className="w-5 h-5 text-gray-400" />
                                                        <div>
                                                            <p className="font-medium text-sm text-gray-900 dark:text-white">
                                                                {doc.type}
                                                            </p>
                                                            <p className="text-xs text-gray-500">{doc.name}</p>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        {doc.url ? (
                                                            <Button
                                                                size="sm"
                                                                variant="outline"
                                                                asChild
                                                            >
                                                                <a
                                                                    href={doc.url}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                >
                                                                    <Eye className="w-4 h-4 mr-1" />
                                                                    View
                                                                </a>
                                                            </Button>
                                                        ) : (
                                                            <CheckCircle className="w-5 h-5 text-green-500" />
                                                        )}
                                                    </div>
                                                </div>
                                            ))
                                        ) : (
                                            <p className="text-sm text-gray-500 py-2">
                                                No documents submitted
                                            </p>
                                        )}
                                    </div>
                                </div>

                                {/* Verification Checklist */}
                                <div className="space-y-3">
                                    <h4 className="font-medium text-gray-900 dark:text-white">
                                        Verification Checklist
                                    </h4>
                                    <div className="space-y-2 pl-6">
                                        {[
                                            'Business name matches documents',
                                            'EIN/Tax ID verified',
                                            'Address is valid and complete',
                                            'Government ID matches contact name',
                                            'Business type appropriate for account',
                                        ].map((item, index) => (
                                            <label
                                                key={index}
                                                className="flex items-center gap-3 cursor-pointer"
                                            >
                                                <input
                                                    type="checkbox"
                                                    className="h-4 w-4 rounded border-gray-300 text-violet-600"
                                                />
                                                <span className="text-sm text-gray-700 dark:text-gray-300">
                                                    {item}
                                                </span>
                                            </label>
                                        ))}
                                    </div>
                                </div>

                                {/* Reject reason form */}
                                {showRejectForm && (
                                    <div className="space-y-2 p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                                        <label className="text-sm font-medium text-gray-900 dark:text-white">
                                            Rejection reason (required)
                                        </label>
                                        <Input
                                            placeholder="Enter reason for rejection..."
                                            value={rejectReason}
                                            onChange={(e) => setRejectReason(e.target.value)}
                                            className="bg-white dark:bg-gray-900"
                                        />
                                        <div className="flex gap-2">
                                            <Button
                                                variant="destructive"
                                                size="sm"
                                                onClick={handleRejectConfirm}
                                                disabled={actionLoading === 'reject'}
                                            >
                                                {actionLoading === 'reject' ? (
                                                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                                ) : (
                                                    <XCircle className="w-4 h-4 mr-2" />
                                                )}
                                                Confirm Reject
                                            </Button>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={handleRejectCancel}
                                                disabled={actionLoading === 'reject'}
                                            >
                                                Cancel
                                            </Button>
                                        </div>
                                    </div>
                                )}

                                {/* Actions */}
                                <div className="flex gap-3 pt-4 border-t">
                                    <Button
                                        className="flex-1 bg-green-600 hover:bg-green-700"
                                        onClick={handleApprove}
                                        disabled={actionLoading !== null}
                                    >
                                        {actionLoading === 'approve' ? (
                                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        ) : (
                                            <CheckCircle className="w-4 h-4 mr-2" />
                                        )}
                                        Approve
                                    </Button>
                                    <Button
                                        variant="outline"
                                        onClick={handleRequestInfo}
                                        disabled={actionLoading !== null}
                                    >
                                        Request Info
                                    </Button>
                                    {!showRejectForm ? (
                                        <Button
                                            variant="destructive"
                                            onClick={handleRejectClick}
                                            disabled={actionLoading !== null}
                                        >
                                            <XCircle className="w-4 h-4 mr-2" />
                                            Reject
                                        </Button>
                                    ) : null}
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
