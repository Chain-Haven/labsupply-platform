'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    ArrowLeft,
    DollarSign,
    Percent,
    Save,
    Loader2,
    RotateCcw,
    Search,
    CheckCircle,
    Tag,
    Zap,
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface PricingRow {
    product_id: string;
    sku: string;
    name: string;
    base_cost_cents: number;
    adjusted_price_cents: number;
    override_price_cents: number | null;
    effective_price_cents: number;
    has_override: boolean;
}

interface MerchantInfo {
    id: string;
    company_name: string;
    price_adjustment_percent: number;
}

const QUICK_ADJUSTMENTS = [-30, -20, -10, 0, 10, 20, 30];

function formatDollars(cents: number): string {
    return '$' + (cents / 100).toFixed(2);
}

export default function MerchantPricingPage() {
    const params = useParams();
    const router = useRouter();
    const merchantId = params.id as string;

    const [merchant, setMerchant] = useState<MerchantInfo | null>(null);
    const [pricing, setPricing] = useState<PricingRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [bulkApplying, setBulkApplying] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [customAdjustment, setCustomAdjustment] = useState('');

    // Track per-SKU edits (product_id -> new cents value or null to clear)
    const [editedOverrides, setEditedOverrides] = useState<Map<string, number | null>>(new Map());

    const loadPricing = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/v1/admin/merchants/${merchantId}/pricing`);
            if (!res.ok) throw new Error('Failed to load');
            const data = await res.json();
            setMerchant(data.merchant);
            setPricing(data.pricing);
            setCustomAdjustment(String(data.merchant.price_adjustment_percent || 0));
        } catch {
            toast({ title: 'Error', description: 'Failed to load pricing data.', variant: 'destructive' });
        } finally {
            setLoading(false);
        }
    }, [merchantId]);

    useEffect(() => { loadPricing(); }, [loadPricing]);

    const handleQuickAdjust = async (percent: number) => {
        setBulkApplying(true);
        try {
            const res = await fetch(`/api/v1/admin/merchants/${merchantId}/pricing`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ adjustment_percent: percent }),
            });
            if (!res.ok) throw new Error('Failed');
            const result = await res.json();
            toast({ title: 'Pricing updated', description: `Applied ${percent >= 0 ? '+' : ''}${percent}% to ${result.products_updated} products.` });
            setEditedOverrides(new Map());
            await loadPricing();
        } catch {
            toast({ title: 'Error', description: 'Failed to apply bulk pricing.', variant: 'destructive' });
        } finally {
            setBulkApplying(false);
        }
    };

    const handleCustomAdjust = () => {
        const pct = parseFloat(customAdjustment);
        if (isNaN(pct)) {
            toast({ title: 'Invalid value', description: 'Enter a valid number.', variant: 'destructive' });
            return;
        }
        handleQuickAdjust(pct);
    };

    const setOverrideEdit = (productId: string, value: string) => {
        const next = new Map(editedOverrides);
        if (value === '') {
            next.delete(productId);
        } else {
            const cents = Math.round(parseFloat(value) * 100);
            if (!isNaN(cents)) {
                next.set(productId, cents);
            }
        }
        setEditedOverrides(next);
    };

    const clearOverride = (productId: string) => {
        const next = new Map(editedOverrides);
        next.set(productId, null);
        setEditedOverrides(next);
    };

    const saveOverrides = async () => {
        if (editedOverrides.size === 0) return;
        setSaving(true);
        try {
            const overrides = Array.from(editedOverrides.entries()).map(([product_id, wholesale_price_cents]) => ({
                product_id,
                wholesale_price_cents,
            }));
            const res = await fetch(`/api/v1/admin/merchants/${merchantId}/pricing`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ overrides }),
            });
            if (!res.ok) throw new Error('Failed');
            toast({ title: 'Overrides saved', description: `Updated ${overrides.length} product prices.` });
            setEditedOverrides(new Map());
            await loadPricing();
        } catch {
            toast({ title: 'Error', description: 'Failed to save overrides.', variant: 'destructive' });
        } finally {
            setSaving(false);
        }
    };

    const filtered = pricing.filter((p) => {
        if (!searchQuery) return true;
        const q = searchQuery.toLowerCase();
        return p.sku.toLowerCase().includes(q) || p.name.toLowerCase().includes(q);
    });

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-violet-600" />
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Link href="/admin/merchants">
                    <Button variant="ghost" size="icon"><ArrowLeft className="w-5 h-5" /></Button>
                </Link>
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                        Pricing: {merchant?.company_name || 'Merchant'}
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400">
                        Manage wholesale pricing for this merchant
                    </p>
                </div>
            </div>

            {/* Global Adjustment Card */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Percent className="w-5 h-5 text-violet-500" />
                        Global Price Adjustment
                    </CardTitle>
                    <CardDescription>
                        Quick-apply a percentage markup or discount to all products.
                        This writes computed prices into every SKU for this merchant.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                        Current adjustment:
                        <span className={cn(
                            'font-semibold',
                            (merchant?.price_adjustment_percent ?? 0) > 0 ? 'text-red-600' :
                            (merchant?.price_adjustment_percent ?? 0) < 0 ? 'text-green-600' : 'text-gray-900 dark:text-white'
                        )}>
                            {(merchant?.price_adjustment_percent ?? 0) >= 0 ? '+' : ''}{merchant?.price_adjustment_percent ?? 0}%
                        </span>
                    </div>

                    {/* Quick buttons */}
                    <div className="flex flex-wrap gap-2">
                        {QUICK_ADJUSTMENTS.map((pct) => (
                            <Button
                                key={pct}
                                variant={pct === (merchant?.price_adjustment_percent ?? 0) ? 'default' : 'outline'}
                                size="sm"
                                onClick={() => handleQuickAdjust(pct)}
                                disabled={bulkApplying}
                                className={cn(
                                    pct === 0 && 'border-violet-300 dark:border-violet-700',
                                    pct < 0 && 'hover:border-green-400 hover:text-green-700',
                                    pct > 0 && 'hover:border-red-400 hover:text-red-700',
                                )}
                            >
                                {pct === 0 ? 'Base Price' : `${pct > 0 ? '+' : ''}${pct}%`}
                            </Button>
                        ))}
                    </div>

                    {/* Custom input */}
                    <div className="flex items-center gap-2">
                        <Input
                            type="number"
                            value={customAdjustment}
                            onChange={(e) => setCustomAdjustment(e.target.value)}
                            placeholder="e.g. -15"
                            className="w-32"
                            step="0.5"
                        />
                        <span className="text-sm text-gray-500">%</span>
                        <Button
                            onClick={handleCustomAdjust}
                            disabled={bulkApplying}
                            size="sm"
                            className="gap-1"
                        >
                            {bulkApplying ? <Loader2 className="w-3 h-3 animate-spin" /> : <Zap className="w-3 h-3" />}
                            Apply to All SKUs
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Per-SKU Pricing Table */}
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="flex items-center gap-2">
                                <Tag className="w-5 h-5 text-violet-500" />
                                Per-SKU Pricing
                            </CardTitle>
                            <CardDescription>
                                Override individual product prices. Overrides take priority over the global adjustment.
                            </CardDescription>
                        </div>
                        {editedOverrides.size > 0 && (
                            <Button onClick={saveOverrides} disabled={saving} className="gap-2 bg-violet-600 hover:bg-violet-700">
                                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                Save {editedOverrides.size} Change{editedOverrides.size > 1 ? 's' : ''}
                            </Button>
                        )}
                    </div>
                </CardHeader>
                <CardContent>
                    {/* Search */}
                    <div className="relative mb-4">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <Input
                            placeholder="Search by SKU or product name..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-9"
                        />
                    </div>

                    {/* Table */}
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b text-left">
                                    <th className="py-3 px-2 font-medium text-gray-500">SKU</th>
                                    <th className="py-3 px-2 font-medium text-gray-500">Product</th>
                                    <th className="py-3 px-2 font-medium text-gray-500 text-right">Base Cost</th>
                                    <th className="py-3 px-2 font-medium text-gray-500 text-right">Adjusted</th>
                                    <th className="py-3 px-2 font-medium text-gray-500 text-right">Override ($)</th>
                                    <th className="py-3 px-2 font-medium text-gray-500 text-right">Effective</th>
                                    <th className="py-3 px-2 font-medium text-gray-500 text-center">Status</th>
                                    <th className="py-3 px-2"></th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map((row) => {
                                    const pendingEdit = editedOverrides.get(row.product_id);
                                    const isClearing = pendingEdit === null;
                                    const currentOverrideCents = isClearing ? null : (pendingEdit ?? row.override_price_cents);
                                    const effectiveCents = currentOverrideCents ?? row.adjusted_price_cents;
                                    const hasOverride = currentOverrideCents != null;

                                    return (
                                        <tr key={row.product_id} className="border-b last:border-0 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                                            <td className="py-3 px-2 font-mono text-xs">{row.sku}</td>
                                            <td className="py-3 px-2 max-w-[200px] truncate">{row.name}</td>
                                            <td className="py-3 px-2 text-right text-gray-500">{formatDollars(row.base_cost_cents)}</td>
                                            <td className="py-3 px-2 text-right text-gray-500">{formatDollars(row.adjusted_price_cents)}</td>
                                            <td className="py-3 px-2 text-right">
                                                <Input
                                                    type="number"
                                                    step="0.01"
                                                    min="0"
                                                    placeholder="—"
                                                    value={
                                                        isClearing ? '' :
                                                        pendingEdit != null ? (pendingEdit / 100).toFixed(2) :
                                                        row.override_price_cents != null ? (row.override_price_cents / 100).toFixed(2) : ''
                                                    }
                                                    onChange={(e) => setOverrideEdit(row.product_id, e.target.value)}
                                                    className="w-24 text-right text-sm h-8 ml-auto"
                                                />
                                            </td>
                                            <td className={cn(
                                                'py-3 px-2 text-right font-semibold',
                                                effectiveCents < row.base_cost_cents ? 'text-green-600' :
                                                effectiveCents > row.base_cost_cents ? 'text-red-600' : ''
                                            )}>
                                                {formatDollars(effectiveCents)}
                                            </td>
                                            <td className="py-3 px-2 text-center">
                                                {hasOverride ? (
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400">
                                                        <CheckCircle className="w-3 h-3" /> Override
                                                    </span>
                                                ) : (
                                                    <span className="text-xs text-gray-400">Global</span>
                                                )}
                                            </td>
                                            <td className="py-3 px-2">
                                                {(hasOverride || row.has_override) && (
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => clearOverride(row.product_id)}
                                                        className="h-7 text-xs text-gray-500 hover:text-red-600"
                                                        title="Remove override, revert to global adjustment"
                                                    >
                                                        <RotateCcw className="w-3 h-3" />
                                                    </Button>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                                {filtered.length === 0 && (
                                    <tr>
                                        <td colSpan={8} className="py-8 text-center text-gray-400">
                                            {searchQuery ? 'No products match your search.' : 'No active products found.'}
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
