'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
    BookOpen,
    Rocket,
    Store,
    Package,
    ShoppingCart,
    Wallet,
    Truck,
    FlaskConical,
    Settings,
    ArrowRight,
    CheckCircle,
    Circle,
    ChevronDown,
    ChevronRight,
    ExternalLink,
    Shield,
    CreditCard,
    RefreshCw,
    FileText,
    Users,
    Zap,
    HelpCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';

type Section = 'getting-started' | 'workflow' | 'features' | 'faq';

const WORKFLOW_STEPS = [
    {
        number: 1,
        title: 'Complete Onboarding',
        description: 'Register your account, provide business details, upload KYB documents, and sign the merchant agreement.',
        icon: Shield,
        color: 'violet',
        details: [
            'Create your account and verify your email',
            'Select your service package (Self-Service, Brand Starter, or Business-in-a-Box)',
            'Enter business info: legal name, EIN, business type',
            'Upload compliance documents: business license, government ID, articles of incorporation',
            'Sign the merchant agreement digitally',
            'Submit for admin review (typically approved within 1–2 business days)',
        ],
    },
    {
        number: 2,
        title: 'Fund Your Wallet',
        description: 'Add funds to your merchant wallet via ACH bank transfer or BTC deposit so you can place orders.',
        icon: Wallet,
        color: 'green',
        details: [
            'Navigate to the Wallet page from the sidebar',
            'Request a manual top-up — an invoice is sent via Mercury (ACH)',
            'Or deposit BTC to your unique deposit address',
            'Funds appear in your wallet once confirmed',
            'A $500 compliance reserve is required before orders can ship',
        ],
    },
    {
        number: 3,
        title: 'Connect Your Store',
        description: 'Link your WooCommerce store to automatically sync orders between your storefront and the platform.',
        icon: Store,
        color: 'blue',
        details: [
            'Go to the Stores page and click "Connect Store"',
            'Generate a connect code from your dashboard',
            'Install the WhiteLabel Peptides plugin on your WooCommerce site',
            'Enter the connect code in the plugin settings',
            'Your store will authenticate via HMAC signatures — no passwords shared',
            'Orders placed on your store will automatically appear in the Orders tab',
        ],
    },
    {
        number: 4,
        title: 'Browse & Configure Catalog',
        description: 'View available products, check wholesale pricing, and configure which products are available on your store.',
        icon: Package,
        color: 'orange',
        details: [
            'Open the Catalog page to see all available products',
            'Each product shows SKU, name, your wholesale price, and availability',
            'Products are automatically synced to your connected store',
            'Use the search and filter tools to find specific products',
            'Your store customers see your retail price — you keep the margin',
        ],
    },
    {
        number: 5,
        title: 'Receive & Track Orders',
        description: 'When customers order from your store, orders flow through automatically. Track status from received to delivered.',
        icon: ShoppingCart,
        color: 'purple',
        details: [
            'Customer places order on your WooCommerce store',
            'Order is synced to the platform automatically via webhook',
            'Order cost is deducted from your wallet balance',
            'Admin team picks, packs, and ships the order',
            'Tracking number is pushed back to your store and customer',
            'You can view all order statuses in the Orders page',
        ],
    },
    {
        number: 6,
        title: 'Ship & Fulfill',
        description: 'Orders are fulfilled by the supplier. Tracking info is synced back to your store automatically.',
        icon: Truck,
        color: 'teal',
        details: [
            'Once funded, orders are queued for fulfillment',
            'The supplier ships directly to your customer (blind/white-label)',
            'Tracking numbers are generated via ShipStation',
            'Tracking info is automatically pushed to your WooCommerce store',
            'Your customer sees your brand — not the supplier's',
        ],
    },
];

const FEATURES = [
    {
        title: 'Dashboard',
        href: '/dashboard',
        icon: Zap,
        description: 'Your command center. See wallet balance, active orders, product count, and monthly spend at a glance. Quick action cards help you jump to common tasks.',
    },
    {
        title: 'Product Catalog',
        href: '/dashboard/catalog',
        icon: Package,
        description: 'Browse all available products with SKUs, wholesale pricing, and stock levels. Search and filter by category. Select products for 3rd party testing directly from the catalog.',
    },
    {
        title: 'Orders',
        href: '/dashboard/orders',
        icon: ShoppingCart,
        description: 'View all supplier orders synced from your store. Track order status from "Awaiting Funds" through "Shipped" and "Complete". See item counts, totals, and tracking numbers.',
    },
    {
        title: 'Wallet & Funding',
        href: '/dashboard/wallet',
        icon: Wallet,
        description: 'Manage your merchant wallet balance. Request ACH top-ups via Mercury invoices, or deposit BTC. View transaction history and pending invoices. A $500 compliance reserve is required for shipping.',
    },
    {
        title: 'Store Connections',
        href: '/dashboard/stores',
        icon: Store,
        description: 'Connect your WooCommerce store using a secure connect code. The plugin handles HMAC authentication, order syncing, and tracking updates automatically. Manage and rotate API credentials.',
    },
    {
        title: '3rd Party Testing',
        href: '/dashboard/catalog',
        icon: FlaskConical,
        description: 'Order Certificate of Analysis (CoA) testing for your products. Select products from the catalog, choose a testing lab, pick test add-ons (purity, sterility, endotoxins), and submit. Costs are deducted from your wallet.',
    },
    {
        title: 'Settings',
        href: '/dashboard/settings',
        icon: Settings,
        description: 'Update your business profile, contact details, and billing preferences. Configure auto-funding thresholds and billing email addresses.',
    },
    {
        title: 'Document Uploads',
        href: '/dashboard/uploads',
        icon: FileText,
        description: 'Manage compliance documents and files. Upload updated business licenses, certificates, or other verification documents as needed.',
    },
];

const FAQ_ITEMS = [
    {
        question: 'How long does account approval take?',
        answer: 'After submitting your onboarding application with all required documents, our compliance team typically reviews and approves accounts within 1–2 business days. You\'ll receive an email notification when approved.',
    },
    {
        question: 'What is the $500 compliance reserve?',
        answer: 'To ensure fulfillment integrity, a minimum $500 balance must be maintained in your wallet at all times. Orders cannot ship until this reserve is met. The reserve is part of your wallet balance — not a separate fee.',
    },
    {
        question: 'How does order pricing work?',
        answer: 'You purchase products at wholesale prices shown in the Catalog. You set your own retail prices on your WooCommerce store. When a customer orders, the wholesale cost is deducted from your wallet. The difference is your margin.',
    },
    {
        question: 'How do I add funds to my wallet?',
        answer: 'Go to the Wallet page and request a manual top-up. This creates a Mercury invoice sent to your email with ACH payment instructions. Alternatively, you can deposit BTC to your unique deposit address. Funds appear once the payment is confirmed.',
    },
    {
        question: 'Can I connect multiple stores?',
        answer: 'Yes. You can generate multiple connect codes and connect several WooCommerce stores to your merchant account. Each store gets its own API credentials and syncs orders independently.',
    },
    {
        question: 'How does white-label shipping work?',
        answer: 'All orders are shipped blind — your customer receives the package with no supplier branding. Tracking numbers are automatically synced back to your WooCommerce store so your customers can track their orders under your brand.',
    },
    {
        question: 'What if an order needs to be cancelled?',
        answer: 'Orders can be cancelled while in "Awaiting Funds" or "Funded" status. Once an order enters "Picking" or "Shipped" status, it cannot be cancelled. Cancelled order funds are returned to your wallet.',
    },
    {
        question: 'What is 3rd party testing?',
        answer: 'You can request independent lab testing (CoA) for any product. Choose test add-ons like purity, sterility, or endotoxin testing. The testing fee and shipping cost are deducted from your wallet. Results are provided by the lab when complete.',
    },
    {
        question: 'How do I contact support?',
        answer: 'Email us at whitelabel@peptidetech.co for any questions, issues, or account inquiries. We typically respond within one business day.',
    },
];

export default function GuidePage() {
    const [activeSection, setActiveSection] = useState<Section>('getting-started');
    const [expandedStep, setExpandedStep] = useState<number | null>(1);
    const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

    const sections: { id: Section; label: string; icon: React.ElementType }[] = [
        { id: 'getting-started', label: 'Getting Started', icon: Rocket },
        { id: 'workflow', label: 'How It Works', icon: RefreshCw },
        { id: 'features', label: 'Features', icon: Zap },
        { id: 'faq', label: 'FAQ', icon: HelpCircle },
    ];

    const colorMap: Record<string, { bg: string; text: string; ring: string; light: string }> = {
        violet: { bg: 'bg-violet-100 dark:bg-violet-900/30', text: 'text-violet-600', ring: 'ring-violet-500', light: 'bg-violet-50 dark:bg-violet-900/10' },
        green: { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-600', ring: 'ring-green-500', light: 'bg-green-50 dark:bg-green-900/10' },
        blue: { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-600', ring: 'ring-blue-500', light: 'bg-blue-50 dark:bg-blue-900/10' },
        orange: { bg: 'bg-orange-100 dark:bg-orange-900/30', text: 'text-orange-600', ring: 'ring-orange-500', light: 'bg-orange-50 dark:bg-orange-900/10' },
        purple: { bg: 'bg-purple-100 dark:bg-purple-900/30', text: 'text-purple-600', ring: 'ring-purple-500', light: 'bg-purple-50 dark:bg-purple-900/10' },
        teal: { bg: 'bg-teal-100 dark:bg-teal-900/30', text: 'text-teal-600', ring: 'ring-teal-500', light: 'bg-teal-50 dark:bg-teal-900/10' },
    };

    return (
        <div className="space-y-6 animate-in">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <BookOpen className="w-7 h-7 text-violet-600" />
                    Merchant Guide
                </h1>
                <p className="text-gray-500 dark:text-gray-400 mt-1">
                    Everything you need to know to get started and run your white-label business
                </p>
            </div>

            {/* Section tabs */}
            <div className="flex gap-2 flex-wrap">
                {sections.map((section) => (
                    <Button
                        key={section.id}
                        variant={activeSection === section.id ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setActiveSection(section.id)}
                        className={activeSection === section.id ? 'bg-violet-600 hover:bg-violet-700' : ''}
                    >
                        <section.icon className="w-4 h-4 mr-1.5" />
                        {section.label}
                    </Button>
                ))}
            </div>

            {/* Getting Started */}
            {activeSection === 'getting-started' && (
                <div className="space-y-6">
                    <Card className="border-violet-200 dark:border-violet-800 bg-gradient-to-br from-violet-50 to-indigo-50 dark:from-violet-900/20 dark:to-indigo-900/20">
                        <CardContent className="p-6">
                            <div className="flex items-start gap-4">
                                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shrink-0">
                                    <Rocket className="w-7 h-7 text-white" />
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">Welcome to WhiteLabel Peptides</h2>
                                    <p className="text-gray-600 dark:text-gray-300 mt-2 leading-relaxed">
                                        This platform lets you run a white-label peptide supply business.
                                        You connect your WooCommerce store, customers place orders on your site,
                                        and we handle fulfillment — shipping directly to your customers with your branding.
                                        You set your retail prices and keep the margin.
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Quick start checklist */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Quick Start Checklist</CardTitle>
                            <CardDescription>Follow these steps to get your first order fulfilled</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-3">
                                {[
                                    { label: 'Complete onboarding & upload KYB documents', href: '/onboarding', linkLabel: 'Go to Onboarding' },
                                    { label: 'Wait for admin approval (1–2 business days)', href: null, linkLabel: null },
                                    { label: 'Fund your wallet with at least $500 (compliance reserve)', href: '/dashboard/wallet', linkLabel: 'Go to Wallet' },
                                    { label: 'Connect your WooCommerce store', href: '/dashboard/stores', linkLabel: 'Go to Stores' },
                                    { label: 'Browse the catalog and configure your products', href: '/dashboard/catalog', linkLabel: 'Go to Catalog' },
                                    { label: 'Receive your first customer order', href: '/dashboard/orders', linkLabel: 'View Orders' },
                                ].map((item, i) => (
                                    <div key={i} className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                                        <div className="w-7 h-7 rounded-full bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center shrink-0">
                                            <span className="text-sm font-bold text-violet-600">{i + 1}</span>
                                        </div>
                                        <span className="flex-1 text-gray-700 dark:text-gray-300">{item.label}</span>
                                        {item.href && (
                                            <Link href={item.href}>
                                                <Button variant="ghost" size="sm" className="text-violet-600 hover:text-violet-700">
                                                    {item.linkLabel}
                                                    <ArrowRight className="w-3.5 h-3.5 ml-1" />
                                                </Button>
                                            </Link>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Key concepts */}
                    <div className="grid gap-4 md:grid-cols-3">
                        <Card>
                            <CardContent className="p-5">
                                <div className="w-10 h-10 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center mb-3">
                                    <CreditCard className="w-5 h-5 text-green-600" />
                                </div>
                                <h3 className="font-semibold text-gray-900 dark:text-white mb-1">Pre-Funded Model</h3>
                                <p className="text-sm text-gray-500 leading-relaxed">
                                    Orders are paid from your wallet balance at wholesale cost. Fund your wallet via ACH or BTC before orders can be fulfilled.
                                </p>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardContent className="p-5">
                                <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mb-3">
                                    <Truck className="w-5 h-5 text-blue-600" />
                                </div>
                                <h3 className="font-semibold text-gray-900 dark:text-white mb-1">Blind Drop-Ship</h3>
                                <p className="text-sm text-gray-500 leading-relaxed">
                                    All shipments go directly to your customer with no supplier branding. Your customers only see your brand throughout the entire experience.
                                </p>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardContent className="p-5">
                                <div className="w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center mb-3">
                                    <RefreshCw className="w-5 h-5 text-purple-600" />
                                </div>
                                <h3 className="font-semibold text-gray-900 dark:text-white mb-1">Automated Sync</h3>
                                <p className="text-sm text-gray-500 leading-relaxed">
                                    Orders sync from your WooCommerce store automatically. Tracking numbers are pushed back to your store when shipped. No manual work.
                                </p>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            )}

            {/* Workflow */}
            {activeSection === 'workflow' && (
                <div className="space-y-4">
                    <Card className="bg-gray-50 dark:bg-gray-800/50">
                        <CardContent className="p-5">
                            <h2 className="font-semibold text-gray-900 dark:text-white mb-1">End-to-End Workflow</h2>
                            <p className="text-sm text-gray-500">
                                Click on any step to expand it and see the detailed instructions.
                            </p>
                        </CardContent>
                    </Card>

                    {/* Vertical timeline */}
                    <div className="relative">
                        {WORKFLOW_STEPS.map((step, index) => {
                            const colors = colorMap[step.color] || colorMap.violet;
                            const isExpanded = expandedStep === step.number;
                            const Icon = step.icon;
                            const isLast = index === WORKFLOW_STEPS.length - 1;

                            return (
                                <div key={step.number} className="relative flex gap-4">
                                    {/* Timeline connector */}
                                    <div className="flex flex-col items-center">
                                        <div className={cn(
                                            'w-10 h-10 rounded-full flex items-center justify-center shrink-0 z-10 border-2',
                                            isExpanded
                                                ? `${colors.bg} border-current ${colors.text}`
                                                : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600'
                                        )}>
                                            <Icon className={cn('w-5 h-5', isExpanded ? colors.text : 'text-gray-400')} />
                                        </div>
                                        {!isLast && (
                                            <div className="w-0.5 flex-1 min-h-[16px] bg-gray-200 dark:bg-gray-700" />
                                        )}
                                    </div>

                                    {/* Content */}
                                    <div className="flex-1 pb-6">
                                        <button
                                            onClick={() => setExpandedStep(isExpanded ? null : step.number)}
                                            className="w-full text-left"
                                        >
                                            <Card className={cn(
                                                'transition-all hover:shadow-md',
                                                isExpanded && `ring-1 ${colors.ring}`
                                            )}>
                                                <CardContent className="p-4">
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center gap-3">
                                                            <span className={cn(
                                                                'text-xs font-bold px-2 py-0.5 rounded-full',
                                                                colors.bg, colors.text
                                                            )}>
                                                                Step {step.number}
                                                            </span>
                                                            <h3 className="font-semibold text-gray-900 dark:text-white">
                                                                {step.title}
                                                            </h3>
                                                        </div>
                                                        {isExpanded ? (
                                                            <ChevronDown className="w-4 h-4 text-gray-400" />
                                                        ) : (
                                                            <ChevronRight className="w-4 h-4 text-gray-400" />
                                                        )}
                                                    </div>
                                                    <p className="text-sm text-gray-500 mt-1 ml-[52px]">
                                                        {step.description}
                                                    </p>

                                                    {isExpanded && (
                                                        <div className={cn('mt-4 ml-[52px] p-4 rounded-lg', colors.light)}>
                                                            <ul className="space-y-2">
                                                                {step.details.map((detail, di) => (
                                                                    <li key={di} className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
                                                                        <CheckCircle className={cn('w-4 h-4 shrink-0 mt-0.5', colors.text)} />
                                                                        {detail}
                                                                    </li>
                                                                ))}
                                                            </ul>
                                                        </div>
                                                    )}
                                                </CardContent>
                                            </Card>
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Features */}
            {activeSection === 'features' && (
                <div className="grid gap-4 md:grid-cols-2">
                    {FEATURES.map((feature) => {
                        const Icon = feature.icon;
                        return (
                            <Card key={feature.title} className="hover:shadow-md transition-shadow">
                                <CardContent className="p-5">
                                    <div className="flex items-start gap-4">
                                        <div className="w-10 h-10 rounded-lg bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center shrink-0">
                                            <Icon className="w-5 h-5 text-violet-600" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between mb-1">
                                                <h3 className="font-semibold text-gray-900 dark:text-white">
                                                    {feature.title}
                                                </h3>
                                                <Link href={feature.href}>
                                                    <Button variant="ghost" size="sm" className="text-violet-600 hover:text-violet-700 shrink-0">
                                                        Open
                                                        <ArrowRight className="w-3.5 h-3.5 ml-1" />
                                                    </Button>
                                                </Link>
                                            </div>
                                            <p className="text-sm text-gray-500 leading-relaxed">
                                                {feature.description}
                                            </p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            )}

            {/* FAQ */}
            {activeSection === 'faq' && (
                <div className="space-y-3">
                    {FAQ_ITEMS.map((item, i) => {
                        const isOpen = expandedFaq === i;
                        return (
                            <Card key={i}>
                                <button
                                    className="w-full text-left"
                                    onClick={() => setExpandedFaq(isOpen ? null : i)}
                                >
                                    <CardContent className="p-4">
                                        <div className="flex items-center justify-between gap-3">
                                            <div className="flex items-center gap-3">
                                                <HelpCircle className={cn(
                                                    'w-5 h-5 shrink-0',
                                                    isOpen ? 'text-violet-600' : 'text-gray-400'
                                                )} />
                                                <h3 className={cn(
                                                    'font-medium',
                                                    isOpen ? 'text-violet-600' : 'text-gray-900 dark:text-white'
                                                )}>
                                                    {item.question}
                                                </h3>
                                            </div>
                                            {isOpen ? (
                                                <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" />
                                            ) : (
                                                <ChevronRight className="w-4 h-4 text-gray-400 shrink-0" />
                                            )}
                                        </div>
                                        {isOpen && (
                                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-3 ml-8 leading-relaxed">
                                                {item.answer}
                                            </p>
                                        )}
                                    </CardContent>
                                </button>
                            </Card>
                        );
                    })}

                    <Card className="bg-gray-50 dark:bg-gray-800/50">
                        <CardContent className="p-5 text-center">
                            <p className="text-gray-500 mb-2">Still have questions?</p>
                            <a href="mailto:whitelabel@peptidetech.co">
                                <Button variant="outline">
                                    Contact Support
                                    <ExternalLink className="w-3.5 h-3.5 ml-1.5" />
                                </Button>
                            </a>
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    );
}
