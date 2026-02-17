/**
 * Server-side Supabase client for Next.js Route Handlers.
 * Uses @supabase/ssr with cookie-based session storage.
 */

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export function createRouteHandlerClient() {
    const cookieStore = cookies();

    return createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return cookieStore.getAll();
                },
                setAll(cookiesToSet) {
                    try {
                        cookiesToSet.forEach(({ name, value, options }) =>
                            cookieStore.set(name, value, options)
                        );
                    } catch {
                        // setAll can throw in read-only contexts
                    }
                },
            },
        }
    );
}
