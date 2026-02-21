import Link from 'next/link';
import { DISCLAIMER_SECTIONS, COMPANY, EFFECTIVE_DATE } from '@/lib/legal-documents';
import PublicNavbar from '@/components/public-navbar';
import PublicFooter from '@/components/public-footer';

export const metadata = {
  title: 'Disclaimer — Peptide Tech LLC',
  description: 'Legal disclaimer for Peptide Tech LLC and the WhiteLabel Peptides platform.',
};

export default function DisclaimerPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <PublicNavbar />

      <div className="container mx-auto px-6 pt-28 pb-16 max-w-4xl">
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-white/10 shadow-2xl">
          <div className="px-8 py-10 border-b border-gray-200 dark:border-gray-700">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              Disclaimer
            </h1>
            <p className="text-gray-500 dark:text-gray-400">
              {COMPANY.name} &mdash; Effective {EFFECTIVE_DATE}
            </p>
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
              {COMPANY.address}
            </p>
          </div>

          <div className="px-8 py-8 space-y-10">
            {DISCLAIMER_SECTIONS.map((section, idx) => (
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

          <div className="px-8 py-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 rounded-b-2xl">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              &copy; {new Date().getFullYear()} {COMPANY.name}. All rights reserved.
              {' '}
              <Link href="/terms" className="text-violet-600 hover:underline">Terms of Service</Link>
              {' | '}
              <Link href="/privacy" className="text-violet-600 hover:underline">Privacy Policy</Link>
              {' | '}
              <Link href="/eula" className="text-violet-600 hover:underline">EULA</Link>
            </p>
          </div>
        </div>
      </div>

      <PublicFooter />
    </div>
  );
}
