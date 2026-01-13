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

// Mock catalog data
const initialProducts: Product[] = [
    {
        id: '1',
        sku: 'BPC-157-5MG',
        name: 'BPC-157 5mg',
        description: 'Body Protective Compound, lyophilized peptide for research use.',
        category: 'Peptides',
        wholesale_price_cents: 2500,
        map_price_cents: 4999,
        in_stock: true,
        available_qty: 142,
        image: null,
        requires_coa: true,
        custom_label: null,
    },
    {
        id: '2',
        sku: 'TB-500-5MG',
        name: 'TB-500 (Thymosin Beta-4) 5mg',
        description: 'Thymosin Beta-4 fragment, lyophilized peptide for research.',
        category: 'Peptides',
        wholesale_price_cents: 3200,
        map_price_cents: 5999,
        in_stock: true,
        available_qty: 89,
        image: null,
        requires_coa: true,
        custom_label: null,
    },
    {
        id: '3',
        sku: 'GHK-CU-50MG',
        name: 'GHK-Cu (Copper Peptide) 50mg',
        description: 'Copper tripeptide complex, lyophilized for research applications.',
        category: 'Peptides',
        wholesale_price_cents: 4500,
        map_price_cents: 7999,
        in_stock: true,
        available_qty: 56,
        image: null,
        requires_coa: true,
        custom_label: null,
    },
    {
        id: '4',
        sku: 'PT-141-10MG',
        name: 'PT-141 (Bremelanotide) 10mg',
        description: 'Melanocortin receptor agonist peptide for research.',
        category: 'Peptides',
        wholesale_price_cents: 5500,
        map_price_cents: 9999,
        in_stock: false,
        available_qty: 0,
        image: null,
        requires_coa: true,
        custom_label: null,
    },
    {
        id: '5',
        sku: 'NAD-500MG',
        name: 'NAD+ 500mg',
        description: 'Nicotinamide adenine dinucleotide, research grade compound.',
        category: 'Compounds',
        wholesale_price_cents: 8900,
        map_price_cents: 14999,
        in_stock: true,
        available_qty: 34,
        image: null,
        requires_coa: false,
        custom_label: null,
    },
    {
        id: '6',
        sku: 'SEMA-3MG',
        name: 'Semaglutide 3mg',
        description: 'GLP-1 receptor agonist peptide for research applications.',
        category: 'Peptides',
        wholesale_price_cents: 12500,
        map_price_cents: 19999,
        in_stock: true,
        available_qty: 23,
        image: null,
        requires_coa: true,
        custom_label: null,
    },
];

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
    const TESTING_FEE_CENTS = 30000; // $300 per product
    const SHIPPING_FEE_CENTS = 5000; // $50 overnight shipping

    const [testingMode, setTestingMode] = useState(false);
    const [selectedForTesting, setSelectedForTesting] = useState<Set<string>>(new Set());
    const [testingModalOpen, setTestingModalOpen] = useState(false);
    const [testingStep, setTestingStep] = useState(1); // 1-4 for confirmation steps
    const [isProcessingTesting, setIsProcessingTesting] = useState(false);

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

    // Calculate testing costs
    const calculateTestingCosts = () => {
        const selectedProducts = products.filter(p => selectedForTesting.has(p.id));
        const productCostCents = selectedProducts.reduce((sum, p) => sum + p.wholesale_price_cents, 0);
        const testingFeeCents = selectedProducts.length * TESTING_FEE_CENTS;
        const totalCents = productCostCents + testingFeeCents + SHIPPING_FEE_CENTS;

        return {
            productCount: selectedProducts.length,
            productCostCents,
            testingFeeCents,
            shippingCents: SHIPPING_FEE_CENTS,
            totalCents,
            products: selectedProducts,
        };
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
        setTestingStep(1);
        setTestingModalOpen(true);
    };

    // Cancel testing mode
    const cancelTestingMode = () => {
        setTestingMode(false);
        setSelectedForTesting(new Set());
    };

    // Process testing order
    const processTestingOrder = async () => {
        setIsProcessingTesting(true);

        const costs = calculateTestingCosts();

        // Simulate ChargX billing
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Simulate creating testing order
        await new Promise(resolve => setTimeout(resolve, 500));

        setIsProcessingTesting(false);
        setTestingModalOpen(false);
        setTestingMode(false);
        setSelectedForTesting(new Set());
        setTestingStep(1);

        toast({
            title: 'Testing order submitted!',
            description: `${costs.productCount} product(s) have been sent for 3rd party testing. Total charged: ${formatCurrency(costs.totalCents)}`,
        });
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
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <Card className="w-full max-w-lg">
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
                                Step {testingStep} of 4
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

                            {/* Step 2: Lab Selection */}
                            {testingStep === 2 && (
                                <div className="space-y-4">
                                    <div className="flex items-start gap-3 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200">
                                        <Building className="w-6 h-6 text-blue-600 shrink-0 mt-0.5" />
                                        <div>
                                            <h4 className="font-semibold text-blue-900 dark:text-blue-100">
                                                Laboratory Selection
                                            </h4>
                                            <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                                                We will send your products to the lab of our choice, typically
                                                <strong> Freedom Diagnostics</strong>.
                                                Are you okay with this?
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex gap-3">
                                        <Button
                                            variant="outline"
                                            className="flex-1"
                                            onClick={() => setTestingStep(1)}
                                        >
                                            <ArrowLeft className="w-4 h-4 mr-2" />
                                            Back
                                        </Button>
                                        <Button
                                            className="flex-1 bg-purple-600 hover:bg-purple-700"
                                            onClick={() => setTestingStep(3)}
                                        >
                                            Yes, Continue
                                            <ArrowRight className="w-4 h-4 ml-2" />
                                        </Button>
                                    </div>
                                </div>
                            )}

                            {/* Step 3: Billing Confirmation */}
                            {testingStep === 3 && (
                                <div className="space-y-4">
                                    <div className="flex items-start gap-3 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200">
                                        <CreditCard className="w-6 h-6 text-green-600 shrink-0 mt-0.5" />
                                        <div>
                                            <h4 className="font-semibold text-green-900 dark:text-green-100">
                                                Automatic Billing
                                            </h4>
                                            <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                                                We will bill you automatically <strong>$300 per test</strong> in
                                                addition to product costs + <strong>$50 shipping</strong> (overnight).
                                                Are you okay with this?
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex gap-3">
                                        <Button
                                            variant="outline"
                                            className="flex-1"
                                            onClick={() => setTestingStep(2)}
                                        >
                                            <ArrowLeft className="w-4 h-4 mr-2" />
                                            Back
                                        </Button>
                                        <Button
                                            className="flex-1 bg-purple-600 hover:bg-purple-700"
                                            onClick={() => setTestingStep(4)}
                                        >
                                            Yes, Continue
                                            <ArrowRight className="w-4 h-4 ml-2" />
                                        </Button>
                                    </div>
                                </div>
                            )}

                            {/* Step 4: Cost Summary & Final Confirmation */}
                            {testingStep === 4 && (
                                <div className="space-y-4">
                                    <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg space-y-3">
                                        <h4 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                                            <DollarSign className="w-5 h-5 text-green-600" />
                                            Cost Summary
                                        </h4>

                                        {/* Selected Products */}
                                        <div className="text-sm space-y-1">
                                            <p className="font-medium text-gray-700 dark:text-gray-300">
                                                Selected Products ({calculateTestingCosts().productCount}):
                                            </p>
                                            {calculateTestingCosts().products.map(p => (
                                                <div key={p.id} className="flex justify-between text-gray-600 dark:text-gray-400 pl-2">
                                                    <span>{p.name}</span>
                                                    <span>{formatCurrency(p.wholesale_price_cents)}</span>
                                                </div>
                                            ))}
                                        </div>

                                        <hr className="border-gray-200 dark:border-gray-700" />

                                        {/* Cost Breakdown */}
                                        <div className="space-y-2 text-sm">
                                            <div className="flex justify-between">
                                                <span className="text-gray-600 dark:text-gray-400">Product Costs</span>
                                                <span className="font-medium">{formatCurrency(calculateTestingCosts().productCostCents)}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-gray-600 dark:text-gray-400">
                                                    Testing Fees ({calculateTestingCosts().productCount} × $300)
                                                </span>
                                                <span className="font-medium">{formatCurrency(calculateTestingCosts().testingFeeCents)}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-gray-600 dark:text-gray-400">Overnight Shipping</span>
                                                <span className="font-medium">{formatCurrency(calculateTestingCosts().shippingCents)}</span>
                                            </div>
                                        </div>

                                        <hr className="border-gray-200 dark:border-gray-700" />

                                        {/* Total */}
                                        <div className="flex justify-between text-lg font-bold">
                                            <span className="text-gray-900 dark:text-white">Total</span>
                                            <span className="text-purple-600">{formatCurrency(calculateTestingCosts().totalCents)}</span>
                                        </div>
                                    </div>

                                    <div className="flex gap-3">
                                        <Button
                                            variant="outline"
                                            className="flex-1"
                                            onClick={() => setTestingStep(3)}
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
                            )}
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    );
}

