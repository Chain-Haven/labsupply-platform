/**
 * Shared Zod schemas for API route input validation.
 */

import { z } from 'zod';

export const uuidParam = z.string().uuid();
export const paginationSchema = z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
});
export const searchSchema = z.object({
    search: z.string().max(200).optional(),
});

export const refundSchema = z.object({
    reason: z.string().max(500).default('Admin refund'),
});

export const orderUpdateSchema = z.object({
    id: z.string().uuid(),
    status: z.string().optional(),
    supplier_notes: z.string().max(2000).optional(),
});

export const inventoryPatchSchema = z.object({
    product_id: z.string().uuid(),
    name: z.string().min(1).max(255).optional(),
    category: z.string().max(100).optional(),
    cost_cents: z.number().int().min(0).optional(),
    on_hand: z.number().int().min(0).optional(),
    reorder_point: z.number().int().min(0).optional(),
    active: z.boolean().optional(),
    reason: z.string().max(500).optional(),
});

export const withdrawalActionSchema = z.object({
    withdrawal_id: z.string().uuid(),
    status: z.enum(['PENDING', 'PROCESSING', 'COMPLETED', 'REJECTED']),
    admin_notes: z.string().max(2000).optional(),
});

export const merchantWithdrawSchema = z.object({
    currency: z.enum(['USD', 'BTC']),
    payout_email: z.string().email().optional(),
    payout_btc_address: z.string().min(20).max(100).optional(),
});

export const apiKeyCreateSchema = z.object({
    name: z.string().min(1).max(255),
    description: z.string().max(1000).optional(),
    permissions: z.record(z.object({
        read: z.boolean(),
        write: z.boolean(),
    })).optional(),
    rate_limit_per_hour: z.number().int().min(1).max(100000).optional(),
    ip_allowlist: z.array(z.string()).optional(),
    expires_at: z.string().datetime().optional(),
});

export const packOrderSchema = z.object({
    items: z.array(z.object({
        order_item_id: z.string().uuid(),
        lot_code: z.string().min(1).max(100),
    })).min(1),
});

export const pricingOverrideSchema = z.object({
    wholesale_price_cents: z.number().int().min(0).optional(),
    map_price_cents: z.number().int().min(0).optional(),
    allowed: z.boolean().optional(),
});

export function validateBody<T extends z.ZodSchema>(schema: T, body: unknown): { data: z.infer<T> } | { error: string; details?: Record<string, string[]> } {
    const result = schema.safeParse(body);
    if (result.success) return { data: result.data };
    const formatted: Record<string, string[]> = {};
    for (const issue of result.error.issues) {
        const path = issue.path.join('.') || '_root';
        if (!formatted[path]) formatted[path] = [];
        formatted[path].push(issue.message);
    }
    return { error: 'Validation failed', details: formatted };
}
