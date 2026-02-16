-- ============================================================================
-- WhiteLabel Peptides Platform - Row Level Security Policies
-- Version: 002
-- Description: RLS policies for multi-tenant data isolation
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE merchants ENABLE ROW LEVEL SECURITY;
ALTER TABLE merchant_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE store_secrets ENABLE ROW LEVEL SECURITY;
ALTER TABLE connect_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE merchant_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE merchant_product_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE lots ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallet_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallet_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE shipments ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Get current user's merchant ID
CREATE OR REPLACE FUNCTION get_user_merchant_id()
RETURNS UUID AS $$
  SELECT merchant_id FROM merchant_users WHERE user_id = auth.uid() LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Check if current user is a supplier admin
CREATE OR REPLACE FUNCTION is_supplier_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM supplier_users 
    WHERE user_id = auth.uid() AND is_active = true
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Check if current user is a supplier superadmin
CREATE OR REPLACE FUNCTION is_supplier_superadmin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM supplier_users 
    WHERE user_id = auth.uid() 
    AND role = 'SUPPLIER_SUPERADMIN' 
    AND is_active = true
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Check if current user has access to a merchant
CREATE OR REPLACE FUNCTION has_merchant_access(merchant_id_param UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM merchant_users 
    WHERE user_id = auth.uid() 
    AND merchant_id = merchant_id_param
  ) OR is_supplier_admin();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Get current user's supplier role
CREATE OR REPLACE FUNCTION get_supplier_role()
RETURNS user_role AS $$
  SELECT role FROM supplier_users WHERE user_id = auth.uid() AND is_active = true LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ============================================================================
-- MERCHANTS POLICIES
-- ============================================================================

-- Merchants can view their own merchant
CREATE POLICY merchants_select_own ON merchants
  FOR SELECT
  USING (
    id = get_user_merchant_id() 
    OR is_supplier_admin()
  );

-- Merchants can update their own merchant (limited fields)
CREATE POLICY merchants_update_own ON merchants
  FOR UPDATE
  USING (id = get_user_merchant_id())
  WITH CHECK (id = get_user_merchant_id());

-- Only supplier admins can insert/delete merchants
CREATE POLICY merchants_insert_admin ON merchants
  FOR INSERT
  WITH CHECK (is_supplier_admin());

CREATE POLICY merchants_delete_admin ON merchants
  FOR DELETE
  USING (is_supplier_superadmin());

-- ============================================================================
-- MERCHANT USERS POLICIES
-- ============================================================================

-- Users can see other users in their merchant
CREATE POLICY merchant_users_select ON merchant_users
  FOR SELECT
  USING (
    merchant_id = get_user_merchant_id() 
    OR is_supplier_admin()
  );

-- Only merchant owners/admins can manage users
CREATE POLICY merchant_users_insert ON merchant_users
  FOR INSERT
  WITH CHECK (
    (merchant_id = get_user_merchant_id() AND EXISTS (
      SELECT 1 FROM merchant_users 
      WHERE user_id = auth.uid() 
      AND merchant_id = merchant_users.merchant_id
      AND role IN ('MERCHANT_OWNER', 'MERCHANT_ADMIN')
    ))
    OR is_supplier_admin()
  );

CREATE POLICY merchant_users_delete ON merchant_users
  FOR DELETE
  USING (
    (merchant_id = get_user_merchant_id() AND EXISTS (
      SELECT 1 FROM merchant_users mu
      WHERE mu.user_id = auth.uid() 
      AND mu.merchant_id = merchant_users.merchant_id
      AND mu.role IN ('MERCHANT_OWNER', 'MERCHANT_ADMIN')
    ))
    OR is_supplier_admin()
  );

-- ============================================================================
-- SUPPLIER USERS POLICIES
-- ============================================================================

-- Only supplier admins can see supplier users
CREATE POLICY supplier_users_select ON supplier_users
  FOR SELECT
  USING (is_supplier_admin());

-- Only superadmins can manage supplier users
CREATE POLICY supplier_users_manage ON supplier_users
  FOR ALL
  USING (is_supplier_superadmin())
  WITH CHECK (is_supplier_superadmin());

-- ============================================================================
-- STORES POLICIES
-- ============================================================================

-- Merchants can view their own stores
CREATE POLICY stores_select ON stores
  FOR SELECT
  USING (
    merchant_id = get_user_merchant_id() 
    OR is_supplier_admin()
  );

-- Merchants can manage their own stores
CREATE POLICY stores_insert ON stores
  FOR INSERT
  WITH CHECK (
    merchant_id = get_user_merchant_id() 
    OR is_supplier_admin()
  );

CREATE POLICY stores_update ON stores
  FOR UPDATE
  USING (merchant_id = get_user_merchant_id() OR is_supplier_admin())
  WITH CHECK (merchant_id = get_user_merchant_id() OR is_supplier_admin());

CREATE POLICY stores_delete ON stores
  FOR DELETE
  USING (merchant_id = get_user_merchant_id() OR is_supplier_admin());

-- ============================================================================
-- STORE SECRETS POLICIES (service role only for security)
-- ============================================================================

-- No direct access to store secrets - use service role
CREATE POLICY store_secrets_deny ON store_secrets
  FOR ALL
  USING (false);

-- ============================================================================
-- CONNECT CODES POLICIES
-- ============================================================================

-- Merchants can see their own connect codes
CREATE POLICY connect_codes_select ON connect_codes
  FOR SELECT
  USING (
    merchant_id = get_user_merchant_id() 
    OR is_supplier_admin()
  );

CREATE POLICY connect_codes_insert ON connect_codes
  FOR INSERT
  WITH CHECK (
    merchant_id = get_user_merchant_id() 
    OR is_supplier_admin()
  );

-- ============================================================================
-- PRODUCTS POLICIES
-- ============================================================================

-- Merchants can only see products they have access to
CREATE POLICY products_select_merchant ON products
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM merchant_products mp
      WHERE mp.product_id = products.id
      AND mp.merchant_id = get_user_merchant_id()
      AND mp.allowed = true
    )
    OR is_supplier_admin()
  );

-- Only supplier admins can manage products
CREATE POLICY products_manage ON products
  FOR ALL
  USING (is_supplier_admin())
  WITH CHECK (is_supplier_admin());

-- ============================================================================
-- PRODUCT ASSETS POLICIES
-- ============================================================================

CREATE POLICY product_assets_select ON product_assets
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM merchant_products mp
      WHERE mp.product_id = product_assets.product_id
      AND mp.merchant_id = get_user_merchant_id()
      AND mp.allowed = true
    )
    OR is_supplier_admin()
  );

CREATE POLICY product_assets_manage ON product_assets
  FOR ALL
  USING (is_supplier_admin())
  WITH CHECK (is_supplier_admin());

-- ============================================================================
-- MERCHANT PRODUCTS POLICIES
-- ============================================================================

CREATE POLICY merchant_products_select ON merchant_products
  FOR SELECT
  USING (
    merchant_id = get_user_merchant_id() 
    OR is_supplier_admin()
  );

CREATE POLICY merchant_products_manage ON merchant_products
  FOR ALL
  USING (is_supplier_admin())
  WITH CHECK (is_supplier_admin());

-- ============================================================================
-- MERCHANT PRODUCT ASSETS POLICIES
-- ============================================================================

CREATE POLICY merchant_product_assets_select ON merchant_product_assets
  FOR SELECT
  USING (
    merchant_id = get_user_merchant_id() 
    OR is_supplier_admin()
  );

CREATE POLICY merchant_product_assets_insert ON merchant_product_assets
  FOR INSERT
  WITH CHECK (
    merchant_id = get_user_merchant_id() 
    OR is_supplier_admin()
  );

CREATE POLICY merchant_product_assets_delete ON merchant_product_assets
  FOR DELETE
  USING (
    merchant_id = get_user_merchant_id() 
    OR is_supplier_admin()
  );

-- ============================================================================
-- INVENTORY POLICIES
-- ============================================================================

-- Everyone can see inventory for allowed products
CREATE POLICY inventory_select ON inventory
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM merchant_products mp
      WHERE mp.product_id = inventory.product_id
      AND mp.merchant_id = get_user_merchant_id()
      AND mp.allowed = true
    )
    OR is_supplier_admin()
  );

-- Only supplier admins can manage inventory
CREATE POLICY inventory_manage ON inventory
  FOR ALL
  USING (is_supplier_admin())
  WITH CHECK (is_supplier_admin());

-- ============================================================================
-- LOTS POLICIES
-- ============================================================================

CREATE POLICY lots_select ON lots
  FOR SELECT
  USING (is_supplier_admin());

CREATE POLICY lots_manage ON lots
  FOR ALL
  USING (is_supplier_admin())
  WITH CHECK (is_supplier_admin());

-- ============================================================================
-- ORDERS POLICIES
-- ============================================================================

CREATE POLICY orders_select ON orders
  FOR SELECT
  USING (
    merchant_id = get_user_merchant_id() 
    OR is_supplier_admin()
  );

-- Orders are created by the API (service role)
CREATE POLICY orders_insert ON orders
  FOR INSERT
  WITH CHECK (
    merchant_id = get_user_merchant_id() 
    OR is_supplier_admin()
  );

-- Only supplier admins can update orders
CREATE POLICY orders_update ON orders
  FOR UPDATE
  USING (is_supplier_admin())
  WITH CHECK (is_supplier_admin());

-- ============================================================================
-- ORDER ITEMS POLICIES
-- ============================================================================

CREATE POLICY order_items_select ON order_items
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM orders o
      WHERE o.id = order_items.order_id
      AND (o.merchant_id = get_user_merchant_id() OR is_supplier_admin())
    )
  );

CREATE POLICY order_items_manage ON order_items
  FOR ALL
  USING (is_supplier_admin())
  WITH CHECK (is_supplier_admin());

-- ============================================================================
-- ORDER STATUS HISTORY POLICIES
-- ============================================================================

CREATE POLICY order_status_history_select ON order_status_history
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM orders o
      WHERE o.id = order_status_history.order_id
      AND (o.merchant_id = get_user_merchant_id() OR is_supplier_admin())
    )
  );

-- ============================================================================
-- WALLET POLICIES
-- ============================================================================

CREATE POLICY wallet_accounts_select ON wallet_accounts
  FOR SELECT
  USING (
    merchant_id = get_user_merchant_id() 
    OR is_supplier_admin()
  );

-- Wallet modifications require service role
CREATE POLICY wallet_accounts_manage ON wallet_accounts
  FOR ALL
  USING (is_supplier_admin())
  WITH CHECK (is_supplier_admin());

CREATE POLICY wallet_transactions_select ON wallet_transactions
  FOR SELECT
  USING (
    merchant_id = get_user_merchant_id() 
    OR is_supplier_admin()
  );

-- ============================================================================
-- PAYMENTS POLICIES
-- ============================================================================

CREATE POLICY payments_select ON payments
  FOR SELECT
  USING (
    merchant_id = get_user_merchant_id() 
    OR is_supplier_admin()
  );

CREATE POLICY payments_insert ON payments
  FOR INSERT
  WITH CHECK (
    merchant_id = get_user_merchant_id() 
    OR is_supplier_admin()
  );

-- ============================================================================
-- SHIPMENTS POLICIES
-- ============================================================================

CREATE POLICY shipments_select ON shipments
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM orders o
      WHERE o.id = shipments.order_id
      AND (o.merchant_id = get_user_merchant_id() OR is_supplier_admin())
    )
  );

CREATE POLICY shipments_manage ON shipments
  FOR ALL
  USING (is_supplier_admin())
  WITH CHECK (is_supplier_admin());

-- ============================================================================
-- WEBHOOK EVENTS POLICIES
-- ============================================================================

-- Merchants can see webhook events for their stores
CREATE POLICY webhook_events_select ON webhook_events
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM stores s
      WHERE s.id = webhook_events.store_id
      AND s.merchant_id = get_user_merchant_id()
    )
    OR is_supplier_admin()
  );

-- ============================================================================
-- AUDIT EVENTS POLICIES
-- ============================================================================

CREATE POLICY audit_events_select ON audit_events
  FOR SELECT
  USING (
    (merchant_id IS NOT NULL AND merchant_id = get_user_merchant_id())
    OR is_supplier_admin()
  );

-- ============================================================================
-- NOTIFICATIONS POLICIES
-- ============================================================================

CREATE POLICY notifications_select ON notifications
  FOR SELECT
  USING (
    user_id = auth.uid() 
    OR (merchant_id = get_user_merchant_id())
    OR is_supplier_admin()
  );

CREATE POLICY notifications_update ON notifications
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
