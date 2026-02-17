import Link from 'next/link';
import { Package, ArrowLeft } from 'lucide-react';
import { TERMS_OF_SERVICE_SECTIONS, COMPANY, EFFECTIVE_DATE } from '@/lib/legal-documents';

export const metadata = {
  title: 'Terms of Service — Peptide Tech LLC',
  description: 'Terms of Service and Merchant Agreement for Peptide Tech LLC.',
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 backdrop-blur-xl bg-black/30 border-b border-white/10">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center">
              <Package className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-white">WhiteLabel Peptides</span>
          </Link>
          <Link
            href="/"
            className="flex items-center gap-2 text-sm text-white/60 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Link>
        </div>
      </nav>

      {/* Content */}
      <div className="container mx-auto px-6 pt-28 pb-16 max-w-4xl">
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-white/10 shadow-2xl">
          {/* Header */}
          <div className="px-8 py-10 border-b border-gray-200 dark:border-gray-700">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              Terms of Service &amp; Merchant Agreement
            </h1>
            <p className="text-gray-500 dark:text-gray-400">
              {COMPANY.name} &mdash; Effective {EFFECTIVE_DATE}
            </p>
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
              {COMPANY.address}
            </p>
          </div>

          {/* Sections */}
          <div className="px-8 py-8 space-y-10">
            {TERMS_OF_SERVICE_SECTIONS.map((section, idx) => (
              <section key={idx}>
                <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4 uppercase tracking-wide">
                  {section.title}
                </h2>
                <div className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
                  {section.content}
                </div>
              </section>
            ))}
          </div>

          {/* Footer */}
          <div className="px-8 py-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 rounded-b-2xl">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              &copy; {new Date().getFullYear()} {COMPANY.name}. All rights reserved.
              {' '}
              <Link href="/privacy" className="text-violet-600 hover:underline">
                Privacy Policy
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
