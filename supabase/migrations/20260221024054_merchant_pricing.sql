-- Per-merchant pricing: global percentage adjustment
ALTER TABLE merchants
ADD COLUMN IF NOT EXISTS price_adjustment_percent NUMERIC(5,2) DEFAULT 0;

COMMENT ON COLUMN merchants.price_adjustment_percent IS
  'Global price adjustment for this merchant. Positive = markup, negative = discount. Applied to products.cost_cents when no per-SKU override exists in merchant_products.';
