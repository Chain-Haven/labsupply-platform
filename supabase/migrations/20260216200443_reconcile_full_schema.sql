-- ============================================================================
-- 010_reconcile_full_schema.sql
-- Comprehensive schema reconciliation migration
--
-- Creates ALL tables the application code expects, using IF NOT EXISTS
-- and ADD COLUMN IF NOT EXISTS for safety. This migration is idempotent
-- and can be re-run without error.
-- ============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Reusable updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 1. MERCHANTS (alter existing table to add missing columns)
-- ============================================================================

-- Core fields the app code expects but original migration may not have
ALTER TABLE public.merchants ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE public.merchants ADD COLUMN IF NOT EXISTS contact_email VARCHAR(255);
ALTER TABLE public.merchants ADD COLUMN IF NOT EXISTS contact_phone VARCHAR(50);
ALTER TABLE public.merchants ADD COLUMN IF NOT EXISTS tier VARCHAR(50) DEFAULT 'standard';
ALTER TABLE public.merchants ADD COLUMN IF NOT EXISTS terms_accepted_at TIMESTAMPTZ;
ALTER TABLE public.merchants ADD COLUMN IF NOT EXISTS agreement_accepted_at TIMESTAMPTZ;
ALTER TABLE public.merchants ADD COLUMN IF NOT EXISTS allowed_regions TEXT[];
ALTER TABLE public.merchants ADD COLUMN IF NOT EXISTS billing_address JSONB;

-- Mercury integration columns
ALTER TABLE public.merchants ADD COLUMN IF NOT EXISTS mercury_customer_id UUID;
ALTER TABLE public.merchants ADD COLUMN IF NOT EXISTS billing_email TEXT;
ALTER TABLE public.merchants ADD COLUMN IF NOT EXISTS low_balance_threshold_cents INTEGER DEFAULT 100000;
ALTER TABLE public.merchants ADD COLUMN IF NOT EXISTS target_balance_cents INTEGER DEFAULT 300000;

CREATE INDEX IF NOT EXISTS idx_merchants_mercury_customer_id
    ON public.merchants(mercury_customer_id) WHERE mercury_customer_id IS NOT NULL;

-- ============================================================================
-- 2. STORES
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.stores (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    merchant_id UUID NOT NULL REFERENCES public.merchants(id) ON DELETE CASCADE,
    type VARCHAR(20) DEFAULT 'woocommerce',
    name VARCHAR(255),
    url VARCHAR(500),
    status VARCHAR(20) DEFAULT 'PENDING',
    currency VARCHAR(3) DEFAULT 'USD',
    timezone VARCHAR(50),
    woo_version VARCHAR(20),
    metadata JSONB DEFAULT '{}',
    last_sync_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_stores_merchant_id ON public.stores(merchant_id);
CREATE INDEX IF NOT EXISTS idx_stores_status ON public.stores(status);

DROP TRIGGER IF EXISTS update_stores_updated_at ON public.stores;
CREATE TRIGGER update_stores_updated_at
    BEFORE UPDATE ON public.stores
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.stores TO authenticated;
GRANT ALL ON public.stores TO service_role;

-- ============================================================================
-- 3. STORE_SECRETS
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.store_secrets (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
    secret_hash TEXT NOT NULL,
    secret_plaintext TEXT,
    is_active BOOLEAN DEFAULT true,
    rotated_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_store_secrets_store_id ON public.store_secrets(store_id);
CREATE INDEX IF NOT EXISTS idx_store_secrets_active
    ON public.store_secrets(store_id) WHERE is_active = true;

ALTER TABLE public.store_secrets ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.store_secrets TO authenticated;
GRANT ALL ON public.store_secrets TO service_role;

-- ============================================================================
-- 4. CONNECT_CODES
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.connect_codes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    merchant_id UUID NOT NULL REFERENCES public.merchants(id) ON DELETE CASCADE,
    code VARCHAR(32) NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    used_at TIMESTAMPTZ,
    store_id UUID,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_connect_codes_merchant_id ON public.connect_codes(merchant_id);
CREATE INDEX IF NOT EXISTS idx_connect_codes_code ON public.connect_codes(code);

ALTER TABLE public.connect_codes ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.connect_codes TO authenticated;
GRANT ALL ON public.connect_codes TO service_role;

-- ============================================================================
-- 5. PRODUCTS
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.products (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    sku VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    short_description VARCHAR(500),
    attributes JSONB DEFAULT '{}',
    dimensions JSONB,
    weight_grams INTEGER,
    shipping_class VARCHAR(50),
    cost_cents INTEGER DEFAULT 0,
    active BOOLEAN DEFAULT true,
    requires_coa BOOLEAN DEFAULT false,
    compliance_copy TEXT,
    disclaimer TEXT,
    min_order_qty INTEGER DEFAULT 1,
    max_order_qty INTEGER,
    category VARCHAR(100),
    tags TEXT[],
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_products_sku ON public.products(sku);
CREATE INDEX IF NOT EXISTS idx_products_active ON public.products(active);
CREATE INDEX IF NOT EXISTS idx_products_category ON public.products(category);

DROP TRIGGER IF EXISTS update_products_updated_at ON public.products;
CREATE TRIGGER update_products_updated_at
    BEFORE UPDATE ON public.products
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.products TO authenticated;
GRANT ALL ON public.products TO service_role;

-- ============================================================================
-- 6. PRODUCT_ASSETS
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.product_assets (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    type VARCHAR(20),
    storage_path VARCHAR(500),
    filename VARCHAR(255),
    mime_type VARCHAR(100),
    size_bytes BIGINT,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_product_assets_product_id ON public.product_assets(product_id);

ALTER TABLE public.product_assets ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.product_assets TO authenticated;
GRANT ALL ON public.product_assets TO service_role;

-- ============================================================================
-- 7. MERCHANT_PRODUCTS
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.merchant_products (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    merchant_id UUID NOT NULL REFERENCES public.merchants(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    allowed BOOLEAN DEFAULT true,
    wholesale_price_cents INTEGER,
    map_price_cents INTEGER,
    custom_title VARCHAR(255),
    custom_description TEXT,
    sync_title BOOLEAN DEFAULT true,
    sync_description BOOLEAN DEFAULT true,
    sync_price BOOLEAN DEFAULT true,
    woo_product_id TEXT,
    sync_status TEXT,
    last_sync_at TIMESTAMPTZ,
    region_restrictions TEXT[],
    min_qty INTEGER,
    max_qty INTEGER,
    daily_cap INTEGER,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(merchant_id, product_id)
);

CREATE INDEX IF NOT EXISTS idx_merchant_products_merchant_id ON public.merchant_products(merchant_id);
CREATE INDEX IF NOT EXISTS idx_merchant_products_product_id ON public.merchant_products(product_id);
CREATE INDEX IF NOT EXISTS idx_merchant_products_allowed
    ON public.merchant_products(merchant_id) WHERE allowed = true;

DROP TRIGGER IF EXISTS update_merchant_products_updated_at ON public.merchant_products;
CREATE TRIGGER update_merchant_products_updated_at
    BEFORE UPDATE ON public.merchant_products
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.merchant_products ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.merchant_products TO authenticated;
GRANT ALL ON public.merchant_products TO service_role;

-- ============================================================================
-- 8. INVENTORY
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.inventory (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE UNIQUE,
    on_hand INTEGER DEFAULT 0,
    reserved INTEGER DEFAULT 0,
    incoming INTEGER DEFAULT 0,
    reorder_point INTEGER,
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_inventory_product_id ON public.inventory(product_id);

DROP TRIGGER IF EXISTS update_inventory_updated_at ON public.inventory;
CREATE TRIGGER update_inventory_updated_at
    BEFORE UPDATE ON public.inventory
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.inventory TO authenticated;
GRANT ALL ON public.inventory TO service_role;

-- ============================================================================
-- 9. LOTS
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.lots (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    lot_code VARCHAR(100) NOT NULL,
    coa_storage_path VARCHAR(500),
    manufactured_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    quantity INTEGER,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_lots_product_id ON public.lots(product_id);
CREATE INDEX IF NOT EXISTS idx_lots_lot_code ON public.lots(lot_code);

ALTER TABLE public.lots ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.lots TO authenticated;
GRANT ALL ON public.lots TO service_role;

-- ============================================================================
-- 10. ORDERS
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.orders (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    store_id UUID REFERENCES public.stores(id) ON DELETE SET NULL,
    merchant_id UUID NOT NULL REFERENCES public.merchants(id) ON DELETE CASCADE,
    woo_order_id VARCHAR(50),
    woo_order_number VARCHAR(50),
    status VARCHAR(30) DEFAULT 'RECEIVED',
    currency VARCHAR(3) DEFAULT 'USD',
    subtotal_cents INTEGER,
    handling_cents INTEGER DEFAULT 0,
    shipping_estimate_cents INTEGER,
    total_estimate_cents INTEGER,
    actual_total_cents INTEGER,
    shipping_address JSONB,
    billing_address JSONB,
    customer_email VARCHAR(255),
    customer_note TEXT,
    supplier_notes TEXT,
    wallet_reservation_id UUID,
    funded_at TIMESTAMPTZ,
    released_at TIMESTAMPTZ,
    shipped_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    idempotency_key VARCHAR(255) UNIQUE,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_orders_store_id ON public.orders(store_id);
CREATE INDEX IF NOT EXISTS idx_orders_merchant_id ON public.orders(merchant_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_idempotency_key ON public.orders(idempotency_key);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_woo_order_id ON public.orders(woo_order_id);

DROP TRIGGER IF EXISTS update_orders_updated_at ON public.orders;
CREATE TRIGGER update_orders_updated_at
    BEFORE UPDATE ON public.orders
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.orders TO authenticated;
GRANT ALL ON public.orders TO service_role;

-- ============================================================================
-- 11. ORDER_ITEMS
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.order_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
    sku VARCHAR(50),
    name VARCHAR(255),
    qty INTEGER NOT NULL,
    unit_price_cents INTEGER NOT NULL,
    lot_id UUID,
    lot_code VARCHAR(100),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON public.order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON public.order_items(product_id);

ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.order_items TO authenticated;
GRANT ALL ON public.order_items TO service_role;

-- ============================================================================
-- 12. WALLET_ACCOUNTS
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.wallet_accounts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    merchant_id UUID NOT NULL REFERENCES public.merchants(id) ON DELETE CASCADE UNIQUE,
    balance_cents INTEGER DEFAULT 0 CHECK (balance_cents >= 0),
    reserved_cents INTEGER DEFAULT 0,
    currency VARCHAR(3) DEFAULT 'USD',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_wallet_accounts_merchant_id ON public.wallet_accounts(merchant_id);

DROP TRIGGER IF EXISTS update_wallet_accounts_updated_at ON public.wallet_accounts;
CREATE TRIGGER update_wallet_accounts_updated_at
    BEFORE UPDATE ON public.wallet_accounts
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.wallet_accounts ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.wallet_accounts TO authenticated;
GRANT ALL ON public.wallet_accounts TO service_role;

-- ============================================================================
-- 13. WALLET_TRANSACTIONS
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.wallet_transactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    merchant_id UUID NOT NULL REFERENCES public.merchants(id) ON DELETE CASCADE,
    wallet_id UUID NOT NULL REFERENCES public.wallet_accounts(id) ON DELETE CASCADE,
    type VARCHAR(30) NOT NULL,
    amount_cents INTEGER NOT NULL,
    balance_after_cents INTEGER,
    reference_type VARCHAR(50),
    reference_id UUID,
    description TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_wallet_transactions_merchant_id ON public.wallet_transactions(merchant_id);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_wallet_id ON public.wallet_transactions(wallet_id);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_reference
    ON public.wallet_transactions(reference_type, reference_id);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_created_at ON public.wallet_transactions(created_at DESC);

ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.wallet_transactions TO authenticated;
GRANT ALL ON public.wallet_transactions TO service_role;

-- ============================================================================
-- 14. PAYMENTS
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.payments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    merchant_id UUID NOT NULL REFERENCES public.merchants(id) ON DELETE CASCADE,
    wallet_id UUID REFERENCES public.wallet_accounts(id) ON DELETE SET NULL,
    provider VARCHAR(50) DEFAULT 'mercury',
    provider_payment_id VARCHAR(255),
    provider_checkout_id VARCHAR(255),
    method VARCHAR(20),
    status VARCHAR(20) DEFAULT 'PENDING',
    amount_cents INTEGER NOT NULL,
    fee_cents INTEGER DEFAULT 0,
    currency VARCHAR(3) DEFAULT 'USD',
    funds_confirmed BOOLEAN DEFAULT false,
    confirmed_at TIMESTAMPTZ,
    idempotency_key VARCHAR(255) UNIQUE,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payments_merchant_id ON public.payments(merchant_id);
CREATE INDEX IF NOT EXISTS idx_payments_wallet_id ON public.payments(wallet_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON public.payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_idempotency_key ON public.payments(idempotency_key);

DROP TRIGGER IF EXISTS update_payments_updated_at ON public.payments;
CREATE TRIGGER update_payments_updated_at
    BEFORE UPDATE ON public.payments
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.payments TO authenticated;
GRANT ALL ON public.payments TO service_role;

-- ============================================================================
-- 15. SHIPMENTS
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.shipments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'PENDING',
    carrier VARCHAR(50),
    service VARCHAR(100),
    tracking_number VARCHAR(100),
    tracking_url VARCHAR(500),
    label_storage_path VARCHAR(500),
    packing_slip_path VARCHAR(500),
    rate_cents INTEGER,
    actual_cost_cents INTEGER,
    weight_oz DECIMAL(10,2),
    dimensions JSONB,
    shipped_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_shipments_order_id ON public.shipments(order_id);
CREATE INDEX IF NOT EXISTS idx_shipments_status ON public.shipments(status);
CREATE INDEX IF NOT EXISTS idx_shipments_tracking_number ON public.shipments(tracking_number);

DROP TRIGGER IF EXISTS update_shipments_updated_at ON public.shipments;
CREATE TRIGGER update_shipments_updated_at
    BEFORE UPDATE ON public.shipments
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.shipments ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.shipments TO authenticated;
GRANT ALL ON public.shipments TO service_role;

-- ============================================================================
-- 16. WEBHOOK_EVENTS
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.webhook_events (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    store_id UUID,
    source VARCHAR(50),
    event_type VARCHAR(100),
    external_id VARCHAR(255),
    idempotency_key VARCHAR(255) UNIQUE,
    payload JSONB DEFAULT '{}',
    status VARCHAR(20) DEFAULT 'PENDING',
    attempts INTEGER DEFAULT 0,
    max_attempts INTEGER DEFAULT 5,
    last_error TEXT,
    next_retry_at TIMESTAMPTZ,
    processed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_webhook_events_store_id ON public.webhook_events(store_id);
CREATE INDEX IF NOT EXISTS idx_webhook_events_status ON public.webhook_events(status);
CREATE INDEX IF NOT EXISTS idx_webhook_events_source ON public.webhook_events(source);
CREATE INDEX IF NOT EXISTS idx_webhook_events_idempotency_key ON public.webhook_events(idempotency_key);
CREATE INDEX IF NOT EXISTS idx_webhook_events_external_id ON public.webhook_events(external_id);
CREATE INDEX IF NOT EXISTS idx_webhook_events_next_retry
    ON public.webhook_events(next_retry_at) WHERE status = 'FAILED';

ALTER TABLE public.webhook_events ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.webhook_events TO authenticated;
GRANT ALL ON public.webhook_events TO service_role;

-- ============================================================================
-- 17. AUDIT_EVENTS
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.audit_events (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    actor_user_id UUID,
    merchant_id UUID,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50),
    entity_id UUID,
    old_values JSONB,
    new_values JSONB,
    metadata JSONB DEFAULT '{}',
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_events_merchant_id ON public.audit_events(merchant_id);
CREATE INDEX IF NOT EXISTS idx_audit_events_action ON public.audit_events(action);
CREATE INDEX IF NOT EXISTS idx_audit_events_entity
    ON public.audit_events(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_events_created_at ON public.audit_events(created_at DESC);

ALTER TABLE public.audit_events ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.audit_events TO authenticated;
GRANT ALL ON public.audit_events TO service_role;

-- ============================================================================
-- 18. API_KEYS
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.api_keys (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    prefix VARCHAR(20),
    key_hash TEXT NOT NULL,
    permissions JSONB DEFAULT '["read"]',
    created_at TIMESTAMPTZ DEFAULT now(),
    last_used_at TIMESTAMPTZ,
    revoked_at TIMESTAMPTZ,
    rate_limit_per_hour INTEGER DEFAULT 1000
);

CREATE INDEX IF NOT EXISTS idx_api_keys_key_hash ON public.api_keys(key_hash);
CREATE INDEX IF NOT EXISTS idx_api_keys_prefix ON public.api_keys(prefix);

ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.api_keys TO authenticated;
GRANT ALL ON public.api_keys TO service_role;

-- ============================================================================
-- 19. MERCURY_INVOICES
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.mercury_invoices (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    merchant_id UUID NOT NULL REFERENCES public.merchants(id) ON DELETE CASCADE,
    mercury_invoice_id TEXT NOT NULL UNIQUE,
    mercury_invoice_number TEXT,
    mercury_slug TEXT,
    amount_cents INTEGER NOT NULL,
    status TEXT DEFAULT 'Unpaid',
    due_date DATE,
    wallet_credited BOOLEAN DEFAULT false,
    wallet_transaction_id UUID,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mercury_invoices_merchant_id ON public.mercury_invoices(merchant_id);
CREATE INDEX IF NOT EXISTS idx_mercury_invoices_status ON public.mercury_invoices(status);
CREATE INDEX IF NOT EXISTS idx_mercury_invoices_mercury_id ON public.mercury_invoices(mercury_invoice_id);

DROP TRIGGER IF EXISTS update_mercury_invoices_updated_at ON public.mercury_invoices;
CREATE TRIGGER update_mercury_invoices_updated_at
    BEFORE UPDATE ON public.mercury_invoices
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.mercury_invoices ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.mercury_invoices TO authenticated;
GRANT ALL ON public.mercury_invoices TO service_role;

-- ============================================================================
-- 20. ADMIN_SETTINGS
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.admin_settings (
    id TEXT PRIMARY KEY DEFAULT 'global',
    settings JSONB DEFAULT '{}',
    updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.admin_settings ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.admin_settings TO authenticated;
GRANT ALL ON public.admin_settings TO service_role;

-- ============================================================================
-- 21. NOTIFICATIONS
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    merchant_id UUID NOT NULL REFERENCES public.merchants(id) ON DELETE CASCADE,
    type VARCHAR(50),
    title TEXT,
    message TEXT,
    data JSONB DEFAULT '{}',
    read BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_merchant_id ON public.notifications(merchant_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread
    ON public.notifications(merchant_id) WHERE read = false;
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at DESC);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;

-- ============================================================================
-- DONE
-- ============================================================================
