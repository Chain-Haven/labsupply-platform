import Link from 'next/link';
import {
    ArrowRight, Calendar, CheckCircle, Package, ShieldCheck,
    Palette, DollarSign, BarChart3, Mail,
} from 'lucide-react';
import PublicNavbar from '@/components/public-navbar';
import PublicFooter from '@/components/public-footer';
import type { Metadata } from 'next';

const BOOKING_URL = 'https://calendly.com/peptidetech-info/30min';

export const metadata: Metadata = {
    title: 'Book a Call — WhiteLabel Peptides',
    description: 'Schedule a consultation with the WhiteLabel Peptides team to learn about our white-label fulfillment platform.',
};

export default function BookACallPage() {
    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
            <PublicNavbar />

            <section className="pt-32 pb-20 px-6">
                <div className="container mx-auto max-w-4xl">
                    <div className="text-center mb-14">
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 text-white/80 text-sm mb-6">
                            <Calendar className="w-4 h-4" />
                            <span>Free Consultation</span>
                        </div>
                        <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
                            Book a Call With Our Team
                        </h1>
                        <p className="text-lg text-white/60 max-w-2xl mx-auto">
                            Get a personalized walkthrough of the WhiteLabel Peptides platform.
                            We&apos;ll answer your questions, discuss your business goals, and help you
                            get set up for success.
                        </p>
                    </div>

                    <div className="grid lg:grid-cols-2 gap-8">
                        {/* CTA card */}
                        <div className="rounded-2xl bg-gradient-to-br from-violet-600/20 to-indigo-600/20 border border-violet-500/20 p-8 flex flex-col items-center text-center">
                            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center mb-6 shadow-lg shadow-violet-500/25">
                                <Calendar className="w-8 h-8 text-white" />
                            </div>
                            <h2 className="text-2xl font-bold text-white mb-3">
                                Schedule Your Call
                            </h2>
                            <p className="text-white/50 mb-8 max-w-sm">
                                Pick a time that works for you. Calls typically last 20&ndash;30 minutes
                                and are completely free with no obligation.
                            </p>
                            <a
                                href={BOOKING_URL}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-semibold text-lg hover:opacity-90 transition-opacity shadow-lg shadow-violet-500/25 w-full sm:w-auto"
                            >
                                Book Your Call
                                <ArrowRight className="w-5 h-5" />
                            </a>
                            <div className="mt-6 pt-6 border-t border-white/10 w-full">
                                <p className="text-white/30 text-sm mb-2">Prefer email instead?</p>
                                <a
                                    href="mailto:whitelabel@peptidetech.co"
                                    className="inline-flex items-center gap-2 text-violet-400 hover:text-violet-300 text-sm font-medium transition-colors"
                                >
                                    <Mail className="w-4 h-4" />
                                    whitelabel@peptidetech.co
                                </a>
                            </div>
                        </div>

                        {/* What we'll cover */}
                        <div className="rounded-2xl bg-white/5 border border-white/10 p-8">
                            <h3 className="text-xl font-bold text-white mb-6">
                                What We&apos;ll Cover
                            </h3>
                            <div className="space-y-5">
                                {[
                                    {
                                        icon: Package,
                                        title: 'Product Catalog Walkthrough',
                                        desc: 'Explore our 60+ research peptides and discuss which products fit your market.',
                                    },
                                    {
                                        icon: Palette,
                                        title: 'Branding & Custom Labels',
                                        desc: 'Learn about white-label options including custom labels, packaging, and formulations.',
                                    },
                                    {
                                        icon: ShieldCheck,
                                        title: 'Compliance Guidance',
                                        desc: 'Understand RUO labeling requirements, FDA compliance, and how we help you stay protected.',
                                    },
                                    {
                                        icon: DollarSign,
                                        title: 'Pricing & Margins',
                                        desc: 'Review wholesale pricing, discuss your target margins, and plan your pricing strategy.',
                                    },
                                    {
                                        icon: BarChart3,
                                        title: 'Platform Demo',
                                        desc: 'See the merchant dashboard, WooCommerce plugin, order flow, and wallet system in action.',
                                    },
                                ].map((item, i) => (
                                    <div key={i} className="flex gap-4">
                                        <div className="w-10 h-10 rounded-lg bg-violet-500/10 flex items-center justify-center flex-shrink-0">
                                            <item.icon className="w-5 h-5 text-violet-400" />
                                        </div>
                                        <div>
                                            <h4 className="text-white font-medium">{item.title}</h4>
                                            <p className="text-white/40 text-sm mt-0.5">{item.desc}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="mt-8 pt-6 border-t border-white/10">
                                <div className="flex flex-wrap gap-4">
                                    {['No obligation', 'Free consultation', '20-30 min'].map((tag) => (
                                        <span key={tag} className="flex items-center gap-1.5 text-white/40 text-sm">
                                            <CheckCircle className="w-4 h-4 text-green-400/60" />
                                            {tag}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Bottom CTA */}
                    <div className="mt-16 text-center">
                        <p className="text-white/40 text-sm mb-4">
                            Not ready for a call? Start exploring on your own.
                        </p>
                        <div className="flex flex-col sm:flex-row gap-4 justify-center">
                            <Link
                                href="/register"
                                className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-white/10 text-white font-medium hover:bg-white/20 transition-colors"
                            >
                                Create Merchant Account
                            </Link>
                            <Link
                                href="/learning-center"
                                className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-white/5 text-white/70 font-medium hover:bg-white/10 hover:text-white transition-all border border-white/10"
                            >
                                Visit Learning Center
                            </Link>
                        </div>
                    </div>
                </div>
            </section>

            <PublicFooter />
        </div>
    );
}
