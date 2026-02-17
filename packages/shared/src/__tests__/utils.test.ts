/**
 * Tests for shared utility functions
 */

import { describe, it, expect, vi } from 'vitest';
import {
    generateSignature,
    verifySignature,
    hashSecret,
    verifySecretHash,
    generateRandomString,
    generateConnectCode,
    generateStoreSecret,
    generateNonce,
    dollarsToCents,
    centsToDollars,
    formatCurrency,
    slugify,
    truncate,
    maskSensitive,
    calculateBackoffDelay,
    isExpired,
    addDuration,
    Errors,
    ApiError,
} from '../utils';

describe('HMAC Utilities', () => {
    const testSecret = 'test-secret-12345';

    it('should generate consistent signatures', () => {
        const params = {
            storeId: 'store-123',
            timestamp: '1234567890000',
            nonce: 'abc123',
            body: '{"test": true}',
            secret: testSecret,
        };

        const sig1 = generateSignature(params);
        const sig2 = generateSignature(params);

        expect(sig1).toBe(sig2);
        expect(sig1).toMatch(/^[a-f0-9]{64}$/);
    });

    it('should verify valid signatures', () => {
        const storeId = 'store-123';
        const timestamp = Date.now().toString();
        const nonce = generateNonce();
        const body = '{"test": true}';

        const signature = generateSignature({ storeId, timestamp, nonce, body, secret: testSecret });

        const result = verifySignature(
            { storeId, timestamp, nonce, body, signature, secret: testSecret }
        );
        expect(result.valid).toBe(true);
    });

    it('should reject invalid signatures', () => {
        const storeId = 'store-123';
        const timestamp = Date.now().toString();
        const nonce = generateNonce();
        const body = '{"test": true}';

        const result = verifySignature(
            { storeId, timestamp, nonce, body, signature: 'wrong-signature', secret: testSecret }
        );
        expect(result.valid).toBe(false);
    });

    it('should reject tampered bodies', () => {
        const storeId = 'store-123';
        const timestamp = Date.now().toString();
        const nonce = generateNonce();
        const body = '{"test": true}';

        const signature = generateSignature({ storeId, timestamp, nonce, body, secret: testSecret });

        const result = verifySignature(
            { storeId, timestamp, nonce, body: '{"test": false}', signature, secret: testSecret }
        );
        expect(result.valid).toBe(false);
    });
});

describe('Secret Hashing', () => {
    it('should hash and verify secrets', async () => {
        const secret = 'my-super-secret';
        const hash = hashSecret(secret);

        expect(hash).not.toBe(secret);
        expect(hash).toMatch(/^[a-f0-9]{64}$/);

        const isValid = verifySecretHash(secret, hash);
        expect(isValid).toBe(true);
    });

    it('should reject wrong secrets', () => {
        const hash = hashSecret('correct-secret');
        const isValid = verifySecretHash('wrong-secret', hash);
        expect(isValid).toBe(false);
    });
});

describe('Random Generation', () => {
    it('should generate random strings of specified length', () => {
        const str = generateRandomString(32);
        expect(str).toHaveLength(32);
        expect(str).toMatch(/^[a-f0-9]+$/);
    });

    it('should generate unique connect codes', () => {
        const code1 = generateConnectCode();
        const code2 = generateConnectCode();

        expect(code1).not.toBe(code2);
        expect(code1).toMatch(/^[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/);
    });

    it('should generate store secrets', () => {
        const secret = generateStoreSecret();
        expect(secret.length).toBeGreaterThan(20);
    });

    it('should generate nonces', () => {
        const nonce1 = generateNonce();
        const nonce2 = generateNonce();

        expect(nonce1).not.toBe(nonce2);
        expect(nonce1).toHaveLength(32);
    });
});

describe('Currency Utilities', () => {
    it('should convert dollars to cents', () => {
        expect(dollarsToCents(10)).toBe(1000);
        expect(dollarsToCents(10.99)).toBe(1099);
        expect(dollarsToCents(0.01)).toBe(1);
    });

    it('should convert cents to dollars', () => {
        expect(centsToDollars(1000)).toBe(10);
        expect(centsToDollars(1099)).toBe(10.99);
        expect(centsToDollars(1)).toBe(0.01);
    });

    it('should format currency', () => {
        expect(formatCurrency(1000)).toBe('$10.00');
        expect(formatCurrency(1099)).toBe('$10.99');
        expect(formatCurrency(50000)).toBe('$500.00');
    });
});

describe('String Utilities', () => {
    it('should slugify strings', () => {
        expect(slugify('Hello World')).toBe('hello-world');
        expect(slugify('BPC-157 5mg Peptide')).toBe('bpc-157-5mg-peptide');
        expect(slugify('  Multiple   Spaces  ')).toBe('multiple-spaces');
    });

    it('should truncate long strings', () => {
        expect(truncate('Short', 10)).toBe('Short');
        expect(truncate('This is a very long string', 10)).toBe('This is...');
        expect(truncate('Exactly 10', 10)).toBe('Exactly 10');
    });

    it('should mask sensitive data', () => {
        expect(maskSensitive('secret_abc123')).toMatch(/^secr\*+$/);
        expect(maskSensitive('short')).toMatch(/^shor\*$/);
        expect(maskSensitive('ab')).toBe('**');
    });
});

describe('Backoff Delay', () => {
    it('should calculate exponential backoff', () => {
        expect(calculateBackoffDelay(1)).toBeGreaterThan(0);
        expect(calculateBackoffDelay(2)).toBeGreaterThan(calculateBackoffDelay(1) * 0.5);
    });

    it('should respect max delay', () => {
        const maxDelay = 60000;
        const delay = calculateBackoffDelay(100, { maxDelayMs: maxDelay });
        expect(delay).toBeLessThanOrEqual(maxDelay);
    });
});

describe('Date Utilities', () => {
    it('should check expiration', () => {
        const pastDate = new Date(Date.now() - 1000).toISOString();
        const futureDate = new Date(Date.now() + 60000).toISOString();

        expect(isExpired(pastDate)).toBe(true);
        expect(isExpired(futureDate)).toBe(false);
    });

    it('should add duration', () => {
        const now = new Date();
        const later = addDuration(now, 1, 'hours');

        expect(later.getTime()).toBe(now.getTime() + 3600000);
    });
});

describe('ApiError', () => {
    it('should create error with correct properties', () => {
        const error = new ApiError('TEST_ERROR', 'Test message', 400, { field: 'value' });

        expect(error.code).toBe('TEST_ERROR');
        expect(error.message).toBe('Test message');
        expect(error.statusCode).toBe(400);
        expect(error.details).toEqual({ field: 'value' });
    });

    it('should serialize to JSON', () => {
        const error = new ApiError('NOT_FOUND', 'Resource not found', 404);
        const json = error.toJSON();

        expect(json.code).toBe('NOT_FOUND');
        expect(json.message).toBe('Resource not found');
    });

    it('should include predefined errors', () => {
        expect(Errors.UNAUTHORIZED).toBeInstanceOf(ApiError);
        expect(Errors.UNAUTHORIZED.statusCode).toBe(401);

        expect(Errors.INSUFFICIENT_FUNDS).toBeInstanceOf(ApiError);
        expect(Errors.INSUFFICIENT_FUNDS.statusCode).toBe(402);
    });
});
