'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Wallet,
    ArrowUpRight,
    ArrowDownRight,
    Clock,
    CheckCircle,
    AlertCircle,
    Shield,
    Info,
    ExternalLink,
    Mail,
    DollarSign,
    FileText,
    Settings,
    Save,
} from 'lucide-react';
import { cn, formatCurrency, formatRelativeTime } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';
import { useMerchantAuth } from '@/lib/merchant-auth';

const COMPLIANCE_RESERVE_CENTS = 50000; // $500.00

interface MercuryInvoice {
    id: string;
    mercury_invoice_id: string;
    mercury_slug: string | null;
    amount_cents: number;
    status: 'Unpaid' | 'Processing' | 'Paid' | 'Cancelled';
    due_date: string;
    wallet_credited: boolean;
    created_at: string;
}

interface WalletTransaction {
    id: string;
    type: string;
    amount_cents: number;
    date: string;
    status: string;
    description: string;
}

const initialWalletData = {
    balance_cents: 0,
    reserved_cents: 0,
    compliance_reserve_cents: COMPLIANCE_RESERVE_CENTS,
    currency: 'USD',
};

export default function WalletPage() {
    const { user, merchant } = useMerchantAuth();
    const [walletData, setWalletData] = useState(initialWalletData);
    const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
    const [invoices, setInvoices] = useState<MercuryInvoice[]>([]);
    const [showSettings, setShowSettings] = useState(false);

    // Billing settings form
    const [billingEmail, setBillingEmail] = useState('');
    const [lowBalanceThreshold, setLowBalanceThreshold] = useState('1000');
    const [targetBalance, setTargetBalance] = useState('3000');
    const [savingSettings, setSavingSettings] = useState(false);

    const availableBalance = walletData.balance_cents - walletData.reserved_cents - COMPLIANCE_RESERVE_CENTS;
    const usableBalance = Math.max(0, availableBalance);
    const isComplianceMet = walletData.balance_cents >= COMPLIANCE_RESERVE_CENTS;

    const pendingInvoices = invoices.filter(inv => inv.status === 'Unpaid' || inv.status === 'Processing');
    const paidInvoices = invoices.filter(inv => inv.status === 'Paid');

    const loadBillingSettings = useCallback(() => {
        if (merchant) {
            setBillingEmail(merchant.billing_email || user?.email || '');
            setLowBalanceThreshold(
                String((merchant.low_balance_threshold_cents || 100000) / 100)
            );
            setTargetBalance(
                String((merchant.target_balance_cents || 300000) / 100)
            );
        }
    }, [merchant, user]);

    useEffect(() => {
        loadBillingSettings();
    }, [loadBillingSettings]);

    const handleSaveSettings = async () => {
        const threshold = parseInt(lowBalanceThreshold, 10);
        const target = parseInt(targetBalance, 10);

        if (!billingEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(billingEmail)) {
            toast({ title: 'Invalid email', description: 'Please enter a valid billing email.', variant: 'destructive' });
            return;
        }
        if (target < threshold) {
            toast({ title: 'Invalid settings', description: 'Target balance must be >= threshold.', variant: 'destructive' });
            return;
        }

        setSavingSettings(true);
        try {
            const response = await fetch('/api/v1/merchant/billing-settings', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    billing_email: billingEmail,
                    low_balance_threshold_cents: threshold * 100,
                    target_balance_cents: target * 100,
                }),
            });

            if (!response.ok) throw new Error('Failed to save settings');

            toast({ title: 'Settings saved', description: 'Your billing settings have been updated.' });
            setShowSettings(false);
        } catch {
            toast({ title: 'Error', description: 'Failed to save billing settings.', variant: 'destructive' });
        } finally {
            setSavingSettings(false);
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'Unpaid':
                return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">Unpaid</span>;
            case 'Processing':
                return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">Processing</span>;
            case 'Paid':
                return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">Paid</span>;
            case 'Cancelled':
                return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400">Cancelled</span>;
            default:
                return null;
        }
    };

    return (
        <div className="space-y-6 animate-in">
            {/* Page header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Wallet</h1>
                    <p className="text-gray-500 dark:text-gray-400">Manage your wallet funded via Mercury invoicing</p>
                </div>
                <Button
                    variant="outline"
                    onClick={() => { loadBillingSettings(); setShowSettings(!showSettings); }}
                    className="gap-2"
                >
                    <Settings className="w-4 h-4" />
                    Billing Settings
                </Button>
            </div>

            {/* Compliance Reserve Warning */}
            {!isComplianceMet && (
                <Card className="bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800">
                    <CardContent className="p-4 flex items-start gap-3">
                        <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5 shrink-0" />
                        <div>
                            <h4 className="font-medium text-red-900 dark:text-red-100">Compliance Reserve Required</h4>
                            <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                                Your wallet balance is below the mandatory $500.00 compliance reserve.
                                Order processing is suspended. Pay your outstanding invoice to fund your wallet.
                            </p>
                            <p className="text-sm font-medium text-red-800 dark:text-red-200 mt-2">
                                Amount needed: {formatCurrency(COMPLIANCE_RESERVE_CENTS - walletData.balance_cents)}
                            </p>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Billing Settings Panel */}
            {showSettings && (
                <Card className="border-violet-200 dark:border-violet-800">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Mail className="w-5 h-5 text-violet-500" />
                            Billing Settings
                        </CardTitle>
                        <CardDescription>
                            Configure your Mercury invoicing preferences
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                Invoice Email
                            </label>
                            <Input
                                type="email"
                                value={billingEmail}
                                onChange={(e) => setBillingEmail(e.target.value)}
                                placeholder="billing@yourcompany.com"
                                className="mt-1"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                    Auto-Invoice Threshold ($)
                                </label>
                                <div className="relative mt-1">
                                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                    <Input
                                        type="number"
                                        value={lowBalanceThreshold}
                                        onChange={(e) => setLowBalanceThreshold(e.target.value)}
                                        className="pl-8"
                                        min="100"
                                    />
                                </div>
                                <p className="text-xs text-gray-500 mt-1">Invoice sent when balance drops below this</p>
                            </div>
                            <div>
                                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                    Target Balance ($)
                                </label>
                                <div className="relative mt-1">
                                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                    <Input
                                        type="number"
                                        value={targetBalance}
                                        onChange={(e) => setTargetBalance(e.target.value)}
                                        className="pl-8"
                                        min="100"
                                    />
                                </div>
                                <p className="text-xs text-gray-500 mt-1">Invoice amount brings balance to this level</p>
                            </div>
                        </div>

                        <Button
                            onClick={handleSaveSettings}
                            disabled={savingSettings}
                            className="bg-violet-600 hover:bg-violet-700 gap-2"
                        >
                            <Save className="w-4 h-4" />
                            {savingSettings ? 'Saving...' : 'Save Settings'}
                        </Button>
                    </CardContent>
                </Card>
            )}

            {/* Balance Cards */}
            <div className="grid gap-4 md:grid-cols-4">
                <Card className="bg-gradient-to-br from-violet-600 to-indigo-600 text-white border-0">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-4">
                            <Wallet className="w-8 h-8 opacity-80" />
                            <span className="text-sm opacity-80">Available</span>
                        </div>
                        <p className="text-3xl font-bold">{formatCurrency(usableBalance)}</p>
                        <p className="text-sm opacity-80 mt-1">Ready to use for orders</p>
                    </CardContent>
                </Card>

                <Card className="border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-900/10">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-4">
                            <Shield className="w-8 h-8 text-amber-600" />
                            <span className="text-sm text-amber-700 dark:text-amber-400">Compliance</span>
                        </div>
                        <p className="text-3xl font-bold text-amber-900 dark:text-amber-100">
                            {formatCurrency(COMPLIANCE_RESERVE_CENTS)}
                        </p>
                        <p className="text-sm text-amber-700 dark:text-amber-400 mt-1">Mandatory reserve</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-4">
                            <Clock className="w-8 h-8 text-yellow-500" />
                            <span className="text-sm text-gray-500">Reserved</span>
                        </div>
                        <p className="text-3xl font-bold text-gray-900 dark:text-white">
                            {formatCurrency(walletData.reserved_cents)}
                        </p>
                        <p className="text-sm text-gray-500 mt-1">Held for pending orders</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-4">
                            <Wallet className="w-8 h-8 text-gray-400" />
                            <span className="text-sm text-gray-500">Total Balance</span>
                        </div>
                        <p className="text-3xl font-bold text-gray-900 dark:text-white">
                            {formatCurrency(walletData.balance_cents)}
                        </p>
                        <p className="text-sm text-gray-500 mt-1">{walletData.currency}</p>
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
                {/* Pending Invoices */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <FileText className="w-5 h-5" />
                            Pending Invoices
                        </CardTitle>
                        <CardDescription>
                            Pay outstanding invoices to fund your wallet
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {pendingInvoices.length === 0 ? (
                            <div className="text-center py-8 text-gray-500">
                                <FileText className="w-12 h-12 mx-auto mb-3 opacity-20" />
                                <p>No pending invoices</p>
                                <p className="text-sm mt-1">
                                    Invoices are generated automatically when your balance drops below your threshold.
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {pendingInvoices.map((invoice) => (
                                    <div
                                        key={invoice.id}
                                        className="p-4 rounded-lg border border-gray-200 dark:border-gray-700 space-y-3"
                                    >
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="font-semibold text-gray-900 dark:text-white">
                                                    {formatCurrency(invoice.amount_cents)}
                                                </p>
                                                <p className="text-xs text-gray-500">
                                                    Due {new Date(invoice.due_date).toLocaleDateString()}
                                                </p>
                                            </div>
                                            {getStatusBadge(invoice.status)}
                                        </div>

                                        {invoice.status === 'Unpaid' && invoice.mercury_slug && (
                                            <a
                                                href={`https://app.mercury.com/pay/${invoice.mercury_slug}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-violet-600 text-white text-sm font-medium hover:bg-violet-700 transition-colors w-full justify-center"
                                            >
                                                Pay Now
                                                <ExternalLink className="w-4 h-4" />
                                            </a>
                                        )}

                                        {invoice.status === 'Processing' && (
                                            <div className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400">
                                                <Clock className="w-4 h-4" />
                                                <span>Payment processing - funds will be available once settled</span>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Transaction History */}
                <Card>
                    <CardHeader>
                        <CardTitle>Recent Transactions</CardTitle>
                        <CardDescription>Your wallet activity</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {transactions.length === 0 ? (
                            <div className="text-center py-8 text-gray-500">
                                <Wallet className="w-12 h-12 mx-auto mb-3 opacity-20" />
                                <p>No transactions yet</p>
                                <p className="text-sm mt-1">Transactions will appear here when invoices are paid.</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {transactions.map((tx) => (
                                    <div key={tx.id} className="flex items-center justify-between py-3 border-b last:border-0">
                                        <div className="flex items-center gap-3">
                                            <div className={cn(
                                                'w-10 h-10 rounded-full flex items-center justify-center',
                                                tx.amount_cents > 0
                                                    ? 'bg-green-100 dark:bg-green-900/20'
                                                    : 'bg-gray-100 dark:bg-gray-800'
                                            )}>
                                                {tx.amount_cents > 0 ? (
                                                    <ArrowDownRight className="w-5 h-5 text-green-600" />
                                                ) : (
                                                    <ArrowUpRight className="w-5 h-5 text-gray-600" />
                                                )}
                                            </div>
                                            <div>
                                                <p className="font-medium text-gray-900 dark:text-white text-sm">
                                                    {tx.description}
                                                </p>
                                                <p className="text-xs text-gray-500">{formatRelativeTime(tx.date)}</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className={cn(
                                                'font-medium',
                                                tx.amount_cents > 0 ? 'text-green-600' : 'text-gray-900 dark:text-white'
                                            )}>
                                                {tx.amount_cents > 0 ? '+' : ''}{formatCurrency(tx.amount_cents)}
                                            </p>
                                            <div className="flex items-center gap-1 justify-end">
                                                {tx.status === 'completed' ? (
                                                    <CheckCircle className="w-3 h-3 text-green-500" />
                                                ) : (
                                                    <Clock className="w-3 h-3 text-yellow-500" />
                                                )}
                                                <span className="text-xs text-gray-500 capitalize">{tx.status}</span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Paid Invoice History */}
            {paidInvoices.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle>Invoice History</CardTitle>
                        <CardDescription>Previously paid invoices</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="divide-y">
                            {paidInvoices.map((invoice) => (
                                <div key={invoice.id} className="flex items-center justify-between py-3">
                                    <div className="flex items-center gap-3">
                                        <CheckCircle className="w-5 h-5 text-green-500" />
                                        <div>
                                            <p className="font-medium text-sm text-gray-900 dark:text-white">
                                                {formatCurrency(invoice.amount_cents)}
                                            </p>
                                            <p className="text-xs text-gray-500">
                                                Paid {new Date(invoice.created_at).toLocaleDateString()}
                                            </p>
                                        </div>
                                    </div>
                                    {getStatusBadge(invoice.status)}
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Compliance Reserve Info Box */}
            <Card className="bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800">
                <CardContent className="p-4 flex items-start gap-3">
                    <Shield className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
                    <div>
                        <h4 className="font-medium text-amber-900 dark:text-amber-100">$500 Compliance Reserve</h4>
                        <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                            A mandatory $500.00 compliance reserve is held in your wallet at all times.
                            This reserve cannot be used for orders and ensures you maintain good standing
                            with platform requirements.
                        </p>
                    </div>
                </CardContent>
            </Card>

            {/* How it works */}
            <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
                <CardContent className="p-4 flex items-start gap-3">
                    <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
                    <div>
                        <h4 className="font-medium text-blue-900 dark:text-blue-100">How Mercury Invoicing Works</h4>
                        <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                            When your available balance drops below your configured threshold, an invoice
                            is automatically sent to your billing email via Mercury. Pay via ACH using
                            the payment link in the invoice. Once your payment settles, the funds are
                            credited to your wallet and available for orders. Only settled payments
                            count toward your balance.
                        </p>
                    </div>
                </CardContent>
            </Card>

            <Card className="bg-sky-50 dark:bg-sky-900/20 border-sky-200 dark:border-sky-800">
                <CardContent className="p-4 flex items-start gap-3">
                    <DollarSign className="w-5 h-5 text-sky-600 dark:text-sky-400 mt-0.5 shrink-0" />
                    <div>
                        <h4 className="font-medium text-sky-900 dark:text-sky-100">Tip: Use Mercury for Faster Funding</h4>
                        <p className="text-sm text-sky-700 dark:text-sky-300 mt-1">
                            We recommend Mercury for your business bank. Mercury&apos;s fast ACH transfers
                            integrate seamlessly with our invoicing, so your wallet gets funded faster.
                            Free business checking with no monthly fees.
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
                </CardContent>
            </Card>
        </div>
    );
}
