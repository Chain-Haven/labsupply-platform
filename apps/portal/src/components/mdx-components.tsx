import type { ComponentPropsWithoutRef } from 'react';
import Link from 'next/link';

type HTMLTag = keyof JSX.IntrinsicElements;
type Props<T extends HTMLTag> = ComponentPropsWithoutRef<T>;

export const mdxComponents = {
    h1: (props: Props<'h1'>) => (
        <h1 className="text-3xl font-bold text-white mt-10 mb-4 first:mt-0" {...props} />
    ),
    h2: (props: Props<'h2'>) => (
        <h2 className="text-2xl font-bold text-white mt-8 mb-3 scroll-mt-24" {...props} />
    ),
    h3: (props: Props<'h3'>) => (
        <h3 className="text-xl font-semibold text-white mt-6 mb-2 scroll-mt-24" {...props} />
    ),
    h4: (props: Props<'h4'>) => (
        <h4 className="text-lg font-semibold text-white/90 mt-4 mb-2" {...props} />
    ),
    p: (props: Props<'p'>) => (
        <p className="text-white/60 leading-relaxed mb-4" {...props} />
    ),
    a: ({ href, children, ...rest }: Props<'a'>) => {
        const isExternal = href?.startsWith('http');
        if (isExternal) {
            return (
                <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-violet-400 hover:text-violet-300 underline underline-offset-2 transition-colors"
                    {...rest}
                >
                    {children}
                </a>
            );
        }
        return (
            <Link
                href={href ?? '#'}
                className="text-violet-400 hover:text-violet-300 underline underline-offset-2 transition-colors"
            >
                {children}
            </Link>
        );
    },
    ul: (props: Props<'ul'>) => (
        <ul className="list-disc list-inside space-y-2 text-white/60 mb-4 ml-2" {...props} />
    ),
    ol: (props: Props<'ol'>) => (
        <ol className="list-decimal list-inside space-y-2 text-white/60 mb-4 ml-2" {...props} />
    ),
    li: (props: Props<'li'>) => (
        <li className="leading-relaxed" {...props} />
    ),
    blockquote: (props: Props<'blockquote'>) => (
        <blockquote
            className="border-l-4 border-violet-500/40 pl-4 py-1 my-4 text-white/50 italic"
            {...props}
        />
    ),
    code: (props: Props<'code'>) => (
        <code
            className="bg-white/10 text-violet-300 px-1.5 py-0.5 rounded text-sm font-mono"
            {...props}
        />
    ),
    pre: (props: Props<'pre'>) => (
        <pre
            className="bg-black/30 border border-white/10 rounded-xl p-4 overflow-x-auto mb-4 text-sm"
            {...props}
        />
    ),
    hr: () => <hr className="border-white/10 my-8" />,
    table: (props: Props<'table'>) => (
        <div className="overflow-x-auto mb-4">
            <table className="w-full text-sm text-white/60" {...props} />
        </div>
    ),
    th: (props: Props<'th'>) => (
        <th className="text-left text-white font-semibold px-3 py-2 border-b border-white/10" {...props} />
    ),
    td: (props: Props<'td'>) => (
        <td className="px-3 py-2 border-b border-white/5" {...props} />
    ),
    strong: (props: Props<'strong'>) => (
        <strong className="text-white font-semibold" {...props} />
    ),
    em: (props: Props<'em'>) => (
        <em className="text-white/70" {...props} />
    ),
};
