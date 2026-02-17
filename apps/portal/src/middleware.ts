import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Next.js Middleware for server-side route protection.
 * Enforces both authentication AND role-based access:
 *   - /dashboard/* requires a merchant record
 *   - /admin/* requires an admin_users record (or backup session)
 *
 * Uses a short-lived cookie (`_role_hint`) to avoid a DB lookup on every
 * single navigation. The cookie is set after the first successful check
 * and is valid for 5 minutes.
 */

const ROLE_HINT_COOKIE = '_role_hint';
const ROLE_HINT_MAX_AGE = 300; // 5 minutes

const PUBLIC_ROUTES = new Set([
    '/',
    '/login',
    '/register',
    '/forgot-password',
    '/docs',
    '/terms',
    '/privacy',
    '/admin/login',
]);

function isPublicRoute(pathname: string): boolean {
    if (
        pathname.startsWith('/_next') ||
        pathname.startsWith('/api') ||
        pathname.startsWith('/auth') ||
        pathname.startsWith('/onboarding')
    ) {
        return true;
    }
    return PUBLIC_ROUTES.has(pathname);
}

function getServiceClient() {
    return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { auth: { autoRefreshToken: false, persistSession: false } }
    );
}

export async function middleware(request: NextRequest) {
    const res = NextResponse.next();
    const supabase = createMiddlewareClient({ req: request, res });
    const pathname = request.nextUrl.pathname;

    // Skip auth check for public routes and static assets
    if (isPublicRoute(pathname)) {
        return res;
    }

    // Check for Supabase session
    const { data: { session } } = await supabase.auth.getSession();

    // =========================================================================
    // Protect /dashboard/* -- must have a session AND be a merchant
    // =========================================================================
    if (pathname.startsWith('/dashboard')) {
        if (!session) {
            const loginUrl = new URL('/login', request.url);
            loginUrl.searchParams.set('redirect', pathname);
            return NextResponse.redirect(loginUrl);
        }

        // Check cached role hint first
        const roleHint = request.cookies.get(ROLE_HINT_COOKIE)?.value;
        if (roleHint === 'merchant' || roleHint === 'both') {
            return res;
        }

        // No cache hit -- verify merchant role via DB
        try {
            const serviceClient = getServiceClient();
            const { data: merchantRow } = await serviceClient
                .from('merchants')
                .select('id')
                .eq('user_id', session.user.id)
                .maybeSingle();

            if (!merchantRow) {
                // User is authenticated but not a merchant
                return NextResponse.redirect(
                    new URL('/login?error=not_merchant', request.url)
                );
            }

            // Set the role hint cookie to avoid DB lookups on subsequent navigations
            res.cookies.set(ROLE_HINT_COOKIE, 'merchant', {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'lax',
                maxAge: ROLE_HINT_MAX_AGE,
                path: '/',
            });

            return res;
        } catch (err) {
            console.error('Middleware merchant check error:', err);
            // On error, allow through rather than blocking (layout will handle)
            return res;
        }
    }

    // =========================================================================
    // Protect /admin/* (except /admin/login) -- must be an admin
    // =========================================================================
    if (pathname.startsWith('/admin') && pathname !== '/admin/login') {
        const hasBackupSession = !!request.cookies.get('admin_backup_session')?.value;

        if (!session && !hasBackupSession) {
            return NextResponse.redirect(new URL('/admin/login', request.url));
        }

        // Check cached role hint first
        const roleHint = request.cookies.get(ROLE_HINT_COOKIE)?.value;
        if (roleHint === 'admin' || roleHint === 'both') {
            return res;
        }

        // Backup session users are already verified as admins
        if (hasBackupSession && !session) {
            res.cookies.set(ROLE_HINT_COOKIE, 'admin', {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'lax',
                maxAge: ROLE_HINT_MAX_AGE,
                path: '/',
            });
            return res;
        }

        // Session-based admin -- verify via admin_users table
        if (session) {
            try {
                const serviceClient = getServiceClient();
                const email = session.user.email?.toLowerCase() || '';

                const { data: adminRow } = await serviceClient
                    .from('admin_users')
                    .select('id')
                    .eq('email', email)
                    .maybeSingle();

                if (!adminRow) {
                    // Authenticated but not an admin
                    return NextResponse.redirect(
                        new URL('/admin/login?error=not_admin', request.url)
                    );
                }

                res.cookies.set(ROLE_HINT_COOKIE, 'admin', {
                    httpOnly: true,
                    secure: process.env.NODE_ENV === 'production',
                    sameSite: 'lax',
                    maxAge: ROLE_HINT_MAX_AGE,
                    path: '/',
                });

                return res;
            } catch (err) {
                console.error('Middleware admin check error:', err);
                return res;
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
