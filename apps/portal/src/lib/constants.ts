/**
 * Canonical origin for auth redirects and URL construction.
 *
 * Uses NEXT_PUBLIC_APP_URL (available in both client and server contexts)
 * with a hardcoded production fallback so auth never silently breaks.
 */
export const CANONICAL_ORIGIN =
    process.env.NEXT_PUBLIC_APP_URL || 'https://whitelabel.peptidetech.co';
