import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Next.js Middleware for server-side route protection.
 * Runs BEFORE page rendering to prevent content flash for unauthenticated users.
 */
export async function middleware(request: NextRequest) {
    const res = NextResponse.next();
    const supabase = createMiddlewareClient({ req: request, res });

    const pathname = request.nextUrl.pathname;

    // Skip auth check for public routes and static assets
    if (
        pathname.startsWith('/_next') ||
        pathname.startsWith('/api') ||
        pathname === '/login' ||
        pathname === '/register' ||
        pathname === '/forgot-password' ||
        pathname === '/' ||
        pathname === '/docs' ||
        pathname === '/terms' ||
        pathname === '/privacy' ||
        pathname === '/admin/login' ||
        pathname.startsWith('/auth') ||
        pathname.startsWith('/onboarding')
    ) {
        return res;
    }

    // Check for Supabase session
    const { data: { session } } = await supabase.auth.getSession();

    // Protect /dashboard/* routes -- redirect to /login if no session
    if (pathname.startsWith('/dashboard')) {
        if (!session) {
            const loginUrl = new URL('/login', request.url);
            loginUrl.searchParams.set('redirect', pathname);
            return NextResponse.redirect(loginUrl);
        }
        return res;
    }

    // Protect /admin/* routes (except /admin/login) -- redirect to /admin/login if no session
    if (pathname.startsWith('/admin') && pathname !== '/admin/login') {
        if (!session) {
            // Also check for backup session cookie as fallback
            const backupCookie = request.cookies.get('admin_backup_session');
            if (!backupCookie?.value) {
                return NextResponse.redirect(new URL('/admin/login', request.url));
            }
        }
        return res;
    }

    return res;
}

export const config = {
    matcher: [
        // Match all routes except static files and images
        '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
};
