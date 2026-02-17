/**
 * BTC Address Manager
 * Handles address assignment, rotation, and lookup for merchant BTC deposits.
 * Uses monotonic counters per purpose to prevent gap-limit exhaustion.
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { deriveAddress } from './btc-hd';
import { decryptValue } from './crypto-encrypt';

export interface BtcAddressRecord {
    id: string;
    merchant_id: string;
    purpose: string;
    derivation_index: number;
    address: string;
    status: string;
    created_at: string;
    used_at: string | null;
}

/**
 * Retrieve the decrypted xpub for a given purpose from admin_crypto_settings.
 */
async function getXpub(
    supabase: SupabaseClient,
    purpose: 'TOPUP' | 'TIP'
): Promise<string> {
    const key = purpose === 'TOPUP' ? 'btc_topup_xpub' : 'btc_tip_xpub';

    const { data, error } = await supabase
        .from('admin_crypto_settings')
        .select('value_encrypted')
        .eq('key', key)
        .single();

    if (error || !data) {
        throw new Error(`BTC xPub not configured for purpose: ${purpose}`);
    }

    return decryptValue(data.value_encrypted);
}

/**
 * Get the BTC network from env var (defaults to mainnet).
 */
function getNetwork(): 'mainnet' | 'testnet' {
    const net = process.env.BTC_NETWORK || 'mainnet';
    return net === 'testnet' ? 'testnet' : 'mainnet';
}

/**
 * Atomically claim the next derivation index for a purpose.
 * Uses UPDATE ... RETURNING to prevent race conditions.
 */
async function claimNextIndex(
    supabase: SupabaseClient,
    purpose: 'TOPUP' | 'TIP'
): Promise<number> {
    // Atomic increment: returns the index BEFORE incrementing
    const { data, error } = await supabase.rpc('claim_btc_address_index', {
        p_purpose: purpose,
    });

    if (error) {
        // Fallback: manual update if RPC doesn't exist yet
        const { data: counter, error: fetchErr } = await supabase
            .from('btc_address_counters')
            .select('next_index')
            .eq('purpose', purpose)
            .single();

        if (fetchErr || !counter) {
            throw new Error(`Failed to fetch address counter for ${purpose}`);
        }

        const currentIndex = counter.next_index;

        const { error: updateErr } = await supabase
            .from('btc_address_counters')
            .update({ next_index: currentIndex + 1 })
            .eq('purpose', purpose)
            .eq('next_index', currentIndex);

        if (updateErr) {
            throw new Error(`Failed to claim address index for ${purpose} (concurrent conflict)`);
        }

        return currentIndex;
    }

    return data as number;
}

/**
 * Assign a new BTC address to a merchant for a given purpose.
 * Atomically increments the derivation counter and derives the address.
 */
export async function assignAddress(
    supabase: SupabaseClient,
    merchantId: string,
    purpose: 'TOPUP' | 'TIP'
): Promise<BtcAddressRecord> {
    const xpub = await getXpub(supabase, purpose);
    const index = await claimNextIndex(supabase, purpose);
    const network = getNetwork();
    const address = deriveAddress(xpub, index, network);

    const { data, error } = await supabase
        .from('btc_addresses')
        .insert({
            merchant_id: merchantId,
            purpose,
            derivation_index: index,
            address,
            status: 'ACTIVE',
        })
        .select()
        .single();

    if (error) {
        throw new Error(`Failed to insert BTC address: ${error.message}`);
    }

    return data as BtcAddressRecord;
}

/**
 * Get the current active address for a merchant + purpose.
 * Returns null if no active address exists.
 */
export async function getActiveAddress(
    supabase: SupabaseClient,
    merchantId: string,
    purpose: 'TOPUP' | 'TIP'
): Promise<BtcAddressRecord | null> {
    const { data, error } = await supabase
        .from('btc_addresses')
        .select('*')
        .eq('merchant_id', merchantId)
        .eq('purpose', purpose)
        .eq('status', 'ACTIVE')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

    if (error) {
        throw new Error(`Failed to fetch active address: ${error.message}`);
    }

    return data as BtcAddressRecord | null;
}

/**
 * Rotate a merchant's address: mark the old address as USED and assign a new one.
 * Called when a transaction is first detected on the current active address.
 */
export async function rotateAddress(
    supabase: SupabaseClient,
    addressId: string,
    merchantId: string,
    purpose: 'TOPUP' | 'TIP'
): Promise<BtcAddressRecord> {
    // Mark old address as USED
    const { error: updateErr } = await supabase
        .from('btc_addresses')
        .update({ status: 'USED', used_at: new Date().toISOString() })
        .eq('id', addressId)
        .eq('status', 'ACTIVE');

    if (updateErr) {
        console.error(`Failed to mark address ${addressId} as USED:`, updateErr);
    }

    // Assign a new one
    return assignAddress(supabase, merchantId, purpose);
}

/**
 * Get all active BTC addresses across all merchants (for the watcher cron).
 */
export async function getAllActiveAddresses(
    supabase: SupabaseClient
): Promise<BtcAddressRecord[]> {
    const { data, error } = await supabase
        .from('btc_addresses')
        .select('*')
        .eq('status', 'ACTIVE')
        .order('created_at', { ascending: true });

    if (error) {
        throw new Error(`Failed to fetch active addresses: ${error.message}`);
    }

    return (data || []) as BtcAddressRecord[];
}
