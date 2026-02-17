-- ============================================================================
-- BTC Top-Up Wallet: HD-wallet deposits, dual-currency ledger, withdrawal + closure
-- ============================================================================

-- Modify wallet_accounts for multi-currency support
-- Drop the old UNIQUE(merchant_id) and add UNIQUE(merchant_id, currency)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'wallet_accounts'::regclass
    AND contype = 'u'
    AND array_length(conkey, 1) = 1
    AND conkey[1] = (
      SELECT attnum FROM pg_attribute
      WHERE attrelid = 'wallet_accounts'::regclass AND attname = 'merchant_id'
    )
  ) THEN
    DECLARE
      cname TEXT;
    BEGIN
      SELECT conname INTO cname FROM pg_constraint
      WHERE conrelid = 'wallet_accounts'::regclass
      AND contype = 'u'
      AND array_length(conkey, 1) = 1
      AND conkey[1] = (
        SELECT attnum FROM pg_attribute
        WHERE attrelid = 'wallet_accounts'::regclass AND attname = 'merchant_id'
      );
      IF cname IS NOT NULL THEN
        EXECUTE format('ALTER TABLE wallet_accounts DROP CONSTRAINT %I', cname);
      END IF;
    END;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'wallet_accounts'::regclass
    AND contype = 'u'
    AND conname = 'wallet_accounts_merchant_currency_unique'
  ) THEN
    ALTER TABLE wallet_accounts
      ADD CONSTRAINT wallet_accounts_merchant_currency_unique UNIQUE (merchant_id, currency);
  END IF;
END $$;

COMMENT ON COLUMN wallet_accounts.balance_cents IS 'Balance in minor units: cents for USD, satoshis for BTC';
COMMENT ON COLUMN wallet_accounts.reserved_cents IS 'Reserved in minor units: cents for USD, satoshis for BTC';

-- Update create_wallet_on_merchant trigger to create BOTH USD and BTC wallets
CREATE OR REPLACE FUNCTION create_wallet_on_merchant_insert()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO wallet_accounts (id, merchant_id, balance_cents, reserved_cents, currency)
  VALUES (gen_random_uuid(), NEW.id, 0, 0, 'USD')
  ON CONFLICT (merchant_id, currency) DO NOTHING;
  INSERT INTO wallet_accounts (id, merchant_id, balance_cents, reserved_cents, currency)
  VALUES (gen_random_uuid(), NEW.id, 0, 0, 'BTC')
  ON CONFLICT (merchant_id, currency) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS create_wallet_on_merchant ON merchants;
CREATE TRIGGER create_wallet_on_merchant
  AFTER INSERT ON merchants
  FOR EACH ROW
  EXECUTE FUNCTION create_wallet_on_merchant_insert();

-- Backfill: create BTC wallets for existing merchants that only have USD
INSERT INTO wallet_accounts (id, merchant_id, balance_cents, reserved_cents, currency)
SELECT gen_random_uuid(), m.id, 0, 0, 'BTC'
FROM merchants m
WHERE NOT EXISTS (
  SELECT 1 FROM wallet_accounts wa
  WHERE wa.merchant_id = m.id AND wa.currency = 'BTC'
);

-- New table: btc_addresses
CREATE TABLE IF NOT EXISTS btc_addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id UUID NOT NULL REFERENCES merchants(id) ON DELETE RESTRICT,
  purpose TEXT NOT NULL CHECK (purpose IN ('TOPUP', 'TIP')),
  derivation_index INT NOT NULL,
  address TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'USED', 'ARCHIVED')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  used_at TIMESTAMPTZ,
  UNIQUE(purpose, derivation_index),
  UNIQUE(address)
);

CREATE INDEX IF NOT EXISTS idx_btc_addresses_merchant_purpose ON btc_addresses (merchant_id, purpose, status);

-- New table: btc_deposits
CREATE TABLE IF NOT EXISTS btc_deposits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id UUID NOT NULL REFERENCES merchants(id) ON DELETE RESTRICT,
  purpose TEXT NOT NULL CHECK (purpose IN ('TOPUP', 'TIP')),
  address TEXT NOT NULL,
  derivation_index INT NOT NULL,
  txid TEXT NOT NULL,
  vout INT NOT NULL,
  amount_sats BIGINT NOT NULL,
  confirmations INT NOT NULL DEFAULT 0,
  block_height INT,
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','CONFIRMED','CREDITED','FLAGGED')),
  first_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  credited_at TIMESTAMPTZ,
  wallet_transaction_id UUID REFERENCES wallet_transactions(id),
  raw_provider_payload JSONB,
  UNIQUE(txid, vout)
);

CREATE INDEX IF NOT EXISTS idx_btc_deposits_merchant ON btc_deposits (merchant_id, status);
CREATE INDEX IF NOT EXISTS idx_btc_deposits_address ON btc_deposits (address);

-- New table: withdrawal_requests
CREATE TABLE IF NOT EXISTS withdrawal_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id UUID NOT NULL REFERENCES merchants(id) ON DELETE RESTRICT,
  currency TEXT NOT NULL CHECK (currency IN ('USD', 'BTC')),
  amount_minor BIGINT NOT NULL,
  payout_email TEXT,
  payout_btc_address TEXT,
  status TEXT NOT NULL DEFAULT 'PENDING_ADMIN' CHECK (status IN ('PENDING_ADMIN','PROCESSING','COMPLETED','REJECTED')),
  merchant_name_snapshot TEXT,
  merchant_email_snapshot TEXT,
  closure_confirmed_at TIMESTAMPTZ,
  requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  admin_notes TEXT,
  CHECK (
    (currency = 'USD' AND payout_email IS NOT NULL) OR
    (currency = 'BTC' AND payout_btc_address IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_withdrawal_requests_merchant ON withdrawal_requests (merchant_id, status);
CREATE INDEX IF NOT EXISTS idx_withdrawal_requests_status ON withdrawal_requests (status);

-- New table: admin_crypto_settings (encrypted key-value store)
CREATE TABLE IF NOT EXISTS admin_crypto_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  value_encrypted TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by UUID
);

-- New table: btc_address_counters (monotonic index per purpose)
CREATE TABLE IF NOT EXISTS btc_address_counters (
  purpose TEXT NOT NULL CHECK (purpose IN ('TOPUP', 'TIP')),
  next_index INT NOT NULL DEFAULT 0,
  PRIMARY KEY (purpose)
);

INSERT INTO btc_address_counters (purpose, next_index) VALUES ('TOPUP', 0), ('TIP', 0) ON CONFLICT (purpose) DO NOTHING;

-- RLS policies
ALTER TABLE btc_addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE btc_deposits ENABLE ROW LEVEL SECURITY;
ALTER TABLE withdrawal_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_crypto_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE btc_address_counters ENABLE ROW LEVEL SECURITY;

CREATE POLICY btc_addresses_merchant_read ON btc_addresses
  FOR SELECT USING (
    merchant_id IN (
      SELECT m.id FROM merchants m WHERE m.user_id = auth.uid()
    )
  );

CREATE POLICY btc_deposits_merchant_read ON btc_deposits
  FOR SELECT USING (
    merchant_id IN (
      SELECT m.id FROM merchants m WHERE m.user_id = auth.uid()
    )
  );

CREATE POLICY withdrawal_requests_merchant_read ON withdrawal_requests
  FOR SELECT USING (
    merchant_id IN (
      SELECT m.id FROM merchants m WHERE m.user_id = auth.uid()
    )
  );
