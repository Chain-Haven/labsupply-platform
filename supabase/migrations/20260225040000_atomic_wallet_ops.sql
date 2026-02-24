-- ============================================================================
-- Atomic wallet balance operations via Postgres RPC
-- Eliminates race conditions from read-compute-write patterns in JS
-- ============================================================================

CREATE OR REPLACE FUNCTION public.adjust_wallet_balance(
    p_wallet_id UUID,
    p_amount_cents INTEGER,
    p_merchant_id UUID,
    p_type TEXT,
    p_reference_type TEXT,
    p_reference_id UUID,
    p_description TEXT,
    p_metadata JSONB DEFAULT '{}',
    p_idempotency_key TEXT DEFAULT NULL
) RETURNS TABLE(new_balance INTEGER, transaction_id UUID) AS $$
DECLARE
    v_wallet wallet_accounts%ROWTYPE;
    v_new_balance INTEGER;
    v_txn_id UUID;
BEGIN
    -- Idempotency: if this key was already processed, return the existing result
    IF p_idempotency_key IS NOT NULL THEN
        SELECT wt.id INTO v_txn_id
        FROM wallet_transactions wt
        WHERE wt.metadata->>'idempotency_key' = p_idempotency_key
        LIMIT 1;

        IF v_txn_id IS NOT NULL THEN
            SELECT wa.balance_cents INTO v_new_balance
            FROM wallet_accounts wa WHERE wa.id = p_wallet_id;
            RETURN QUERY SELECT v_new_balance, v_txn_id;
            RETURN;
        END IF;
    END IF;

    -- Lock the wallet row to prevent concurrent modifications
    SELECT * INTO v_wallet
    FROM wallet_accounts
    WHERE id = p_wallet_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Wallet not found: %', p_wallet_id;
    END IF;

    v_new_balance := v_wallet.balance_cents + p_amount_cents;

    IF v_new_balance < 0 THEN
        RAISE EXCEPTION 'Insufficient balance: have % cents, need % cents',
            v_wallet.balance_cents, -p_amount_cents;
    END IF;

    UPDATE wallet_accounts
    SET balance_cents = v_new_balance
    WHERE id = p_wallet_id;

    INSERT INTO wallet_transactions (
        merchant_id, wallet_id, type, amount_cents,
        balance_after_cents, reference_type, reference_id,
        description, metadata
    ) VALUES (
        p_merchant_id, p_wallet_id, p_type, p_amount_cents,
        v_new_balance, p_reference_type, p_reference_id, p_description,
        p_metadata || CASE
            WHEN p_idempotency_key IS NOT NULL
            THEN jsonb_build_object('idempotency_key', p_idempotency_key)
            ELSE '{}'::jsonb
        END
    )
    RETURNING id INTO v_txn_id;

    RETURN QUERY SELECT v_new_balance, v_txn_id;
END;
$$ LANGUAGE plpgsql;

-- Atomic reserved_cents adjustment (for order funding/release)
CREATE OR REPLACE FUNCTION public.adjust_wallet_reserved(
    p_wallet_id UUID,
    p_reserved_delta INTEGER
) RETURNS INTEGER AS $$
DECLARE
    v_new_reserved INTEGER;
BEGIN
    UPDATE wallet_accounts
    SET reserved_cents = GREATEST(0, reserved_cents + p_reserved_delta)
    WHERE id = p_wallet_id
    RETURNING reserved_cents INTO v_new_reserved;

    RETURN v_new_reserved;
END;
$$ LANGUAGE plpgsql;
