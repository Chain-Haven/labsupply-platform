import Link from 'next/link';
import { ArrowLeft, Calendar, Clock, Tag, User } from 'lucide-react';
import { MDXRemote } from 'next-mdx-remote/rsc';
import remarkGfm from 'remark-gfm';
import rehypeSlug from 'rehype-slug';
import rehypeAutolinkHeadings from 'rehype-autolink-headings';
import { notFound } from 'next/navigation';
import { getArticleBySlug, getAllSlugs } from '@/lib/learning-center';
import { mdxComponents } from '@/components/mdx-components';
import PublicNavbar from '@/components/public-navbar';
import PublicFooter from '@/components/public-footer';
import type { Metadata } from 'next';

interface PageProps {
    params: { slug: string };
}

export function generateStaticParams() {
    return getAllSlugs().map((slug) => ({ slug }));
}

export function generateMetadata({ params }: PageProps): Metadata {
    const article = getArticleBySlug(params.slug);
    if (!article) return { title: 'Article Not Found' };

    return {
        title: `${article.title} — WhiteLabel Peptides Learning Center`,
        description: article.description,
    };
}

export default function ArticlePage({ params }: PageProps) {
    const article = getArticleBySlug(params.slug);
    if (!article) notFound();

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
            <PublicNavbar />

            <article className="pt-28 pb-20 px-6">
                <div className="container mx-auto max-w-3xl">
                    <Link
                        href="/learning-center"
                        className="inline-flex items-center gap-2 text-sm text-white/50 hover:text-white transition-colors mb-8"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Back to Learning Center
                    </Link>

                    <header className="mb-10">
                        <div className="flex items-center gap-3 mb-4">
                            <span className="px-3 py-1 rounded-full bg-violet-500/10 text-violet-400 text-sm font-medium border border-violet-500/20">
                                {article.category}
                            </span>
                        </div>
                        <h1 className="text-3xl md:text-4xl font-bold text-white mb-4 leading-tight">
                            {article.title}
                        </h1>
                        <p className="text-lg text-white/50 mb-6">
                            {article.description}
                        </p>
                        <div className="flex flex-wrap items-center gap-4 text-white/40 text-sm">
                            <span className="flex items-center gap-1.5">
                                <User className="w-4 h-4" />
                                {article.author}
                            </span>
                            <span className="flex items-center gap-1.5">
                                <Calendar className="w-4 h-4" />
                                {new Date(article.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                            </span>
                            <span className="flex items-center gap-1.5">
                                <Clock className="w-4 h-4" />
                                {article.readingTime} min read
                            </span>
                        </div>
                        {article.tags.length > 0 && (
                            <div className="flex flex-wrap gap-2 mt-4">
                                {article.tags.map((tag) => (
                                    <span
                                        key={tag}
                                        className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-white/40 text-xs"
                                    >
                                        <Tag className="w-3 h-3" />
                                        {tag}
                                    </span>
                                ))}
                            </div>
                        )}
                        <hr className="border-white/10 mt-8" />
                    </header>

                    <div className="prose-invert">
                        <MDXRemote
                            source={article.content}
                            components={mdxComponents}
                            options={{
                                mdxOptions: {
                                    remarkPlugins: [remarkGfm],
                                    rehypePlugins: [rehypeSlug, rehypeAutolinkHeadings],
                                },
                            }}
                        />
                    </div>

                    <div className="mt-12 pt-8 border-t border-white/10">
                        <Link
                            href="/learning-center"
                            className="inline-flex items-center gap-2 text-sm text-violet-400 hover:text-violet-300 transition-colors"
                        >
                            <ArrowLeft className="w-4 h-4" />
                            Back to all articles
                        </Link>
                    </div>
                </div>
            </article>

            <PublicFooter />
        </div>
    );
}
