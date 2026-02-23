-- ============================================================================
-- Order & Shipment Improvements Migration
-- Adds: order_status_history, tracking_acknowledged_at, shipping_method
-- ============================================================================

-- 1. order_status_history table (defined in 001_initial_schema but not in reconcile)
CREATE TABLE IF NOT EXISTS public.order_status_history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    from_status VARCHAR(30),
    to_status VARCHAR(30) NOT NULL,
    changed_by UUID,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_order_status_history_order_id
    ON public.order_status_history(order_id);
CREATE INDEX IF NOT EXISTS idx_order_status_history_created_at
    ON public.order_status_history(created_at DESC);

ALTER TABLE public.order_status_history ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.order_status_history TO authenticated;
GRANT ALL ON public.order_status_history TO service_role;

-- RLS: merchants can read history for their own orders, admins can read all
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'order_status_history' AND policyname = 'order_status_history_select'
    ) THEN
        CREATE POLICY order_status_history_select ON public.order_status_history
            FOR SELECT USING (
                EXISTS (
                    SELECT 1 FROM public.orders o
                    WHERE o.id = order_status_history.order_id
                    AND (o.merchant_id = public.get_user_merchant_id() OR public.is_supplier_admin())
                )
            );
    END IF;
END $$;

-- 2. Add tracking_acknowledged_at to orders
ALTER TABLE public.orders
    ADD COLUMN IF NOT EXISTS tracking_acknowledged_at TIMESTAMPTZ;

-- 3. Add shipping_method to orders (STANDARD / EXPEDITED)
ALTER TABLE public.orders
    ADD COLUMN IF NOT EXISTS shipping_method VARCHAR(20) DEFAULT 'STANDARD';

-- 4. Add auto_complete_on_acknowledge default to admin_settings if table exists
-- (admin_settings is a JSONB key-value store; no schema change needed, just documenting
-- the new key: auto_complete_on_acknowledge defaults to true)
