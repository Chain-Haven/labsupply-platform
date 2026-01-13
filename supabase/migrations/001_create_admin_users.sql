-- Admin Users Table for LabSupply Platform
-- This table stores authorized admin users who can access the admin portal

-- Create admin_users table
CREATE TABLE IF NOT EXISTS public.admin_users (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    email TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'admin' CHECK (role IN ('super_admin', 'admin')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_admin_users_email ON public.admin_users(email);
CREATE INDEX IF NOT EXISTS idx_admin_users_user_id ON public.admin_users(user_id);

-- Enable RLS
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

-- Policy: Allow authenticated users to read admin_users (to check their own status)
CREATE POLICY "Allow authenticated users to read admin_users"
ON public.admin_users
FOR SELECT
TO authenticated
USING (true);

-- Policy: Allow super_admin to insert new admins
CREATE POLICY "Allow super_admin to insert admins"
ON public.admin_users
FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.admin_users
        WHERE user_id = auth.uid() AND role = 'super_admin'
    )
    OR 
    -- Allow insert if no admin_users exist yet (initial super admin creation)
    NOT EXISTS (SELECT 1 FROM public.admin_users)
    OR
    -- Allow the super admin email to create their own record
    email = 'info@chainhaven.co'
);

-- Policy: Allow super_admin to delete admins (except themselves)
CREATE POLICY "Allow super_admin to delete admins"
ON public.admin_users
FOR DELETE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.admin_users
        WHERE user_id = auth.uid() AND role = 'super_admin'
    )
    AND role != 'super_admin'
);

-- Policy: Allow users to update their own record (for linking user_id)
CREATE POLICY "Allow users to update own admin record"
ON public.admin_users
FOR UPDATE
TO authenticated
USING (email = (SELECT email FROM auth.users WHERE id = auth.uid()))
WITH CHECK (email = (SELECT email FROM auth.users WHERE id = auth.uid()));

-- Insert default super admin (optional - can be done manually)
-- This creates a placeholder record that gets linked when the user signs up
INSERT INTO public.admin_users (email, name, role)
VALUES ('info@chainhaven.co', 'ChainHaven Admin', 'super_admin')
ON CONFLICT (email) DO NOTHING;

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_admin_users_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
DROP TRIGGER IF EXISTS update_admin_users_updated_at ON public.admin_users;
CREATE TRIGGER update_admin_users_updated_at
    BEFORE UPDATE ON public.admin_users
    FOR EACH ROW
    EXECUTE FUNCTION update_admin_users_updated_at();

-- Grant permissions
GRANT ALL ON public.admin_users TO authenticated;
GRANT ALL ON public.admin_users TO service_role;
