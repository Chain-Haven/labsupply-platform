-- ============================================================================
-- Fix rate limit TOCTOU race + add nonce replay protection
-- ============================================================================

-- Fix: Use advisory lock to serialize rate limit checks per key
CREATE OR REPLACE FUNCTION public.check_rate_limit(
    p_key TEXT,
    p_limit INTEGER,
    p_window_seconds INTEGER
) RETURNS TABLE(allowed BOOLEAN, current_count BIGINT) AS $$
DECLARE
    v_count BIGINT;
    v_cutoff TIMESTAMPTZ;
    v_lock_id BIGINT;
BEGIN
    -- Derive a stable lock ID from the key (hash to bigint)
    v_lock_id := hashtext(p_key);

    -- Serialize concurrent checks for the same key
    PERFORM pg_advisory_xact_lock(v_lock_id);

    v_cutoff := now() - (p_window_seconds || ' seconds')::INTERVAL;

    SELECT count(*) INTO v_count
    FROM rate_limit_log
    WHERE key = p_key AND created_at > v_cutoff;

    IF v_count < p_limit THEN
        INSERT INTO rate_limit_log (key) VALUES (p_key);
        RETURN QUERY SELECT true, v_count + 1;
    ELSE
        RETURN QUERY SELECT false, v_count;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Nonce replay protection for HMAC store requests
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.request_nonces (
    store_id UUID NOT NULL,
    nonce TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    PRIMARY KEY (store_id, nonce)
);

CREATE INDEX IF NOT EXISTS idx_request_nonces_created
    ON public.request_nonces(created_at);

ALTER TABLE public.request_nonces ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.request_nonces TO service_role;

-- Cleanup function: remove nonces older than 10 minutes
CREATE OR REPLACE FUNCTION public.nonce_cleanup() RETURNS void AS $$
BEGIN
    DELETE FROM public.request_nonces WHERE created_at < now() - INTERVAL '10 minutes';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
