/**
 * GET/PATCH /api/v1/admin/crypto/settings
 * Admin crypto settings: xPub management, confirmation threshold, Esplora URL.
 * xPubs are encrypted at rest and never exposed to merchants.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createRouteHandlerClient } from '@/lib/supabase-server';
import { encryptValue, decryptValue } from '@/lib/crypto-encrypt';
import { validateXpub } from '@/lib/btc-hd';

export const dynamic = 'force-dynamic';

function getServiceClient() {
    return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
}

async function verifyAdmin(): Promise<string | null> {
    const supabase = createRouteHandlerClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) return null;

    const sc = getServiceClient();
    const { data: admin } = await sc
        .from('supplier_users')
        .select('user_id, role, is_active')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .single();

    if (!admin) return null;
    return user.id;
}

export async function GET() {
    try {
        const adminId = await verifyAdmin();
        if (!adminId) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

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
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function PATCH(request: NextRequest) {
    try {
        const adminId = await verifyAdmin();
        if (!adminId) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const body = await request.json();
        const sc = getServiceClient();
        const updates: string[] = [];

        // Update xpub(s)
        if (body.btc_topup_xpub !== undefined) {
            if (!validateXpub(body.btc_topup_xpub)) {
                return NextResponse.json({ error: 'Invalid BTC TOPUP xPub' }, { status: 400 });
            }
            const encrypted = encryptValue(body.btc_topup_xpub);
            await sc.from('admin_crypto_settings').upsert({
                key: 'btc_topup_xpub',
                value_encrypted: encrypted,
                updated_at: new Date().toISOString(),
                updated_by: adminId,
            }, { onConflict: 'key' });
            updates.push('btc_topup_xpub');
        }

        if (body.btc_tip_xpub !== undefined) {
            if (!validateXpub(body.btc_tip_xpub)) {
                return NextResponse.json({ error: 'Invalid BTC TIP xPub' }, { status: 400 });
            }
            const encrypted = encryptValue(body.btc_tip_xpub);
            await sc.from('admin_crypto_settings').upsert({
                key: 'btc_tip_xpub',
                value_encrypted: encrypted,
                updated_at: new Date().toISOString(),
                updated_by: adminId,
            }, { onConflict: 'key' });
            updates.push('btc_tip_xpub');
        }

        // Update confirmation threshold (stored as plaintext since it's not sensitive)
        if (body.btc_confirmation_threshold !== undefined) {
            const threshold = parseInt(body.btc_confirmation_threshold, 10);
            if (isNaN(threshold) || threshold < 1 || threshold > 100) {
                return NextResponse.json({ error: 'Threshold must be 1-100' }, { status: 400 });
            }
            await sc.from('admin_crypto_settings').upsert({
                key: 'btc_confirmation_threshold',
                value_encrypted: String(threshold),
                updated_at: new Date().toISOString(),
                updated_by: adminId,
            }, { onConflict: 'key' });
            updates.push('btc_confirmation_threshold');
        }

        // Update Esplora URL
        if (body.btc_esplora_base_url !== undefined) {
            try {
                new URL(body.btc_esplora_base_url);
            } catch {
                return NextResponse.json({ error: 'Invalid Esplora URL' }, { status: 400 });
            }
            await sc.from('admin_crypto_settings').upsert({
                key: 'btc_esplora_base_url',
                value_encrypted: body.btc_esplora_base_url,
                updated_at: new Date().toISOString(),
                updated_by: adminId,
            }, { onConflict: 'key' });
            updates.push('btc_esplora_base_url');
        }

        // Audit log
        if (updates.length > 0) {
            await sc.from('audit_events').insert({
                actor_user_id: adminId,
                action: 'admin.crypto_settings_updated',
                entity_type: 'admin_crypto_settings',
                entity_id: 'crypto-settings',
                metadata: { fields_updated: updates },
            });
        }

        return NextResponse.json({ data: { updated: updates } });
    } catch (error) {
        console.error('Crypto settings update error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
