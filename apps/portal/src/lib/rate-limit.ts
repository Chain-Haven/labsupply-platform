/**
 * Simple in-memory rate limiter for API routes.
 * Uses a sliding window approach. Resets on server restart.
 */

interface RateLimitEntry {
    timestamps: number[];
}

const store = new Map<string, RateLimitEntry>();

const CLEANUP_INTERVAL = 60 * 1000;
let lastCleanup = Date.now();

function cleanup(windowMs: number) {
    const now = Date.now();
    if (now - lastCleanup < CLEANUP_INTERVAL) return;
    lastCleanup = now;
    const cutoff = now - windowMs;
    for (const [key, entry] of store) {
        entry.timestamps = entry.timestamps.filter(t => t > cutoff);
        if (entry.timestamps.length === 0) store.delete(key);
    }
}

export function checkRateLimit(
    key: string,
    limit: number = 10,
    windowMs: number = 60 * 60 * 1000
): { allowed: boolean; remaining: number; retryAfterMs?: number } {
    cleanup(windowMs);

    const now = Date.now();
    const cutoff = now - windowMs;

    let entry = store.get(key);
    if (!entry) {
        entry = { timestamps: [] };
        store.set(key, entry);
    }

    entry.timestamps = entry.timestamps.filter(t => t > cutoff);

    if (entry.timestamps.length >= limit) {
        const oldestInWindow = entry.timestamps[0];
        return {
            allowed: false,
            remaining: 0,
            retryAfterMs: oldestInWindow + windowMs - now,
        };
    }

    entry.timestamps.push(now);
    return {
        allowed: true,
        remaining: limit - entry.timestamps.length,
    };
}
