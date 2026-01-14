-- Migration: Add admin_users table for super admin and invited admins
-- Run this in Supabase SQL Editor

-- Create table for admin users
CREATE TABLE IF NOT EXISTS public.admin_users (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    role TEXT NOT NULL DEFAULT 'admin' CHECK (role IN ('super_admin', 'admin')),
    invited_by TEXT, -- Email of the super admin who invited this admin
    invited_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_login_at TIMESTAMP WITH TIME ZONE
);

-- Insert the super admin (info@chainhaven.co)
INSERT INTO public.admin_users (email, role, is_active)
VALUES ('info@chainhaven.co', 'super_admin', true)
ON CONFLICT (email) DO UPDATE SET role = 'super_admin', is_active = true;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_admin_users_email 
ON public.admin_users(email) WHERE is_active = TRUE;

-- Enable RLS
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

-- Only service role can access (for API routes)
CREATE POLICY "Service role can manage admin_users" ON public.admin_users
    FOR ALL USING (auth.role() = 'service_role');

COMMENT ON TABLE public.admin_users IS 'Stores admin users with super_admin being the only one who can invite others';
COMMENT ON COLUMN public.admin_users.role IS 'super_admin = info@chainhaven.co only, admin = invited by super_admin';
