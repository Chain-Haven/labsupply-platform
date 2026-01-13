'use client';

import { useState } from 'react';
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
    AlertCircle
} from 'lucide-react';
import { cn, formatCurrency, formatRelativeTime, getStatusColor } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';

// Compliance reserve constant
const COMPLIANCE_RESERVE_CENTS = 50000; // $500.00

// Mock wallet data
const walletData = {
    balance_cents: 45000, // $450 - below compliance reserve for demo
    reserved_cents: 5895,
};

// Mock orders data
const orders = [
    {
        id: 'ord_001',
        woo_order_id: '1001',
        woo_order_number: 'WC-1001',
        status: 'SHIPPED',
        customer_name: 'John Smith',
        customer_email: 'john@example.com',
        items_count: 3,
        subtotal_cents: 12500,
        total_estimate_cents: 13850,
        created_at: '2024-01-10T14:30:00Z',
        tracking_number: '1Z999AA10123456784',
        carrier: 'UPS',
        compliance_blocked: false,
    },
    {
        id: 'ord_002',
        woo_order_id: '1002',
        woo_order_number: 'WC-1002',
        status: 'AWAITING_FUNDS',
        customer_name: 'Jane Doe',
        customer_email: 'jane@example.com',
        items_count: 1,
        subtotal_cents: 4500,
        total_estimate_cents: 5295,
        created_at: '2024-01-10T11:00:00Z',
        tracking_number: null,
        carrier: null,
        compliance_blocked: true, // Blocked due to compliance reserve
    },
    {
        id: 'ord_003',
        woo_order_id: '1003',
        woo_order_number: 'WC-1003',
        status: 'AWAITING_FUNDS',
        customer_name: 'Bob Wilson',
        customer_email: 'bob@example.com',
        items_count: 2,
        subtotal_cents: 8900,
        total_estimate_cents: 9995,
        created_at: '2024-01-09T16:45:00Z',
        tracking_number: null,
        carrier: null,
        compliance_blocked: true, // Blocked due to compliance reserve
    },
    {
        id: 'ord_004',
        woo_order_id: '1004',
        woo_order_number: 'WC-1004',
        status: 'COMPLETE',
        customer_name: 'Alice Brown',
        customer_email: 'alice@example.com',
        items_count: 5,
        subtotal_cents: 23400,
        total_estimate_cents: 25890,
        created_at: '2024-01-08T09:15:00Z',
        tracking_number: '9400111899223033333333',
        carrier: 'USPS',
        compliance_blocked: false,
    },
    {
        id: 'ord_005',
        woo_order_id: '1005',
        woo_order_number: 'WC-1005',
        status: 'PICKING',
        customer_name: 'Charlie Green',
        customer_email: 'charlie@example.com',
        items_count: 2,
        subtotal_cents: 6700,
        total_estimate_cents: 7450,
        created_at: '2024-01-10T08:30:00Z',
        tracking_number: null,
        carrier: null,
        compliance_blocked: false,
    },
];

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
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');

    // Check if compliance reserve is met
    const isComplianceMet = walletData.balance_cents >= COMPLIANCE_RESERVE_CENTS;
    const blockedOrdersCount = orders.filter(o => o.compliance_blocked).length;

    const filteredOrders = orders.filter((order) => {
        const matchesSearch =
            order.woo_order_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
            order.customer_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            order.customer_email.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    const stats = {
        total: orders.length,
        awaitingFunds: orders.filter(o => o.status === 'AWAITING_FUNDS').length,
        inProgress: orders.filter(o => ['FUNDED', 'PICKING', 'PACKED'].includes(o.status)).length,
        shipped: orders.filter(o => o.status === 'SHIPPED').length,
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
                            {filteredOrders.map((order) => (
                                <tr
                                    key={order.id}
                                    className={cn(
                                        "hover:bg-gray-50 dark:hover:bg-gray-800/50",
                                        order.compliance_blocked && "bg-red-50/50 dark:bg-red-900/10"
                                    )}
                                >
                                    <td className="p-4">
                                        <div>
                                            <p className="font-medium text-gray-900 dark:text-white">{order.woo_order_number}</p>
                                            <p className="text-xs text-gray-500 font-mono">{order.id}</p>
                                        </div>
                                    </td>
                                    <td className="p-4">
                                        <div>
                                            <p className="text-gray-900 dark:text-white">{order.customer_name}</p>
                                            <p className="text-xs text-gray-500">{order.customer_email}</p>
                                        </div>
                                    </td>
                                    <td className="p-4">
                                        <div className="flex items-center gap-2">
                                            {getStatusIcon(order.status, order.compliance_blocked)}
                                            <span className={cn(
                                                'px-2 py-1 rounded-full text-xs font-medium',
                                                order.compliance_blocked
                                                    ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                                                    : getStatusColor(order.status)
                                            )}>
                                                {order.compliance_blocked ? 'BLOCKED' : order.status.replace(/_/g, ' ')}
                                            </span>
                                        </div>
                                        {order.compliance_blocked && (
                                            <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                                                <Shield className="w-3 h-3" />
                                                Compliance reserve required
                                            </p>
                                        )}
                                        {order.tracking_number && (
                                            <p className="text-xs text-gray-500 mt-1">
                                                {order.carrier}: {order.tracking_number.substring(0, 12)}...
                                            </p>
                                        )}
                                    </td>
                                    <td className="p-4 text-right text-gray-500">{order.items_count}</td>
                                    <td className="p-4 text-right font-medium text-gray-900 dark:text-white">
                                        {formatCurrency(order.total_estimate_cents)}
                                    </td>
                                    <td className="p-4 text-gray-500 text-sm">
                                        {formatRelativeTime(order.created_at)}
                                    </td>
                                    <td className="p-4 text-right">
                                        <Button size="sm" variant="ghost">
                                            <Eye className="w-4 h-4" />
                                        </Button>
                                    </td>
                                </tr>
                            ))}
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
