/**
 * GET/PATCH /api/v1/admin/crypto/settings
 * Admin crypto settings: xPub management, confirmation threshold, Esplora URL.
 * xPubs are encrypted at rest and never exposed to merchants.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireAdmin } from '@/lib/admin-api-auth';
import { encryptValue, decryptValue } from '@/lib/crypto-encrypt';
import { validateXpub } from '@/lib/btc-hd';

export const dynamic = 'force-dynamic';

function getServiceClient() {
    return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
}

export async function GET() {
    try {
        const authResult = await requireAdmin();
        if (authResult instanceof NextResponse) return authResult;
        const adminId = authResult.admin.id;

        const sc = getServiceClient();
        const { data: settings } = await sc
            .from('admin_crypto_settings')
            .select('key, value_encrypted, updated_at');

        const result: Record<string, unknown> = {
            btc_topup_xpub_set: false,
            btc_tip_xpub_set: false,
            btc_confirmation_threshold: 3,
            btc_esplora_base_url: 'https://blockstream.info/api',
        };

        for (const s of settings || []) {
            switch (s.key) {
                case 'btc_topup_xpub':
                    result.btc_topup_xpub_set = true;
                    // Mask the xpub: show first 8 and last 6 chars
                    try {
                        const val = decryptValue(s.value_encrypted);
                        result.btc_topup_xpub_masked = `${val.substring(0, 8)}...${val.substring(val.length - 6)}`;
                    } catch {
                        result.btc_topup_xpub_masked = '(encrypted)';
                    }
                    break;
                case 'btc_tip_xpub':
                    result.btc_tip_xpub_set = true;
                    try {
                        const val = decryptValue(s.value_encrypted);
                        result.btc_tip_xpub_masked = `${val.substring(0, 8)}...${val.substring(val.length - 6)}`;
                    } catch {
                        result.btc_tip_xpub_masked = '(encrypted)';
                    }
                    break;
                case 'btc_confirmation_threshold':
                    result.btc_confirmation_threshold = parseInt(s.value_encrypted, 10) || 3;
                    break;
                case 'btc_esplora_base_url':
                    result.btc_esplora_base_url = s.value_encrypted;
                    break;
            }
        }

        return NextResponse.json({ data: result });
    } catch (error) {
        console.error('Crypto settings fetch error:', error);
        return NextResponse.json({ error: 'Crypto settings operation failed unexpectedly. Please try again.' }, { status: 500 });
    }
}

export async function PATCH(request: NextRequest) {
    try {
        const authResult = await requireAdmin();
        if (authResult instanceof NextResponse) return authResult;
        const adminId = authResult.admin.id;
        const isValidUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(adminId);

        const body = await request.json();
        const sc = getServiceClient();
        const updates: string[] = [];
        const now = new Date().toISOString();

        const upsertRow = (key: string, value: string) =>
            sc.from('admin_crypto_settings').upsert({
                key,
                value_encrypted: value,
                updated_at: now,
                ...(isValidUuid ? { updated_by: adminId } : {}),
            }, { onConflict: 'key' });

        if (body.btc_topup_xpub !== undefined) {
            if (!validateXpub(body.btc_topup_xpub)) {
                return NextResponse.json({ error: 'Invalid BTC TOPUP xPub' }, { status: 400 });
            }
            const { error: err } = await upsertRow('btc_topup_xpub', encryptValue(body.btc_topup_xpub));
            if (err) {
                console.error('xpub upsert error:', err);
                return NextResponse.json({ error: 'Failed to save xPub: ' + err.message }, { status: 500 });
            }
            updates.push('btc_topup_xpub');
        }

        if (body.btc_tip_xpub !== undefined) {
            if (!validateXpub(body.btc_tip_xpub)) {
                return NextResponse.json({ error: 'Invalid BTC TIP xPub' }, { status: 400 });
            }
            const { error: err } = await upsertRow('btc_tip_xpub', encryptValue(body.btc_tip_xpub));
            if (err) {
                return NextResponse.json({ error: 'Failed to save tip xPub: ' + err.message }, { status: 500 });
            }
            updates.push('btc_tip_xpub');
        }

        if (body.btc_confirmation_threshold !== undefined) {
            const threshold = parseInt(body.btc_confirmation_threshold, 10);
            if (isNaN(threshold) || threshold < 1 || threshold > 100) {
                return NextResponse.json({ error: 'Threshold must be 1-100' }, { status: 400 });
            }
            await upsertRow('btc_confirmation_threshold', String(threshold));
            updates.push('btc_confirmation_threshold');
        }

        if (body.btc_esplora_base_url !== undefined) {
            try {
                new URL(body.btc_esplora_base_url);
            } catch {
                return NextResponse.json({ error: 'Invalid Esplora URL' }, { status: 400 });
            }
            await upsertRow('btc_esplora_base_url', body.btc_esplora_base_url);
            updates.push('btc_esplora_base_url');
        }

        if (updates.length > 0) {
            await sc.from('audit_events').insert({
                action: 'admin.crypto_settings_updated',
                entity_type: 'admin_crypto_settings',
                entity_id: 'crypto-settings',
                metadata: { fields_updated: updates, admin_email: authResult.admin.email },
            }).then(() => {}, () => {});
        }

        return NextResponse.json({ data: { updated: updates } });
    } catch (error) {
        console.error('Crypto settings update error:', error);
        return NextResponse.json({ error: 'Crypto settings operation failed unexpectedly. Please try again.' }, { status: 500 });
    }
}
