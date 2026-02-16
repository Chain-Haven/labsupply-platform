'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Building,
    DollarSign,
    FileText,
    AlertCircle,
    CheckCircle,
    Clock,
    ExternalLink,
    RefreshCw,
    Send,
    XCircle,
    Users,
    Wallet,
    Settings,
    Save,
    CreditCard,
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

interface MercuryAccountInfo {
    name: string;
    availableBalance: number;
    currentBalance: number;
    status: string;
}

interface AdminInvoice {
    id: string;
    merchant_id: string;
    merchant_name: string;
    merchant_email: string;
    mercury_invoice_id: string;
    mercury_slug: string | null;
    amount_cents: number;
    status: string;
    due_date: string;
    wallet_credited: boolean;
    created_at: string;
}

interface MerchantBillingInfo {
    id: string;
    name: string;
    billing_email: string;
    low_balance_threshold_cents: number;
    target_balance_cents: number;
    balance_cents: number;
    reserved_cents: number;
    pending_invoice_count: number;
}

export default function AdminMercuryPage() {
    const [accountInfo, setAccountInfo] = useState<MercuryAccountInfo | null>(null);
    const [invoices, setInvoices] = useState<AdminInvoice[]>([]);
    const [merchants, setMerchants] = useState<MerchantBillingInfo[]>([]);
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [loading, setLoading] = useState(true);
    const [sendingInvoice, setSendingInvoice] = useState<string | null>(null);
    const [cancellingInvoice, setCancellingInvoice] = useState<string | null>(null);

    // Manual invoice form
    const [showManualInvoice, setShowManualInvoice] = useState(false);
    const [manualMerchantId, setManualMerchantId] = useState('');
    const [manualAmount, setManualAmount] = useState('');

    // Invoice settings (payment options + destination account)
    const [invoiceSettings, setInvoiceSettings] = useState({
        achDebitEnabled: true,
        creditCardEnabled: false,
        useRealAccountNumber: false,
        destinationAccountId: '',
    });
    const [allAccounts, setAllAccounts] = useState<Array<{ id: string; name: string }>>([]);
    const [savingSettings, setSavingSettings] = useState(false);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const [accountRes, invoicesRes, settingsRes] = await Promise.all([
                fetch('/api/v1/admin/mercury/account'),
                fetch('/api/v1/admin/mercury/invoices'),
                fetch('/api/v1/admin/mercury/account?include_all=true'),
            ]);

            if (accountRes.ok) {
                const accountData = await accountRes.json();
                setAccountInfo(accountData.data);
                // Set default destination account if not set
                if (!invoiceSettings.destinationAccountId && accountData.data?.id) {
                    setInvoiceSettings(prev => ({ ...prev, destinationAccountId: accountData.data.id }));
                }
            }

            if (invoicesRes.ok) {
                const invoicesData = await invoicesRes.json();
                setInvoices(invoicesData.data?.invoices || []);
                setMerchants(invoicesData.data?.merchants || []);
                // Load saved invoice settings if returned
                if (invoicesData.data?.invoiceSettings) {
                    setInvoiceSettings(prev => ({ ...prev, ...invoicesData.data.invoiceSettings }));
                }
            }

            if (settingsRes.ok) {
                const settingsData = await settingsRes.json();
                if (settingsData.data?.allAccounts) {
                    setAllAccounts(settingsData.data.allAccounts);
                }
            }
        } catch (err) {
            console.error('Error loading Mercury data:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleSendInvoice = async (merchantId: string, amount?: number) => {
        setSendingInvoice(merchantId);
        try {
            const response = await fetch('/api/v1/admin/mercury/invoices', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    merchant_id: merchantId,
                    amount_cents: amount ? amount * 100 : undefined,
                    achDebitEnabled: invoiceSettings.achDebitEnabled,
                    creditCardEnabled: invoiceSettings.creditCardEnabled,
                    useRealAccountNumber: invoiceSettings.useRealAccountNumber,
                    destinationAccountId: invoiceSettings.destinationAccountId || undefined,
                }),
            });

            if (!response.ok) throw new Error('Failed to create invoice');

            await loadData();
        } catch (err) {
            console.error('Error sending invoice:', err);
        } finally {
            setSendingInvoice(null);
        }
    };

    const handleCancelInvoice = async (invoiceId: string) => {
        setCancellingInvoice(invoiceId);
        try {
            const response = await fetch(`/api/v1/admin/mercury/invoices?action=cancel&id=${invoiceId}`, {
                method: 'POST',
            });

            if (!response.ok) throw new Error('Failed to cancel invoice');

            await loadData();
        } catch (err) {
            console.error('Error cancelling invoice:', err);
        } finally {
            setCancellingInvoice(null);
        }
    };

    const filteredInvoices = statusFilter === 'all'
        ? invoices
        : invoices.filter(inv => inv.status === statusFilter);

    const totalOutstanding = invoices
        .filter(inv => inv.status === 'Unpaid' || inv.status === 'Processing')
        .reduce((sum, inv) => sum + inv.amount_cents, 0);

    const totalPaidThisMonth = invoices
        .filter(inv => inv.status === 'Paid')
        .reduce((sum, inv) => sum + inv.amount_cents, 0);

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'Unpaid': return <Clock className="w-4 h-4 text-yellow-500" />;
            case 'Processing': return <RefreshCw className="w-4 h-4 text-blue-500" />;
            case 'Paid': return <CheckCircle className="w-4 h-4 text-green-500" />;
            case 'Cancelled': return <XCircle className="w-4 h-4 text-gray-500" />;
            default: return null;
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Mercury Invoicing</h1>
                    <p className="text-gray-500 dark:text-gray-400">
                        Manage Mercury account, invoices, and merchant billing
                    </p>
                </div>
                <Button onClick={loadData} variant="outline" className="gap-2">
                    <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    Refresh
                </Button>
            </div>

            {/* Summary Cards */}
            <div className="grid gap-4 md:grid-cols-4">
                <Card className="bg-gradient-to-br from-emerald-600 to-teal-600 text-white border-0">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-3">
                            <Building className="w-6 h-6 opacity-80" />
                            <span className="text-sm opacity-80">Mercury Balance</span>
                        </div>
                        <p className="text-3xl font-bold">
                            {accountInfo ? `$${accountInfo.availableBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}` : '---'}
                        </p>
                        <p className="text-sm opacity-80 mt-1">{accountInfo?.name || 'Loading...'}</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-3">
                            <AlertCircle className="w-6 h-6 text-yellow-500" />
                            <span className="text-sm text-gray-500">Outstanding</span>
                        </div>
                        <p className="text-3xl font-bold text-gray-900 dark:text-white">
                            {formatCurrency(totalOutstanding)}
                        </p>
                        <p className="text-sm text-gray-500 mt-1">
                            {invoices.filter(i => i.status === 'Unpaid').length} unpaid invoices
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-3">
                            <CheckCircle className="w-6 h-6 text-green-500" />
                            <span className="text-sm text-gray-500">Collected</span>
                        </div>
                        <p className="text-3xl font-bold text-gray-900 dark:text-white">
                            {formatCurrency(totalPaidThisMonth)}
                        </p>
                        <p className="text-sm text-gray-500 mt-1">
                            {invoices.filter(i => i.status === 'Paid').length} paid invoices
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-3">
                            <Users className="w-6 h-6 text-violet-500" />
                            <span className="text-sm text-gray-500">Merchants</span>
                        </div>
                        <p className="text-3xl font-bold text-gray-900 dark:text-white">
                            {merchants.length}
                        </p>
                        <p className="text-sm text-gray-500 mt-1">With Mercury billing</p>
                    </CardContent>
                </Card>
            </div>

            {/* Invoice Settings */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Settings className="w-5 h-5" />
                        Invoice Settings
                    </CardTitle>
                    <CardDescription>Configure payment options and destination account for outgoing invoices</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid gap-6 md:grid-cols-2">
                        {/* Payment Methods */}
                        <div className="space-y-4">
                            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">Accepted Payment Methods</h4>
                            <div className="space-y-3">
                                <label className="flex items-center justify-between p-3 rounded-lg border cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800">
                                    <div className="flex items-center gap-3">
                                        <Building className="w-5 h-5 text-blue-500" />
                                        <div>
                                            <p className="font-medium text-sm">ACH / Bank Transfer</p>
                                            <p className="text-xs text-gray-500">Merchant pays via bank transfer (recommended)</p>
                                        </div>
                                    </div>
                                    <input
                                        type="checkbox"
                                        checked={invoiceSettings.achDebitEnabled}
                                        onChange={(e) => setInvoiceSettings(prev => ({ ...prev, achDebitEnabled: e.target.checked }))}
                                        className="h-4 w-4 rounded border-gray-300 text-violet-600 focus:ring-violet-500"
                                    />
                                </label>
                                <label className="flex items-center justify-between p-3 rounded-lg border cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800">
                                    <div className="flex items-center gap-3">
                                        <CreditCard className="w-5 h-5 text-orange-500" />
                                        <div>
                                            <p className="font-medium text-sm">Credit Card</p>
                                            <p className="text-xs text-gray-500">Requires Stripe connected to Mercury account</p>
                                        </div>
                                    </div>
                                    <input
                                        type="checkbox"
                                        checked={invoiceSettings.creditCardEnabled}
                                        onChange={(e) => setInvoiceSettings(prev => ({ ...prev, creditCardEnabled: e.target.checked }))}
                                        className="h-4 w-4 rounded border-gray-300 text-violet-600 focus:ring-violet-500"
                                    />
                                </label>
                            </div>
                            <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                                <input
                                    type="checkbox"
                                    checked={invoiceSettings.useRealAccountNumber}
                                    onChange={(e) => setInvoiceSettings(prev => ({ ...prev, useRealAccountNumber: e.target.checked }))}
                                    className="h-4 w-4 rounded border-gray-300 text-violet-600 focus:ring-violet-500"
                                />
                                Show real account/routing numbers (instead of virtual numbers)
                            </label>
                        </div>

                        {/* Destination Account */}
                        <div className="space-y-4">
                            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">Deposit Account</h4>
                            <p className="text-xs text-gray-500">Mercury account where invoice payments are deposited</p>
                            <select
                                value={invoiceSettings.destinationAccountId}
                                onChange={(e) => setInvoiceSettings(prev => ({ ...prev, destinationAccountId: e.target.value }))}
                                className="w-full rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-2.5 text-sm"
                            >
                                {accountInfo && (
                                    <option value={accountInfo.name}>
                                        {accountInfo.name} (${accountInfo.availableBalance?.toLocaleString('en-US', { minimumFractionDigits: 2 })})
                                    </option>
                                )}
                                {allAccounts.filter(a => a.id !== accountInfo?.name).map(acct => (
                                    <option key={acct.id} value={acct.id}>{acct.name}</option>
                                ))}
                                {!accountInfo && allAccounts.length === 0 && (
                                    <option value="">Using MERCURY_ACCOUNT_ID from env</option>
                                )}
                            </select>
                            <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
                                <p className="text-xs text-blue-700 dark:text-blue-300">
                                    If no account is selected, invoices will use the <code className="bg-blue-100 dark:bg-blue-800 px-1 rounded">MERCURY_ACCOUNT_ID</code> environment variable.
                                </p>
                            </div>
                        </div>
                    </div>
                    <div className="mt-4 pt-4 border-t flex items-center gap-3">
                        <p className="text-xs text-gray-500 flex-1">
                            These settings apply to all new invoices (manual and automatic). Existing invoices are not affected.
                        </p>
                    </div>
                </CardContent>
            </Card>

            {/* Merchant Billing Overview */}
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="flex items-center gap-2">
                                <Wallet className="w-5 h-5" />
                                Merchant Billing Overview
                            </CardTitle>
                            <CardDescription>Per-merchant balance and billing status</CardDescription>
                        </div>
                        <Button
                            variant="outline"
                            size="sm"
                            className="gap-2"
                            onClick={() => setShowManualInvoice(!showManualInvoice)}
                        >
                            <Send className="w-4 h-4" />
                            Manual Invoice
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    {showManualInvoice && (
                        <div className="mb-6 p-4 rounded-lg border border-violet-200 dark:border-violet-800 bg-violet-50 dark:bg-violet-900/10 space-y-3">
                            <h4 className="font-medium">Send Manual Invoice</h4>
                            <div className="grid grid-cols-3 gap-3">
                                <select
                                    className="rounded-md border p-2 text-sm"
                                    value={manualMerchantId}
                                    onChange={(e) => setManualMerchantId(e.target.value)}
                                >
                                    <option value="">Select merchant...</option>
                                    {merchants.map(m => (
                                        <option key={m.id} value={m.id}>{m.name}</option>
                                    ))}
                                </select>
                                <div className="relative">
                                    <DollarSign className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                    <Input
                                        type="number"
                                        placeholder="Amount"
                                        value={manualAmount}
                                        onChange={(e) => setManualAmount(e.target.value)}
                                        className="pl-7"
                                        min="100"
                                    />
                                </div>
                                <Button
                                    onClick={() => {
                                        if (manualMerchantId && manualAmount) {
                                            handleSendInvoice(manualMerchantId, parseFloat(manualAmount));
                                            setShowManualInvoice(false);
                                            setManualAmount('');
                                            setManualMerchantId('');
                                        }
                                    }}
                                    disabled={!manualMerchantId || !manualAmount}
                                    className="bg-violet-600 hover:bg-violet-700"
                                >
                                    Send Invoice
                                </Button>
                            </div>
                        </div>
                    )}

                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b text-left text-gray-500">
                                    <th className="pb-3 font-medium">Merchant</th>
                                    <th className="pb-3 font-medium">Email</th>
                                    <th className="pb-3 font-medium text-right">Balance</th>
                                    <th className="pb-3 font-medium text-right">Threshold</th>
                                    <th className="pb-3 font-medium text-right">Target</th>
                                    <th className="pb-3 font-medium text-center">Pending</th>
                                    <th className="pb-3 font-medium text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {merchants.map((m) => {
                                    const available = m.balance_cents - m.reserved_cents - 50000;
                                    const belowThreshold = available < m.low_balance_threshold_cents;

                                    return (
                                        <tr key={m.id} className={belowThreshold ? 'bg-red-50 dark:bg-red-900/10' : ''}>
                                            <td className="py-3 font-medium text-gray-900 dark:text-white">{m.name}</td>
                                            <td className="py-3 text-gray-500">{m.billing_email}</td>
                                            <td className="py-3 text-right font-mono">
                                                {formatCurrency(available)}
                                            </td>
                                            <td className="py-3 text-right font-mono text-gray-500">
                                                {formatCurrency(m.low_balance_threshold_cents)}
                                            </td>
                                            <td className="py-3 text-right font-mono text-gray-500">
                                                {formatCurrency(m.target_balance_cents)}
                                            </td>
                                            <td className="py-3 text-center">
                                                {m.pending_invoice_count > 0 ? (
                                                    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                                        {m.pending_invoice_count}
                                                    </span>
                                                ) : (
                                                    <span className="text-gray-400">-</span>
                                                )}
                                            </td>
                                            <td className="py-3 text-right">
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    onClick={() => handleSendInvoice(m.id)}
                                                    disabled={sendingInvoice === m.id || m.pending_invoice_count > 0}
                                                    className="gap-1 text-xs"
                                                >
                                                    <Send className="w-3 h-3" />
                                                    Invoice
                                                </Button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>

            {/* Invoice List */}
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="flex items-center gap-2">
                                <FileText className="w-5 h-5" />
                                All Invoices
                            </CardTitle>
                            <CardDescription>Mercury invoices across all merchants</CardDescription>
                        </div>
                        <div className="flex gap-2">
                            {['all', 'Unpaid', 'Processing', 'Paid', 'Cancelled'].map((filter) => (
                                <Button
                                    key={filter}
                                    size="sm"
                                    variant={statusFilter === filter ? 'default' : 'outline'}
                                    onClick={() => setStatusFilter(filter)}
                                    className={statusFilter === filter ? 'bg-violet-600' : ''}
                                >
                                    {filter === 'all' ? 'All' : filter}
                                </Button>
                            ))}
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="space-y-3">
                        {filteredInvoices.length === 0 ? (
                            <p className="text-center py-8 text-gray-500">No invoices found</p>
                        ) : (
                            filteredInvoices.map((invoice) => (
                                <div
                                    key={invoice.id}
                                    className="flex items-center justify-between p-4 rounded-lg border"
                                >
                                    <div className="flex items-center gap-4">
                                        {getStatusIcon(invoice.status)}
                                        <div>
                                            <p className="font-medium text-gray-900 dark:text-white">
                                                {invoice.merchant_name}
                                            </p>
                                            <p className="text-xs text-gray-500">
                                                {invoice.mercury_invoice_id} | Due {new Date(invoice.due_date).toLocaleDateString()}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <p className="font-semibold font-mono">
                                            {formatCurrency(invoice.amount_cents)}
                                        </p>
                                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                            invoice.status === 'Paid' ? 'bg-green-100 text-green-800' :
                                            invoice.status === 'Processing' ? 'bg-blue-100 text-blue-800' :
                                            invoice.status === 'Unpaid' ? 'bg-yellow-100 text-yellow-800' :
                                            'bg-gray-100 text-gray-800'
                                        }`}>
                                            {invoice.status}
                                        </span>
                                        {invoice.status === 'Unpaid' && (
                                            <div className="flex gap-2">
                                                {invoice.mercury_slug && (
                                                    <a
                                                        href={`https://app.mercury.com/pay/${invoice.mercury_slug}`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-violet-600 hover:text-violet-500"
                                                    >
                                                        <ExternalLink className="w-4 h-4" />
                                                    </a>
                                                )}
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    onClick={() => handleCancelInvoice(invoice.id)}
                                                    disabled={cancellingInvoice === invoice.id}
                                                    className="text-red-600 hover:text-red-500 text-xs"
                                                >
                                                    <XCircle className="w-3 h-3" />
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
