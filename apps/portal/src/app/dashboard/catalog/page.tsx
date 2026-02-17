'use client';

import { useState, useRef } from 'react';
import Image from 'next/image';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Package,
    Search,
    Filter,
    Grid,
    List,
    Plus,
    Check,
    ShoppingCart,
    FileText,
    ExternalLink,
    Tag,
    Upload,
    X,
    Image as ImageIcon,
    Loader2,
    FlaskConical,
    CheckCircle,
    AlertTriangle,
    Building,
    CreditCard,
    DollarSign,
    ArrowRight,
    ArrowLeft
} from 'lucide-react';
import { cn, formatCurrency } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';
import { defaultPeptideProducts } from '@/data/default-peptides';

// Product interface with label
interface Product {
    id: string;
    sku: string;
    name: string;
    description: string;
    category: string;
    wholesale_price_cents: number;
    map_price_cents: number;
    in_stock: boolean;
    available_qty: number;
    image: string | null;
    requires_coa: boolean;
    custom_label?: string | null;
}

// Use default peptides as initial products (replace with API fetch in production)
const initialProducts: Product[] = defaultPeptideProducts;

const categories = ['All', 'Peptides', 'Compounds', 'Accessories'];

// Label dimensions: 2" x 0.75" at 300 DPI = 600px x 225px
const LABEL_WIDTH_PX = 600;
const LABEL_HEIGHT_PX = 225;
const LABEL_ASPECT_RATIO = LABEL_WIDTH_PX / LABEL_HEIGHT_PX; // ~2.67

export default function CatalogPage() {
    const [products, setProducts] = useState<Product[]>(initialProducts);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('All');
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [importedProducts, setImportedProducts] = useState<string[]>([]);

    // Label upload modal state
    const [labelModalOpen, setLabelModalOpen] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const [labelPreview, setLabelPreview] = useState<string | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // 3rd Party Testing state
    const SHIPPING_FEE_CENTS = 5000; // $50 overnight shipping

    const [testingMode, setTestingMode] = useState(false);
    const [selectedForTesting, setSelectedForTesting] = useState<Set<string>>(new Set());
    const [testingModalOpen, setTestingModalOpen] = useState(false);
    const [testingStep, setTestingStep] = useState(1); // 1-5 for confirmation steps
    const [isProcessingTesting, setIsProcessingTesting] = useState(false);

    // Per-product addon selections: { productId: { conformity: bool, sterility: bool, ... } }
    const [testingAddons, setTestingAddons] = useState<Record<string, {
        conformity: boolean;
        sterility: boolean;
        endotoxins: boolean;
        net_content: boolean;
        purity: boolean;
    }>>({});

    // Testing labs from API
    const [testingLabs, setTestingLabs] = useState<Array<{ id: string; name: string; email: string; is_default: boolean }>>([]);
    const [selectedLabId, setSelectedLabId] = useState<string>('');
    const [labsLoaded, setLabsLoaded] = useState(false);

    // Addon pricing constants
    const ADDON_EXTRA_QTY: Record<string, number> = {
        conformity: 2, sterility: 1, endotoxins: 1, net_content: 0, purity: 0,
    };
    const ADDON_FEE_CENTS: Record<string, number> = {
        conformity: 5000, sterility: 25000, endotoxins: 25000, net_content: 0, purity: 0,
    };

    const filteredProducts = products.filter((product) => {
        const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            product.sku.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesCategory = selectedCategory === 'All' || product.category === selectedCategory;
        return matchesSearch && matchesCategory;
    });

    const handleImport = (productId: string) => {
        setImportedProducts([...importedProducts, productId]);
    };

    const isImported = (productId: string) => importedProducts.includes(productId);

    // Open label upload modal
    const openLabelModal = (product: Product) => {
        setSelectedProduct(product);
        setLabelPreview(product.custom_label || null);
        setLabelModalOpen(true);
    };

    // Toggle product selection for testing
    const toggleTestingSelection = (productId: string) => {
        setSelectedForTesting(prev => {
            const next = new Set(prev);
            if (next.has(productId)) {
                next.delete(productId);
            } else {
                next.add(productId);
            }
            return next;
        });
    };

    // Initialize addons for a product when selected
    const ensureAddonState = (productId: string) => {
        if (!testingAddons[productId]) {
            setTestingAddons(prev => ({
                ...prev,
                [productId]: {
                    conformity: false,
                    sterility: false,
                    endotoxins: false,
                    net_content: false,
                    purity: false,
                },
            }));
        }
    };

    // Toggle an addon for a specific product
    const toggleAddon = (productId: string, addon: string) => {
        ensureAddonState(productId);
        setTestingAddons(prev => ({
            ...prev,
            [productId]: {
                ...prev[productId],
                [addon]: !prev[productId]?.[addon as keyof typeof prev[string]],
            },
        }));
    };

    // Calculate per-item costs
    const calculateItemCost = (product: Product, addons: typeof testingAddons[string]) => {
        if (!addons) return { totalQty: 1, productCost: product.wholesale_price_cents, testingFee: 0 };
        let extraQty = 0;
        let testingFee = 0;
        for (const [key, enabled] of Object.entries(addons)) {
            if (enabled) {
                extraQty += ADDON_EXTRA_QTY[key] || 0;
                testingFee += ADDON_FEE_CENTS[key] || 0;
            }
        }
        const totalQty = 1 + extraQty;
        const productCost = product.wholesale_price_cents * totalQty;
        return { totalQty, productCost, testingFee };
    };

    // Calculate testing costs
    const calculateTestingCosts = () => {
        const selectedProducts = products.filter(p => selectedForTesting.has(p.id));
        let totalProductCost = 0;
        let totalTestingFee = 0;

        const itemDetails = selectedProducts.map(p => {
            const addons = testingAddons[p.id];
            const calc = calculateItemCost(p, addons);
            totalProductCost += calc.productCost;
            totalTestingFee += calc.testingFee;
            return { product: p, ...calc, addons };
        });

        const totalCents = totalProductCost + totalTestingFee + SHIPPING_FEE_CENTS;

        return {
            productCount: selectedProducts.length,
            productCostCents: totalProductCost,
            testingFeeCents: totalTestingFee,
            shippingCents: SHIPPING_FEE_CENTS,
            totalCents,
            products: selectedProducts,
            itemDetails,
        };
    };

    // Fetch testing labs from API
    const fetchTestingLabs = async () => {
        if (labsLoaded) return;
        try {
            const res = await fetch('/api/v1/admin/testing-labs');
            if (res.ok) {
                const json = await res.json();
                const labs = (json.data || []).filter((l: { active: boolean }) => l.active);
                setTestingLabs(labs);
                const defaultLab = labs.find((l: { is_default: boolean }) => l.is_default);
                if (defaultLab) setSelectedLabId(defaultLab.id);
                else if (labs.length > 0) setSelectedLabId(labs[0].id);
            }
        } catch {
            // Labs will show empty, user can still proceed
        }
        setLabsLoaded(true);
    };

    // Start testing flow
    const startTestingFlow = () => {
        if (selectedForTesting.size === 0) {
            toast({
                title: 'No products selected',
                description: 'Please select at least one product for testing.',
                variant: 'destructive'
            });
            return;
        }
        // Initialize addon state for all selected products
        selectedForTesting.forEach(id => ensureAddonState(id));
        fetchTestingLabs();
        setTestingStep(1);
        setTestingModalOpen(true);
    };

    // Cancel testing mode
    const cancelTestingMode = () => {
        setTestingMode(false);
        setSelectedForTesting(new Set());
        setTestingAddons({});
    };

    // Process testing order - real API call
    const processTestingOrder = async () => {
        setIsProcessingTesting(true);

        const costs = calculateTestingCosts();

        try {
            const items = costs.products.map(p => ({
                product_id: p.id,
                sku: p.sku,
                product_name: p.name,
                product_cost_cents: p.wholesale_price_cents,
                addon_conformity: testingAddons[p.id]?.conformity || false,
                addon_sterility: testingAddons[p.id]?.sterility || false,
                addon_endotoxins: testingAddons[p.id]?.endotoxins || false,
                addon_net_content: testingAddons[p.id]?.net_content || false,
                addon_purity: testingAddons[p.id]?.purity || false,
            }));

            const res = await fetch('/api/v1/admin/testing-orders', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    merchant_id: 'current', // The API will resolve from auth context
                    testing_lab_id: selectedLabId,
                    items,
                }),
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || 'Failed to create testing order');
            }

            setIsProcessingTesting(false);
            setTestingModalOpen(false);
            setTestingMode(false);
            setSelectedForTesting(new Set());
            setTestingAddons({});
            setTestingStep(1);

            toast({
                title: 'Testing order submitted!',
                description: `${costs.productCount} product(s) sent for 3rd party testing. Total: ${formatCurrency(costs.totalCents)}`,
            });
        } catch (error) {
            setIsProcessingTesting(false);
            toast({
                title: 'Testing order failed',
                description: error instanceof Error ? error.message : 'An error occurred',
                variant: 'destructive',
            });
        }
    };

    // Handle file selection
    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validate file type
        if (!file.type.startsWith('image/')) {
            toast({
                title: 'Invalid file type',
                description: 'Please upload an image file (PNG, JPG, etc.)',
                variant: 'destructive'
            });
            return;
        }

        // Validate file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
            toast({
                title: 'File too large',
                description: 'Maximum file size is 5MB',
                variant: 'destructive'
            });
            return;
        }

        // Create preview
        const reader = new FileReader();
        reader.onload = (e) => {
            const result = e.target?.result as string;

            // Validate dimensions
            const img = new window.Image();
            img.onload = () => {
                // Check aspect ratio (allow some tolerance)
                const aspectRatio = img.width / img.height;
                const expectedRatio = LABEL_ASPECT_RATIO;
                const tolerance = 0.2; // 20% tolerance

                if (Math.abs(aspectRatio - expectedRatio) > tolerance) {
                    toast({
                        title: 'Incorrect aspect ratio',
                        description: `Label should be 2" x 0.75" (approximately ${LABEL_WIDTH_PX}x${LABEL_HEIGHT_PX}px). Your image is ${img.width}x${img.height}px.`,
                        variant: 'destructive'
                    });
                    return;
                }

                setLabelPreview(result);
            };
            img.src = result;
        };
        reader.readAsDataURL(file);
    };

    // Save label
    const handleSaveLabel = () => {
        if (!selectedProduct || !labelPreview) return;

        setIsUploading(true);

        // Simulate upload
        setTimeout(() => {
            setProducts(prev => prev.map(p =>
                p.id === selectedProduct.id
                    ? { ...p, custom_label: labelPreview }
                    : p
            ));

            setIsUploading(false);
            setLabelModalOpen(false);
            setSelectedProduct(null);
            setLabelPreview(null);

            toast({
                title: 'Label uploaded',
                description: `Custom label saved for ${selectedProduct.name}`
            });
        }, 500);
    };

    // Remove label
    const handleRemoveLabel = () => {
        if (!selectedProduct) return;

        setProducts(prev => prev.map(p =>
            p.id === selectedProduct.id
                ? { ...p, custom_label: null }
                : p
        ));

        setLabelPreview(null);

        toast({
            title: 'Label removed',
            description: `Custom label removed from ${selectedProduct.name}`
        });
    };

    return (
        <div className="space-y-6 animate-in">
            {/* Page header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Product Catalog</h1>
                    <p className="text-gray-500 dark:text-gray-400">Browse and import products to your store</p>
                </div>
                <div className="flex gap-2">
                    {!testingMode && (
                        <Button
                            variant="outline"
                            onClick={() => setTestingMode(true)}
                            className="border-purple-300 text-purple-700 hover:bg-purple-50"
                        >
                            <FlaskConical className="w-4 h-4 mr-2" />
                            Send to 3rd Party Testing
                        </Button>
                    )}
                    <Button>
                        <Plus className="w-4 h-4 mr-2" />
                        Import All
                    </Button>
                </div>
            </div>

            {/* Testing Mode Action Bar */}
            {testingMode && (
                <Card className="bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <FlaskConical className="w-6 h-6 text-purple-600" />
                                <div>
                                    <h3 className="font-semibold text-purple-900 dark:text-purple-100">
                                        3rd Party Testing Mode
                                    </h3>
                                    <p className="text-sm text-purple-700 dark:text-purple-300">
                                        {selectedForTesting.size === 0
                                            ? 'Click on products to select them for testing'
                                            : `${selectedForTesting.size} product(s) selected • $300 per test + product cost + $50 shipping`
                                        }
                                    </p>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <Button
                                    variant="outline"
                                    onClick={cancelTestingMode}
                                    className="border-purple-300"
                                >
                                    Cancel
                                </Button>
                                <Button
                                    onClick={startTestingFlow}
                                    disabled={selectedForTesting.size === 0}
                                    className="bg-purple-600 hover:bg-purple-700"
                                >
                                    <Check className="w-4 h-4 mr-2" />
                                    Finalize Selection
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Filters */}
            <Card>
                <CardContent className="p-4">
                    <div className="flex flex-col sm:flex-row gap-4">
                        {/* Search */}
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <Input
                                placeholder="Search products..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-9"
                            />
                        </div>

                        {/* Category filter */}
                        <div className="flex gap-2">
                            {categories.map((category) => (
                                <Button
                                    key={category}
                                    variant={selectedCategory === category ? 'default' : 'outline'}
                                    size="sm"
                                    onClick={() => setSelectedCategory(category)}
                                    className={selectedCategory === category ? 'bg-violet-600 hover:bg-violet-700' : ''}
                                >
                                    {category}
                                </Button>
                            ))}
                        </div>

                        {/* View mode */}
                        <div className="flex gap-1 border rounded-lg p-1">
                            <Button
                                variant={viewMode === 'grid' ? 'default' : 'ghost'}
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => setViewMode('grid')}
                            >
                                <Grid className="w-4 h-4" />
                            </Button>
                            <Button
                                variant={viewMode === 'list' ? 'default' : 'ghost'}
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => setViewMode('list')}
                            >
                                <List className="w-4 h-4" />
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Products */}
            {viewMode === 'grid' ? (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {filteredProducts.map((product) => (
                        <Card
                            key={product.id}
                            className={cn(
                                "overflow-hidden transition-all cursor-pointer",
                                testingMode && selectedForTesting.has(product.id) && "ring-2 ring-purple-500 bg-purple-50 dark:bg-purple-900/20"
                            )}
                            onClick={() => testingMode && toggleTestingSelection(product.id)}
                        >
                            {/* Product Image */}
                            <div className="aspect-video bg-gradient-to-br from-violet-100 to-indigo-100 dark:from-violet-900/20 dark:to-indigo-900/20 flex items-center justify-center relative">
                                <Package className="w-16 h-16 text-violet-300 dark:text-violet-700" />

                                {/* Testing selection indicator */}
                                {testingMode && (
                                    <div className={cn(
                                        "absolute top-2 left-2 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors",
                                        selectedForTesting.has(product.id)
                                            ? "bg-purple-600 border-purple-600"
                                            : "bg-white/80 border-gray-300"
                                    )}>
                                        {selectedForTesting.has(product.id) && (
                                            <Check className="w-4 h-4 text-white" />
                                        )}
                                    </div>
                                )}

                                {/* Label indicator */}
                                {product.custom_label && (
                                    <div className="absolute top-2 right-2 px-2 py-1 bg-green-500 text-white text-xs rounded-full flex items-center gap-1">
                                        <Tag className="w-3 h-3" />
                                        Label
                                    </div>
                                )}
                            </div>

                            <CardContent className="p-4">
                                <div className="flex items-start justify-between mb-2">
                                    <div>
                                        <p className="text-xs text-gray-500 font-mono">{product.sku}</p>
                                        <h3 className="font-semibold text-gray-900 dark:text-white">{product.name}</h3>
                                    </div>
                                    {product.requires_coa && (
                                        <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full">COA</span>
                                    )}
                                </div>

                                <p className="text-sm text-gray-500 line-clamp-2 mb-3">{product.description}</p>

                                <div className="flex items-center justify-between mb-3">
                                    <div>
                                        <p className="text-lg font-bold text-gray-900 dark:text-white">
                                            {formatCurrency(product.wholesale_price_cents)}
                                        </p>
                                        <p className="text-xs text-gray-500">MAP: {formatCurrency(product.map_price_cents)}</p>
                                    </div>
                                    <div className="text-right">
                                        {product.in_stock ? (
                                            <span className="text-green-600 text-sm">{product.available_qty} in stock</span>
                                        ) : (
                                            <span className="text-red-600 text-sm">Out of stock</span>
                                        )}
                                    </div>
                                </div>

                                <div className="flex gap-2">
                                    {isImported(product.id) ? (
                                        <Button disabled className="flex-1" variant="outline">
                                            <Check className="w-4 h-4 mr-2" />
                                            Imported
                                        </Button>
                                    ) : (
                                        <Button
                                            className="flex-1 bg-violet-600 hover:bg-violet-700"
                                            onClick={() => handleImport(product.id)}
                                            disabled={!product.in_stock}
                                        >
                                            <ShoppingCart className="w-4 h-4 mr-2" />
                                            Import
                                        </Button>
                                    )}
                                    <Button
                                        variant="outline"
                                        size="icon"
                                        onClick={() => openLabelModal(product)}
                                        className={product.custom_label ? 'border-green-500 text-green-600' : ''}
                                        title="Upload custom label (2&quot; x 0.75&quot;)"
                                    >
                                        <Tag className="w-4 h-4" />
                                    </Button>
                                    <Button variant="outline" size="icon">
                                        <FileText className="w-4 h-4" />
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            ) : (
                <Card>
                    <CardContent className="p-0">
                        <table className="w-full">
                            <thead className="border-b">
                                <tr>
                                    <th className="text-left p-4 text-sm font-medium text-gray-500">Product</th>
                                    <th className="text-left p-4 text-sm font-medium text-gray-500">SKU</th>
                                    <th className="text-left p-4 text-sm font-medium text-gray-500">Category</th>
                                    <th className="text-center p-4 text-sm font-medium text-gray-500">Label</th>
                                    <th className="text-right p-4 text-sm font-medium text-gray-500">Wholesale</th>
                                    <th className="text-right p-4 text-sm font-medium text-gray-500">Stock</th>
                                    <th className="text-right p-4 text-sm font-medium text-gray-500">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {filteredProducts.map((product) => (
                                    <tr key={product.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                                        <td className="p-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded bg-violet-100 dark:bg-violet-900/20 flex items-center justify-center">
                                                    <Package className="w-5 h-5 text-violet-600" />
                                                </div>
                                                <div>
                                                    <p className="font-medium text-gray-900 dark:text-white">{product.name}</p>
                                                    {product.requires_coa && (
                                                        <span className="text-xs text-blue-600">Requires COA</span>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-4 font-mono text-sm text-gray-500">{product.sku}</td>
                                        <td className="p-4 text-gray-500">{product.category}</td>
                                        <td className="p-4 text-center">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => openLabelModal(product)}
                                                className={product.custom_label ? 'text-green-600' : 'text-gray-400'}
                                            >
                                                {product.custom_label ? (
                                                    <>
                                                        <Check className="w-4 h-4 mr-1" />
                                                        Uploaded
                                                    </>
                                                ) : (
                                                    <>
                                                        <Upload className="w-4 h-4 mr-1" />
                                                        Upload
                                                    </>
                                                )}
                                            </Button>
                                        </td>
                                        <td className="p-4 text-right font-medium">{formatCurrency(product.wholesale_price_cents)}</td>
                                        <td className="p-4 text-right">
                                            {product.in_stock ? (
                                                <span className="text-green-600">{product.available_qty}</span>
                                            ) : (
                                                <span className="text-red-600">0</span>
                                            )}
                                        </td>
                                        <td className="p-4 text-right">
                                            {isImported(product.id) ? (
                                                <Button size="sm" variant="outline" disabled>
                                                    <Check className="w-4 h-4 mr-1" /> Imported
                                                </Button>
                                            ) : (
                                                <Button
                                                    size="sm"
                                                    onClick={() => handleImport(product.id)}
                                                    disabled={!product.in_stock}
                                                >
                                                    Import
                                                </Button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </CardContent>
                </Card>
            )}

            {filteredProducts.length === 0 && (
                <Card>
                    <CardContent className="p-12 text-center">
                        <Package className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                        <h3 className="font-semibold text-gray-900 dark:text-white mb-2">No products found</h3>
                        <p className="text-gray-500">Try adjusting your search or filter criteria</p>
                    </CardContent>
                </Card>
            )}

            {/* Label Upload Modal */}
            {labelModalOpen && selectedProduct && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <Card className="w-full max-w-lg">
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle className="flex items-center gap-2">
                                        <Tag className="w-5 h-5" />
                                        Custom Product Label
                                    </CardTitle>
                                    <CardDescription>
                                        {selectedProduct.name} ({selectedProduct.sku})
                                    </CardDescription>
                                </div>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => {
                                        setLabelModalOpen(false);
                                        setSelectedProduct(null);
                                        setLabelPreview(null);
                                    }}
                                >
                                    <X className="w-4 h-4" />
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {/* Label specs */}
                            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                                <p className="text-sm font-medium text-blue-900 dark:text-blue-100">Label Specifications</p>
                                <p className="text-sm text-blue-700 dark:text-blue-300">
                                    Size: <strong>2" × 0.75"</strong> (recommended: 600 × 225 pixels at 300 DPI)
                                </p>
                            </div>

                            {/* Preview area */}
                            <div
                                className="border-2 border-dashed rounded-lg p-4 text-center cursor-pointer hover:border-violet-400 transition-colors"
                                onClick={() => fileInputRef.current?.click()}
                                style={{ aspectRatio: `${LABEL_ASPECT_RATIO}` }}
                            >
                                {labelPreview ? (
                                    <div className="relative w-full h-full">
                                        <img
                                            src={labelPreview}
                                            alt="Label preview"
                                            className="w-full h-full object-contain rounded"
                                        />
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleRemoveLabel();
                                            }}
                                            className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center justify-center h-full text-gray-400">
                                        <ImageIcon className="w-12 h-12 mb-2" />
                                        <p className="text-sm font-medium">Click to upload label</p>
                                        <p className="text-xs">PNG, JPG up to 5MB</p>
                                    </div>
                                )}
                            </div>

                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                onChange={handleFileSelect}
                                className="hidden"
                            />

                            {/* Actions */}
                            <div className="flex gap-3 pt-2">
                                <Button
                                    onClick={() => fileInputRef.current?.click()}
                                    variant="outline"
                                    className="flex-1"
                                >
                                    <Upload className="w-4 h-4 mr-2" />
                                    {labelPreview ? 'Replace' : 'Choose File'}
                                </Button>
                                {labelPreview && (
                                    <Button
                                        onClick={handleSaveLabel}
                                        disabled={isUploading}
                                        className="flex-1 bg-violet-600 hover:bg-violet-700"
                                    >
                                        {isUploading ? (
                                            <>
                                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                                Saving...
                                            </>
                                        ) : (
                                            <>
                                                <Check className="w-4 h-4 mr-2" />
                                                Save Label
                                            </>
                                        )}
                                    </Button>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* 3rd Party Testing Confirmation Modal */}
            {testingModalOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
                    <Card className="w-full max-w-2xl my-8">
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <CardTitle className="flex items-center gap-2">
                                    <FlaskConical className="w-5 h-5 text-purple-600" />
                                    3rd Party Testing
                                </CardTitle>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => {
                                        setTestingModalOpen(false);
                                        setTestingStep(1);
                                    }}
                                >
                                    <X className="w-4 h-4" />
                                </Button>
                            </div>
                            <CardDescription>
                                Step {testingStep} of 5
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {/* Step 1: Label Warning */}
                            {testingStep === 1 && (
                                <div className="space-y-4">
                                    <div className="flex items-start gap-3 p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200">
                                        <AlertTriangle className="w-6 h-6 text-amber-600 shrink-0 mt-0.5" />
                                        <div>
                                            <h4 className="font-semibold text-amber-900 dark:text-amber-100">
                                                Important: Label Confirmation
                                            </h4>
                                            <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                                                Products will ship with the current uploaded labels.
                                                <strong> This action cannot be undone.</strong>
                                                Are you sure you want to proceed?
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex gap-3">
                                        <Button
                                            variant="outline"
                                            className="flex-1"
                                            onClick={() => {
                                                setTestingModalOpen(false);
                                                setTestingStep(1);
                                            }}
                                        >
                                            No, Cancel
                                        </Button>
                                        <Button
                                            className="flex-1 bg-purple-600 hover:bg-purple-700"
                                            onClick={() => setTestingStep(2)}
                                        >
                                            Yes, Continue
                                            <ArrowRight className="w-4 h-4 ml-2" />
                                        </Button>
                                    </div>
                                </div>
                            )}

                            {/* Step 2: Per-Product Addon Selection */}
                            {testingStep === 2 && (
                                <div className="space-y-4">
                                    <div className="flex items-start gap-3 p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200">
                                        <FlaskConical className="w-6 h-6 text-purple-600 shrink-0 mt-0.5" />
                                        <div>
                                            <h4 className="font-semibold text-purple-900 dark:text-purple-100">
                                                Select Tests Per Product
                                            </h4>
                                            <p className="text-sm text-purple-700 dark:text-purple-300 mt-1">
                                                Choose which tests to run on each product. Additional quantities are automatically added for testing.
                                            </p>
                                        </div>
                                    </div>

                                    <div className="space-y-4 max-h-96 overflow-y-auto pr-1">
                                        {products.filter(p => selectedForTesting.has(p.id)).map(product => {
                                            const addons = testingAddons[product.id] || { conformity: false, sterility: false, endotoxins: false, net_content: false, purity: false };
                                            const calc = calculateItemCost(product, addons);
                                            return (
                                                <div key={product.id} className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border">
                                                    <div className="flex justify-between items-start mb-3">
                                                        <div>
                                                            <p className="font-medium text-gray-900 dark:text-white">{product.name}</p>
                                                            <p className="text-xs text-gray-500">{product.sku} &middot; {formatCurrency(product.wholesale_price_cents)}/unit &middot; Qty: {calc.totalQty}</p>
                                                        </div>
                                                        <span className="text-sm font-semibold text-purple-600">
                                                            {formatCurrency(calc.productCost + calc.testingFee)}
                                                        </span>
                                                    </div>
                                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                                        {[
                                                            { key: 'conformity', label: 'Conformity', desc: '+2 qty, +$50', fee: '$50' },
                                                            { key: 'sterility', label: 'Sterility', desc: '+1 qty, +$250', fee: '$250' },
                                                            { key: 'endotoxins', label: 'Endotoxins', desc: '+1 qty, +$250', fee: '$250' },
                                                            { key: 'net_content', label: 'Net Content', desc: 'No extra cost', fee: '' },
                                                            { key: 'purity', label: 'Purity', desc: 'No extra cost', fee: '' },
                                                        ].map(addon => (
                                                            <button
                                                                key={addon.key}
                                                                onClick={() => toggleAddon(product.id, addon.key)}
                                                                className={cn(
                                                                    'p-2 rounded-lg border text-left transition-all text-xs',
                                                                    addons[addon.key as keyof typeof addons]
                                                                        ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/30 ring-1 ring-purple-500'
                                                                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                                                                )}
                                                            >
                                                                <div className="flex items-center gap-1.5">
                                                                    <div className={cn(
                                                                        'w-3.5 h-3.5 rounded border flex items-center justify-center',
                                                                        addons[addon.key as keyof typeof addons]
                                                                            ? 'bg-purple-600 border-purple-600'
                                                                            : 'border-gray-300'
                                                                    )}>
                                                                        {addons[addon.key as keyof typeof addons] && (
                                                                            <Check className="w-2.5 h-2.5 text-white" />
                                                                        )}
                                                                    </div>
                                                                    <span className="font-medium text-gray-900 dark:text-white">{addon.label}</span>
                                                                </div>
                                                                <p className="text-gray-500 mt-0.5 pl-5">{addon.desc}</p>
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>

                                    <div className="flex gap-3">
                                        <Button variant="outline" className="flex-1" onClick={() => setTestingStep(1)}>
                                            <ArrowLeft className="w-4 h-4 mr-2" />
                                            Back
                                        </Button>
                                        <Button className="flex-1 bg-purple-600 hover:bg-purple-700" onClick={() => setTestingStep(3)}>
                                            Continue
                                            <ArrowRight className="w-4 h-4 ml-2" />
                                        </Button>
                                    </div>
                                </div>
                            )}

                            {/* Step 3: Lab Selection */}
                            {testingStep === 3 && (
                                <div className="space-y-4">
                                    <div className="flex items-start gap-3 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200">
                                        <Building className="w-6 h-6 text-blue-600 shrink-0 mt-0.5" />
                                        <div>
                                            <h4 className="font-semibold text-blue-900 dark:text-blue-100">
                                                Laboratory Selection
                                            </h4>
                                            <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                                                Select the testing laboratory for your products.
                                            </p>
                                        </div>
                                    </div>

                                    {testingLabs.length > 0 ? (
                                        <div className="space-y-2">
                                            {testingLabs.map(lab => (
                                                <button
                                                    key={lab.id}
                                                    onClick={() => setSelectedLabId(lab.id)}
                                                    className={cn(
                                                        'w-full p-3 rounded-lg border text-left transition-all',
                                                        selectedLabId === lab.id
                                                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 ring-1 ring-blue-500'
                                                            : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                                                    )}
                                                >
                                                    <div className="flex items-center gap-2">
                                                        <div className={cn(
                                                            'w-4 h-4 rounded-full border-2 flex items-center justify-center',
                                                            selectedLabId === lab.id ? 'border-blue-600' : 'border-gray-300'
                                                        )}>
                                                            {selectedLabId === lab.id && (
                                                                <div className="w-2 h-2 rounded-full bg-blue-600" />
                                                            )}
                                                        </div>
                                                        <span className="font-medium text-gray-900 dark:text-white">{lab.name}</span>
                                                        {lab.is_default && (
                                                            <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">Default</span>
                                                        )}
                                                    </div>
                                                    <p className="text-xs text-gray-500 mt-1 pl-6">{lab.email}</p>
                                                </button>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-sm text-gray-500 italic">No testing labs configured. Contact your administrator.</p>
                                    )}

                                    <div className="flex gap-3">
                                        <Button variant="outline" className="flex-1" onClick={() => setTestingStep(2)}>
                                            <ArrowLeft className="w-4 h-4 mr-2" />
                                            Back
                                        </Button>
                                        <Button
                                            className="flex-1 bg-purple-600 hover:bg-purple-700"
                                            onClick={() => setTestingStep(4)}
                                            disabled={!selectedLabId}
                                        >
                                            Continue
                                            <ArrowRight className="w-4 h-4 ml-2" />
                                        </Button>
                                    </div>
                                </div>
                            )}

                            {/* Step 4: Billing Confirmation */}
                            {testingStep === 4 && (
                                <div className="space-y-4">
                                    <div className="flex items-start gap-3 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200">
                                        <CreditCard className="w-6 h-6 text-green-600 shrink-0 mt-0.5" />
                                        <div>
                                            <h4 className="font-semibold text-green-900 dark:text-green-100">
                                                Automatic Billing
                                            </h4>
                                            <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                                                Testing fees are based on your addon selections per product.
                                                Conformity is <strong>+$50</strong>, Sterility is <strong>+$250</strong>,
                                                Endotoxins is <strong>+$250</strong>, plus product costs (adjusted for extra qty)
                                                and <strong>$50 overnight shipping</strong>. This will be charged to your wallet.
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex gap-3">
                                        <Button variant="outline" className="flex-1" onClick={() => setTestingStep(3)}>
                                            <ArrowLeft className="w-4 h-4 mr-2" />
                                            Back
                                        </Button>
                                        <Button className="flex-1 bg-purple-600 hover:bg-purple-700" onClick={() => setTestingStep(5)}>
                                            Yes, Continue
                                            <ArrowRight className="w-4 h-4 ml-2" />
                                        </Button>
                                    </div>
                                </div>
                            )}

                            {/* Step 5: Cost Summary & Final Confirmation */}
                            {testingStep === 5 && (() => {
                                const costs = calculateTestingCosts();
                                return (
                                    <div className="space-y-4">
                                        <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg space-y-3">
                                            <h4 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                                                <DollarSign className="w-5 h-5 text-green-600" />
                                                Cost Summary
                                            </h4>

                                            {/* Per-product breakdown */}
                                            <div className="text-sm space-y-3">
                                                {costs.itemDetails.map(({ product, totalQty, productCost, testingFee, addons }) => (
                                                    <div key={product.id} className="border-b border-gray-200 dark:border-gray-700 pb-2">
                                                        <div className="flex justify-between font-medium text-gray-700 dark:text-gray-300">
                                                            <span>{product.name} (x{totalQty})</span>
                                                            <span>{formatCurrency(productCost + testingFee)}</span>
                                                        </div>
                                                        <div className="text-xs text-gray-500 pl-2 space-y-0.5 mt-1">
                                                            <div className="flex justify-between">
                                                                <span>Product cost ({totalQty} x {formatCurrency(product.wholesale_price_cents)})</span>
                                                                <span>{formatCurrency(productCost)}</span>
                                                            </div>
                                                            {addons && Object.entries(addons).filter(([, v]) => v).map(([key]) => (
                                                                <div key={key} className="flex justify-between text-purple-600">
                                                                    <span className="capitalize">{key.replace('_', ' ')} test{ADDON_EXTRA_QTY[key] > 0 ? ` (+${ADDON_EXTRA_QTY[key]} qty)` : ''}</span>
                                                                    <span>{ADDON_FEE_CENTS[key] > 0 ? formatCurrency(ADDON_FEE_CENTS[key]) : 'Included'}</span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>

                                            <div className="space-y-2 text-sm">
                                                <div className="flex justify-between">
                                                    <span className="text-gray-600 dark:text-gray-400">Product Costs (all items)</span>
                                                    <span className="font-medium">{formatCurrency(costs.productCostCents)}</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-gray-600 dark:text-gray-400">Testing Fees</span>
                                                    <span className="font-medium">{formatCurrency(costs.testingFeeCents)}</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-gray-600 dark:text-gray-400">Overnight Shipping</span>
                                                    <span className="font-medium">{formatCurrency(costs.shippingCents)}</span>
                                                </div>
                                            </div>

                                            <hr className="border-gray-200 dark:border-gray-700" />

                                            <div className="flex justify-between text-lg font-bold">
                                                <span className="text-gray-900 dark:text-white">Total</span>
                                                <span className="text-purple-600">{formatCurrency(costs.totalCents)}</span>
                                            </div>
                                        </div>

                                        <div className="flex gap-3">
                                            <Button
                                                variant="outline"
                                                className="flex-1"
                                                onClick={() => setTestingStep(4)}
                                                disabled={isProcessingTesting}
                                            >
                                                <ArrowLeft className="w-4 h-4 mr-2" />
                                                Back
                                            </Button>
                                            <Button
                                                className="flex-1 bg-purple-600 hover:bg-purple-700"
                                                onClick={processTestingOrder}
                                                disabled={isProcessingTesting}
                                            >
                                                {isProcessingTesting ? (
                                                    <>
                                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                                        Processing...
                                                    </>
                                                ) : (
                                                    <>
                                                        <CheckCircle className="w-4 h-4 mr-2" />
                                                        Confirm & Pay
                                                    </>
                                                )}
                                            </Button>
                                        </div>
                                    </div>
                                );
                            })()}
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    );
}

