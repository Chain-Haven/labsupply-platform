'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Key,
    Plus,
    Copy,
    Eye,
    EyeOff,
    Trash2,
    Check,
    AlertTriangle,
    Shield
} from 'lucide-react';
import { cn, formatRelativeTime } from '@/lib/utils';

// Mock API keys data
const apiKeys = [
    {
        id: '1',
        name: 'Production Inventory Sync',
        key_prefix: 'lsk_prod1234',
        permissions: { inventory: { read: true, write: true }, merchants: { read: false, write: false } },
        created_at: '2024-01-05T10:30:00Z',
        last_used_at: '2024-01-12T15:45:00Z',
        usage_count: 1542,
        expires_at: null,
        is_active: true,
    },
    {
        id: '2',
        name: 'Warehouse Integration',
        key_prefix: 'lsk_wh123456',
        permissions: { inventory: { read: true, write: true }, merchants: { read: false, write: false } },
        created_at: '2024-01-08T14:20:00Z',
        last_used_at: '2024-01-12T12:30:00Z',
        usage_count: 523,
        expires_at: '2024-07-08T14:20:00Z',
        is_active: true,
    },
    {
        id: '3',
        name: 'Legacy System (Deprecated)',
        key_prefix: 'lsk_leg12345',
        permissions: { inventory: { read: true, write: false }, merchants: { read: false, write: false } },
        created_at: '2023-11-15T09:00:00Z',
        last_used_at: '2023-12-20T11:00:00Z',
        usage_count: 89,
        expires_at: null,
        is_active: false,
    },
];

export default function ApiKeysPage() {
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [newKeyName, setNewKeyName] = useState('');
    const [newKeyVisible, setNewKeyVisible] = useState<string | null>(null);

    const handleCreateKey = () => {
        // In real app, this would call the API
        const fakeKey = 'lsk_' + Math.random().toString(36).substring(2, 50);
        setNewKeyVisible(fakeKey);
        setNewKeyName('');
    };

    const handleCopyKey = (key: string) => {
        navigator.clipboard.writeText(key);
        alert('API key copied to clipboard');
    };

    const handleRevokeKey = (keyId: string) => {
        if (confirm('Are you sure you want to revoke this API key? This action cannot be undone.')) {
            alert('Would revoke key ' + keyId);
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">API Keys</h1>
                    <p className="text-gray-500">Manage API keys for programmatic access</p>
                </div>
                <Button onClick={() => setShowCreateModal(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Create API Key
                </Button>
            </div>

            {/* New Key Display */}
            {newKeyVisible && (
                <Card className="border-green-200 bg-green-50 dark:bg-green-900/10">
                    <CardContent className="p-4">
                        <div className="flex items-start gap-4">
                            <div className="w-10 h-10 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center shrink-0">
                                <Check className="w-5 h-5 text-green-600" />
                            </div>
                            <div className="flex-1">
                                <h3 className="font-semibold text-green-800 dark:text-green-200 mb-1">
                                    API Key Created Successfully
                                </h3>
                                <p className="text-sm text-green-700 dark:text-green-300 mb-3">
                                    Copy this key now. You won't be able to see it again!
                                </p>
                                <div className="flex items-center gap-2">
                                    <code className="flex-1 p-3 bg-white dark:bg-gray-900 rounded-lg font-mono text-sm border">
                                        {newKeyVisible}
                                    </code>
                                    <Button onClick={() => handleCopyKey(newKeyVisible)}>
                                        <Copy className="w-4 h-4 mr-2" />
                                        Copy
                                    </Button>
                                </div>
                            </div>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setNewKeyVisible(null)}
                            >
                                Dismiss
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Create Key Form */}
            {showCreateModal && !newKeyVisible && (
                <Card>
                    <CardHeader>
                        <CardTitle>Create New API Key</CardTitle>
                        <CardDescription>
                            Generate a new API key for programmatic inventory management
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Key Name
                            </label>
                            <Input
                                value={newKeyName}
                                onChange={(e) => setNewKeyName(e.target.value)}
                                placeholder="e.g., Production Inventory Sync"
                            />
                            <p className="text-xs text-gray-500 mt-1">
                                A descriptive name to identify this key
                            </p>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Permissions
                            </label>
                            <div className="space-y-2">
                                {[
                                    { perm: 'inventory_read', label: 'Inventory: Read' },
                                    { perm: 'inventory_write', label: 'Inventory: Write' },
                                    { perm: 'merchants_read', label: 'Merchants: Read' },
                                    { perm: 'orders_read', label: 'Orders: Read' },
                                ].map((item) => (
                                    <label key={item.perm} className="flex items-center gap-3">
                                        <input
                                            type="checkbox"
                                            defaultChecked={item.perm.includes('inventory')}
                                            className="h-4 w-4 rounded border-gray-300 text-violet-600"
                                        />
                                        <span className="text-sm">{item.label}</span>
                                    </label>
                                ))}
                            </div>
                        </div>

                        <div className="flex gap-3 pt-4">
                            <Button onClick={handleCreateKey} disabled={!newKeyName.trim()}>
                                Create Key
                            </Button>
                            <Button variant="outline" onClick={() => setShowCreateModal(false)}>
                                Cancel
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Security Notice */}
            <Card className="border-amber-200 bg-amber-50 dark:bg-amber-900/10">
                <CardContent className="p-4 flex gap-4">
                    <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
                    <div>
                        <h4 className="font-medium text-amber-800 dark:text-amber-200 mb-1">
                            API Key Security
                        </h4>
                        <p className="text-sm text-amber-700 dark:text-amber-300">
                            API keys provide programmatic access to your inventory. Keep them secure and never expose them
                            in client-side code. Revoke any compromised keys immediately.
                        </p>
                    </div>
                </CardContent>
            </Card>

            {/* API Keys List */}
            <Card>
                <CardHeader>
                    <CardTitle>Active API Keys</CardTitle>
                    <CardDescription>Keys that can access your inventory API</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                    <table className="w-full">
                        <thead className="bg-gray-50 dark:bg-gray-800/50 border-b">
                            <tr>
                                <th className="text-left p-4 text-sm font-medium text-gray-500">Name</th>
                                <th className="text-left p-4 text-sm font-medium text-gray-500">Key</th>
                                <th className="text-left p-4 text-sm font-medium text-gray-500">Permissions</th>
                                <th className="text-left p-4 text-sm font-medium text-gray-500">Last Used</th>
                                <th className="text-right p-4 text-sm font-medium text-gray-500">Uses</th>
                                <th className="text-left p-4 text-sm font-medium text-gray-500">Status</th>
                                <th className="text-right p-4 text-sm font-medium text-gray-500">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {apiKeys.map((key) => (
                                <tr
                                    key={key.id}
                                    className={cn(
                                        'hover:bg-gray-50 dark:hover:bg-gray-800/50',
                                        !key.is_active && 'opacity-60'
                                    )}
                                >
                                    <td className="p-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                                                <Key className="w-5 h-5 text-gray-500" />
                                            </div>
                                            <div>
                                                <p className="font-medium text-gray-900 dark:text-white">
                                                    {key.name}
                                                </p>
                                                <p className="text-xs text-gray-500">
                                                    Created {formatRelativeTime(key.created_at)}
                                                </p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="p-4">
                                        <code className="px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded text-sm font-mono">
                                            {key.key_prefix}...
                                        </code>
                                    </td>
                                    <td className="p-4">
                                        <div className="flex flex-wrap gap-1">
                                            {key.permissions.inventory?.write && (
                                                <span className="px-2 py-0.5 bg-violet-100 text-violet-700 rounded text-xs">
                                                    inventory:rw
                                                </span>
                                            )}
                                            {key.permissions.inventory?.read && !key.permissions.inventory?.write && (
                                                <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs">
                                                    inventory:r
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="p-4 text-sm text-gray-500">
                                        {key.last_used_at ? formatRelativeTime(key.last_used_at) : 'Never'}
                                    </td>
                                    <td className="p-4 text-right font-medium text-gray-900 dark:text-white">
                                        {key.usage_count.toLocaleString()}
                                    </td>
                                    <td className="p-4">
                                        {key.is_active ? (
                                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                                                <Shield className="w-3 h-3" />
                                                Active
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-500">
                                                Revoked
                                            </span>
                                        )}
                                    </td>
                                    <td className="p-4 text-right">
                                        {key.is_active && (
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                                onClick={() => handleRevokeKey(key.id)}
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </CardContent>
            </Card>

            {/* API Documentation Link */}
            <Card>
                <CardContent className="p-6 text-center">
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                        Need help integrating?
                    </h3>
                    <p className="text-gray-500 mb-4">
                        Check out our API documentation for code examples and endpoint references.
                    </p>
                    <Button variant="outline">View API Documentation</Button>
                </CardContent>
            </Card>
        </div>
    );
}
