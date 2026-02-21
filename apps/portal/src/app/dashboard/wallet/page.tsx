'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import QRCode from 'react-qr-code';
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
    Bitcoin,
    Copy,
    LogOut,
    AlertTriangle,
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

interface BtcDeposit {
    id: string;
    txid: string;
    vout: number;
    amount_sats: number;
    confirmations: number;
    status: string;
    first_seen_at: string;
}

interface BtcWalletData {
    balance_sats: number;
    reserved_sats: number;
    available_sats: number;
    balance_btc: string;
    pending_deposits: number;
}

type FundingMode = 'bank' | 'btc';

const initialWalletData = {
    balance_cents: 0,
    reserved_cents: 0,
    compliance_reserve_cents: COMPLIANCE_RESERVE_CENTS,
    currency: 'USD',
};

const initialBtcWallet: BtcWalletData = {
    balance_sats: 0,
    reserved_sats: 0,
    available_sats: 0,
    balance_btc: '0.00000000',
    pending_deposits: 0,
};

function formatSats(sats: number): string {
    return sats.toLocaleString();
}

function formatBtc(sats: number): string {
    return (sats / 100_000_000).toFixed(8);
}

export default function WalletPage() {
    const { user, merchant } = useMerchantAuth();
    const [walletData, setWalletData] = useState(initialWalletData);
    const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
    const [invoices, setInvoices] = useState<MercuryInvoice[]>([]);
    const [showSettings, setShowSettings] = useState(false);
    const [fundingMode, setFundingMode] = useState<FundingMode>('bank');

    // BTC state
    const [btcWallet, setBtcWallet] = useState<BtcWalletData>(initialBtcWallet);
    const [btcAddress, setBtcAddress] = useState<string | null>(null);
    const [btcAddressMessage, setBtcAddressMessage] = useState<string | null>(null);
    const [btcDeposits, setBtcDeposits] = useState<BtcDeposit[]>([]);
    const [loadingBtc, setLoadingBtc] = useState(false);

    // Withdrawal modal
    const [showWithdrawModal, setShowWithdrawModal] = useState(false);
    const [withdrawCurrency, setWithdrawCurrency] = useState<'USD' | 'BTC'>('USD');
    const [withdrawEmail, setWithdrawEmail] = useState('');
    const [withdrawBtcAddress, setWithdrawBtcAddress] = useState('');
    const [withdrawConfirmed, setWithdrawConfirmed] = useState(false);
    const [submittingWithdraw, setSubmittingWithdraw] = useState(false);

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

    const pendingBtcDeposits = btcDeposits.filter(d => d.status === 'PENDING' || d.status === 'CONFIRMED');
    const creditedBtcDeposits = btcDeposits.filter(d => d.status === 'CREDITED');

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

    // Load BTC data
    const loadBtcData = useCallback(async () => {
        setLoadingBtc(true);
        try {
            const [walletRes, addressRes, depositsRes] = await Promise.all([
                fetch('/api/v1/merchant/btc-wallet'),
                fetch('/api/v1/merchant/btc-address'),
                fetch('/api/v1/merchant/btc-deposits'),
            ]);

            if (walletRes.ok) {
                const { data } = await walletRes.json();
                if (data) setBtcWallet(data);
            }

            if (addressRes.ok) {
                const { data, message } = await addressRes.json();
                if (data) {
                    setBtcAddress(data.address);
                    setBtcAddressMessage(null);
                } else {
                    setBtcAddress(null);
                    setBtcAddressMessage(message || 'BTC deposits not available');
                }
            }

            if (depositsRes.ok) {
                const { data } = await depositsRes.json();
                if (data) setBtcDeposits(data);
            }
        } catch {
            console.error('Failed to load BTC data');
        } finally {
            setLoadingBtc(false);
        }
    }, []);

    useEffect(() => {
        loadBtcData();
    }, [loadBtcData]);

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

    const handleCopyAddress = () => {
        if (btcAddress) {
            navigator.clipboard.writeText(btcAddress);
            toast({ title: 'Copied', description: 'BTC address copied to clipboard.' });
        }
    };

    const handleWithdraw = async () => {
        if (!withdrawConfirmed) {
            toast({ title: 'Confirmation required', description: 'Please confirm the permanent closure checkbox.', variant: 'destructive' });
            return;
        }

        setSubmittingWithdraw(true);
        try {
            const response = await fetch('/api/v1/merchant/withdraw', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    currency: withdrawCurrency,
                    payout_email: withdrawCurrency === 'USD' ? withdrawEmail : undefined,
                    payout_btc_address: withdrawCurrency === 'BTC' ? withdrawBtcAddress : undefined,
                }),
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'Withdrawal failed');
            }

            toast({
                title: 'Withdrawal Submitted',
                description: 'Your withdrawal request has been submitted. Your account will be closed.',
            });
            setShowWithdrawModal(false);
        } catch (err) {
            toast({
                title: 'Error',
                description: (err as Error).message,
                variant: 'destructive',
            });
        } finally {
            setSubmittingWithdraw(false);
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

    const getBtcDepositStatusBadge = (status: string) => {
        switch (status) {
            case 'PENDING':
                return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">Pending</span>;
            case 'CONFIRMED':
                return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">Confirmed</span>;
            case 'CREDITED':
                return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">Credited</span>;
            case 'FLAGGED':
                return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">Flagged</span>;
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
                    <p className="text-gray-500 dark:text-gray-400">Manage your USD and BTC wallets</p>
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        onClick={() => setShowWithdrawModal(true)}
                        className="gap-2 text-red-600 border-red-200 hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-900/20"
                    >
                        <LogOut className="w-4 h-4" />
                        Request Withdrawal
                    </Button>
                    <Button
                        variant="outline"
                        onClick={() => { loadBillingSettings(); setShowSettings(!showSettings); }}
                        className="gap-2"
                    >
                        <Settings className="w-4 h-4" />
                        Billing Settings
                    </Button>
                </div>
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

            {/* Balance Cards -- USD + BTC side by side */}
            <div className="grid gap-4 grid-cols-2 lg:grid-cols-5">
                {/* USD Available */}
                <Card className="bg-gradient-to-br from-violet-600 to-indigo-600 text-white border-0 overflow-hidden">
                    <CardContent className="p-6 min-w-0">
                        <div className="flex items-center justify-between mb-4">
                            <Wallet className="w-8 h-8 opacity-80" />
                            <span className="text-sm opacity-80">USD Available</span>
                        </div>
                        <p className="text-2xl lg:text-xl xl:text-2xl font-bold truncate">{formatCurrency(usableBalance)}</p>
                        <p className="text-sm opacity-80 mt-1">Ready for orders</p>
                    </CardContent>
                </Card>

                {/* BTC Balance */}
                <Card className="bg-gradient-to-br from-orange-500 to-amber-600 text-white border-0 overflow-hidden">
                    <CardContent className="p-6 min-w-0">
                        <div className="flex items-center justify-between mb-4">
                            <Bitcoin className="w-8 h-8 opacity-80" />
                            <span className="text-sm opacity-80">BTC Balance</span>
                        </div>
                        <p className="text-xl sm:text-2xl lg:text-xl xl:text-2xl font-bold truncate" title={formatBtc(btcWallet.balance_sats) + ' BTC'}>
                            {formatBtc(btcWallet.balance_sats)}
                        </p>
                        <p className="text-sm opacity-80 mt-1 truncate">{formatSats(btcWallet.balance_sats)} sats</p>
                    </CardContent>
                </Card>

                {/* Compliance Reserve */}
                <Card className="border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-900/10 overflow-hidden">
                    <CardContent className="p-6 min-w-0">
                        <div className="flex items-center justify-between mb-4">
                            <Shield className="w-8 h-8 text-amber-600" />
                            <span className="text-sm text-amber-700 dark:text-amber-400">Compliance</span>
                        </div>
                        <p className="text-2xl lg:text-xl xl:text-2xl font-bold text-amber-900 dark:text-amber-100 truncate">
                            {formatCurrency(COMPLIANCE_RESERVE_CENTS)}
                        </p>
                        <p className="text-sm text-amber-700 dark:text-amber-400 mt-1">Mandatory reserve</p>
                    </CardContent>
                </Card>

                {/* Reserved */}
                <Card className="overflow-hidden">
                    <CardContent className="p-6 min-w-0">
                        <div className="flex items-center justify-between mb-4">
                            <Clock className="w-8 h-8 text-yellow-500" />
                            <span className="text-sm text-gray-500">Reserved</span>
                        </div>
                        <p className="text-2xl lg:text-xl xl:text-2xl font-bold text-gray-900 dark:text-white truncate">
                            {formatCurrency(walletData.reserved_cents)}
                        </p>
                        <p className="text-sm text-gray-500 mt-1">Held for orders</p>
                    </CardContent>
                </Card>

                {/* Total USD */}
                <Card className="overflow-hidden">
                    <CardContent className="p-6 min-w-0">
                        <div className="flex items-center justify-between mb-4">
                            <Wallet className="w-8 h-8 text-gray-400" />
                            <span className="text-sm text-gray-500">Total USD</span>
                        </div>
                        <p className="text-2xl lg:text-xl xl:text-2xl font-bold text-gray-900 dark:text-white truncate">
                            {formatCurrency(walletData.balance_cents)}
                        </p>
                        <p className="text-sm text-gray-500 mt-1">{walletData.currency}</p>
                    </CardContent>
                </Card>
            </div>

            {/* Add Funds Toggle */}
            <Card>
                <CardHeader>
                    <CardTitle>Add Funds</CardTitle>
                    <CardDescription>Choose your preferred funding method</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex gap-2 mb-6">
                        <Button
                            variant={fundingMode === 'bank' ? 'default' : 'outline'}
                            onClick={() => setFundingMode('bank')}
                            className={cn('gap-2', fundingMode === 'bank' && 'bg-violet-600 hover:bg-violet-700')}
                        >
                            <DollarSign className="w-4 h-4" />
                            Bank Transfer (USD)
                        </Button>
                        <Button
                            variant={fundingMode === 'btc' ? 'default' : 'outline'}
                            onClick={() => setFundingMode('btc')}
                            className={cn('gap-2', fundingMode === 'btc' && 'bg-orange-500 hover:bg-orange-600')}
                        >
                            <Bitcoin className="w-4 h-4" />
                            Bitcoin (BTC)
                        </Button>
                    </div>

                    {fundingMode === 'bank' && (
                        <div>
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
                        </div>
                    )}

                    {fundingMode === 'btc' && (
                        <div className="space-y-4">
                            {loadingBtc ? (
                                <div className="text-center py-8 text-gray-500">
                                    <Clock className="w-8 h-8 mx-auto mb-2 animate-spin" />
                                    <p>Loading BTC address...</p>
                                </div>
                            ) : btcAddress ? (
                                <div className="space-y-4">
                                    {/* QR Code + Address */}
                                    <div className="flex flex-col items-center gap-4 p-6 bg-white dark:bg-gray-900 rounded-lg border">
                                        <div className="bg-white p-3 rounded-lg">
                                            <QRCode
                                                value={`bitcoin:${btcAddress}`}
                                                size={180}
                                                level="M"
                                            />
                                        </div>
                                        <div className="text-center w-full">
                                            <p className="text-xs text-gray-500 mb-1">Your BTC Deposit Address</p>
                                            <div className="flex items-center gap-2 justify-center">
                                                <code className="text-sm font-mono bg-gray-100 dark:bg-gray-800 px-3 py-2 rounded break-all">
                                                    {btcAddress}
                                                </code>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={handleCopyAddress}
                                                    className="shrink-0"
                                                >
                                                    <Copy className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Pending BTC Deposits */}
                                    {pendingBtcDeposits.length > 0 && (
                                        <div>
                                            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Pending Deposits</h4>
                                            <div className="space-y-2">
                                                {pendingBtcDeposits.map((dep) => (
                                                    <div key={dep.id} className="flex items-center justify-between p-3 rounded-lg border bg-yellow-50 dark:bg-yellow-900/10 border-yellow-200 dark:border-yellow-800">
                                                        <div>
                                                            <p className="text-sm font-medium">
                                                                {formatSats(dep.amount_sats)} sats
                                                            </p>
                                                            <p className="text-xs text-gray-500 font-mono">
                                                                {dep.txid.substring(0, 12)}...
                                                            </p>
                                                        </div>
                                                        <div className="text-right">
                                                            {getBtcDepositStatusBadge(dep.status)}
                                                            <p className="text-xs text-gray-500 mt-1">
                                                                {dep.confirmations} confirmation{dep.confirmations !== 1 ? 's' : ''}
                                                            </p>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="text-center py-8 text-gray-500">
                                    <Bitcoin className="w-12 h-12 mx-auto mb-3 opacity-20" />
                                    <p>{btcAddressMessage || 'BTC deposits are not yet configured.'}</p>
                                    <p className="text-sm mt-1">Contact support to enable BTC deposits.</p>
                                </div>
                            )}
                        </div>
                    )}
                </CardContent>
            </Card>

            <div className="grid gap-6 lg:grid-cols-2">
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

                {/* BTC Deposit History */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Bitcoin className="w-5 h-5 text-orange-500" />
                            BTC Deposits
                        </CardTitle>
                        <CardDescription>Your Bitcoin deposit history</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {btcDeposits.length === 0 ? (
                            <div className="text-center py-8 text-gray-500">
                                <Bitcoin className="w-12 h-12 mx-auto mb-3 opacity-20" />
                                <p>No BTC deposits yet</p>
                                <p className="text-sm mt-1">Send BTC to your deposit address to get started.</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {btcDeposits.slice(0, 10).map((dep) => (
                                    <div key={dep.id} className="flex items-center justify-between py-3 border-b last:border-0">
                                        <div>
                                            <p className="font-medium text-sm text-gray-900 dark:text-white">
                                                {formatSats(dep.amount_sats)} sats
                                            </p>
                                            <p className="text-xs text-gray-500 font-mono">
                                                {dep.txid.substring(0, 16)}...
                                            </p>
                                            <p className="text-xs text-gray-400">
                                                {new Date(dep.first_seen_at).toLocaleDateString()}
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            {getBtcDepositStatusBadge(dep.status)}
                                            <p className="text-xs text-gray-500 mt-1">
                                                {dep.confirmations} conf
                                            </p>
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

            {/* BTC Recommendation Banner */}
            <Card className="bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800">
                <CardContent className="p-4 flex items-start gap-3">
                    <Bitcoin className="w-5 h-5 text-orange-600 dark:text-orange-400 mt-0.5 shrink-0" />
                    <div>
                        <h4 className="font-medium text-orange-900 dark:text-orange-100">BTC Top Up Recommended</h4>
                        <p className="text-sm text-orange-700 dark:text-orange-300 mt-1">
                            We recommend routing your storefront crypto deposits to this Top Up BTC wallet to
                            ensure no disruptions. You can request a withdrawal at any time.
                        </p>
                    </div>
                </CardContent>
            </Card>

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

            {/* Withdrawal Modal */}
            {showWithdrawModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl max-w-lg w-full p-6 space-y-6">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                                <AlertTriangle className="w-5 h-5 text-red-600" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Request Withdrawal</h3>
                                <p className="text-sm text-gray-500">This will permanently close your account</p>
                            </div>
                        </div>

                        {/* Currency selector */}
                        <div className="flex gap-2">
                            <Button
                                variant={withdrawCurrency === 'USD' ? 'default' : 'outline'}
                                onClick={() => setWithdrawCurrency('USD')}
                                className={cn('flex-1 gap-2', withdrawCurrency === 'USD' && 'bg-violet-600')}
                            >
                                <DollarSign className="w-4 h-4" />
                                USD ({formatCurrency(usableBalance)})
                            </Button>
                            <Button
                                variant={withdrawCurrency === 'BTC' ? 'default' : 'outline'}
                                onClick={() => setWithdrawCurrency('BTC')}
                                className={cn('flex-1 gap-2', withdrawCurrency === 'BTC' && 'bg-orange-500')}
                            >
                                <Bitcoin className="w-4 h-4" />
                                BTC ({formatBtc(btcWallet.available_sats)})
                            </Button>
                        </div>

                        {/* Withdrawal amount display */}
                        <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                            <p className="text-sm text-gray-500">Withdrawal Amount (full balance)</p>
                            <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                                {withdrawCurrency === 'USD'
                                    ? formatCurrency(usableBalance)
                                    : `${formatBtc(btcWallet.available_sats)} BTC`
                                }
                            </p>
                        </div>

                        {/* Destination input */}
                        {withdrawCurrency === 'USD' ? (
                            <div>
                                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                    Payout Email
                                </label>
                                <Input
                                    type="email"
                                    value={withdrawEmail}
                                    onChange={(e) => setWithdrawEmail(e.target.value)}
                                    placeholder="your-email@company.com"
                                    className="mt-1"
                                />
                                <p className="text-xs text-gray-500 mt-1">
                                    USD will be sent via your preferred payment method to this email
                                </p>
                            </div>
                        ) : (
                            <div>
                                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                    BTC Payout Address
                                </label>
                                <Input
                                    type="text"
                                    value={withdrawBtcAddress}
                                    onChange={(e) => setWithdrawBtcAddress(e.target.value)}
                                    placeholder="bc1q..."
                                    className="mt-1 font-mono text-sm"
                                />
                                <p className="text-xs text-gray-500 mt-1">
                                    Must be a valid bech32 Bitcoin address
                                </p>
                            </div>
                        )}

                        {/* Permanent closure warning */}
                        <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                            <div className="flex items-start gap-3">
                                <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5 shrink-0" />
                                <div>
                                    <p className="text-sm font-medium text-red-900 dark:text-red-100">
                                        This action is irreversible
                                    </p>
                                    <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                                        Requesting a withdrawal will permanently close your merchant account.
                                        You will no longer be able to process orders, receive deposits, or
                                        access your dashboard.
                                    </p>
                                </div>
                            </div>
                            <label className="flex items-center gap-2 mt-4 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={withdrawConfirmed}
                                    onChange={(e) => setWithdrawConfirmed(e.target.checked)}
                                    className="rounded border-red-300"
                                />
                                <span className="text-sm font-medium text-red-900 dark:text-red-100">
                                    I understand this will permanently close my account.
                                </span>
                            </label>
                        </div>

                        {/* Actions */}
                        <div className="flex gap-3">
                            <Button
                                variant="outline"
                                onClick={() => {
                                    setShowWithdrawModal(false);
                                    setWithdrawConfirmed(false);
                                }}
                                className="flex-1"
                            >
                                Cancel
                            </Button>
                            <Button
                                onClick={handleWithdraw}
                                disabled={submittingWithdraw || !withdrawConfirmed}
                                className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                            >
                                {submittingWithdraw ? 'Submitting...' : 'Confirm Withdrawal'}
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
