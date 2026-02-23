/**
 * Rotate Store Secret
 * POST /v1/stores/rotate-secret
 * 
 * Rotate the HMAC signing secret for a store
 */

import { NextRequest } from 'next/server';
import { getServiceClient } from '@/lib/supabase';
import { verifyStoreRequest, successResponse, errorResponse } from '@/lib/auth';
import { generateStoreSecret, hashSecret, ApiError } from '@whitelabel-peptides/shared';

export async function POST(request: NextRequest) {
    try {
        // Verify the current credentials
        const store = await verifyStoreRequest(request);

        const supabase = getServiceClient();

        // Generate new secret
        const newSecret = generateStoreSecret();
        const newSecretHash = hashSecret(newSecret);

        // Deactivate old secret(s)
        await supabase
            .from('store_secrets')
            .update({ is_active: false, rotated_at: new Date().toISOString() })
            .eq('store_id', store.storeId)
            .eq('is_active', true);

        // Create new secret (save plaintext for HMAC verification + hash for lookup)
        const { error: secretError } = await supabase
            .from('store_secrets')
            .insert({
                store_id: store.storeId,
                secret_hash: newSecretHash,
                secret_plaintext: newSecret,
                is_active: true,
            });

        if (secretError) {
            throw new ApiError('SECRET_ROTATE_FAILED', 'Failed to rotate store API secret. The database rejected the update — please try again.', 500);
        }

        // Log the rotation
        await supabase.from('audit_events').insert({
            merchant_id: store.merchantId,
            action: 'store.secret_rotated',
            entity_type: 'store',
            entity_id: store.storeId,
        });

        return successResponse({
            new_secret: newSecret,
            rotated_at: new Date().toISOString(),
        });

    } catch (error) {
        return errorResponse(error as Error);
    }
}
