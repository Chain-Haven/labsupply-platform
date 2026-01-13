/**
 * LabSupply API - Stripe Client
 * Stripe SDK initialization and helpers
 */

import Stripe from 'stripe';

let stripeClient: Stripe | null = null;

export function getStripeClient(): Stripe {
    if (!stripeClient) {
        const secretKey = process.env.STRIPE_SECRET_KEY;

        if (!secretKey) {
            throw new Error('Missing STRIPE_SECRET_KEY environment variable');
        }

        stripeClient = new Stripe(secretKey, {
            apiVersion: '2023-10-16',
            typescript: true,
        });
    }

    return stripeClient;
}

/**
 * Create a Stripe Checkout session for wallet top-up
 */
export async function createTopUpCheckoutSession(params: {
    merchantId: string;
    walletId: string;
    amountCents: number;
    currency: string;
    returnUrl: string;
    merchantEmail?: string;
}): Promise<{ sessionId: string; url: string }> {
    const stripe = getStripeClient();
    const appUrl = process.env.APP_BASE_URL || 'http://localhost:3000';

    const session = await stripe.checkout.sessions.create({
        mode: 'payment',
        payment_method_types: ['card'],
        line_items: [
            {
                price_data: {
                    currency: params.currency.toLowerCase(),
                    product_data: {
                        name: 'Wallet Top-Up',
                        description: 'Add funds to your LabSupply wallet',
                    },
                    unit_amount: params.amountCents,
                },
                quantity: 1,
            },
        ],
        metadata: {
            merchant_id: params.merchantId,
            wallet_id: params.walletId,
            type: 'wallet_topup',
        },
        customer_email: params.merchantEmail,
        success_url: `${params.returnUrl}?session_id={CHECKOUT_SESSION_ID}&status=success`,
        cancel_url: `${params.returnUrl}?status=cancelled`,
        expires_at: Math.floor(Date.now() / 1000) + 30 * 60, // 30 minutes
    });

    if (!session.url) {
        throw new Error('Failed to create checkout session URL');
    }

    return {
        sessionId: session.id,
        url: session.url,
    };
}

/**
 * Verify a Stripe webhook signature
 */
export function verifyStripeWebhook(
    payload: string | Buffer,
    signature: string
): Stripe.Event {
    const stripe = getStripeClient();
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!webhookSecret) {
        throw new Error('Missing STRIPE_WEBHOOK_SECRET environment variable');
    }

    return stripe.webhooks.constructEvent(payload, signature, webhookSecret);
}

/**
 * Retrieve a checkout session
 */
export async function getCheckoutSession(
    sessionId: string
): Promise<Stripe.Checkout.Session> {
    const stripe = getStripeClient();
    return stripe.checkout.sessions.retrieve(sessionId, {
        expand: ['payment_intent'],
    });
}

// Re-export Stripe types
export { Stripe };
