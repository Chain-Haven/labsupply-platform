'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Book, Code, Copy, ExternalLink, Key, Package, Shield, ShoppingCart, Truck, Users, Wallet } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

export default function ApiDocsPage() {
    const copyCode = (code: string) => {
        navigator.clipboard.writeText(code);
        toast({ title: 'Copied!', description: 'Code copied to clipboard' });
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">API Documentation</h1>
                <p className="text-gray-500">Complete reference for the LabSupply REST API</p>
            </div>

            {/* Quick Start */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Code className="w-5 h-5" />
                        Quick Start
                    </CardTitle>
                    <CardDescription>Get started with the LabSupply API</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div>
                        <h4 className="font-medium mb-2">Base URL</h4>
                        <div className="flex items-center gap-2">
                            <code className="flex-1 p-3 bg-gray-100 dark:bg-gray-800 rounded-lg font-mono text-sm">
                                https://api.labsupply.io/v1
                            </code>
                            <Button variant="outline" size="sm" onClick={() => copyCode('https://api.labsupply.io/v1')}>
                                <Copy className="w-4 h-4" />
                            </Button>
                        </div>
                    </div>
                    <div>
                        <h4 className="font-medium mb-2">Authentication</h4>
                        <p className="text-sm text-gray-500 mb-2">
                            All requests require an API key in the Authorization header:
                        </p>
                        <div className="flex items-center gap-2">
                            <code className="flex-1 p-3 bg-gray-100 dark:bg-gray-800 rounded-lg font-mono text-sm overflow-x-auto">
                                Authorization: Bearer lsk_your_api_key_here
                            </code>
                            <Button variant="outline" size="sm" onClick={() => copyCode('Authorization: Bearer lsk_your_api_key_here')}>
                                <Copy className="w-4 h-4" />
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Endpoints */}
            <div className="grid gap-4 md:grid-cols-2">
                {/* Inventory Endpoints */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-lg">
                            <Package className="w-5 h-5 text-violet-600" />
                            Inventory
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-800">
                            <div className="flex items-center gap-2 mb-1">
                                <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-medium rounded">GET</span>
                                <code className="text-sm font-mono">/inventory</code>
                            </div>
                            <p className="text-xs text-gray-500">List all products with stock levels</p>
                        </div>
                        <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-800">
                            <div className="flex items-center gap-2 mb-1">
                                <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-medium rounded">GET</span>
                                <code className="text-sm font-mono">/inventory/:sku</code>
                            </div>
                            <p className="text-xs text-gray-500">Get product by SKU</p>
                        </div>
                        <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-800">
                            <div className="flex items-center gap-2 mb-1">
                                <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-medium rounded">PUT</span>
                                <code className="text-sm font-mono">/inventory/:sku</code>
                            </div>
                            <p className="text-xs text-gray-500">Update product stock or pricing</p>
                        </div>
                        <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-800">
                            <div className="flex items-center gap-2 mb-1">
                                <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 text-xs font-medium rounded">POST</span>
                                <code className="text-sm font-mono">/inventory/bulk</code>
                            </div>
                            <p className="text-xs text-gray-500">Bulk update stock levels</p>
                        </div>
                    </CardContent>
                </Card>

                {/* Orders Endpoints */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-lg">
                            <ShoppingCart className="w-5 h-5 text-blue-600" />
                            Orders
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-800">
                            <div className="flex items-center gap-2 mb-1">
                                <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-medium rounded">GET</span>
                                <code className="text-sm font-mono">/orders</code>
                            </div>
                            <p className="text-xs text-gray-500">List all orders with pagination</p>
                        </div>
                        <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-800">
                            <div className="flex items-center gap-2 mb-1">
                                <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-medium rounded">GET</span>
                                <code className="text-sm font-mono">/orders/:id</code>
                            </div>
                            <p className="text-xs text-gray-500">Get order details</p>
                        </div>
                        <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-800">
                            <div className="flex items-center gap-2 mb-1">
                                <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 text-xs font-medium rounded">POST</span>
                                <code className="text-sm font-mono">/orders</code>
                            </div>
                            <p className="text-xs text-gray-500">Create new order</p>
                        </div>
                        <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-800">
                            <div className="flex items-center gap-2 mb-1">
                                <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs font-medium rounded">POST</span>
                                <code className="text-sm font-mono">/orders/:id/cancel</code>
                            </div>
                            <p className="text-xs text-gray-500">Cancel an order</p>
                        </div>
                    </CardContent>
                </Card>

                {/* Merchants Endpoints */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-lg">
                            <Users className="w-5 h-5 text-green-600" />
                            Merchants
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-800">
                            <div className="flex items-center gap-2 mb-1">
                                <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-medium rounded">GET</span>
                                <code className="text-sm font-mono">/merchants</code>
                            </div>
                            <p className="text-xs text-gray-500">List all merchants</p>
                        </div>
                        <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-800">
                            <div className="flex items-center gap-2 mb-1">
                                <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-medium rounded">GET</span>
                                <code className="text-sm font-mono">/merchants/:id</code>
                            </div>
                            <p className="text-xs text-gray-500">Get merchant details</p>
                        </div>
                        <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-800">
                            <div className="flex items-center gap-2 mb-1">
                                <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-medium rounded">PUT</span>
                                <code className="text-sm font-mono">/merchants/:id/kyb</code>
                            </div>
                            <p className="text-xs text-gray-500">Update KYB status</p>
                        </div>
                    </CardContent>
                </Card>

                {/* Wallet Endpoints */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-lg">
                            <Wallet className="w-5 h-5 text-orange-600" />
                            Wallet
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-800">
                            <div className="flex items-center gap-2 mb-1">
                                <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-medium rounded">GET</span>
                                <code className="text-sm font-mono">/wallet</code>
                            </div>
                            <p className="text-xs text-gray-500">Get wallet balance</p>
                        </div>
                        <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-800">
                            <div className="flex items-center gap-2 mb-1">
                                <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 text-xs font-medium rounded">POST</span>
                                <code className="text-sm font-mono">/wallet/topup</code>
                            </div>
                            <p className="text-xs text-gray-500">Initiate wallet top-up</p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Example Request */}
            <Card>
                <CardHeader>
                    <CardTitle>Example Request</CardTitle>
                    <CardDescription>Sample cURL request to list inventory</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="relative">
                        <pre className="p-4 bg-gray-900 text-gray-100 rounded-lg overflow-x-auto text-sm font-mono">
                            {`curl -X GET "https://api.labsupply.io/v1/inventory" \\
  -H "Authorization: Bearer lsk_your_api_key_here" \\
  -H "Content-Type: application/json"`}
                        </pre>
                        <Button
                            size="sm"
                            variant="outline"
                            className="absolute top-2 right-2"
                            onClick={() => copyCode(`curl -X GET "https://api.labsupply.io/v1/inventory" -H "Authorization: Bearer lsk_your_api_key_here" -H "Content-Type: application/json"`)}
                        >
                            <Copy className="w-4 h-4" />
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Response Codes */}
            <Card>
                <CardHeader>
                    <CardTitle>Response Codes</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid gap-2 md:grid-cols-2">
                        <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-800">
                            <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-bold rounded">200</span>
                            <span className="text-sm">Success</span>
                        </div>
                        <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-800">
                            <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-bold rounded">201</span>
                            <span className="text-sm">Created</span>
                        </div>
                        <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-800">
                            <span className="px-2 py-1 bg-yellow-100 text-yellow-700 text-xs font-bold rounded">400</span>
                            <span className="text-sm">Bad Request</span>
                        </div>
                        <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-800">
                            <span className="px-2 py-1 bg-red-100 text-red-700 text-xs font-bold rounded">401</span>
                            <span className="text-sm">Unauthorized</span>
                        </div>
                        <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-800">
                            <span className="px-2 py-1 bg-red-100 text-red-700 text-xs font-bold rounded">403</span>
                            <span className="text-sm">Forbidden</span>
                        </div>
                        <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-800">
                            <span className="px-2 py-1 bg-red-100 text-red-700 text-xs font-bold rounded">404</span>
                            <span className="text-sm">Not Found</span>
                        </div>
                        <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-800">
                            <span className="px-2 py-1 bg-red-100 text-red-700 text-xs font-bold rounded">429</span>
                            <span className="text-sm">Rate Limited</span>
                        </div>
                        <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-800">
                            <span className="px-2 py-1 bg-red-100 text-red-700 text-xs font-bold rounded">500</span>
                            <span className="text-sm">Server Error</span>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
