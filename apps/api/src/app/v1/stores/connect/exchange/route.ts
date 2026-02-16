/**
 * Store Connection - Exchange Connect Code
 * POST /v1/stores/connect/exchange
 * 
 * Exchange a connect code for store credentials
 */

import { NextRequest } from 'next/server';
import { getServiceClient } from '@/lib/supabase';
import { successResponse, errorResponse } from '@/lib/auth';
import { connectExchangeSchema, ApiError, generateStoreSecret, hashSecret } from '@whitelabel-peptides/shared';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();

        // Validate input
        const parsed = connectExchangeSchema.safeParse(body);
        if (!parsed.success) {
            throw new ApiError('VALIDATION_ERROR', 'Invalid request body', 400, {
                errors: parsed.error.flatten().fieldErrors,
            });
        }

        const { connect_code, store_url, store_name, woo_version, currency, timezone } = parsed.data;

        const supabase = getServiceClient();

        // Find and validate the connect code
        const { data: connectCode, error: codeError } = await supabase
            .from('connect_codes')
            .select('*, merchants(id, name, status)')
            .eq('code', connect_code.toUpperCase().replace(/-/g, ''))
            .is('used_at', null)
            .gt('expires_at', new Date().toISOString())
            .single();

        if (codeError || !connectCode) {
            throw new ApiError('CONNECT_CODE_INVALID', 'Invalid or expired connect code', 400);
        }

        const merchant = connectCode.merchants as { id: string; name: string; status: string };

        if (merchant.status !== 'ACTIVE') {
            throw new ApiError('MERCHANT_INACTIVE', 'Merchant account is not active', 400);
        }

        // Generate store credentials
        const storeSecret = generateStoreSecret();
        const secretHash = hashSecret(storeSecret);

        // Create the store record
        const { data: store, error: storeError } = await supabase
            .from('stores')
            .insert({
                merchant_id: merchant.id,
                type: 'woocommerce',
                name: store_name,
                url: store_url,
                status: 'CONNECTED',
                currency: currency || 'USD',
                timezone,
                woo_version,
            })
            .select()
            .single();

        if (storeError || !store) {
            throw new ApiError('STORE_CREATE_FAILED', 'Failed to create store', 500);
        }

        // Create the store secret (save plaintext for HMAC verification + hash for lookup)
        const { error: secretError } = await supabase
            .from('store_secrets')
            .insert({
                store_id: store.id,
                secret_hash: secretHash,
                secret_plaintext: storeSecret,
                is_active: true,
            });

        if (secretError) {
            // Rollback store creation
            await supabase.from('stores').delete().eq('id', store.id);
            throw new ApiError('SECRET_CREATE_FAILED', 'Failed to create credentials', 500);
        }

        // Mark connect code as used
        await supabase
            .from('connect_codes')
            .update({
                used_at: new Date().toISOString(),
                store_id: store.id,
            })
            .eq('id', connectCode.id);

        // Log the connection
        await supabase.from('audit_events').insert({
            merchant_id: merchant.id,
            action: 'store.connected',
            entity_type: 'store',
            entity_id: store.id,
            metadata: {
                store_url,
                store_name,
                woo_version,
            },
        });

        // Return credentials
        return successResponse({
            store_id: store.id,
            store_secret: storeSecret,
            api_base_url: process.env.APP_BASE_URL || 'http://localhost:3001',
        });

    } catch (error) {
        return errorResponse(error as Error);
    }
}
