-- Service Packages: defines available tiers and add-ons for merchants
CREATE TABLE IF NOT EXISTS service_packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  tagline TEXT NOT NULL,
  description TEXT NOT NULL,
  price_cents INTEGER NOT NULL DEFAULT 0,
  original_price_cents INTEGER,
  package_type TEXT NOT NULL DEFAULT 'tier',
  features JSONB NOT NULL DEFAULT '[]',
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_popular BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Merchant-package junction: tracks selections and payment status
CREATE TABLE IF NOT EXISTS merchant_packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id UUID NOT NULL REFERENCES merchants(id),
  package_id UUID NOT NULL REFERENCES service_packages(id),
  status TEXT NOT NULL DEFAULT 'selected',
  mercury_invoice_id TEXT,
  amount_cents INTEGER NOT NULL DEFAULT 0,
  selected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  paid_at TIMESTAMPTZ,
  UNIQUE(merchant_id, package_id)
);

-- Quick lookup on merchants for their chosen tier
ALTER TABLE merchants ADD COLUMN IF NOT EXISTS selected_package_id UUID REFERENCES service_packages(id);

-- Seed the 3 tiers
INSERT INTO service_packages (slug, name, tagline, description, price_cents, original_price_cents, package_type, features, sort_order, is_active, is_popular)
VALUES
  (
    'self-service',
    'Self-Service',
    'Everything you need to start selling',
    'Access to our full fulfillment platform. Connect your WooCommerce store, browse the catalog, and start fulfilling orders with prepaid wallet billing.',
    0,
    NULL,
    'tier',
    '["WooCommerce plugin access","Full product catalog","Prepaid wallet billing","Standard unbranded packaging","COA access for all products","Real-time order tracking","Multi-carrier shipping"]',
    1,
    true,
    false
  ),
  (
    'brand-starter',
    'Brand Starter',
    'Launch your brand with custom labels and compliant copy',
    'Everything in Self-Service plus custom label design, a compliant branding guide, and product description templates — so your store looks professional from day one.',
    99700,
    199700,
    'tier',
    '["Everything in Self-Service","Custom label design (up to 10 SKUs)","Compliant branding guide","RUO product description templates","Branded packing slips","Email support"]',
    2,
    true,
    true
  ),
  (
    'business-in-a-box',
    'Business in a Box',
    'Done-for-you compliant store — live in 30 days',
    'The complete turnkey solution. We build your FDA-compliant WooCommerce store with 60+ product pages, COAs, age verification, and all compliant copy — backed by a 30-day launch guarantee.',
    449700,
    899700,
    'tier',
    '["Everything in Brand Starter","Done-for-you compliant WooCommerce store","11 custom-built pages","60+ compliant product pages with COAs","Mobile-responsive design","Age verification (21+)","Full compliance copy review","30-day launch guarantee","Priority support"]',
    3,
    true,
    false
  )
ON CONFLICT (slug) DO NOTHING;

-- RLS policies
ALTER TABLE service_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE merchant_packages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read active packages" ON service_packages
  FOR SELECT USING (is_active = true);

CREATE POLICY "Service role full access to packages" ON service_packages
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Merchants can read own package selections" ON merchant_packages
  FOR SELECT USING (
    merchant_id IN (SELECT id FROM merchants WHERE user_id = auth.uid())
  );

CREATE POLICY "Service role full access to merchant_packages" ON merchant_packages
  FOR ALL USING (auth.role() = 'service_role');
