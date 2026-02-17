'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    LogOut,
    Clock,
    CheckCircle,
    XCircle,
    RefreshCw,
    DollarSign,
    Bitcoin,
    AlertTriangle,
    Loader2,
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface WithdrawalRequest {
    id: string;
    merchant_id: string;
    currency: string;
    amount_minor: number;
    payout_email: string | null;
    payout_btc_address: string | null;
    status: string;
    merchant_name_snapshot: string;
    merchant_email_snapshot: string;
    closure_confirmed_at: string | null;
    requested_at: string;
    completed_at: string | null;
    admin_notes: string | null;
}

export default function AdminWithdrawalsPage() {
    const [requests, setRequests] = useState<WithdrawalRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState('');
    const [processingId, setProcessingId] = useState<string | null>(null);
    const [adminNotes, setAdminNotes] = useState<Record<string, string>>({});

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const url = `/api/v1/admin/withdrawals${statusFilter ? `?status=${statusFilter}` : ''}`;
            const response = await fetch(url);
            if (response.ok) {
                const { data } = await response.json();
                setRequests(data || []);
            }
        } catch (err) {
            console.error('Failed to load withdrawals:', err);
        } finally {
            setLoading(false);
        }
    }, [statusFilter]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const handleUpdateStatus = async (id: string, status: string) => {
        setProcessingId(id);
        try {
            const response = await fetch('/api/v1/admin/withdrawals', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    withdrawal_id: id,
                    status,
                    admin_notes: adminNotes[id] || undefined,
                }),
            });

            if (!response.ok) {
                const { error } = await response.json();
                throw new Error(error || 'Update failed');
            }

            toast({
                title: 'Updated',
                description: `Withdrawal marked as ${status}.${status === 'COMPLETED' ? ' Merchant account has been closed.' : ''}`,
            });
            loadData();
        } catch (err) {
            toast({ title: 'Error', description: (err as Error).message, variant: 'destructive' });
        } finally {
            setProcessingId(null);
        }
    };

    const formatAmount = (currency: string, amount: number) => {
        if (currency === 'USD') {
            return `$${(amount / 100).toFixed(2)} USD`;
        }
        return `${(amount / 100_000_000).toFixed(8)} BTC (${amount.toLocaleString()} sats)`;
    };

    const getStatusBadge = (status: string) => {
        const styles: Record<string, { bg: string; icon: typeof Clock }> = {
            PENDING_ADMIN: { bg: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400', icon: Clock },
            PROCESSING: { bg: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400', icon: Loader2 },
            COMPLETED: { bg: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400', icon: CheckCircle },
            REJECTED: { bg: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400', icon: XCircle },
        };

        const style = styles[status] || styles.PENDING_ADMIN;
        const Icon = style.icon;

        return (
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${style.bg}`}>
                <Icon className="w-3 h-3" />
                {status.replace('_', ' ')}
            </span>
        );
    };

    const pendingCount = requests.filter(r => r.status === 'PENDING_ADMIN').length;
    const processingCount = requests.filter(r => r.status === 'PROCESSING').length;

    return (
        <div className="space-y-6 animate-in">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Withdrawal Requests</h1>
                    <p className="text-gray-500 dark:text-gray-400">
                        Process merchant withdrawal and account closure requests
                    </p>
                </div>
                <Button variant="outline" onClick={loadData} className="gap-2">
                    <RefreshCw className="w-4 h-4" />
                    Refresh
                </Button>
            </div>

            {/* Summary */}
            <div className="grid gap-4 md:grid-cols-3">
                <Card className={pendingCount > 0 ? 'border-yellow-300 dark:border-yellow-700' : ''}>
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-2">
                            <Clock className="w-6 h-6 text-yellow-500" />
                            <span className="text-sm text-gray-500">Pending</span>
                        </div>
                        <p className="text-2xl font-bold text-gray-900 dark:text-white">{pendingCount}</p>
                        <p className="text-sm text-gray-500">Awaiting admin review</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-2">
                            <Loader2 className="w-6 h-6 text-blue-500" />
                            <span className="text-sm text-gray-500">Processing</span>
                        </div>
                        <p className="text-2xl font-bold text-gray-900 dark:text-white">{processingCount}</p>
                        <p className="text-sm text-gray-500">Being processed</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-2">
                            <CheckCircle className="w-6 h-6 text-green-500" />
                            <span className="text-sm text-gray-500">Total</span>
                        </div>
                        <p className="text-2xl font-bold text-gray-900 dark:text-white">{requests.length}</p>
                        <p className="text-sm text-gray-500">All-time requests</p>
                    </CardContent>
                </Card>
            </div>

            {/* Filter */}
            <div className="flex gap-2">
                {['', 'PENDING_ADMIN', 'PROCESSING', 'COMPLETED', 'REJECTED'].map((filter) => (
                    <Button
                        key={filter || 'all'}
                        variant={statusFilter === filter ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setStatusFilter(filter)}
                    >
                        {filter ? filter.replace('_', ' ') : 'All'}
                    </Button>
                ))}
            </div>

            {/* Request list */}
            {loading ? (
                <div className="flex items-center justify-center h-32">
                    <RefreshCw className="w-6 h-6 animate-spin text-gray-400" />
                </div>
            ) : requests.length === 0 ? (
                <Card>
                    <CardContent className="p-8 text-center text-gray-500">
                        <LogOut className="w-12 h-12 mx-auto mb-3 opacity-20" />
                        <p>No withdrawal requests</p>
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-4">
                    {requests.map((req) => (
                        <Card key={req.id} className={req.status === 'PENDING_ADMIN' ? 'border-yellow-200 dark:border-yellow-800' : ''}>
                            <CardContent className="p-6">
                                <div className="flex items-start justify-between mb-4">
                                    <div>
                                        <div className="flex items-center gap-3 mb-1">
                                            <h3 className="font-bold text-gray-900 dark:text-white">
                                                {req.merchant_name_snapshot}
                                            </h3>
                                            {getStatusBadge(req.status)}
                                        </div>
                                        <p className="text-sm text-gray-500">{req.merchant_email_snapshot}</p>
                                    </div>
                                    <div className="text-right">
                                        <div className="flex items-center gap-1 mb-1">
                                            {req.currency === 'USD' ? (
                                                <DollarSign className="w-4 h-4 text-violet-500" />
                                            ) : (
                                                <Bitcoin className="w-4 h-4 text-orange-500" />
                                            )}
                                            <span className="font-bold text-lg">
                                                {formatAmount(req.currency, req.amount_minor)}
                                            </span>
                                        </div>
                                        <p className="text-xs text-gray-500">
                                            Requested {new Date(req.requested_at).toLocaleString()}
                                        </p>
                                    </div>
                                </div>

                                <div className="grid gap-3 md:grid-cols-2 text-sm">
                                    <div>
                                        <span className="text-gray-500">Destination:</span>{' '}
                                        <span className="font-mono">
                                            {req.currency === 'USD' ? req.payout_email : req.payout_btc_address}
                                        </span>
                                    </div>
                                    <div>
                                        <span className="text-gray-500">Closure confirmed:</span>{' '}
                                        {req.closure_confirmed_at
                                            ? new Date(req.closure_confirmed_at).toLocaleString()
                                            : 'N/A'}
                                    </div>
                                </div>

                                {/* Admin actions for pending requests */}
                                {(req.status === 'PENDING_ADMIN' || req.status === 'PROCESSING') && (
                                    <div className="mt-4 pt-4 border-t space-y-3">
                                        <div>
                                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                                Admin Notes
                                            </label>
                                            <Input
                                                value={adminNotes[req.id] || ''}
                                                onChange={(e) =>
                                                    setAdminNotes(prev => ({ ...prev, [req.id]: e.target.value }))
                                                }
                                                placeholder="Optional notes..."
                                                className="mt-1"
                                            />
                                        </div>
                                        <div className="flex gap-2">
                                            {req.status === 'PENDING_ADMIN' && (
                                                <Button
                                                    onClick={() => handleUpdateStatus(req.id, 'PROCESSING')}
                                                    disabled={processingId === req.id}
                                                    className="bg-blue-600 hover:bg-blue-700 gap-2"
                                                    size="sm"
                                                >
                                                    <Loader2 className="w-4 h-4" />
                                                    Mark Processing
                                                </Button>
                                            )}
                                            <Button
                                                onClick={() => handleUpdateStatus(req.id, 'COMPLETED')}
                                                disabled={processingId === req.id}
                                                className="bg-green-600 hover:bg-green-700 gap-2"
                                                size="sm"
                                            >
                                                <CheckCircle className="w-4 h-4" />
                                                Complete (Close Account)
                                            </Button>
                                            <Button
                                                onClick={() => handleUpdateStatus(req.id, 'REJECTED')}
                                                disabled={processingId === req.id}
                                                variant="outline"
                                                className="text-red-600 gap-2"
                                                size="sm"
                                            >
                                                <XCircle className="w-4 h-4" />
                                                Reject
                                            </Button>
                                        </div>
                                    </div>
                                )}

                                {/* Completed/Rejected info */}
                                {req.status === 'COMPLETED' && (
                                    <div className="mt-4 pt-4 border-t">
                                        <div className="flex items-center gap-2 text-green-600">
                                            <CheckCircle className="w-4 h-4" />
                                            <span className="text-sm">
                                                Completed {req.completed_at ? new Date(req.completed_at).toLocaleString() : ''}
                                            </span>
                                        </div>
                                        {req.admin_notes && (
                                            <p className="text-sm text-gray-500 mt-1">Notes: {req.admin_notes}</p>
                                        )}
                                    </div>
                                )}

                                {req.status === 'REJECTED' && (
                                    <div className="mt-4 pt-4 border-t">
                                        <div className="flex items-center gap-2 text-red-600">
                                            <XCircle className="w-4 h-4" />
                                            <span className="text-sm">Rejected</span>
                                        </div>
                                        {req.admin_notes && (
                                            <p className="text-sm text-gray-500 mt-1">Reason: {req.admin_notes}</p>
                                        )}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            {/* Warning box */}
            <Card className="bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800">
                <CardContent className="p-4 flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
                    <div>
                        <h4 className="font-medium text-amber-900 dark:text-amber-100">Important</h4>
                        <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                            Completing a withdrawal will permanently close the merchant&apos;s account and deduct
                            the withdrawal amount from their wallet. This action cannot be undone.
                            USD withdrawals must be sent to the specified email, BTC withdrawals to the
                            specified BTC address.
                        </p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
