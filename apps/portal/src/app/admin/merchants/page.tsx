'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Search,
    Filter,
    Users,
    Eye,
    MoreHorizontal,
    CheckCircle,
    XCircle,
    Clock,
    AlertCircle,
    Building,
    Edit,
    X,
    Save,
    RefreshCw,
    Wallet,
    Store,
    Mail,
    Phone,
    FileText,
    Truck,
    ExternalLink,
    CreditCard
} from 'lucide-react';
import { cn, formatRelativeTime } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';

// Merchant interface - matches API response
interface Merchant {
    id: string;
    company_name: string;
    email: string;
    contact_email: string;
    phone?: string;
    status: string;
    kyb_status: string;
    can_ship: boolean;
    tier?: string;
    billing_email?: string;
    wallet_balance_cents?: number;
    subscription_status?: string;
    legal_opinion_letter_url?: string;
    created_at: string;
    stores_count?: number;
    lifetime_spend_cents?: number;
    notes?: string;
}

interface Pagination {
    page: number;
    limit: number;
    total: number;
    has_more: boolean;
}

const statusFilters = [
    { value: 'all', label: 'All', count: 0 },
    { value: 'pending', label: 'Pending', count: 0 },
    { value: 'in_review', label: 'In Review', count: 0 },
    { value: 'approved', label: 'Approved', count: 0 },
    { value: 'rejected', label: 'Rejected', count: 0 },
];

const kybStatusOptions = ['pending', 'in_review', 'approved', 'rejected'];
const accountTypeOptions = ['reseller', 'institution', 'individual'];

const getStatusIcon = (status: string) => {
    switch (status) {
        case 'approved':
            return <CheckCircle className="w-4 h-4 text-green-500" />;
        case 'rejected':
            return <XCircle className="w-4 h-4 text-red-500" />;
        case 'pending':
            return <Clock className="w-4 h-4 text-yellow-500" />;
        case 'in_review':
            return <AlertCircle className="w-4 h-4 text-blue-500" />;
        default:
            return <Clock className="w-4 h-4 text-gray-500" />;
    }
};

const getStatusColor = (status: string) => {
    switch (status) {
        case 'approved':
            return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
        case 'rejected':
            return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
        case 'pending':
            return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400';
        case 'in_review':
            return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
        default:
            return 'bg-gray-100 text-gray-700';
    }
};

export default function MerchantsPage() {
    const [merchants, setMerchants] = useState<Merchant[]>([]);
    const [page, setPage] = useState(1);
    const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 20, total: 0, has_more: false });
    const [searchQuery, setSearchQuery] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Edit modal state
    const [editModalOpen, setEditModalOpen] = useState(false);
    const [editingMerchant, setEditingMerchant] = useState<Merchant | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    // Debounce search input
    useEffect(() => {
        const timer = setTimeout(() => setDebouncedSearch(searchQuery), 300);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    const fetchMerchants = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const params = new URLSearchParams();
            params.set('page', String(page));
            params.set('limit', '20');
            if (statusFilter !== 'all') params.set('kyb_status', statusFilter);
            if (debouncedSearch.trim()) params.set('search', debouncedSearch.trim());

            const res = await fetch(`/api/v1/admin/merchants?${params}`);
            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.error || `Failed to fetch: ${res.status}`);
            }
            const json = await res.json();
            setMerchants(json.data || []);
            setPagination(json.pagination || { page: 1, limit: 20, total: 0, has_more: false });
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load merchants');
            setMerchants([]);
        } finally {
            setLoading(false);
        }
    }, [page, statusFilter, debouncedSearch]);

    useEffect(() => {
        fetchMerchants();
    }, [fetchMerchants]);

    // Reset to page 1 when filters change
    useEffect(() => {
        setPage(1);
    }, [statusFilter, debouncedSearch]);

    // Open edit modal
    const handleEditMerchant = (merchant: Merchant) => {
        setEditingMerchant({ ...merchant });
        setEditModalOpen(true);
    };

    // Save merchant changes via PATCH
    const handleSaveMerchant = async () => {
        if (!editingMerchant) return;

        setIsSaving(true);
        try {
            const updates: Record<string, unknown> = {
                company_name: editingMerchant.company_name,
                contact_email: editingMerchant.contact_email,
                phone: editingMerchant.phone ?? '',
                kyb_status: editingMerchant.kyb_status,
                can_ship: editingMerchant.can_ship,
            };
            if (editingMerchant.tier !== undefined) updates.tier = editingMerchant.tier;

            const res = await fetch('/api/v1/admin/merchants', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: editingMerchant.id, ...updates }),
            });

            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.error || 'Failed to update merchant');
            }

            const { data } = await res.json();
            setMerchants((prev) => prev.map((m) => (m.id === editingMerchant.id ? { ...m, ...data } : m)));
            setEditModalOpen(false);
            setEditingMerchant(null);

            toast({
                title: 'Merchant updated',
                description: `${editingMerchant.company_name} has been updated successfully.`,
            });
        } catch (err) {
            toast({
                title: 'Update failed',
                description: err instanceof Error ? err.message : 'Failed to save changes',
                variant: 'destructive',
            });
        } finally {
            setIsSaving(false);
        }
    };

    // Update KYB status directly from table via PATCH
    const handleQuickStatusUpdate = async (merchantId: string, newStatus: string) => {
        try {
            const res = await fetch('/api/v1/admin/merchants', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: merchantId, kyb_status: newStatus }),
            });

            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.error || 'Failed to update status');
            }

            const { data } = await res.json();
            setMerchants((prev) => prev.map((m) => (m.id === merchantId ? { ...m, ...data } : m)));

            toast({
                title: 'Status updated',
                description: `KYB status changed to ${newStatus.replace('_', ' ')}.`,
            });
        } catch (err) {
            toast({
                title: 'Update failed',
                description: err instanceof Error ? err.message : 'Failed to update status',
                variant: 'destructive',
            });
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Merchants</h1>
                    <p className="text-gray-500">Manage merchant accounts and KYB status</p>
                </div>
            </div>

            {/* Stats */}
            <div className="grid gap-4 md:grid-cols-4">
                {statusFilters.slice(1).map((filter) => (
                    <Card
                        key={filter.value}
                        className={cn(
                            'cursor-pointer transition-colors',
                            statusFilter === filter.value && 'ring-2 ring-violet-500'
                        )}
                        onClick={() => setStatusFilter(filter.value)}
                    >
                        <CardContent className="p-4 flex items-center gap-3">
                            {getStatusIcon(filter.value)}
                            <div>
                                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                                    {loading ? '—' : merchants.filter((m) => m.kyb_status === filter.value).length}
                                </p>
                                <p className="text-sm text-gray-500">{filter.label}</p>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Filters */}
            <Card>
                <CardContent className="p-4">
                    <div className="flex flex-col sm:flex-row gap-4">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <Input
                                placeholder="Search merchants..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-9"
                            />
                        </div>
                        <div className="flex gap-2">
                            {statusFilters.map((filter) => (
                                <Button
                                    key={filter.value}
                                    variant={statusFilter === filter.value ? 'default' : 'outline'}
                                    size="sm"
                                    onClick={() => setStatusFilter(filter.value)}
                                >
                                    {filter.label}
                                </Button>
                            ))}
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Error state */}
            {error && (
                <Card className="border-red-200 dark:border-red-800">
                    <CardContent className="p-4 flex items-center justify-between">
                        <p className="text-red-600 dark:text-red-400">{error}</p>
                        <Button variant="outline" size="sm" onClick={fetchMerchants}>
                            <RefreshCw className="w-4 h-4 mr-2" />
                            Retry
                        </Button>
                    </CardContent>
                </Card>
            )}

            {/* Merchants Table */}
            <Card>
                <CardContent className="p-0">
                    {loading ? (
                        <div className="p-12 flex flex-col items-center justify-center gap-4">
                            <RefreshCw className="w-12 h-12 text-gray-400 animate-spin" />
                            <p className="text-gray-500">Loading merchants...</p>
                        </div>
                    ) : (
                        <table className="w-full">
                            <thead className="bg-gray-50 dark:bg-gray-800/50 border-b">
                                <tr>
                                    <th className="text-left p-4 text-sm font-medium text-gray-500">Company</th>
                                    <th className="text-left p-4 text-sm font-medium text-gray-500">Type</th>
                                    <th className="text-left p-4 text-sm font-medium text-gray-500">KYB Status</th>
                                    <th className="text-center p-4 text-sm font-medium text-gray-500">Can Ship</th>
                                    <th className="text-center p-4 text-sm font-medium text-gray-500">Legal Doc</th>
                                    <th className="text-right p-4 text-sm font-medium text-gray-500">Lifetime Spend</th>
                                    <th className="text-left p-4 text-sm font-medium text-gray-500">Joined</th>
                                    <th className="text-right p-4 text-sm font-medium text-gray-500">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {merchants.map((merchant) => (
                                    <tr key={merchant.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                                        <td className="p-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                                                    <Building className="w-5 h-5 text-gray-500" />
                                                </div>
                                                <div>
                                                    <p className="font-medium text-gray-900 dark:text-white">
                                                        {merchant.company_name}
                                                    </p>
                                                    <p className="text-sm text-gray-500">{merchant.contact_email}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-4 text-gray-500 capitalize">{merchant.tier ?? '—'}</td>
                                        <td className="p-4">
                                            <span
                                                className={cn(
                                                    'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium',
                                                    getStatusColor(merchant.kyb_status)
                                                )}
                                            >
                                                {getStatusIcon(merchant.kyb_status)}
                                                {merchant.kyb_status.replace('_', ' ')}
                                            </span>
                                        </td>
                                        <td className="p-4 text-center">
                                            {merchant.can_ship ? (
                                                <span className="inline-flex items-center gap-1 text-green-600">
                                                    <Truck className="w-4 h-4" />
                                                    <span className="text-xs">Yes</span>
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 text-gray-400">
                                                    <XCircle className="w-4 h-4" />
                                                    <span className="text-xs">No</span>
                                                </span>
                                            )}
                                        </td>
                                        <td className="p-4 text-center">
                                            {merchant.legal_opinion_letter_url ? (
                                                <a
                                                    href={merchant.legal_opinion_letter_url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-700"
                                                >
                                                    <FileText className="w-4 h-4" />
                                                    <ExternalLink className="w-3 h-3" />
                                                </a>
                                            ) : (
                                                <span className="text-gray-400 text-xs">—</span>
                                            )}
                                        </td>
                                        <td className="p-4 text-right font-medium text-gray-900 dark:text-white">
                                            ${((merchant.lifetime_spend_cents ?? 0) / 100).toLocaleString()}
                                        </td>
                                        <td className="p-4 text-gray-500 text-sm">
                                            {formatRelativeTime(merchant.created_at)}
                                        </td>
                                        <td className="p-4 text-right">
                                            <div className="flex items-center justify-end gap-1">
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    onClick={() => handleEditMerchant(merchant)}
                                                    title="Edit merchant"
                                                >
                                                    <Edit className="w-4 h-4" />
                                                </Button>
                                                <Link href={`/admin/merchants/${merchant.id}`}>
                                                    <Button size="sm" variant="ghost" title="View details">
                                                        <Eye className="w-4 h-4" />
                                                    </Button>
                                                </Link>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </CardContent>
            </Card>

            {!loading && !error && merchants.length === 0 && (
                <Card>
                    <CardContent className="p-12 text-center">
                        <Users className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                        <h3 className="font-semibold text-gray-900 dark:text-white mb-2">No merchants found</h3>
                        <p className="text-gray-500">Try adjusting your search or filter criteria</p>
                    </CardContent>
                </Card>
            )}

            {/* Pagination */}
            {!loading && pagination.total > 0 && (
                <div className="flex items-center justify-between">
                    <p className="text-sm text-gray-500">
                        Showing {merchants.length} of {pagination.total} merchants
                    </p>
                    <div className="flex gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            disabled={page <= 1}
                            onClick={() => setPage((p) => p - 1)}
                        >
                            Previous
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            disabled={!pagination.has_more}
                            onClick={() => setPage((p) => p + 1)}
                        >
                            Next
                        </Button>
                    </div>
                </div>
            )}

            {/* Edit Merchant Modal */}
            {editModalOpen && editingMerchant && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle className="flex items-center gap-2">
                                        <Edit className="w-5 h-5" />
                                        Edit Merchant
                                    </CardTitle>
                                    <CardDescription>
                                        Update merchant information and status
                                    </CardDescription>
                                </div>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => {
                                        setEditModalOpen(false);
                                        setEditingMerchant(null);
                                    }}
                                >
                                    <X className="w-4 h-4" />
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            {/* Company Information */}
                            <div>
                                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                                    <Building className="w-4 h-4" />
                                    Company Information
                                </h4>
                                <div className="grid gap-4 md:grid-cols-2">
                                    <div>
                                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Company Name</label>
                                        <Input
                                            value={editingMerchant.company_name}
                                            onChange={(e) => setEditingMerchant({ ...editingMerchant, company_name: e.target.value })}
                                            className="mt-1"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Account Type</label>
                                        <select
                                            value={editingMerchant.tier ?? ''}
                                            onChange={(e) => setEditingMerchant({ ...editingMerchant, tier: e.target.value })}
                                            className="mt-1 w-full px-3 py-2 border rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                                        >
                                            {accountTypeOptions.map((type) => (
                                                <option key={type} value={type} className="capitalize">
                                                    {type}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            </div>

                            {/* Contact Information */}
                            <div>
                                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                                    <Mail className="w-4 h-4" />
                                    Contact Information
                                </h4>
                                <div className="grid gap-4 md:grid-cols-2">
                                    <div>
                                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Email Address</label>
                                        <Input
                                            value={editingMerchant.contact_email}
                                            onChange={(e) => setEditingMerchant({ ...editingMerchant, contact_email: e.target.value })}
                                            className="mt-1"
                                            type="email"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Phone Number</label>
                                        <Input
                                            value={editingMerchant.phone ?? ''}
                                            onChange={(e) => setEditingMerchant({ ...editingMerchant, phone: e.target.value })}
                                            className="mt-1"
                                            type="tel"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* KYB Status */}
                            <div>
                                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                                    <CheckCircle className="w-4 h-4" />
                                    KYB Status
                                </h4>
                                <div className="flex gap-2 flex-wrap">
                                    {kybStatusOptions.map((status) => (
                                        <button
                                            key={status}
                                            onClick={() => setEditingMerchant({ ...editingMerchant, kyb_status: status })}
                                            className={cn(
                                                'px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2',
                                                editingMerchant.kyb_status === status
                                                    ? getStatusColor(status)
                                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400'
                                            )}
                                        >
                                            {getStatusIcon(status)}
                                            {status.replace('_', ' ')}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Shipping Permission */}
                            <div>
                                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                                    <Truck className="w-4 h-4" />
                                    Shipping Permission
                                </h4>
                                <div className="flex items-center gap-4">
                                    <button
                                        onClick={() => setEditingMerchant({ ...editingMerchant, can_ship: true })}
                                        className={cn(
                                            'px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2',
                                            editingMerchant.can_ship
                                                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400'
                                        )}
                                    >
                                        <CheckCircle className="w-4 h-4" />
                                        Can Ship
                                    </button>
                                    <button
                                        onClick={() => setEditingMerchant({ ...editingMerchant, can_ship: false })}
                                        className={cn(
                                            'px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2',
                                            !editingMerchant.can_ship
                                                ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400'
                                        )}
                                    >
                                        <XCircle className="w-4 h-4" />
                                        Cannot Ship
                                    </button>
                                </div>
                                <p className="text-xs text-gray-500 mt-2">
                                    Merchant must have approved KYB status to ship orders.
                                </p>
                            </div>

                            {/* Legal Opinion Letter */}
                            <div>
                                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                                    <FileText className="w-4 h-4" />
                                    Legal Opinion Letter
                                </h4>
                                {editingMerchant.legal_opinion_letter_url ? (
                                    <a
                                        href={editingMerchant.legal_opinion_letter_url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors"
                                    >
                                        <FileText className="w-4 h-4" />
                                        View Document
                                        <ExternalLink className="w-3 h-3" />
                                    </a>
                                ) : (
                                    <p className="text-sm text-gray-500">No legal opinion letter uploaded.</p>
                                )}
                            </div>

                            {/* Subscription Status */}
                            {editingMerchant.subscription_status && (
                                <div>
                                    <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                                        <CreditCard className="w-4 h-4" />
                                        Subscription
                                    </h4>
                                    <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                                        <p className="text-sm">
                                            <span className="font-medium capitalize">{editingMerchant.subscription_status}</span>
                                        </p>
                                    </div>
                                </div>
                            )}

                            {/* Account Stats (Read-only) */}
                            <div>
                                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                                    <Wallet className="w-4 h-4" />
                                    Account Stats
                                </h4>
                                <div className="grid gap-4 md:grid-cols-3">
                                    <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                                        <p className="text-xs text-gray-500 mb-1">Wallet Balance</p>
                                        <p className="text-lg font-semibold">${((editingMerchant.wallet_balance_cents ?? 0) / 100).toLocaleString()}</p>
                                    </div>
                                    <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                                        <p className="text-xs text-gray-500 mb-1">Stores</p>
                                        <p className="text-lg font-semibold">{editingMerchant.stores_count ?? '—'}</p>
                                    </div>
                                    <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                                        <p className="text-xs text-gray-500 mb-1">Lifetime Spend</p>
                                        <p className="text-lg font-semibold">${((editingMerchant.lifetime_spend_cents ?? 0) / 100).toLocaleString()}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Notes */}
                            <div>
                                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Admin Notes</label>
                                <textarea
                                    value={editingMerchant.notes ?? ''}
                                    onChange={(e) => setEditingMerchant({ ...editingMerchant, notes: e.target.value })}
                                    className="mt-1 w-full px-3 py-2 border rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white min-h-[80px]"
                                    placeholder="Internal notes about this merchant..."
                                />
                            </div>

                            {/* Actions */}
                            <div className="flex gap-3 pt-4 border-t">
                                <Button
                                    variant="outline"
                                    className="flex-1"
                                    onClick={() => {
                                        setEditModalOpen(false);
                                        setEditingMerchant(null);
                                    }}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    className="flex-1 bg-violet-600 hover:bg-violet-700"
                                    onClick={handleSaveMerchant}
                                    disabled={isSaving}
                                >
                                    {isSaving ? (
                                        <>
                                            <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                                            Saving...
                                        </>
                                    ) : (
                                        <>
                                            <Save className="w-4 h-4 mr-2" />
                                            Save Changes
                                        </>
                                    )}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    );
}
