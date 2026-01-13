'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
    Users,
    Box,
    ShoppingCart,
    AlertTriangle,
    TrendingUp,
    Clock,
    CheckCircle,
    ArrowUpRight,
    Package
} from 'lucide-react';
import Link from 'next/link';
import { formatCurrency } from '@/lib/utils';

// Mock data for dashboard
const stats = {
    totalMerchants: 156,
    pendingKyb: 8,
    activeOrders: 42,
    lowStockProducts: 5,
    revenueToday: 1245000, // cents
    revenueThisWeek: 8750000,
};

const recentActivity = [
    { id: 1, type: 'kyb_submitted', merchant: 'Research Labs Inc', time: '5 minutes ago' },
    { id: 2, type: 'order_placed', merchant: 'BioTest Supply', order: 'ORD-1234', time: '12 minutes ago' },
    { id: 3, type: 'low_stock', product: 'BPC-157 5mg', qty: 8, time: '1 hour ago' },
    { id: 4, type: 'kyb_approved', merchant: 'Peptide World LLC', time: '2 hours ago' },
    { id: 5, type: 'order_shipped', order: 'ORD-1230', time: '3 hours ago' },
];

const pendingReviews = [
    { id: '1', company: 'New Research Corp', type: 'Reseller', submittedAt: '2024-01-10' },
    { id: '2', company: 'BioScience Labs', type: 'Institution', submittedAt: '2024-01-10' },
    { id: '3', company: 'Peptide Traders', type: 'Reseller', submittedAt: '2024-01-09' },
];

const lowStockProducts = [
    { sku: 'BPC-157-5MG', name: 'BPC-157 5mg', qty: 8, threshold: 10 },
    { sku: 'TB-500-5MG', name: 'TB-500 5mg', qty: 5, threshold: 10 },
    { sku: 'SEMA-3MG', name: 'Semaglutide 3mg', qty: 3, threshold: 5 },
];

export default function AdminDashboard() {
    const getActivityIcon = (type: string) => {
        switch (type) {
            case 'kyb_submitted':
                return <Clock className="w-4 h-4 text-yellow-500" />;
            case 'kyb_approved':
                return <CheckCircle className="w-4 h-4 text-green-500" />;
            case 'order_placed':
            case 'order_shipped':
                return <ShoppingCart className="w-4 h-4 text-blue-500" />;
            case 'low_stock':
                return <AlertTriangle className="w-4 h-4 text-red-500" />;
            default:
                return <Package className="w-4 h-4 text-gray-500" />;
        }
    };

    const getActivityText = (activity: typeof recentActivity[0]) => {
        switch (activity.type) {
            case 'kyb_submitted':
                return `${activity.merchant} submitted KYB application`;
            case 'kyb_approved':
                return `${activity.merchant} KYB approved`;
            case 'order_placed':
                return `${activity.merchant} placed order ${activity.order}`;
            case 'order_shipped':
                return `Order ${activity.order} shipped`;
            case 'low_stock':
                return `${activity.product} low stock (${activity.qty} remaining)`;
            default:
                return 'Unknown activity';
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Admin Dashboard</h1>
                <p className="text-gray-500">Overview of your supplier operations</p>
            </div>

            {/* Stats Grid */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-500">Total Merchants</p>
                                <p className="text-3xl font-bold text-gray-900 dark:text-white">
                                    {stats.totalMerchants}
                                </p>
                            </div>
                            <div className="w-12 h-12 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                                <Users className="w-6 h-6 text-blue-600" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className={stats.pendingKyb > 0 ? 'border-yellow-200 bg-yellow-50 dark:bg-yellow-900/10' : ''}>
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-500">Pending KYB</p>
                                <p className="text-3xl font-bold text-gray-900 dark:text-white">
                                    {stats.pendingKyb}
                                </p>
                            </div>
                            <div className="w-12 h-12 rounded-lg bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center">
                                <Clock className="w-6 h-6 text-yellow-600" />
                            </div>
                        </div>
                        {stats.pendingKyb > 0 && (
                            <Link href="/admin/kyb-review">
                                <Button variant="link" className="p-0 h-auto mt-2 text-yellow-700">
                                    Review now <ArrowUpRight className="w-3 h-3 ml-1" />
                                </Button>
                            </Link>
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-500">Active Orders</p>
                                <p className="text-3xl font-bold text-gray-900 dark:text-white">
                                    {stats.activeOrders}
                                </p>
                            </div>
                            <div className="w-12 h-12 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                                <ShoppingCart className="w-6 h-6 text-green-600" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className={stats.lowStockProducts > 0 ? 'border-red-200 bg-red-50 dark:bg-red-900/10' : ''}>
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-500">Low Stock Alerts</p>
                                <p className="text-3xl font-bold text-gray-900 dark:text-white">
                                    {stats.lowStockProducts}
                                </p>
                            </div>
                            <div className="w-12 h-12 rounded-lg bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                                <AlertTriangle className="w-6 h-6 text-red-600" />
                            </div>
                        </div>
                        {stats.lowStockProducts > 0 && (
                            <Link href="/admin/inventory?filter=low_stock">
                                <Button variant="link" className="p-0 h-auto mt-2 text-red-700">
                                    View products <ArrowUpRight className="w-3 h-3 ml-1" />
                                </Button>
                            </Link>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Revenue Cards */}
            <div className="grid gap-4 md:grid-cols-2">
                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <p className="text-sm text-gray-500">Today's Revenue</p>
                                <p className="text-3xl font-bold text-gray-900 dark:text-white">
                                    {formatCurrency(stats.revenueToday)}
                                </p>
                            </div>
                            <div className="flex items-center text-green-600 text-sm">
                                <TrendingUp className="w-4 h-4 mr-1" />
                                +12%
                            </div>
                        </div>
                        <div className="h-2 bg-gray-200 rounded-full">
                            <div className="h-2 bg-green-500 rounded-full" style={{ width: '68%' }} />
                        </div>
                        <p className="text-xs text-gray-500 mt-2">68% of daily target</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <p className="text-sm text-gray-500">This Week</p>
                                <p className="text-3xl font-bold text-gray-900 dark:text-white">
                                    {formatCurrency(stats.revenueThisWeek)}
                                </p>
                            </div>
                            <div className="flex items-center text-green-600 text-sm">
                                <TrendingUp className="w-4 h-4 mr-1" />
                                +8%
                            </div>
                        </div>
                        <div className="h-2 bg-gray-200 rounded-full">
                            <div className="h-2 bg-blue-500 rounded-full" style={{ width: '85%' }} />
                        </div>
                        <p className="text-xs text-gray-500 mt-2">85% of weekly target</p>
                    </CardContent>
                </Card>
            </div>

            {/* Bottom Grid */}
            <div className="grid gap-6 lg:grid-cols-3">
                {/* Pending KYB Reviews */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">Pending KYB Reviews</CardTitle>
                        <CardDescription>Applications awaiting review</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            {pendingReviews.map((review) => (
                                <div key={review.id} className="flex items-center justify-between py-2 border-b last:border-0">
                                    <div>
                                        <p className="font-medium text-gray-900 dark:text-white text-sm">
                                            {review.company}
                                        </p>
                                        <p className="text-xs text-gray-500">{review.type}</p>
                                    </div>
                                    <Link href={`/admin/kyb-review/${review.id}`}>
                                        <Button size="sm" variant="outline">Review</Button>
                                    </Link>
                                </div>
                            ))}
                        </div>
                        <Link href="/admin/kyb-review">
                            <Button variant="link" className="w-full mt-4">
                                View all pending reviews
                            </Button>
                        </Link>
                    </CardContent>
                </Card>

                {/* Low Stock Products */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">Low Stock Alert</CardTitle>
                        <CardDescription>Products needing restock</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            {lowStockProducts.map((product) => (
                                <div key={product.sku} className="flex items-center justify-between py-2 border-b last:border-0">
                                    <div>
                                        <p className="font-medium text-gray-900 dark:text-white text-sm">
                                            {product.name}
                                        </p>
                                        <p className="text-xs font-mono text-gray-500">{product.sku}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-red-600 font-medium">{product.qty} left</p>
                                        <p className="text-xs text-gray-500">Min: {product.threshold}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <Link href="/admin/inventory?filter=low_stock">
                            <Button variant="link" className="w-full mt-4">
                                View all low stock
                            </Button>
                        </Link>
                    </CardContent>
                </Card>

                {/* Recent Activity */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">Recent Activity</CardTitle>
                        <CardDescription>Latest platform events</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            {recentActivity.map((activity) => (
                                <div key={activity.id} className="flex items-start gap-3 py-2 border-b last:border-0">
                                    {getActivityIcon(activity.type)}
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm text-gray-900 dark:text-white">
                                            {getActivityText(activity)}
                                        </p>
                                        <p className="text-xs text-gray-500">{activity.time}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
