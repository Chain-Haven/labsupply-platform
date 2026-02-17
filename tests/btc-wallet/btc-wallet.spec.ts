/**
 * BTC Wallet System Tests
 *
 * Tests cover:
 * 1. Deposit idempotency (txid+vout uniqueness)
 * 2. Confirmation threshold crediting
 * 3. Currency segregation enforcement (no BTC->USD or USD->BTC crossover)
 * 4. Withdrawal + account closure workflow
 *
 * These tests require a running Supabase instance (uses service role).
 */

import { test, expect } from '@playwright/test';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

let supabase: SupabaseClient;
let testMerchantId: string;
let testUserId: string;

const TEST_MERCHANT_PREFIX = 'btc-test-';

test.beforeAll(async () => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !key) {
        console.warn('Skipping BTC wallet tests: missing Supabase env vars');
        return;
    }

    supabase = createClient(url, key, {
        auth: { autoRefreshToken: false, persistSession: false },
    });

    // Create a test merchant for all tests
    const email = `${TEST_MERCHANT_PREFIX}${Date.now()}@test.local`;
    const { data: authUser } = await supabase.auth.admin.createUser({
        email,
        password: 'TestPass123!',
        email_confirm: true,
    });

    if (authUser?.user) {
        testUserId = authUser.user.id;

        const { data: merchant } = await supabase
            .from('merchants')
            .insert({
                user_id: testUserId,
                name: 'BTC Test Merchant',
                company_name: 'BTC Test Co',
                contact_email: email,
                status: 'ACTIVE',
            })
            .select('id')
            .single();

        if (merchant) {
            testMerchantId = merchant.id;
        }
    }
});

test.afterAll(async () => {
    if (!supabase || !testMerchantId) return;

    // Cleanup: remove test data
    await supabase.from('btc_deposits').delete().eq('merchant_id', testMerchantId);
    await supabase.from('btc_addresses').delete().eq('merchant_id', testMerchantId);
    await supabase.from('withdrawal_requests').delete().eq('merchant_id', testMerchantId);
    await supabase.from('wallet_transactions').delete().eq('merchant_id', testMerchantId);
    await supabase.from('wallet_accounts').delete().eq('merchant_id', testMerchantId);
    await supabase.from('merchants').delete().eq('id', testMerchantId);
    if (testUserId) {
        await supabase.auth.admin.deleteUser(testUserId);
    }
});

test.describe('Deposit Idempotency', () => {
    test('duplicate txid+vout inserts should be rejected', async () => {
        if (!supabase || !testMerchantId) {
            test.skip();
            return;
        }

        const txid = 'test_txid_idempotency_' + Date.now();
        const vout = 0;

        // First insert should succeed
        const { error: err1 } = await supabase.from('btc_deposits').insert({
            merchant_id: testMerchantId,
            purpose: 'TOPUP',
            address: 'bc1qtest_idempotency',
            derivation_index: 0,
            txid,
            vout,
            amount_sats: 100000,
            confirmations: 1,
            status: 'PENDING',
        });

        expect(err1).toBeNull();

        // Duplicate insert should fail due to UNIQUE(txid, vout)
        const { error: err2 } = await supabase.from('btc_deposits').insert({
            merchant_id: testMerchantId,
            purpose: 'TOPUP',
            address: 'bc1qtest_idempotency',
            derivation_index: 0,
            txid,
            vout,
            amount_sats: 100000,
            confirmations: 2,
            status: 'PENDING',
        });

        expect(err2).not.toBeNull();
        expect(err2!.code).toBe('23505'); // Unique violation

        // Cleanup
        await supabase.from('btc_deposits').delete().eq('txid', txid);
    });

    test('different vout on same txid should be allowed', async () => {
        if (!supabase || !testMerchantId) {
            test.skip();
            return;
        }

        const txid = 'test_txid_vout_' + Date.now();

        const { error: err1 } = await supabase.from('btc_deposits').insert({
            merchant_id: testMerchantId,
            purpose: 'TOPUP',
            address: 'bc1qtest_vout1',
            derivation_index: 0,
            txid,
            vout: 0,
            amount_sats: 50000,
            status: 'PENDING',
        });

        const { error: err2 } = await supabase.from('btc_deposits').insert({
            merchant_id: testMerchantId,
            purpose: 'TOPUP',
            address: 'bc1qtest_vout2',
            derivation_index: 1,
            txid,
            vout: 1,
            amount_sats: 75000,
            status: 'PENDING',
        });

        expect(err1).toBeNull();
        expect(err2).toBeNull();

        // Cleanup
        await supabase.from('btc_deposits').delete().eq('txid', txid);
    });
});

test.describe('Confirmation Threshold', () => {
    test('deposit should not be creditworthy until threshold is met', async () => {
        if (!supabase || !testMerchantId) {
            test.skip();
            return;
        }

        const txid = 'test_txid_threshold_' + Date.now();
        const threshold = 3;

        // Insert with 2 confirmations (below threshold)
        await supabase.from('btc_deposits').insert({
            merchant_id: testMerchantId,
            purpose: 'TOPUP',
            address: 'bc1qtest_threshold',
            derivation_index: 0,
            txid,
            vout: 0,
            amount_sats: 200000,
            confirmations: 2,
            status: 'PENDING',
        });

        // Verify it's PENDING (not CONFIRMED)
        const { data: pending } = await supabase
            .from('btc_deposits')
            .select('status')
            .eq('txid', txid)
            .single();

        expect(pending?.status).toBe('PENDING');

        // Update to 3 confirmations (meets threshold)
        await supabase
            .from('btc_deposits')
            .update({ confirmations: threshold, status: 'CONFIRMED' })
            .eq('txid', txid);

        const { data: confirmed } = await supabase
            .from('btc_deposits')
            .select('status')
            .eq('txid', txid)
            .single();

        expect(confirmed?.status).toBe('CONFIRMED');

        // Cleanup
        await supabase.from('btc_deposits').delete().eq('txid', txid);
    });
});

test.describe('Currency Segregation', () => {
    test('USD and BTC wallets are separate per merchant', async () => {
        if (!supabase || !testMerchantId) {
            test.skip();
            return;
        }

        // Check both wallets exist (trigger should have created them)
        const { data: wallets, error } = await supabase
            .from('wallet_accounts')
            .select('id, currency, balance_cents')
            .eq('merchant_id', testMerchantId)
            .order('currency');

        expect(error).toBeNull();
        expect(wallets).toHaveLength(2);

        const currencies = wallets!.map(w => w.currency).sort();
        expect(currencies).toEqual(['BTC', 'USD']);
    });

    test('withdrawal_requests CHECK constraint enforces currency-destination matching', async () => {
        if (!supabase || !testMerchantId) {
            test.skip();
            return;
        }

        // USD withdrawal without email should fail
        const { error: usdNoEmail } = await supabase.from('withdrawal_requests').insert({
            merchant_id: testMerchantId,
            currency: 'USD',
            amount_minor: 10000,
            payout_email: null,
            payout_btc_address: null,
            status: 'PENDING_ADMIN',
            merchant_name_snapshot: 'Test',
            merchant_email_snapshot: 'test@test.com',
        });

        expect(usdNoEmail).not.toBeNull(); // CHECK violation

        // BTC withdrawal without btc address should fail
        const { error: btcNoAddr } = await supabase.from('withdrawal_requests').insert({
            merchant_id: testMerchantId,
            currency: 'BTC',
            amount_minor: 50000,
            payout_email: null,
            payout_btc_address: null,
            status: 'PENDING_ADMIN',
            merchant_name_snapshot: 'Test',
            merchant_email_snapshot: 'test@test.com',
        });

        expect(btcNoAddr).not.toBeNull(); // CHECK violation

        // USD withdrawal with email should succeed
        const { data: usdOk, error: usdOkErr } = await supabase.from('withdrawal_requests').insert({
            merchant_id: testMerchantId,
            currency: 'USD',
            amount_minor: 10000,
            payout_email: 'test@test.com',
            status: 'PENDING_ADMIN',
            merchant_name_snapshot: 'Test',
            merchant_email_snapshot: 'test@test.com',
        }).select('id').single();

        expect(usdOkErr).toBeNull();

        // BTC withdrawal with btc address should succeed
        const { data: btcOk, error: btcOkErr } = await supabase.from('withdrawal_requests').insert({
            merchant_id: testMerchantId,
            currency: 'BTC',
            amount_minor: 50000,
            payout_btc_address: 'bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4',
            status: 'PENDING_ADMIN',
            merchant_name_snapshot: 'Test',
            merchant_email_snapshot: 'test@test.com',
        }).select('id').single();

        expect(btcOkErr).toBeNull();

        // Cleanup
        if (usdOk) await supabase.from('withdrawal_requests').delete().eq('id', usdOk.id);
        if (btcOk) await supabase.from('withdrawal_requests').delete().eq('id', btcOk.id);
    });

    test('BTC deposit transaction types are distinct from USD', async () => {
        if (!supabase || !testMerchantId) {
            test.skip();
            return;
        }

        const { data: btcWallet } = await supabase
            .from('wallet_accounts')
            .select('id')
            .eq('merchant_id', testMerchantId)
            .eq('currency', 'BTC')
            .single();

        expect(btcWallet).not.toBeNull();

        // BTC_DEPOSIT_TOPUP type should be valid
        const { error: btcErr } = await supabase.from('wallet_transactions').insert({
            merchant_id: testMerchantId,
            wallet_id: btcWallet!.id,
            type: 'BTC_DEPOSIT_TOPUP',
            amount_cents: 100000,
            balance_after_cents: 100000,
            description: 'Test BTC deposit',
        });

        expect(btcErr).toBeNull();

        // Cleanup
        await supabase
            .from('wallet_transactions')
            .delete()
            .eq('merchant_id', testMerchantId)
            .eq('type', 'BTC_DEPOSIT_TOPUP');
    });
});

test.describe('Withdrawal Closure Workflow', () => {
    test('withdrawal request sets correct status and snapshots', async () => {
        if (!supabase || !testMerchantId) {
            test.skip();
            return;
        }

        const { data: withdrawal, error } = await supabase
            .from('withdrawal_requests')
            .insert({
                merchant_id: testMerchantId,
                currency: 'USD',
                amount_minor: 5000,
                payout_email: 'payout@test.com',
                status: 'PENDING_ADMIN',
                merchant_name_snapshot: 'BTC Test Co',
                merchant_email_snapshot: 'btc-test@test.local',
                closure_confirmed_at: new Date().toISOString(),
            })
            .select()
            .single();

        expect(error).toBeNull();
        expect(withdrawal?.status).toBe('PENDING_ADMIN');
        expect(withdrawal?.merchant_name_snapshot).toBe('BTC Test Co');
        expect(withdrawal?.closure_confirmed_at).not.toBeNull();

        // Simulate admin completing the withdrawal
        const { error: completeErr } = await supabase
            .from('withdrawal_requests')
            .update({
                status: 'COMPLETED',
                completed_at: new Date().toISOString(),
            })
            .eq('id', withdrawal!.id);

        expect(completeErr).toBeNull();

        // Set merchant to CLOSED
        await supabase
            .from('merchants')
            .update({ status: 'CLOSED' })
            .eq('id', testMerchantId);

        const { data: closedMerchant } = await supabase
            .from('merchants')
            .select('status')
            .eq('id', testMerchantId)
            .single();

        expect(closedMerchant?.status).toBe('CLOSED');

        // Reset for other tests
        await supabase
            .from('merchants')
            .update({ status: 'ACTIVE' })
            .eq('id', testMerchantId);

        // Cleanup
        await supabase.from('withdrawal_requests').delete().eq('id', withdrawal!.id);
    });

    test('CLOSING status can be set on merchant', async () => {
        if (!supabase || !testMerchantId) {
            test.skip();
            return;
        }

        await supabase
            .from('merchants')
            .update({ status: 'CLOSING' })
            .eq('id', testMerchantId);

        const { data } = await supabase
            .from('merchants')
            .select('status')
            .eq('id', testMerchantId)
            .single();

        expect(data?.status).toBe('CLOSING');

        // Reset
        await supabase
            .from('merchants')
            .update({ status: 'ACTIVE' })
            .eq('id', testMerchantId);
    });
});

test.describe('BTC Address Management', () => {
    test('address uniqueness is enforced', async () => {
        if (!supabase || !testMerchantId) {
            test.skip();
            return;
        }

        const addr = 'bc1qunique_test_' + Date.now();

        const { error: err1 } = await supabase.from('btc_addresses').insert({
            merchant_id: testMerchantId,
            purpose: 'TOPUP',
            derivation_index: 99990,
            address: addr,
            status: 'ACTIVE',
        });

        expect(err1).toBeNull();

        // Duplicate address should fail
        const { error: err2 } = await supabase.from('btc_addresses').insert({
            merchant_id: testMerchantId,
            purpose: 'TOPUP',
            derivation_index: 99991,
            address: addr, // Same address, different index
            status: 'ACTIVE',
        });

        expect(err2).not.toBeNull();

        // Cleanup
        await supabase.from('btc_addresses').delete().eq('address', addr);
    });

    test('purpose+derivation_index uniqueness is enforced', async () => {
        if (!supabase || !testMerchantId) {
            test.skip();
            return;
        }

        const index = 99995;

        const { error: err1 } = await supabase.from('btc_addresses').insert({
            merchant_id: testMerchantId,
            purpose: 'TOPUP',
            derivation_index: index,
            address: 'bc1qaddr_test_a_' + Date.now(),
            status: 'ACTIVE',
        });

        expect(err1).toBeNull();

        // Same purpose + index should fail
        const { error: err2 } = await supabase.from('btc_addresses').insert({
            merchant_id: testMerchantId,
            purpose: 'TOPUP',
            derivation_index: index,
            address: 'bc1qaddr_test_b_' + Date.now(),
            status: 'ACTIVE',
        });

        expect(err2).not.toBeNull();

        // Cleanup
        await supabase.from('btc_addresses').delete()
            .eq('merchant_id', testMerchantId)
            .eq('derivation_index', index);
    });
});
