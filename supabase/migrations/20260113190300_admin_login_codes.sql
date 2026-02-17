-- Migration: Add admin login codes table for backup authentication
-- Run this in Supabase SQL Editor

-- Create table for storing admin login codes
CREATE TABLE IF NOT EXISTS public.admin_login_codes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    email TEXT NOT NULL,
    code TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    used BOOLEAN DEFAULT FALSE,
    used_at TIMESTAMP WITH TIME ZONE
);

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_admin_login_codes_email 
ON public.admin_login_codes(email, code) WHERE used = FALSE;

-- Add index for cleanup of old codes
CREATE INDEX IF NOT EXISTS idx_admin_login_codes_expires 
ON public.admin_login_codes(expires_at);

-- Enable RLS
ALTER TABLE public.admin_login_codes ENABLE ROW LEVEL SECURITY;

-- Only service role can access (for API routes)
CREATE POLICY "Service role can manage codes" ON public.admin_login_codes
    FOR ALL USING (auth.role() = 'service_role');

-- Function to cleanup expired codes (optional, can be run periodically)
CREATE OR REPLACE FUNCTION cleanup_expired_admin_codes()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
    DELETE FROM public.admin_login_codes 
    WHERE expires_at < NOW() OR (used = TRUE AND used_at < NOW() - INTERVAL '24 hours');
END;
$$;

COMMENT ON TABLE public.admin_login_codes IS 'Stores 8-digit backup login codes sent to admin email';
COMMENT ON COLUMN public.admin_login_codes.code IS 'The 8-digit verification code';
COMMENT ON COLUMN public.admin_login_codes.expires_at IS 'Code expiration time (typically 10 minutes from creation)';
