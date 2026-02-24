-- ============================================================================
-- Performance indexes for common query patterns
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_orders_merchant_status
    ON public.orders(merchant_id, status);

CREATE INDEX IF NOT EXISTS idx_orders_created_desc
    ON public.orders(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_wallet_txns_merchant_created
    ON public.wallet_transactions(merchant_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_merchant_products_active
    ON public.merchant_products(merchant_id) WHERE allowed = true;

CREATE INDEX IF NOT EXISTS idx_mercury_invoices_open
    ON public.mercury_invoices(status) WHERE status IN ('Unpaid', 'Processing');
