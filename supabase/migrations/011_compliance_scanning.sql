-- ============================================================================
-- Compliance Web Scraping Tables
-- AI-powered automated compliance scanning for merchant websites
-- ============================================================================

-- compliance_scans: Tracks each scan run per merchant/store
CREATE TABLE IF NOT EXISTS public.compliance_scans (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    merchant_id UUID NOT NULL REFERENCES public.merchants(id) ON DELETE CASCADE,
    store_id UUID REFERENCES public.stores(id) ON DELETE SET NULL,
    scan_url TEXT NOT NULL,
    pages_crawled INTEGER DEFAULT 0,
    violations_found INTEGER DEFAULT 0,
    status VARCHAR(20) NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'running', 'completed', 'failed')),
    error_message TEXT,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_compliance_scans_merchant ON public.compliance_scans(merchant_id);
CREATE INDEX idx_compliance_scans_status ON public.compliance_scans(status);
CREATE INDEX idx_compliance_scans_created ON public.compliance_scans(created_at DESC);

-- compliance_violations: Individual violations found during scans
CREATE TABLE IF NOT EXISTS public.compliance_violations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    scan_id UUID NOT NULL REFERENCES public.compliance_scans(id) ON DELETE CASCADE,
    merchant_id UUID NOT NULL REFERENCES public.merchants(id) ON DELETE CASCADE,
    page_url TEXT NOT NULL,
    violation_type VARCHAR(50) NOT NULL
        CHECK (violation_type IN (
            'health_claim',
            'dosage_advice',
            'brand_name_usage',
            'human_use_suggestion',
            'fda_violation',
            'other'
        )),
    severity VARCHAR(20) NOT NULL DEFAULT 'medium'
        CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    description TEXT NOT NULL,
    violating_text TEXT NOT NULL,
    suggested_fix TEXT,
    admin_action VARCHAR(20) NOT NULL DEFAULT 'pending'
        CHECK (admin_action IN ('pending', 'ignored', 'notified', 'blocked')),
    admin_action_by UUID REFERENCES public.admin_users(id),
    admin_action_at TIMESTAMPTZ,
    ignore_reason TEXT,
    notified_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_compliance_violations_scan ON public.compliance_violations(scan_id);
CREATE INDEX idx_compliance_violations_merchant ON public.compliance_violations(merchant_id);
CREATE INDEX idx_compliance_violations_action ON public.compliance_violations(admin_action);
CREATE INDEX idx_compliance_violations_severity ON public.compliance_violations(severity);
CREATE INDEX idx_compliance_violations_type ON public.compliance_violations(violation_type);
CREATE INDEX idx_compliance_violations_created ON public.compliance_violations(created_at DESC);

-- compliance_scan_config: Per-merchant scan configuration
CREATE TABLE IF NOT EXISTS public.compliance_scan_config (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    merchant_id UUID NOT NULL REFERENCES public.merchants(id) ON DELETE CASCADE UNIQUE,
    enabled BOOLEAN NOT NULL DEFAULT true,
    max_pages INTEGER NOT NULL DEFAULT 50,
    custom_rules JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_compliance_scan_config_merchant ON public.compliance_scan_config(merchant_id);

-- ============================================================================
-- RLS Policies - Admin-only access
-- ============================================================================

ALTER TABLE public.compliance_scans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.compliance_violations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.compliance_scan_config ENABLE ROW LEVEL SECURITY;

-- Service role has full access (used by Inngest functions and admin API routes)
CREATE POLICY "Service role full access on compliance_scans"
    ON public.compliance_scans
    FOR ALL
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Service role full access on compliance_violations"
    ON public.compliance_violations
    FOR ALL
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Service role full access on compliance_scan_config"
    ON public.compliance_scan_config
    FOR ALL
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');

-- Updated_at trigger for compliance_violations
CREATE OR REPLACE FUNCTION update_compliance_violations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_compliance_violations_updated_at
    BEFORE UPDATE ON public.compliance_violations
    FOR EACH ROW
    EXECUTE FUNCTION update_compliance_violations_updated_at();

-- Updated_at trigger for compliance_scan_config
CREATE TRIGGER trg_compliance_scan_config_updated_at
    BEFORE UPDATE ON public.compliance_scan_config
    FOR EACH ROW
    EXECUTE FUNCTION update_compliance_violations_updated_at();
