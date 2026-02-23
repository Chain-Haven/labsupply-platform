-- ============================================================================
-- Migration: Team & Invitations
-- Adds merchant_users (multi-user merchant support), invitations table,
-- RLS helper functions, and updates existing policies for team member access.
-- ============================================================================

-- ============================================================================
-- 1. MERCHANT_USERS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.merchant_users (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    merchant_id UUID NOT NULL REFERENCES public.merchants(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'MERCHANT_USER'
        CHECK (role IN ('MERCHANT_OWNER', 'MERCHANT_ADMIN', 'MERCHANT_USER')),
    email TEXT NOT NULL,
    first_name TEXT,
    last_name TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    invited_by UUID REFERENCES auth.users(id),
    invited_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(merchant_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_merchant_users_merchant_id ON public.merchant_users(merchant_id);
CREATE INDEX IF NOT EXISTS idx_merchant_users_user_id ON public.merchant_users(user_id);
CREATE INDEX IF NOT EXISTS idx_merchant_users_email ON public.merchant_users(email);
CREATE INDEX IF NOT EXISTS idx_merchant_users_active
    ON public.merchant_users(user_id) WHERE is_active = true;

ALTER TABLE public.merchant_users ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.merchant_users TO authenticated;
GRANT ALL ON public.merchant_users TO service_role;

-- ============================================================================
-- 2. BACKFILL EXISTING MERCHANT OWNERS
-- ============================================================================

INSERT INTO public.merchant_users (merchant_id, user_id, role, email, created_at)
SELECT m.id, m.user_id, 'MERCHANT_OWNER', m.email, m.created_at
FROM public.merchants m
WHERE m.user_id IS NOT NULL
ON CONFLICT (merchant_id, user_id) DO NOTHING;

-- ============================================================================
-- 3. INVITATIONS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.invitations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    scope TEXT NOT NULL CHECK (scope IN ('merchant', 'admin')),
    merchant_id UUID REFERENCES public.merchants(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    role TEXT NOT NULL,
    permissions JSONB,
    invited_by UUID NOT NULL REFERENCES auth.users(id),
    token UUID NOT NULL DEFAULT gen_random_uuid() UNIQUE,
    status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'accepted', 'expired', 'revoked')),
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
    accepted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT scope_merchant_check CHECK (
        (scope = 'merchant' AND merchant_id IS NOT NULL) OR
        (scope = 'admin' AND merchant_id IS NULL)
    )
);

CREATE INDEX IF NOT EXISTS idx_invitations_email ON public.invitations(email);
CREATE INDEX IF NOT EXISTS idx_invitations_token ON public.invitations(token);
CREATE INDEX IF NOT EXISTS idx_invitations_merchant_id
    ON public.invitations(merchant_id) WHERE merchant_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_invitations_status
    ON public.invitations(status) WHERE status = 'pending';

ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.invitations TO authenticated;
GRANT ALL ON public.invitations TO service_role;

-- ============================================================================
-- 4. ADD is_active AND invited_by TO admin_users (IF NOT EXISTS)
-- ============================================================================

ALTER TABLE public.admin_users ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE public.admin_users ADD COLUMN IF NOT EXISTS invited_by TEXT;
ALTER TABLE public.admin_users ADD COLUMN IF NOT EXISTS invited_at TIMESTAMPTZ;

-- ============================================================================
-- 5. RLS HELPER FUNCTIONS
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_user_merchant_id()
RETURNS UUID AS $$
    SELECT merchant_id FROM public.merchant_users
    WHERE user_id = auth.uid() AND is_active = true
    LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.get_user_merchant_role()
RETURNS TEXT AS $$
    SELECT role FROM public.merchant_users
    WHERE user_id = auth.uid() AND is_active = true
    LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.is_admin_user()
RETURNS BOOLEAN AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.admin_users
        WHERE (user_id = auth.uid() OR email = (SELECT email FROM auth.users WHERE id = auth.uid()))
          AND is_active = true
    );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.admin_users
        WHERE (user_id = auth.uid() OR email = (SELECT email FROM auth.users WHERE id = auth.uid()))
          AND role = 'super_admin'
          AND is_active = true
    );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ============================================================================
-- 6. RLS POLICIES FOR merchant_users
-- ============================================================================

CREATE POLICY "merchant_users_select" ON public.merchant_users
    FOR SELECT TO authenticated
    USING (
        merchant_id = public.get_user_merchant_id()
        OR public.is_admin_user()
    );

CREATE POLICY "merchant_users_insert" ON public.merchant_users
    FOR INSERT TO authenticated
    WITH CHECK (
        (
            merchant_id = public.get_user_merchant_id()
            AND public.get_user_merchant_role() IN ('MERCHANT_OWNER', 'MERCHANT_ADMIN')
        )
        OR public.is_admin_user()
    );

CREATE POLICY "merchant_users_update" ON public.merchant_users
    FOR UPDATE TO authenticated
    USING (
        (
            merchant_id = public.get_user_merchant_id()
            AND public.get_user_merchant_role() = 'MERCHANT_OWNER'
        )
        OR public.is_admin_user()
    );

CREATE POLICY "merchant_users_delete" ON public.merchant_users
    FOR DELETE TO authenticated
    USING (
        (
            merchant_id = public.get_user_merchant_id()
            AND public.get_user_merchant_role() = 'MERCHANT_OWNER'
            AND user_id != auth.uid()
        )
        OR public.is_admin_user()
    );

-- ============================================================================
-- 7. RLS POLICIES FOR invitations
-- ============================================================================

CREATE POLICY "invitations_select" ON public.invitations
    FOR SELECT TO authenticated
    USING (
        (scope = 'merchant' AND merchant_id = public.get_user_merchant_id())
        OR (scope = 'admin' AND public.is_admin_user())
    );

CREATE POLICY "invitations_insert" ON public.invitations
    FOR INSERT TO authenticated
    WITH CHECK (
        (
            scope = 'merchant'
            AND merchant_id = public.get_user_merchant_id()
            AND public.get_user_merchant_role() IN ('MERCHANT_OWNER', 'MERCHANT_ADMIN')
        )
        OR (scope = 'admin' AND public.is_super_admin())
    );

CREATE POLICY "invitations_update" ON public.invitations
    FOR UPDATE TO authenticated
    USING (
        invited_by = auth.uid()
        OR public.is_super_admin()
    );

CREATE POLICY "invitations_delete" ON public.invitations
    FOR DELETE TO authenticated
    USING (
        invited_by = auth.uid()
        OR public.is_super_admin()
    );

-- ============================================================================
-- 8. UPDATE EXISTING RLS POLICIES ON MERCHANTS TABLE
-- ============================================================================

DROP POLICY IF EXISTS "Users can view own merchant profile" ON public.merchants;
CREATE POLICY "Users can view own merchant profile" ON public.merchants
    FOR SELECT TO authenticated
    USING (
        auth.uid() = user_id
        OR id = public.get_user_merchant_id()
    );

DROP POLICY IF EXISTS "Users can update own merchant profile" ON public.merchants;
CREATE POLICY "Users can update own merchant profile" ON public.merchants
    FOR UPDATE TO authenticated
    USING (
        auth.uid() = user_id
        OR id = public.get_user_merchant_id()
    );

-- ============================================================================
-- 9. ADD RLS POLICIES FOR MERCHANT-SCOPED TABLES (service_role bypasses RLS,
--    but authenticated role needs these for Supabase client calls)
-- ============================================================================

-- STORES: merchant team members can view their merchant's stores
DO $$ BEGIN
    CREATE POLICY "Team members can view merchant stores" ON public.stores
        FOR SELECT TO authenticated
        USING (merchant_id = public.get_user_merchant_id());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ORDERS: merchant team members can view their merchant's orders
DO $$ BEGIN
    CREATE POLICY "Team members can view merchant orders" ON public.orders
        FOR SELECT TO authenticated
        USING (merchant_id = public.get_user_merchant_id());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- MERCHANT_PRODUCTS: merchant team members can view their merchant's products
DO $$ BEGIN
    CREATE POLICY "Team members can view merchant products" ON public.merchant_products
        FOR SELECT TO authenticated
        USING (merchant_id = public.get_user_merchant_id());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- WALLET_ACCOUNTS: merchant team members can view their merchant's wallet
DO $$ BEGIN
    CREATE POLICY "Team members can view merchant wallet" ON public.wallet_accounts
        FOR SELECT TO authenticated
        USING (merchant_id = public.get_user_merchant_id());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- WALLET_TRANSACTIONS: merchant team members can view their merchant's transactions
DO $$ BEGIN
    CREATE POLICY "Team members can view merchant transactions" ON public.wallet_transactions
        FOR SELECT TO authenticated
        USING (merchant_id = public.get_user_merchant_id());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- PAYMENTS: merchant team members can view their merchant's payments
DO $$ BEGIN
    CREATE POLICY "Team members can view merchant payments" ON public.payments
        FOR SELECT TO authenticated
        USING (merchant_id = public.get_user_merchant_id());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- NOTIFICATIONS: merchant team members can view their merchant's notifications
DO $$ BEGIN
    CREATE POLICY "Team members can view merchant notifications" ON public.notifications
        FOR SELECT TO authenticated
        USING (merchant_id = public.get_user_merchant_id());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- MERCURY_INVOICES: merchant team members can view their merchant's invoices
DO $$ BEGIN
    CREATE POLICY "Team members can view merchant invoices" ON public.mercury_invoices
        FOR SELECT TO authenticated
        USING (merchant_id = public.get_user_merchant_id());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- CONNECT_CODES: merchant team members can view their merchant's connect codes
DO $$ BEGIN
    CREATE POLICY "Team members can view merchant connect codes" ON public.connect_codes
        FOR SELECT TO authenticated
        USING (merchant_id = public.get_user_merchant_id());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================================
-- DONE
-- ============================================================================
