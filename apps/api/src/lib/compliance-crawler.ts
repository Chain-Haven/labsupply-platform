/**
 * Compliance Web Crawler
 * BFS crawler that discovers and extracts text content from merchant websites
 * for compliance analysis.
 */

import * as cheerio from 'cheerio';

export interface CrawledPage {
    url: string;
    title: string;
    textContent: string;
}

interface CrawlOptions {
    maxPages: number;
    requestDelayMs: number;
    timeoutMs: number;
}

const DEFAULT_OPTIONS: CrawlOptions = {
    maxPages: 50,
    requestDelayMs: 1000,
    timeoutMs: 30000,
};

const SKIP_EXTENSIONS = new Set([
    '.jpg', '.jpeg', '.png', '.gif', '.svg', '.webp', '.ico',
    '.pdf', '.doc', '.docx', '.xls', '.xlsx',
    '.mp3', '.mp4', '.avi', '.mov', '.wmv',
    '.zip', '.rar', '.tar', '.gz',
    '.css', '.js', '.map', '.woff', '.woff2', '.ttf', '.eot',
    '.xml', '.rss', '.atom',
]);

const SKIP_PATTERNS = [
    /\/wp-admin\//,
    /\/wp-includes\//,
    /\/wp-json\//,
    /\/cart\/?$/,
    /\/checkout\/?$/,
    /\/my-account\/?/,
    /\/login\/?$/,
    /\/register\/?$/,
    /\/feed\/?$/,
    /\/xmlrpc\.php/,
    /\?add-to-cart=/,
    /\?removed_item=/,
    /#/,
    /\/page\/\d+\/?$/,
];

const PRIORITY_PATTERNS = [
    /\/product\//i,
    /\/products\//i,
    /\/shop\//i,
    /\/category\//i,
    /\/product-category\//i,
    /\/collections\//i,
];

function shouldSkipUrl(url: string): boolean {
    try {
        const parsed = new URL(url);
        const pathname = parsed.pathname.toLowerCase();

        for (const ext of SKIP_EXTENSIONS) {
            if (pathname.endsWith(ext)) return true;
        }

        for (const pattern of SKIP_PATTERNS) {
            if (pattern.test(url)) return true;
        }

        return false;
    } catch {
        return true;
    }
}

function isPriorityUrl(url: string): boolean {
    return PRIORITY_PATTERNS.some((pattern) => pattern.test(url));
}

function normalizeUrl(href: string, baseUrl: string): string | null {
    try {
        const url = new URL(href, baseUrl);
        url.hash = '';
        url.search = '';
        const normalized = url.toString().replace(/\/+$/, '');
        return normalized;
    } catch {
        return null;
    }
}

function isSameDomain(url: string, baseDomain: string): boolean {
    try {
        const parsed = new URL(url);
        return parsed.hostname === baseDomain || parsed.hostname.endsWith(`.${baseDomain}`);
    } catch {
        return false;
    }
}

function extractTextContent($: cheerio.CheerioAPI): string {
    $('script, style, noscript, iframe, svg, nav, footer, header').remove();
    $('[role="navigation"], [role="banner"], [role="contentinfo"]').remove();
    $('.nav, .navbar, .footer, .header, .sidebar, .menu, .breadcrumb').remove();
    $('#nav, #navbar, #footer, #header, #sidebar, #menu').remove();

    const text = $('body').text();
    return text
        .replace(/\s+/g, ' ')
        .replace(/\n{3,}/g, '\n\n')
        .trim();
}

function extractLinks($: cheerio.CheerioAPI, baseUrl: string, baseDomain: string): string[] {
    const links: string[] = [];

    $('a[href]').each((_i, el) => {
        const href = $(el).attr('href');
        if (!href) return;

        const normalized = normalizeUrl(href, baseUrl);
        if (!normalized) return;

        if (isSameDomain(normalized, baseDomain) && !shouldSkipUrl(normalized)) {
            links.push(normalized);
        }
    });

    return [...new Set(links)];
}

function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Crawl a merchant website using BFS, extracting text content from each page.
 * Prioritizes product pages, category pages, and landing pages.
 */
export async function crawlMerchantSite(
    rootUrl: string,
    options: Partial<CrawlOptions> = {}
): Promise<CrawledPage[]> {
    const opts = { ...DEFAULT_OPTIONS, ...options };
    const pages: CrawledPage[] = [];
    const visited = new Set<string>();

    let normalizedRoot = rootUrl.replace(/\/+$/, '');
    if (!normalizedRoot.startsWith('http')) {
        normalizedRoot = `https://${normalizedRoot}`;
    }

    let baseDomain: string;
    try {
        baseDomain = new URL(normalizedRoot).hostname;
    } catch {
        console.error(`Invalid root URL: ${rootUrl}`);
        return [];
    }

    const priorityQueue: string[] = [];
    const normalQueue: string[] = [];

    priorityQueue.push(normalizedRoot);

    while (
        (priorityQueue.length > 0 || normalQueue.length > 0) &&
        pages.length < opts.maxPages
    ) {
        const currentUrl = priorityQueue.shift() || normalQueue.shift();
        if (!currentUrl) break;

        const normalizedCurrent = currentUrl.replace(/\/+$/, '');
        if (visited.has(normalizedCurrent)) continue;
        visited.add(normalizedCurrent);

        try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), opts.timeoutMs);

            const response = await fetch(currentUrl, {
                signal: controller.signal,
                headers: {
                    'User-Agent': 'WhiteLabelComplianceBot/1.0 (compliance-check)',
                    'Accept': 'text/html,application/xhtml+xml',
                },
                redirect: 'follow',
            });

            clearTimeout(timeout);

            const contentType = response.headers.get('content-type') || '';
            if (!contentType.includes('text/html')) continue;

            const html = await response.text();
            const $ = cheerio.load(html);

            const title = $('title').text().trim() || currentUrl;
            const textContent = extractTextContent($);

            if (textContent.length > 50) {
                pages.push({ url: currentUrl, title, textContent });
            }

            const links = extractLinks($, currentUrl, baseDomain);
            for (const link of links) {
                const normalizedLink = link.replace(/\/+$/, '');
                if (visited.has(normalizedLink)) continue;

                if (isPriorityUrl(link)) {
                    priorityQueue.push(link);
                } else {
                    normalQueue.push(link);
                }
            }

            await sleep(opts.requestDelayMs);
        } catch (error) {
            const errMsg = error instanceof Error ? error.message : String(error);
            if (errMsg.includes('abort')) {
                console.warn(`Timeout crawling ${currentUrl}`);
            } else {
                console.warn(`Error crawling ${currentUrl}: ${errMsg}`);
            }
        }
    }

    return pages;
}
