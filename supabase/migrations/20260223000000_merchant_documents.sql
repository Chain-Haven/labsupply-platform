-- Ensure merchant-uploads bucket exists
INSERT INTO storage.buckets (id, name, public)
VALUES ('merchant-uploads', 'merchant-uploads', false)
ON CONFLICT (id) DO NOTHING;

-- General merchant documents table
CREATE TABLE IF NOT EXISTS public.merchant_documents (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    merchant_id UUID NOT NULL REFERENCES public.merchants(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    document_type VARCHAR(50) NOT NULL,
    file_name TEXT NOT NULL,
    storage_path TEXT NOT NULL,
    file_size_bytes INTEGER,
    mime_type VARCHAR(100),
    status VARCHAR(20) DEFAULT 'uploaded'
        CHECK (status IN ('uploaded', 'pending', 'approved', 'rejected')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_merchant_docs_merchant
    ON public.merchant_documents(merchant_id);

DROP TRIGGER IF EXISTS update_merchant_documents_updated_at ON public.merchant_documents;
CREATE TRIGGER update_merchant_documents_updated_at
    BEFORE UPDATE ON public.merchant_documents
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.merchant_documents ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.merchant_documents TO authenticated;
GRANT ALL ON public.merchant_documents TO service_role;
