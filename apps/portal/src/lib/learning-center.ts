import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';

export interface ArticleMeta {
    slug: string;
    title: string;
    description: string;
    date: string;
    category: string;
    tags: string[];
    author: string;
    coverImage?: string;
    readingTime: number;
}

export interface Article extends ArticleMeta {
    content: string;
}

const CONTENT_DIR = path.join(process.cwd(), 'content', 'learning-center');

function estimateReadingTime(text: string): number {
    const words = text.split(/\s+/).length;
    return Math.max(1, Math.ceil(words / 200));
}

export function getAllArticles(): ArticleMeta[] {
    if (!fs.existsSync(CONTENT_DIR)) return [];

    const files = fs.readdirSync(CONTENT_DIR).filter((f) => f.endsWith('.mdx'));

    return files
        .map((filename) => {
            const slug = filename.replace(/\.mdx$/, '');
            const raw = fs.readFileSync(path.join(CONTENT_DIR, filename), 'utf-8');
            const { data, content } = matter(raw);

            return {
                slug,
                title: data.title ?? slug,
                description: data.description ?? '',
                date: data.date ?? '',
                category: data.category ?? 'General',
                tags: data.tags ?? [],
                author: data.author ?? 'WhiteLabel Peptides',
                coverImage: data.coverImage,
                readingTime: estimateReadingTime(content),
            } satisfies ArticleMeta;
        })
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export function getArticleBySlug(slug: string): Article | null {
    const filePath = path.join(CONTENT_DIR, `${slug}.mdx`);
    if (!fs.existsSync(filePath)) return null;

    const raw = fs.readFileSync(filePath, 'utf-8');
    const { data, content } = matter(raw);

    return {
        slug,
        title: data.title ?? slug,
        description: data.description ?? '',
        date: data.date ?? '',
        category: data.category ?? 'General',
        tags: data.tags ?? [],
        author: data.author ?? 'WhiteLabel Peptides',
        coverImage: data.coverImage,
        readingTime: estimateReadingTime(content),
        content,
    };
}

export function getCategories(): string[] {
    const articles = getAllArticles();
    const categories = new Set(articles.map((a) => a.category));
    return ['All', ...Array.from(categories).sort()];
}

export function getAllSlugs(): string[] {
    if (!fs.existsSync(CONTENT_DIR)) return [];
    return fs
        .readdirSync(CONTENT_DIR)
        .filter((f) => f.endsWith('.mdx'))
        .map((f) => f.replace(/\.mdx$/, ''));
}
