'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Store,
    Plus,
    Check,
    Copy,
    ExternalLink,
    RefreshCw,
    AlertCircle,
    Wifi,
    WifiOff
} from 'lucide-react';
import { cn, getStatusColor, formatRelativeTime } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';

// Stores data - empty by default (fetched from API in production)
const stores: {
    id: string;
    name: string;
    url: string;
    status: string;
    lastSync: string;
    productCount: number;
    currency: string;
}[] = [];

const connectCode = 'ABC1-2DEF-3GHI';

export default function StoresPage() {
    const [showConnectModal, setShowConnectModal] = useState(false);
    const [codeGenerated, setCodeGenerated] = useState(false);

    const copyCode = () => {
        navigator.clipboard.writeText(connectCode);
        toast({
            title: 'Copied!',
            description: 'Connect code copied to clipboard',
        });
    };

    const generateCode = () => {
        setCodeGenerated(true);
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
            {stores.length > 0 ? (
                <div className="grid gap-4">
                    {stores.map((store) => (
                        <Card key={store.id}>
                            <CardContent className="p-6">
                                <div className="flex items-start justify-between">
                                    <div className="flex items-start gap-4">
                                        <div className={cn(
                                            'w-12 h-12 rounded-lg flex items-center justify-center',
                                            store.status === 'CONNECTED'
                                                ? 'bg-green-100 dark:bg-green-900/20'
                                                : 'bg-red-100 dark:bg-red-900/20'
                                        )}>
                                            {store.status === 'CONNECTED' ? (
                                                <Wifi className="w-6 h-6 text-green-600 dark:text-green-400" />
                                            ) : (
                                                <WifiOff className="w-6 h-6 text-red-600 dark:text-red-400" />
                                            )}
                                        </div>
                                        <div>
                                            <h3 className="font-semibold text-gray-900 dark:text-white">{store.name}</h3>
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
                                                <span>{store.productCount} products synced</span>
                                                <span>•</span>
                                                <span>{store.currency}</span>
                                                <span>•</span>
                                                <span>Last sync: {formatRelativeTime(store.lastSync)}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className={cn(
                                            'px-2.5 py-1 rounded-full text-xs font-medium',
                                            getStatusColor(store.status)
                                        )}>
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
                                        Download and install the LabSupply Fulfillment Connector plugin on your WordPress site.
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
                                    {!codeGenerated ? (
                                        <Button size="sm" className="mt-2" onClick={generateCode}>
                                            Generate Code
                                        </Button>
                                    ) : (
                                        <div className="mt-2 flex items-center gap-2">
                                            <code className="flex-1 px-4 py-2 bg-gray-100 dark:bg-gray-800 rounded-lg font-mono text-lg tracking-wider">
                                                {connectCode}
                                            </code>
                                            <Button variant="outline" size="icon" onClick={copyCode}>
                                                <Copy className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    )}
                                    {codeGenerated && (
                                        <p className="text-xs text-gray-400 mt-2">
                                            Code expires in 24 hours
                                        </p>
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
                                        Go to WooCommerce → LabSupply in your WordPress admin and enter the connect code.
                                    </p>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex justify-end gap-2 pt-4 border-t">
                                <Button variant="outline" onClick={() => setShowConnectModal(false)}>
                                    Cancel
                                </Button>
                                <Button onClick={() => setShowConnectModal(false)} disabled={!codeGenerated}>
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
