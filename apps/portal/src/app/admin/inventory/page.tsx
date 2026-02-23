'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Search,
    Plus,
    Box,
    AlertTriangle,
    Edit,
    X,
    TrendingDown,
    Package,
    Save,
    Loader2,
    Upload,
    Download,
    FileText,
    CheckCircle,
    XCircle,
} from 'lucide-react';
import { cn, formatCurrency } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';

// Product type - matches API response
interface Product {
    id: string;
    sku: string;
    name: string;
    category: string;
    wholesale_price_cents: number;
    available_qty: number;
    on_hand: number;
    reserved: number;
    incoming: number;
    low_stock_threshold: number;
    is_active: boolean;
}

interface Pagination {
    page: number;
    limit: number;
    total: number;
    has_more: boolean;
}

export default function InventoryPage() {
    const [products, setProducts] = useState<Product[]>([]);
    const [pagination, setPagination] = useState<Pagination | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchDebounced, setSearchDebounced] = useState('');
    const [showLowStock, setShowLowStock] = useState(false);

    // Inline stock editing state
    const [editingStock, setEditingStock] = useState<string | null>(null);
    const [stockValue, setStockValue] = useState('');
    const [isStockSaving, setIsStockSaving] = useState(false);

    // Add product modal state
    const [showAddModal, setShowAddModal] = useState(false);
    const [isAddingSaving, setIsAddingSaving] = useState(false);
    const [newProduct, setNewProduct] = useState({
        sku: '',
        name: '',
        category: 'Peptides',
        wholesale_price: '',
        available_qty: '',
        low_stock_threshold: '10',
    });

    // Edit product modal state
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);
    const [isEditingSaving, setIsEditingSaving] = useState(false);
    const [editForm, setEditForm] = useState({
        name: '',
        category: '',
        wholesale_price: '',
        available_qty: '',
        low_stock_threshold: '',
        is_active: true,
    });

    // Bulk upload state
    const [showBulkUpload, setShowBulkUpload] = useState(false);
    const [bulkFile, setBulkFile] = useState<File | null>(null);
    const [bulkUploading, setBulkUploading] = useState(false);
    const [bulkResults, setBulkResults] = useState<{
        summary: { total: number; created: number; failed: number };
        results: Array<{ row: number; sku: string; success: boolean; error?: string }>;
    } | null>(null);

    // Debounce search
    useEffect(() => {
        const t = setTimeout(() => setSearchDebounced(searchQuery), 300);
        return () => clearTimeout(t);
    }, [searchQuery]);

    // Fetch inventory from API
    const fetchInventory = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const params = new URLSearchParams();
            if (searchDebounced) params.set('search', searchDebounced);
            if (showLowStock) params.set('low_stock', 'true');
            params.set('page', '1');
            params.set('limit', '100');

            const res = await fetch(`/api/v1/admin/inventory?${params}`);
            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.error || `Failed to fetch inventory (${res.status})`);
            }
            const json = await res.json();
            setProducts(json.data || []);
            setPagination(json.pagination || null);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Failed to load inventory');
            setProducts([]);
            setPagination(null);
        } finally {
            setIsLoading(false);
        }
    }, [searchDebounced, showLowStock]);

    useEffect(() => {
        fetchInventory();
    }, [fetchInventory]);

    const filteredProducts = products.filter((product) => {
        const matchesSearch =
            product.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
            product.name.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesLowStock = !showLowStock || product.available_qty <= product.low_stock_threshold;
        return matchesSearch && matchesLowStock;
    });

    const lowStockCount = products.filter(p => p.available_qty <= p.low_stock_threshold).length;
    const totalValue = products.reduce((sum, p) => sum + (p.wholesale_price_cents * p.available_qty), 0);

    // Handle inline stock update via PATCH
    const handleStockUpdate = async (productId: string) => {
        const newQty = parseInt(stockValue, 10);
        if (isNaN(newQty) || newQty < 0) {
            toast({ title: 'Invalid quantity', description: 'Please enter a valid number', variant: 'destructive' });
            return;
        }

        setIsStockSaving(true);
        try {
            const res = await fetch('/api/v1/admin/inventory', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    product_id: productId,
                    on_hand: newQty,
                    reason: 'Inline stock adjustment',
                }),
            });
            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.error || 'Failed to update stock');
            }
            setProducts(prev => prev.map(p =>
                p.id === productId
                    ? { ...p, on_hand: newQty, available_qty: newQty - p.reserved }
                    : p
            ));
            toast({ title: 'Stock updated', description: `Stock updated to ${newQty} units` });
            setEditingStock(null);
            setStockValue('');
        } catch (e) {
            toast({
                title: 'Update failed',
                description: e instanceof Error ? e.message : 'Could not update stock',
                variant: 'destructive',
            });
        } finally {
            setIsStockSaving(false);
        }
    };

    // Handle add product - POST not supported by inventory API; show error
    const handleAddProduct = async () => {
        if (!newProduct.sku.trim() || !newProduct.name.trim() || !newProduct.wholesale_price) {
            toast({ title: 'Missing fields', description: 'Please fill in all required fields', variant: 'destructive' });
            return;
        }

        if (products.some(p => p.sku.toUpperCase() === newProduct.sku.toUpperCase())) {
            toast({ title: 'Duplicate SKU', description: 'A product with this SKU already exists', variant: 'destructive' });
            return;
        }

        setIsAddingSaving(true);
        try {
            const res = await fetch('/api/v1/admin/inventory', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    sku: newProduct.sku.toUpperCase(),
                    name: newProduct.name,
                    category: newProduct.category,
                    wholesale_price_cents: Math.round(parseFloat(newProduct.wholesale_price) * 100),
                    on_hand: parseInt(newProduct.available_qty, 10) || 0,
                    reorder_point: parseInt(newProduct.low_stock_threshold, 10) || 10,
                }),
            });
            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.error || 'Product creation not available');
            }
            setShowAddModal(false);
            setNewProduct({
                sku: '',
                name: '',
                category: 'Peptides',
                wholesale_price: '',
                available_qty: '',
                low_stock_threshold: '10',
            });
            toast({ title: 'Product added', description: `${newProduct.name} has been added to inventory` });
            fetchInventory();
        } catch (e) {
            toast({
                title: 'Could not add product',
                description: e instanceof Error ? e.message : 'Product creation is not supported by the inventory API',
                variant: 'destructive',
            });
        } finally {
            setIsAddingSaving(false);
        }
    };

    // Open edit modal
    const openEditModal = (product: Product) => {
        setEditingProduct(product);
        setEditForm({
            name: product.name,
            category: product.category,
            wholesale_price: (product.wholesale_price_cents / 100).toFixed(2),
            available_qty: product.on_hand.toString(),
            low_stock_threshold: product.low_stock_threshold.toString(),
            is_active: product.is_active,
        });
    };

    // Handle edit product - PATCH stock fields only
    const handleEditProduct = async () => {
        if (!editingProduct) return;

        setIsEditingSaving(true);
        try {
            const onHand = parseInt(editForm.available_qty, 10);
            const reorderPoint = parseInt(editForm.low_stock_threshold, 10);
            if (isNaN(onHand) || onHand < 0) {
                toast({ title: 'Invalid quantity', description: 'Please enter a valid stock quantity', variant: 'destructive' });
                setIsEditingSaving(false);
                return;
            }

            const res = await fetch('/api/v1/admin/inventory', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    product_id: editingProduct.id,
                    on_hand: onHand,
                    reorder_point: isNaN(reorderPoint) ? undefined : reorderPoint,
                    active: editForm.is_active,
                    reason: 'Edit product modal',
                }),
            });
            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.error || 'Failed to update product');
            }
            setProducts(prev => prev.map(p =>
                p.id === editingProduct.id
                    ? {
                        ...p,
                        on_hand: onHand,
                        available_qty: onHand - p.reserved,
                        low_stock_threshold: isNaN(reorderPoint) ? p.low_stock_threshold : reorderPoint,
                        is_active: editForm.is_active,
                    }
                    : p
            ));
            setEditingProduct(null);
            toast({ title: 'Product updated', description: 'Product has been updated successfully' });
        } catch (e) {
            toast({
                title: 'Update failed',
                description: e instanceof Error ? e.message : 'Could not update product',
                variant: 'destructive',
            });
        } finally {
            setIsEditingSaving(false);
        }
    };

    const CSV_TEMPLATE_HEADERS = 'sku,name,price_dollars,description,category,initial_stock,low_stock_threshold,weight_grams,min_order_qty,max_order_qty,active,requires_coa,tags';
    const CSV_TEMPLATE_EXAMPLE = 'BPC-157-5MG,BPC-157 5mg,24.99,Body Protection Compound,Peptides,100,10,5,1,,true,false,peptide;research';

    const handleDownloadTemplate = () => {
        const content = CSV_TEMPLATE_HEADERS + '\n' + CSV_TEMPLATE_EXAMPLE + '\n';
        const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'product-upload-template.csv';
        a.click();
        URL.revokeObjectURL(url);
    };

    const handleBulkUpload = async () => {
        if (!bulkFile) return;
        setBulkUploading(true);
        setBulkResults(null);

        try {
            const formData = new FormData();
            formData.append('file', bulkFile);

            const res = await fetch('/api/v1/admin/inventory/bulk-upload', {
                method: 'POST',
                body: formData,
            });

            const json = await res.json();

            if (!res.ok) {
                throw new Error(json.error || 'Upload failed');
            }

            setBulkResults(json);

            if (json.summary.created > 0) {
                toast({
                    title: 'Products imported',
                    description: `${json.summary.created} product(s) created, ${json.summary.failed} failed.`,
                });
                fetchInventory();
            }
        } catch (e) {
            toast({
                title: 'Bulk upload failed',
                description: e instanceof Error ? e.message : 'Could not process CSV file',
                variant: 'destructive',
            });
        } finally {
            setBulkUploading(false);
        }
    };

    const closeBulkUpload = () => {
        setShowBulkUpload(false);
        setBulkFile(null);
        setBulkResults(null);
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Inventory</h1>
                    <p className="text-gray-500">Manage product stock levels and pricing</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setShowBulkUpload(true)}>
                        <Upload className="w-4 h-4 mr-2" />
                        Import CSV
                    </Button>
                    <Button onClick={() => setShowAddModal(true)}>
                        <Plus className="w-4 h-4 mr-2" />
                        Add Product
                    </Button>
                </div>
            </div>

            {/* Stats */}
            <div className="grid gap-4 md:grid-cols-3">
                <Card>
                    <CardContent className="p-4 flex items-center gap-3">
                        <div className="w-12 h-12 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                            <Box className="w-6 h-6 text-blue-600" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-gray-900 dark:text-white">{products.length}</p>
                            <p className="text-sm text-gray-500">Total Products</p>
                        </div>
                    </CardContent>
                </Card>

                <Card
                    className={cn(
                        'cursor-pointer transition-colors',
                        showLowStock && 'ring-2 ring-red-500'
                    )}
                    onClick={() => setShowLowStock(!showLowStock)}
                >
                    <CardContent className="p-4 flex items-center gap-3">
                        <div className="w-12 h-12 rounded-lg bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                            <AlertTriangle className="w-6 h-6 text-red-600" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-gray-900 dark:text-white">{lowStockCount}</p>
                            <p className="text-sm text-gray-500">Low Stock</p>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-4 flex items-center gap-3">
                        <div className="w-12 h-12 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                            <Package className="w-6 h-6 text-green-600" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-gray-900 dark:text-white">
                                {formatCurrency(totalValue)}
                            </p>
                            <p className="text-sm text-gray-500">Inventory Value</p>
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
                                placeholder="Search by SKU or name..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-9"
                            />
                        </div>
                        <Button
                            variant={showLowStock ? 'default' : 'outline'}
                            onClick={() => setShowLowStock(!showLowStock)}
                        >
                            <AlertTriangle className="w-4 h-4 mr-2" />
                            Low Stock Only
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Error state */}
            {error && (
                <Card className="border-red-200 dark:border-red-900">
                    <CardContent className="p-6 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <AlertTriangle className="w-6 h-6 text-red-600" />
                            <div>
                                <p className="font-medium text-red-800 dark:text-red-200">Failed to load inventory</p>
                                <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                            </div>
                        </div>
                        <Button variant="outline" onClick={fetchInventory}>
                            Retry
                        </Button>
                    </CardContent>
                </Card>
            )}

            {/* Products Table */}
            <Card>
                <CardContent className="p-0">
                    {isLoading ? (
                        <div className="flex items-center justify-center py-16">
                            <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
                        </div>
                    ) : (
                        <table className="w-full">
                            <thead className="bg-gray-50 dark:bg-gray-800/50 border-b">
                                <tr>
                                    <th className="text-left p-4 text-sm font-medium text-gray-500">Product</th>
                                    <th className="text-left p-4 text-sm font-medium text-gray-500">SKU</th>
                                    <th className="text-left p-4 text-sm font-medium text-gray-500">Category</th>
                                    <th className="text-right p-4 text-sm font-medium text-gray-500">Wholesale</th>
                                    <th className="text-right p-4 text-sm font-medium text-gray-500">Stock</th>
                                    <th className="text-left p-4 text-sm font-medium text-gray-500">Status</th>
                                    <th className="text-right p-4 text-sm font-medium text-gray-500">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {filteredProducts.map((product) => {
                                    const isLowStock = product.available_qty <= product.low_stock_threshold;
                                    const isEditing = editingStock === product.id;

                                    return (
                                        <tr key={product.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                                            <td className="p-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-lg bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center">
                                                        <Box className="w-5 h-5 text-violet-600" />
                                                    </div>
                                                    <p className="font-medium text-gray-900 dark:text-white">
                                                        {product.name}
                                                    </p>
                                                </div>
                                            </td>
                                            <td className="p-4 font-mono text-sm text-gray-500">{product.sku}</td>
                                            <td className="p-4 text-gray-500">{product.category}</td>
                                            <td className="p-4 text-right font-medium text-gray-900 dark:text-white">
                                                {formatCurrency(product.wholesale_price_cents)}
                                            </td>
                                            <td className="p-4 text-right">
                                                {isEditing ? (
                                                    <div className="flex items-center justify-end gap-2">
                                                        <Input
                                                            type="number"
                                                            value={stockValue}
                                                            onChange={(e) => setStockValue(e.target.value)}
                                                            className="w-20 h-8 text-right"
                                                            autoFocus
                                                            disabled={isStockSaving}
                                                            onKeyDown={(e) => {
                                                                if (e.key === 'Enter') handleStockUpdate(product.id);
                                                                if (e.key === 'Escape') setEditingStock(null);
                                                            }}
                                                        />
                                                        <Button size="sm" onClick={() => handleStockUpdate(product.id)} disabled={isStockSaving}>
                                                            {isStockSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save'}
                                                        </Button>
                                                        <Button size="sm" variant="ghost" onClick={() => setEditingStock(null)} disabled={isStockSaving}>
                                                            Cancel
                                                        </Button>
                                                    </div>
                                                ) : (
                                                    <button
                                                        onClick={() => {
                                                            setEditingStock(product.id);
                                                            setStockValue(product.on_hand.toString());
                                                        }}
                                                        className={cn(
                                                            'font-medium hover:underline',
                                                            isLowStock ? 'text-red-600' : 'text-gray-900 dark:text-white'
                                                        )}
                                                    >
                                                        {product.available_qty}
                                                        {isLowStock && (
                                                            <TrendingDown className="inline w-4 h-4 ml-1 text-red-500" />
                                                        )}
                                                    </button>
                                                )}
                                            </td>
                                            <td className="p-4">
                                                {isLowStock ? (
                                                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">
                                                        <AlertTriangle className="w-3 h-3" />
                                                        Low Stock
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                                                        In Stock
                                                    </span>
                                                )}
                                            </td>
                                            <td className="p-4 text-right">
                                                <Button size="sm" variant="ghost" onClick={() => openEditModal(product)}>
                                                    <Edit className="w-4 h-4" />
                                                </Button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    )}
                </CardContent>
            </Card>

            {/* Empty state */}
            {!isLoading && !error && filteredProducts.length === 0 && (
                <Card>
                    <CardContent className="p-12 text-center">
                        <Box className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                        <h3 className="font-semibold text-gray-900 dark:text-white mb-2">No products found</h3>
                        <p className="text-gray-500">
                            {products.length === 0 ? 'Inventory is empty' : 'Try adjusting your search criteria'}
                        </p>
                    </CardContent>
                </Card>
            )}

            {/* Add Product Modal */}
            {showAddModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <Card className="w-full max-w-lg mx-4">
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <CardTitle>Add New Product</CardTitle>
                                <Button variant="ghost" size="icon" onClick={() => setShowAddModal(false)}>
                                    <X className="w-4 h-4" />
                                </Button>
                            </div>
                            <CardDescription>Add a new product to your inventory</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid gap-4 md:grid-cols-2">
                                <div>
                                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                        SKU <span className="text-red-500">*</span>
                                    </label>
                                    <Input
                                        value={newProduct.sku}
                                        onChange={(e) => setNewProduct({ ...newProduct, sku: e.target.value.toUpperCase() })}
                                        placeholder="BPC-157-5MG"
                                        className="mt-1"
                                    />
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                        Category
                                    </label>
                                    <select
                                        value={newProduct.category}
                                        onChange={(e) => setNewProduct({ ...newProduct, category: e.target.value })}
                                        className="w-full h-10 mt-1 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 text-sm"
                                    >
                                        <option value="Peptides">Peptides</option>
                                        <option value="Compounds">Compounds</option>
                                        <option value="SARMs">SARMs</option>
                                        <option value="Nootropics">Nootropics</option>
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                    Product Name <span className="text-red-500">*</span>
                                </label>
                                <Input
                                    value={newProduct.name}
                                    onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                                    placeholder="BPC-157 5mg"
                                    className="mt-1"
                                />
                            </div>
                            <div className="grid gap-4 md:grid-cols-3">
                                <div>
                                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                        Wholesale Price ($) <span className="text-red-500">*</span>
                                    </label>
                                    <Input
                                        type="number"
                                        step="0.01"
                                        value={newProduct.wholesale_price}
                                        onChange={(e) => setNewProduct({ ...newProduct, wholesale_price: e.target.value })}
                                        placeholder="25.00"
                                        className="mt-1"
                                    />
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                        Initial Stock
                                    </label>
                                    <Input
                                        type="number"
                                        value={newProduct.available_qty}
                                        onChange={(e) => setNewProduct({ ...newProduct, available_qty: e.target.value })}
                                        placeholder="100"
                                        className="mt-1"
                                    />
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                        Low Stock Threshold
                                    </label>
                                    <Input
                                        type="number"
                                        value={newProduct.low_stock_threshold}
                                        onChange={(e) => setNewProduct({ ...newProduct, low_stock_threshold: e.target.value })}
                                        placeholder="10"
                                        className="mt-1"
                                    />
                                </div>
                            </div>
                            <div className="flex gap-3 pt-4">
                                <Button onClick={handleAddProduct} disabled={isAddingSaving} className="flex-1">
                                    {isAddingSaving ? (
                                        <>
                                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                            Adding...
                                        </>
                                    ) : (
                                        <>
                                            <Plus className="w-4 h-4 mr-2" />
                                            Add Product
                                        </>
                                    )}
                                </Button>
                                <Button variant="outline" onClick={() => setShowAddModal(false)}>
                                    Cancel
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Edit Product Modal */}
            {editingProduct && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <Card className="w-full max-w-lg mx-4">
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <CardTitle>Edit Product</CardTitle>
                                <Button variant="ghost" size="icon" onClick={() => setEditingProduct(null)}>
                                    <X className="w-4 h-4" />
                                </Button>
                            </div>
                            <CardDescription>
                                SKU: <span className="font-mono">{editingProduct.sku}</span>
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                    Product Name
                                </label>
                                <Input
                                    value={editForm.name}
                                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                                    className="mt-1"
                                    disabled
                                />
                            </div>
                            <div>
                                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                    Category
                                </label>
                                <select
                                    value={editForm.category}
                                    onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                                    className="w-full h-10 mt-1 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 text-sm"
                                    disabled
                                >
                                    <option value="Peptides">Peptides</option>
                                    <option value="Compounds">Compounds</option>
                                    <option value="SARMs">SARMs</option>
                                    <option value="Nootropics">Nootropics</option>
                                </select>
                            </div>
                            <div className="grid gap-4 md:grid-cols-3">
                                <div>
                                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                        Wholesale Price ($)
                                    </label>
                                    <Input
                                        type="number"
                                        step="0.01"
                                        value={editForm.wholesale_price}
                                        onChange={(e) => setEditForm({ ...editForm, wholesale_price: e.target.value })}
                                        className="mt-1"
                                        disabled
                                    />
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                        Stock Quantity
                                    </label>
                                    <Input
                                        type="number"
                                        value={editForm.available_qty}
                                        onChange={(e) => setEditForm({ ...editForm, available_qty: e.target.value })}
                                        className="mt-1"
                                    />
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                        Low Stock Threshold
                                    </label>
                                    <Input
                                        type="number"
                                        value={editForm.low_stock_threshold}
                                        onChange={(e) => setEditForm({ ...editForm, low_stock_threshold: e.target.value })}
                                        className="mt-1"
                                    />
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    id="edit-active"
                                    checked={editForm.is_active}
                                    onChange={(e) => setEditForm({ ...editForm, is_active: e.target.checked })}
                                    className="rounded border-gray-300"
                                />
                                <label htmlFor="edit-active" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                    Active
                                </label>
                            </div>
                            <div className="flex gap-3 pt-4">
                                <Button onClick={handleEditProduct} disabled={isEditingSaving} className="flex-1">
                                    {isEditingSaving ? (
                                        <>
                                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                            Saving...
                                        </>
                                    ) : (
                                        <>
                                            <Save className="w-4 h-4 mr-2" />
                                            Save Changes
                                        </>
                                    )}
                                </Button>
                                <Button variant="outline" onClick={() => setEditingProduct(null)}>
                                    Cancel
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Bulk Upload Modal */}
            {showBulkUpload && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
                    <Card className="w-full max-w-2xl my-8">
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle className="flex items-center gap-2">
                                        <Upload className="w-5 h-5" />
                                        Bulk Import Products
                                    </CardTitle>
                                    <CardDescription>
                                        Upload a CSV file to create or update multiple products at once
                                    </CardDescription>
                                </div>
                                <Button variant="ghost" size="icon" onClick={closeBulkUpload}>
                                    <X className="w-4 h-4" />
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-5">
                            {/* Step 1: Download template */}
                            <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
                                <div className="flex items-start gap-3">
                                    <FileText className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                                    <div className="flex-1">
                                        <h4 className="font-medium text-blue-900 dark:text-blue-100">CSV Template</h4>
                                        <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                                            Download the template to see the required format. Required columns:
                                            <strong> sku</strong>, <strong>name</strong>, and <strong>price_dollars</strong>.
                                            Existing SKUs will be updated.
                                        </p>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="mt-3 bg-white dark:bg-gray-900"
                                            onClick={handleDownloadTemplate}
                                        >
                                            <Download className="w-4 h-4 mr-2" />
                                            Download Template
                                        </Button>
                                    </div>
                                </div>
                            </div>

                            {/* Step 2: Upload file */}
                            {!bulkResults && (
                                <div className="space-y-3">
                                    <label className="block">
                                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                            Select CSV file
                                        </span>
                                        <div className="mt-1 flex items-center gap-3">
                                            <label className="flex-1">
                                                <input
                                                    type="file"
                                                    accept=".csv,text/csv"
                                                    onChange={(e) => {
                                                        setBulkFile(e.target.files?.[0] || null);
                                                        setBulkResults(null);
                                                    }}
                                                    className="hidden"
                                                />
                                                <div className={cn(
                                                    'border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors',
                                                    bulkFile
                                                        ? 'border-green-300 bg-green-50 dark:border-green-700 dark:bg-green-900/20'
                                                        : 'border-gray-300 hover:border-violet-400 dark:border-gray-700'
                                                )}>
                                                    {bulkFile ? (
                                                        <div className="flex items-center justify-center gap-2">
                                                            <CheckCircle className="w-5 h-5 text-green-600" />
                                                            <span className="font-medium text-green-700 dark:text-green-300">
                                                                {bulkFile.name}
                                                            </span>
                                                            <span className="text-sm text-gray-500">
                                                                ({(bulkFile.size / 1024).toFixed(1)} KB)
                                                            </span>
                                                        </div>
                                                    ) : (
                                                        <div>
                                                            <Upload className="w-8 h-8 mx-auto text-gray-400 mb-2" />
                                                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                                                Click to select a CSV file, or drag and drop
                                                            </p>
                                                            <p className="text-xs text-gray-400 mt-1">
                                                                Max 500 rows per upload
                                                            </p>
                                                        </div>
                                                    )}
                                                </div>
                                            </label>
                                        </div>
                                    </label>

                                    <div className="flex gap-3 pt-2">
                                        <Button
                                            onClick={handleBulkUpload}
                                            disabled={!bulkFile || bulkUploading}
                                            className="flex-1"
                                        >
                                            {bulkUploading ? (
                                                <>
                                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                                    Importing...
                                                </>
                                            ) : (
                                                <>
                                                    <Upload className="w-4 h-4 mr-2" />
                                                    Import Products
                                                </>
                                            )}
                                        </Button>
                                        <Button variant="outline" onClick={closeBulkUpload}>
                                            Cancel
                                        </Button>
                                    </div>
                                </div>
                            )}

                            {/* Step 3: Results */}
                            {bulkResults && (
                                <div className="space-y-4">
                                    {/* Summary */}
                                    <div className="grid grid-cols-3 gap-3">
                                        <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-800 text-center">
                                            <p className="text-2xl font-bold text-gray-900 dark:text-white">{bulkResults.summary.total}</p>
                                            <p className="text-xs text-gray-500">Total Rows</p>
                                        </div>
                                        <div className="p-3 rounded-lg bg-green-50 dark:bg-green-900/20 text-center">
                                            <p className="text-2xl font-bold text-green-700 dark:text-green-400">{bulkResults.summary.created}</p>
                                            <p className="text-xs text-green-600">Imported</p>
                                        </div>
                                        <div className={cn(
                                            'p-3 rounded-lg text-center',
                                            bulkResults.summary.failed > 0
                                                ? 'bg-red-50 dark:bg-red-900/20'
                                                : 'bg-gray-50 dark:bg-gray-800'
                                        )}>
                                            <p className={cn(
                                                'text-2xl font-bold',
                                                bulkResults.summary.failed > 0
                                                    ? 'text-red-700 dark:text-red-400'
                                                    : 'text-gray-900 dark:text-white'
                                            )}>{bulkResults.summary.failed}</p>
                                            <p className="text-xs text-gray-500">Failed</p>
                                        </div>
                                    </div>

                                    {/* Error details */}
                                    {bulkResults.results.some(r => !r.success) && (
                                        <div className="max-h-48 overflow-y-auto border rounded-lg divide-y">
                                            {bulkResults.results.filter(r => !r.success).map((r, i) => (
                                                <div key={i} className="p-2.5 flex items-start gap-2 text-sm">
                                                    <XCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                                                    <div>
                                                        <span className="font-medium">Row {r.row}</span>
                                                        <span className="text-gray-500 mx-1">({r.sku})</span>
                                                        <span className="text-red-600 dark:text-red-400">{r.error}</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    <div className="flex gap-3 pt-2">
                                        <Button
                                            onClick={() => {
                                                setBulkFile(null);
                                                setBulkResults(null);
                                            }}
                                            variant="outline"
                                            className="flex-1"
                                        >
                                            Upload Another File
                                        </Button>
                                        <Button onClick={closeBulkUpload}>
                                            Done
                                        </Button>
                                    </div>
                                </div>
                            )}

                            {/* Column reference */}
                            <details className="text-sm">
                                <summary className="cursor-pointer text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 font-medium">
                                    Column reference
                                </summary>
                                <div className="mt-2 grid grid-cols-2 gap-x-6 gap-y-1 text-gray-600 dark:text-gray-400 pl-2">
                                    <span><strong>sku</strong> — Required, unique ID</span>
                                    <span><strong>name</strong> — Required, product name</span>
                                    <span><strong>price_dollars</strong> — Required, e.g. 24.99</span>
                                    <span><strong>description</strong> — Optional</span>
                                    <span><strong>category</strong> — Optional, e.g. Peptides</span>
                                    <span><strong>initial_stock</strong> — Optional, default 0</span>
                                    <span><strong>low_stock_threshold</strong> — Optional, default 10</span>
                                    <span><strong>weight_grams</strong> — Optional, integer</span>
                                    <span><strong>min_order_qty</strong> — Optional, default 1</span>
                                    <span><strong>max_order_qty</strong> — Optional</span>
                                    <span><strong>active</strong> — Optional, true/false</span>
                                    <span><strong>requires_coa</strong> — Optional, true/false</span>
                                    <span><strong>tags</strong> — Optional, semicolon-separated</span>
                                </div>
                            </details>
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    );
}
