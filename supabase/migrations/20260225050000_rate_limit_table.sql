-- ============================================================================
-- Rate limiting via DB table (replaces in-memory Map)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.rate_limit_log (
    id BIGSERIAL PRIMARY KEY,
    key TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rate_limit_key_time
    ON public.rate_limit_log(key, created_at DESC);

ALTER TABLE public.rate_limit_log ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.rate_limit_log TO service_role;
GRANT USAGE, SELECT ON SEQUENCE rate_limit_log_id_seq TO service_role;

-- Cleanup function: delete entries older than 2 hours (called periodically)
CREATE OR REPLACE FUNCTION public.rate_limit_cleanup() RETURNS void AS $$
BEGIN
    DELETE FROM public.rate_limit_log WHERE created_at < now() - INTERVAL '2 hours';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Rate check function: returns true if under limit
CREATE OR REPLACE FUNCTION public.check_rate_limit(
    p_key TEXT,
    p_limit INTEGER,
    p_window_seconds INTEGER
) RETURNS TABLE(allowed BOOLEAN, current_count BIGINT) AS $$
DECLARE
    v_count BIGINT;
    v_cutoff TIMESTAMPTZ;
BEGIN
    v_cutoff := now() - (p_window_seconds || ' seconds')::INTERVAL;
    SELECT count(*) INTO v_count FROM rate_limit_log
    WHERE key = p_key AND created_at > v_cutoff;

    IF v_count < p_limit THEN
        INSERT INTO rate_limit_log (key) VALUES (p_key);
        RETURN QUERY SELECT true, v_count + 1;
    ELSE
        RETURN QUERY SELECT false, v_count;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
