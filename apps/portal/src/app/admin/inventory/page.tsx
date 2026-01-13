'use client';

import { useState } from 'react';
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

// Product type
interface Product {
    id: string;
    sku: string;
    name: string;
    category: string;
    wholesale_price_cents: number;
    available_qty: number;
    low_stock_threshold: number;
    is_active: boolean;
}

// Initial mock products data
const initialProducts: Product[] = [
    {
        id: '1',
        sku: 'BPC-157-5MG',
        name: 'BPC-157 5mg',
        category: 'Peptides',
        wholesale_price_cents: 2500,
        available_qty: 142,
        low_stock_threshold: 10,
        is_active: true,
    },
    {
        id: '2',
        sku: 'TB-500-5MG',
        name: 'TB-500 (Thymosin Beta-4) 5mg',
        category: 'Peptides',
        wholesale_price_cents: 3200,
        available_qty: 89,
        low_stock_threshold: 10,
        is_active: true,
    },
    {
        id: '3',
        sku: 'BPC-157-10MG',
        name: 'BPC-157 10mg',
        category: 'Peptides',
        wholesale_price_cents: 4500,
        available_qty: 8,
        low_stock_threshold: 10,
        is_active: true,
    },
    {
        id: '4',
        sku: 'GHK-CU-50MG',
        name: 'GHK-Cu 50mg',
        category: 'Peptides',
        wholesale_price_cents: 4500,
        available_qty: 56,
        low_stock_threshold: 10,
        is_active: true,
    },
    {
        id: '5',
        sku: 'SEMA-3MG',
        name: 'Semaglutide 3mg',
        category: 'Peptides',
        wholesale_price_cents: 12500,
        available_qty: 3,
        low_stock_threshold: 5,
        is_active: true,
    },
    {
        id: '6',
        sku: 'NAD-500MG',
        name: 'NAD+ 500mg',
        category: 'Compounds',
        wholesale_price_cents: 8900,
        available_qty: 34,
        low_stock_threshold: 10,
        is_active: true,
    },
];

export default function InventoryPage() {
    const [products, setProducts] = useState<Product[]>(initialProducts);
    const [searchQuery, setSearchQuery] = useState('');
    const [showLowStock, setShowLowStock] = useState(false);

    // Inline stock editing state
    const [editingStock, setEditingStock] = useState<string | null>(null);
    const [stockValue, setStockValue] = useState('');

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
    });

    const filteredProducts = products.filter((product) => {
        const matchesSearch =
            product.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
            product.name.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesLowStock = !showLowStock || product.available_qty <= product.low_stock_threshold;
        return matchesSearch && matchesLowStock;
    });

    const lowStockCount = products.filter(p => p.available_qty <= p.low_stock_threshold).length;
    const totalValue = products.reduce((sum, p) => sum + (p.wholesale_price_cents * p.available_qty), 0);

    // Handle inline stock update
    const handleStockUpdate = (productId: string) => {
        const newQty = parseInt(stockValue, 10);
        if (isNaN(newQty) || newQty < 0) {
            toast({ title: 'Invalid quantity', description: 'Please enter a valid number', variant: 'destructive' });
            return;
        }

        setProducts(prev => prev.map(p =>
            p.id === productId ? { ...p, available_qty: newQty } : p
        ));

        toast({ title: 'Stock updated', description: `Stock updated to ${newQty} units` });
        setEditingStock(null);
        setStockValue('');
    };

    // Handle add product
    const handleAddProduct = () => {
        if (!newProduct.sku.trim() || !newProduct.name.trim() || !newProduct.wholesale_price) {
            toast({ title: 'Missing fields', description: 'Please fill in all required fields', variant: 'destructive' });
            return;
        }

        // Check for duplicate SKU
        if (products.some(p => p.sku.toUpperCase() === newProduct.sku.toUpperCase())) {
            toast({ title: 'Duplicate SKU', description: 'A product with this SKU already exists', variant: 'destructive' });
            return;
        }

        setIsAddingSaving(true);

        // Simulate API call
        setTimeout(() => {
            const product: Product = {
                id: Date.now().toString(),
                sku: newProduct.sku.toUpperCase(),
                name: newProduct.name,
                category: newProduct.category,
                wholesale_price_cents: Math.round(parseFloat(newProduct.wholesale_price) * 100),
                available_qty: parseInt(newProduct.available_qty, 10) || 0,
                low_stock_threshold: parseInt(newProduct.low_stock_threshold, 10) || 10,
                is_active: true,
            };

            setProducts(prev => [product, ...prev]);
            setShowAddModal(false);
            setNewProduct({
                sku: '',
                name: '',
                category: 'Peptides',
                wholesale_price: '',
                available_qty: '',
                low_stock_threshold: '10',
            });
            setIsAddingSaving(false);

            toast({ title: 'Product added', description: `${product.name} has been added to inventory` });
        }, 500);
    };

    // Open edit modal
    const openEditModal = (product: Product) => {
        setEditingProduct(product);
        setEditForm({
            name: product.name,
            category: product.category,
            wholesale_price: (product.wholesale_price_cents / 100).toFixed(2),
            available_qty: product.available_qty.toString(),
            low_stock_threshold: product.low_stock_threshold.toString(),
        });
    };

    // Handle edit product
    const handleEditProduct = () => {
        if (!editingProduct) return;

        setIsEditingSaving(true);

        // Simulate API call
        setTimeout(() => {
            setProducts(prev => prev.map(p =>
                p.id === editingProduct.id
                    ? {
                        ...p,
                        name: editForm.name,
                        category: editForm.category,
                        wholesale_price_cents: Math.round(parseFloat(editForm.wholesale_price) * 100),
                        available_qty: parseInt(editForm.available_qty, 10) || 0,
                        low_stock_threshold: parseInt(editForm.low_stock_threshold, 10) || 10,
                    }
                    : p
            ));

            setEditingProduct(null);
            setIsEditingSaving(false);

            toast({ title: 'Product updated', description: 'Product has been updated successfully' });
        }, 500);
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

            {/* Products Table */}
            <Card>
                <CardContent className="p-0">
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
                                                        onKeyDown={(e) => {
                                                            if (e.key === 'Enter') handleStockUpdate(product.id);
                                                            if (e.key === 'Escape') setEditingStock(null);
                                                        }}
                                                    />
                                                    <Button size="sm" onClick={() => handleStockUpdate(product.id)}>
                                                        Save
                                                    </Button>
                                                    <Button size="sm" variant="ghost" onClick={() => setEditingStock(null)}>
                                                        Cancel
                                                    </Button>
                                                </div>
                                            ) : (
                                                <button
                                                    onClick={() => {
                                                        setEditingStock(product.id);
                                                        setStockValue(product.available_qty.toString());
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
                </CardContent>
            </Card>

            {filteredProducts.length === 0 && (
                <Card>
                    <CardContent className="p-12 text-center">
                        <Box className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                        <h3 className="font-semibold text-gray-900 dark:text-white mb-2">No products found</h3>
                        <p className="text-gray-500">Try adjusting your search criteria</p>
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
