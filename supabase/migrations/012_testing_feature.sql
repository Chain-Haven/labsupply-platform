-- ============================================================================
-- 012: Testing Feature
-- Adds testing labs, testing orders, and testing order items tables.
-- Also adds order_type column to orders for distinguishing regular vs testing.
-- ============================================================================

-- Order type enum
DO $$ BEGIN
  CREATE TYPE order_type AS ENUM ('REGULAR', 'TESTING');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Testing order status enum
DO $$ BEGIN
  CREATE TYPE testing_order_status AS ENUM (
    'PENDING',
    'AWAITING_SHIPMENT',
    'SHIPPED',
    'IN_TESTING',
    'RESULTS_RECEIVED',
    'COMPLETE'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================================
-- TESTING LABS
-- ============================================================================

CREATE TABLE IF NOT EXISTS testing_labs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(30),
  address JSONB,
  is_default BOOLEAN NOT NULL DEFAULT false,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_testing_labs_active ON testing_labs(active) WHERE active = true;

-- ============================================================================
-- ADD order_type TO ORDERS
-- ============================================================================

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS order_type VARCHAR(20) NOT NULL DEFAULT 'REGULAR';

CREATE INDEX idx_orders_order_type ON orders(order_type);

-- ============================================================================
-- TESTING ORDERS
-- ============================================================================

CREATE TABLE IF NOT EXISTS testing_orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  merchant_id UUID NOT NULL REFERENCES merchants(id) ON DELETE RESTRICT,
  testing_lab_id UUID NOT NULL REFERENCES testing_labs(id) ON DELETE RESTRICT,
  status testing_order_status NOT NULL DEFAULT 'PENDING',
  tracking_number VARCHAR(100),
  tracking_url VARCHAR(500),
  carrier VARCHAR(50),
  tracking_notified_at TIMESTAMPTZ,
  shipping_fee_cents INTEGER NOT NULL DEFAULT 0,
  total_testing_fee_cents INTEGER NOT NULL DEFAULT 0,
  total_product_cost_cents INTEGER NOT NULL DEFAULT 0,
  grand_total_cents INTEGER NOT NULL DEFAULT 0,
  invoice_email VARCHAR(255) NOT NULL DEFAULT 'whitelabel@peptidetech.co',
  lab_invoice_number VARCHAR(100),
  lab_invoice_amount_cents INTEGER,
  notes TEXT,
  results_received_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_testing_orders_merchant ON testing_orders(merchant_id);
CREATE INDEX idx_testing_orders_lab ON testing_orders(testing_lab_id);
CREATE INDEX idx_testing_orders_status ON testing_orders(status);
CREATE INDEX idx_testing_orders_order ON testing_orders(order_id);
CREATE INDEX idx_testing_orders_tracking_poll
  ON testing_orders(status, tracking_notified_at)
  WHERE status = 'AWAITING_SHIPMENT' AND tracking_notified_at IS NULL;

-- ============================================================================
-- TESTING ORDER ITEMS
-- ============================================================================

CREATE TABLE IF NOT EXISTS testing_order_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  testing_order_id UUID NOT NULL REFERENCES testing_orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  sku VARCHAR(50) NOT NULL,
  product_name VARCHAR(255) NOT NULL,
  base_qty INTEGER NOT NULL DEFAULT 1,
  addon_conformity BOOLEAN NOT NULL DEFAULT false,
  addon_sterility BOOLEAN NOT NULL DEFAULT false,
  addon_endotoxins BOOLEAN NOT NULL DEFAULT false,
  addon_net_content BOOLEAN NOT NULL DEFAULT false,
  addon_purity BOOLEAN NOT NULL DEFAULT false,
  total_qty INTEGER NOT NULL DEFAULT 1,
  product_cost_cents INTEGER NOT NULL DEFAULT 0,
  testing_fee_cents INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_testing_order_items_order ON testing_order_items(testing_order_id);
CREATE INDEX idx_testing_order_items_product ON testing_order_items(product_id);

-- ============================================================================
-- TESTING RESULTS STORAGE BUCKET
-- ============================================================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('testing-results', 'testing-results', false)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

ALTER TABLE testing_labs ENABLE ROW LEVEL SECURITY;
ALTER TABLE testing_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE testing_order_items ENABLE ROW LEVEL SECURITY;

-- Service role has full access (used by API backend)
CREATE POLICY "Service role full access on testing_labs"
  ON testing_labs FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access on testing_orders"
  ON testing_orders FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access on testing_order_items"
  ON testing_order_items FOR ALL
  USING (auth.role() = 'service_role');

-- Merchants can read their own testing orders
CREATE POLICY "Merchants can view own testing orders"
  ON testing_orders FOR SELECT
  USING (merchant_id IN (
    SELECT m.id FROM merchants m
    JOIN merchant_users mu ON mu.merchant_id = m.id
    WHERE mu.user_id = auth.uid()
  ));

CREATE POLICY "Merchants can view own testing order items"
  ON testing_order_items FOR SELECT
  USING (testing_order_id IN (
    SELECT to2.id FROM testing_orders to2
    WHERE to2.merchant_id IN (
      SELECT m.id FROM merchants m
      JOIN merchant_users mu ON mu.merchant_id = m.id
      WHERE mu.user_id = auth.uid()
    )
  ));

-- Testing labs are readable by authenticated users
CREATE POLICY "Authenticated users can view active testing labs"
  ON testing_labs FOR SELECT
  USING (active = true AND auth.role() = 'authenticated');

-- Updated_at trigger for testing tables
CREATE OR REPLACE FUNCTION update_testing_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER testing_labs_updated_at
  BEFORE UPDATE ON testing_labs
  FOR EACH ROW EXECUTE FUNCTION update_testing_updated_at();

CREATE TRIGGER testing_orders_updated_at
  BEFORE UPDATE ON testing_orders
  FOR EACH ROW EXECUTE FUNCTION update_testing_updated_at();

-- Seed a default testing lab
INSERT INTO testing_labs (name, email, is_default)
VALUES ('Freedom Diagnostics', 'lab@freedomdiagnostics.com', true)
ON CONFLICT DO NOTHING;
