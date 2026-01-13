/**
 * LabSupply Platform - Utility Functions
 * HMAC signatures, crypto, and common helpers
 */

import { createHmac, randomBytes, createHash } from 'crypto';

// ============================================================================
// HMAC Signature Utilities
// ============================================================================

export interface SignatureParams {
    storeId: string;
    timestamp: string;
    nonce: string;
    body: string;
    secret: string;
}

/**
 * Generate HMAC-SHA256 signature for API requests
 * Signature format: HMAC-SHA256(storeId + timestamp + nonce + bodyHash)
 */
export function generateSignature(params: SignatureParams): string {
    const { storeId, timestamp, nonce, body, secret } = params;

    // Hash the body first for consistent signing regardless of JSON formatting
    const bodyHash = createHash('sha256').update(body).digest('hex');

    // Create the signing string
    const signingString = `${storeId}:${timestamp}:${nonce}:${bodyHash}`;

    // Generate HMAC signature
    const hmac = createHmac('sha256', secret);
    hmac.update(signingString);

    return hmac.digest('hex');
}

/**
 * Verify HMAC signature from incoming request
 * Returns true if signature is valid and timestamp is within window
 */
export function verifySignature(
    params: Omit<SignatureParams, 'secret'> & { signature: string; secret: string },
    options: { maxAgeMs?: number } = {}
): { valid: boolean; error?: string } {
    const { storeId, timestamp, nonce, body, signature, secret } = params;
    const { maxAgeMs = 5 * 60 * 1000 } = options; // 5 minutes default

    // Check timestamp is within window
    const timestampMs = parseInt(timestamp, 10);
    if (isNaN(timestampMs)) {
        return { valid: false, error: 'Invalid timestamp format' };
    }

    const now = Date.now();
    const age = Math.abs(now - timestampMs);

    if (age > maxAgeMs) {
        return { valid: false, error: 'Request timestamp expired' };
    }

    // Generate expected signature
    const expectedSignature = generateSignature({ storeId, timestamp, nonce, body, secret });

    // Constant-time comparison
    if (!timingSafeEqual(signature, expectedSignature)) {
        return { valid: false, error: 'Invalid signature' };
    }

    return { valid: true };
}

/**
 * Timing-safe string comparison to prevent timing attacks
 */
export function timingSafeEqual(a: string, b: string): boolean {
    if (a.length !== b.length) {
        return false;
    }

    const bufA = Buffer.from(a);
    const bufB = Buffer.from(b);

    let result = 0;
    for (let i = 0; i < bufA.length; i++) {
        result |= bufA[i] ^ bufB[i];
    }

    return result === 0;
}

// ============================================================================
// Random Generation
// ============================================================================

/**
 * Generate a cryptographically secure random string
 */
export function generateRandomString(length: number = 32): string {
    return randomBytes(Math.ceil(length / 2))
        .toString('hex')
        .slice(0, length);
}

/**
 * Generate a connect code for store linking
 * Format: XXXX-XXXX-XXXX (alphanumeric, easy to type)
 */
export function generateConnectCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Omit confusing chars
    let code = '';

    for (let i = 0; i < 12; i++) {
        if (i > 0 && i % 4 === 0) {
            code += '-';
        }
        const randomIndex = randomBytes(1)[0] % chars.length;
        code += chars[randomIndex];
    }

    return code;
}

/**
 * Generate a secure store secret
 */
export function generateStoreSecret(): string {
    return randomBytes(32).toString('base64url');
}

/**
 * Generate a nonce for request signing
 */
export function generateNonce(): string {
    return randomBytes(16).toString('hex');
}

// ============================================================================
// Idempotency Key Generation
// ============================================================================

/**
 * Generate idempotency key for orders
 * Format: store:{storeId}:order:{wooOrderId}:event:{eventType}
 */
export function generateOrderIdempotencyKey(
    storeId: string,
    wooOrderId: string,
    eventType: string = 'create'
): string {
    return `store:${storeId}:order:${wooOrderId}:event:${eventType}`;
}

/**
 * Generate idempotency key for webhooks
 */
export function generateWebhookIdempotencyKey(
    source: string,
    eventId: string,
    eventType: string
): string {
    return `webhook:${source}:${eventId}:${eventType}`;
}

/**
 * Generate idempotency key for payments
 */
export function generatePaymentIdempotencyKey(
    provider: string,
    paymentId: string
): string {
    return `payment:${provider}:${paymentId}`;
}

// ============================================================================
// Hashing Utilities
// ============================================================================

/**
 * Hash a store secret for storage (one-way)
 */
export function hashSecret(secret: string): string {
    return createHash('sha256').update(secret).digest('hex');
}

/**
 * Verify a secret against its hash
 */
export function verifySecretHash(secret: string, hash: string): boolean {
    const computedHash = hashSecret(secret);
    return timingSafeEqual(computedHash, hash);
}

// ============================================================================
// Currency Utilities
// ============================================================================

/**
 * Convert cents to dollars with proper formatting
 */
export function formatCurrency(cents: number, currency: string = 'USD'): string {
    const amount = cents / 100;
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency,
    }).format(amount);
}

/**
 * Convert dollars to cents (integer)
 */
export function dollarsToCents(dollars: number): number {
    return Math.round(dollars * 100);
}

/**
 * Convert cents to dollars (float)
 */
export function centsToDollars(cents: number): number {
    return cents / 100;
}

// ============================================================================
// Date Utilities
// ============================================================================

/**
 * Get current timestamp in milliseconds
 */
export function nowMs(): number {
    return Date.now();
}

/**
 * Get current timestamp as ISO string
 */
export function nowISO(): string {
    return new Date().toISOString();
}

/**
 * Add duration to a date
 */
export function addDuration(
    date: Date,
    amount: number,
    unit: 'seconds' | 'minutes' | 'hours' | 'days'
): Date {
    const ms = {
        seconds: 1000,
        minutes: 60 * 1000,
        hours: 60 * 60 * 1000,
        days: 24 * 60 * 60 * 1000,
    }[unit];

    return new Date(date.getTime() + amount * ms);
}

/**
 * Check if a date is expired
 */
export function isExpired(date: Date | string): boolean {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.getTime() < Date.now();
}

// ============================================================================
// Error Utilities
// ============================================================================

export class ApiError extends Error {
    constructor(
        public code: string,
        message: string,
        public statusCode: number = 400,
        public details?: Record<string, unknown>
    ) {
        super(message);
        this.name = 'ApiError';
    }

    toJSON() {
        return {
            code: this.code,
            message: this.message,
            details: this.details,
        };
    }
}

// Common errors
export const Errors = {
    UNAUTHORIZED: new ApiError('UNAUTHORIZED', 'Unauthorized', 401),
    FORBIDDEN: new ApiError('FORBIDDEN', 'Forbidden', 403),
    NOT_FOUND: new ApiError('NOT_FOUND', 'Resource not found', 404),
    CONFLICT: new ApiError('CONFLICT', 'Resource already exists', 409),
    VALIDATION_ERROR: (details: Record<string, string[]>) =>
        new ApiError('VALIDATION_ERROR', 'Validation failed', 400, details),
    SIGNATURE_INVALID: new ApiError('SIGNATURE_INVALID', 'Invalid request signature', 401),
    SIGNATURE_EXPIRED: new ApiError('SIGNATURE_EXPIRED', 'Request signature expired', 401),
    CONNECT_CODE_INVALID: new ApiError('CONNECT_CODE_INVALID', 'Invalid or expired connect code', 400),
    CONNECT_CODE_USED: new ApiError('CONNECT_CODE_USED', 'Connect code has already been used', 400),
    INSUFFICIENT_FUNDS: new ApiError('INSUFFICIENT_FUNDS', 'Insufficient wallet balance', 402),
    ORDER_NOT_CANCELLABLE: new ApiError('ORDER_NOT_CANCELLABLE', 'Order cannot be cancelled in current status', 400),
    PRODUCT_NOT_WHITELISTED: new ApiError('PRODUCT_NOT_WHITELISTED', 'Product not available for this merchant', 400),
    INVENTORY_INSUFFICIENT: new ApiError('INVENTORY_INSUFFICIENT', 'Insufficient inventory', 400),
    STORE_DISCONNECTED: new ApiError('STORE_DISCONNECTED', 'Store is disconnected', 400),
    RATE_LIMITED: new ApiError('RATE_LIMITED', 'Too many requests', 429),
};

// ============================================================================
// String Utilities
// ============================================================================

/**
 * Truncate a string to max length with ellipsis
 */
export function truncate(str: string, maxLength: number): string {
    if (str.length <= maxLength) return str;
    return str.slice(0, maxLength - 3) + '...';
}

/**
 * Slugify a string for URLs
 */
export function slugify(str: string): string {
    return str
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
}

/**
 * Mask sensitive data for logging
 */
export function maskSensitive(str: string, visibleChars: number = 4): string {
    if (str.length <= visibleChars) {
        return '*'.repeat(str.length);
    }
    return str.slice(0, visibleChars) + '*'.repeat(Math.min(str.length - visibleChars, 20));
}

// ============================================================================
// Object Utilities
// ============================================================================

/**
 * Deep clone an object
 */
export function deepClone<T>(obj: T): T {
    return JSON.parse(JSON.stringify(obj));
}

/**
 * Pick specific keys from an object
 */
export function pick<T extends object, K extends keyof T>(
    obj: T,
    keys: K[]
): Pick<T, K> {
    const result = {} as Pick<T, K>;
    for (const key of keys) {
        if (key in obj) {
            result[key] = obj[key];
        }
    }
    return result;
}

/**
 * Omit specific keys from an object
 */
export function omit<T extends object, K extends keyof T>(
    obj: T,
    keys: K[]
): Omit<T, K> {
    const result = { ...obj };
    for (const key of keys) {
        delete result[key];
    }
    return result as Omit<T, K>;
}

/**
 * Remove undefined values from an object
 */
export function removeUndefined<T extends object>(obj: T): Partial<T> {
    const result: Partial<T> = {};
    for (const [key, value] of Object.entries(obj)) {
        if (value !== undefined) {
            (result as Record<string, unknown>)[key] = value;
        }
    }
    return result;
}

// ============================================================================
// Retry Utilities
// ============================================================================

export interface RetryOptions {
    maxAttempts: number;
    initialDelayMs: number;
    maxDelayMs: number;
    backoffMultiplier: number;
}

const defaultRetryOptions: RetryOptions = {
    maxAttempts: 3,
    initialDelayMs: 1000,
    maxDelayMs: 30000,
    backoffMultiplier: 2,
};

/**
 * Calculate delay for exponential backoff
 */
export function calculateBackoffDelay(
    attempt: number,
    options: Partial<RetryOptions> = {}
): number {
    const opts = { ...defaultRetryOptions, ...options };
    const delay = opts.initialDelayMs * Math.pow(opts.backoffMultiplier, attempt - 1);
    // Add jitter (±10%)
    const jitter = delay * 0.1 * (Math.random() * 2 - 1);
    return Math.min(delay + jitter, opts.maxDelayMs);
}

/**
 * Sleep for a specified duration
 */
export function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Retry a function with exponential backoff
 */
export async function withRetry<T>(
    fn: () => Promise<T>,
    options: Partial<RetryOptions> = {}
): Promise<T> {
    const opts = { ...defaultRetryOptions, ...options };
    let lastError: Error | undefined;

    for (let attempt = 1; attempt <= opts.maxAttempts; attempt++) {
        try {
            return await fn();
        } catch (error) {
            lastError = error as Error;

            if (attempt < opts.maxAttempts) {
                const delay = calculateBackoffDelay(attempt, opts);
                await sleep(delay);
            }
        }
    }

    throw lastError;
}
