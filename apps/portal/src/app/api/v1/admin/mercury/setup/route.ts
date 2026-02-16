/**
 * POST /api/v1/admin/mercury/setup
 * Auto-register Mercury webhook and return connection status
 * GET  - Check current Mercury connection status (accounts, webhooks)
 * POST - Register webhook automatically
 */

import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const MERCURY_API = 'https://api.mercury.com/api/v1';

async function mercuryFetch(path: string, token: string, options?: RequestInit) {
    return fetch(`${MERCURY_API}${path}`, {
        ...options,
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            ...(options?.headers || {}),
        },
    });
}

/**
 * GET - Check Mercury connection status
 */
export async function GET() {
    try {
        const token = process.env.MERCURY_API_TOKEN;

        if (!token) {
            return NextResponse.json({
                data: {
                    connected: false,
                    error: 'MERCURY_API_TOKEN not set in environment variables',
                    accounts: [],
                    webhooks: [],
                    webhookConfigured: false,
                },
            });
        }

        // Fetch accounts
        let accounts: Array<{ id: string; name: string; type: string; status: string }> = [];
        try {
            const accRes = await mercuryFetch('/accounts', token);
            if (accRes.ok) {
                const accData = await accRes.json();
                accounts = (accData.accounts || []).map((a: Record<string, unknown>) => ({
                    id: a.id,
                    name: a.name,
                    type: a.type,
                    status: a.status,
                }));
            }
        } catch (e) {
            console.error('Error fetching Mercury accounts:', e);
        }

        // Fetch existing webhooks
        let webhooks: Array<{ id: string; url: string; status: string; eventTypes?: string[] }> = [];
        try {
            const whRes = await mercuryFetch('/webhooks', token);
            if (whRes.ok) {
                const whData = await whRes.json();
                webhooks = whData.webhooks || [];
            }
        } catch (e) {
            console.error('Error fetching Mercury webhooks:', e);
        }

        const webhookConfigured = !!process.env.MERCURY_WEBHOOK_SECRET && webhooks.length > 0;

        return NextResponse.json({
            data: {
                connected: true,
                accounts,
                webhooks: webhooks.map(w => ({
                    id: w.id,
                    url: w.url,
                    status: w.status,
                    eventTypes: w.eventTypes,
                })),
                webhookConfigured,
                hasAccountId: !!process.env.MERCURY_ACCOUNT_ID,
                hasWebhookSecret: !!process.env.MERCURY_WEBHOOK_SECRET,
            },
        });
    } catch (error) {
        console.error('Mercury setup check error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

/**
 * POST - Register webhook with Mercury
 * Body: { webhookUrl: string } - the public URL for the webhook endpoint
 */
export async function POST(request: NextRequest) {
    try {
        const token = process.env.MERCURY_API_TOKEN;
        if (!token) {
            return NextResponse.json({ error: 'MERCURY_API_TOKEN not configured' }, { status: 503 });
        }

        const body = await request.json();
        const { webhookUrl } = body;

        if (!webhookUrl) {
            return NextResponse.json({ error: 'webhookUrl is required' }, { status: 400 });
        }

        // Check if webhook already exists for this URL
        let existingWebhooks: Array<{ id: string; url: string; status: string }> = [];
        try {
            const whRes = await mercuryFetch('/webhooks', token);
            if (whRes.ok) {
                const whData = await whRes.json();
                existingWebhooks = whData.webhooks || [];
            }
        } catch {
            // Continue even if check fails
        }

        const existing = existingWebhooks.find(w => w.url === webhookUrl);
        if (existing) {
            return NextResponse.json({
                data: {
                    webhook: existing,
                    message: 'Webhook already registered for this URL',
                    alreadyExists: true,
                    instructions: 'The webhook is already registered. If you need the secret, you must delete and recreate it.',
                },
            });
        }

        // Register new webhook
        const createRes = await mercuryFetch('/webhooks', token, {
            method: 'POST',
            body: JSON.stringify({
                url: webhookUrl,
                eventTypes: [
                    'transaction.created',
                    'transaction.updated',
                    'checkingAccount.balance.updated',
                ],
            }),
        });

        if (!createRes.ok) {
            const errBody = await createRes.text();
            console.error('Mercury webhook creation failed:', errBody);
            return NextResponse.json({
                error: 'Failed to register webhook with Mercury',
                details: errBody,
            }, { status: 502 });
        }

        const webhook = await createRes.json();

        return NextResponse.json({
            data: {
                webhook: {
                    id: webhook.id,
                    url: webhook.url,
                    status: webhook.status,
                },
                secret: webhook.secret,
                alreadyExists: false,
                instructions: `Webhook registered successfully. Copy the secret below and add it as MERCURY_WEBHOOK_SECRET in your Vercel environment variables. Secret: ${webhook.secret}`,
            },
        });
    } catch (error) {
        console.error('Mercury webhook setup error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
