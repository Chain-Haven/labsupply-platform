-- KYB documents table: tracks files uploaded during merchant onboarding
CREATE TABLE IF NOT EXISTS public.kyb_documents (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    merchant_id UUID REFERENCES public.merchants(id) ON DELETE SET NULL,
    document_type VARCHAR(50) NOT NULL,
    file_name TEXT NOT NULL,
    storage_path TEXT NOT NULL,
    file_size_bytes INTEGER,
    mime_type VARCHAR(100),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (user_id, document_type)
);

CREATE INDEX IF NOT EXISTS idx_kyb_documents_user_id ON public.kyb_documents(user_id);
CREATE INDEX IF NOT EXISTS idx_kyb_documents_merchant_id ON public.kyb_documents(merchant_id) WHERE merchant_id IS NOT NULL;

ALTER TABLE public.kyb_documents ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    CREATE POLICY "Service role full access on kyb_documents"
        ON public.kyb_documents FOR ALL
        USING (auth.role() = 'service_role');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE POLICY "Users can view their own documents"
        ON public.kyb_documents FOR SELECT
        USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE OR REPLACE FUNCTION update_kyb_documents_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_kyb_documents_updated_at ON public.kyb_documents;
CREATE TRIGGER trg_kyb_documents_updated_at
    BEFORE UPDATE ON public.kyb_documents
    FOR EACH ROW EXECUTE FUNCTION update_kyb_documents_updated_at();

COMMENT ON TABLE public.kyb_documents IS 'Stores metadata for KYB verification documents uploaded during merchant onboarding';
COMMENT ON COLUMN public.kyb_documents.document_type IS 'One of: businessLicense, articlesOfIncorporation, taxExemptCertificate, researchCredentials, governmentId';
COMMENT ON COLUMN public.kyb_documents.storage_path IS 'Path within the merchant-uploads Supabase storage bucket';
