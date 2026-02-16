/**
 * Wallet API
 * GET /v1/wallet - Get wallet balance
 * Wallet funding is handled via Mercury invoicing (see /api/inngest/functions/mercury-*)
 */

import { NextRequest } from 'next/server';
import { getServiceClient } from '@/lib/supabase';
import { verifyStoreRequest, successResponse, errorResponse } from '@/lib/auth';

export async function GET(request: NextRequest) {
    try {
        const store = await verifyStoreRequest(request);
        const supabase = getServiceClient();

        // Get wallet
        const { data: wallet, error } = await supabase
            .from('wallet_accounts')
            .select('*')
            .eq('merchant_id', store.merchantId)
            .single();

        if (error || !wallet) {
            return successResponse({
                balance_cents: 0,
                reserved_cents: 0,
                available_cents: 0,
                currency: 'USD',
                pending_payments: 0,
            });
        }

        // Get pending payments count
        const { count: pendingPayments } = await supabase
            .from('payments')
            .select('id', { count: 'exact' })
            .eq('merchant_id', store.merchantId)
            .in('status', ['PENDING', 'PROCESSING']);

        return successResponse({
            balance_cents: wallet.balance_cents,
            reserved_cents: wallet.reserved_cents,
            available_cents: wallet.balance_cents - wallet.reserved_cents,
            currency: wallet.currency,
            pending_payments: pendingPayments || 0,
        });

    } catch (error) {
        return errorResponse(error as Error);
    }
}
