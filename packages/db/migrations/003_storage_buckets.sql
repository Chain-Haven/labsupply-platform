-- ============================================================================
-- WhiteLabel Peptides Platform - Storage Buckets
-- Version: 003
-- Description: Supabase Storage bucket configuration
-- ============================================================================

-- Create storage buckets
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  (
    'product-images',
    'product-images',
    true,
    5242880, -- 5MB
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
  ),
  (
    'product-assets',
    'product-assets',
    false,
    10485760, -- 10MB
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
  ),
  (
    'coa-documents',
    'coa-documents',
    false,
    10485760, -- 10MB
    ARRAY['application/pdf', 'image/jpeg', 'image/png']
  ),
  (
    'merchant-uploads',
    'merchant-uploads',
    false,
    10485760, -- 10MB
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf', 'image/svg+xml']
  ),
  (
    'shipping-labels',
    'shipping-labels',
    false,
    5242880, -- 5MB
    ARRAY['application/pdf', 'image/png', 'application/zpl']
  ),
  (
    'packing-slips',
    'packing-slips',
    false,
    5242880, -- 5MB
    ARRAY['application/pdf']
  )
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- STORAGE POLICIES
-- ============================================================================

-- Product images - public read, admin write
CREATE POLICY "Product images are publicly accessible"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'product-images');

CREATE POLICY "Only admins can upload product images"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'product-images' 
    AND is_supplier_admin()
  );

CREATE POLICY "Only admins can delete product images"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'product-images' 
    AND is_supplier_admin()
  );

-- Product assets - restricted access
CREATE POLICY "Product assets - merchant and admin access"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'product-assets'
    AND (
      is_supplier_admin()
      OR get_user_merchant_id() IS NOT NULL
    )
  );

CREATE POLICY "Product assets - admin only upload"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'product-assets' 
    AND is_supplier_admin()
  );

-- COA documents - restricted access
CREATE POLICY "COA documents - merchant and admin access"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'coa-documents'
    AND (
      is_supplier_admin()
      OR get_user_merchant_id() IS NOT NULL
    )
  );

CREATE POLICY "COA documents - admin only upload"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'coa-documents' 
    AND is_supplier_admin()
  );

-- Merchant uploads - merchants can upload to their folder
CREATE POLICY "Merchants can view their uploads"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'merchant-uploads'
    AND (
      is_supplier_admin()
      OR (storage.foldername(name))[1] = get_user_merchant_id()::text
    )
  );

CREATE POLICY "Merchants can upload to their folder"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'merchant-uploads'
    AND (
      is_supplier_admin()
      OR (storage.foldername(name))[1] = get_user_merchant_id()::text
    )
  );

CREATE POLICY "Merchants can delete their uploads"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'merchant-uploads'
    AND (
      is_supplier_admin()
      OR (storage.foldername(name))[1] = get_user_merchant_id()::text
    )
  );

-- Shipping labels - admin only
CREATE POLICY "Shipping labels - admin access"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'shipping-labels'
    AND is_supplier_admin()
  );

CREATE POLICY "Shipping labels - admin upload"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'shipping-labels' 
    AND is_supplier_admin()
  );

-- Packing slips - admin and merchant (for their orders)
CREATE POLICY "Packing slips - admin and merchant access"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'packing-slips'
    AND (
      is_supplier_admin()
      OR get_user_merchant_id() IS NOT NULL
    )
  );

CREATE POLICY "Packing slips - admin upload"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'packing-slips' 
    AND is_supplier_admin()
  );
