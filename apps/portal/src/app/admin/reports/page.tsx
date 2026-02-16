'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
    Download,
    Calendar,
    DollarSign,
    Users,
    ShoppingCart,
    Package,
    Loader2,
    AlertCircle
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer
} from 'recharts';

type ReportsData = {
    totalRevenue: number;
    totalOrders: number;
    activeMerchants: number;
    revenueByDay: { date: string; amount: number }[];
    ordersByStatus: { status: string; count: number }[];
};

export default function ReportsPage() {
    const [data, setData] = useState<ReportsData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function fetchReports() {
            try {
                setLoading(true);
                setError(null);
                const res = await fetch('/api/v1/admin/reports');
                if (!res.ok) {
                    throw new Error(res.status === 401 ? 'Unauthorized' : 'Failed to load reports');
                }
                const json = await res.json();
                if (json.error) throw new Error(json.error);
                setData(json.data);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Failed to load reports');
            } finally {
                setLoading(false);
            }
        }
        fetchReports();
    }, []);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
                <AlertCircle className="w-12 h-12 text-red-500" />
                <p className="text-lg font-medium text-gray-900 dark:text-white">{error}</p>
                <Button
                    variant="outline"
                    onClick={() => window.location.reload()}
                >
                    Retry
                </Button>
            </div>
        );
    }

    const reports = data!;
    const avgOrderValue =
        reports.totalOrders > 0 ? Math.round(reports.totalRevenue / reports.totalOrders) : 0;
    const chartData = reports.revenueByDay.map(({ date, amount }) => ({ date, amount }));

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
                        </div>
                        <p className="text-sm text-gray-500">Total Revenue</p>
                        <p className="text-2xl font-bold text-gray-900 dark:text-white">
                            {formatCurrency(reports.totalRevenue)}
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-4">
                            <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                                <ShoppingCart className="w-5 h-5 text-blue-600" />
                            </div>
                        </div>
                        <p className="text-sm text-gray-500">Total Orders</p>
                        <p className="text-2xl font-bold text-gray-900 dark:text-white">
                            {reports.totalOrders}
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-4">
                            <div className="w-10 h-10 rounded-lg bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center">
                                <Users className="w-5 h-5 text-violet-600" />
                            </div>
                        </div>
                        <p className="text-sm text-gray-500">Active Merchants</p>
                        <p className="text-2xl font-bold text-gray-900 dark:text-white">
                            {reports.activeMerchants}
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-4">
                            <div className="w-10 h-10 rounded-lg bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                                <Package className="w-5 h-5 text-orange-600" />
                            </div>
                        </div>
                        <p className="text-sm text-gray-500">Avg Order Value</p>
                        <p className="text-2xl font-bold text-gray-900 dark:text-white">
                            {formatCurrency(avgOrderValue)}
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Revenue Chart */}
            <Card>
                <CardHeader>
                    <CardTitle>Revenue Trend</CardTitle>
                    <CardDescription>Daily revenue over the last 30 days</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="h-64">
                        {chartData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={chartData}>
                                    <defs>
                                        <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" />
                                    <XAxis
                                        dataKey="date"
                                        tick={{ fontSize: 12 }}
                                        tickFormatter={(v) => {
                                            const d = new Date(v);
                                            return `${d.getMonth() + 1}/${d.getDate()}`;
                                        }}
                                    />
                                    <YAxis
                                        tick={{ fontSize: 12 }}
                                        tickFormatter={(v) => `$${(v / 100).toFixed(0)}`}
                                    />
                                    <Tooltip
                                        formatter={(value: number) => [formatCurrency(value), 'Revenue']}
                                        labelFormatter={(label) => new Date(label).toLocaleDateString()}
                                    />
                                    <Area
                                        type="monotone"
                                        dataKey="amount"
                                        stroke="#8b5cf6"
                                        strokeWidth={2}
                                        fill="url(#revenueGradient)"
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="flex items-center justify-center h-full text-gray-500">
                                No revenue data for this period
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>

            <div className="grid gap-6 lg:grid-cols-2">
                {/* Orders by Status - uses ordersByStatus from API */}
                <Card>
                    <CardHeader>
                        <CardTitle>Orders by Status</CardTitle>
                        <CardDescription>Order count by status</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {reports.ordersByStatus.length > 0 ? (
                                reports.ordersByStatus.map((item, index) => (
                                    <div key={item.status} className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <span className="w-6 h-6 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-xs font-medium">
                                                {index + 1}
                                            </span>
                                            <p className="font-medium text-gray-900 dark:text-white text-sm">
                                                {item.status}
                                            </p>
                                        </div>
                                        <p className="font-medium text-gray-900 dark:text-white text-sm">
                                            {item.count} orders
                                        </p>
                                    </div>
                                ))
                            ) : (
                                <p className="text-sm text-gray-500">No order data available</p>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Top Merchants - API doesn't return this; show empty state */}
                <Card>
                    <CardHeader>
                        <CardTitle>Top Merchants</CardTitle>
                        <CardDescription>Highest revenue merchants this month</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-gray-500">No merchant data available</p>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
