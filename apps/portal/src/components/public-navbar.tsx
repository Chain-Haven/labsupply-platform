'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Package, Menu, X } from 'lucide-react';

const SITE_LINKS = [
    { href: '/learning-center', label: 'Learning Center' },
    { href: '/book-a-call', label: 'Book a Call' },
    { href: '/docs', label: 'Docs' },
];

const LANDING_ANCHORS = [
    { href: '#products', label: 'Products' },
    { href: '#how-it-works', label: 'How It Works' },
    { href: '#fulfillment', label: 'Fulfillment' },
    { href: '#billing', label: 'Billing' },
    { href: '#faq', label: 'FAQ' },
];

interface PublicNavbarProps {
    variant?: 'landing' | 'page';
}

export default function PublicNavbar({ variant = 'page' }: PublicNavbarProps) {
    const [mobileOpen, setMobileOpen] = useState(false);
    const links = variant === 'landing'
        ? [...LANDING_ANCHORS, ...SITE_LINKS]
        : SITE_LINKS;

    return (
        <nav className="fixed top-0 left-0 right-0 z-50 bg-slate-900/80 backdrop-blur-xl border-b border-white/15 shadow-lg shadow-black/10">
            <div className="container mx-auto px-6 py-4 flex items-center justify-between">
                <Link href="/" className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-md shadow-violet-500/20">
                        <Package className="w-5 h-5 text-white" />
                    </div>
                    <span className="text-xl font-bold text-white tracking-tight">WhiteLabel Peptides</span>
                </Link>

                {/* Desktop links */}
                <div className="hidden md:flex items-center gap-1">
                    {links.map((link) =>
                        link.href.startsWith('#') ? (
                            <a
                                key={link.href}
                                href={link.href}
                                className="px-3 py-1.5 rounded-md text-sm font-medium text-white/80 hover:text-white hover:bg-white/10 transition-all"
                            >
                                {link.label}
                            </a>
                        ) : (
                            <Link
                                key={link.href}
                                href={link.href}
                                className="px-3 py-1.5 rounded-md text-sm font-medium text-white/80 hover:text-white hover:bg-white/10 transition-all"
                            >
                                {link.label}
                            </Link>
                        ),
                    )}
                </div>

                <div className="flex items-center gap-3">
                    <Link href="/login" className="hidden sm:inline-flex px-4 py-2 rounded-lg text-sm font-medium text-white/90 hover:text-white hover:bg-white/10 transition-all">
                        Sign In
                    </Link>
                    <Link href="/register" className="hidden sm:inline-flex px-5 py-2 rounded-lg bg-gradient-to-r from-violet-500 to-indigo-600 text-white text-sm font-semibold hover:from-violet-400 hover:to-indigo-500 transition-all shadow-md shadow-violet-500/25">
                        Get Started
                    </Link>
                    <button
                        onClick={() => setMobileOpen(!mobileOpen)}
                        className="md:hidden p-2 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-all"
                        aria-label="Toggle menu"
                    >
                        {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                    </button>
                </div>
            </div>

            {/* Mobile menu */}
            {mobileOpen && (
                <div className="md:hidden border-t border-white/10 bg-slate-900/95 backdrop-blur-xl">
                    <div className="container mx-auto px-6 py-4 space-y-1">
                        {links.map((link) =>
                            link.href.startsWith('#') ? (
                                <a
                                    key={link.href}
                                    href={link.href}
                                    onClick={() => setMobileOpen(false)}
                                    className="block px-3 py-2.5 rounded-lg text-sm font-medium text-white/80 hover:text-white hover:bg-white/10 transition-all"
                                >
                                    {link.label}
                                </a>
                            ) : (
                                <Link
                                    key={link.href}
                                    href={link.href}
                                    onClick={() => setMobileOpen(false)}
                                    className="block px-3 py-2.5 rounded-lg text-sm font-medium text-white/80 hover:text-white hover:bg-white/10 transition-all"
                                >
                                    {link.label}
                                </Link>
                            ),
                        )}
                        <div className="pt-3 border-t border-white/10 flex flex-col gap-2">
                            <Link href="/login" className="px-3 py-2.5 rounded-lg text-sm font-medium text-white/80 hover:text-white hover:bg-white/10 transition-all">
                                Sign In
                            </Link>
                            <Link href="/register" className="px-3 py-2.5 rounded-lg bg-gradient-to-r from-violet-500 to-indigo-600 text-white text-sm font-semibold text-center">
                                Get Started
                            </Link>
                        </div>
                    </div>
                </div>
            )}
        </nav>
    );
}
