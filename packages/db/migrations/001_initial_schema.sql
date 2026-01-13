-- ============================================================================
-- LabSupply Platform - Initial Database Schema
-- Version: 001
-- Description: Core tables for supplier + merchant integration platform
-- ============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- ENUMS
-- ============================================================================

CREATE TYPE merchant_status AS ENUM (
  'PENDING',
  'ACTIVE',
  'SUSPENDED',
  'CLOSED'
);

CREATE TYPE store_status AS ENUM (
  'PENDING',
  'CONNECTED',
  'DISCONNECTED',
  'ERROR'
);

CREATE TYPE store_type AS ENUM (
  'woocommerce'
);

CREATE TYPE order_status AS ENUM (
  'RECEIVED',
  'AWAITING_FUNDS',
  'FUNDED',
  'RELEASED_TO_FULFILLMENT',
  'PICKING',
  'PACKED',
  'SHIPPED',
  'COMPLETE',
  'ON_HOLD_PAYMENT',
  'ON_HOLD_COMPLIANCE',
  'CANCELLED',
  'REFUNDED'
);

CREATE TYPE payment_status AS ENUM (
  'PENDING',
  'PROCESSING',
  'SUCCEEDED',
  'FAILED',
  'REFUNDED'
);

CREATE TYPE payment_method AS ENUM (
  'card',
  'ach',
  'wire'
);

CREATE TYPE wallet_transaction_type AS ENUM (
  'TOPUP',
  'RESERVATION',
  'RESERVATION_RELEASE',
  'SETTLEMENT',
  'ADJUSTMENT',
  'REFUND'
);

CREATE TYPE shipment_status AS ENUM (
  'PENDING',
  'LABEL_CREATED',
  'PICKED_UP',
  'IN_TRANSIT',
  'DELIVERED',
  'FAILED',
  'RETURNED'
);

CREATE TYPE webhook_event_status AS ENUM (
  'PENDING',
  'PROCESSING',
  'COMPLETED',
  'FAILED',
  'DEAD_LETTER'
);

CREATE TYPE user_role AS ENUM (
  'MERCHANT_OWNER',
  'MERCHANT_ADMIN',
  'MERCHANT_USER',
  'SUPPLIER_SUPERADMIN',
  'SUPPLIER_OPS',
  'SUPPLIER_SUPPORT'
);

CREATE TYPE product_asset_type AS ENUM (
  'IMAGE',
  'THUMBNAIL',
  'LABEL_ARTWORK',
  'COA',
  'DOCUMENTATION'
);

-- ============================================================================
-- MERCHANTS & USERS
-- ============================================================================

CREATE TABLE merchants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  company_name VARCHAR(255),
  contact_email VARCHAR(255) NOT NULL,
  contact_phone VARCHAR(30),
  billing_address JSONB,
  tax_id VARCHAR(50),
  status merchant_status NOT NULL DEFAULT 'PENDING',
  tier VARCHAR(50) NOT NULL DEFAULT 'standard',
  agreement_accepted_at TIMESTAMPTZ,
  terms_accepted_at TIMESTAMPTZ,
  allowed_regions TEXT[],
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE merchant_users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  merchant_id UUID NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role user_role NOT NULL DEFAULT 'MERCHANT_USER',
  email VARCHAR(255) NOT NULL,
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(merchant_id, user_id)
);

CREATE INDEX idx_merchant_users_merchant ON merchant_users(merchant_id);
CREATE INDEX idx_merchant_users_user ON merchant_users(user_id);

-- Supplier admin users (separate from merchants)
CREATE TABLE supplier_users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role user_role NOT NULL,
  email VARCHAR(255) NOT NULL,
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id),
  CONSTRAINT valid_supplier_role CHECK (role IN ('SUPPLIER_SUPERADMIN', 'SUPPLIER_OPS', 'SUPPLIER_SUPPORT'))
);

-- ============================================================================
-- STORES & CONNECTION
-- ============================================================================

CREATE TABLE stores (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  merchant_id UUID NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
  type store_type NOT NULL DEFAULT 'woocommerce',
  name VARCHAR(255) NOT NULL,
  url VARCHAR(500) NOT NULL,
  status store_status NOT NULL DEFAULT 'PENDING',
  currency VARCHAR(3) DEFAULT 'USD',
  timezone VARCHAR(50),
  woo_version VARCHAR(20),
  metadata JSONB DEFAULT '{}',
  last_sync_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_stores_merchant ON stores(merchant_id);
CREATE INDEX idx_stores_url ON stores(url);

CREATE TABLE store_secrets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  secret_hash VARCHAR(128) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  rotated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_store_secrets_store ON store_secrets(store_id);
CREATE INDEX idx_store_secrets_active ON store_secrets(store_id, is_active) WHERE is_active = true;

CREATE TABLE connect_codes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  merchant_id UUID NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
  code VARCHAR(32) NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  store_id UUID REFERENCES stores(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_connect_codes_code ON connect_codes(code);
CREATE INDEX idx_connect_codes_merchant ON connect_codes(merchant_id);

-- ============================================================================
-- PRODUCTS & CATALOG
-- ============================================================================

CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sku VARCHAR(50) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  short_description VARCHAR(500),
  attributes JSONB DEFAULT '{}',
  dimensions JSONB,
  weight_grams INTEGER,
  shipping_class VARCHAR(50),
  cost_cents INTEGER NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  requires_coa BOOLEAN NOT NULL DEFAULT false,
  compliance_copy TEXT,
  disclaimer TEXT,
  min_order_qty INTEGER DEFAULT 1,
  max_order_qty INTEGER,
  category VARCHAR(100),
  tags TEXT[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_products_sku ON products(sku);
CREATE INDEX idx_products_active ON products(active) WHERE active = true;
CREATE INDEX idx_products_category ON products(category);

CREATE TABLE product_assets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  type product_asset_type NOT NULL,
  storage_path VARCHAR(500) NOT NULL,
  filename VARCHAR(255) NOT NULL,
  mime_type VARCHAR(100),
  size_bytes INTEGER,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_product_assets_product ON product_assets(product_id);
CREATE INDEX idx_product_assets_type ON product_assets(product_id, type);

CREATE TABLE merchant_products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  merchant_id UUID NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  allowed BOOLEAN NOT NULL DEFAULT true,
  wholesale_price_cents INTEGER NOT NULL,
  map_price_cents INTEGER,
  custom_title VARCHAR(255),
  custom_description TEXT,
  sync_title BOOLEAN NOT NULL DEFAULT true,
  sync_description BOOLEAN NOT NULL DEFAULT true,
  sync_price BOOLEAN NOT NULL DEFAULT true,
  region_restrictions TEXT[],
  min_qty INTEGER,
  max_qty INTEGER,
  daily_cap INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(merchant_id, product_id)
);

CREATE INDEX idx_merchant_products_merchant ON merchant_products(merchant_id);
CREATE INDEX idx_merchant_products_product ON merchant_products(product_id);
CREATE INDEX idx_merchant_products_allowed ON merchant_products(merchant_id, allowed) WHERE allowed = true;

-- Merchant-uploaded label artwork per SKU
CREATE TABLE merchant_product_assets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  merchant_id UUID NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  type product_asset_type NOT NULL,
  storage_path VARCHAR(500) NOT NULL,
  filename VARCHAR(255) NOT NULL,
  mime_type VARCHAR(100),
  size_bytes INTEGER,
  approved BOOLEAN DEFAULT false,
  approved_at TIMESTAMPTZ,
  approved_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_merchant_product_assets_merchant ON merchant_product_assets(merchant_id);
CREATE INDEX idx_merchant_product_assets_product ON merchant_product_assets(product_id);

-- ============================================================================
-- INVENTORY & LOTS
-- ============================================================================

CREATE TABLE inventory (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE UNIQUE,
  on_hand INTEGER NOT NULL DEFAULT 0,
  reserved INTEGER NOT NULL DEFAULT 0,
  incoming INTEGER DEFAULT 0,
  reorder_point INTEGER,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT positive_inventory CHECK (on_hand >= 0 AND reserved >= 0)
);

CREATE INDEX idx_inventory_product ON inventory(product_id);

CREATE TABLE lots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  lot_code VARCHAR(100) NOT NULL,
  coa_storage_path VARCHAR(500),
  manufactured_at DATE,
  expires_at DATE,
  quantity INTEGER,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(product_id, lot_code)
);

CREATE INDEX idx_lots_product ON lots(product_id);
CREATE INDEX idx_lots_code ON lots(lot_code);

-- ============================================================================
-- ORDERS
-- ============================================================================

CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE RESTRICT,
  merchant_id UUID NOT NULL REFERENCES merchants(id) ON DELETE RESTRICT,
  woo_order_id VARCHAR(50) NOT NULL,
  woo_order_number VARCHAR(50),
  status order_status NOT NULL DEFAULT 'RECEIVED',
  currency VARCHAR(3) NOT NULL DEFAULT 'USD',
  subtotal_cents INTEGER NOT NULL DEFAULT 0,
  handling_cents INTEGER NOT NULL DEFAULT 0,
  shipping_estimate_cents INTEGER NOT NULL DEFAULT 0,
  total_estimate_cents INTEGER NOT NULL DEFAULT 0,
  actual_total_cents INTEGER,
  shipping_address JSONB NOT NULL,
  billing_address JSONB,
  customer_email VARCHAR(255),
  customer_note TEXT,
  supplier_notes TEXT,
  wallet_reservation_id UUID,
  idempotency_key VARCHAR(255) NOT NULL UNIQUE,
  funded_at TIMESTAMPTZ,
  released_at TIMESTAMPTZ,
  shipped_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_orders_store ON orders(store_id);
CREATE INDEX idx_orders_merchant ON orders(merchant_id);
CREATE INDEX idx_orders_woo_order ON orders(store_id, woo_order_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_created ON orders(created_at DESC);
CREATE UNIQUE INDEX idx_orders_idempotency ON orders(idempotency_key);

CREATE TABLE order_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  sku VARCHAR(50) NOT NULL,
  name VARCHAR(255) NOT NULL,
  qty INTEGER NOT NULL,
  unit_price_cents INTEGER NOT NULL,
  lot_id UUID REFERENCES lots(id),
  lot_code VARCHAR(100),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_order_items_order ON order_items(order_id);
CREATE INDEX idx_order_items_product ON order_items(product_id);

-- Order status history for audit trail
CREATE TABLE order_status_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  from_status order_status,
  to_status order_status NOT NULL,
  changed_by UUID,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_order_status_history_order ON order_status_history(order_id);

-- ============================================================================
-- WALLET & PAYMENTS
-- ============================================================================

CREATE TABLE wallet_accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  merchant_id UUID NOT NULL REFERENCES merchants(id) ON DELETE RESTRICT UNIQUE,
  balance_cents INTEGER NOT NULL DEFAULT 0,
  reserved_cents INTEGER NOT NULL DEFAULT 0,
  currency VARCHAR(3) NOT NULL DEFAULT 'USD',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT non_negative_balance CHECK (balance_cents >= 0)
);

CREATE INDEX idx_wallet_accounts_merchant ON wallet_accounts(merchant_id);

CREATE TABLE wallet_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  merchant_id UUID NOT NULL REFERENCES merchants(id) ON DELETE RESTRICT,
  wallet_id UUID NOT NULL REFERENCES wallet_accounts(id) ON DELETE RESTRICT,
  type wallet_transaction_type NOT NULL,
  amount_cents INTEGER NOT NULL,
  balance_after_cents INTEGER NOT NULL,
  reference_type VARCHAR(50),
  reference_id UUID,
  description TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_wallet_transactions_merchant ON wallet_transactions(merchant_id);
CREATE INDEX idx_wallet_transactions_wallet ON wallet_transactions(wallet_id);
CREATE INDEX idx_wallet_transactions_created ON wallet_transactions(merchant_id, created_at DESC);
CREATE INDEX idx_wallet_transactions_reference ON wallet_transactions(reference_type, reference_id);

CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  merchant_id UUID NOT NULL REFERENCES merchants(id) ON DELETE RESTRICT,
  wallet_id UUID NOT NULL REFERENCES wallet_accounts(id) ON DELETE RESTRICT,
  provider VARCHAR(50) NOT NULL DEFAULT 'stripe',
  provider_payment_id VARCHAR(255),
  provider_checkout_id VARCHAR(255),
  method payment_method NOT NULL DEFAULT 'card',
  status payment_status NOT NULL DEFAULT 'PENDING',
  amount_cents INTEGER NOT NULL,
  fee_cents INTEGER DEFAULT 0,
  currency VARCHAR(3) NOT NULL DEFAULT 'USD',
  funds_confirmed BOOLEAN NOT NULL DEFAULT false,
  confirmed_at TIMESTAMPTZ,
  idempotency_key VARCHAR(255) UNIQUE,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_payments_merchant ON payments(merchant_id);
CREATE INDEX idx_payments_provider_id ON payments(provider_payment_id);
CREATE INDEX idx_payments_checkout_id ON payments(provider_checkout_id);
CREATE INDEX idx_payments_status ON payments(status);

-- ============================================================================
-- SHIPMENTS
-- ============================================================================

CREATE TABLE shipments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE RESTRICT,
  status shipment_status NOT NULL DEFAULT 'PENDING',
  carrier VARCHAR(50) NOT NULL,
  service VARCHAR(100) NOT NULL,
  tracking_number VARCHAR(100),
  tracking_url VARCHAR(500),
  label_storage_path VARCHAR(500),
  packing_slip_path VARCHAR(500),
  rate_cents INTEGER,
  actual_cost_cents INTEGER,
  weight_oz DECIMAL(10, 2),
  dimensions JSONB,
  shipped_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_shipments_order ON shipments(order_id);
CREATE INDEX idx_shipments_tracking ON shipments(tracking_number);
CREATE INDEX idx_shipments_status ON shipments(status);

-- ============================================================================
-- WEBHOOKS & EVENTS
-- ============================================================================

CREATE TABLE webhook_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID REFERENCES stores(id) ON DELETE SET NULL,
  source VARCHAR(50) NOT NULL,
  event_type VARCHAR(100) NOT NULL,
  external_id VARCHAR(255),
  idempotency_key VARCHAR(255) NOT NULL UNIQUE,
  payload JSONB NOT NULL,
  status webhook_event_status NOT NULL DEFAULT 'PENDING',
  attempts INTEGER NOT NULL DEFAULT 0,
  max_attempts INTEGER NOT NULL DEFAULT 5,
  last_error TEXT,
  next_retry_at TIMESTAMPTZ,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_webhook_events_store ON webhook_events(store_id);
CREATE INDEX idx_webhook_events_status ON webhook_events(status);
CREATE INDEX idx_webhook_events_retry ON webhook_events(status, next_retry_at) WHERE status IN ('PENDING', 'FAILED');
CREATE UNIQUE INDEX idx_webhook_events_idempotency ON webhook_events(idempotency_key);

-- ============================================================================
-- AUDIT LOG
-- ============================================================================

CREATE TABLE audit_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  actor_user_id UUID,
  merchant_id UUID,
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(50) NOT NULL,
  entity_id UUID NOT NULL,
  old_values JSONB,
  new_values JSONB,
  metadata JSONB DEFAULT '{}',
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_events_actor ON audit_events(actor_user_id);
CREATE INDEX idx_audit_events_merchant ON audit_events(merchant_id);
CREATE INDEX idx_audit_events_entity ON audit_events(entity_type, entity_id);
CREATE INDEX idx_audit_events_action ON audit_events(action);
CREATE INDEX idx_audit_events_created ON audit_events(created_at DESC);

-- ============================================================================
-- NOTIFICATIONS (Optional - for in-app notifications)
-- ============================================================================

CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  merchant_id UUID REFERENCES merchants(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  data JSONB DEFAULT '{}',
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notifications_merchant ON notifications(merchant_id);
CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_unread ON notifications(user_id, read_at) WHERE read_at IS NULL;

-- ============================================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================================

-- Updated at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers
CREATE TRIGGER update_merchants_updated_at
  BEFORE UPDATE ON merchants
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_stores_updated_at
  BEFORE UPDATE ON stores
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_merchant_products_updated_at
  BEFORE UPDATE ON merchant_products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_wallet_accounts_updated_at
  BEFORE UPDATE ON wallet_accounts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payments_updated_at
  BEFORE UPDATE ON payments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_shipments_updated_at
  BEFORE UPDATE ON shipments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to log order status changes
CREATE OR REPLACE FUNCTION log_order_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO order_status_history (order_id, from_status, to_status)
    VALUES (NEW.id, OLD.status, NEW.status);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER log_order_status_trigger
  AFTER UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION log_order_status_change();

-- Function to update inventory on order release
CREATE OR REPLACE FUNCTION reserve_inventory_on_release()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status != 'RELEASED_TO_FULFILLMENT' AND NEW.status = 'RELEASED_TO_FULFILLMENT' THEN
    -- Reserve inventory for all items
    UPDATE inventory i
    SET reserved = reserved + oi.qty
    FROM order_items oi
    WHERE oi.order_id = NEW.id AND oi.product_id = i.product_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER reserve_inventory_trigger
  AFTER UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION reserve_inventory_on_release();

-- Function to release inventory on shipment
CREATE OR REPLACE FUNCTION release_inventory_on_ship()
RETURNS TRIGGER AS $$
DECLARE
  order_record RECORD;
BEGIN
  IF OLD.status != 'SHIPPED' AND NEW.status = 'SHIPPED' THEN
    SELECT * INTO order_record FROM orders WHERE id = NEW.order_id;
    
    -- Decrease on_hand and reserved
    UPDATE inventory i
    SET 
      on_hand = on_hand - oi.qty,
      reserved = reserved - oi.qty
    FROM order_items oi
    WHERE oi.order_id = NEW.order_id AND oi.product_id = i.product_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER release_inventory_trigger
  AFTER UPDATE ON shipments
  FOR EACH ROW EXECUTE FUNCTION release_inventory_on_ship();

-- Create wallet account when merchant is created
CREATE OR REPLACE FUNCTION create_wallet_on_merchant()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO wallet_accounts (merchant_id, currency)
  VALUES (NEW.id, 'USD');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER create_wallet_trigger
  AFTER INSERT ON merchants
  FOR EACH ROW EXECUTE FUNCTION create_wallet_on_merchant();

-- Create inventory record when product is created
CREATE OR REPLACE FUNCTION create_inventory_on_product()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO inventory (product_id)
  VALUES (NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER create_inventory_trigger
  AFTER INSERT ON products
  FOR EACH ROW EXECUTE FUNCTION create_inventory_on_product();
