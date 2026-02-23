/**
 * POST /api/webhooks/mercury
 *
 * Mercury webhook handler. When Mercury sends a transaction or balance event,
 * this triggers an immediate invoice sync to credit wallets in near-real-time.
 *
 * Unlike the apps/api version, this does NOT depend on Inngest -- it calls
 * the sync endpoint directly.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

function verifySignature(payload: string, signature: string | null, secret: string): boolean {
    if (!signature) return false;
    const expected = crypto.createHmac('sha256', secret).update(payload).digest('hex');
    try {
        return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
    } catch {
        return false;
    }
}

export async function POST(request: NextRequest) {
    try {
        const webhookSecret = process.env.MERCURY_WEBHOOK_SECRET;
        const rawBody = await request.text();

        if (webhookSecret) {
            const signature = request.headers.get('x-mercury-signature')
                || request.headers.get('x-signature');
            if (!verifySignature(rawBody, signature, webhookSecret)) {
                console.warn('Mercury webhook signature verification failed');
                return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
            }
        }

        const event = JSON.parse(rawBody);
        const eventType = event.type || event.eventType;

        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );

        await supabase.from('webhook_events').insert({
            source: 'mercury',
            event_type: eventType,
            external_id: event.id,
            idempotency_key: `mercury_portal_${event.id || Date.now()}`,
            payload: event,
            status: 'PROCESSING',
        });

        const shouldSync = [
            'transaction.created',
            'transaction.updated',
            'checkingAccount.balance.updated',
        ].includes(eventType);

        if (shouldSync) {
            // Trigger invoice sync directly via internal fetch
            const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://whitelabel.peptidetech.co';
            const cronSecret = process.env.CRON_SECRET || '';
            fetch(`${baseUrl}/api/cron/sync-invoices?key=${cronSecret}`, {
                method: 'GET',
                signal: AbortSignal.timeout(55000),
            }).catch(err => console.error('Background sync trigger failed:', err));
        }

        if (event.id) {
            await supabase
                .from('webhook_events')
                .update({ status: 'COMPLETED', processed_at: new Date().toISOString() })
                .eq('external_id', event.id)
                .eq('source', 'mercury');
        }

        return NextResponse.json({ received: true });
    } catch (error) {
        console.error('Mercury webhook error:', error);
        return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
    }
}
