import { NextRequest, NextResponse } from 'next/server';
import * as crypto from 'crypto';
import { getSupabaseAdmin } from './supabase';

// Types
export interface AdminAuthResult {
    authenticated: boolean;
    adminId?: string;
    apiKeyId?: string;
    role?: string;
    permissions?: Record<string, { read: boolean; write: boolean } | undefined>;
    error?: string;
}

export interface ApiKeyPermissions {
    [key: string]: { read: boolean; write: boolean } | undefined;
    inventory?: { read: boolean; write: boolean };
    merchants?: { read: boolean; write: boolean };
    orders?: { read: boolean; write: boolean };
}

/**
 * Verify HMAC signature for API requests
 */
function verifySignature(
    apiKey: string,
    timestamp: string,
    method: string,
    path: string,
    body: string,
    signature: string
): boolean {
    const message = `${timestamp}${method}${path}${body}`;
    const expectedSignature = crypto
        .createHmac('sha256', apiKey)
        .update(message)
        .digest('hex');

    return crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(expectedSignature)
    );
}

/**
 * Hash API key for storage comparison
 */
function hashApiKey(key: string): string {
    return crypto.createHash('sha256').update(key).digest('hex');
}

/**
 * Check if timestamp is within acceptable window (5 minutes)
 */
function isTimestampValid(timestamp: string): boolean {
    const now = Date.now();
    const requestTime = parseInt(timestamp, 10);
    const fiveMinutes = 5 * 60 * 1000;

    return Math.abs(now - requestTime) < fiveMinutes;
}

/**
 * Authenticate admin API request
 * Supports both session-based auth (for portal) and API key auth (for programmatic access)
 */
export async function authenticateAdminRequest(
    request: NextRequest
): Promise<AdminAuthResult> {
    // Check for API key authentication first
    const authHeader = request.headers.get('authorization');
    const timestamp = request.headers.get('x-timestamp');
    const signature = request.headers.get('x-signature');

    if (authHeader?.startsWith('Bearer lsk_')) {
        // API Key authentication
        return authenticateWithApiKey(request, authHeader, timestamp, signature);
    }

    // Fall back to session-based authentication
    return authenticateWithSession(request);
}

/**
 * Authenticate using API key + HMAC signature
 */
async function authenticateWithApiKey(
    request: NextRequest,
    authHeader: string,
    timestamp: string | null,
    signature: string | null
): Promise<AdminAuthResult> {
    const apiKey = authHeader.replace('Bearer ', '');
    const keyPrefix = apiKey.substring(0, 12); // "lsk_" + 8 chars

    // Validate required headers
    if (!timestamp || !signature) {
        return {
            authenticated: false,
            error: 'Missing X-Timestamp or X-Signature headers',
        };
    }

    // Check timestamp freshness
    if (!isTimestampValid(timestamp)) {
        return {
            authenticated: false,
            error: 'Request timestamp expired or invalid',
        };
    }

    // Look up API key by prefix
    const { data: keyRecord, error } = await getSupabaseAdmin()
        .from('api_keys')
        .select('*')
        .eq('key_prefix', keyPrefix)
        .is('revoked_at', null)
        .single();

    if (error || !keyRecord) {
        return {
            authenticated: false,
            error: 'Invalid API key',
        };
    }

    // Check expiration
    if (keyRecord.expires_at && new Date(keyRecord.expires_at) < new Date()) {
        return {
            authenticated: false,
            error: 'API key has expired',
        };
    }

    // Verify key hash
    const keyHash = hashApiKey(apiKey);
    if (keyHash !== keyRecord.key_hash) {
        return {
            authenticated: false,
            error: 'Invalid API key',
        };
    }

    // Verify HMAC signature
    const body = await request.clone().text();
    const method = request.method;
    const path = new URL(request.url).pathname;

    if (!verifySignature(apiKey, timestamp, method, path, body, signature)) {
        return {
            authenticated: false,
            error: 'Invalid signature',
        };
    }

    // Check IP allowlist if configured
    const clientIp = request.headers.get('x-forwarded-for')?.split(',')[0] ||
        request.headers.get('x-real-ip');

    if (keyRecord.ip_allowlist?.length > 0 && clientIp) {
        if (!keyRecord.ip_allowlist.includes(clientIp)) {
            return {
                authenticated: false,
                error: 'IP address not allowed',
            };
        }
    }

    // Update last used timestamp
    await getSupabaseAdmin()
        .from('api_keys')
        .update({
            last_used_at: new Date().toISOString(),
            last_used_ip: clientIp,
            usage_count: (keyRecord.usage_count || 0) + 1,
        })
        .eq('id', keyRecord.id);

    return {
        authenticated: true,
        apiKeyId: keyRecord.id,
        permissions: keyRecord.permissions as ApiKeyPermissions,
    };
}

/**
 * Authenticate using session cookie (Supabase Auth)
 */
async function authenticateWithSession(
    request: NextRequest
): Promise<AdminAuthResult> {
    // Get session from cookie
    const supabaseAuthToken = request.cookies.get('sb-access-token')?.value ||
        request.cookies.get('supabase-auth-token')?.value;

    if (!supabaseAuthToken) {
        return {
            authenticated: false,
            error: 'No session found',
        };
    }

    // Verify the session
    const { data: { user }, error } = await getSupabaseAdmin().auth.getUser(supabaseAuthToken);

    if (error || !user) {
        return {
            authenticated: false,
            error: 'Invalid session',
        };
    }

    // Check if user is an admin
    const { data: adminUser, error: adminError } = await getSupabaseAdmin()
        .from('admin_users')
        .select('*')
        .eq('id', user.id)
        .eq('is_active', true)
        .single();

    if (adminError || !adminUser) {
        return {
            authenticated: false,
            error: 'User is not an admin',
        };
    }

    // Update last login
    await getSupabaseAdmin()
        .from('admin_users')
        .update({ last_login_at: new Date().toISOString() })
        .eq('id', user.id);

    return {
        authenticated: true,
        adminId: user.id,
        role: adminUser.role,
        permissions: adminUser.permissions as Record<string, { read: boolean; write: boolean }>,
    };
}

/**
 * Middleware to protect admin routes
 */
export function withAdminAuth(
    handler: (
        request: NextRequest,
        auth: AdminAuthResult
    ) => Promise<NextResponse>,
    options?: {
        requiredPermission?: keyof ApiKeyPermissions;
        requireWrite?: boolean;
    }
) {
    return async (request: NextRequest): Promise<NextResponse> => {
        const auth = await authenticateAdminRequest(request);

        if (!auth.authenticated) {
            return NextResponse.json(
                { error: auth.error || 'Unauthorized' },
                { status: 401 }
            );
        }

        // Check specific permission if required
        if (options?.requiredPermission && auth.permissions) {
            const perm = auth.permissions[options.requiredPermission];
            if (!perm) {
                return NextResponse.json(
                    { error: 'Insufficient permissions' },
                    { status: 403 }
                );
            }

            if (options.requireWrite && !perm.write) {
                return NextResponse.json(
                    { error: 'Write permission required' },
                    { status: 403 }
                );
            }

            if (!perm.read) {
                return NextResponse.json(
                    { error: 'Read permission required' },
                    { status: 403 }
                );
            }
        }

        return handler(request, auth);
    };
}

/**
 * Generate a new API key
 */
export async function generateApiKey(
    name: string,
    permissions: ApiKeyPermissions,
    createdBy: string,
    options?: {
        description?: string;
        expiresAt?: Date;
        ipAllowlist?: string[];
    }
): Promise<{ key: string; keyId: string }> {
    // Generate random key: lsk_ + 48 random hex chars
    const randomBytes = crypto.randomBytes(24);
    const key = `lsk_${randomBytes.toString('hex')}`;
    const keyPrefix = key.substring(0, 12);
    const keyHash = hashApiKey(key);

    const { data, error } = await getSupabaseAdmin()
        .from('api_keys')
        .insert({
            name,
            description: options?.description,
            key_hash: keyHash,
            key_prefix: keyPrefix,
            permissions,
            created_by: createdBy,
            expires_at: options?.expiresAt?.toISOString(),
            ip_allowlist: options?.ipAllowlist,
        })
        .select('id')
        .single();

    if (error) {
        throw new Error(`Failed to create API key: ${error.message}`);
    }

    return { key, keyId: data.id };
}

/**
 * Revoke an API key
 */
export async function revokeApiKey(
    keyId: string,
    revokedBy: string
): Promise<void> {
    const { error } = await getSupabaseAdmin()
        .from('api_keys')
        .update({
            revoked_at: new Date().toISOString(),
            revoked_by: revokedBy,
        })
        .eq('id', keyId);

    if (error) {
        throw new Error(`Failed to revoke API key: ${error.message}`);
    }
}

/**
 * Log an admin action for audit trail
 */
export async function logAdminAction(
    auth: AdminAuthResult,
    action: string,
    resourceType: string,
    resourceId: string | null,
    changes?: { before?: unknown; after?: unknown },
    request?: NextRequest
): Promise<void> {
    await getSupabaseAdmin().from('admin_audit_log').insert({
        admin_user_id: auth.adminId,
        api_key_id: auth.apiKeyId,
        action,
        resource_type: resourceType,
        resource_id: resourceId,
        changes,
        ip_address: request?.headers.get('x-forwarded-for')?.split(',')[0] ||
            request?.headers.get('x-real-ip'),
        user_agent: request?.headers.get('user-agent'),
    });
}
