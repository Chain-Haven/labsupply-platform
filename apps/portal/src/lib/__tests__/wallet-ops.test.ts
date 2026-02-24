import { describe, it, expect, vi } from 'vitest';
import {
    adjustWalletBalance,
    WalletInsufficientBalanceError,
    WalletNotFoundError,
    WalletOperationError,
} from '../wallet-ops';

function mockSupabase(rpcResult: { data: unknown; error: unknown }) {
    return { rpc: vi.fn().mockResolvedValue(rpcResult) } as unknown as Parameters<typeof adjustWalletBalance>[0];
}

describe('adjustWalletBalance', () => {
    const baseParams = {
        walletId: '00000000-0000-0000-0000-000000000001',
        merchantId: '00000000-0000-0000-0000-000000000002',
        amountCents: 5000,
        type: 'TOPUP',
        referenceType: 'mercury_invoice',
        referenceId: '00000000-0000-0000-0000-000000000003',
        description: 'Test credit',
    };

    it('returns newBalance and transactionId on success', async () => {
        const sb = mockSupabase({
            data: [{ new_balance: 15000, transaction_id: 'txn-123' }],
            error: null,
        });

        const result = await adjustWalletBalance(sb, baseParams);
        expect(result.newBalance).toBe(15000);
        expect(result.transactionId).toBe('txn-123');
    });

    it('passes idempotencyKey when provided', async () => {
        const sb = mockSupabase({
            data: [{ new_balance: 15000, transaction_id: 'txn-123' }],
            error: null,
        });

        await adjustWalletBalance(sb, { ...baseParams, idempotencyKey: 'idem-key' });
        expect(sb.rpc).toHaveBeenCalledWith('adjust_wallet_balance', expect.objectContaining({
            p_idempotency_key: 'idem-key',
        }));
    });

    it('throws WalletInsufficientBalanceError on insufficient funds', async () => {
        const sb = mockSupabase({
            data: null,
            error: { message: 'Insufficient balance: have 100 cents, need 5000 cents' },
        });

        await expect(adjustWalletBalance(sb, { ...baseParams, amountCents: -5000 }))
            .rejects.toThrow(WalletInsufficientBalanceError);
    });

    it('throws WalletNotFoundError when wallet does not exist', async () => {
        const sb = mockSupabase({
            data: null,
            error: { message: 'Wallet not found: bad-id' },
        });

        await expect(adjustWalletBalance(sb, baseParams))
            .rejects.toThrow(WalletNotFoundError);
    });

    it('throws WalletOperationError on generic DB error', async () => {
        const sb = mockSupabase({
            data: null,
            error: { message: 'connection refused' },
        });

        await expect(adjustWalletBalance(sb, baseParams))
            .rejects.toThrow(WalletOperationError);
    });

    it('throws when RPC returns no rows', async () => {
        const sb = mockSupabase({ data: [], error: null });

        await expect(adjustWalletBalance(sb, baseParams))
            .rejects.toThrow('No result from wallet adjustment');
    });
});
