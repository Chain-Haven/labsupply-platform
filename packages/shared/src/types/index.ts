/**
 * WhiteLabel Peptides Platform - Core Type Definitions
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
    CLOSING: 'CLOSING',
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
    MERCURY_INVOICE: 'mercury_invoice',
    ACH: 'ach',
    ADJUSTMENT: 'adjustment',
} as const;

export type PaymentMethod = (typeof PaymentMethod)[keyof typeof PaymentMethod];

export const WalletTransactionType = {
    TOPUP: 'TOPUP',
    RESERVATION: 'RESERVATION',
    RESERVATION_RELEASE: 'RESERVATION_RELEASE',
    SETTLEMENT: 'SETTLEMENT',
    ADJUSTMENT: 'ADJUSTMENT',
    REFUND: 'REFUND',
    BTC_DEPOSIT_TOPUP: 'BTC_DEPOSIT_TOPUP',
    BTC_DEPOSIT_TIP: 'BTC_DEPOSIT_TIP',
    USD_WITHDRAWAL_REQUESTED: 'USD_WITHDRAWAL_REQUESTED',
    BTC_WITHDRAWAL_REQUESTED: 'BTC_WITHDRAWAL_REQUESTED',
    USD_WITHDRAWAL_COMPLETED: 'USD_WITHDRAWAL_COMPLETED',
    BTC_WITHDRAWAL_COMPLETED: 'BTC_WITHDRAWAL_COMPLETED',
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

export const MerchantInvitableRoles = ['MERCHANT_ADMIN', 'MERCHANT_USER'] as const;
export type MerchantInvitableRole = (typeof MerchantInvitableRoles)[number];

export const AdminInvitableRoles = ['admin'] as const;
export type AdminInvitableRole = (typeof AdminInvitableRoles)[number];

export const InvitationScope = {
    MERCHANT: 'merchant',
    ADMIN: 'admin',
} as const;

export type InvitationScope = (typeof InvitationScope)[keyof typeof InvitationScope];

export const InvitationStatus = {
    PENDING: 'pending',
    ACCEPTED: 'accepted',
    EXPIRED: 'expired',
    REVOKED: 'revoked',
} as const;

export type InvitationStatus = (typeof InvitationStatus)[keyof typeof InvitationStatus];

export interface Invitation {
    id: string;
    scope: InvitationScope;
    merchant_id: string | null;
    email: string;
    role: string;
    permissions: Record<string, { read: boolean; write: boolean }> | null;
    invited_by: string;
    token: string;
    status: InvitationStatus;
    expires_at: string;
    accepted_at: string | null;
    created_at: string;
}

export interface MerchantUser {
    id: string;
    merchant_id: string;
    user_id: string;
    role: 'MERCHANT_OWNER' | 'MERCHANT_ADMIN' | 'MERCHANT_USER';
    email: string;
    first_name: string | null;
    last_name: string | null;
    is_active: boolean;
    invited_by: string | null;
    invited_at: string | null;
    created_at: string;
}

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
    order_type?: OrderType;
    status: OrderStatus;
    currency: string;
    shipping_method?: 'STANDARD' | 'EXPEDITED';
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
    tracking_acknowledged_at?: string;
    idempotency_key: string;
    metadata?: Record<string, unknown>;
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

export interface ApiErrorResponse {
    code: string;
    message: string;
    details?: Record<string, unknown>;
}

export interface ApiResponse<T> {
    success: boolean;
    data?: T;
    error?: ApiErrorResponse;
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

// Mercury Invoice
export const MercuryInvoiceStatus = {
    UNPAID: 'Unpaid',
    PROCESSING: 'Processing',
    PAID: 'Paid',
    CANCELLED: 'Cancelled',
} as const;

export type MercuryInvoiceStatus = (typeof MercuryInvoiceStatus)[keyof typeof MercuryInvoiceStatus];

export interface MercuryInvoice {
    id: string;
    merchant_id: string;
    mercury_invoice_id: string;
    mercury_invoice_number?: string;
    mercury_slug?: string;
    amount_cents: number;
    status: MercuryInvoiceStatus;
    due_date: string;
    wallet_credited: boolean;
    wallet_transaction_id?: string;
    created_at: string;
    updated_at: string;
}

export interface BillingSettings {
    billing_email: string;
    low_balance_threshold_cents: number;
    target_balance_cents: number;
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
    order_id: string;
    status: string;
    carrier: string;
    service: string;
    tracking_number?: string | null;
    tracking_url?: string | null;
    label_url?: string | null;
    rate_cents?: number | null;
}

export interface MarkShippedRequest {
    tracking_number?: string;
    tracking_url?: string;
    carrier?: string;
    actual_cost_cents?: number;
    notify_store?: boolean;
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

// ============================================================================
// Compliance Scanning Types
// ============================================================================

// ============================================================================
// Testing Enums and Types
// ============================================================================

export const OrderType = {
    REGULAR: 'REGULAR',
    TESTING: 'TESTING',
} as const;

export type OrderType = (typeof OrderType)[keyof typeof OrderType];

export const TestingOrderStatus = {
    PENDING: 'PENDING',
    AWAITING_SHIPMENT: 'AWAITING_SHIPMENT',
    SHIPPED: 'SHIPPED',
    IN_TESTING: 'IN_TESTING',
    RESULTS_RECEIVED: 'RESULTS_RECEIVED',
    COMPLETE: 'COMPLETE',
} as const;

export type TestingOrderStatus = (typeof TestingOrderStatus)[keyof typeof TestingOrderStatus];

export const TestingAddon = {
    CONFORMITY: 'conformity',
    STERILITY: 'sterility',
    ENDOTOXINS: 'endotoxins',
    NET_CONTENT: 'net_content',
    PURITY: 'purity',
} as const;

export type TestingAddon = (typeof TestingAddon)[keyof typeof TestingAddon];

/** Extra quantity required per addon */
export const TESTING_ADDON_EXTRA_QTY: Record<TestingAddon, number> = {
    [TestingAddon.CONFORMITY]: 2,
    [TestingAddon.STERILITY]: 1,
    [TestingAddon.ENDOTOXINS]: 1,
    [TestingAddon.NET_CONTENT]: 0,
    [TestingAddon.PURITY]: 0,
};

/** Fee in cents per addon */
export const TESTING_ADDON_FEE_CENTS: Record<TestingAddon, number> = {
    [TestingAddon.CONFORMITY]: 5000,   // $50
    [TestingAddon.STERILITY]: 25000,   // $250
    [TestingAddon.ENDOTOXINS]: 25000,  // $250
    [TestingAddon.NET_CONTENT]: 0,
    [TestingAddon.PURITY]: 0,
};

export const TESTING_SHIPPING_FEE_CENTS = 5000; // $50 overnight shipping

export interface TestingLab {
    id: string;
    name: string;
    email: string;
    phone?: string;
    address?: Address;
    is_default: boolean;
    active: boolean;
    created_at: string;
    updated_at: string;
}

export interface TestingOrder {
    id: string;
    order_id?: string;
    merchant_id: string;
    testing_lab_id: string;
    status: TestingOrderStatus;
    tracking_number?: string;
    tracking_url?: string;
    carrier?: string;
    tracking_notified_at?: string;
    shipping_fee_cents: number;
    total_testing_fee_cents: number;
    total_product_cost_cents: number;
    grand_total_cents: number;
    invoice_email: string;
    lab_invoice_number?: string;
    lab_invoice_amount_cents?: number;
    notes?: string;
    results_received_at?: string;
    created_at: string;
    updated_at: string;
    // Joined fields
    testing_lab?: TestingLab;
    merchant?: Merchant;
    items?: TestingOrderItem[];
}

export interface TestingOrderItem {
    id: string;
    testing_order_id: string;
    product_id: string;
    sku: string;
    product_name: string;
    base_qty: number;
    addon_conformity: boolean;
    addon_sterility: boolean;
    addon_endotoxins: boolean;
    addon_net_content: boolean;
    addon_purity: boolean;
    total_qty: number;
    product_cost_cents: number;
    testing_fee_cents: number;
    created_at: string;
}

export const ComplianceScanStatus = {
    PENDING: 'pending',
    RUNNING: 'running',
    COMPLETED: 'completed',
    FAILED: 'failed',
} as const;

export type ComplianceScanStatus = (typeof ComplianceScanStatus)[keyof typeof ComplianceScanStatus];

export const ComplianceViolationType = {
    HEALTH_CLAIM: 'health_claim',
    DOSAGE_ADVICE: 'dosage_advice',
    BRAND_NAME_USAGE: 'brand_name_usage',
    HUMAN_USE_SUGGESTION: 'human_use_suggestion',
    FDA_VIOLATION: 'fda_violation',
    OTHER: 'other',
} as const;

export type ComplianceViolationType = (typeof ComplianceViolationType)[keyof typeof ComplianceViolationType];

export const ComplianceViolationSeverity = {
    LOW: 'low',
    MEDIUM: 'medium',
    HIGH: 'high',
    CRITICAL: 'critical',
} as const;

export type ComplianceViolationSeverity = (typeof ComplianceViolationSeverity)[keyof typeof ComplianceViolationSeverity];

export const ComplianceAdminAction = {
    PENDING: 'pending',
    IGNORED: 'ignored',
    NOTIFIED: 'notified',
    BLOCKED: 'blocked',
} as const;

export type ComplianceAdminAction = (typeof ComplianceAdminAction)[keyof typeof ComplianceAdminAction];

export interface ComplianceScan {
    id: string;
    merchant_id: string;
    store_id?: string;
    scan_url: string;
    pages_crawled: number;
    violations_found: number;
    status: ComplianceScanStatus;
    error_message?: string;
    started_at?: string;
    completed_at?: string;
    created_at: string;
}

export interface ComplianceViolation {
    id: string;
    scan_id: string;
    merchant_id: string;
    page_url: string;
    violation_type: ComplianceViolationType;
    severity: ComplianceViolationSeverity;
    description: string;
    violating_text: string;
    suggested_fix?: string;
    admin_action: ComplianceAdminAction;
    admin_action_by?: string;
    admin_action_at?: string;
    ignore_reason?: string;
    notified_at?: string;
    created_at: string;
    updated_at: string;
    // Joined fields from API
    merchant_name?: string;
    merchant_email?: string;
}

export interface ComplianceScanConfig {
    id: string;
    merchant_id: string;
    enabled: boolean;
    max_pages: number;
    custom_rules?: Record<string, unknown>;
    created_at: string;
    updated_at: string;
}

// ============================================================================
// BTC Wallet Types
// ============================================================================

export const BtcPurpose = {
    TOPUP: 'TOPUP',
    TIP: 'TIP',
} as const;

export type BtcPurpose = (typeof BtcPurpose)[keyof typeof BtcPurpose];

export const BtcAddressStatus = {
    ACTIVE: 'ACTIVE',
    USED: 'USED',
    ARCHIVED: 'ARCHIVED',
} as const;

export type BtcAddressStatus = (typeof BtcAddressStatus)[keyof typeof BtcAddressStatus];

export const BtcDepositStatus = {
    PENDING: 'PENDING',
    CONFIRMED: 'CONFIRMED',
    CREDITED: 'CREDITED',
    FLAGGED: 'FLAGGED',
} as const;

export type BtcDepositStatus = (typeof BtcDepositStatus)[keyof typeof BtcDepositStatus];

export const WithdrawalStatus = {
    PENDING_ADMIN: 'PENDING_ADMIN',
    PROCESSING: 'PROCESSING',
    COMPLETED: 'COMPLETED',
    REJECTED: 'REJECTED',
} as const;

export type WithdrawalStatus = (typeof WithdrawalStatus)[keyof typeof WithdrawalStatus];

export interface BtcAddress {
    id: string;
    merchant_id: string;
    purpose: BtcPurpose;
    derivation_index: number;
    address: string;
    status: BtcAddressStatus;
    created_at: string;
    used_at?: string;
}

export interface BtcDeposit {
    id: string;
    merchant_id: string;
    purpose: BtcPurpose;
    address: string;
    derivation_index: number;
    txid: string;
    vout: number;
    amount_sats: number;
    confirmations: number;
    block_height?: number;
    status: BtcDepositStatus;
    first_seen_at: string;
    credited_at?: string;
    wallet_transaction_id?: string;
    raw_provider_payload?: Record<string, unknown>;
}

export interface WithdrawalRequest {
    id: string;
    merchant_id: string;
    currency: 'USD' | 'BTC';
    amount_minor: number;
    payout_email?: string;
    payout_btc_address?: string;
    status: WithdrawalStatus;
    merchant_name_snapshot?: string;
    merchant_email_snapshot?: string;
    closure_confirmed_at?: string;
    requested_at: string;
    completed_at?: string;
    admin_notes?: string;
}

export interface BtcWalletBalanceResponse {
    balance_sats: number;
    reserved_sats: number;
    available_sats: number;
    balance_btc: string;
    pending_deposits: number;
}

export interface AdminCryptoSettings {
    btc_topup_xpub_set: boolean;
    btc_tip_xpub_set: boolean;
    btc_confirmation_threshold: number;
    btc_esplora_base_url: string;
}

// ---------------------------------------------------------------------------
// Service Packages
// ---------------------------------------------------------------------------
export interface ServicePackage {
    id: string;
    slug: string;
    name: string;
    tagline: string;
    description: string;
    price_cents: number;
    original_price_cents: number | null;
    package_type: 'tier' | 'addon';
    features: string[];
    sort_order: number;
    is_active: boolean;
    is_popular: boolean;
}

export type MerchantPackageStatus = 'selected' | 'invoiced' | 'paid' | 'active' | 'cancelled';

export interface MerchantPackage {
    id: string;
    merchant_id: string;
    package_id: string;
    status: MerchantPackageStatus;
    mercury_invoice_id: string | null;
    amount_cents: number;
    selected_at: string;
    paid_at: string | null;
}
