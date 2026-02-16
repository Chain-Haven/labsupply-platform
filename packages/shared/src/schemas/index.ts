/**
 * LabSupply Platform - Zod Validation Schemas
 * Complete validation schemas for all API endpoints and domain objects
 */

import { z } from 'zod';
import {
    OrderStatus,
    MerchantStatus,
    StoreStatus,
    StoreType,
    PaymentStatus,
    PaymentMethod,
    WalletTransactionType,
    ShipmentStatus,
    WebhookEventStatus,
    UserRole,
    ProductAssetType,
} from '../types';

// ============================================================================
// Common Schemas
// ============================================================================

export const paginationSchema = z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    cursor: z.string().optional(),
});

export type PaginationInput = z.infer<typeof paginationSchema>;

export const addressSchema = z.object({
    first_name: z.string().max(100).optional(),
    last_name: z.string().max(100).optional(),
    company: z.string().max(200).optional(),
    address_1: z.string().min(1).max(255),
    address_2: z.string().max(255).optional(),
    city: z.string().min(1).max(100),
    state: z.string().min(1).max(100),
    postcode: z.string().min(1).max(20),
    country: z.string().length(2), // ISO country code
    phone: z.string().max(30).optional(),
    email: z.string().email().optional(),
});

export type AddressInput = z.infer<typeof addressSchema>;

export const productDimensionsSchema = z.object({
    length_cm: z.number().positive().optional(),
    width_cm: z.number().positive().optional(),
    height_cm: z.number().positive().optional(),
});

export type ProductDimensionsInput = z.infer<typeof productDimensionsSchema>;

export const idParamSchema = z.object({
    id: z.string().uuid(),
});

export const storeIdParamSchema = z.object({
    store_id: z.string().uuid(),
});

// ============================================================================
// Auth & Connection Schemas
// ============================================================================

export const connectExchangeSchema = z.object({
    connect_code: z.string().min(8).max(32),
    store_url: z.string().url(),
    store_name: z.string().min(1).max(255),
    woo_version: z.string().max(20).optional(),
    currency: z.string().length(3).default('USD'),
    timezone: z.string().max(50).optional(),
});

export type ConnectExchangeInput = z.infer<typeof connectExchangeSchema>;

export const rotateSecretSchema = z.object({
    store_id: z.string().uuid(),
});

export type RotateSecretInput = z.infer<typeof rotateSecretSchema>;

export const signedRequestHeadersSchema = z.object({
    'x-store-id': z.string().uuid(),
    'x-timestamp': z.string().regex(/^\d+$/),
    'x-nonce': z.string().min(16).max(64),
    'x-signature': z.string().min(64).max(128),
});

export type SignedRequestHeaders = z.infer<typeof signedRequestHeadersSchema>;

// ============================================================================
// Merchant Schemas
// ============================================================================

export const createMerchantSchema = z.object({
    name: z.string().min(1).max(255),
    company_name: z.string().max(255).optional(),
    contact_email: z.string().email(),
    contact_phone: z.string().max(30).optional(),
    billing_address: addressSchema.optional(),
    tier: z.string().default('standard'),
});

export type CreateMerchantInput = z.infer<typeof createMerchantSchema>;

export const updateMerchantSchema = createMerchantSchema.partial();

export type UpdateMerchantInput = z.infer<typeof updateMerchantSchema>;

export const merchantAgreementSchema = z.object({
    accept_terms: z.literal(true),
    accept_merchant_agreement: z.literal(true),
    accept_compliance_disclaimer: z.literal(true),
    ip_address: z.string().optional(),
    user_agent: z.string().optional(),
});

export type MerchantAgreementInput = z.infer<typeof merchantAgreementSchema>;

// ============================================================================
// Product Schemas
// ============================================================================

export const createProductSchema = z.object({
    sku: z.string().min(1).max(50).regex(/^[A-Za-z0-9-_]+$/),
    name: z.string().min(1).max(255),
    description: z.string().max(10000).optional(),
    short_description: z.string().max(500).optional(),
    attributes: z.record(z.unknown()).optional(),
    dimensions: productDimensionsSchema.optional(),
    weight_grams: z.number().positive().optional(),
    shipping_class: z.string().max(50).optional(),
    cost_cents: z.number().int().min(0),
    active: z.boolean().default(true),
    requires_coa: z.boolean().default(false),
    compliance_copy: z.string().max(5000).optional(),
    disclaimer: z.string().max(2000).optional(),
    min_order_qty: z.number().int().min(1).default(1),
    max_order_qty: z.number().int().min(1).optional(),
    category: z.string().max(100).optional(),
    tags: z.array(z.string().max(50)).max(20).optional(),
});

export type CreateProductInput = z.infer<typeof createProductSchema>;

export const updateProductSchema = createProductSchema.partial().omit({ sku: true });

export type UpdateProductInput = z.infer<typeof updateProductSchema>;

export const merchantProductSchema = z.object({
    merchant_id: z.string().uuid(),
    product_id: z.string().uuid(),
    allowed: z.boolean().default(true),
    wholesale_price_cents: z.number().int().min(0),
    map_price_cents: z.number().int().min(0).optional(),
    custom_title: z.string().max(255).optional(),
    custom_description: z.string().max(10000).optional(),
    sync_title: z.boolean().default(true),
    sync_description: z.boolean().default(true),
    sync_price: z.boolean().default(true),
    region_restrictions: z.array(z.string()).optional(),
    min_qty: z.number().int().min(1).optional(),
    max_qty: z.number().int().min(1).optional(),
    daily_cap: z.number().int().min(1).optional(),
});

export type MerchantProductInput = z.infer<typeof merchantProductSchema>;

export const updateMerchantProductSchema = merchantProductSchema.partial().omit({
    merchant_id: true,
    product_id: true,
});

export type UpdateMerchantProductInput = z.infer<typeof updateMerchantProductSchema>;

// ============================================================================
// Inventory Schemas
// ============================================================================

export const adjustInventorySchema = z.object({
    product_id: z.string().uuid(),
    adjustment: z.number().int(),
    reason: z.string().max(500),
});

export type AdjustInventoryInput = z.infer<typeof adjustInventorySchema>;

export const createLotSchema = z.object({
    product_id: z.string().uuid(),
    lot_code: z.string().min(1).max(100),
    manufactured_at: z.string().datetime().optional(),
    expires_at: z.string().datetime().optional(),
    quantity: z.number().int().min(0).optional(),
    notes: z.string().max(2000).optional(),
});

export type CreateLotInput = z.infer<typeof createLotSchema>;

// ============================================================================
// Order Schemas
// ============================================================================

export const orderItemSchema = z.object({
    supplier_sku: z.string().min(1).max(50),
    woo_product_id: z.string(),
    qty: z.number().int().min(1),
    unit_price_cents: z.number().int().min(0),
    name: z.string().max(255),
});

export type OrderItemInput = z.infer<typeof orderItemSchema>;

export const createOrderSchema = z.object({
    woo_order_id: z.string().min(1).max(50),
    woo_order_number: z.string().max(50).optional(),
    currency: z.string().length(3).default('USD'),
    shipping_address: addressSchema,
    billing_address: addressSchema.optional(),
    customer_email: z.string().email().optional(),
    customer_note: z.string().max(2000).optional(),
    items: z.array(orderItemSchema).min(1).max(100),
});

export type CreateOrderInput = z.infer<typeof createOrderSchema>;

export const updateOrderStatusSchema = z.object({
    status: z.nativeEnum(OrderStatus),
    notes: z.string().max(2000).optional(),
});

export type UpdateOrderStatusInput = z.infer<typeof updateOrderStatusSchema>;

export const cancelOrderSchema = z.object({
    reason: z.string().max(1000).optional(),
    refund_to_wallet: z.boolean().default(true),
});

export type CancelOrderInput = z.infer<typeof cancelOrderSchema>;

export const orderFiltersSchema = z.object({
    status: z.nativeEnum(OrderStatus).optional(),
    merchant_id: z.string().uuid().optional(),
    store_id: z.string().uuid().optional(),
    date_from: z.string().datetime().optional(),
    date_to: z.string().datetime().optional(),
    search: z.string().max(100).optional(),
}).merge(paginationSchema);

export type OrderFiltersInput = z.infer<typeof orderFiltersSchema>;

// ============================================================================
// Wallet & Payment Schemas
// ============================================================================

export const billingSettingsSchema = z.object({
    billing_email: z.string().email(),
    low_balance_threshold_cents: z.number().int().min(10000).max(100000000), // $100 min
    target_balance_cents: z.number().int().min(10000).max(100000000), // $100 min
});

export type BillingSettingsInput = z.infer<typeof billingSettingsSchema>;

export const mercuryInvoiceStatusSchema = z.enum(['Unpaid', 'Processing', 'Paid', 'Cancelled']);

export type MercuryInvoiceStatus = z.infer<typeof mercuryInvoiceStatusSchema>;

export const walletAdjustmentSchema = z.object({
    merchant_id: z.string().uuid(),
    amount_cents: z.number().int(), // Can be negative for debits
    type: z.enum(['ADJUSTMENT', 'REFUND']),
    description: z.string().min(1).max(500),
    reference_type: z.string().max(50).optional(),
    reference_id: z.string().uuid().optional(),
});

export type WalletAdjustmentInput = z.infer<typeof walletAdjustmentSchema>;

// ============================================================================
// Shipment Schemas
// ============================================================================

export const createShipmentSchema = z.object({
    order_id: z.string().uuid(),
    carrier: z.string().min(1).max(50),
    service: z.string().min(1).max(100),
    weight_oz: z.number().positive().optional(),
    dimensions: productDimensionsSchema.optional(),
});

export type CreateShipmentInput = z.infer<typeof createShipmentSchema>;

export const markShippedSchema = z.object({
    tracking_number: z.string().max(100).optional(),
    tracking_url: z.string().url().optional(),
    notify_store: z.boolean().default(true),
});

export type MarkShippedInput = z.infer<typeof markShippedSchema>;

export const buyLabelSchema = z.object({
    order_id: z.string().uuid(),
    carrier: z.string().min(1).max(50),
    service: z.string().min(1).max(100),
    weight_oz: z.number().positive(),
    dimensions: productDimensionsSchema.optional(),
    validate_address: z.boolean().default(true),
});

export type BuyLabelInput = z.infer<typeof buyLabelSchema>;

// ============================================================================
// Webhook Schemas
// ============================================================================

export const mercuryWebhookSchema = z.object({
    id: z.string(),
    type: z.string(),
    data: z.record(z.unknown()),
});

export type MercuryWebhookInput = z.infer<typeof mercuryWebhookSchema>;

export const wooWebhookSchema = z.object({
    id: z.number().or(z.string()),
    status: z.string().optional(),
    date_created: z.string().optional(),
    date_modified: z.string().optional(),
    // Additional WooCommerce order fields
}).passthrough();

export type WooWebhookInput = z.infer<typeof wooWebhookSchema>;

export const retryWebhookSchema = z.object({
    event_id: z.string().uuid(),
});

export type RetryWebhookInput = z.infer<typeof retryWebhookSchema>;

// ============================================================================
// Plugin Import Schemas
// ============================================================================

export const importStatusItemSchema = z.object({
    supplier_product_id: z.string().uuid(),
    woo_product_id: z.string(),
    status: z.enum(['created', 'updated', 'failed']),
    error: z.string().optional(),
});

export const importStatusSchema = z.object({
    store_id: z.string().uuid(),
    products: z.array(importStatusItemSchema),
});

export type ImportStatusInput = z.infer<typeof importStatusSchema>;

// ============================================================================
// Tracking Update Schemas
// ============================================================================

export const trackingUpdateItemSchema = z.object({
    woo_order_id: z.string(),
    supplier_order_id: z.string().uuid(),
    status: z.enum(['shipped', 'delivered']),
    tracking_number: z.string().min(1).max(100),
    tracking_url: z.string().url().optional(),
    carrier: z.string().min(1).max(50),
    shipped_at: z.string().datetime(),
});

export const trackingUpdateSchema = z.object({
    store_id: z.string().uuid(),
    updates: z.array(trackingUpdateItemSchema).min(1),
});

export type TrackingUpdateInput = z.infer<typeof trackingUpdateSchema>;

// ============================================================================
// Admin Schemas
// ============================================================================

export const createConnectCodeSchema = z.object({
    expires_in_hours: z.number().int().min(1).max(168).default(24), // Max 7 days
});

export type CreateConnectCodeInput = z.infer<typeof createConnectCodeSchema>;

export const auditLogFiltersSchema = z.object({
    merchant_id: z.string().uuid().optional(),
    actor_user_id: z.string().uuid().optional(),
    entity_type: z.string().optional(),
    entity_id: z.string().uuid().optional(),
    action: z.string().optional(),
    date_from: z.string().datetime().optional(),
    date_to: z.string().datetime().optional(),
}).merge(paginationSchema);

export type AuditLogFiltersInput = z.infer<typeof auditLogFiltersSchema>;

export const webhookEventsFiltersSchema = z.object({
    store_id: z.string().uuid().optional(),
    source: z.string().optional(),
    status: z.nativeEnum(WebhookEventStatus).optional(),
    date_from: z.string().datetime().optional(),
    date_to: z.string().datetime().optional(),
}).merge(paginationSchema);

export type WebhookEventsFiltersInput = z.infer<typeof webhookEventsFiltersSchema>;

// ============================================================================
// Search & Filter Schemas
// ============================================================================

export const productFiltersSchema = z.object({
    search: z.string().max(100).optional(),
    category: z.string().optional(),
    active: z.boolean().optional(),
    requires_coa: z.boolean().optional(),
    in_stock: z.boolean().optional(),
}).merge(paginationSchema);

export type ProductFiltersInput = z.infer<typeof productFiltersSchema>;

export const merchantFiltersSchema = z.object({
    search: z.string().max(100).optional(),
    status: z.nativeEnum(MerchantStatus).optional(),
    tier: z.string().optional(),
}).merge(paginationSchema);

export type MerchantFiltersInput = z.infer<typeof merchantFiltersSchema>;

// ============================================================================
// Validation Helpers
// ============================================================================

/**
 * Validate and parse input with a Zod schema
 * Returns { success: true, data } or { success: false, errors }
 */
export function validateInput<T extends z.ZodSchema>(
    schema: T,
    input: unknown
): { success: true; data: z.infer<T> } | { success: false; errors: z.ZodError } {
    const result = schema.safeParse(input);
    if (result.success) {
        return { success: true, data: result.data };
    }
    return { success: false, errors: result.error };
}

/**
 * Format Zod errors into a user-friendly object
 */
export function formatZodErrors(error: z.ZodError): Record<string, string[]> {
    const formatted: Record<string, string[]> = {};
    for (const issue of error.issues) {
        const path = issue.path.join('.');
        if (!formatted[path]) {
            formatted[path] = [];
        }
        formatted[path].push(issue.message);
    }
    return formatted;
}
