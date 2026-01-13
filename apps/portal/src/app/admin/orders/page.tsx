'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Search,
    ShoppingCart,
    Package,
    Truck,
    CheckCircle,
    Clock,
    Eye,
    MoreHorizontal,
    Upload,
    FileText,
    Printer,
    ExternalLink,
    RefreshCw,
    CheckSquare,
    Square,
    X,
    AlertCircle,
    Ship,
    Tag,
    FlaskConical
} from 'lucide-react';
import { cn, formatCurrency, formatRelativeTime } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';

// Order interface with extended fields
interface Order {
    id: string;
    merchant: string;
    status: string;
    order_type?: 'REGULAR' | 'TESTING';
    shipping_method?: 'STANDARD' | 'EXPEDITED';
    items_count: number;
    total_cents: number;
    created_at: string;
    shipping_address: string;
    tracking_number?: string;
    shipstation_order_id?: string;
    shipstation_synced?: boolean;
    label_url?: string;
    label_printed?: boolean;
    label_printed_at?: string;
    selected?: boolean;
}

// Orders data - empty by default (fetched from API in production)
const initialOrders: Order[] = [];

const getStatusColor = (status: string) => {
    switch (status) {
        case 'COMPLETE':
            return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
        case 'SHIPPED':
            return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
        case 'PROCESSING':
            return 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400';
        case 'AWAITING_FUNDS':
            return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400';
        default:
            return 'bg-gray-100 text-gray-700';
    }
};

const getStatusIcon = (status: string) => {
    switch (status) {
        case 'COMPLETE':
            return <CheckCircle className="w-4 h-4" />;
        case 'SHIPPED':
            return <Truck className="w-4 h-4" />;
        case 'PROCESSING':
            return <Package className="w-4 h-4" />;
        case 'AWAITING_FUNDS':
            return <Clock className="w-4 h-4" />;
        default:
            return <ShoppingCart className="w-4 h-4" />;
    }
};

export default function OrdersPage() {
    const [orders, setOrders] = useState<Order[]>(initialOrders);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [selectedOrders, setSelectedOrders] = useState<Set<string>>(new Set());
    const [isPushingToShipStation, setIsPushingToShipStation] = useState(false);
    const [isExportingLabels, setIsExportingLabels] = useState(false);
    const [showOrderDetails, setShowOrderDetails] = useState<Order | null>(null);

    const filteredOrders = orders.filter((order) => {
        const matchesSearch =
            order.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
            order.merchant.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesStatus =
            statusFilter === 'all' ||
            (statusFilter === 'TESTING' ? order.order_type === 'TESTING' : order.status === statusFilter);
        return matchesSearch && matchesStatus;
    });

    const toggleOrderSelection = (orderId: string) => {
        setSelectedOrders(prev => {
            const next = new Set(prev);
            if (next.has(orderId)) {
                next.delete(orderId);
            } else {
                next.add(orderId);
            }
            return next;
        });
    };

    const selectAllOrders = () => {
        if (selectedOrders.size === filteredOrders.length) {
            setSelectedOrders(new Set());
        } else {
            setSelectedOrders(new Set(filteredOrders.map(o => o.id)));
        }
    };

    // Export orders to CSV
    const handleExportCSV = () => {
        const ordersToExport = filteredOrders.length > 0 ? filteredOrders : orders;

        if (ordersToExport.length === 0) {
            toast({
                title: 'No orders to export',
                description: 'There are no orders to export.',
                variant: 'destructive'
            });
            return;
        }

        const headers = ['Order ID', 'Merchant', 'Status', 'Shipping Method', 'Items', 'Total', 'Ship To', 'Created', 'Tracking', 'ShipStation Synced'];
        const csvRows = [headers.join(',')];

        ordersToExport.forEach(order => {
            const row = [
                order.id,
                `"${order.merchant}"`,
                order.status,
                order.shipping_method || 'STANDARD',
                order.items_count,
                (order.total_cents / 100).toFixed(2),
                `"${order.shipping_address}"`,
                new Date(order.created_at).toLocaleDateString(),
                order.tracking_number || '',
                order.shipstation_synced ? 'Yes' : 'No'
            ];
            csvRows.push(row.join(','));
        });

        const csvContent = csvRows.join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `orders-export-${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        URL.revokeObjectURL(url);

        toast({
            title: 'Orders exported',
            description: `${ordersToExport.length} order(s) exported to CSV.`,
        });
    };

    // Push selected orders to ShipStation
    const handlePushToShipStation = async () => {
        if (selectedOrders.size === 0) {
            toast({
                title: 'No orders selected',
                description: 'Please select orders to push to ShipStation.',
                variant: 'destructive'
            });
            return;
        }

        setIsPushingToShipStation(true);

        // Simulate API call to ShipStation
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Update orders with ShipStation sync status
        setOrders(prev => prev.map(order => {
            if (selectedOrders.has(order.id)) {
                return {
                    ...order,
                    shipstation_synced: true,
                    shipstation_order_id: `SS-${Date.now()}-${order.id}`,
                };
            }
            return order;
        }));

        setIsPushingToShipStation(false);
        setSelectedOrders(new Set());

        toast({
            title: 'Orders pushed to ShipStation',
            description: `${selectedOrders.size} order(s) have been synced with ShipStation.`,
        });
    };

    // Export labels as PDF (one label per page)
    const handleExportLabels = async () => {
        const ordersWithLabels = filteredOrders.filter(o => selectedOrders.has(o.id) && o.label_url);

        if (ordersWithLabels.length === 0) {
            toast({
                title: 'No labels available',
                description: 'Selected orders must have labels generated first. Push to ShipStation to generate labels.',
                variant: 'destructive'
            });
            return;
        }

        setIsExportingLabels(true);

        // Simulate PDF generation
        await new Promise(resolve => setTimeout(resolve, 1500));

        setIsExportingLabels(false);

        // In production, this would trigger a PDF download
        toast({
            title: 'Labels exported',
            description: `${ordersWithLabels.length} label(s) exported as PDF. Each label is on a separate page.`,
        });

        // Simulate download
        const blob = new Blob(['PDF Content - Labels'], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `shipping-labels-${new Date().toISOString().split('T')[0]}.pdf`;
        a.click();
        URL.revokeObjectURL(url);
    };

    // Mark labels as printed
    const handleMarkAsPrinted = () => {
        setOrders(prev => prev.map(order => {
            if (selectedOrders.has(order.id) && order.label_url) {
                return {
                    ...order,
                    label_printed: true,
                    label_printed_at: new Date().toISOString(),
                };
            }
            return order;
        }));

        const printedCount = filteredOrders.filter(o => selectedOrders.has(o.id) && o.label_url).length;
        setSelectedOrders(new Set());

        toast({
            title: 'Labels marked as printed',
            description: `${printedCount} label(s) marked as printed.`,
        });
    };

    const statuses = [
        { value: 'all', label: 'All Orders' },
        { value: 'TESTING', label: '🧪 Testing' },
        { value: 'AWAITING_FUNDS', label: 'Awaiting Funds' },
        { value: 'PROCESSING', label: 'Processing' },
        { value: 'SHIPPED', label: 'Shipped' },
        { value: 'COMPLETE', label: 'Complete' },
    ];

    // Stats calculations
    const unprintedLabelsCount = orders.filter(o => o.label_url && !o.label_printed).length;
    const unsyncedOrdersCount = orders.filter(o => !o.shipstation_synced && o.status !== 'AWAITING_FUNDS').length;
    const testingOrdersCount = orders.filter(o => o.order_type === 'TESTING').length;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Orders</h1>
                    <p className="text-gray-500">Manage and track all merchant orders</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={handleExportCSV}>
                        <FileText className="w-4 h-4 mr-2" />
                        Export CSV
                    </Button>
                </div>
            </div>

            {/* Action Bar - Visible when orders are selected */}
            {selectedOrders.size > 0 && (
                <Card className="bg-violet-50 dark:bg-violet-900/20 border-violet-200 dark:border-violet-800">
                    <CardContent className="p-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <CheckSquare className="w-5 h-5 text-violet-600" />
                            <span className="font-medium text-violet-900 dark:text-violet-100">
                                {selectedOrders.size} order(s) selected
                            </span>
                        </div>
                        <div className="flex gap-2">
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={handlePushToShipStation}
                                disabled={isPushingToShipStation}
                                className="bg-white"
                            >
                                {isPushingToShipStation ? (
                                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                                ) : (
                                    <Ship className="w-4 h-4 mr-2" />
                                )}
                                Push to ShipStation
                            </Button>
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={handleExportLabels}
                                disabled={isExportingLabels}
                                className="bg-white"
                            >
                                {isExportingLabels ? (
                                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                                ) : (
                                    <FileText className="w-4 h-4 mr-2" />
                                )}
                                Export Labels PDF
                            </Button>
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={handleMarkAsPrinted}
                                className="bg-white"
                            >
                                <Printer className="w-4 h-4 mr-2" />
                                Mark as Printed
                            </Button>
                            <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setSelectedOrders(new Set())}
                            >
                                <X className="w-4 h-4" />
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Stats */}
            <div className="grid gap-4 md:grid-cols-6">
                <Card className={testingOrdersCount > 0 ? 'border-purple-300 bg-purple-50/50 dark:border-purple-800 dark:bg-purple-900/10' : ''}>
                    <CardContent className="p-4 flex items-center gap-3">
                        <div className={cn(
                            "w-12 h-12 rounded-lg flex items-center justify-center",
                            testingOrdersCount > 0
                                ? "bg-purple-100 dark:bg-purple-900/30"
                                : "bg-gray-100 dark:bg-gray-800"
                        )}>
                            <FlaskConical className={cn("w-6 h-6", testingOrdersCount > 0 ? "text-purple-600" : "text-gray-600")} />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-gray-900 dark:text-white">{testingOrdersCount}</p>
                            <p className="text-sm text-gray-500">Testing</p>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-4 flex items-center gap-3">
                        <div className="w-12 h-12 rounded-lg bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center">
                            <Clock className="w-6 h-6 text-yellow-600" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-gray-900 dark:text-white">
                                {orders.filter(o => o.status === 'AWAITING_FUNDS').length}
                            </p>
                            <p className="text-sm text-gray-500">Awaiting Funds</p>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-4 flex items-center gap-3">
                        <div className="w-12 h-12 rounded-lg bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center">
                            <Package className="w-6 h-6 text-violet-600" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-gray-900 dark:text-white">
                                {orders.filter(o => o.status === 'PROCESSING').length}
                            </p>
                            <p className="text-sm text-gray-500">Processing</p>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-4 flex items-center gap-3">
                        <div className="w-12 h-12 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                            <Truck className="w-6 h-6 text-blue-600" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-gray-900 dark:text-white">
                                {orders.filter(o => o.status === 'SHIPPED').length}
                            </p>
                            <p className="text-sm text-gray-500">Shipped</p>
                        </div>
                    </CardContent>
                </Card>

                <Card className={unsyncedOrdersCount > 0 ? 'border-orange-300 bg-orange-50/50 dark:border-orange-800 dark:bg-orange-900/10' : ''}>
                    <CardContent className="p-4 flex items-center gap-3">
                        <div className={cn(
                            "w-12 h-12 rounded-lg flex items-center justify-center",
                            unsyncedOrdersCount > 0
                                ? "bg-orange-100 dark:bg-orange-900/30"
                                : "bg-gray-100 dark:bg-gray-800"
                        )}>
                            <Ship className={cn("w-6 h-6", unsyncedOrdersCount > 0 ? "text-orange-600" : "text-gray-600")} />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-gray-900 dark:text-white">{unsyncedOrdersCount}</p>
                            <p className="text-sm text-gray-500">Not Synced</p>
                        </div>
                    </CardContent>
                </Card>

                <Card className={unprintedLabelsCount > 0 ? 'border-amber-300 bg-amber-50/50 dark:border-amber-800 dark:bg-amber-900/10' : ''}>
                    <CardContent className="p-4 flex items-center gap-3">
                        <div className={cn(
                            "w-12 h-12 rounded-lg flex items-center justify-center",
                            unprintedLabelsCount > 0
                                ? "bg-amber-100 dark:bg-amber-900/30"
                                : "bg-gray-100 dark:bg-gray-800"
                        )}>
                            <Printer className={cn("w-6 h-6", unprintedLabelsCount > 0 ? "text-amber-600" : "text-gray-600")} />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-gray-900 dark:text-white">{unprintedLabelsCount}</p>
                            <p className="text-sm text-gray-500">Unprinted Labels</p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Filters */}
            <Card>
                <CardContent className="p-4">
                    <div className="flex flex-col sm:flex-row gap-4">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <Input
                                placeholder="Search orders..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-9"
                            />
                        </div>
                        <div className="flex gap-2 flex-wrap">
                            {statuses.map((status) => (
                                <Button
                                    key={status.value}
                                    variant={statusFilter === status.value ? 'default' : 'outline'}
                                    size="sm"
                                    onClick={() => setStatusFilter(status.value)}
                                >
                                    {status.label}
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
                        <thead className="bg-gray-50 dark:bg-gray-800/50 border-b">
                            <tr>
                                <th className="text-left p-4">
                                    <button
                                        onClick={selectAllOrders}
                                        className="text-gray-500 hover:text-gray-700"
                                    >
                                        {selectedOrders.size === filteredOrders.length && filteredOrders.length > 0 ? (
                                            <CheckSquare className="w-5 h-5 text-violet-600" />
                                        ) : (
                                            <Square className="w-5 h-5" />
                                        )}
                                    </button>
                                </th>
                                <th className="text-left p-4 text-sm font-medium text-gray-500">Order ID</th>
                                <th className="text-left p-4 text-sm font-medium text-gray-500">Merchant</th>
                                <th className="text-left p-4 text-sm font-medium text-gray-500">Status</th>
                                <th className="text-center p-4 text-sm font-medium text-gray-500">ShipStation</th>
                                <th className="text-center p-4 text-sm font-medium text-gray-500">Label</th>
                                <th className="text-left p-4 text-sm font-medium text-gray-500">Shipping</th>
                                <th className="text-right p-4 text-sm font-medium text-gray-500">Total</th>
                                <th className="text-left p-4 text-sm font-medium text-gray-500">Ship To</th>
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
                                        selectedOrders.has(order.id) && "bg-violet-50 dark:bg-violet-900/10"
                                    )}
                                >
                                    <td className="p-4">
                                        <button
                                            onClick={() => toggleOrderSelection(order.id)}
                                            className="text-gray-500 hover:text-gray-700"
                                        >
                                            {selectedOrders.has(order.id) ? (
                                                <CheckSquare className="w-5 h-5 text-violet-600" />
                                            ) : (
                                                <Square className="w-5 h-5" />
                                            )}
                                        </button>
                                    </td>
                                    <td className="p-4">
                                        <div className="flex items-center gap-2">
                                            <span className="font-mono text-sm font-medium text-gray-900 dark:text-white">
                                                {order.id}
                                            </span>
                                            {order.order_type === 'TESTING' && (
                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-purple-100 text-purple-700 text-xs rounded-full font-medium">
                                                    <FlaskConical className="w-3 h-3" />
                                                    Testing
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="p-4 text-gray-700 dark:text-gray-300">{order.merchant}</td>
                                    <td className="p-4">
                                        <span className={cn(
                                            'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium',
                                            getStatusColor(order.status)
                                        )}>
                                            {getStatusIcon(order.status)}
                                            {order.status.replace('_', ' ')}
                                        </span>
                                    </td>
                                    <td className="p-4 text-center">
                                        {order.shipstation_synced ? (
                                            <div className="flex items-center justify-center gap-1">
                                                <CheckCircle className="w-4 h-4 text-green-500" />
                                                <span className="text-xs text-gray-500">{order.shipstation_order_id}</span>
                                            </div>
                                        ) : order.status === 'AWAITING_FUNDS' ? (
                                            <span className="text-xs text-gray-400">Pending</span>
                                        ) : (
                                            <span className="inline-flex items-center gap-1 text-xs text-orange-600">
                                                <AlertCircle className="w-3 h-3" />
                                                Not synced
                                            </span>
                                        )}
                                    </td>
                                    <td className="p-4 text-center">
                                        {order.label_url ? (
                                            <div className="flex items-center justify-center gap-2">
                                                {order.label_printed ? (
                                                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-green-100 text-green-700">
                                                        <Printer className="w-3 h-3" />
                                                        Printed
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-amber-100 text-amber-700">
                                                        <Tag className="w-3 h-3" />
                                                        Ready
                                                    </span>
                                                )}
                                            </div>
                                        ) : (
                                            <span className="text-xs text-gray-400">-</span>
                                        )}
                                    </td>
                                    <td className="p-4">
                                        {order.shipping_method === 'EXPEDITED' ? (
                                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-orange-100 text-orange-700 font-medium">
                                                <Truck className="w-3 h-3" />
                                                Expedited
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-700 font-medium">
                                                <Truck className="w-3 h-3" />
                                                Standard
                                            </span>
                                        )}
                                    </td>
                                    <td className="p-4 text-right font-medium text-gray-900 dark:text-white">
                                        {formatCurrency(order.total_cents)}
                                    </td>
                                    <td className="p-4 text-gray-500">{order.shipping_address}</td>
                                    <td className="p-4 text-gray-500 text-sm">
                                        {formatRelativeTime(order.created_at)}
                                    </td>
                                    <td className="p-4 text-right">
                                        <div className="flex items-center justify-end gap-1">
                                            {order.label_url && (
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    title="Download label"
                                                    onClick={() => {
                                                        toast({
                                                            title: 'Label downloaded',
                                                            description: `Label for ${order.id} has been downloaded.`
                                                        });
                                                    }}
                                                >
                                                    <FileText className="w-4 h-4" />
                                                </Button>
                                            )}
                                            {order.shipstation_order_id && (
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    title="View in ShipStation"
                                                    onClick={() => window.open(`https://ship.shipstation.com/orders/${order.shipstation_order_id}`, '_blank')}
                                                >
                                                    <ExternalLink className="w-4 h-4" />
                                                </Button>
                                            )}
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                onClick={() => setShowOrderDetails(order)}
                                            >
                                                <Eye className="w-4 h-4" />
                                            </Button>
                                        </div>
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
                        <p className="text-gray-500">Try adjusting your search or filter criteria</p>
                    </CardContent>
                </Card>
            )}

            {/* Order Details Modal */}
            {showOrderDetails && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <Card className="w-full max-w-lg">
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <CardTitle>Order {showOrderDetails.id}</CardTitle>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => setShowOrderDetails(null)}
                                >
                                    <X className="w-4 h-4" />
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-sm text-gray-500">Merchant</p>
                                    <p className="font-medium">{showOrderDetails.merchant}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-500">Status</p>
                                    <span className={cn(
                                        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium',
                                        getStatusColor(showOrderDetails.status)
                                    )}>
                                        {showOrderDetails.status.replace('_', ' ')}
                                    </span>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-500">Total</p>
                                    <p className="font-medium">{formatCurrency(showOrderDetails.total_cents)}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-500">Items</p>
                                    <p className="font-medium">{showOrderDetails.items_count}</p>
                                </div>
                                <div className="col-span-2">
                                    <p className="text-sm text-gray-500">Shipping Address</p>
                                    <p className="font-medium">{showOrderDetails.shipping_address}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-500">ShipStation Status</p>
                                    {showOrderDetails.shipstation_synced ? (
                                        <p className="font-medium text-green-600 flex items-center gap-1">
                                            <CheckCircle className="w-4 h-4" />
                                            Synced ({showOrderDetails.shipstation_order_id})
                                        </p>
                                    ) : (
                                        <p className="font-medium text-orange-600">Not synced</p>
                                    )}
                                </div>
                                <div>
                                    <p className="text-sm text-gray-500">Label Status</p>
                                    {showOrderDetails.label_printed ? (
                                        <p className="font-medium text-green-600 flex items-center gap-1">
                                            <Printer className="w-4 h-4" />
                                            Printed
                                        </p>
                                    ) : showOrderDetails.label_url ? (
                                        <p className="font-medium text-amber-600">Ready to print</p>
                                    ) : (
                                        <p className="font-medium text-gray-500">No label</p>
                                    )}
                                </div>
                                {showOrderDetails.tracking_number && (
                                    <div className="col-span-2">
                                        <p className="text-sm text-gray-500">Tracking Number</p>
                                        <p className="font-mono text-sm">{showOrderDetails.tracking_number}</p>
                                    </div>
                                )}
                            </div>
                            <div className="flex gap-2 pt-4 border-t">
                                {!showOrderDetails.shipstation_synced && showOrderDetails.status !== 'AWAITING_FUNDS' && (
                                    <Button
                                        size="sm"
                                        onClick={() => {
                                            setOrders(prev => prev.map(o =>
                                                o.id === showOrderDetails.id
                                                    ? { ...o, shipstation_synced: true, shipstation_order_id: `SS-${Date.now()}`, label_url: `/labels/${o.id}.pdf` }
                                                    : o
                                            ));
                                            setShowOrderDetails(null);
                                            toast({ title: 'Order synced', description: 'Order pushed to ShipStation and label generated.' });
                                        }}
                                    >
                                        <Ship className="w-4 h-4 mr-2" />
                                        Push to ShipStation
                                    </Button>
                                )}
                                {showOrderDetails.label_url && !showOrderDetails.label_printed && (
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => {
                                            setOrders(prev => prev.map(o =>
                                                o.id === showOrderDetails.id
                                                    ? { ...o, label_printed: true, label_printed_at: new Date().toISOString() }
                                                    : o
                                            ));
                                            setShowOrderDetails(null);
                                            toast({ title: 'Label marked as printed' });
                                        }}
                                    >
                                        <Printer className="w-4 h-4 mr-2" />
                                        Mark as Printed
                                    </Button>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    );
}
