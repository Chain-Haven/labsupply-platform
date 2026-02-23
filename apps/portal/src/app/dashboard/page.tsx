'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
    DollarSign,
    ShoppingCart,
    Package,
    TrendingUp,
    ArrowRight,
    AlertCircle,
    Loader2
} from 'lucide-react';
import Link from 'next/link';
import { cn, formatCurrency, getStatusColor } from '@/lib/utils';

interface DashboardData {
    walletBalanceCents: number;
    reservedCents: number;
    activeOrders: number;
    productCount: number;
    monthlySpendCents: number;
    recentOrders: {
        id: string;
        wooOrderId: string;
        wooOrderNumber: string;
        status: string;
        totalEstimateCents: number;
        createdAt: string;
    }[];
    alerts: { type: string; message: string }[];
}

const statConfig = [
    {
        name: 'Wallet Balance',
        key: 'walletBalanceCents' as const,
        description: 'Available funds',
        icon: DollarSign,
        color: 'text-green-600',
        bgColor: 'bg-green-100 dark:bg-green-900/20',
        href: '/dashboard/wallet',
        isCurrency: true,
    },
    {
        name: 'Active Orders',
        key: 'activeOrders' as const,
        description: 'In fulfillment',
        icon: ShoppingCart,
        color: 'text-blue-600',
        bgColor: 'bg-blue-100 dark:bg-blue-900/20',
        href: '/dashboard/orders',
        isCurrency: false,
    },
    {
        name: 'Products',
        key: 'productCount' as const,
        description: 'In your catalog',
        icon: Package,
        color: 'text-violet-600',
        bgColor: 'bg-violet-100 dark:bg-violet-900/20',
        href: '/dashboard/catalog',
        isCurrency: false,
    },
    {
        name: 'This Month',
        key: 'monthlySpendCents' as const,
        description: 'Total spend',
        icon: TrendingUp,
        color: 'text-orange-600',
        bgColor: 'bg-orange-100 dark:bg-orange-900/20',
        href: '/dashboard/wallet',
        isCurrency: true,
    },
];

export default function DashboardPage() {
    const [data, setData] = useState<DashboardData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetch('/api/v1/merchant/dashboard')
            .then((res) => {
                if (!res.ok) throw new Error('Failed to load dashboard');
                return res.json();
            })
            .then((json) => setData(json.data))
            .catch((err) => setError(err.message))
            .finally(() => setLoading(false));
    }, []);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
            </div>
        );
    }

    if (error || !data) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
                <AlertCircle className="w-10 h-10 text-red-400" />
                <p className="text-gray-600 dark:text-gray-400">{error || 'Something went wrong'}</p>
                <Button variant="outline" onClick={() => window.location.reload()}>Retry</Button>
            </div>
        );
    }

    const stats = statConfig.map((s) => ({
        ...s,
        value: data[s.key],
    }));

    const recentOrders = data.recentOrders.map((o) => ({
        id: o.id,
        wooOrderId: o.wooOrderNumber || o.wooOrderId,
        status: o.status,
        total: o.totalEstimateCents,
        date: new Date(o.createdAt).toLocaleDateString(),
    }));

    const alerts = data.alerts;

    return (
        <div className="space-y-6 animate-in">
            {/* Page header */}
            <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
                <p className="text-gray-500 dark:text-gray-400">Welcome back! Here&apos;s what&apos;s happening today.</p>
            </div>

            {/* Alerts */}
            {alerts.length > 0 && (
                <div className="space-y-2">
                    {alerts.map((alert, index) => (
                        <div
                            key={index}
                            className="flex items-center gap-3 p-4 rounded-lg bg-yellow-50 border border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-800"
                        >
                            <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
                            <p className="text-sm text-yellow-800 dark:text-yellow-200">{alert.message}</p>
                            <Link href="/dashboard/wallet" className="ml-auto">
                                <Button size="sm" variant="outline">Top Up Wallet</Button>
                            </Link>
                        </div>
                    ))}
                </div>
            )}

            {/* Stats grid */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {stats.map((stat, index) => (
                    <Link key={index} href={stat.href}>
                        <Card className="hover:shadow-md transition-shadow cursor-pointer">
                            <CardContent className="p-6">
                                <div className="flex items-center justify-between">
                                    <div className={cn('p-2 rounded-lg', stat.bgColor)}>
                                        <stat.icon className={cn('w-5 h-5', stat.color)} />
                                    </div>
                                    <ArrowRight className="w-4 h-4 text-gray-400" />
                                </div>
                                <div className="mt-4">
                                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                                        {stat.isCurrency
                                            ? formatCurrency(stat.value)
                                            : stat.value}
                                    </p>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">{stat.name}</p>
                                    <p className="text-xs text-gray-400 mt-1">{stat.description}</p>
                                </div>
                            </CardContent>
                        </Card>
                    </Link>
                ))}
            </div>

            {/* Recent orders */}
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle>Recent Orders</CardTitle>
                        <CardDescription>Your latest supplier orders</CardDescription>
                    </div>
                    <Link href="/dashboard/orders">
                        <Button variant="outline" size="sm">
                            View All
                            <ArrowRight className="w-4 h-4 ml-2" />
                        </Button>
                    </Link>
                </CardHeader>
                <CardContent>
                    {recentOrders.length === 0 ? (
                        <div className="py-8 text-center">
                            <Package className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                            <p className="text-sm text-gray-500 dark:text-gray-400">No orders yet</p>
                            <p className="text-xs text-gray-400 mt-1">Orders will appear here once your store starts syncing.</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-gray-200 dark:divide-gray-700">
                            {recentOrders.map((order) => (
                                <div key={order.id} className="py-4 flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div>
                                            <p className="font-medium text-gray-900 dark:text-white">
                                                WooCommerce #{order.wooOrderId}
                                            </p>
                                            <p className="text-sm text-gray-500">{order.date}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <span className={cn(
                                            'px-2 py-1 rounded-full text-xs font-medium',
                                            getStatusColor(order.status)
                                        )}>
                                            {order.status.replace(/_/g, ' ')}
                                        </span>
                                        <span className="font-medium text-gray-900 dark:text-white">
                                            {formatCurrency(order.total)}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Quick actions */}
            <div className="grid gap-4 md:grid-cols-3">
                <Card className="hover:shadow-md transition-shadow">
                    <CardContent className="p-6">
                        <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                            Connect a Store
                        </h3>
                        <p className="text-sm text-gray-500 mb-4">
                            Install our WooCommerce plugin to start syncing orders.
                        </p>
                        <Link href="/dashboard/stores">
                            <Button size="sm">Add Store</Button>
                        </Link>
                    </CardContent>
                </Card>

                <Card className="hover:shadow-md transition-shadow">
                    <CardContent className="p-6">
                        <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                            Browse Catalog
                        </h3>
                        <p className="text-sm text-gray-500 mb-4">
                            View available products and import to your store.
                        </p>
                        <Link href="/dashboard/catalog">
                            <Button size="sm" variant="outline">View Catalog</Button>
                        </Link>
                    </CardContent>
                </Card>

                <Card className="hover:shadow-md transition-shadow">
                    <CardContent className="p-6">
                        <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                            Top Up Wallet
                        </h3>
                        <p className="text-sm text-gray-500 mb-4">
                            Add funds to ensure orders are automatically fulfilled.
                        </p>
                        <Link href="/dashboard/wallet">
                            <Button size="sm" variant="gradient">Add Funds</Button>
                        </Link>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
