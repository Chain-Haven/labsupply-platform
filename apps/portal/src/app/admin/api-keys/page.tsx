'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Key,
    Plus,
    Copy,
    Trash2,
    Check,
    AlertTriangle,
    Shield,
    ExternalLink,
    Loader2,
    X,
} from 'lucide-react';
import { cn, formatRelativeTime } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';

interface ApiKey {
    id: string;
    name: string;
    prefix: string;
    permissions: string[] | Record<string, { read?: boolean; write?: boolean }>;
    created_at: string;
    last_used_at: string | null;
    revoked_at: string | null;
    is_active: boolean;
}

const PERMISSION_OPTIONS = [
    { perm: 'inventory_read', label: 'Inventory: Read' },
    { perm: 'inventory_write', label: 'Inventory: Write' },
    { perm: 'merchants_read', label: 'Merchants: Read' },
    { perm: 'orders_read', label: 'Orders: Read' },
];

function formatPermissions(permissions: ApiKey['permissions']): string[] {
    if (Array.isArray(permissions)) {
        return permissions;
    }
    const out: string[] = [];
    if (typeof permissions === 'object' && permissions !== null) {
        const inv = (permissions as Record<string, unknown>).inventory as Record<string, boolean> | undefined;
        if (inv?.read) out.push('inventory_read');
        if (inv?.write) out.push('inventory_write');
        const merch = (permissions as Record<string, unknown>).merchants as Record<string, boolean> | undefined;
        if (merch?.read) out.push('merchants_read');
        const ord = (permissions as Record<string, unknown>).orders as Record<string, boolean> | undefined;
        if (ord?.read) out.push('orders_read');
    }
    return out;
}

function permissionLabel(perm: string): string {
    const found = PERMISSION_OPTIONS.find((p) => p.perm === perm);
    return found?.label ?? perm;
}

export default function ApiKeysPage() {
    const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [newKeyName, setNewKeyName] = useState('');
    const [selectedPermissions, setSelectedPermissions] = useState<Record<string, boolean>>({
        inventory_read: true,
        inventory_write: true,
        merchants_read: false,
        orders_read: false,
    });
    const [createLoading, setCreateLoading] = useState(false);
    const [newKeyResult, setNewKeyResult] = useState<{ key: string; name: string } | null>(null);
    const [revokingId, setRevokingId] = useState<string | null>(null);

    const fetchKeys = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch('/api/v1/admin/api-keys');
            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.error || `Failed to fetch: ${res.status}`);
            }
            const json = await res.json();
            setApiKeys(json.data ?? []);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Failed to load API keys');
            setApiKeys([]);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchKeys();
    }, [fetchKeys]);

    const handleCreateKey = async () => {
        if (!newKeyName.trim()) return;
        setCreateLoading(true);
        try {
            const permissions = Object.entries(selectedPermissions)
                .filter(([, v]) => v)
                .map(([k]) => k);
            const res = await fetch('/api/v1/admin/api-keys', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: newKeyName.trim(), permissions }),
            });
            const json = await res.json();
            if (!res.ok) {
                throw new Error(json.error || 'Failed to create API key');
            }
            const data = json.data;
            if (!data?.key) {
                throw new Error('Invalid response: no key returned');
            }
            setNewKeyResult({ key: data.key, name: data.name });
            setShowCreateModal(false);
            setNewKeyName('');
            setSelectedPermissions({
                inventory_read: true,
                inventory_write: true,
                merchants_read: false,
                orders_read: false,
            });
            fetchKeys();
        } catch (e) {
            toast({
                title: 'Error',
                description: e instanceof Error ? e.message : 'Failed to create API key',
                variant: 'destructive',
            });
        } finally {
            setCreateLoading(false);
        }
    };

    const handleCopyKey = (key: string) => {
        navigator.clipboard.writeText(key);
        toast({ title: 'Copied', description: 'API key copied to clipboard' });
    };

    const handleRevokeKey = async (keyId: string) => {
        if (!confirm('Are you sure you want to revoke this API key? This action cannot be undone.')) {
            return;
        }
        setRevokingId(keyId);
        try {
            const res = await fetch(`/api/v1/admin/api-keys?id=${encodeURIComponent(keyId)}`, {
                method: 'DELETE',
            });
            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.error || 'Failed to revoke key');
            }
            toast({ title: 'Key revoked', description: 'The API key has been revoked.' });
            fetchKeys();
        } catch (e) {
            toast({
                title: 'Error',
                description: e instanceof Error ? e.message : 'Failed to revoke API key',
                variant: 'destructive',
            });
        } finally {
            setRevokingId(null);
        }
    };

    const togglePermission = (perm: string) => {
        setSelectedPermissions((prev) => ({ ...prev, [perm]: !prev[perm] }));
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

            {/* New Key Display Modal - shown once after create */}
            {newKeyResult && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <Card className="w-full max-w-lg mx-4 border-green-200 bg-green-50 dark:bg-green-900/10">
                        <CardContent className="p-6">
                            <div className="flex items-start gap-4">
                                <div className="w-10 h-10 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center shrink-0">
                                    <Check className="w-5 h-5 text-green-600" />
                                </div>
                                <div className="flex-1">
                                    <h3 className="font-semibold text-green-800 dark:text-green-200 mb-1">
                                        API Key Created Successfully
                                    </h3>
                                    <p className="text-sm text-green-700 dark:text-green-300 mb-3">
                                        Copy this key now. You won&apos;t be able to see it again!
                                    </p>
                                    <div className="flex items-center gap-2">
                                        <code className="flex-1 p-3 bg-white dark:bg-gray-900 rounded-lg font-mono text-sm border break-all">
                                            {newKeyResult.key}
                                        </code>
                                        <Button onClick={() => handleCopyKey(newKeyResult.key)}>
                                            <Copy className="w-4 h-4 mr-2" />
                                            Copy
                                        </Button>
                                    </div>
                                </div>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setNewKeyResult(null)}
                                >
                                    <X className="w-4 h-4" />
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Create Key Form */}
            {showCreateModal && !newKeyResult && (
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
                                {PERMISSION_OPTIONS.map((item) => (
                                    <label key={item.perm} className="flex items-center gap-3">
                                        <input
                                            type="checkbox"
                                            checked={selectedPermissions[item.perm] ?? false}
                                            onChange={() => togglePermission(item.perm)}
                                            className="h-4 w-4 rounded border-gray-300 text-violet-600"
                                        />
                                        <span className="text-sm">{item.label}</span>
                                    </label>
                                ))}
                            </div>
                        </div>

                        <div className="flex gap-3 pt-4">
                            <Button
                                onClick={handleCreateKey}
                                disabled={!newKeyName.trim() || createLoading}
                            >
                                {createLoading ? (
                                    <>
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        Creating...
                                    </>
                                ) : (
                                    'Create Key'
                                )}
                            </Button>
                            <Button
                                variant="outline"
                                onClick={() => setShowCreateModal(false)}
                                disabled={createLoading}
                            >
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
                    {loading ? (
                        <div className="p-12 flex items-center justify-center">
                            <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
                        </div>
                    ) : error ? (
                        <div className="p-8 text-center">
                            <p className="text-red-600 dark:text-red-400 mb-4">{error}</p>
                            <Button variant="outline" onClick={fetchKeys}>
                                Try again
                            </Button>
                        </div>
                    ) : apiKeys.length === 0 ? (
                        <div className="p-12 text-center text-gray-500">
                            <Key className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                            <p className="font-medium text-gray-700 dark:text-gray-300">No API keys yet</p>
                            <p className="text-sm mt-1">Create your first API key to get started</p>
                            <Button className="mt-4" onClick={() => setShowCreateModal(true)}>
                                <Plus className="w-4 h-4 mr-2" />
                                Create API Key
                            </Button>
                        </div>
                    ) : (
                        <table className="w-full">
                            <thead className="bg-gray-50 dark:bg-gray-800/50 border-b">
                                <tr>
                                    <th className="text-left p-4 text-sm font-medium text-gray-500">Name</th>
                                    <th className="text-left p-4 text-sm font-medium text-gray-500">Key</th>
                                    <th className="text-left p-4 text-sm font-medium text-gray-500">Permissions</th>
                                    <th className="text-left p-4 text-sm font-medium text-gray-500">Last Used</th>
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
                                                {key.prefix}
                                            </code>
                                        </td>
                                        <td className="p-4">
                                            <div className="flex flex-wrap gap-1">
                                                {formatPermissions(key.permissions).map((perm) => (
                                                    <span
                                                        key={perm}
                                                        className="px-2 py-0.5 bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400 rounded text-xs"
                                                    >
                                                        {permissionLabel(perm)}
                                                    </span>
                                                ))}
                                                {formatPermissions(key.permissions).length === 0 && (
                                                    <span className="text-xs text-gray-400">—</span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="p-4 text-sm text-gray-500">
                                            {key.last_used_at ? formatRelativeTime(key.last_used_at) : 'Never'}
                                        </td>
                                        <td className="p-4">
                                            {key.is_active ? (
                                                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                                                    <Shield className="w-3 h-3" />
                                                    Active
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400">
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
                                                    disabled={revokingId === key.id}
                                                >
                                                    {revokingId === key.id ? (
                                                        <Loader2 className="w-4 h-4 animate-spin" />
                                                    ) : (
                                                        <Trash2 className="w-4 h-4" />
                                                    )}
                                                </Button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
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
                    <Link href="/admin/docs">
                        <Button variant="outline">
                            <ExternalLink className="w-4 h-4 mr-2" />
                            View API Documentation
                        </Button>
                    </Link>
                </CardContent>
            </Card>
        </div>
    );
}
