/**
 * Rate limiting via Supabase DB.
 * Uses a rate_limit_log table + check_rate_limit RPC for distributed,
 * deploy-safe rate limiting.
 *
 * Falls back to in-memory limiting if DB call fails (best-effort).
 */

import { createClient } from '@supabase/supabase-js';

function getServiceClient() {
    return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
}

// In-memory fallback for when DB is unavailable
const memoryStore = new Map<string, number[]>();

function memoryFallback(key: string, limit: number, windowMs: number): { allowed: boolean; remaining: number } {
    const now = Date.now();
    const cutoff = now - windowMs;
    const timestamps = (memoryStore.get(key) || []).filter(t => t > cutoff);

    if (timestamps.length >= limit) {
        memoryStore.set(key, timestamps);
        return { allowed: false, remaining: 0 };
    }

    timestamps.push(now);
    memoryStore.set(key, timestamps);
    return { allowed: true, remaining: limit - timestamps.length };
}

export interface RateLimitResult {
    allowed: boolean;
    remaining: number;
    retryAfterMs?: number;
}

/**
 * Check rate limit for a given key.
 * @param key Unique identifier (e.g. `auth:login:${ip}` or `refund:${userId}`)
 * @param limit Max requests in window
 * @param windowMs Window duration in milliseconds (default: 1 hour)
 */
export async function checkRateLimit(
    key: string,
    limit: number = 10,
    windowMs: number = 60 * 60 * 1000
): Promise<RateLimitResult> {
    try {
        const supabase = getServiceClient();
        const windowSeconds = Math.ceil(windowMs / 1000);

        const { data, error } = await supabase.rpc('check_rate_limit', {
            p_key: key,
            p_limit: limit,
            p_window_seconds: windowSeconds,
        });

        if (error) throw error;

        const row = Array.isArray(data) ? data[0] : data;
        return {
            allowed: row?.allowed ?? true,
            remaining: Math.max(0, limit - (Number(row?.current_count) || 0)),
            retryAfterMs: row?.allowed ? undefined : windowMs,
        };
    } catch {
        return memoryFallback(key, limit, windowMs);
    }
}

// Pre-configured tiers
export const RATE_LIMIT_TIERS = {
    strict: { limit: 5, windowMs: 15 * 60 * 1000 },
    standard: { limit: 30, windowMs: 60 * 1000 },
    relaxed: { limit: 100, windowMs: 60 * 1000 },
    invite: { limit: 10, windowMs: 60 * 60 * 1000 },
} as const;
