import { describe, it, expect } from 'vitest';
import {
    validateBody,
    refundSchema,
    orderUpdateSchema,
    inventoryPatchSchema,
    merchantWithdrawSchema,
    packOrderSchema,
} from '../api-schemas';

describe('refundSchema', () => {
    it('accepts empty body with default reason', () => {
        const result = validateBody(refundSchema, {});
        expect('data' in result).toBe(true);
        if ('data' in result) expect(result.data.reason).toBe('Admin refund');
    });

    it('accepts custom reason', () => {
        const result = validateBody(refundSchema, { reason: 'Damaged item' });
        if ('data' in result) expect(result.data.reason).toBe('Damaged item');
    });

    it('rejects reason over 500 chars', () => {
        const result = validateBody(refundSchema, { reason: 'x'.repeat(501) });
        expect('error' in result).toBe(true);
    });
});

describe('orderUpdateSchema', () => {
    it('requires a valid UUID id', () => {
        const result = validateBody(orderUpdateSchema, { id: 'not-a-uuid' });
        expect('error' in result).toBe(true);
    });

    it('accepts valid update', () => {
        const result = validateBody(orderUpdateSchema, {
            id: '00000000-0000-0000-0000-000000000001',
            status: 'SHIPPED',
        });
        expect('data' in result).toBe(true);
    });
});

describe('inventoryPatchSchema', () => {
    it('requires product_id UUID', () => {
        const result = validateBody(inventoryPatchSchema, { product_id: 'bad' });
        expect('error' in result).toBe(true);
    });

    it('rejects negative on_hand', () => {
        const result = validateBody(inventoryPatchSchema, {
            product_id: '00000000-0000-0000-0000-000000000001',
            on_hand: -5,
        });
        expect('error' in result).toBe(true);
    });

    it('accepts valid patch', () => {
        const result = validateBody(inventoryPatchSchema, {
            product_id: '00000000-0000-0000-0000-000000000001',
            name: 'BPC-157 5mg',
            cost_cents: 2999,
        });
        expect('data' in result).toBe(true);
    });
});

describe('merchantWithdrawSchema', () => {
    it('requires currency', () => {
        const result = validateBody(merchantWithdrawSchema, {});
        expect('error' in result).toBe(true);
    });

    it('rejects invalid currency', () => {
        const result = validateBody(merchantWithdrawSchema, { currency: 'ETH' });
        expect('error' in result).toBe(true);
    });

    it('accepts USD with email', () => {
        const result = validateBody(merchantWithdrawSchema, {
            currency: 'USD',
            payout_email: 'test@example.com',
        });
        expect('data' in result).toBe(true);
    });
});

describe('packOrderSchema', () => {
    it('requires at least one item', () => {
        const result = validateBody(packOrderSchema, { items: [] });
        expect('error' in result).toBe(true);
    });

    it('requires valid UUIDs for order_item_id', () => {
        const result = validateBody(packOrderSchema, {
            items: [{ order_item_id: 'bad', lot_code: 'LOT-001' }],
        });
        expect('error' in result).toBe(true);
    });

    it('accepts valid pack request', () => {
        const result = validateBody(packOrderSchema, {
            items: [{
                order_item_id: '00000000-0000-0000-0000-000000000001',
                lot_code: 'LOT-2024-001',
            }],
        });
        expect('data' in result).toBe(true);
    });
});
