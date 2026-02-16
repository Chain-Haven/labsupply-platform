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
    Loader2
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

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Inventory</h1>
                    <p className="text-gray-500">Manage product stock levels and pricing</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline">
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
        </div>
    );
}
