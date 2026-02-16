/**
 * Environment variable validation for the portal app.
 * Import this at the top of any server-side code to fail fast on missing vars.
 */

const required = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
] as const;

const optional = [
    'MERCURY_API_TOKEN',
    'MERCURY_ACCOUNT_ID',
    'MERCURY_WEBHOOK_SECRET',
    'SUPER_ADMIN_EMAIL',
    'SMTP_HOST',
    'SMTP_PORT',
    'SMTP_USER',
    'SMTP_PASS',
    'SMTP_FROM',
    'ALLOWED_ORIGINS',
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
        if (process.env.NODE_ENV === 'production') {
            throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
        }
    }
}

// Validate on import (server-side only)
if (typeof window === 'undefined') {
    validateEnv();
}

export const env = {
    SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL!,
    SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    SUPABASE_SERVICE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY!,
    MERCURY_API_TOKEN: process.env.MERCURY_API_TOKEN || '',
    SUPER_ADMIN_EMAIL: process.env.SUPER_ADMIN_EMAIL || 'info@chainhaven.co',
};
