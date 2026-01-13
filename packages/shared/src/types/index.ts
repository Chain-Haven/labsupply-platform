/**
 * LabSupply Platform - Core Type Definitions
 * Domain models for supplier + merchant integration platform
 */

// ============================================================================
// Enums and Constants
// ============================================================================

export const OrderStatus = {
    RECEIVED: 'RECEIVED',
    AWAITING_FUNDS: 'AWAITING_FUNDS',
    FUNDED: 'FUNDED',
    RELEASED_TO_FULFILLMENT: 'RELEASED_TO_FULFILLMENT',
    PICKING: 'PICKING',
    PACKED: 'PACKED',
    SHIPPED: 'SHIPPED',
    COMPLETE: 'COMPLETE',
    ON_HOLD_PAYMENT: 'ON_HOLD_PAYMENT',
    ON_HOLD_COMPLIANCE: 'ON_HOLD_COMPLIANCE',
    CANCELLED: 'CANCELLED',
    REFUNDED: 'REFUNDED',
} as const;

export type OrderStatus = (typeof OrderStatus)[keyof typeof OrderStatus];

export const MerchantStatus = {
    PENDING: 'PENDING',
    ACTIVE: 'ACTIVE',
    SUSPENDED: 'SUSPENDED',
    CLOSED: 'CLOSED',
} as const;

export type MerchantStatus = (typeof MerchantStatus)[keyof typeof MerchantStatus];

export const StoreStatus = {
    PENDING: 'PENDING',
    CONNECTED: 'CONNECTED',
    DISCONNECTED: 'DISCONNECTED',
    ERROR: 'ERROR',
} as const;

export type StoreStatus = (typeof StoreStatus)[keyof typeof StoreStatus];

export const StoreType = {
    WOOCOMMERCE: 'woocommerce',
} as const;

export type StoreType = (typeof StoreType)[keyof typeof StoreType];

export const PaymentStatus = {
    PENDING: 'PENDING',
    PROCESSING: 'PROCESSING',
    SUCCEEDED: 'SUCCEEDED',
    FAILED: 'FAILED',
    REFUNDED: 'REFUNDED',
} as const;

export type PaymentStatus = (typeof PaymentStatus)[keyof typeof PaymentStatus];

export const PaymentMethod = {
    CARD: 'card',
    ACH: 'ach',
    WIRE: 'wire',
} as const;

export type PaymentMethod = (typeof PaymentMethod)[keyof typeof PaymentMethod];

export const WalletTransactionType = {
    TOPUP: 'TOPUP',
    RESERVATION: 'RESERVATION',
    RESERVATION_RELEASE: 'RESERVATION_RELEASE',
    SETTLEMENT: 'SETTLEMENT',
    ADJUSTMENT: 'ADJUSTMENT',
    REFUND: 'REFUND',
} as const;

export type WalletTransactionType = (typeof WalletTransactionType)[keyof typeof WalletTransactionType];

export const ShipmentStatus = {
    PENDING: 'PENDING',
    LABEL_CREATED: 'LABEL_CREATED',
    PICKED_UP: 'PICKED_UP',
    IN_TRANSIT: 'IN_TRANSIT',
    DELIVERED: 'DELIVERED',
    FAILED: 'FAILED',
    RETURNED: 'RETURNED',
} as const;

export type ShipmentStatus = (typeof ShipmentStatus)[keyof typeof ShipmentStatus];

export const WebhookEventStatus = {
    PENDING: 'PENDING',
    PROCESSING: 'PROCESSING',
    COMPLETED: 'COMPLETED',
    FAILED: 'FAILED',
    DEAD_LETTER: 'DEAD_LETTER',
} as const;

export type WebhookEventStatus = (typeof WebhookEventStatus)[keyof typeof WebhookEventStatus];

export const UserRole = {
    // Merchant roles
    MERCHANT_OWNER: 'MERCHANT_OWNER',
    MERCHANT_ADMIN: 'MERCHANT_ADMIN',
    MERCHANT_USER: 'MERCHANT_USER',
    // Supplier roles
    SUPPLIER_SUPERADMIN: 'SUPPLIER_SUPERADMIN',
    SUPPLIER_OPS: 'SUPPLIER_OPS',
    SUPPLIER_SUPPORT: 'SUPPLIER_SUPPORT',
} as const;

export type UserRole = (typeof UserRole)[keyof typeof UserRole];

export const ProductAssetType = {
    IMAGE: 'IMAGE',
    THUMBNAIL: 'THUMBNAIL',
    LABEL_ARTWORK: 'LABEL_ARTWORK',
    COA: 'COA',
    DOCUMENTATION: 'DOCUMENTATION',
} as const;

export type ProductAssetType = (typeof ProductAssetType)[keyof typeof ProductAssetType];

// ============================================================================
// Core Domain Types
// ============================================================================

export interface Merchant {
    id: string;
    name: string;
    status: MerchantStatus;
    company_name?: string;
    contact_email: string;
    contact_phone?: string;
    billing_address?: Address;
    tax_id?: string;
    tier: string;
    agreement_accepted_at?: string;
    terms_accepted_at?: string;
    allowed_regions?: string[];
    created_at: string;
    updated_at: string;
}

export interface MerchantUser {
    id: string;
    merchant_id: string;
    user_id: string;
    role: UserRole;
    email: string;
    first_name?: string;
    last_name?: string;
    created_at: string;
}

export interface Store {
    id: string;
    merchant_id: string;
    type: StoreType;
    name: string;
    url: string;
    status: StoreStatus;
    currency?: string;
    timezone?: string;
    woo_version?: string;
    metadata?: Record<string, unknown>;
    last_sync_at?: string;
    created_at: string;
    updated_at: string;
}

export interface StoreSecret {
    id: string;
    store_id: string;
    secret_hash: string;
    is_active: boolean;
    rotated_at?: string;
    created_at: string;
}

export interface Product {
    id: string;
    sku: string;
    name: string;
    description?: string;
    short_description?: string;
    attributes?: Record<string, unknown>;
    dimensions?: ProductDimensions;
    weight_grams?: number;
    shipping_class?: string;
    cost_cents: number;
    active: boolean;
    requires_coa: boolean;
    compliance_copy?: string;
    disclaimer?: string;
    min_order_qty?: number;
    max_order_qty?: number;
    category?: string;
    tags?: string[];
    created_at: string;
    updated_at: string;
}

export interface ProductDimensions {
    length_cm?: number;
    width_cm?: number;
    height_cm?: number;
}

export interface ProductAsset {
    id: string;
    product_id: string;
    type: ProductAssetType;
    storage_path: string;
    filename: string;
    mime_type?: string;
    size_bytes?: number;
    created_at: string;
}

export interface MerchantProduct {
    id: string;
    merchant_id: string;
    product_id: string;
    allowed: boolean;
    wholesale_price_cents: number;
    map_price_cents?: number;
    custom_title?: string;
    custom_description?: string;
    sync_title: boolean;
    sync_description: boolean;
    sync_price: boolean;
    region_restrictions?: string[];
    min_qty?: number;
    max_qty?: number;
    daily_cap?: number;
    created_at: string;
    updated_at: string;
}

export interface Inventory {
    id: string;
    product_id: string;
    on_hand: number;
    reserved: number;
    incoming?: number;
    reorder_point?: number;
    updated_at: string;
}

export interface Lot {
    id: string;
    product_id: string;
    lot_code: string;
    coa_storage_path?: string;
    manufactured_at?: string;
    expires_at?: string;
    quantity?: number;
    notes?: string;
    created_at: string;
}

export interface Order {
    id: string;
    store_id: string;
    merchant_id: string;
    woo_order_id: string;
    woo_order_number?: string;
    status: OrderStatus;
    currency: string;
    subtotal_cents: number;
    shipping_estimate_cents: number;
    handling_cents: number;
    total_estimate_cents: number;
    actual_total_cents?: number;
    shipping_address: Address;
    billing_address?: Address;
    customer_email?: string;
    customer_note?: string;
    supplier_notes?: string;
    wallet_reservation_id?: string;
    funded_at?: string;
    released_at?: string;
    shipped_at?: string;
    completed_at?: string;
    idempotency_key: string;
    created_at: string;
    updated_at: string;
}

export interface OrderItem {
    id: string;
    order_id: string;
    product_id: string;
    sku: string;
    name: string;
    qty: number;
    unit_price_cents: number;
    lot_id?: string;
    lot_code?: string;
    notes?: string;
    created_at: string;
}

export interface Address {
    first_name?: string;
    last_name?: string;
    company?: string;
    address_1: string;
    address_2?: string;
    city: string;
    state: string;
    postcode: string;
    country: string;
    phone?: string;
    email?: string;
}

export interface WalletAccount {
    id: string;
    merchant_id: string;
    balance_cents: number;
    reserved_cents: number;
    currency: string;
    created_at: string;
    updated_at: string;
}

export interface WalletTransaction {
    id: string;
    merchant_id: string;
    wallet_id: string;
    type: WalletTransactionType;
    amount_cents: number;
    balance_after_cents: number;
    reference_type?: string;
    reference_id?: string;
    description?: string;
    metadata?: Record<string, unknown>;
    created_at: string;
}

export interface Payment {
    id: string;
    merchant_id: string;
    wallet_id: string;
    provider: string;
    provider_payment_id: string;
    provider_checkout_id?: string;
    method: PaymentMethod;
    status: PaymentStatus;
    amount_cents: number;
    fee_cents?: number;
    currency: string;
    funds_confirmed: boolean;
    confirmed_at?: string;
    metadata?: Record<string, unknown>;
    created_at: string;
    updated_at: string;
}

export interface Shipment {
    id: string;
    order_id: string;
    status: ShipmentStatus;
    carrier: string;
    service: string;
    tracking_number?: string;
    tracking_url?: string;
    label_storage_path?: string;
    packing_slip_path?: string;
    rate_cents?: number;
    actual_cost_cents?: number;
    weight_oz?: number;
    dimensions?: ProductDimensions;
    shipped_at?: string;
    delivered_at?: string;
    created_at: string;
    updated_at: string;
}

export interface WebhookEvent {
    id: string;
    store_id?: string;
    source: string;
    event_type: string;
    external_id?: string;
    idempotency_key: string;
    payload: Record<string, unknown>;
    status: WebhookEventStatus;
    attempts: number;
    last_error?: string;
    processed_at?: string;
    created_at: string;
}

export interface AuditEvent {
    id: string;
    actor_user_id?: string;
    merchant_id?: string;
    action: string;
    entity_type: string;
    entity_id: string;
    old_values?: Record<string, unknown>;
    new_values?: Record<string, unknown>;
    metadata?: Record<string, unknown>;
    ip_address?: string;
    user_agent?: string;
    created_at: string;
}

export interface ConnectCode {
    id: string;
    merchant_id: string;
    code: string;
    expires_at: string;
    used_at?: string;
    store_id?: string;
    created_at: string;
}

// ============================================================================
// API Request/Response Types
// ============================================================================

export interface PaginationParams {
    page?: number;
    limit?: number;
    cursor?: string;
}

export interface PaginatedResponse<T> {
    data: T[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        has_more: boolean;
        next_cursor?: string;
    };
}

export interface ApiError {
    code: string;
    message: string;
    details?: Record<string, unknown>;
}

export interface ApiResponse<T> {
    success: boolean;
    data?: T;
    error?: ApiError;
}

// Store connection
export interface ConnectExchangeRequest {
    connect_code: string;
    store_url: string;
    store_name: string;
    woo_version?: string;
    currency?: string;
    timezone?: string;
}

export interface ConnectExchangeResponse {
    store_id: string;
    store_secret: string;
    api_base_url: string;
}

export interface RotateSecretRequest {
    store_id: string;
}

export interface RotateSecretResponse {
    new_secret: string;
    rotated_at: string;
}

// Catalog
export interface CatalogProduct {
    id: string;
    sku: string;
    name: string;
    description?: string;
    short_description?: string;
    images: ProductAsset[];
    wholesale_price_cents: number;
    map_price_cents?: number;
    dimensions?: ProductDimensions;
    weight_grams?: number;
    shipping_class?: string;
    category?: string;
    tags?: string[];
    attributes?: Record<string, unknown>;
    compliance_copy?: string;
    disclaimer?: string;
    requires_coa: boolean;
    in_stock: boolean;
    available_qty?: number;
}

export interface CatalogResponse {
    products: CatalogProduct[];
    last_updated: string;
}

export interface ImportStatusRequest {
    store_id: string;
    products: Array<{
        supplier_product_id: string;
        woo_product_id: string;
        status: 'created' | 'updated' | 'failed';
        error?: string;
    }>;
}

// Orders
export interface CreateOrderRequest {
    woo_order_id: string;
    woo_order_number?: string;
    currency: string;
    shipping_address: Address;
    billing_address?: Address;
    customer_email?: string;
    customer_note?: string;
    items: Array<{
        supplier_sku: string;
        woo_product_id: string;
        qty: number;
        unit_price_cents: number;
        name: string;
    }>;
}

export interface CreateOrderResponse {
    supplier_order_id: string;
    status: OrderStatus;
    estimated_total_cents: number;
    wallet_balance_cents: number;
    is_funded: boolean;
}

export interface OrderUpdateWebhook {
    order_id: string;
    woo_order_id: string;
    status: OrderStatus;
    tracking_number?: string;
    tracking_url?: string;
    carrier?: string;
    shipped_at?: string;
}

// Wallet
export interface TopUpSessionRequest {
    amount_cents: number;
    payment_method?: PaymentMethod;
    return_url: string;
}

export interface TopUpSessionResponse {
    checkout_url: string;
    session_id: string;
}

export interface WalletBalanceResponse {
    balance_cents: number;
    reserved_cents: number;
    available_cents: number;
    currency: string;
    pending_payments: number;
}

// Shipments
export interface CreateShipmentRequest {
    order_id: string;
    carrier: string;
    service: string;
    weight_oz?: number;
    dimensions?: ProductDimensions;
}

export interface CreateShipmentResponse {
    shipment_id: string;
    tracking_number: string;
    tracking_url: string;
    label_url: string;
    rate_cents: number;
}

export interface MarkShippedRequest {
    tracking_number?: string;
    tracking_url?: string;
    notify_store: boolean;
}

// Plugin tracking callback
export interface TrackingUpdatePayload {
    store_id: string;
    updates: Array<{
        woo_order_id: string;
        supplier_order_id: string;
        status: 'shipped' | 'delivered';
        tracking_number: string;
        tracking_url?: string;
        carrier: string;
        shipped_at: string;
    }>;
}

// HMAC signature
export interface SignedRequest {
    'x-store-id': string;
    'x-timestamp': string;
    'x-nonce': string;
    'x-signature': string;
}
