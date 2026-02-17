import { createBrowserClient as createSupabaseBrowserClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';

/**
 * Client-side Supabase client (for React client components).
 * Uses @supabase/ssr which properly handles PKCE code verifier cookies.
 */
export const createBrowserClient = () => {
    return createSupabaseBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
};

/**
 * Server-side Supabase client (for non-auth server operations).
 * Does NOT persist sessions — use the middleware/route-handler helpers
 * from @supabase/ssr for authenticated server-side access.
 */
export const createServerClient = () => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

    return createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
            persistSession: false,
        },
    });
};
