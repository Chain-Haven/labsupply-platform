/**
 * Atomic wallet operations via Postgres RPC.
 * All balance changes go through adjust_wallet_balance which uses
 * SELECT ... FOR UPDATE to prevent race conditions.
 */

import { SupabaseClient } from '@supabase/supabase-js';

export interface WalletAdjustResult {
    newBalance: number;
    transactionId: string;
}

/**
 * Atomically adjust a wallet balance. Uses row-level locking to prevent
 * concurrent modifications. Supports idempotency keys to prevent
 * double-processing.
 *
 * @param amount_cents Positive to credit, negative to debit
 * @throws Error if balance would go negative or wallet not found
 */
export async function adjustWalletBalance(
    supabase: SupabaseClient,
    params: {
        walletId: string;
        merchantId: string;
        amountCents: number;
        type: string;
        referenceType: string;
        referenceId: string;
        description: string;
        metadata?: Record<string, unknown>;
        idempotencyKey?: string;
    }
): Promise<WalletAdjustResult> {
    const { data, error } = await supabase.rpc('adjust_wallet_balance', {
        p_wallet_id: params.walletId,
        p_amount_cents: params.amountCents,
        p_merchant_id: params.merchantId,
        p_type: params.type,
        p_reference_type: params.referenceType,
        p_reference_id: params.referenceId,
        p_description: params.description,
        p_metadata: params.metadata || {},
        p_idempotency_key: params.idempotencyKey || null,
    });

    if (error) {
        const msg = error.message || 'Wallet operation failed';
        if (msg.includes('Insufficient balance')) {
            throw new WalletInsufficientBalanceError(msg);
        }
        if (msg.includes('Wallet not found')) {
            throw new WalletNotFoundError(msg);
        }
        throw new WalletOperationError(msg);
    }

    const row = Array.isArray(data) ? data[0] : data;
    if (!row) {
        throw new WalletOperationError('No result from wallet adjustment');
    }

    return {
        newBalance: row.new_balance,
        transactionId: row.transaction_id,
    };
}

/**
 * Atomically adjust reserved_cents on a wallet.
 */
export async function adjustWalletReserved(
    supabase: SupabaseClient,
    walletId: string,
    reservedDelta: number
): Promise<number> {
    const { data, error } = await supabase.rpc('adjust_wallet_reserved', {
        p_wallet_id: walletId,
        p_reserved_delta: reservedDelta,
    });

    if (error) throw new WalletOperationError(error.message);
    return data as number;
}

export class WalletOperationError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'WalletOperationError';
    }
}

export class WalletInsufficientBalanceError extends WalletOperationError {
    constructor(message: string) {
        super(message);
        this.name = 'WalletInsufficientBalanceError';
    }
}

export class WalletNotFoundError extends WalletOperationError {
    constructor(message: string) {
        super(message);
        this.name = 'WalletNotFoundError';
    }
}
