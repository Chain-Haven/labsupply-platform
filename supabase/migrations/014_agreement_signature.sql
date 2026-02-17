-- Migration: Add agreement_signature_url column to merchants table
-- Stores the Supabase Storage path to the signed PDF of the merchant agreement.

ALTER TABLE public.merchants
  ADD COLUMN IF NOT EXISTS agreement_signature_url TEXT;

COMMENT ON COLUMN public.merchants.agreement_signature_url
  IS 'Supabase Storage path to the executed merchant agreement PDF';
