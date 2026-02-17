-- Migration: Create merchants table for production
-- Run this in Supabase SQL Editor

-- Create merchants table
CREATE TABLE IF NOT EXISTS public.merchants (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  email TEXT NOT NULL,
  company_name TEXT,
  website_url TEXT,
  phone TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'suspended')),
  kyb_status TEXT DEFAULT 'not_started' CHECK (kyb_status IN ('not_started', 'in_progress', 'approved', 'rejected')),
  wallet_balance_cents INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create index on user_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_merchants_user_id ON public.merchants(user_id);

-- Enable Row Level Security
ALTER TABLE public.merchants ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own merchant profile
CREATE POLICY "Users can view own merchant profile" ON public.merchants
  FOR SELECT USING (auth.uid() = user_id);

-- Policy: Users can update their own merchant profile
CREATE POLICY "Users can update own merchant profile" ON public.merchants
  FOR UPDATE USING (auth.uid() = user_id);

-- Policy: Authenticated users can insert their own merchant profile (for registration)
CREATE POLICY "Users can insert own merchant profile" ON public.merchants
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Policy: Admin users can see all merchants
CREATE POLICY "Admins can view all merchants" ON public.merchants
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.admin_users 
      WHERE admin_users.user_id = auth.uid()
    )
  );

-- Policy: Admin users can update any merchant
CREATE POLICY "Admins can update merchants" ON public.merchants
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.admin_users 
      WHERE admin_users.user_id = auth.uid()
    )
  );

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_merchants_updated_at 
  BEFORE UPDATE ON public.merchants 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Grant permissions
GRANT ALL ON public.merchants TO authenticated;
GRANT ALL ON public.merchants TO service_role;
