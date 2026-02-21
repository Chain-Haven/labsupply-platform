import Link from 'next/link';
import { BookOpen, Calendar, Clock, Tag } from 'lucide-react';
import { getAllArticles, getCategories } from '@/lib/learning-center';
import PublicNavbar from '@/components/public-navbar';
import PublicFooter from '@/components/public-footer';
import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Learning Center — WhiteLabel Peptides',
    description: 'Educational resources about research peptides, compliance, COA testing, and building your peptide brand.',
};

export default function LearningCenterPage({
    searchParams,
}: {
    searchParams: { category?: string };
}) {
    const articles = getAllArticles();
    const categories = getCategories();
    const activeCategory = searchParams.category ?? 'All';

    const filtered = activeCategory === 'All'
        ? articles
        : articles.filter((a) => a.category === activeCategory);

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
            <PublicNavbar />

            <section className="pt-32 pb-12 px-6">
                <div className="container mx-auto text-center">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 text-white/80 text-sm mb-6">
                        <BookOpen className="w-4 h-4" />
                        <span>Peptide Learning Center</span>
                    </div>
                    <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
                        Learn About Research Peptides
                    </h1>
                    <p className="text-lg text-white/60 max-w-2xl mx-auto">
                        Guides, educational content, and resources to help you understand
                        research peptides, compliance requirements, and how to build your brand.
                    </p>
                </div>
            </section>

            <section className="pb-20 px-6">
                <div className="container mx-auto max-w-5xl">
                    {/* Category filter */}
                    <div className="flex flex-wrap justify-center gap-2 mb-12">
                        {categories.map((cat) => (
                            <Link
                                key={cat}
                                href={cat === 'All' ? '/learning-center' : `/learning-center?category=${encodeURIComponent(cat)}`}
                                className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                                    activeCategory === cat
                                        ? 'bg-violet-500 text-white shadow-md shadow-violet-500/25'
                                        : 'bg-white/5 text-white/60 hover:bg-white/10 hover:text-white border border-white/10'
                                }`}
                            >
                                {cat}
                            </Link>
                        ))}
                    </div>

                    {/* Article grid */}
                    {filtered.length === 0 ? (
                        <div className="text-center py-20">
                            <BookOpen className="w-12 h-12 text-white/20 mx-auto mb-4" />
                            <p className="text-white/40 text-lg">No articles found in this category yet.</p>
                            <p className="text-white/30 text-sm mt-2">Check back soon for new content.</p>
                        </div>
                    ) : (
                        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {filtered.map((article) => (
                                <Link
                                    key={article.slug}
                                    href={`/learning-center/${article.slug}`}
                                    className="group rounded-2xl bg-white/5 border border-white/10 overflow-hidden hover:border-violet-500/30 transition-all hover:shadow-lg hover:shadow-violet-500/5"
                                >
                                    <div className="h-40 bg-gradient-to-br from-violet-500/20 to-indigo-600/20 flex items-center justify-center">
                                        <BookOpen className="w-12 h-12 text-violet-400/40 group-hover:text-violet-400/60 transition-colors" />
                                    </div>
                                    <div className="p-5">
                                        <div className="flex items-center gap-2 mb-3">
                                            <span className="px-2.5 py-0.5 rounded-full bg-violet-500/10 text-violet-400 text-xs font-medium border border-violet-500/20">
                                                {article.category}
                                            </span>
                                        </div>
                                        <h2 className="text-lg font-semibold text-white mb-2 group-hover:text-violet-300 transition-colors">
                                            {article.title}
                                        </h2>
                                        <p className="text-white/50 text-sm line-clamp-2 mb-4">
                                            {article.description}
                                        </p>
                                        <div className="flex items-center gap-4 text-white/30 text-xs">
                                            <span className="flex items-center gap-1">
                                                <Calendar className="w-3.5 h-3.5" />
                                                {new Date(article.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <Clock className="w-3.5 h-3.5" />
                                                {article.readingTime} min read
                                            </span>
                                        </div>
                                        {article.tags.length > 0 && (
                                            <div className="flex flex-wrap gap-1.5 mt-3">
                                                {article.tags.slice(0, 3).map((tag) => (
                                                    <span key={tag} className="flex items-center gap-1 text-white/25 text-xs">
                                                        <Tag className="w-3 h-3" />
                                                        {tag}
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </Link>
                            ))}
                        </div>
                    )}
                </div>
            </section>

            <PublicFooter />
        </div>
    );
}
