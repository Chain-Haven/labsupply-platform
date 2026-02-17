'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Bitcoin,
    Settings,
    Save,
    AlertCircle,
    CheckCircle,
    Clock,
    ExternalLink,
    RefreshCw,
    Shield,
    Eye,
    EyeOff,
    Hash,
    Users,
    AlertTriangle,
    Flag,
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface CryptoSettings {
    btc_topup_xpub_set: boolean;
    btc_topup_xpub_masked?: string;
    btc_tip_xpub_set: boolean;
    btc_tip_xpub_masked?: string;
    btc_confirmation_threshold: number;
    btc_esplora_base_url: string;
}

interface AdminDeposit {
    id: string;
    merchant_id: string;
    merchant_name: string;
    merchant_email: string;
    purpose: string;
    address: string;
    derivation_index: number;
    txid: string;
    vout: number;
    amount_sats: number;
    confirmations: number;
    block_height: number | null;
    status: string;
    first_seen_at: string;
    credited_at: string | null;
    explorer_url: string;
}

interface AdminAddress {
    id: string;
    merchant_id: string;
    merchant_name: string;
    purpose: string;
    derivation_index: number;
    address: string;
    status: string;
    created_at: string;
    used_at: string | null;
}

interface ReconciliationData {
    deposit_total_sats: number;
    ledger_total_sats: number;
    total_btc_held_sats: number;
    total_btc_held_btc: string;
    deposit_counts: {
        pending: number;
        confirmed: number;
        credited: number;
        flagged: number;
    };
    active_merchants: number;
    is_reconciled: boolean;
    flags: string[];
}

export default function AdminCryptoPage() {
    const [settings, setSettings] = useState<CryptoSettings | null>(null);
    const [deposits, setDeposits] = useState<AdminDeposit[]>([]);
    const [addresses, setAddresses] = useState<AdminAddress[]>([]);
    const [reconciliation, setReconciliation] = useState<ReconciliationData | null>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'settings' | 'deposits' | 'addresses' | 'reconciliation'>('settings');
    const [depositFilter, setDepositFilter] = useState<string>('');

    // Settings form
    const [topupXpub, setTopupXpub] = useState('');
    const [tipXpub, setTipXpub] = useState('');
    const [confThreshold, setConfThreshold] = useState('3');
    const [esploraUrl, setEsploraUrl] = useState('https://blockstream.info/api');
    const [savingSettings, setSavingSettings] = useState(false);
    const [showXpubInput, setShowXpubInput] = useState(false);

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const [settingsRes, depositsRes, addressesRes, reconRes] = await Promise.all([
                fetch('/api/v1/admin/crypto/settings'),
                fetch(`/api/v1/admin/crypto/deposits${depositFilter ? `?status=${depositFilter}` : ''}`),
                fetch('/api/v1/admin/crypto/addresses'),
                fetch('/api/v1/admin/crypto/reconciliation'),
            ]);

            if (settingsRes.ok) {
                const { data } = await settingsRes.json();
                setSettings(data);
                setConfThreshold(String(data.btc_confirmation_threshold || 3));
                setEsploraUrl(data.btc_esplora_base_url || 'https://blockstream.info/api');
            }

            if (depositsRes.ok) {
                const { data } = await depositsRes.json();
                setDeposits(data || []);
            }

            if (addressesRes.ok) {
                const { data } = await addressesRes.json();
                setAddresses(data || []);
            }

            if (reconRes.ok) {
                const { data } = await reconRes.json();
                setReconciliation(data);
            }
        } catch (err) {
            console.error('Failed to load crypto data:', err);
        } finally {
            setLoading(false);
        }
    }, [depositFilter]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const handleSaveSettings = async () => {
        setSavingSettings(true);
        try {
            const body: Record<string, unknown> = {};

            if (topupXpub) body.btc_topup_xpub = topupXpub;
            if (tipXpub) body.btc_tip_xpub = tipXpub;
            body.btc_confirmation_threshold = parseInt(confThreshold) || 3;
            body.btc_esplora_base_url = esploraUrl;

            const response = await fetch('/api/v1/admin/crypto/settings', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });

            if (!response.ok) {
                const { error } = await response.json();
                throw new Error(error || 'Failed to save');
            }

            toast({ title: 'Settings saved', description: 'Crypto settings have been updated.' });
            setTopupXpub('');
            setTipXpub('');
            setShowXpubInput(false);
            loadData();
        } catch (err) {
            toast({ title: 'Error', description: (err as Error).message, variant: 'destructive' });
        } finally {
            setSavingSettings(false);
        }
    };

    const getDepositStatusBadge = (status: string) => {
        const styles: Record<string, string> = {
            PENDING: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
            CONFIRMED: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
            CREDITED: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
            FLAGGED: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
        };
        return (
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${styles[status] || 'bg-gray-100 text-gray-800'}`}>
                {status}
            </span>
        );
    };

    const getAddressStatusBadge = (status: string) => {
        const styles: Record<string, string> = {
            ACTIVE: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
            USED: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400',
            ARCHIVED: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-500',
        };
        return (
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${styles[status] || ''}`}>
                {status}
            </span>
        );
    };

    const formatSats = (sats: number) => sats.toLocaleString();

    if (loading && !settings) {
        return (
            <div className="flex items-center justify-center h-64">
                <RefreshCw className="w-6 h-6 animate-spin text-gray-400" />
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Crypto Management</h1>
                    <p className="text-gray-500 dark:text-gray-400">BTC wallet settings, deposits, and reconciliation</p>
                </div>
                <Button variant="outline" onClick={loadData} className="gap-2">
                    <RefreshCw className="w-4 h-4" />
                    Refresh
                </Button>
            </div>

            {/* Summary Cards */}
            <div className="grid gap-4 md:grid-cols-4">
                <Card className="bg-gradient-to-br from-orange-500 to-amber-600 text-white border-0">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-2">
                            <Bitcoin className="w-6 h-6 opacity-80" />
                            <span className="text-sm opacity-80">Total BTC Held</span>
                        </div>
                        <p className="text-2xl font-bold">{reconciliation?.total_btc_held_btc || '0.00000000'}</p>
                        <p className="text-sm opacity-80">{formatSats(reconciliation?.total_btc_held_sats || 0)} sats</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-2">
                            <Clock className="w-6 h-6 text-yellow-500" />
                            <span className="text-sm text-gray-500">Pending</span>
                        </div>
                        <p className="text-2xl font-bold text-gray-900 dark:text-white">
                            {reconciliation?.deposit_counts.pending || 0}
                        </p>
                        <p className="text-sm text-gray-500">Deposits awaiting confirmation</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-2">
                            <Users className="w-6 h-6 text-violet-500" />
                            <span className="text-sm text-gray-500">Active Merchants</span>
                        </div>
                        <p className="text-2xl font-bold text-gray-900 dark:text-white">
                            {reconciliation?.active_merchants || 0}
                        </p>
                        <p className="text-sm text-gray-500">With active BTC addresses</p>
                    </CardContent>
                </Card>

                <Card className={reconciliation?.deposit_counts.flagged ? 'border-red-300 dark:border-red-700' : ''}>
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-2">
                            <Flag className="w-6 h-6 text-red-500" />
                            <span className="text-sm text-gray-500">Flagged</span>
                        </div>
                        <p className="text-2xl font-bold text-gray-900 dark:text-white">
                            {reconciliation?.deposit_counts.flagged || 0}
                        </p>
                        <p className="text-sm text-gray-500">Potential reorg issues</p>
                    </CardContent>
                </Card>
            </div>

            {/* Tab navigation */}
            <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg w-fit">
                {[
                    { id: 'settings' as const, label: 'Settings', icon: Settings },
                    { id: 'deposits' as const, label: 'Deposits', icon: Bitcoin },
                    { id: 'addresses' as const, label: 'Addresses', icon: Hash },
                    { id: 'reconciliation' as const, label: 'Reconciliation', icon: Shield },
                ].map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                            activeTab === tab.id
                                ? 'bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow-sm'
                                : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                        }`}
                    >
                        <tab.icon className="w-4 h-4" />
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Settings Tab */}
            {activeTab === 'settings' && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Settings className="w-5 h-5" />
                            Crypto Settings
                        </CardTitle>
                        <CardDescription>Manage xPub keys, confirmation threshold, and Esplora provider</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {/* xPub Status */}
                        <div className="grid gap-4 md:grid-cols-2">
                            <div className="p-4 rounded-lg border">
                                <div className="flex items-center justify-between mb-2">
                                    <h4 className="font-medium text-sm">TOPUP xPub</h4>
                                    {settings?.btc_topup_xpub_set ? (
                                        <CheckCircle className="w-4 h-4 text-green-500" />
                                    ) : (
                                        <AlertCircle className="w-4 h-4 text-yellow-500" />
                                    )}
                                </div>
                                <p className="text-sm text-gray-500 font-mono">
                                    {settings?.btc_topup_xpub_masked || 'Not configured'}
                                </p>
                            </div>
                            <div className="p-4 rounded-lg border">
                                <div className="flex items-center justify-between mb-2">
                                    <h4 className="font-medium text-sm">TIP xPub</h4>
                                    {settings?.btc_tip_xpub_set ? (
                                        <CheckCircle className="w-4 h-4 text-green-500" />
                                    ) : (
                                        <AlertCircle className="w-4 h-4 text-yellow-500" />
                                    )}
                                </div>
                                <p className="text-sm text-gray-500 font-mono">
                                    {settings?.btc_tip_xpub_masked || 'Not configured (optional)'}
                                </p>
                            </div>
                        </div>

                        {/* xPub input toggle */}
                        <div>
                            <Button
                                variant="outline"
                                onClick={() => setShowXpubInput(!showXpubInput)}
                                className="gap-2"
                            >
                                {showXpubInput ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                {showXpubInput ? 'Hide xPub Input' : 'Update xPub Keys'}
                            </Button>
                        </div>

                        {showXpubInput && (
                            <div className="space-y-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                                <div>
                                    <label className="text-sm font-medium">TOPUP xPub (zpub/vpub/xpub)</label>
                                    <Input
                                        type="password"
                                        value={topupXpub}
                                        onChange={(e) => setTopupXpub(e.target.value)}
                                        placeholder="zpub6r... or xpub6..."
                                        className="mt-1 font-mono text-sm"
                                    />
                                </div>
                                <div>
                                    <label className="text-sm font-medium">TIP xPub (optional)</label>
                                    <Input
                                        type="password"
                                        value={tipXpub}
                                        onChange={(e) => setTipXpub(e.target.value)}
                                        placeholder="zpub6r... or xpub6..."
                                        className="mt-1 font-mono text-sm"
                                    />
                                </div>
                                <p className="text-xs text-gray-500">
                                    xPubs are encrypted at rest. Never share your extended private keys.
                                </p>
                            </div>
                        )}

                        {/* Other settings */}
                        <div className="grid gap-4 md:grid-cols-2">
                            <div>
                                <label className="text-sm font-medium">Confirmation Threshold</label>
                                <Input
                                    type="number"
                                    value={confThreshold}
                                    onChange={(e) => setConfThreshold(e.target.value)}
                                    min="1"
                                    max="100"
                                    className="mt-1"
                                />
                                <p className="text-xs text-gray-500 mt-1">
                                    Number of confirmations required before crediting deposits (default: 3)
                                </p>
                            </div>
                            <div>
                                <label className="text-sm font-medium">Esplora API URL</label>
                                <Input
                                    type="url"
                                    value={esploraUrl}
                                    onChange={(e) => setEsploraUrl(e.target.value)}
                                    placeholder="https://blockstream.info/api"
                                    className="mt-1"
                                />
                                <p className="text-xs text-gray-500 mt-1">
                                    Blockchain monitoring provider (Blockstream or mempool.space)
                                </p>
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

            {/* Deposits Tab */}
            {activeTab === 'deposits' && (
                <Card>
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle>BTC Deposits</CardTitle>
                                <CardDescription>All deposits across merchants</CardDescription>
                            </div>
                            <div className="flex gap-2">
                                {['', 'PENDING', 'CONFIRMED', 'CREDITED', 'FLAGGED'].map((filter) => (
                                    <Button
                                        key={filter || 'all'}
                                        variant={depositFilter === filter ? 'default' : 'outline'}
                                        size="sm"
                                        onClick={() => setDepositFilter(filter)}
                                    >
                                        {filter || 'All'}
                                    </Button>
                                ))}
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        {deposits.length === 0 ? (
                            <div className="text-center py-8 text-gray-500">
                                <Bitcoin className="w-12 h-12 mx-auto mb-3 opacity-20" />
                                <p>No deposits found</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b text-left">
                                            <th className="pb-3 font-medium text-gray-500">Merchant</th>
                                            <th className="pb-3 font-medium text-gray-500">Amount</th>
                                            <th className="pb-3 font-medium text-gray-500">TXID</th>
                                            <th className="pb-3 font-medium text-gray-500">Confs</th>
                                            <th className="pb-3 font-medium text-gray-500">Status</th>
                                            <th className="pb-3 font-medium text-gray-500">Date</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {deposits.map((dep) => (
                                            <tr key={dep.id} className="border-b last:border-0">
                                                <td className="py-3">
                                                    <p className="font-medium">{dep.merchant_name}</p>
                                                    <p className="text-xs text-gray-500">{dep.purpose}</p>
                                                </td>
                                                <td className="py-3 font-mono">
                                                    {formatSats(dep.amount_sats)} sats
                                                </td>
                                                <td className="py-3">
                                                    <a
                                                        href={dep.explorer_url}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="flex items-center gap-1 text-violet-600 hover:underline font-mono text-xs"
                                                    >
                                                        {dep.txid.substring(0, 12)}...
                                                        <ExternalLink className="w-3 h-3" />
                                                    </a>
                                                </td>
                                                <td className="py-3">{dep.confirmations}</td>
                                                <td className="py-3">{getDepositStatusBadge(dep.status)}</td>
                                                <td className="py-3 text-gray-500 text-xs">
                                                    {new Date(dep.first_seen_at).toLocaleString()}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}

            {/* Addresses Tab */}
            {activeTab === 'addresses' && (
                <Card>
                    <CardHeader>
                        <CardTitle>Derived Addresses</CardTitle>
                        <CardDescription>All BTC addresses derived per merchant</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {addresses.length === 0 ? (
                            <div className="text-center py-8 text-gray-500">
                                <Hash className="w-12 h-12 mx-auto mb-3 opacity-20" />
                                <p>No addresses derived yet</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b text-left">
                                            <th className="pb-3 font-medium text-gray-500">Merchant</th>
                                            <th className="pb-3 font-medium text-gray-500">Purpose</th>
                                            <th className="pb-3 font-medium text-gray-500">Index</th>
                                            <th className="pb-3 font-medium text-gray-500">Address</th>
                                            <th className="pb-3 font-medium text-gray-500">Status</th>
                                            <th className="pb-3 font-medium text-gray-500">Created</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {addresses.map((addr) => (
                                            <tr key={addr.id} className="border-b last:border-0">
                                                <td className="py-3 font-medium">{addr.merchant_name}</td>
                                                <td className="py-3">{addr.purpose}</td>
                                                <td className="py-3 font-mono">{addr.derivation_index}</td>
                                                <td className="py-3 font-mono text-xs">{addr.address}</td>
                                                <td className="py-3">{getAddressStatusBadge(addr.status)}</td>
                                                <td className="py-3 text-gray-500 text-xs">
                                                    {new Date(addr.created_at).toLocaleDateString()}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}

            {/* Reconciliation Tab */}
            {activeTab === 'reconciliation' && reconciliation && (
                <div className="space-y-4">
                    <Card className={reconciliation.is_reconciled ? 'border-green-200 dark:border-green-800' : 'border-red-200 dark:border-red-800'}>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                {reconciliation.is_reconciled ? (
                                    <CheckCircle className="w-5 h-5 text-green-500" />
                                ) : (
                                    <AlertTriangle className="w-5 h-5 text-red-500" />
                                )}
                                Reconciliation Status
                            </CardTitle>
                            <CardDescription>
                                Comparing app totals vs blockchain deposits
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid gap-4 md:grid-cols-3">
                                <div className="p-4 rounded-lg border">
                                    <p className="text-sm text-gray-500 mb-1">Deposit Total</p>
                                    <p className="text-xl font-bold">{formatSats(reconciliation.deposit_total_sats)} sats</p>
                                </div>
                                <div className="p-4 rounded-lg border">
                                    <p className="text-sm text-gray-500 mb-1">Ledger Total</p>
                                    <p className="text-xl font-bold">{formatSats(reconciliation.ledger_total_sats)} sats</p>
                                </div>
                                <div className="p-4 rounded-lg border">
                                    <p className="text-sm text-gray-500 mb-1">Wallet Total</p>
                                    <p className="text-xl font-bold">{reconciliation.total_btc_held_btc} BTC</p>
                                </div>
                            </div>

                            {reconciliation.flags.length > 0 && (
                                <div className="space-y-2">
                                    <h4 className="font-medium text-red-600">Issues Found:</h4>
                                    {reconciliation.flags.map((flag, i) => (
                                        <div key={i} className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                                            <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
                                            <p className="text-sm text-red-700 dark:text-red-300">{flag}</p>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {reconciliation.is_reconciled && (
                                <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                                    <CheckCircle className="w-4 h-4 text-green-500" />
                                    <p className="text-sm text-green-700 dark:text-green-300">
                                        All BTC deposits reconcile correctly. No mismatches detected.
                                    </p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    );
}
