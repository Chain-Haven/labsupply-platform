'use client';

import { useState } from 'react';
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
    Phone
} from 'lucide-react';
import { cn, formatRelativeTime } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';

// Merchant interface
interface Merchant {
    id: string;
    company_name: string;
    contact_email: string;
    contact_phone?: string;
    account_type: string;
    kyb_status: string;
    created_at: string;
    stores_count: number;
    lifetime_spend_cents: number;
    wallet_balance_cents?: number;
    notes?: string;
}

// Mock merchants data
const initialMerchants: Merchant[] = [
    {
        id: '1',
        company_name: 'Research Labs Inc',
        contact_email: 'admin@researchlabs.com',
        contact_phone: '+1 (555) 123-4567',
        account_type: 'reseller',
        kyb_status: 'approved',
        created_at: '2024-01-05T10:30:00Z',
        stores_count: 2,
        lifetime_spend_cents: 1250000,
        wallet_balance_cents: 75000,
        notes: 'Premium customer, expedited shipping',
    },
    {
        id: '2',
        company_name: 'BioTest Supply',
        contact_email: 'orders@biotest.com',
        contact_phone: '+1 (555) 234-5678',
        account_type: 'reseller',
        kyb_status: 'approved',
        created_at: '2024-01-03T14:20:00Z',
        stores_count: 1,
        lifetime_spend_cents: 890000,
        wallet_balance_cents: 45000,
        notes: '',
    },
    {
        id: '3',
        company_name: 'New Research Corp',
        contact_email: 'contact@newresearch.com',
        contact_phone: '+1 (555) 345-6789',
        account_type: 'reseller',
        kyb_status: 'pending',
        created_at: '2024-01-10T09:00:00Z',
        stores_count: 0,
        lifetime_spend_cents: 0,
        wallet_balance_cents: 0,
        notes: 'New applicant',
    },
    {
        id: '4',
        company_name: 'University of Science',
        contact_email: 'procurement@uos.edu',
        contact_phone: '+1 (555) 456-7890',
        account_type: 'institution',
        kyb_status: 'in_review',
        created_at: '2024-01-09T11:45:00Z',
        stores_count: 0,
        lifetime_spend_cents: 0,
        wallet_balance_cents: 0,
        notes: 'Educational institution, verify tax exempt status',
    },
    {
        id: '5',
        company_name: 'Peptide Traders LLC',
        contact_email: 'info@peptidetraders.com',
        contact_phone: '+1 (555) 567-8901',
        account_type: 'reseller',
        kyb_status: 'rejected',
        created_at: '2024-01-02T16:30:00Z',
        stores_count: 0,
        lifetime_spend_cents: 0,
        wallet_balance_cents: 0,
        notes: 'KYB rejected - failed compliance check',
    },
];

const statusFilters = [
    { value: 'all', label: 'All', count: 5 },
    { value: 'pending', label: 'Pending', count: 1 },
    { value: 'in_review', label: 'In Review', count: 1 },
    { value: 'approved', label: 'Approved', count: 2 },
    { value: 'rejected', label: 'Rejected', count: 1 },
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
    const [merchants, setMerchants] = useState<Merchant[]>(initialMerchants);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');

    // Edit modal state
    const [editModalOpen, setEditModalOpen] = useState(false);
    const [editingMerchant, setEditingMerchant] = useState<Merchant | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    const filteredMerchants = merchants.filter((merchant) => {
        const matchesSearch =
            merchant.company_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            merchant.contact_email.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesStatus = statusFilter === 'all' || merchant.kyb_status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    // Open edit modal
    const handleEditMerchant = (merchant: Merchant) => {
        setEditingMerchant({ ...merchant });
        setEditModalOpen(true);
    };

    // Save merchant changes
    const handleSaveMerchant = () => {
        if (!editingMerchant) return;

        setIsSaving(true);
        // Simulate API call
        setTimeout(() => {
            setMerchants(prev => prev.map(m =>
                m.id === editingMerchant.id ? editingMerchant : m
            ));
            setIsSaving(false);
            setEditModalOpen(false);
            setEditingMerchant(null);

            toast({
                title: 'Merchant updated',
                description: `${editingMerchant.company_name} has been updated successfully.`,
            });
        }, 1000);
    };

    // Update KYB status directly from table
    const handleQuickStatusUpdate = (merchantId: string, newStatus: string) => {
        setMerchants(prev => prev.map(m =>
            m.id === merchantId ? { ...m, kyb_status: newStatus } : m
        ));
        toast({
            title: 'Status updated',
            description: `KYB status changed to ${newStatus.replace('_', ' ')}.`,
        });
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
                                    {merchants.filter(m => m.kyb_status === filter.value).length}
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

            {/* Merchants Table */}
            <Card>
                <CardContent className="p-0">
                    <table className="w-full">
                        <thead className="bg-gray-50 dark:bg-gray-800/50 border-b">
                            <tr>
                                <th className="text-left p-4 text-sm font-medium text-gray-500">Company</th>
                                <th className="text-left p-4 text-sm font-medium text-gray-500">Type</th>
                                <th className="text-left p-4 text-sm font-medium text-gray-500">KYB Status</th>
                                <th className="text-right p-4 text-sm font-medium text-gray-500">Stores</th>
                                <th className="text-right p-4 text-sm font-medium text-gray-500">Lifetime Spend</th>
                                <th className="text-left p-4 text-sm font-medium text-gray-500">Joined</th>
                                <th className="text-right p-4 text-sm font-medium text-gray-500">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {filteredMerchants.map((merchant) => (
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
                                    <td className="p-4 text-gray-500 capitalize">{merchant.account_type}</td>
                                    <td className="p-4">
                                        <span className={cn(
                                            'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium',
                                            getStatusColor(merchant.kyb_status)
                                        )}>
                                            {getStatusIcon(merchant.kyb_status)}
                                            {merchant.kyb_status.replace('_', ' ')}
                                        </span>
                                    </td>
                                    <td className="p-4 text-right text-gray-500">{merchant.stores_count}</td>
                                    <td className="p-4 text-right font-medium text-gray-900 dark:text-white">
                                        ${(merchant.lifetime_spend_cents / 100).toLocaleString()}
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
                </CardContent>
            </Card>

            {filteredMerchants.length === 0 && (
                <Card>
                    <CardContent className="p-12 text-center">
                        <Users className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                        <h3 className="font-semibold text-gray-900 dark:text-white mb-2">No merchants found</h3>
                        <p className="text-gray-500">Try adjusting your search or filter criteria</p>
                    </CardContent>
                </Card>
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
                                            value={editingMerchant.account_type}
                                            onChange={(e) => setEditingMerchant({ ...editingMerchant, account_type: e.target.value })}
                                            className="mt-1 w-full px-3 py-2 border rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                                        >
                                            {accountTypeOptions.map(type => (
                                                <option key={type} value={type} className="capitalize">{type}</option>
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
                                            value={editingMerchant.contact_phone || ''}
                                            onChange={(e) => setEditingMerchant({ ...editingMerchant, contact_phone: e.target.value })}
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
                                    {kybStatusOptions.map(status => (
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

                            {/* Account Stats (Read-only) */}
                            <div>
                                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                                    <Wallet className="w-4 h-4" />
                                    Account Stats
                                </h4>
                                <div className="grid gap-4 md:grid-cols-3">
                                    <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                                        <p className="text-xs text-gray-500 mb-1">Wallet Balance</p>
                                        <p className="text-lg font-semibold">${((editingMerchant.wallet_balance_cents || 0) / 100).toLocaleString()}</p>
                                    </div>
                                    <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                                        <p className="text-xs text-gray-500 mb-1">Stores</p>
                                        <p className="text-lg font-semibold">{editingMerchant.stores_count}</p>
                                    </div>
                                    <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                                        <p className="text-xs text-gray-500 mb-1">Lifetime Spend</p>
                                        <p className="text-lg font-semibold">${(editingMerchant.lifetime_spend_cents / 100).toLocaleString()}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Notes */}
                            <div>
                                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Admin Notes</label>
                                <textarea
                                    value={editingMerchant.notes || ''}
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
