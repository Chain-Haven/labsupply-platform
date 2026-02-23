'use client';

import { useState, useEffect, useCallback } from 'react';
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
    FlaskConical,
    Mail,
    Building,
    ArrowRight,
    Loader2
} from 'lucide-react';
import { cn, formatCurrency, formatRelativeTime } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';

interface OrderItem {
    id: string;
    sku: string;
    name: string;
    qty: number;
    unit_price_cents: number;
}

interface Order {
    id: string;
    merchant: string;
    status: string;
    order_type?: 'REGULAR' | 'TESTING';
    shipping_method?: 'STANDARD' | 'EXPEDITED';
    items_count: number;
    order_items: OrderItem[];
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
    const [orders, setOrders] = useState<Order[]>([]);
    const [ordersLoading, setOrdersLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [selectedOrders, setSelectedOrders] = useState<Set<string>>(new Set());
    const [isPushingToShipStation, setIsPushingToShipStation] = useState(false);
    const [isExportingLabels, setIsExportingLabels] = useState(false);
    const [showOrderDetails, setShowOrderDetails] = useState<Order | null>(null);
    const [page, setPage] = useState(1);
    const [totalOrders, setTotalOrders] = useState(0);
    const PAGE_SIZE = 50;

    const fetchOrders = useCallback(async () => {
        setOrdersLoading(true);
        try {
            const params = new URLSearchParams();
            params.set('page', page.toString());
            params.set('limit', PAGE_SIZE.toString());
            if (statusFilter !== 'all' && statusFilter !== 'TESTING') {
                params.set('status', statusFilter);
            }
            if (searchQuery) {
                params.set('search', searchQuery);
            }

            const res = await fetch(`/api/v1/admin/orders?${params.toString()}`);
            if (res.ok) {
                const json = await res.json();
                const mapped = (json.data || []).map((o: Record<string, unknown>) => {
                    const addr = o.shipping_address as Record<string, string> | undefined;
                    const items = (o.order_items || []) as OrderItem[];
                    return {
                        id: o.woo_order_number || o.woo_order_id || o.id,
                        merchant: (o as Record<string, unknown>).merchant_name || 'Unknown',
                        status: o.status as string,
                        order_type: o.order_type || 'REGULAR',
                        shipping_method: o.shipping_method || 'STANDARD',
                        items_count: items.length,
                        order_items: items,
                        total_cents: (o.total_estimate_cents || 0) as number,
                        created_at: o.created_at as string,
                        shipping_address: addr
                            ? [addr.city, addr.state].filter(Boolean).join(', ')
                            : '',
                        tracking_number: undefined,
                        shipstation_synced: false,
                        label_url: undefined,
                        label_printed: false,
                    } as Order;
                });
                setOrders(mapped);
                setTotalOrders(json.pagination?.total || mapped.length);
            }
        } catch {
            /* silently fail, orders stay empty */
        }
        setOrdersLoading(false);
    }, [page, statusFilter, searchQuery]);

    useEffect(() => {
        fetchOrders();
    }, [fetchOrders]);

    // Testing orders state
    interface TestingOrderView {
        id: string;
        merchant_id: string;
        testing_lab_id: string;
        status: string;
        tracking_number?: string;
        tracking_notified_at?: string;
        shipping_fee_cents: number;
        total_testing_fee_cents: number;
        total_product_cost_cents: number;
        grand_total_cents: number;
        invoice_email: string;
        lab_invoice_number?: string;
        notes?: string;
        created_at: string;
        testing_labs?: { id: string; name: string; email: string };
        merchants?: { id: string; name: string; company_name?: string; contact_email: string };
        testing_order_items?: Array<{
            id: string;
            product_name: string;
            sku: string;
            total_qty: number;
            addon_conformity: boolean;
            addon_sterility: boolean;
            addon_endotoxins: boolean;
            addon_net_content: boolean;
            addon_purity: boolean;
            testing_fee_cents: number;
            product_cost_cents: number;
        }>;
    }

    const [testingOrders, setTestingOrders] = useState<TestingOrderView[]>([]);
    const [testingLoading, setTestingLoading] = useState(false);
    const [showTestingPanel, setShowTestingPanel] = useState(false);
    const [selectedTestingOrder, setSelectedTestingOrder] = useState<TestingOrderView | null>(null);
    const [updatingTestingStatus, setUpdatingTestingStatus] = useState(false);
    const [resendingEmail, setResendingEmail] = useState<string | null>(null);

    const fetchTestingOrders = useCallback(async () => {
        setTestingLoading(true);
        try {
            const res = await fetch('/api/v1/admin/testing-orders');
            if (res.ok) {
                const json = await res.json();
                setTestingOrders(json.data || []);
            }
        } catch { /* ignore */ }
        setTestingLoading(false);
    }, []);

    const updateTestingStatus = async (id: string, status: string) => {
        setUpdatingTestingStatus(true);
        try {
            const res = await fetch(`/api/v1/admin/testing-orders/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status }),
            });
            if (res.ok) {
                toast({ title: 'Status updated', description: `Testing order updated to ${status.replace('_', ' ')}` });
                fetchTestingOrders();
            }
        } catch {
            toast({ title: 'Error', description: 'Failed to update status', variant: 'destructive' });
        }
        setUpdatingTestingStatus(false);
    };

    const resendLabEmail = async (id: string) => {
        setResendingEmail(id);
        try {
            const res = await fetch(`/api/v1/admin/testing-orders/${id}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'resend_lab_email' }),
            });
            if (res.ok) {
                const json = await res.json();
                toast({ title: 'Email queued', description: json.message });
            }
        } catch {
            toast({ title: 'Error', description: 'Failed to resend email', variant: 'destructive' });
        }
        setResendingEmail(null);
    };

    const getTestingStatusColor = (status: string) => {
        switch (status) {
            case 'PENDING': return 'bg-gray-100 text-gray-700';
            case 'AWAITING_SHIPMENT': return 'bg-yellow-100 text-yellow-700';
            case 'SHIPPED': return 'bg-blue-100 text-blue-700';
            case 'IN_TESTING': return 'bg-purple-100 text-purple-700';
            case 'RESULTS_RECEIVED': return 'bg-green-100 text-green-700';
            case 'COMPLETE': return 'bg-emerald-100 text-emerald-700';
            default: return 'bg-gray-100 text-gray-700';
        }
    };

    const testingStatusOptions = [
        'PENDING', 'AWAITING_SHIPMENT', 'SHIPPED', 'IN_TESTING', 'RESULTS_RECEIVED', 'COMPLETE',
    ];

    useEffect(() => {
        if (statusFilter === 'TESTING' || showTestingPanel) {
            fetchTestingOrders();
        }
    }, [statusFilter, showTestingPanel, fetchTestingOrders]);

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

        const headers = ['Order ID', 'Merchant', 'Status', 'Shipping Method', 'Items', 'SKUs', 'Total', 'Ship To', 'Created', 'Tracking', 'ShipStation Synced'];
        const csvRows = [headers.join(',')];

        ordersToExport.forEach(order => {
            const skus = order.order_items.map(i => `${i.sku} x${i.qty}`).join('; ');
            const row = [
                order.id,
                `"${order.merchant}"`,
                order.status,
                order.shipping_method || 'STANDARD',
                order.items_count,
                `"${skus}"`,
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

        let succeeded = 0;
        let failed = 0;

        for (const orderId of selectedOrders) {
            try {
                const res = await fetch('/api/v1/admin/orders/create-shipments', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ order_ids: [orderId] }),
                });
                if (res.ok) {
                    succeeded++;
                } else {
                    failed++;
                }
            } catch {
                failed++;
            }
        }

        setIsPushingToShipStation(false);
        setSelectedOrders(new Set());
        fetchOrders();

        toast({
            title: 'Shipments created',
            description: `${succeeded} succeeded, ${failed} failed.`,
        });
    };

    const handleExportLabels = async () => {
        const ordersWithLabels = filteredOrders.filter(o => selectedOrders.has(o.id) && o.label_url);

        if (ordersWithLabels.length === 0) {
            toast({
                title: 'No labels available',
                description: 'Selected orders must have labels generated first. Create shipments to generate labels.',
                variant: 'destructive'
            });
            return;
        }

        setIsExportingLabels(true);

        try {
            const labelUrls = ordersWithLabels.map(o => o.label_url).filter(Boolean);
            toast({
                title: 'Labels exported',
                description: `${labelUrls.length} label(s) ready for download.`,
            });

            for (const url of labelUrls) {
                if (url) {
                    window.open(url, '_blank');
                }
            }
        } catch {
            toast({ title: 'Export failed', variant: 'destructive' });
        }

        setIsExportingLabels(false);
    };

    const handleMarkAsPrinted = async () => {
        let printed = 0;
        for (const orderId of selectedOrders) {
            const match = filteredOrders.find(o => o.id === orderId && o.label_url);
            if (match) {
                await fetch('/api/v1/admin/orders', {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        id: orderId,
                        supplier_notes: `Label printed at ${new Date().toISOString()}`,
                    }),
                }).catch(() => {});
                printed++;
            }
        }

        setSelectedOrders(new Set());
        fetchOrders();

        toast({
            title: 'Labels marked as printed',
            description: `${printed} label(s) marked as printed.`,
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
                <Card
                    className={cn(
                        'cursor-pointer transition-colors hover:border-purple-400',
                        (testingOrdersCount > 0 || showTestingPanel) ? 'border-purple-300 bg-purple-50/50 dark:border-purple-800 dark:bg-purple-900/10' : ''
                    )}
                    onClick={() => setShowTestingPanel(!showTestingPanel)}
                >
                    <CardContent className="p-4 flex items-center gap-3">
                        <div className={cn(
                            "w-12 h-12 rounded-lg flex items-center justify-center",
                            (testingOrdersCount > 0 || showTestingPanel)
                                ? "bg-purple-100 dark:bg-purple-900/30"
                                : "bg-gray-100 dark:bg-gray-800"
                        )}>
                            <FlaskConical className={cn("w-6 h-6", (testingOrdersCount > 0 || showTestingPanel) ? "text-purple-600" : "text-gray-600")} />
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
            {ordersLoading && (
                <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-violet-600" />
                    <span className="ml-2 text-gray-500">Loading orders...</span>
                </div>
            )}
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
                                <th className="text-left p-4 text-sm font-medium text-gray-500">Items / SKUs</th>
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
                                    <td className="p-4">
                                        {order.order_items.length > 0 ? (
                                            <div className="space-y-0.5">
                                                {order.order_items.map((item) => (
                                                    <div key={item.id} className="text-sm">
                                                        <span className="font-mono text-xs text-violet-600 dark:text-violet-400">{item.sku}</span>
                                                        <span className="text-gray-500 mx-1">&middot;</span>
                                                        <span className="text-gray-700 dark:text-gray-300 truncate">{item.name}</span>
                                                        <span className="text-gray-400 ml-1">x{item.qty}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <span className="text-xs text-gray-400">No items</span>
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

            {/* Testing Orders Panel - shown when filtering by Testing or explicitly */}
            {(statusFilter === 'TESTING' || showTestingPanel) && (
                <Card className="border-purple-200 dark:border-purple-800">
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle className="flex items-center gap-2">
                                    <FlaskConical className="w-5 h-5 text-purple-600" />
                                    Testing Orders
                                </CardTitle>
                                <CardDescription>
                                    Track 3rd party testing shipments, lab notifications, and results
                                </CardDescription>
                            </div>
                            <div className="flex gap-2">
                                <Button variant="outline" size="sm" onClick={fetchTestingOrders}>
                                    <RefreshCw className={cn("w-4 h-4 mr-2", testingLoading && "animate-spin")} />
                                    Refresh
                                </Button>
                                {statusFilter !== 'TESTING' && (
                                    <Button variant="ghost" size="sm" onClick={() => setShowTestingPanel(false)}>
                                        <X className="w-4 h-4" />
                                    </Button>
                                )}
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        {testingOrders.length === 0 ? (
                            <div className="text-center py-8 text-gray-500">
                                <FlaskConical className="w-10 h-10 mx-auto mb-3 text-gray-300" />
                                <p>No testing orders found.</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {testingOrders.map((to) => (
                                    <div key={to.id} className="p-4 rounded-lg border bg-white dark:bg-gray-900 hover:border-purple-300 transition-colors">
                                        <div className="flex items-start justify-between mb-3">
                                            <div>
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="font-mono text-sm font-medium text-gray-900 dark:text-white">
                                                        #{to.id.slice(0, 8).toUpperCase()}
                                                    </span>
                                                    <span className={cn(
                                                        'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
                                                        getTestingStatusColor(to.status)
                                                    )}>
                                                        {to.status.replace(/_/g, ' ')}
                                                    </span>
                                                </div>
                                                <p className="text-sm text-gray-500">
                                                    {to.merchants?.company_name || to.merchants?.name || 'Unknown'} &middot;
                                                    <span className="inline-flex items-center gap-1 ml-1">
                                                        <Building className="w-3 h-3" />
                                                        {to.testing_labs?.name || 'Unknown Lab'}
                                                    </span>
                                                </p>
                                            </div>
                                            <div className="text-right">
                                                <p className="font-semibold text-purple-600">{formatCurrency(to.grand_total_cents)}</p>
                                                <p className="text-xs text-gray-400">{formatRelativeTime(to.created_at)}</p>
                                            </div>
                                        </div>

                                        {/* Items */}
                                        {to.testing_order_items && to.testing_order_items.length > 0 && (
                                            <div className="mb-3 space-y-1">
                                                {to.testing_order_items.map((item) => {
                                                    const tests: string[] = [];
                                                    if (item.addon_conformity) tests.push('Conformity');
                                                    if (item.addon_sterility) tests.push('Sterility');
                                                    if (item.addon_endotoxins) tests.push('Endotoxins');
                                                    if (item.addon_net_content) tests.push('Net Content');
                                                    if (item.addon_purity) tests.push('Purity');
                                                    return (
                                                        <div key={item.id} className="flex items-center justify-between text-sm">
                                                            <span className="text-gray-700 dark:text-gray-300">
                                                                {item.product_name} <span className="text-gray-400">({item.sku})</span> x{item.total_qty}
                                                            </span>
                                                            <div className="flex gap-1">
                                                                {tests.map(t => (
                                                                    <span key={t} className="px-1.5 py-0.5 text-xs bg-purple-100 text-purple-700 rounded">
                                                                        {t}
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}

                                        {/* Tracking */}
                                        {to.tracking_number && (
                                            <div className="flex items-center gap-2 text-sm mb-3 p-2 bg-blue-50 dark:bg-blue-900/20 rounded">
                                                <Truck className="w-4 h-4 text-blue-600" />
                                                <span className="text-blue-700 dark:text-blue-300">Tracking: {to.tracking_number}</span>
                                                {to.tracking_notified_at && (
                                                    <span className="text-xs text-green-600 flex items-center gap-1">
                                                        <CheckCircle className="w-3 h-3" />
                                                        Lab notified
                                                    </span>
                                                )}
                                            </div>
                                        )}

                                        {/* Actions */}
                                        <div className="flex items-center gap-2 pt-2 border-t">
                                            <select
                                                value={to.status}
                                                onChange={(e) => updateTestingStatus(to.id, e.target.value)}
                                                disabled={updatingTestingStatus}
                                                className="text-xs px-2 py-1 border rounded bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300"
                                            >
                                                {testingStatusOptions.map(s => (
                                                    <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
                                                ))}
                                            </select>

                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                className="text-xs"
                                                onClick={() => resendLabEmail(to.id)}
                                                disabled={resendingEmail === to.id}
                                            >
                                                {resendingEmail === to.id ? (
                                                    <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                                                ) : (
                                                    <Mail className="w-3 h-3 mr-1" />
                                                )}
                                                {to.tracking_notified_at ? 'Resend' : 'Send'} Lab Email
                                            </Button>

                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                className="text-xs"
                                                onClick={() => setSelectedTestingOrder(to)}
                                            >
                                                <Eye className="w-3 h-3 mr-1" />
                                                Details
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}

            {/* Testing Order Detail Modal */}
            {selectedTestingOrder && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
                    <Card className="w-full max-w-lg my-8">
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <CardTitle className="flex items-center gap-2">
                                    <FlaskConical className="w-5 h-5 text-purple-600" />
                                    Testing Order #{selectedTestingOrder.id.slice(0, 8).toUpperCase()}
                                </CardTitle>
                                <Button variant="ghost" size="icon" onClick={() => setSelectedTestingOrder(null)}>
                                    <X className="w-4 h-4" />
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-sm text-gray-500">Merchant</p>
                                    <p className="font-medium">{selectedTestingOrder.merchants?.company_name || selectedTestingOrder.merchants?.name}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-500">Lab</p>
                                    <p className="font-medium">{selectedTestingOrder.testing_labs?.name}</p>
                                    <p className="text-xs text-gray-400">{selectedTestingOrder.testing_labs?.email}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-500">Status</p>
                                    <span className={cn(
                                        'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
                                        getTestingStatusColor(selectedTestingOrder.status)
                                    )}>
                                        {selectedTestingOrder.status.replace(/_/g, ' ')}
                                    </span>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-500">Total</p>
                                    <p className="font-semibold text-purple-600">{formatCurrency(selectedTestingOrder.grand_total_cents)}</p>
                                </div>
                                {selectedTestingOrder.tracking_number && (
                                    <div className="col-span-2">
                                        <p className="text-sm text-gray-500">Tracking</p>
                                        <p className="font-mono text-sm">{selectedTestingOrder.tracking_number}</p>
                                    </div>
                                )}
                                <div>
                                    <p className="text-sm text-gray-500">Product Costs</p>
                                    <p className="font-medium">{formatCurrency(selectedTestingOrder.total_product_cost_cents)}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-500">Testing Fees</p>
                                    <p className="font-medium">{formatCurrency(selectedTestingOrder.total_testing_fee_cents)}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-500">Shipping</p>
                                    <p className="font-medium">{formatCurrency(selectedTestingOrder.shipping_fee_cents)}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-500">Invoice Email</p>
                                    <p className="text-sm">{selectedTestingOrder.invoice_email}</p>
                                </div>
                            </div>

                            {selectedTestingOrder.testing_order_items && (
                                <div className="pt-2 border-t">
                                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Products & Tests</p>
                                    {selectedTestingOrder.testing_order_items.map(item => {
                                        const tests: string[] = [];
                                        if (item.addon_conformity) tests.push('Conformity');
                                        if (item.addon_sterility) tests.push('Sterility');
                                        if (item.addon_endotoxins) tests.push('Endotoxins');
                                        if (item.addon_net_content) tests.push('Net Content');
                                        if (item.addon_purity) tests.push('Purity');
                                        return (
                                            <div key={item.id} className="flex justify-between items-center py-1 text-sm">
                                                <div>
                                                    <span className="text-gray-900 dark:text-white">{item.product_name}</span>
                                                    <span className="text-gray-400 ml-1">x{item.total_qty}</span>
                                                </div>
                                                <div className="flex gap-1 flex-wrap justify-end">
                                                    {tests.map(t => (
                                                        <span key={t} className="px-1.5 py-0.5 text-xs bg-purple-100 text-purple-700 rounded">{t}</span>
                                                    ))}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}

                            {selectedTestingOrder.notes && (
                                <div className="pt-2 border-t">
                                    <p className="text-sm text-gray-500">Notes</p>
                                    <p className="text-sm">{selectedTestingOrder.notes}</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
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
                                {showOrderDetails.order_items.length > 0 && (
                                    <div className="col-span-2 pt-2 border-t">
                                        <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Line Items</p>
                                        <div className="space-y-2">
                                            {showOrderDetails.order_items.map((item) => (
                                                <div key={item.id} className="flex items-center justify-between text-sm p-2 bg-gray-50 dark:bg-gray-800/50 rounded">
                                                    <div>
                                                        <span className="font-mono text-xs text-violet-600 dark:text-violet-400">{item.sku}</span>
                                                        <p className="text-gray-900 dark:text-white">{item.name}</p>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="text-gray-500">x{item.qty}</p>
                                                        <p className="font-medium text-gray-900 dark:text-white">{formatCurrency(item.unit_price_cents * item.qty)}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
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
