'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
    ArrowRight, Shield, Zap, Package, CreditCard, Truck, ChevronDown,
    Beaker, Tag, Palette, Box, BarChart3, Clock, Globe, CheckCircle,
    ShoppingCart, RefreshCw, DollarSign, PackageCheck, Send,
} from 'lucide-react';
import AuthErrorHandler from '@/components/AuthErrorHandler';

function FAQItem({ question, answer }: { question: string; answer: string }) {
    const [open, setOpen] = useState(false);
    return (
        <div className="border border-white/10 rounded-xl overflow-hidden">
            <button
                onClick={() => setOpen(!open)}
                className="w-full flex items-center justify-between p-5 text-left hover:bg-white/5 transition-colors"
            >
                <span className="text-white font-medium pr-4">{question}</span>
                <ChevronDown className={`w-5 h-5 text-white/60 flex-shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
            </button>
            {open && (
                <div className="px-5 pb-5 -mt-1">
                    <p className="text-white/60 leading-relaxed">{answer}</p>
                </div>
            )}
        </div>
    );
}

export default function HomePage() {
    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
            <AuthErrorHandler />

            {/* Navigation */}
            <nav className="fixed top-0 left-0 right-0 z-50 bg-slate-900/80 backdrop-blur-xl border-b border-white/15 shadow-lg shadow-black/10">
                <div className="container mx-auto px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-md shadow-violet-500/20">
                            <Package className="w-5 h-5 text-white" />
                        </div>
                        <span className="text-xl font-bold text-white tracking-tight">WhiteLabel Peptides</span>
                    </div>
                    <div className="hidden md:flex items-center gap-1">
                        {[
                            { href: '#products', label: 'Products' },
                            { href: '#how-it-works', label: 'How It Works' },
                            { href: '#fulfillment', label: 'Fulfillment' },
                            { href: '#billing', label: 'Billing' },
                            { href: '#faq', label: 'FAQ' },
                        ].map((link) => (
                            <a
                                key={link.href}
                                href={link.href}
                                className="px-3 py-1.5 rounded-md text-sm font-medium text-white/80 hover:text-white hover:bg-white/10 transition-all"
                            >
                                {link.label}
                            </a>
                        ))}
                    </div>
                    <div className="flex items-center gap-3">
                        <Link href="/login" className="px-4 py-2 rounded-lg text-sm font-medium text-white/90 hover:text-white hover:bg-white/10 transition-all">
                            Sign In
                        </Link>
                        <Link href="/register" className="px-5 py-2 rounded-lg bg-gradient-to-r from-violet-500 to-indigo-600 text-white text-sm font-semibold hover:from-violet-400 hover:to-indigo-500 transition-all shadow-md shadow-violet-500/25">
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
                        White-Label Fulfillment
                        <br />
                        <span className="gradient-text">For Your Brand</span>
                    </h1>

                    <p className="text-xl text-white/60 max-w-3xl mx-auto mb-10">
                        We handle everything from sourcing to shipping &mdash; under your brand.
                        Connect your WooCommerce store, pick your products, and we fulfill every order
                        with custom branding, real-time tracking, and transparent billing.
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

                    {/* Trust badges */}
                    <div className="mt-12 flex flex-wrap justify-center gap-6 text-white/40 text-sm">
                        <div className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-400/60" /> 3rd-Party Tested</div>
                        <div className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-400/60" /> COA on Every Product</div>
                        <div className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-400/60" /> USA-Based Fulfillment</div>
                        <div className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-400/60" /> Same-Day Shipping</div>
                    </div>
                </div>
            </section>

            {/* ─── Products Section ─── */}
            <section id="products" className="py-20 px-6 border-t border-white/5">
                <div className="container mx-auto">
                    <div className="text-center mb-14">
                        <span className="text-violet-400 text-sm font-semibold uppercase tracking-wider">Our Catalog</span>
                        <h2 className="text-3xl md:text-4xl font-bold text-white mt-2">
                            Research-Grade Products
                        </h2>
                        <p className="text-white/60 mt-4 max-w-2xl mx-auto">
                            A growing catalog of peptides, SARMs, nootropics, and research compounds &mdash;
                            all third-party tested with Certificates of Analysis included.
                        </p>
                    </div>

                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {[
                            {
                                icon: Beaker,
                                title: 'Peptides',
                                items: ['BPC-157', 'TB-500', 'PT-141', 'Ipamorelin', 'CJC-1295', 'Semaglutide', 'Tirzepatide'],
                                desc: 'Lyophilized peptides in vials with bacteriostatic water kits available.',
                            },
                            {
                                icon: Shield,
                                title: 'SARMs & Research Compounds',
                                items: ['MK-677', 'RAD-140', 'LGD-4033', 'Cardarine', 'Ostarine', 'YK-11'],
                                desc: 'Liquid and capsule formats with precise dosing and purity testing.',
                            },
                            {
                                icon: Beaker,
                                title: 'Nootropics & Ancillaries',
                                items: ['NAD+', 'Methylene Blue', 'Dihexa', 'Selank', 'Semax', 'DSIP'],
                                desc: 'Cognitive and recovery compounds in nasal spray, sublingual, and injectable formats.',
                            },
                        ].map((category, i) => (
                            <div key={i} className="rounded-2xl bg-white/5 border border-white/10 p-6 hover:border-violet-500/30 transition-colors">
                                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500/20 to-indigo-600/20 flex items-center justify-center mb-4">
                                    <category.icon className="w-6 h-6 text-violet-400" />
                                </div>
                                <h3 className="text-xl font-semibold text-white mb-2">{category.title}</h3>
                                <p className="text-white/50 text-sm mb-4">{category.desc}</p>
                                <div className="flex flex-wrap gap-2">
                                    {category.items.map((item, j) => (
                                        <span key={j} className="px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-white/70 text-xs">
                                            {item}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="mt-8 grid md:grid-cols-3 gap-6">
                        {[
                            { icon: Tag, title: 'Competitive Wholesale Pricing', desc: 'Set your own retail margins. Our wholesale prices are transparent with no hidden fees.' },
                            { icon: Palette, title: 'Custom Branding Available', desc: 'Your logo on labels, packaging, and inserts. Your customers see your brand, not ours.' },
                            { icon: Box, title: 'Custom Formulations', desc: 'Need a specific compound or dosage? We work with you to create custom products for your catalog.' },
                        ].map((item, i) => (
                            <div key={i} className="flex gap-4 p-5 rounded-xl bg-white/5 border border-white/10">
                                <div className="w-10 h-10 rounded-lg bg-violet-500/10 flex items-center justify-center flex-shrink-0">
                                    <item.icon className="w-5 h-5 text-violet-400" />
                                </div>
                                <div>
                                    <h4 className="text-white font-medium">{item.title}</h4>
                                    <p className="text-white/50 text-sm mt-1">{item.desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ─── How It Works / Flow Graph ─── */}
            <section id="how-it-works" className="py-20 px-6 border-t border-white/5">
                <div className="container mx-auto">
                    <div className="text-center mb-14">
                        <span className="text-violet-400 text-sm font-semibold uppercase tracking-wider">The Process</span>
                        <h2 className="text-3xl md:text-4xl font-bold text-white mt-2">
                            How It Works
                        </h2>
                        <p className="text-white/60 mt-4 max-w-2xl mx-auto">
                            From your customer placing an order to receiving their package &mdash;
                            the entire flow is automated, tracked, and hands-off for you.
                        </p>
                    </div>

                    {/* Flow Graph */}
                    <div className="max-w-4xl mx-auto">
                        {[
                            {
                                step: '1',
                                icon: ShoppingCart,
                                title: 'Customer Orders on Your Store',
                                desc: 'A customer places an order on your WooCommerce store. They see your brand, your prices, and your checkout experience.',
                                color: 'from-blue-500 to-cyan-500',
                            },
                            {
                                step: '2',
                                icon: RefreshCw,
                                title: 'Order Syncs Automatically',
                                desc: 'Our WooCommerce plugin instantly sends the order to WhiteLabel Peptides. No copy-pasting, no manual data entry. It just works.',
                                color: 'from-violet-500 to-purple-500',
                            },
                            {
                                step: '3',
                                icon: DollarSign,
                                title: 'Wallet Auto-Debits',
                                desc: 'The wholesale cost is automatically deducted from your prepaid wallet. If funds are low, you get notified and can top up via ACH.',
                                color: 'from-amber-500 to-orange-500',
                            },
                            {
                                step: '4',
                                icon: PackageCheck,
                                title: 'We Pick, Pack & Label',
                                desc: 'Our fulfillment team picks the products, applies your custom branding and labels, and packs the order for shipment.',
                                color: 'from-emerald-500 to-green-500',
                            },
                            {
                                step: '5',
                                icon: Send,
                                title: 'Shipped with Tracking',
                                desc: 'The package ships via USPS, UPS, or FedEx. Tracking info automatically syncs back to your WooCommerce store and your customer gets notified.',
                                color: 'from-pink-500 to-rose-500',
                            },
                            {
                                step: '6',
                                icon: CheckCircle,
                                title: 'Customer Receives Order',
                                desc: 'Your customer receives a professionally packaged order with your branding. They come back to you for reorders &mdash; you keep the margin.',
                                color: 'from-teal-500 to-cyan-500',
                            },
                        ].map((item, i, arr) => (
                            <div key={i} className="relative flex gap-6 pb-2">
                                {/* Timeline line */}
                                <div className="flex flex-col items-center">
                                    <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${item.color} flex items-center justify-center flex-shrink-0 shadow-lg`}>
                                        <item.icon className="w-5 h-5 text-white" />
                                    </div>
                                    {i < arr.length - 1 && (
                                        <div className="w-px flex-1 bg-gradient-to-b from-white/20 to-white/5 my-2 min-h-[40px]" />
                                    )}
                                </div>
                                {/* Content */}
                                <div className="pb-8 pt-1">
                                    <div className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-1">Step {item.step}</div>
                                    <h3 className="text-lg font-semibold text-white">{item.title}</h3>
                                    <p className="text-white/50 mt-1 max-w-lg">{item.desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ─── Fulfillment Section ─── */}
            <section id="fulfillment" className="py-20 px-6 border-t border-white/5">
                <div className="container mx-auto">
                    <div className="text-center mb-14">
                        <span className="text-violet-400 text-sm font-semibold uppercase tracking-wider">End-to-End</span>
                        <h2 className="text-3xl md:text-4xl font-bold text-white mt-2">
                            Complete Fulfillment, Handled
                        </h2>
                        <p className="text-white/60 mt-4 max-w-2xl mx-auto">
                            You focus on marketing and sales. We handle the entire supply chain &mdash;
                            inventory, picking, packing, shipping, and returns.
                        </p>
                    </div>

                    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {[
                            { icon: Package, title: 'Inventory Management', desc: 'We maintain stock levels and update your catalog in real-time. Never sell an out-of-stock item.' },
                            { icon: Zap, title: 'Same-Day Processing', desc: 'Orders received before 2 PM EST ship the same business day from our US fulfillment center.' },
                            { icon: Palette, title: 'Custom Branding', desc: 'Custom labels, branded packaging, packing slips with your logo, and promotional inserts.' },
                            { icon: BarChart3, title: 'Real-Time Dashboard', desc: 'Track every order, view wallet balance, monitor shipping, and pull reports from your portal.' },
                        ].map((item, i) => (
                            <div key={i} className="p-6 rounded-2xl bg-white/5 border border-white/10 hover:border-white/20 transition-colors">
                                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500/20 to-indigo-600/20 flex items-center justify-center mb-4">
                                    <item.icon className="w-6 h-6 text-violet-400" />
                                </div>
                                <h3 className="text-lg font-semibold text-white mb-2">{item.title}</h3>
                                <p className="text-white/60">{item.desc}</p>
                            </div>
                        ))}
                    </div>

                    {/* Shipping Methods */}
                    <div className="mt-14">
                        <h3 className="text-2xl font-bold text-white text-center mb-8">Shipping Methods</h3>
                        <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
                            {[
                                {
                                    carrier: 'USPS',
                                    options: ['Priority Mail (2-3 days)', 'Priority Mail Express (1-2 days)', 'First-Class (3-5 days)'],
                                    note: 'Most popular for domestic orders',
                                },
                                {
                                    carrier: 'UPS',
                                    options: ['Ground (3-5 days)', '2nd Day Air', 'Next Day Air'],
                                    note: 'Best for bulk and high-value shipments',
                                },
                                {
                                    carrier: 'FedEx',
                                    options: ['Ground (3-5 days)', '2Day', 'Priority Overnight'],
                                    note: 'Reliable tracking and signature options',
                                },
                            ].map((carrier, i) => (
                                <div key={i} className="rounded-xl bg-white/5 border border-white/10 p-5">
                                    <div className="flex items-center gap-3 mb-3">
                                        <Truck className="w-5 h-5 text-violet-400" />
                                        <h4 className="text-white font-semibold">{carrier.carrier}</h4>
                                    </div>
                                    <ul className="space-y-1.5 mb-3">
                                        {carrier.options.map((opt, j) => (
                                            <li key={j} className="text-white/60 text-sm flex items-start gap-2">
                                                <CheckCircle className="w-3.5 h-3.5 text-green-400/60 mt-0.5 flex-shrink-0" />
                                                {opt}
                                            </li>
                                        ))}
                                    </ul>
                                    <p className="text-white/40 text-xs">{carrier.note}</p>
                                </div>
                            ))}
                        </div>
                        <p className="text-center text-white/40 text-sm mt-4">
                            All shipments include tracking numbers that sync directly to your WooCommerce store.
                        </p>
                    </div>
                </div>
            </section>

            {/* ─── Billing Section ─── */}
            <section id="billing" className="py-20 px-6 border-t border-white/5">
                <div className="container mx-auto">
                    <div className="text-center mb-14">
                        <span className="text-violet-400 text-sm font-semibold uppercase tracking-wider">Transparent Pricing</span>
                        <h2 className="text-3xl md:text-4xl font-bold text-white mt-2">
                            Simple, Prepaid Billing
                        </h2>
                        <p className="text-white/60 mt-4 max-w-2xl mx-auto">
                            No monthly fees. No subscriptions. Just fund your wallet and pay wholesale
                            cost per order. You set your own retail price and keep the margin.
                        </p>
                    </div>

                    <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
                        <div className="rounded-2xl bg-white/5 border border-white/10 p-6 text-center">
                            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-green-500/20 to-emerald-500/20 flex items-center justify-center mx-auto mb-4">
                                <DollarSign className="w-7 h-7 text-green-400" />
                            </div>
                            <h3 className="text-lg font-semibold text-white">Fund Your Wallet</h3>
                            <p className="text-white/50 text-sm mt-2">
                                Deposit via ACH bank transfer. Funds appear in 1-3 business days.
                                Set auto-replenishment thresholds so you never run dry.
                            </p>
                        </div>
                        <div className="rounded-2xl bg-white/5 border border-white/10 p-6 text-center">
                            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-violet-500/20 to-indigo-500/20 flex items-center justify-center mx-auto mb-4">
                                <CreditCard className="w-7 h-7 text-violet-400" />
                            </div>
                            <h3 className="text-lg font-semibold text-white">Auto-Debit Per Order</h3>
                            <p className="text-white/50 text-sm mt-2">
                                Each order&apos;s wholesale cost (product + shipping) is debited
                                from your wallet when it ships. Full line-item visibility.
                            </p>
                        </div>
                        <div className="rounded-2xl bg-white/5 border border-white/10 p-6 text-center">
                            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-amber-500/20 to-orange-500/20 flex items-center justify-center mx-auto mb-4">
                                <BarChart3 className="w-7 h-7 text-amber-400" />
                            </div>
                            <h3 className="text-lg font-semibold text-white">Track Everything</h3>
                            <p className="text-white/50 text-sm mt-2">
                                Full billing history, invoices, and transaction logs in your merchant
                                dashboard. Export reports anytime for your records.
                            </p>
                        </div>
                    </div>

                    {/* Mercury Bank Recommendation */}
                    <div className="mt-10 max-w-2xl mx-auto rounded-xl bg-gradient-to-r from-sky-600/10 to-blue-600/10 border border-sky-500/20 p-6">
                        <div className="flex items-start gap-4">
                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-sky-500/20 to-blue-600/20 flex items-center justify-center flex-shrink-0">
                                <CreditCard className="w-6 h-6 text-sky-400" />
                            </div>
                            <div>
                                <h4 className="text-white font-semibold">Recommended: Mercury Business Banking</h4>
                                <p className="text-white/50 text-sm mt-1">
                                    We recommend <strong className="text-white/70">Mercury</strong> for your business bank account.
                                    Mercury offers free business checking, fast ACH transfers, and seamless integration
                                    with our invoicing system &mdash; making wallet funding quick and painless.
                                </p>
                                <a
                                    href="https://mercury.com/r/peptide-tech-llc"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1.5 mt-3 text-sm font-medium text-sky-400 hover:text-sky-300 transition-colors"
                                >
                                    Open a Mercury Account
                                    <ArrowRight className="w-3.5 h-3.5" />
                                </a>
                            </div>
                        </div>
                    </div>

                    <div className="mt-6 max-w-2xl mx-auto rounded-xl bg-gradient-to-r from-violet-600/10 to-indigo-600/10 border border-violet-500/20 p-6">
                        <h4 className="text-white font-semibold text-center mb-3">How Your Margins Work</h4>
                        <div className="grid grid-cols-3 gap-4 text-center text-sm">
                            <div>
                                <div className="text-2xl font-bold text-white">$15</div>
                                <div className="text-white/40 mt-1">Your wholesale cost</div>
                            </div>
                            <div>
                                <div className="text-2xl font-bold text-white">$45</div>
                                <div className="text-white/40 mt-1">You charge retail</div>
                            </div>
                            <div>
                                <div className="text-2xl font-bold text-green-400">$30</div>
                                <div className="text-white/40 mt-1">Your profit per order</div>
                            </div>
                        </div>
                        <p className="text-white/40 text-xs text-center mt-4">
                            Example based on a typical peptide order. Actual margins depend on product and your retail pricing.
                        </p>
                    </div>
                </div>
            </section>

            {/* ─── Custom Branding Section ─── */}
            <section className="py-20 px-6 border-t border-white/5">
                <div className="container mx-auto">
                    <div className="grid lg:grid-cols-2 gap-12 items-center">
                        <div>
                            <span className="text-violet-400 text-sm font-semibold uppercase tracking-wider">Your Brand, Your Rules</span>
                            <h2 className="text-3xl md:text-4xl font-bold text-white mt-2 mb-6">
                                Custom Branding &
                                <br />Custom Products
                            </h2>
                            <p className="text-white/60 mb-8 leading-relaxed">
                                Your customers should only ever see your brand. We offer complete white-label
                                fulfillment where every touchpoint &mdash; from the product label to the shipping box &mdash;
                                carries your identity.
                            </p>
                            <ul className="space-y-4">
                                {[
                                    'Custom product labels with your logo and design',
                                    'Branded outer packaging and shipping boxes',
                                    'Personalized packing slips and thank-you inserts',
                                    'Custom product formulations and dosages',
                                    'Private-label compounds exclusive to your store',
                                    'COAs and documentation under your brand header',
                                ].map((item, i) => (
                                    <li key={i} className="flex items-start gap-3 text-white/70">
                                        <CheckCircle className="w-5 h-5 text-violet-400 mt-0.5 flex-shrink-0" />
                                        <span>{item}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                        <div className="rounded-2xl bg-white/5 border border-white/10 p-8">
                            <div className="space-y-6">
                                <div className="flex items-center gap-4">
                                    <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-violet-500/30 to-indigo-600/30 flex items-center justify-center">
                                        <Palette className="w-8 h-8 text-violet-400" />
                                    </div>
                                    <div>
                                        <h4 className="text-white font-semibold">Branding Tiers</h4>
                                        <p className="text-white/50 text-sm">From basic labels to full custom packaging</p>
                                    </div>
                                </div>
                                <div className="space-y-3">
                                    {[
                                        { tier: 'Standard', desc: 'Generic professional packaging with no supplier branding', included: true },
                                        { tier: 'Custom Labels', desc: 'Your logo and brand on all product labels', included: true },
                                        { tier: 'Full White-Label', desc: 'Branded boxes, inserts, and complete custom experience', included: true },
                                        { tier: 'Custom Products', desc: 'Exclusive formulations made specifically for your brand', included: true },
                                    ].map((tier, i) => (
                                        <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-white/5">
                                            <div>
                                                <div className="text-white text-sm font-medium">{tier.tier}</div>
                                                <div className="text-white/40 text-xs">{tier.desc}</div>
                                            </div>
                                            <CheckCircle className="w-5 h-5 text-green-400/60 flex-shrink-0" />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ─── Features Grid (expanded) ─── */}
            <section className="py-20 px-6 border-t border-white/5">
                <div className="container mx-auto">
                    <div className="text-center mb-14">
                        <span className="text-violet-400 text-sm font-semibold uppercase tracking-wider">Platform Features</span>
                        <h2 className="text-3xl md:text-4xl font-bold text-white mt-2">
                            Everything You Need to Succeed
                        </h2>
                    </div>

                    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {[
                            { icon: Package, title: 'Curated Catalog', description: 'Verified research compounds with COAs and compliance documentation.' },
                            { icon: Zap, title: 'Instant Order Sync', description: 'Orders automatically flow to fulfillment. No manual entry required.' },
                            { icon: CreditCard, title: 'Prepay Wallet', description: 'Fund once. Orders auto-debit as they ship. Full transparency.' },
                            { icon: Shield, title: 'Compliance Built-In', description: 'Research-only disclaimers, age verification, and region restrictions.' },
                            { icon: Globe, title: 'WooCommerce Plugin', description: 'One-click install. Catalog import, order sync, and tracking updates.' },
                            { icon: Clock, title: 'Real-Time Tracking', description: 'Tracking numbers auto-sync to your store. Customers stay informed.' },
                            { icon: Truck, title: 'Multi-Carrier Shipping', description: 'USPS, UPS, and FedEx with multiple speed tiers available.' },
                            { icon: BarChart3, title: 'Merchant Dashboard', description: 'Full visibility into orders, wallet, shipments, and billing history.' },
                        ].map((feature, i) => (
                            <div key={i} className="p-6 rounded-2xl bg-white/5 border border-white/10 hover:border-white/20 transition-colors">
                                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500/20 to-indigo-600/20 flex items-center justify-center mb-4">
                                    <feature.icon className="w-6 h-6 text-violet-400" />
                                </div>
                                <h3 className="text-lg font-semibold text-white mb-2">{feature.title}</h3>
                                <p className="text-white/60">{feature.description}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ─── FAQ Section ─── */}
            <section id="faq" className="py-20 px-6 border-t border-white/5">
                <div className="container mx-auto max-w-3xl">
                    <div className="text-center mb-14">
                        <span className="text-violet-400 text-sm font-semibold uppercase tracking-wider">FAQ</span>
                        <h2 className="text-3xl md:text-4xl font-bold text-white mt-2">
                            Frequently Asked Questions
                        </h2>
                    </div>

                    <div className="space-y-3">
                        <FAQItem
                            question="How do I get started?"
                            answer="Create a merchant account, complete our quick onboarding (business verification and compliance agreement), fund your wallet, and install our WooCommerce plugin. You can have products listed on your store within the same day."
                        />
                        <FAQItem
                            question="What products do you offer?"
                            answer="We carry a growing catalog of research-grade peptides (BPC-157, TB-500, Semaglutide, etc.), SARMs (MK-677, RAD-140, etc.), nootropics (NAD+, Methylene Blue, etc.), and ancillary compounds. All products are third-party tested with Certificates of Analysis. We also offer custom formulations."
                        />
                        <FAQItem
                            question="How does billing work?"
                            answer="We use a prepaid wallet system. You fund your wallet via ACH bank transfer, and each order's wholesale cost is automatically debited when it ships. There are no monthly fees, no subscriptions, and no hidden charges. You can set auto-replenishment thresholds to keep your wallet funded."
                        />
                        <FAQItem
                            question="Do you recommend a specific business bank?"
                            answer="Yes — we highly recommend Mercury for your business banking. Mercury offers free business checking, fast ACH transfers, robust API integrations, and works seamlessly with our invoicing system. This means faster wallet funding and smoother operations. You can open a free Mercury account at mercury.com/r/peptide-tech-llc."
                        />
                        <FAQItem
                            question="What shipping methods are available?"
                            answer="We ship via USPS (Priority, Express, First-Class), UPS (Ground, 2nd Day, Next Day), and FedEx (Ground, 2Day, Overnight). Most domestic orders ship same-day if received before 2 PM EST. All shipments include tracking that automatically syncs to your WooCommerce store."
                        />
                        <FAQItem
                            question="Can I use my own branding?"
                            answer="Absolutely. We offer full white-label fulfillment. You can have custom labels with your logo, branded packaging, personalized packing slips, and promotional inserts. Your customers will only see your brand. We also support custom product formulations exclusive to your store."
                        />
                        <FAQItem
                            question="How does the WooCommerce plugin work?"
                            answer="Our plugin installs on your WordPress site and connects to your WhiteLabel Peptides merchant account. It automatically imports our catalog as WooCommerce products (you choose which ones), syncs orders to our fulfillment system when customers buy, and pushes tracking info back when orders ship."
                        />
                        <FAQItem
                            question="What are the compliance requirements?"
                            answer="All products are for research use only. During onboarding, we verify your business (KYB) and you agree to our research-use-only compliance terms. Products include appropriate disclaimers, and we support age verification and region restrictions on your store."
                        />
                        <FAQItem
                            question="Do I need to hold any inventory?"
                            answer="No. This is a dropship/fulfillment model. We hold all inventory at our US-based fulfillment center. When your customer orders, we pick, pack, and ship directly to them under your brand. You never touch the product."
                        />
                        <FAQItem
                            question="What are the minimum order requirements?"
                            answer="There are no minimum order quantities. Whether your customer orders one vial or twenty, we fulfill it. For custom branding and formulations, minimum quantities may apply — reach out to discuss your needs."
                        />
                        <FAQItem
                            question="How do I track my orders and finances?"
                            answer="Your merchant dashboard gives you real-time visibility into all orders, their fulfillment status, shipment tracking, wallet balance, transaction history, and billing invoices. You can export reports anytime."
                        />
                    </div>
                </div>
            </section>

            {/* ─── CTA Section ─── */}
            <section className="py-20 px-6 border-t border-white/5">
                <div className="container mx-auto">
                    <div className="rounded-3xl bg-gradient-to-r from-violet-600/20 to-indigo-600/20 border border-white/10 p-12 text-center">
                        <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                            Ready to Launch Your Brand?
                        </h2>
                        <p className="text-white/60 mb-8 max-w-xl mx-auto">
                            Join our network of research resellers. Connect your store in minutes,
                            import products, and start fulfilling orders today. No inventory risk, no upfront cost.
                        </p>
                        <div className="flex flex-col sm:flex-row gap-4 justify-center">
                            <Link
                                href="/register"
                                className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-white text-slate-900 font-semibold text-lg hover:bg-white/90 transition-colors"
                            >
                                Create Merchant Account
                                <ArrowRight className="w-5 h-5" />
                            </Link>
                            <a
                                href="mailto:whitelabel@peptidetech.co"
                                className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-white/10 text-white font-semibold text-lg hover:bg-white/20 transition-colors"
                            >
                                Contact Sales
                            </a>
                        </div>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="py-8 px-6 border-t border-white/10">
                <div className="container mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                        <Package className="w-5 h-5 text-white/60" />
                        <span className="text-white/60">&copy; 2025 WhiteLabel Peptides. All rights reserved.</span>
                    </div>
                    <div className="flex items-center gap-6 text-white/60 text-sm">
                        <Link href="/terms" className="hover:text-white transition-colors">Terms</Link>
                        <Link href="/privacy" className="hover:text-white transition-colors">Privacy</Link>
                        <Link href="/docs" className="hover:text-white transition-colors">Docs</Link>
                        <a href="mailto:whitelabel@peptidetech.co" className="hover:text-white transition-colors">Contact</a>
                    </div>
                </div>
            </footer>
        </div>
    );
}
