/**
 * LabSupply API - Supabase Server Client
 * Creates authenticated Supabase client for API routes
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Service role client for admin operations
let serviceClient: SupabaseClient | null = null;

export function getServiceClient(): SupabaseClient {
    if (!serviceClient) {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

        if (!supabaseUrl || !serviceRoleKey) {
            throw new Error('Missing Supabase environment variables');
        }

        serviceClient = createClient(supabaseUrl, serviceRoleKey, {
            auth: {
                autoRefreshToken: false,
                persistSession: false,
            },
        });
    }

    return serviceClient;
}

// Anon client for user-authenticated requests
export function getAnonClient(accessToken?: string): SupabaseClient {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !anonKey) {
        throw new Error('Missing Supabase environment variables');
    }

    const client = createClient(supabaseUrl, anonKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false,
        },
    });

    // Set the user's access token if provided
    if (accessToken) {
        client.auth.setSession({
            access_token: accessToken,
            refresh_token: '',
        });
    }

    return client;
}

// Re-export for convenience
export { SupabaseClient };
