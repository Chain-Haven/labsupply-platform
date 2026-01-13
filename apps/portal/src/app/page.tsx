import Link from 'next/link';
import { ArrowRight, Shield, Zap, Package, CreditCard } from 'lucide-react';

export default function HomePage() {
    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
            {/* Navigation */}
            <nav className="fixed top-0 left-0 right-0 z-50 glass border-b border-white/10">
                <div className="container mx-auto px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center">
                            <Package className="w-5 h-5 text-white" />
                        </div>
                        <span className="text-xl font-bold text-white">LabSupply</span>
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

            {/* Hero Section */}
            <section className="pt-32 pb-20 px-6">
                <div className="container mx-auto text-center">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 text-white/80 text-sm mb-6">
                        <Shield className="w-4 h-4" />
                        <span>Research-Grade Peptides & Compounds</span>
                    </div>

                    <h1 className="text-5xl md:text-7xl font-bold text-white mb-6 leading-tight">
                        Supplier Integration
                        <br />
                        <span className="gradient-text">Made Simple</span>
                    </h1>

                    <p className="text-xl text-white/60 max-w-2xl mx-auto mb-10">
                        Connect your WooCommerce store to our fulfillment platform.
                        Access verified research compounds with transparent pricing,
                        automated order sync, and real-time tracking.
                    </p>

                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                        <Link
                            href="/register"
                            className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-semibold text-lg hover:opacity-90 transition-opacity"
                        >
                            Start Selling Today
                            <ArrowRight className="w-5 h-5" />
                        </Link>
                        <Link
                            href="/docs"
                            className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-white/10 text-white font-semibold text-lg hover:bg-white/20 transition-colors"
                        >
                            View Documentation
                        </Link>
                    </div>
                </div>
            </section>

            {/* Features Grid */}
            <section className="py-20 px-6">
                <div className="container mx-auto">
                    <h2 className="text-3xl font-bold text-white text-center mb-12">
                        Everything You Need
                    </h2>

                    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {[
                            {
                                icon: Package,
                                title: 'Curated Catalog',
                                description: 'Access our verified research compounds with COAs and compliance documentation.',
                            },
                            {
                                icon: Zap,
                                title: 'Instant Sync',
                                description: 'Orders automatically flow to our fulfillment center. No manual entry required.',
                            },
                            {
                                icon: CreditCard,
                                title: 'Prepay Wallet',
                                description: 'Fund your wallet once. Orders auto-debit as they ship. Full transparency.',
                            },
                            {
                                icon: Shield,
                                title: 'Compliance Built-In',
                                description: 'Research-only disclaimers, age verification, and region restrictions included.',
                            },
                        ].map((feature, index) => (
                            <div
                                key={index}
                                className="p-6 rounded-2xl bg-white/5 border border-white/10 hover:border-white/20 transition-colors"
                            >
                                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500/20 to-indigo-600/20 flex items-center justify-center mb-4">
                                    <feature.icon className="w-6 h-6 text-violet-400" />
                                </div>
                                <h3 className="text-lg font-semibold text-white mb-2">
                                    {feature.title}
                                </h3>
                                <p className="text-white/60">
                                    {feature.description}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="py-20 px-6">
                <div className="container mx-auto">
                    <div className="rounded-3xl bg-gradient-to-r from-violet-600/20 to-indigo-600/20 border border-white/10 p-12 text-center">
                        <h2 className="text-3xl font-bold text-white mb-4">
                            Ready to Get Started?
                        </h2>
                        <p className="text-white/60 mb-8 max-w-xl mx-auto">
                            Join our network of research resellers. Connect your store in minutes
                            and start fulfilling orders today.
                        </p>
                        <Link
                            href="/register"
                            className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-white text-slate-900 font-semibold text-lg hover:bg-white/90 transition-colors"
                        >
                            Create Merchant Account
                            <ArrowRight className="w-5 h-5" />
                        </Link>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="py-8 px-6 border-t border-white/10">
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
