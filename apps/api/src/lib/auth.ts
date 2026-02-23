/**
 * WhiteLabel Peptides API - HMAC Authentication Middleware
 * Verifies signed requests from plugin/external clients
 */

import { NextRequest } from 'next/server';
import { verifySignature, ApiError, Errors } from '@whitelabel-peptides/shared';
import { getServiceClient } from './supabase';
import crypto from 'crypto';

export interface AuthenticatedStore {
    storeId: string;
    merchantId: string;
    storeName: string;
    storeUrl: string;
    body: string; // Raw body string (already consumed from request stream)
}

/**
 * Decrypt a store secret that was encrypted with AES-256-GCM.
 * Falls back to using the value directly if not encrypted (migration period).
 */
export function decryptSecret(encryptedValue: string): string {
    const encryptionKey = process.env.STORE_SECRET_ENCRYPTION_KEY;
    if (!encryptionKey) {
        // No encryption key configured -- assume plaintext storage (migration period)
        return encryptedValue;
    }

    try {
        // Format: iv:authTag:ciphertext (all hex)
        const parts = encryptedValue.split(':');
        if (parts.length !== 3) {
            return encryptedValue; // Not encrypted format, use as-is
        }

        const [ivHex, authTagHex, ciphertextHex] = parts;
        const key = Buffer.from(encryptionKey, 'hex');
        const iv = Buffer.from(ivHex, 'hex');
        const authTag = Buffer.from(authTagHex, 'hex');
        const ciphertext = Buffer.from(ciphertextHex, 'hex');

        const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
        decipher.setAuthTag(authTag);
        const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
        return decrypted.toString('utf8');
    } catch {
        return encryptedValue; // Decryption failed, use as-is
    }
}

/**
 * Verify HMAC-signed request from plugin.
 * Returns store info AND the raw body string (since request stream is consumed).
 * Callers should use JSON.parse(result.body) instead of request.json().
 */
export async function verifyStoreRequest(
    request: NextRequest
): Promise<AuthenticatedStore> {
    const storeId = request.headers.get('x-store-id');
    const timestamp = request.headers.get('x-timestamp');
    const nonce = request.headers.get('x-nonce');
    const signature = request.headers.get('x-signature');

    if (!storeId || !timestamp || !nonce || !signature) {
        throw new ApiError(
            'MISSING_AUTH_HEADERS',
            'Missing required authentication headers',
            401
        );
    }

    // Read body ONCE (consuming the stream). Callers must use result.body.
    const body = await request.text();

    const supabase = getServiceClient();

    // Look up the store
    const { data: store, error: storeError } = await supabase
        .from('stores')
        .select('id, merchant_id, name, url, status')
        .eq('id', storeId)
        .single();

    if (storeError || !store) {
        throw new ApiError('STORE_NOT_FOUND', 'Store not found', 404);
    }

    if (store.status !== 'CONNECTED') {
        throw Errors.STORE_DISCONNECTED;
    }

    // Look up the active secret for this store
    // Try secret_plaintext first (new column), fall back to secret_hash
    const { data: secretRecord, error: secretError } = await supabase
        .from('store_secrets')
        .select('secret_hash, secret_plaintext')
        .eq('store_id', storeId)
        .eq('is_active', true)
        .single();

    if (secretError || !secretRecord) {
        throw new ApiError('SECRET_LOOKUP_FAILED', 'Failed to verify store credentials. The credential lookup failed — ensure the store is properly connected.', 500);
    }

    // Get the actual secret for HMAC computation
    const secret = secretRecord.secret_plaintext
        ? decryptSecret(secretRecord.secret_plaintext)
        : null;

    if (secret) {
        // Full cryptographic HMAC verification
        const result = verifySignature({
            storeId,
            timestamp,
            nonce,
            body,
            signature,
            secret,
        });

        if (!result.valid) {
            throw new ApiError('SIGNATURE_INVALID', result.error || 'Invalid signature', 401);
        }
    } else {
        // Fallback: secret is hashed (can't compute HMAC). Verify format + timestamp only.
        // This is a degraded mode for stores created before secret_plaintext was added.
        const timestampMs = parseInt(timestamp, 10);
        const now = Date.now();
        const fiveMinutes = 5 * 60 * 1000;

        if (isNaN(timestampMs) || Math.abs(now - timestampMs) > fiveMinutes) {
            throw Errors.SIGNATURE_EXPIRED;
        }

        if (signature.length !== 64 || !/^[a-f0-9]+$/i.test(signature)) {
            throw Errors.SIGNATURE_INVALID;
        }

        console.warn(`Store ${storeId}: using degraded auth (no secret_plaintext). Migrate to encrypted secrets.`);
    }

    return {
        storeId: store.id,
        merchantId: store.merchant_id,
        storeName: store.name,
        storeUrl: store.url,
        body,
    };
}

/**
 * Verify internal/admin API key
 */
export async function verifyAdminRequest(request: NextRequest): Promise<void> {
    const authHeader = request.headers.get('authorization');

    if (!authHeader?.startsWith('Bearer ')) {
        throw Errors.UNAUTHORIZED;
    }

    const token = authHeader.slice(7);
    const supabase = getServiceClient();
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
        throw Errors.UNAUTHORIZED;
    }

    const { data: supplierUser, error: supplierError } = await supabase
        .from('supplier_users')
        .select('role, is_active')
        .eq('user_id', user.id)
        .single();

    if (supplierError || !supplierUser?.is_active) {
        throw Errors.FORBIDDEN;
    }
}

/**
 * Verify merchant user token
 */
export async function verifyMerchantRequest(
    request: NextRequest
): Promise<{ userId: string; merchantId: string }> {
    const authHeader = request.headers.get('authorization');

    if (!authHeader?.startsWith('Bearer ')) {
        throw Errors.UNAUTHORIZED;
    }

    const token = authHeader.slice(7);
    const supabase = getServiceClient();
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
        throw Errors.UNAUTHORIZED;
    }

    const { data: merchantUser, error: merchantError } = await supabase
        .from('merchant_users')
        .select('merchant_id')
        .eq('user_id', user.id)
        .single();

    if (merchantError || !merchantUser) {
        throw Errors.FORBIDDEN;
    }

    return {
        userId: user.id,
        merchantId: merchantUser.merchant_id,
    };
}

export function errorResponse(error: ApiError | Error): Response {
    if (error instanceof ApiError) {
        return Response.json(
            { success: false, error: { code: error.code, message: error.message } },
            { status: error.statusCode }
        );
    }

    console.error('Unexpected error:', error.message);

    return Response.json(
        {
            success: false,
            error: {
                code: 'INTERNAL_ERROR',
                message: 'An unexpected server error occurred. Please retry the request or contact support if this persists.',
            },
        },
        { status: 500 }
    );
}

export function successResponse<T>(data: T, status: number = 200): Response {
    return Response.json({ success: true, data }, { status });
}
