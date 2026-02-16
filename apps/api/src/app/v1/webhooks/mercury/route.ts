/**
 * Mercury Webhook Handler
 * Receives webhook events from Mercury (e.g., transaction.created, checkingAccount.balance.updated)
 * Used as backup detection for invoice payments - triggers immediate invoice sync
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServiceClient } from '@/lib/supabase';
import { inngest } from '@/lib/inngest';
import crypto from 'crypto';

/**
 * Verify Mercury webhook signature
 * Mercury signs webhooks with HMAC-SHA256 using the webhook secret
 */
function verifyWebhookSignature(
    payload: string,
    signature: string | null,
    secret: string
): boolean {
    if (!signature) return false;

    const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(payload)
        .digest('hex');

    return crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(expectedSignature)
    );
}

export async function POST(request: NextRequest) {
    try {
        const webhookSecret = process.env.MERCURY_WEBHOOK_SECRET;
        const rawBody = await request.text();

        // In production, webhook signature verification is mandatory
        if (!webhookSecret) {
            console.error('MERCURY_WEBHOOK_SECRET is not configured - rejecting webhook');
            return NextResponse.json(
                { error: 'Webhook secret not configured' },
                { status: 503 }
            );
        }

        const signature = request.headers.get('x-mercury-signature')
            || request.headers.get('x-signature');

        if (!verifyWebhookSignature(rawBody, signature, webhookSecret)) {
            console.warn('Mercury webhook signature verification failed');
            return NextResponse.json(
                { error: 'Invalid signature' },
                { status: 401 }
            );
        }

        const event = JSON.parse(rawBody);
        const eventType = event.type || event.eventType;

        const supabase = getServiceClient();

        // Log webhook event
        await supabase.from('webhook_events').insert({
            source: 'mercury',
            event_type: eventType,
            external_id: event.id,
            idempotency_key: `mercury_${event.id || Date.now()}`,
            payload: event,
            status: 'PROCESSING',
        });

        switch (eventType) {
            case 'transaction.created':
            case 'transaction.updated': {
                // An incoming transaction may indicate an invoice payment
                // Trigger an immediate invoice sync to credit wallets faster
                const transaction = event.data || event;
                const amount = transaction.amount;

                // Only care about incoming (positive) transactions
                if (amount && amount > 0) {
                    // Check if this matches any open invoice amount
                    const amountCents = Math.round(amount * 100);

                    const { data: matchingInvoices } = await supabase
                        .from('mercury_invoices')
                        .select('id, merchant_id, mercury_invoice_id')
                        .in('status', ['Unpaid', 'Processing'])
                        .eq('wallet_credited', false)
                        .eq('amount_cents', amountCents)
                        .limit(5);

                    if (matchingInvoices && matchingInvoices.length > 0) {
                        // Trigger immediate sync for these invoices
                        await inngest.send({
                            name: 'mercury/sync-invoices',
                            data: {},
                        });
                    }
                }

                break;
            }

            case 'checkingAccount.balance.updated': {
                // Balance changed - could mean invoice payment settled
                // Trigger invoice sync to check
                await inngest.send({
                    name: 'mercury/sync-invoices',
                    data: {},
                });
                break;
            }

            default:
                console.log('Unhandled Mercury webhook event type:', eventType);
        }

        // Mark webhook as completed
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
        return NextResponse.json(
            { error: 'Webhook processing failed' },
            { status: 500 }
        );
    }
}
