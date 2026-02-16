'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
    Store,
    Plus,
    Copy,
    ExternalLink,
    RefreshCw,
    Wifi,
    WifiOff,
    Loader2,
    AlertCircle,
} from 'lucide-react';
import { cn, getStatusColor, formatRelativeTime, formatDate } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';

type StoreData = {
    id: string;
    name: string;
    url: string;
    status: string;
    type?: string;
    currency?: string;
    last_sync_at: string | null;
    created_at: string;
};

type ConnectCodeData = {
    code: string;
    flat_code: string;
    expires_at: string;
};

export default function StoresPage() {
    const [showConnectModal, setShowConnectModal] = useState(false);
    const [stores, setStores] = useState<StoreData[]>([]);
    const [storesLoading, setStoresLoading] = useState(true);
    const [storesError, setStoresError] = useState<string | null>(null);
    const [connectCode, setConnectCode] = useState<ConnectCodeData | null>(null);
    const [codeLoading, setCodeLoading] = useState(false);
    const [codeError, setCodeError] = useState<string | null>(null);

    const fetchStores = useCallback(async () => {
        setStoresLoading(true);
        setStoresError(null);
        try {
            const res = await fetch('/api/v1/merchant/stores');
            const json = await res.json();
            if (!res.ok) {
                throw new Error(json.error || 'Failed to fetch stores');
            }
            setStores(json.data ?? []);
        } catch (err) {
            setStoresError(err instanceof Error ? err.message : 'Failed to load stores');
            setStores([]);
        } finally {
            setStoresLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchStores();
    }, [fetchStores]);

    const copyCode = () => {
        if (!connectCode) return;
        navigator.clipboard.writeText(connectCode.code);
        toast({
            title: 'Copied!',
            description: 'Connect code copied to clipboard',
        });
    };

    const generateCode = async () => {
        setCodeLoading(true);
        setCodeError(null);
        try {
            const res = await fetch('/api/v1/merchant/connect-code', { method: 'POST' });
            const json = await res.json();
            if (!res.ok) {
                throw new Error(json.error || 'Failed to generate connect code');
            }
            setConnectCode(json.data);
            toast({
                title: 'Code generated',
                description: 'Your connect code is ready. Enter it in your WooCommerce plugin.',
            });
        } catch (err) {
            const msg = err instanceof Error ? err.message : 'Failed to generate code';
            setCodeError(msg);
            toast({
                title: 'Error',
                description: msg,
                variant: 'destructive',
            });
        } finally {
            setCodeLoading(false);
        }
    };

    const closeModal = () => {
        setShowConnectModal(false);
        setConnectCode(null);
        setCodeError(null);
        fetchStores();
    };

    const formatExpiresAt = (expiresAt: string) => {
        const expires = new Date(expiresAt);
        const now = new Date();
        const diffMs = expires.getTime() - now.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        if (diffMins < 0) return 'Expired';
        if (diffMins < 60) return `Expires in ${diffMins} minutes`;
        if (diffHours < 24) return `Expires in ${diffHours} hours`;
        return `Expires at ${formatDate(expiresAt)}`;
    };

    return (
        <div className="space-y-6 animate-in">
            {/* Page header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Connected Stores</h1>
                    <p className="text-gray-500 dark:text-gray-400">Manage your WooCommerce store connections</p>
                </div>
                <Button onClick={() => setShowConnectModal(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Connect Store
                </Button>
            </div>

            {/* Stores list */}
            {storesLoading ? (
                <Card>
                    <CardContent className="p-12 flex items-center justify-center">
                        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
                    </CardContent>
                </Card>
            ) : storesError ? (
                <Card>
                    <CardContent className="p-12 text-center">
                        <AlertCircle className="w-12 h-12 mx-auto text-red-500 mb-4" />
                        <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Failed to load stores</h3>
                        <p className="text-gray-500 mb-4">{storesError}</p>
                        <Button variant="outline" onClick={fetchStores}>
                            <RefreshCw className="w-4 h-4 mr-2" />
                            Retry
                        </Button>
                    </CardContent>
                </Card>
            ) : stores.length > 0 ? (
                <div className="grid gap-4">
                    {stores.map((store) => (
                        <Card key={store.id}>
                            <CardContent className="p-6">
                                <div className="flex items-start justify-between">
                                    <div className="flex items-start gap-4">
                                        <div
                                            className={cn(
                                                'w-12 h-12 rounded-lg flex items-center justify-center',
                                                store.status === 'CONNECTED'
                                                    ? 'bg-green-100 dark:bg-green-900/20'
                                                    : 'bg-red-100 dark:bg-red-900/20'
                                            )}
                                        >
                                            {store.status === 'CONNECTED' ? (
                                                <Wifi className="w-6 h-6 text-green-600 dark:text-green-400" />
                                            ) : (
                                                <WifiOff className="w-6 h-6 text-red-600 dark:text-red-400" />
                                            )}
                                        </div>
                                        <div>
                                            <h3 className="font-semibold text-gray-900 dark:text-white">
                                                {store.name}
                                            </h3>
                                            <a
                                                href={store.url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-sm text-violet-600 hover:text-violet-700 flex items-center gap-1"
                                            >
                                                {store.url}
                                                <ExternalLink className="w-3 h-3" />
                                            </a>
                                            <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                                                {store.currency && <span>{store.currency}</span>}
                                                {store.currency && store.last_sync_at && <span>•</span>}
                                                <span>
                                                    Last sync:{' '}
                                                    {store.last_sync_at
                                                        ? formatRelativeTime(store.last_sync_at)
                                                        : 'Never'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span
                                            className={cn(
                                                'px-2.5 py-1 rounded-full text-xs font-medium',
                                                getStatusColor(store.status)
                                            )}
                                        >
                                            {store.status}
                                        </span>
                                        <Button variant="outline" size="sm">
                                            <RefreshCw className="w-4 h-4 mr-2" />
                                            Sync
                                        </Button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            ) : (
                <Card>
                    <CardContent className="p-12 text-center">
                        <Store className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                        <h3 className="font-semibold text-gray-900 dark:text-white mb-2">No stores connected</h3>
                        <p className="text-gray-500 mb-4">Connect your WooCommerce store to start syncing orders</p>
                        <Button onClick={() => setShowConnectModal(true)}>
                            <Plus className="w-4 h-4 mr-2" />
                            Connect Your First Store
                        </Button>
                    </CardContent>
                </Card>
            )}

            {/* Connect modal */}
            {showConnectModal && (
                <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
                    <Card className="w-full max-w-lg">
                        <CardHeader>
                            <CardTitle>Connect WooCommerce Store</CardTitle>
                            <CardDescription>
                                Follow these steps to connect your store
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            {/* Step 1 */}
                            <div className="flex gap-4">
                                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-violet-100 dark:bg-violet-900/20 flex items-center justify-center text-violet-600 font-medium">
                                    1
                                </div>
                                <div>
                                    <h4 className="font-medium text-gray-900 dark:text-white">Download the Plugin</h4>
                                    <p className="text-sm text-gray-500 mt-1">
                                        Download and install the WhiteLabel Peptides Fulfillment Connector plugin on your
                                        WordPress site.
                                    </p>
                                    <a href="/api/plugin/download" download>
                                        <Button variant="outline" size="sm" className="mt-2">
                                            Download Plugin
                                        </Button>
                                    </a>
                                </div>
                            </div>

                            {/* Step 2 */}
                            <div className="flex gap-4">
                                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-violet-100 dark:bg-violet-900/20 flex items-center justify-center text-violet-600 font-medium">
                                    2
                                </div>
                                <div className="flex-1">
                                    <h4 className="font-medium text-gray-900 dark:text-white">Generate Connect Code</h4>
                                    <p className="text-sm text-gray-500 mt-1">
                                        Generate a one-time code to link your store securely.
                                    </p>
                                    {!connectCode ? (
                                        <div className="mt-2 flex flex-col gap-2">
                                            <Button
                                                size="sm"
                                                onClick={generateCode}
                                                disabled={codeLoading}
                                            >
                                                {codeLoading ? (
                                                    <>
                                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                                        Generating...
                                                    </>
                                                ) : (
                                                    'Generate Code'
                                                )}
                                            </Button>
                                            {codeError && (
                                                <p className="text-xs text-red-500">{codeError}</p>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="mt-2 flex flex-col gap-2">
                                            <div className="flex items-center gap-2">
                                                <code className="flex-1 px-4 py-2 bg-gray-100 dark:bg-gray-800 rounded-lg font-mono text-lg tracking-wider">
                                                    {connectCode.code}
                                                </code>
                                                <Button variant="outline" size="icon" onClick={copyCode}>
                                                    <Copy className="w-4 h-4" />
                                                </Button>
                                            </div>
                                            <p className="text-xs text-gray-400">
                                                {formatExpiresAt(connectCode.expires_at)}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Step 3 */}
                            <div className="flex gap-4">
                                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-violet-100 dark:bg-violet-900/20 flex items-center justify-center text-violet-600 font-medium">
                                    3
                                </div>
                                <div>
                                    <h4 className="font-medium text-gray-900 dark:text-white">Enter Code in Plugin</h4>
                                    <p className="text-sm text-gray-500 mt-1">
                                        Go to WooCommerce → WhiteLabel Peptides in your WordPress admin and enter the connect
                                        code.
                                    </p>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex justify-end gap-2 pt-4 border-t">
                                <Button variant="outline" onClick={closeModal}>
                                    Cancel
                                </Button>
                                <Button onClick={closeModal} disabled={!connectCode}>
                                    Done
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    );
}
