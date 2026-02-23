-- ============================================================================
-- Fix testing_order_items to allow catalog products without DB entries
-- Makes product_id nullable and adds a catalog_product_id text field
-- ============================================================================

ALTER TABLE testing_order_items ALTER COLUMN product_id DROP NOT NULL;
ALTER TABLE testing_order_items ADD COLUMN IF NOT EXISTS catalog_product_id TEXT;
