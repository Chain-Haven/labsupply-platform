/**
 * GET /api/v1/merchant/btc-address
 * Returns the current active TOPUP BTC address for the authenticated merchant.
 * Auto-assigns a new address if none exists and xpub is configured.
 */

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createRouteHandlerClient } from '@/lib/supabase-server';
import { deriveAddress } from '@/lib/btc-hd';
import { decryptValue } from '@/lib/crypto-encrypt';

export const dynamic = 'force-dynamic';

function getServiceClient() {
    return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
}

async function getAuthenticatedMerchantId(): Promise<string | null> {
    const supabase = createRouteHandlerClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) return null;

    const sc = getServiceClient();
    const { data: merchant } = await sc
        .from('merchants')
        .select('id, status')
        .eq('user_id', user.id)
        .single();

    if (!merchant || merchant.status === 'CLOSED' || merchant.status === 'CLOSING') return null;
    return merchant.id;
}

async function assignNewAddress(
    sc: ReturnType<typeof getServiceClient>,
    merchantId: string,
    purpose: 'TOPUP' | 'TIP'
) {
    // Get xpub
    const key = purpose === 'TOPUP' ? 'btc_topup_xpub' : 'btc_tip_xpub';
    const { data: xpubSetting } = await sc
        .from('admin_crypto_settings')
        .select('value_encrypted')
        .eq('key', key)
        .single();

    if (!xpubSetting) throw new Error('xPub not configured');

    const xpub = decryptValue(xpubSetting.value_encrypted);

    // Claim next index atomically
    const { data: counter } = await sc
        .from('btc_address_counters')
        .select('next_index')
        .eq('purpose', purpose)
        .single();

    if (!counter) throw new Error('Address counter not found');

    const index = counter.next_index;

    const { error: updateErr } = await sc
        .from('btc_address_counters')
        .update({ next_index: index + 1 })
        .eq('purpose', purpose)
        .eq('next_index', index);

    if (updateErr) throw new Error('Failed to claim address index');

    const network = (process.env.BTC_NETWORK || 'mainnet') as 'mainnet' | 'testnet';
    const address = deriveAddress(xpub, index, network);

    const { data, error } = await sc
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

    if (error) throw new Error(`Failed to insert address: ${error.message}`);
    return data;
}

export async function GET() {
    try {
        const merchantId = await getAuthenticatedMerchantId();
        if (!merchantId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const sc = getServiceClient();

        // Check for active TOPUP address
        const { data: activeAddr } = await sc
            .from('btc_addresses')
            .select('*')
            .eq('merchant_id', merchantId)
            .eq('purpose', 'TOPUP')
            .eq('status', 'ACTIVE')
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

        if (activeAddr) {
            return NextResponse.json({
                data: {
                    address: activeAddr.address,
                    purpose: activeAddr.purpose,
                    status: activeAddr.status,
                    created_at: activeAddr.created_at,
                },
            });
        }

        // Check if xpub is configured
        const { data: xpubCheck } = await sc
            .from('admin_crypto_settings')
            .select('id')
            .eq('key', 'btc_topup_xpub')
            .maybeSingle();

        if (!xpubCheck) {
            return NextResponse.json({
                data: null,
                message: 'BTC deposits are not yet configured. Please contact support.',
            });
        }

        // Auto-assign
        const newAddr = await assignNewAddress(sc, merchantId, 'TOPUP');

        return NextResponse.json({
            data: {
                address: newAddr.address,
                purpose: newAddr.purpose,
                status: newAddr.status,
                created_at: newAddr.created_at,
            },
        });
    } catch (error) {
        console.error('BTC address fetch error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
