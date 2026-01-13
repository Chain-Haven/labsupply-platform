/**
 * Wallet Top-Up Session API
 * POST /v1/wallet/topup/session
 * 
 * Create a Stripe Checkout session for wallet funding
 */

import { NextRequest } from 'next/server';
import { getServiceClient } from '@/lib/supabase';
import { verifyStoreRequest, verifyMerchantRequest, successResponse, errorResponse } from '@/lib/auth';
import { createTopUpCheckoutSession } from '@/lib/stripe';
import { topUpSessionSchema, ApiError } from '@labsupply/shared';

export async function POST(request: NextRequest) {
    try {
        // This endpoint can be called from portal (bearer token) or plugin (HMAC)
        let merchantId: string;
        let walletId: string;
        let merchantEmail: string | undefined;

        const authHeader = request.headers.get('authorization');
        const storeIdHeader = request.headers.get('x-store-id');

        const supabase = getServiceClient();

        if (authHeader?.startsWith('Bearer ')) {
            // Portal request
            const auth = await verifyMerchantRequest(request);
            merchantId = auth.merchantId;
        } else if (storeIdHeader) {
            // Plugin request
            const bodyClone = request.clone();
            const store = await verifyStoreRequest(bodyClone);
            merchantId = store.merchantId;
        } else {
            throw new ApiError('UNAUTHORIZED', 'Invalid authentication', 401);
        }

        // Parse request body
        const body = await request.json();
        const parsed = topUpSessionSchema.safeParse(body);

        if (!parsed.success) {
            throw new ApiError('VALIDATION_ERROR', 'Invalid request', 400, {
                errors: parsed.error.flatten().fieldErrors,
            });
        }

        // Get merchant details
        const { data: merchant } = await supabase
            .from('merchants')
            .select('contact_email')
            .eq('id', merchantId)
            .single();

        merchantEmail = merchant?.contact_email;

        // Get or create wallet
        let { data: wallet, error: walletError } = await supabase
            .from('wallet_accounts')
            .select('id')
            .eq('merchant_id', merchantId)
            .single();

        if (walletError || !wallet) {
            // Create wallet if doesn't exist
            const { data: newWallet, error: createError } = await supabase
                .from('wallet_accounts')
                .insert({ merchant_id: merchantId, currency: 'USD' })
                .select()
                .single();

            if (createError || !newWallet) {
                throw new ApiError('WALLET_CREATE_FAILED', 'Failed to create wallet', 500);
            }
            wallet = newWallet;
        }

        walletId = wallet.id;

        // Create Stripe checkout session
        const session = await createTopUpCheckoutSession({
            merchantId,
            walletId,
            amountCents: parsed.data.amount_cents,
            currency: 'USD',
            returnUrl: parsed.data.return_url,
            merchantEmail,
        });

        // Record pending payment
        await supabase.from('payments').insert({
            merchant_id: merchantId,
            wallet_id: walletId,
            provider: 'stripe',
            provider_checkout_id: session.sessionId,
            method: parsed.data.payment_method || 'card',
            status: 'PENDING',
            amount_cents: parsed.data.amount_cents,
            currency: 'USD',
        });

        return successResponse({
            checkout_url: session.url,
            session_id: session.sessionId,
        });

    } catch (error) {
        return errorResponse(error as Error);
    }
}
