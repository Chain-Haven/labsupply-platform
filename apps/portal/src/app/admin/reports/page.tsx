'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
    BarChart3,
    TrendingUp,
    TrendingDown,
    Download,
    Calendar,
    DollarSign,
    Users,
    ShoppingCart,
    Package
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

// Reports data - empty by default (fetched from API in production)
const monthlyRevenue: { month: string; revenue: number }[] = [];

const topProducts: { name: string; sku: string; units: number; revenue: number }[] = [];

const topMerchants: { name: string; orders: number; revenue: number }[] = [];

export default function ReportsPage() {
    const maxRevenue = Math.max(...monthlyRevenue.map(m => m.revenue));

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Reports</h1>
                    <p className="text-gray-500">Analytics and performance insights</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline">
                        <Calendar className="w-4 h-4 mr-2" />
                        Last 30 Days
                    </Button>
                    <Button variant="outline">
                        <Download className="w-4 h-4 mr-2" />
                        Export
                    </Button>
                </div>
            </div>

            {/* Key Metrics */}
            <div className="grid gap-4 md:grid-cols-4">
                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-4">
                            <div className="w-10 h-10 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                                <DollarSign className="w-5 h-5 text-green-600" />
                            </div>
                            <span className="text-green-600 text-sm flex items-center">
                                <TrendingUp className="w-4 h-4 mr-1" />
                                +12.5%
                            </span>
                        </div>
                        <p className="text-sm text-gray-500">Total Revenue</p>
                        <p className="text-2xl font-bold text-gray-900 dark:text-white">
                            {formatCurrency(8750000)}
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-4">
                            <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                                <ShoppingCart className="w-5 h-5 text-blue-600" />
                            </div>
                            <span className="text-green-600 text-sm flex items-center">
                                <TrendingUp className="w-4 h-4 mr-1" />
                                +8.3%
                            </span>
                        </div>
                        <p className="text-sm text-gray-500">Total Orders</p>
                        <p className="text-2xl font-bold text-gray-900 dark:text-white">342</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-4">
                            <div className="w-10 h-10 rounded-lg bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center">
                                <Users className="w-5 h-5 text-violet-600" />
                            </div>
                            <span className="text-green-600 text-sm flex items-center">
                                <TrendingUp className="w-4 h-4 mr-1" />
                                +15.2%
                            </span>
                        </div>
                        <p className="text-sm text-gray-500">Active Merchants</p>
                        <p className="text-2xl font-bold text-gray-900 dark:text-white">89</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-4">
                            <div className="w-10 h-10 rounded-lg bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                                <Package className="w-5 h-5 text-orange-600" />
                            </div>
                            <span className="text-red-600 text-sm flex items-center">
                                <TrendingDown className="w-4 h-4 mr-1" />
                                -2.1%
                            </span>
                        </div>
                        <p className="text-sm text-gray-500">Avg Order Value</p>
                        <p className="text-2xl font-bold text-gray-900 dark:text-white">
                            {formatCurrency(25584)}
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Revenue Chart */}
            <Card>
                <CardHeader>
                    <CardTitle>Revenue Trend</CardTitle>
                    <CardDescription>Monthly revenue over the last 6 months</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex items-end justify-between gap-2 h-48">
                        {monthlyRevenue.map((month, index) => (
                            <div key={index} className="flex-1 flex flex-col items-center">
                                <div
                                    className="w-full bg-gradient-to-t from-violet-600 to-violet-400 rounded-t"
                                    style={{
                                        height: `${(month.revenue / maxRevenue) * 160}px`,
                                        maxWidth: '60px',
                                        margin: '0 auto'
                                    }}
                                />
                                <p className="text-xs text-gray-500 mt-2">{month.month}</p>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>

            <div className="grid gap-6 lg:grid-cols-2">
                {/* Top Products */}
                <Card>
                    <CardHeader>
                        <CardTitle>Top Products</CardTitle>
                        <CardDescription>Best selling products this month</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {topProducts.map((product, index) => (
                                <div key={index} className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <span className="w-6 h-6 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-xs font-medium">
                                            {index + 1}
                                        </span>
                                        <div>
                                            <p className="font-medium text-gray-900 dark:text-white text-sm">
                                                {product.name}
                                            </p>
                                            <p className="text-xs text-gray-500 font-mono">{product.sku}</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-medium text-gray-900 dark:text-white text-sm">
                                            {formatCurrency(product.revenue)}
                                        </p>
                                        <p className="text-xs text-gray-500">{product.units} units</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                {/* Top Merchants */}
                <Card>
                    <CardHeader>
                        <CardTitle>Top Merchants</CardTitle>
                        <CardDescription>Highest revenue merchants this month</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {topMerchants.map((merchant, index) => (
                                <div key={index} className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <span className="w-6 h-6 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-xs font-medium">
                                            {index + 1}
                                        </span>
                                        <p className="font-medium text-gray-900 dark:text-white text-sm">
                                            {merchant.name}
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-medium text-gray-900 dark:text-white text-sm">
                                            {formatCurrency(merchant.revenue)}
                                        </p>
                                        <p className="text-xs text-gray-500">{merchant.orders} orders</p>
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
