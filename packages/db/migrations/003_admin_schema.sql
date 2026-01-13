-- Admin Schema Migration
-- Adds tables for admin users, API keys, KYB reviews, and inventory logging

-- =============================================================================
-- Admin Users (extends Supabase auth.users)
-- =============================================================================
CREATE TABLE IF NOT EXISTS admin_users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('supplier_admin', 'supplier_staff', 'inventory_manager', 'kyb_reviewer')),
    display_name TEXT,
    permissions JSONB DEFAULT '{
        "merchants": {"read": true, "write": false},
        "inventory": {"read": true, "write": false},
        "orders": {"read": true, "write": false},
        "kyb": {"read": false, "write": false},
        "settings": {"read": false, "write": false}
    }'::jsonb,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    last_login_at TIMESTAMPTZ
);

-- Trigger to update updated_at
CREATE TRIGGER update_admin_users_updated_at
    BEFORE UPDATE ON admin_users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- API Keys for Programmatic Access
-- =============================================================================
CREATE TABLE IF NOT EXISTS api_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    key_hash TEXT NOT NULL UNIQUE,  -- bcrypt hash of the full key
    key_prefix TEXT NOT NULL,        -- First 8 chars for identification (e.g., "lsk_abc1...")
    permissions JSONB DEFAULT '{
        "inventory": {"read": true, "write": true},
        "merchants": {"read": false, "write": false},
        "orders": {"read": false, "write": false}
    }'::jsonb,
    rate_limit_per_hour INTEGER DEFAULT 1000,
    ip_allowlist TEXT[],             -- Optional IP restrictions
    created_by UUID REFERENCES admin_users(id),
    last_used_at TIMESTAMPTZ,
    last_used_ip INET,
    usage_count INTEGER DEFAULT 0,
    expires_at TIMESTAMPTZ,
    revoked_at TIMESTAMPTZ,
    revoked_by UUID REFERENCES admin_users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_api_keys_prefix ON api_keys(key_prefix);
CREATE INDEX idx_api_keys_active ON api_keys(id) WHERE revoked_at IS NULL AND (expires_at IS NULL OR expires_at > NOW());

-- =============================================================================
-- KYB Review Decisions
-- =============================================================================
CREATE TABLE IF NOT EXISTS kyb_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    merchant_id UUID NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
    reviewer_id UUID NOT NULL REFERENCES admin_users(id),
    decision TEXT NOT NULL CHECK (decision IN ('approved', 'rejected', 'more_info_requested')),
    reason TEXT,
    internal_notes TEXT,  -- Notes visible only to admins
    documents_reviewed JSONB DEFAULT '[]'::jsonb,  -- List of document IDs reviewed
    verification_checklist JSONB DEFAULT '{}'::jsonb,  -- Checklist items completed
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_kyb_reviews_merchant ON kyb_reviews(merchant_id);
CREATE INDEX idx_kyb_reviews_reviewer ON kyb_reviews(reviewer_id);

-- =============================================================================
-- Inventory Change Log
-- =============================================================================
CREATE TABLE IF NOT EXISTS inventory_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    sku TEXT NOT NULL,
    change_type TEXT NOT NULL CHECK (change_type IN (
        'adjustment',     -- Manual stock adjustment
        'order_reserved', -- Stock reserved for order
        'order_fulfilled',-- Stock deducted on fulfillment
        'order_cancelled',-- Stock returned from cancelled order
        'import',         -- Bulk import
        'restock',        -- Restocking
        'correction'      -- Inventory count correction
    )),
    quantity_before INTEGER NOT NULL,
    quantity_after INTEGER NOT NULL,
    quantity_change INTEGER GENERATED ALWAYS AS (quantity_after - quantity_before) STORED,
    reason TEXT,
    reference_id TEXT,  -- Order ID, import batch ID, etc.
    source TEXT NOT NULL CHECK (source IN ('api', 'admin_portal', 'order_system', 'import')),
    performed_by UUID REFERENCES admin_users(id),
    api_key_id UUID REFERENCES api_keys(id),
    ip_address INET,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_inventory_log_product ON inventory_log(product_id);
CREATE INDEX idx_inventory_log_sku ON inventory_log(sku);
CREATE INDEX idx_inventory_log_created ON inventory_log(created_at DESC);
CREATE INDEX idx_inventory_log_type ON inventory_log(change_type);

-- =============================================================================
-- Add KYB fields to Merchants table
-- =============================================================================
DO $$ 
BEGIN
    -- Add kyb_status if not exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'merchants' AND column_name = 'kyb_status') THEN
        ALTER TABLE merchants ADD COLUMN kyb_status TEXT 
            DEFAULT 'pending' CHECK (kyb_status IN ('pending', 'in_review', 'approved', 'rejected', 'more_info_requested'));
    END IF;
    
    -- Add kyb_submitted_at if not exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'merchants' AND column_name = 'kyb_submitted_at') THEN
        ALTER TABLE merchants ADD COLUMN kyb_submitted_at TIMESTAMPTZ;
    END IF;
    
    -- Add kyb_reviewed_at if not exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'merchants' AND column_name = 'kyb_reviewed_at') THEN
        ALTER TABLE merchants ADD COLUMN kyb_reviewed_at TIMESTAMPTZ;
    END IF;
    
    -- Add kyb_reviewer_id if not exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'merchants' AND column_name = 'kyb_reviewer_id') THEN
        ALTER TABLE merchants ADD COLUMN kyb_reviewer_id UUID REFERENCES admin_users(id);
    END IF;
    
    -- Add suspended_at if not exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'merchants' AND column_name = 'suspended_at') THEN
        ALTER TABLE merchants ADD COLUMN suspended_at TIMESTAMPTZ;
    END IF;
    
    -- Add suspension_reason if not exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'merchants' AND column_name = 'suspension_reason') THEN
        ALTER TABLE merchants ADD COLUMN suspension_reason TEXT;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_merchants_kyb_status ON merchants(kyb_status);

-- =============================================================================
-- Add stock alert threshold to Products
-- =============================================================================
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'products' AND column_name = 'low_stock_threshold') THEN
        ALTER TABLE products ADD COLUMN low_stock_threshold INTEGER DEFAULT 10;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'products' AND column_name = 'reorder_quantity') THEN
        ALTER TABLE products ADD COLUMN reorder_quantity INTEGER DEFAULT 50;
    END IF;
END $$;

-- =============================================================================
-- Admin Audit Log
-- =============================================================================
CREATE TABLE IF NOT EXISTS admin_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_user_id UUID REFERENCES admin_users(id),
    api_key_id UUID REFERENCES api_keys(id),
    action TEXT NOT NULL,
    resource_type TEXT NOT NULL,  -- 'merchant', 'product', 'order', 'api_key', etc.
    resource_id TEXT,
    changes JSONB,  -- Before/after values
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_admin_audit_user ON admin_audit_log(admin_user_id);
CREATE INDEX idx_admin_audit_resource ON admin_audit_log(resource_type, resource_id);
CREATE INDEX idx_admin_audit_created ON admin_audit_log(created_at DESC);

-- =============================================================================
-- RLS Policies for Admin Tables
-- =============================================================================

-- Admin users can only be managed by supplier_admin
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY admin_users_select ON admin_users
    FOR SELECT TO authenticated
    USING (
        EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid())
    );

CREATE POLICY admin_users_manage ON admin_users
    FOR ALL TO authenticated
    USING (
        EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid() AND role = 'supplier_admin')
    );

-- API keys - admins can see all, but only manage their own or if supplier_admin
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY api_keys_select ON api_keys
    FOR SELECT TO authenticated
    USING (
        EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid())
    );

CREATE POLICY api_keys_manage ON api_keys
    FOR ALL TO authenticated
    USING (
        created_by = auth.uid() OR
        EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid() AND role = 'supplier_admin')
    );

-- Inventory log - read-only for all admins
ALTER TABLE inventory_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY inventory_log_select ON inventory_log
    FOR SELECT TO authenticated
    USING (
        EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid())
    );

-- KYB reviews - visible to all admins, writable by kyb_reviewer or supplier_admin
ALTER TABLE kyb_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY kyb_reviews_select ON kyb_reviews
    FOR SELECT TO authenticated
    USING (
        EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid())
    );

CREATE POLICY kyb_reviews_insert ON kyb_reviews
    FOR INSERT TO authenticated
    WITH CHECK (
        EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid() AND role IN ('supplier_admin', 'kyb_reviewer'))
    );

-- =============================================================================
-- Helper Functions
-- =============================================================================

-- Check if user is an admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid() AND is_active = true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if user has specific admin role
CREATE OR REPLACE FUNCTION has_admin_role(required_role TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM admin_users 
        WHERE id = auth.uid() 
        AND is_active = true 
        AND (role = required_role OR role = 'supplier_admin')
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Log inventory change
CREATE OR REPLACE FUNCTION log_inventory_change(
    p_product_id UUID,
    p_sku TEXT,
    p_change_type TEXT,
    p_qty_before INTEGER,
    p_qty_after INTEGER,
    p_reason TEXT DEFAULT NULL,
    p_reference_id TEXT DEFAULT NULL,
    p_source TEXT DEFAULT 'admin_portal',
    p_admin_id UUID DEFAULT NULL,
    p_api_key_id UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    log_id UUID;
BEGIN
    INSERT INTO inventory_log (
        product_id, sku, change_type, quantity_before, quantity_after,
        reason, reference_id, source, performed_by, api_key_id
    ) VALUES (
        p_product_id, p_sku, p_change_type, p_qty_before, p_qty_after,
        p_reason, p_reference_id, p_source, p_admin_id, p_api_key_id
    ) RETURNING id INTO log_id;
    
    RETURN log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
