/**
 * SQL utility functions for safe query construction.
 */

/**
 * Escape special characters in LIKE/ILIKE patterns to prevent
 * wildcard injection. Use this before interpolating user input
 * into .ilike() or .like() Supabase queries.
 */
export function escapeLikePattern(input: string): string {
    return input.replace(/[%_\\]/g, '\\$&');
}
