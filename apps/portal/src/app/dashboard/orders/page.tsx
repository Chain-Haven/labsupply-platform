'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    ShoppingCart,
    Search,
    Filter,
    Eye,
    Package,
    Truck,
    Clock,
    CheckCircle,
    XCircle,
    AlertTriangle,
    ChevronDown,
    Shield,
    AlertCircle,
    Loader2
} from 'lucide-react';
import { cn, formatCurrency, formatRelativeTime, getStatusColor } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';

const COMPLIANCE_RESERVE_CENTS = 50000;

const statusFilters = [
    { value: 'all', label: 'All Orders' },
    { value: 'AWAITING_FUNDS', label: 'Awaiting Funds' },
    { value: 'FUNDED', label: 'Funded' },
    { value: 'PICKING', label: 'In Progress' },
    { value: 'SHIPPED', label: 'Shipped' },
    { value: 'COMPLETE', label: 'Complete' },
];

const getStatusIcon = (status: string, complianceBlocked: boolean = false) => {
    if (complianceBlocked) {
        return <Shield className="w-4 h-4 text-red-600" />;
    }
    switch (status) {
        case 'COMPLETE':
            return <CheckCircle className="w-4 h-4 text-green-600" />;
        case 'SHIPPED':
            return <Truck className="w-4 h-4 text-blue-600" />;
        case 'AWAITING_FUNDS':
            return <AlertTriangle className="w-4 h-4 text-yellow-600" />;
        case 'CANCELLED':
            return <XCircle className="w-4 h-4 text-red-600" />;
        default:
            return <Clock className="w-4 h-4 text-gray-600" />;
    }
};

export default function OrdersPage() {
    const [orders, setOrders] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [walletData, setWalletData] = useState({ balance_cents: 0, reserved_cents: 0 });
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');

    const fetchOrders = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            params.set('limit', '100');
            if (statusFilter !== 'all') params.set('status', statusFilter);

            const res = await fetch(`/api/v1/merchant/orders?${params.toString()}`);
            if (res.ok) {
                const json = await res.json();
                setOrders(json.data || []);
            }
        } catch { /* silent */ }
        setLoading(false);
    }, [statusFilter]);

    useEffect(() => { fetchOrders(); }, [fetchOrders]);

    useEffect(() => {
        fetch('/api/v1/merchant/me')
            .then(r => r.json())
            .then(m => {
                if (m?.wallet_balance_cents != null) {
                    setWalletData({ balance_cents: m.wallet_balance_cents, reserved_cents: 0 });
                }
            })
            .catch(() => {});
    }, []);

    const isComplianceMet = walletData.balance_cents >= COMPLIANCE_RESERVE_CENTS;
    const blockedOrdersCount = orders.filter((o: any) => o.metadata?.compliance_blocked).length;

    const filteredOrders = orders.filter((order: any) => {
        const woo = (order.woo_order_number || '').toLowerCase();
        const email = (order.customer_email || '').toLowerCase();
        const matchesSearch =
            woo.includes(searchQuery.toLowerCase()) ||
            email.includes(searchQuery.toLowerCase());
        const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    const stats = {
        total: orders.length,
        awaitingFunds: orders.filter((o: any) => o.status === 'AWAITING_FUNDS').length,
        inProgress: orders.filter((o: any) => ['FUNDED', 'PICKING', 'PACKED'].includes(o.status)).length,
        shipped: orders.filter((o: any) => o.status === 'SHIPPED').length,
    };

    return (
        <div className="space-y-6 animate-in">
            {/* Page header */}
            <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Orders</h1>
                <p className="text-gray-500 dark:text-gray-400">Track your supplier order fulfillment</p>
            </div>

            {/* Compliance Warning */}
            {!isComplianceMet && (
                <Card className="bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800">
                    <CardContent className="p-4 flex items-start gap-3">
                        <Shield className="w-6 h-6 text-red-600 dark:text-red-400 mt-0.5 shrink-0" />
                        <div className="flex-1">
                            <h4 className="font-semibold text-red-900 dark:text-red-100">
                                Order Fulfillment Blocked
                            </h4>
                            <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                                Your wallet balance (${(walletData.balance_cents / 100).toFixed(2)}) is below the mandatory
                                <strong> $500.00 compliance reserve</strong>.
                                <strong> {blockedOrdersCount} order(s)</strong> cannot be shipped until you add funds.
                            </p>
                            <p className="text-sm font-medium text-red-800 dark:text-red-200 mt-2">
                                Amount needed: ${((COMPLIANCE_RESERVE_CENTS - walletData.balance_cents) / 100).toFixed(2)}
                            </p>
                            <div className="mt-3">
                                <Link href="/dashboard/wallet">
                                    <Button size="sm" className="bg-red-600 hover:bg-red-700">
                                        Add Funds Now
                                    </Button>
                                </Link>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Stats */}
            <div className="grid gap-4 md:grid-cols-4">
                <Card>
                    <CardContent className="p-4 flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800">
                            <ShoppingCart className="w-5 h-5 text-gray-600" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</p>
                            <p className="text-sm text-gray-500">Total Orders</p>
                        </div>
                    </CardContent>
                </Card>
                <Card className={!isComplianceMet ? 'border-red-300 dark:border-red-800' : ''}>
                    <CardContent className="p-4 flex items-center gap-3">
                        <div className={cn(
                            "p-2 rounded-lg",
                            !isComplianceMet
                                ? "bg-red-100 dark:bg-red-900/20"
                                : "bg-yellow-100 dark:bg-yellow-900/20"
                        )}>
                            {!isComplianceMet ? (
                                <Shield className="w-5 h-5 text-red-600" />
                            ) : (
                                <AlertTriangle className="w-5 h-5 text-yellow-600" />
                            )}
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.awaitingFunds}</p>
                            <p className="text-sm text-gray-500">
                                {!isComplianceMet ? 'Blocked by Reserve' : 'Awaiting Funds'}
                            </p>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4 flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/20">
                            <Package className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.inProgress}</p>
                            <p className="text-sm text-gray-500">In Progress</p>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4 flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/20">
                            <Truck className="w-5 h-5 text-green-600" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.shipped}</p>
                            <p className="text-sm text-gray-500">Shipped</p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Filters */}
            <Card>
                <CardContent className="p-4">
                    <div className="flex flex-col sm:flex-row gap-4">
                        {/* Search */}
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <Input
                                placeholder="Search orders..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-9"
                            />
                        </div>

                        {/* Status filter */}
                        <div className="flex gap-2 flex-wrap">
                            {statusFilters.map((filter) => (
                                <Button
                                    key={filter.value}
                                    variant={statusFilter === filter.value ? 'default' : 'outline'}
                                    size="sm"
                                    onClick={() => setStatusFilter(filter.value)}
                                    className={statusFilter === filter.value ? 'bg-violet-600 hover:bg-violet-700' : ''}
                                >
                                    {filter.label}
                                </Button>
                            ))}
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Orders Table */}
            <Card>
                <CardContent className="p-0">
                    <table className="w-full">
                        <thead className="border-b bg-gray-50 dark:bg-gray-800/50">
                            <tr>
                                <th className="text-left p-4 text-sm font-medium text-gray-500">Order</th>
                                <th className="text-left p-4 text-sm font-medium text-gray-500">Customer</th>
                                <th className="text-left p-4 text-sm font-medium text-gray-500">Status</th>
                                <th className="text-right p-4 text-sm font-medium text-gray-500">Items</th>
                                <th className="text-right p-4 text-sm font-medium text-gray-500">Total</th>
                                <th className="text-left p-4 text-sm font-medium text-gray-500">Date</th>
                                <th className="text-right p-4 text-sm font-medium text-gray-500">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {loading && (
                                <tr>
                                    <td colSpan={7} className="p-8 text-center text-gray-500">
                                        <Loader2 className="w-5 h-5 animate-spin inline mr-2" />
                                        Loading orders...
                                    </td>
                                </tr>
                            )}
                            {filteredOrders.map((order: any) => {
                                const complianceBlocked = order.metadata?.compliance_blocked;
                                const shipment = order.shipments?.[0];
                                const trackingNumber = shipment?.tracking_number;
                                const trackingUrl = shipment?.tracking_url;
                                const itemsCount = order.order_items?.length || 0;
                                const addr = order.shipping_address as Record<string, string> | undefined;
                                const customerName = addr ? [addr.first_name, addr.last_name].filter(Boolean).join(' ') : '';

                                return (
                                    <tr
                                        key={order.id}
                                        className={cn(
                                            "hover:bg-gray-50 dark:hover:bg-gray-800/50",
                                            complianceBlocked && "bg-red-50/50 dark:bg-red-900/10"
                                        )}
                                    >
                                        <td className="p-4">
                                            <div>
                                                <p className="font-medium text-gray-900 dark:text-white">{order.woo_order_number || order.woo_order_id}</p>
                                                <p className="text-xs text-gray-500 font-mono">{order.id?.substring(0, 8)}</p>
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <div>
                                                <p className="text-gray-900 dark:text-white">{customerName || '-'}</p>
                                                <p className="text-xs text-gray-500">{order.customer_email || ''}</p>
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <div className="flex items-center gap-2">
                                                {getStatusIcon(order.status, complianceBlocked)}
                                                <span className={cn(
                                                    'px-2 py-1 rounded-full text-xs font-medium',
                                                    complianceBlocked
                                                        ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                                                        : getStatusColor(order.status)
                                                )}>
                                                    {complianceBlocked ? 'BLOCKED' : (order.status || '').replace(/_/g, ' ')}
                                                </span>
                                            </div>
                                            {complianceBlocked && (
                                                <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                                                    <Shield className="w-3 h-3" />
                                                    Compliance reserve required
                                                </p>
                                            )}
                                            {trackingNumber && (
                                                <p className="text-xs text-gray-500 mt-1">
                                                    {shipment?.carrier}: {trackingNumber.substring(0, 12)}...
                                                </p>
                                            )}
                                        </td>
                                        <td className="p-4 text-right text-gray-500">{itemsCount}</td>
                                        <td className="p-4 text-right font-medium text-gray-900 dark:text-white">
                                            {formatCurrency(order.total_estimate_cents)}
                                        </td>
                                        <td className="p-4 text-gray-500 text-sm">
                                            {formatRelativeTime(order.created_at)}
                                        </td>
                                        <td className="p-4 text-right">
                                            <div className="flex items-center justify-end gap-1">
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    onClick={() => {
                                                        toast({
                                                            title: 'Order Details',
                                                            description: `Order ${order.woo_order_number || order.woo_order_id}: ${itemsCount} item(s), Total: ${formatCurrency(order.total_estimate_cents)}`
                                                        });
                                                    }}
                                                >
                                                    <Eye className="w-4 h-4" />
                                                </Button>
                                                {trackingUrl && (
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        onClick={() => window.open(trackingUrl, '_blank')}
                                                    >
                                                        <Truck className="w-4 h-4" />
                                                    </Button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </CardContent>
            </Card>

            {filteredOrders.length === 0 && (
                <Card>
                    <CardContent className="p-12 text-center">
                        <ShoppingCart className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                        <h3 className="font-semibold text-gray-900 dark:text-white mb-2">No orders found</h3>
                        <p className="text-gray-500">Orders will appear here when synced from your store</p>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
