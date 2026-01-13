-- Migration: Add subscription and KYB fields to merchants table
-- Run this in Supabase SQL Editor

-- Add subscription fields
ALTER TABLE public.merchants 
ADD COLUMN IF NOT EXISTS subscription_id TEXT,
ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'none' 
    CHECK (subscription_status IN ('none', 'trial', 'active', 'cancelled', 'past_due')),
ADD COLUMN IF NOT EXISTS subscription_trial_ends_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS chargx_vault_id TEXT;

-- Add legal opinion letter fields
ALTER TABLE public.merchants 
ADD COLUMN IF NOT EXISTS legal_opinion_letter_url TEXT,
ADD COLUMN IF NOT EXISTS legal_opinion_letter_uploaded_at TIMESTAMP WITH TIME ZONE;

-- Add shipping control
ALTER TABLE public.merchants 
ADD COLUMN IF NOT EXISTS can_ship BOOLEAN DEFAULT false;

-- Add billing address fields (must match business entity)
ALTER TABLE public.merchants 
ADD COLUMN IF NOT EXISTS billing_name TEXT,
ADD COLUMN IF NOT EXISTS billing_address_street TEXT,
ADD COLUMN IF NOT EXISTS billing_address_city TEXT,
ADD COLUMN IF NOT EXISTS billing_address_state TEXT,
ADD COLUMN IF NOT EXISTS billing_address_zip TEXT,
ADD COLUMN IF NOT EXISTS billing_address_country TEXT DEFAULT 'USA';

-- Add reserve hold tracking
ALTER TABLE public.merchants 
ADD COLUMN IF NOT EXISTS reserve_hold_order_id TEXT,
ADD COLUMN IF NOT EXISTS reserve_hold_created_at TIMESTAMP WITH TIME ZONE;

-- Add index for subscription status filtering
CREATE INDEX IF NOT EXISTS idx_merchants_subscription_status 
ON public.merchants(subscription_status);

-- Add index for KYB status filtering  
CREATE INDEX IF NOT EXISTS idx_merchants_kyb_status 
ON public.merchants(kyb_status);

-- Comment describing the fields
COMMENT ON COLUMN public.merchants.subscription_id IS 'ChargX subscription ID for recurring billing';
COMMENT ON COLUMN public.merchants.subscription_status IS 'Current subscription state: none, trial, active, cancelled, past_due';
COMMENT ON COLUMN public.merchants.subscription_trial_ends_at IS 'When the 14-day trial period ends';
COMMENT ON COLUMN public.merchants.can_ship IS 'Whether merchant can ship orders (requires KYB approval)';
COMMENT ON COLUMN public.merchants.legal_opinion_letter_url IS 'URL to uploaded legal opinion letter document';
