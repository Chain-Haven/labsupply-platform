/**
 * Tests for Zod validation schemas
 */

import { describe, it, expect } from 'vitest';
import {
    addressSchema,
    connectExchangeSchema,
    createOrderSchema,
    topUpSessionSchema,
    validateInput,
    formatZodErrors,
} from '../src/schemas';

describe('Address Schema', () => {
    it('should validate a complete address', () => {
        const address = {
            first_name: 'John',
            last_name: 'Doe',
            address_1: '123 Research Blvd',
            city: 'Las Vegas',
            state: 'NV',
            postcode: '89101',
            country: 'US',
            phone: '555-0100',
            email: 'john@example.com',
        };

        const result = addressSchema.safeParse(address);
        expect(result.success).toBe(true);
    });

    it('should accept optional fields', () => {
        const address = {
            first_name: 'John',
            last_name: 'Doe',
            address_1: '123 Main St',
            city: 'New York',
            state: 'NY',
            postcode: '10001',
            country: 'US',
        };

        const result = addressSchema.safeParse(address);
        expect(result.success).toBe(true);
    });

    it('should reject missing required fields', () => {
        const address = {
            first_name: 'John',
            city: 'Las Vegas',
        };

        const result = addressSchema.safeParse(address);
        expect(result.success).toBe(false);
    });

    it('should reject invalid email', () => {
        const address = {
            first_name: 'John',
            last_name: 'Doe',
            address_1: '123 Main St',
            city: 'New York',
            state: 'NY',
            postcode: '10001',
            country: 'US',
            email: 'not-an-email',
        };

        const result = addressSchema.safeParse(address);
        expect(result.success).toBe(false);
    });
});

describe('Connect Exchange Schema', () => {
    it('should validate a valid connect request', () => {
        const request = {
            connect_code: 'ABC123DEF456',
            store_url: 'https://mystore.com',
            store_name: 'My Store',
            woo_version: '8.4.0',
            currency: 'USD',
            timezone: 'America/New_York',
        };

        const result = connectExchangeSchema.safeParse(request);
        expect(result.success).toBe(true);
    });

    it('should reject too short connect code', () => {
        const request = {
            connect_code: 'ABC',
            store_url: 'https://mystore.com',
            store_name: 'My Store',
        };

        const result = connectExchangeSchema.safeParse(request);
        expect(result.success).toBe(false);
    });

    it('should accept connect code with hyphens', () => {
        const request = {
            connect_code: 'ABC1-2DEF-3GHI',
            store_url: 'https://mystore.com',
            store_name: 'My Store',
        };

        const result = connectExchangeSchema.safeParse(request);
        expect(result.success).toBe(true);
    });
});

describe('Create Order Schema', () => {
    const validOrder = {
        woo_order_id: '1001',
        woo_order_number: 'WC-1001',
        currency: 'USD',
        shipping_address: {
            first_name: 'John',
            last_name: 'Doe',
            address_1: '123 Research Blvd',
            city: 'Las Vegas',
            state: 'NV',
            postcode: '89101',
            country: 'US',
        },
        items: [
            {
                supplier_sku: 'BPC-157-5MG',
                qty: 2,
            },
        ],
    };

    it('should validate a complete order', () => {
        const result = createOrderSchema.safeParse(validOrder);
        expect(result.success).toBe(true);
    });

    it('should require at least one item', () => {
        const order = { ...validOrder, items: [] };
        const result = createOrderSchema.safeParse(order);
        expect(result.success).toBe(false);
    });

    it('should require positive quantity', () => {
        const order = {
            ...validOrder,
            items: [{ supplier_sku: 'BPC-157-5MG', qty: 0 }],
        };
        const result = createOrderSchema.safeParse(order);
        expect(result.success).toBe(false);
    });

    it('should require woo_order_id', () => {
        const { woo_order_id, ...orderWithoutId } = validOrder;
        const result = createOrderSchema.safeParse(orderWithoutId);
        expect(result.success).toBe(false);
    });
});

describe('Top Up Session Schema', () => {
    it('should validate a valid top up request', () => {
        const request = {
            amount_cents: 10000,
            return_url: 'https://mystore.com/wallet',
        };

        const result = topUpSessionSchema.safeParse(request);
        expect(result.success).toBe(true);
    });

    it('should reject amount below minimum', () => {
        const request = {
            amount_cents: 100, // $1 - below minimum
            return_url: 'https://mystore.com/wallet',
        };

        const result = topUpSessionSchema.safeParse(request);
        expect(result.success).toBe(false);
    });

    it('should reject amount above maximum', () => {
        const request = {
            amount_cents: 100000000, // $1M - above max
            return_url: 'https://mystore.com/wallet',
        };

        const result = topUpSessionSchema.safeParse(request);
        expect(result.success).toBe(false);
    });
});

describe('Validation Helpers', () => {
    it('validateInput should return parsed data on success', () => {
        const data = { amount_cents: 5000, return_url: 'https://example.com' };
        const result = validateInput(topUpSessionSchema, data);

        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.data).toEqual(data);
        }
    });

    it('validateInput should return errors on failure', () => {
        const data = { amount_cents: 'not-a-number' };
        const result = validateInput(topUpSessionSchema, data);

        expect(result.success).toBe(false);
        if (!result.success) {
            expect(result.error).toBeDefined();
        }
    });

    it('formatZodErrors should format errors nicely', () => {
        const data = { amount_cents: 'invalid' };
        const parsed = topUpSessionSchema.safeParse(data);

        if (!parsed.success) {
            const formatted = formatZodErrors(parsed.error);
            expect(formatted.amount_cents).toBeDefined();
        }
    });
});
