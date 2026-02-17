import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Next.js Middleware for server-side route protection.
 * Uses @supabase/ssr to properly refresh tokens and set cookies.
 *
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

function getAdminServiceClient() {
    return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { auth: { autoRefreshToken: false, persistSession: false } }
    );
}

export async function middleware(request: NextRequest) {
    const pathname = request.nextUrl.pathname;

    // Skip auth check for public routes and static assets
    if (isPublicRoute(pathname)) {
        return NextResponse.next();
    }

    // Create a Supabase client that reads/writes cookies via the request/response.
    // This is critical: the client may refresh the auth token and must be able
    // to set updated cookies on the response.
    let supabaseResponse = NextResponse.next({ request });

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll();
                },
                setAll(cookiesToSet) {
                    // Set cookies on the request (for downstream server components)
                    cookiesToSet.forEach(({ name, value }) =>
                        request.cookies.set(name, value)
                    );
                    // Recreate the response so it carries the updated request cookies
                    supabaseResponse = NextResponse.next({ request });
                    // Also set cookies on the response (for the browser)
                    cookiesToSet.forEach(({ name, value, options }) =>
                        supabaseResponse.cookies.set(name, value, options)
                    );
                },
            },
        }
    );

    // IMPORTANT: use getUser() not getSession() — getUser() validates the
    // token with the Supabase auth server and refreshes it if needed.
    const { data: { user } } = await supabase.auth.getUser();

    // =========================================================================
    // Protect /dashboard/* -- must have a session AND be a merchant
    // =========================================================================
    if (pathname.startsWith('/dashboard')) {
        if (!user) {
            const loginUrl = new URL('/login', request.url);
            loginUrl.searchParams.set('redirect', pathname);
            return NextResponse.redirect(loginUrl);
        }

        // Check cached role hint first
        const roleHint = request.cookies.get(ROLE_HINT_COOKIE)?.value;
        if (roleHint === 'merchant' || roleHint === 'both') {
            return supabaseResponse;
        }

        // No cache hit -- verify merchant role via DB
        try {
            const serviceClient = getAdminServiceClient();
            const { data: merchantRow } = await serviceClient
                .from('merchants')
                .select('id')
                .eq('user_id', user.id)
                .maybeSingle();

            if (!merchantRow) {
                return NextResponse.redirect(
                    new URL('/login?error=not_merchant', request.url)
                );
            }

            supabaseResponse.cookies.set(ROLE_HINT_COOKIE, 'merchant', {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'lax',
                maxAge: ROLE_HINT_MAX_AGE,
                path: '/',
            });

            return supabaseResponse;
        } catch (err) {
            console.error('Middleware merchant check error:', err);
            return supabaseResponse;
        }
    }

    // =========================================================================
    // Protect /admin/* (except /admin/login) -- must be an admin
    // =========================================================================
    if (pathname.startsWith('/admin') && pathname !== '/admin/login') {
        const hasBackupSession = !!request.cookies.get('admin_backup_session')?.value;

        if (!user && !hasBackupSession) {
            return NextResponse.redirect(new URL('/admin/login', request.url));
        }

        // Check cached role hint first
        const roleHint = request.cookies.get(ROLE_HINT_COOKIE)?.value;
        if (roleHint === 'admin' || roleHint === 'both') {
            return supabaseResponse;
        }

        // Backup session users are already verified as admins
        if (hasBackupSession && !user) {
            supabaseResponse.cookies.set(ROLE_HINT_COOKIE, 'admin', {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'lax',
                maxAge: ROLE_HINT_MAX_AGE,
                path: '/',
            });
            return supabaseResponse;
        }

        // Session-based admin -- verify via admin_users table
        if (user) {
            try {
                const serviceClient = getAdminServiceClient();
                const email = user.email?.toLowerCase() || '';

                const { data: adminRow } = await serviceClient
                    .from('admin_users')
                    .select('id')
                    .eq('email', email)
                    .maybeSingle();

                if (!adminRow) {
                    return NextResponse.redirect(
                        new URL('/admin/login?error=not_admin', request.url)
                    );
                }

                supabaseResponse.cookies.set(ROLE_HINT_COOKIE, 'admin', {
                    httpOnly: true,
                    secure: process.env.NODE_ENV === 'production',
                    sameSite: 'lax',
                    maxAge: ROLE_HINT_MAX_AGE,
                    path: '/',
                });

                return supabaseResponse;
            } catch (err) {
                console.error('Middleware admin check error:', err);
                return supabaseResponse;
            }
        }

        return supabaseResponse;
    }

    return supabaseResponse;
}

export const config = {
    matcher: [
        '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
};
