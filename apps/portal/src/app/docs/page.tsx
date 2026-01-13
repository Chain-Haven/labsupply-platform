'use client';

import Link from 'next/link';
import { ArrowLeft, Book, Code, Package, Shield, Zap, CreditCard, ExternalLink, ArrowRight } from 'lucide-react';

export default function DocsPage() {
    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
            {/* Navigation */}
            <nav className="fixed top-0 left-0 right-0 z-50 glass border-b border-white/10">
                <div className="container mx-auto px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link href="/" className="flex items-center gap-2 text-white/70 hover:text-white transition-colors">
                            <ArrowLeft className="w-5 h-5" />
                            Back to Home
                        </Link>
                    </div>
                    <div className="flex items-center gap-4">
                        <Link
                            href="/login"
                            className="text-white/70 hover:text-white transition-colors"
                        >
                            Sign In
                        </Link>
                        <Link
                            href="/register"
                            className="px-4 py-2 rounded-lg bg-white text-slate-900 font-medium hover:bg-white/90 transition-colors"
                        >
                            Get Started
                        </Link>
                    </div>
                </div>
            </nav>

            {/* Header */}
            <section className="pt-32 pb-12 px-6">
                <div className="container mx-auto">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center">
                            <Book className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h1 className="text-4xl font-bold text-white">Documentation</h1>
                            <p className="text-white/60">Learn how to integrate with LabSupply</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Quick Start */}
            <section className="py-12 px-6">
                <div className="container mx-auto">
                    <div className="rounded-2xl bg-white/5 border border-white/10 p-8 mb-8">
                        <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
                            <Zap className="w-6 h-6 text-violet-400" />
                            Quick Start
                        </h2>
                        <div className="grid md:grid-cols-3 gap-6">
                            <div className="p-6 rounded-xl bg-white/5 border border-white/10">
                                <div className="text-3xl font-bold text-violet-400 mb-2">1</div>
                                <h3 className="text-lg font-semibold text-white mb-2">Create Account</h3>
                                <p className="text-white/60 text-sm">
                                    Register as a merchant and complete your business verification (KYB).
                                </p>
                            </div>
                            <div className="p-6 rounded-xl bg-white/5 border border-white/10">
                                <div className="text-3xl font-bold text-violet-400 mb-2">2</div>
                                <h3 className="text-lg font-semibold text-white mb-2">Connect Store</h3>
                                <p className="text-white/60 text-sm">
                                    Install our WooCommerce plugin and connect your store with your API key.
                                </p>
                            </div>
                            <div className="p-6 rounded-xl bg-white/5 border border-white/10">
                                <div className="text-3xl font-bold text-violet-400 mb-2">3</div>
                                <h3 className="text-lg font-semibold text-white mb-2">Start Selling</h3>
                                <p className="text-white/60 text-sm">
                                    Import products, fund your wallet, and orders will auto-fulfill.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Features Overview */}
            <section className="py-12 px-6">
                <div className="container mx-auto">
                    <h2 className="text-2xl font-bold text-white mb-6">Platform Features</h2>
                    <div className="grid md:grid-cols-2 gap-6">
                        {[
                            {
                                icon: Package,
                                title: 'Product Catalog',
                                description: 'Access our curated catalog of research compounds. Each product includes COA documentation, suggested retail pricing, and compliance information.'
                            },
                            {
                                icon: Code,
                                title: 'WooCommerce Integration',
                                description: 'Our WordPress plugin syncs products directly to your store. Orders automatically flow back to our fulfillment center.'
                            },
                            {
                                icon: CreditCard,
                                title: 'Prepay Wallet',
                                description: 'Fund your wallet via crypto or wire transfer. Orders auto-debit as they ship with full transaction history.'
                            },
                            {
                                icon: Shield,
                                title: 'Compliance Built-In',
                                description: 'Research-only disclaimers, age verification, and region restrictions are automatically included on all orders.'
                            }
                        ].map((feature, index) => (
                            <div key={index} className="p-6 rounded-xl bg-white/5 border border-white/10">
                                <div className="flex items-start gap-4">
                                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-violet-500/20 to-indigo-600/20 flex items-center justify-center flex-shrink-0">
                                        <feature.icon className="w-5 h-5 text-violet-400" />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-semibold text-white mb-2">{feature.title}</h3>
                                        <p className="text-white/60 text-sm">{feature.description}</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* API Section */}
            <section className="py-12 px-6">
                <div className="container mx-auto">
                    <div className="rounded-2xl bg-gradient-to-r from-violet-600/20 to-indigo-600/20 border border-white/10 p-8">
                        <div className="flex items-center gap-3 mb-4">
                            <Code className="w-8 h-8 text-violet-400" />
                            <h2 className="text-2xl font-bold text-white">REST API</h2>
                        </div>
                        <p className="text-white/60 mb-6">
                            Full API access is available for merchants after approval. Manage products, orders,
                            and wallet transactions programmatically.
                        </p>
                        <div className="bg-slate-900/50 rounded-xl p-4 mb-6 font-mono text-sm overflow-x-auto">
                            <div className="text-white/40 mb-2"># Example: Get Catalog</div>
                            <div className="text-green-400">
                                curl -H "Authorization: Bearer YOUR_API_KEY" \
                            </div>
                            <div className="text-green-400 pl-4">
                                https://api.labsupply.co/v1/catalog
                            </div>
                        </div>
                        <p className="text-white/50 text-sm">
                            Full API documentation is available in your merchant dashboard after registration.
                        </p>
                    </div>
                </div>
            </section>

            {/* CTA */}
            <section className="py-12 px-6">
                <div className="container mx-auto text-center">
                    <h2 className="text-2xl font-bold text-white mb-4">Ready to Get Started?</h2>
                    <p className="text-white/60 mb-6">Create your merchant account to access the full documentation and API.</p>
                    <Link
                        href="/register"
                        className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-semibold text-lg hover:opacity-90 transition-opacity"
                    >
                        Create Merchant Account
                        <ArrowRight className="w-5 h-5" />
                    </Link>
                </div>
            </section>

            {/* Footer */}
            <footer className="py-8 px-6 border-t border-white/10 mt-12">
                <div className="container mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                        <Package className="w-5 h-5 text-white/60" />
                        <span className="text-white/60">© 2024 LabSupply. All rights reserved.</span>
                    </div>
                    <div className="flex items-center gap-6 text-white/60 text-sm">
                        <Link href="/terms" className="hover:text-white transition-colors">Terms</Link>
                        <Link href="/privacy" className="hover:text-white transition-colors">Privacy</Link>
                        <Link href="/docs" className="hover:text-white transition-colors">Docs</Link>
                    </div>
                </div>
            </footer>
        </div>
    );
}
