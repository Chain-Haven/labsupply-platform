-- ============================================================================
-- WhiteLabel Peptides Platform - Mercury Invoicing Migration
-- Version: 004
-- Description: Add Mercury invoicing support, remove card payment dependencies
-- ============================================================================

-- ============================================================================
-- ENUMS
-- ============================================================================

CREATE TYPE mercury_invoice_status AS ENUM (
  'Unpaid',
  'Processing',
  'Paid',
  'Cancelled'
);

-- Update payment_method enum to reflect Mercury invoicing
ALTER TYPE payment_method ADD VALUE IF NOT EXISTS 'mercury_invoice';
ALTER TYPE payment_method ADD VALUE IF NOT EXISTS 'adjustment';

-- ============================================================================
-- ALTER merchants TABLE - Add Mercury billing columns
-- ============================================================================

ALTER TABLE merchants
  ADD COLUMN IF NOT EXISTS mercury_customer_id UUID,
  ADD COLUMN IF NOT EXISTS billing_email TEXT,
  ADD COLUMN IF NOT EXISTS low_balance_threshold_cents INTEGER NOT NULL DEFAULT 100000,
  ADD COLUMN IF NOT EXISTS target_balance_cents INTEGER NOT NULL DEFAULT 300000;

COMMENT ON COLUMN merchants.mercury_customer_id IS 'Mercury AR customer ID for invoicing';
COMMENT ON COLUMN merchants.billing_email IS 'Email address where Mercury invoices are sent';
COMMENT ON COLUMN merchants.low_balance_threshold_cents IS 'Balance threshold (cents) below which an invoice is auto-generated. Default $1,000';
COMMENT ON COLUMN merchants.target_balance_cents IS 'Target balance (cents) to reach when auto-invoicing. Default $3,000';

-- Constraint: target must be greater than threshold
ALTER TABLE merchants
  ADD CONSTRAINT chk_target_gt_threshold
  CHECK (target_balance_cents >= low_balance_threshold_cents);

-- ============================================================================
-- NEW TABLE: mercury_invoices
-- ============================================================================

CREATE TABLE mercury_invoices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  merchant_id UUID NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
  mercury_invoice_id TEXT NOT NULL,
  mercury_invoice_number TEXT,
  mercury_slug TEXT,
  amount_cents INTEGER NOT NULL CHECK (amount_cents > 0),
  status mercury_invoice_status NOT NULL DEFAULT 'Unpaid',
  due_date DATE NOT NULL,
  wallet_credited BOOLEAN NOT NULL DEFAULT FALSE,
  wallet_transaction_id UUID REFERENCES wallet_transactions(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_mercury_invoices_merchant ON mercury_invoices(merchant_id);
CREATE INDEX idx_mercury_invoices_status ON mercury_invoices(status);
CREATE INDEX idx_mercury_invoices_mercury_id ON mercury_invoices(mercury_invoice_id);
CREATE UNIQUE INDEX idx_mercury_invoices_mercury_id_unique ON mercury_invoices(mercury_invoice_id);

COMMENT ON TABLE mercury_invoices IS 'Tracks Mercury AR invoices sent to merchants for wallet funding';
COMMENT ON COLUMN mercury_invoices.mercury_invoice_id IS 'Invoice ID from Mercury API';
COMMENT ON COLUMN mercury_invoices.mercury_slug IS 'Slug for constructing payment URL: https://app.mercury.com/pay/{slug}';
COMMENT ON COLUMN mercury_invoices.wallet_credited IS 'Whether the paid invoice amount has been credited to the merchant wallet';

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_mercury_invoices_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_mercury_invoices_updated_at
  BEFORE UPDATE ON mercury_invoices
  FOR EACH ROW
  EXECUTE FUNCTION update_mercury_invoices_updated_at();

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE mercury_invoices ENABLE ROW LEVEL SECURITY;

-- Merchants can read their own invoices
CREATE POLICY mercury_invoices_merchant_select ON mercury_invoices
  FOR SELECT
  USING (
    merchant_id IN (
      SELECT mu.merchant_id FROM merchant_users mu
      WHERE mu.user_id = auth.uid()
    )
  );

-- Service role (admin/API) has full access
CREATE POLICY mercury_invoices_service_all ON mercury_invoices
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Admin users can read all invoices
CREATE POLICY mercury_invoices_admin_select ON mercury_invoices
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM admin_users au
      WHERE au.user_id = auth.uid()
    )
  );
