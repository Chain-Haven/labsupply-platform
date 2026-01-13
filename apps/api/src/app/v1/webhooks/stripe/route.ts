/**
 * Stripe Webhook Handler
 * POST /v1/webhooks/stripe
 * 
 * Handle Stripe payment events (checkout.session.completed, etc.)
 */

import { NextRequest } from 'next/server';
import { getServiceClient } from '@/lib/supabase';
import { verifyStripeWebhook, getCheckoutSession } from '@/lib/stripe';
import { inngest } from '@/lib/inngest';
import { successResponse, errorResponse } from '@/lib/auth';
import { generatePaymentIdempotencyKey, ApiError } from '@labsupply/shared';

export async function POST(request: NextRequest) {
    try {
        // Get raw body for signature verification
        const body = await request.text();
        const signature = request.headers.get('stripe-signature');

        if (!signature) {
            throw new ApiError('MISSING_SIGNATURE', 'Missing Stripe signature', 400);
        }

        // Verify webhook signature
        let event;
        try {
            event = verifyStripeWebhook(body, signature);
        } catch (err) {
            console.error('Stripe webhook verification failed:', err);
            throw new ApiError('INVALID_SIGNATURE', 'Invalid webhook signature', 400);
        }

        const supabase = getServiceClient();

        // Generate idempotency key
        const idempotencyKey = generatePaymentIdempotencyKey('stripe', event.id);

        // Check if we've already processed this event
        const { data: existingEvent } = await supabase
            .from('webhook_events')
            .select('id, status')
            .eq('idempotency_key', idempotencyKey)
            .single();

        if (existingEvent) {
            // Already processed
            return successResponse({ received: true, duplicate: true });
        }

        // Store the webhook event
        const { data: webhookEvent, error: webhookError } = await supabase
            .from('webhook_events')
            .insert({
                source: 'stripe',
                event_type: event.type,
                external_id: event.id,
                idempotency_key: idempotencyKey,
                payload: event.data.object as Record<string, unknown>,
                status: 'PROCESSING',
            })
            .select()
            .single();

        if (webhookError) {
            console.error('Failed to store webhook event:', webhookError);
            throw new ApiError('WEBHOOK_STORE_FAILED', 'Failed to process webhook', 500);
        }

        try {
            // Handle specific event types
            switch (event.type) {
                case 'checkout.session.completed': {
                    await handleCheckoutCompleted(event.data.object as any, supabase);
                    break;
                }

                case 'checkout.session.expired': {
                    await handleCheckoutExpired(event.data.object as any, supabase);
                    break;
                }

                case 'payment_intent.succeeded': {
                    // Additional confirmation if needed
                    console.log('Payment intent succeeded:', event.data.object);
                    break;
                }

                case 'payment_intent.payment_failed': {
                    await handlePaymentFailed(event.data.object as any, supabase);
                    break;
                }

                default:
                    console.log(`Unhandled Stripe event type: ${event.type}`);
            }

            // Mark as completed
            await supabase
                .from('webhook_events')
                .update({ status: 'COMPLETED', processed_at: new Date().toISOString() })
                .eq('id', webhookEvent.id);

        } catch (processingError) {
            // Mark as failed
            await supabase
                .from('webhook_events')
                .update({
                    status: 'FAILED',
                    last_error: (processingError as Error).message,
                    attempts: 1,
                })
                .eq('id', webhookEvent.id);

            throw processingError;
        }

        return successResponse({ received: true });

    } catch (error) {
        console.error('Stripe webhook error:', error);
        return errorResponse(error as Error);
    }
}

async function handleCheckoutCompleted(
    session: { id: string; metadata: { merchant_id: string; wallet_id: string; type: string }; amount_total: number; payment_intent: string },
    supabase: ReturnType<typeof getServiceClient>
) {
    const { metadata, amount_total, payment_intent } = session;

    if (metadata.type !== 'wallet_topup') {
        console.log('Non-topup checkout completed, skipping');
        return;
    }

    const merchantId = metadata.merchant_id;
    const walletId = metadata.wallet_id;
    const amountCents = amount_total;

    // Update payment record
    await supabase
        .from('payments')
        .update({
            status: 'SUCCEEDED',
            provider_payment_id: payment_intent,
            funds_confirmed: true,
            confirmed_at: new Date().toISOString(),
        })
        .eq('provider_checkout_id', session.id);

    // Update wallet balance
    const { data: wallet } = await supabase
        .from('wallet_accounts')
        .select('balance_cents')
        .eq('id', walletId)
        .single();

    if (!wallet) {
        throw new Error(`Wallet not found: ${walletId}`);
    }

    const newBalance = wallet.balance_cents + amountCents;

    await supabase
        .from('wallet_accounts')
        .update({ balance_cents: newBalance })
        .eq('id', walletId);

    // Record transaction
    await supabase.from('wallet_transactions').insert({
        merchant_id: merchantId,
        wallet_id: walletId,
        type: 'TOPUP',
        amount_cents: amountCents,
        balance_after_cents: newBalance,
        reference_type: 'payment',
        reference_id: session.id,
        description: 'Wallet top-up via Stripe',
    });

    // Trigger workflow to process pending orders
    await inngest.send({
        name: 'payment/succeeded',
        data: {
            paymentId: session.id,
            merchantId,
            walletId,
            amountCents,
            checkoutSessionId: session.id,
        },
    });

    // Audit log
    await supabase.from('audit_events').insert({
        merchant_id: merchantId,
        action: 'wallet.topup',
        entity_type: 'wallet',
        entity_id: walletId,
        metadata: { amount_cents: amountCents, payment_id: session.id },
    });

    console.log(`Wallet ${walletId} topped up with ${amountCents} cents`);
}

async function handleCheckoutExpired(
    session: { id: string },
    supabase: ReturnType<typeof getServiceClient>
) {
    // Mark payment as failed
    await supabase
        .from('payments')
        .update({ status: 'FAILED' })
        .eq('provider_checkout_id', session.id);

    console.log(`Checkout session expired: ${session.id}`);
}

async function handlePaymentFailed(
    paymentIntent: { id: string; last_payment_error?: { message: string } },
    supabase: ReturnType<typeof getServiceClient>
) {
    // Update payment with failure info
    await supabase
        .from('payments')
        .update({
            status: 'FAILED',
            metadata: { error: paymentIntent.last_payment_error?.message },
        })
        .eq('provider_payment_id', paymentIntent.id);

    console.log(`Payment failed: ${paymentIntent.id}`);
}
