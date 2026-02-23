/**
 * POST /api/v1/merchant/invoices/manual-topup
 *
 * Creates a Mercury invoice for the requested dollar amount and returns
 * the invoice details including the payment slug. The existing
 * mercury-sync-invoices cron automatically credits the wallet once paid.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireMerchant, getServiceClient } from '@/lib/merchant-api-auth';

export const dynamic = 'force-dynamic';

const MIN_AMOUNT_CENTS = 5000;   // $50 minimum
const MAX_AMOUNT_CENTS = 5000000; // $50,000 maximum

const MERCURY_API_BASE = process.env.MERCURY_API_BASE_URL || 'https://api.mercury.com/api/v1';
const MERCURY_API_TOKEN = process.env.MERCURY_API_TOKEN || '';
const MERCURY_ACCOUNT_ID = process.env.MERCURY_ACCOUNT_ID || '';

function formatMercuryDate(date: Date): string {
    return date.toISOString().split('T')[0];
}

function centsToDollarString(cents: number): string {
    return (cents / 100).toFixed(2);
}

function extractMercuryError(body: string, status: number): string {
    try {
        const parsed = JSON.parse(body);

        if (parsed.errors) {
            if (typeof parsed.errors === 'string') return parsed.errors;
            if (parsed.errors.message) return parsed.errors.message;
            if (parsed.errors.errorCode) return `${parsed.errors.errorCode}: ${parsed.errors.message || parsed.errors.ip || ''}`;

            const allErrors: string[] = [];
            for (const [key, val] of Object.entries(parsed.errors)) {
                if (Array.isArray(val)) allErrors.push(`${key}: ${val.join('; ')}`);
                else if (typeof val === 'object' && val !== null) allErrors.push(`${key}: ${(val as Record<string, unknown>).message || JSON.stringify(val)}`);
                else allErrors.push(`${key}: ${val}`);
            }
            if (allErrors.length > 0) return allErrors.join(' | ');
        }

        if (parsed.debugInfo) {
            const debug = typeof parsed.debugInfo === 'string' ? parsed.debugInfo : JSON.stringify(parsed.debugInfo);
            return debug;
        }

        if (parsed.message) return parsed.message;
        if (parsed.error) return parsed.error;
    } catch {
        if (body.length > 0 && body.length < 500) return body;
    }

    return `Mercury API returned HTTP ${status}`;
}

export async function POST(request: NextRequest) {
    try {
        const authResult = await requireMerchant();
        if (authResult instanceof NextResponse) return authResult;
        const { merchant } = authResult.data;

        const supabase = getServiceClient();

        if (!MERCURY_API_TOKEN) {
            return NextResponse.json(
                { error: 'Mercury API is not configured on this platform. Please contact support. [ERR:NO_TOKEN]' },
                { status: 503 }
            );
        }

        if (!MERCURY_ACCOUNT_ID) {
            return NextResponse.json(
                { error: 'Mercury deposit account is not configured. Please contact support. [ERR:NO_ACCOUNT]' },
                { status: 503 }
            );
        }

        if (!merchant.mercury_customer_id) {
            return NextResponse.json(
                { error: 'Your Mercury billing profile has not been set up yet. Please contact support to enable invoicing. [ERR:NO_CUSTOMER]' },
                { status: 400 }
            );
        }

        const body = await request.json();
        const amountCents = Math.round(Number(body.amount_cents));

        if (!amountCents || isNaN(amountCents)) {
            return NextResponse.json({ error: 'Please enter a valid dollar amount.' }, { status: 400 });
        }

        if (amountCents < MIN_AMOUNT_CENTS) {
            return NextResponse.json(
                { error: `Minimum top-up amount is $${(MIN_AMOUNT_CENTS / 100).toFixed(2)}.` },
                { status: 400 }
            );
        }

        if (amountCents > MAX_AMOUNT_CENTS) {
            return NextResponse.json(
                { error: `Maximum top-up amount is $${(MAX_AMOUNT_CENTS / 100).toFixed(2)}.` },
                { status: 400 }
            );
        }

        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + 7);
        const merchantName = merchant.company_name || merchant.email;

        const mercuryPayload = {
            customerId: merchant.mercury_customer_id,
            dueDate: formatMercuryDate(dueDate),
            invoiceDate: formatMercuryDate(new Date()),
            lineItems: [
                {
                    name: `Manual Wallet Top-Up - ${merchantName}`,
                    unitPrice: centsToDollarString(amountCents),
                    quantity: 1,
                },
            ],
            ccEmails: [],
            payerMemo: `Manual wallet top-up of $${centsToDollarString(amountCents)} for ${merchantName}. Pay via ACH to fund your WhiteLabel Peptides account.`,
            poNumber: null,
            invoiceNumber: null,
            sendEmailOption: 'SendNow',
            creditCardEnabled: false,
            achDebitEnabled: true,
            useRealAccountNumber: false,
            destinationAccountId: MERCURY_ACCOUNT_ID,
        };

        console.log('[Mercury] Creating invoice for merchant', merchant.id, 'customer', merchant.mercury_customer_id, 'amount', amountCents, 'dest', MERCURY_ACCOUNT_ID);

        const mercuryRes = await fetch(`${MERCURY_API_BASE}/ar/invoices`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${MERCURY_API_TOKEN}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(mercuryPayload),
            signal: AbortSignal.timeout(15000),
        });

        if (!mercuryRes.ok) {
            const errBody = await mercuryRes.text();
            console.error('[Mercury] Invoice creation failed:', mercuryRes.status, errBody);
            const detail = extractMercuryError(errBody, mercuryRes.status);
            return NextResponse.json(
                { error: `Mercury invoice failed (HTTP ${mercuryRes.status}): ${detail}` },
                { status: 502 }
            );
        }

        const mercuryInvoice = await mercuryRes.json();
        console.log('[Mercury] Invoice created:', mercuryInvoice.id, 'slug:', mercuryInvoice.slug);

        const { data: invoiceRow, error: insertError } = await supabase
            .from('mercury_invoices')
            .insert({
                merchant_id: merchant.id,
                mercury_invoice_id: mercuryInvoice.id,
                mercury_invoice_number: mercuryInvoice.invoiceNumber,
                mercury_slug: mercuryInvoice.slug,
                amount_cents: amountCents,
                status: 'Unpaid',
                due_date: formatMercuryDate(dueDate),
            })
            .select()
            .single();

        if (insertError) {
            console.error('[Mercury] Error recording invoice in DB:', insertError);
        }

        return NextResponse.json({
            success: true,
            invoice: {
                id: invoiceRow?.id || mercuryInvoice.id,
                amount_cents: amountCents,
                status: 'Unpaid',
                due_date: formatMercuryDate(dueDate),
                mercury_slug: mercuryInvoice.slug,
                pay_url: mercuryInvoice.slug ? `https://app.mercury.com/pay/${mercuryInvoice.slug}` : null,
            },
        });
    } catch (error) {
        console.error('[Mercury] Manual topup unexpected error:', error);
        const msg = error instanceof Error ? error.message : 'Unknown error';
        return NextResponse.json(
            { error: `Invoice creation failed: ${msg}. No charges were applied.` },
            { status: 500 }
        );
    }
}
