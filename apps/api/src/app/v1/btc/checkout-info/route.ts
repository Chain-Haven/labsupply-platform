/**
 * GET /v1/btc/checkout-info
 * Returns the merchant's active BTC TOPUP address and current BTC/USD rate.
 * Called by the WooCommerce plugin to display BTC checkout to customers.
 */

import { verifyStoreRequest, errorResponse, successResponse } from '@/lib/auth';
import { getServiceClient } from '@/lib/supabase';
import { deriveAddress } from '@/lib/btc-hd';
import { decryptValue } from '@/lib/crypto-encrypt';

export const dynamic = 'force-dynamic';

const BTC_RATE_CACHE: { rate: number; fetchedAt: number } = { rate: 0, fetchedAt: 0 };
const RATE_CACHE_TTL_MS = 60_000;

async function fetchBtcRate(): Promise<number> {
    const now = Date.now();
    if (BTC_RATE_CACHE.rate > 0 && now - BTC_RATE_CACHE.fetchedAt < RATE_CACHE_TTL_MS) {
        return BTC_RATE_CACHE.rate;
    }

    try {
        const res = await fetch(
            'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd',
            { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(5000) }
        );
        if (res.ok) {
            const data = await res.json();
            const rate = data?.bitcoin?.usd;
            if (typeof rate === 'number' && rate > 0) {
                BTC_RATE_CACHE.rate = rate;
                BTC_RATE_CACHE.fetchedAt = now;
                return rate;
            }
        }
    } catch { /* fall through */ }

    try {
        const res = await fetch(
            'https://mempool.space/api/v1/prices',
            { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(5000) }
        );
        if (res.ok) {
            const data = await res.json();
            const rate = data?.USD;
            if (typeof rate === 'number' && rate > 0) {
                BTC_RATE_CACHE.rate = rate;
                BTC_RATE_CACHE.fetchedAt = now;
                return rate;
            }
        }
    } catch { /* fall through */ }

    if (BTC_RATE_CACHE.rate > 0) return BTC_RATE_CACHE.rate;
    throw new Error('Unable to fetch BTC/USD exchange rate');
}

export async function GET(request: Request) {
    try {
        const store = await verifyStoreRequest(request as any);
        const supabase = getServiceClient();

        const { data: activeAddr } = await supabase
            .from('btc_addresses')
            .select('id, address, purpose, derivation_index, created_at')
            .eq('merchant_id', store.merchantId)
            .eq('purpose', 'TOPUP')
            .eq('status', 'ACTIVE')
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

        let address = activeAddr?.address;

        if (!address) {
            const { data: xpubSetting } = await supabase
                .from('admin_crypto_settings')
                .select('value_encrypted')
                .eq('key', 'btc_topup_xpub')
                .single();

            if (!xpubSetting) {
                return successResponse({
                    enabled: false,
                    message: 'BTC payments are not configured for this platform.',
                });
            }

            const xpub = decryptValue(xpubSetting.value_encrypted);

            const { data: counter } = await supabase
                .from('btc_address_counters')
                .select('next_index')
                .eq('purpose', 'TOPUP')
                .single();

            if (!counter) {
                return successResponse({ enabled: false, message: 'BTC address system not initialized.' });
            }

            const index = counter.next_index;

            await supabase
                .from('btc_address_counters')
                .update({ next_index: index + 1 })
                .eq('purpose', 'TOPUP')
                .eq('next_index', index);

            const network = (process.env.BTC_NETWORK || 'mainnet') as 'mainnet' | 'testnet';
            address = deriveAddress(xpub, index, network);

            await supabase.from('btc_addresses').insert({
                merchant_id: store.merchantId,
                purpose: 'TOPUP',
                derivation_index: index,
                address,
                status: 'ACTIVE',
            });
        }

        const btcRate = await fetchBtcRate();
        const network = process.env.BTC_NETWORK || 'mainnet';
        const esploraBase = process.env.ESPLORA_BASE_URL || 'https://blockstream.info/api';

        let confThreshold = 3;
        const { data: thresholdSetting } = await supabase
            .from('admin_crypto_settings')
            .select('value_encrypted')
            .eq('key', 'btc_confirmation_threshold')
            .maybeSingle();
        if (thresholdSetting?.value_encrypted) {
            const parsed = parseInt(thresholdSetting.value_encrypted, 10);
            if (!isNaN(parsed) && parsed > 0) confThreshold = parsed;
        }

        return successResponse({
            enabled: true,
            address,
            btc_rate_usd: btcRate,
            network,
            esplora_base_url: esploraBase,
            confirmation_threshold: confThreshold,
        });
    } catch (error) {
        return errorResponse(error as Error);
    }
}
