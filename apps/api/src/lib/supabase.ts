import { createClient, SupabaseClient } from '@supabase/supabase-js';
import './env';

let _client: SupabaseClient | null = null;

/**
 * Lazy singleton Supabase admin client.
 * Defers creation until first call so module-level imports
 * don't crash during Next.js build when env vars are absent.
 */
export function getSupabaseAdmin(): SupabaseClient {
    if (!_client) {
        _client = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );
    }
    return _client;
}

/** @deprecated Use getSupabaseAdmin instead. Alias for backwards compatibility. */
export const getServiceClient = getSupabaseAdmin;
