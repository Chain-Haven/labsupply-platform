import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
    DollarSign,
    ShoppingCart,
    Package,
    TrendingUp,
    ArrowRight,
    AlertCircle
} from 'lucide-react';
import Link from 'next/link';
import { cn, formatCurrency, getStatusColor } from '@/lib/utils';

// Mock data for demo
const stats = [
    {
        name: 'Wallet Balance',
        value: 50000, // cents
        description: 'Available funds',
        icon: DollarSign,
        color: 'text-green-600',
        bgColor: 'bg-green-100 dark:bg-green-900/20',
        href: '/dashboard/wallet',
    },
    {
        name: 'Active Orders',
        value: 12,
        description: 'In fulfillment',
        icon: ShoppingCart,
        color: 'text-blue-600',
        bgColor: 'bg-blue-100 dark:bg-blue-900/20',
        href: '/dashboard/orders',
    },
    {
        name: 'Products',
        value: 24,
        description: 'In your catalog',
        icon: Package,
        color: 'text-violet-600',
        bgColor: 'bg-violet-100 dark:bg-violet-900/20',
        href: '/dashboard/catalog',
    },
    {
        name: 'This Month',
        value: 15600, // cents
        description: 'Total spend',
        icon: TrendingUp,
        color: 'text-orange-600',
        bgColor: 'bg-orange-100 dark:bg-orange-900/20',
        href: '/dashboard/wallet',
    },
];

const recentOrders = [
    { id: '1', wooOrderId: '1001', status: 'SHIPPED', total: 4500, date: '2024-01-10' },
    { id: '2', wooOrderId: '1002', status: 'FUNDED', total: 3200, date: '2024-01-10' },
    { id: '3', wooOrderId: '1003', status: 'AWAITING_FUNDS', total: 8900, date: '2024-01-09' },
    { id: '4', wooOrderId: '1004', status: 'COMPLETE', total: 2100, date: '2024-01-08' },
];

const alerts = [
    { type: 'warning', message: 'Order #1003 awaiting funds - $89.00 needed' },
];

export default function DashboardPage() {
    return (
        <div className="space-y-6 animate-in">
            {/* Page header */}
            <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
                <p className="text-gray-500 dark:text-gray-400">Welcome back! Here's what's happening today.</p>
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
                                        {typeof stat.value === 'number' && stat.name.includes('Balance') || stat.name.includes('Month')
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
