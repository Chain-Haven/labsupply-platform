/**
 * Environment variable validation for the API app.
 * Import this at the top of any server-side code to fail fast on missing vars.
 */

const required = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY',
    'STORE_SECRET_ENCRYPTION_KEY',
] as const;

function validateEnv() {
    const missing: string[] = [];

    for (const key of required) {
        if (!process.env[key]) {
            missing.push(key);
        }
    }

    if (missing.length > 0) {
        console.error(`Missing required environment variables: ${missing.join(', ')}`);
        throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
    }
}

// Validate on import (server-side only)
if (typeof window === 'undefined') {
    validateEnv();
}

export const env = {
    SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL!,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY!,
    STORE_SECRET_ENCRYPTION_KEY: process.env.STORE_SECRET_ENCRYPTION_KEY!,
};
