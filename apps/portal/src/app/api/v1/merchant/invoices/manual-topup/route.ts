/**
 * POST /api/v1/merchant/invoices/manual-topup
 *
 * Creates a Mercury invoice for the requested dollar amount and returns
 * the invoice details including the payment slug. The existing
 * mercury-sync-invoices cron automatically credits the wallet once paid.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createRouteHandlerClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

const MIN_AMOUNT_CENTS = 5000;   // $50 minimum
const MAX_AMOUNT_CENTS = 5000000; // $50,000 maximum

const MERCURY_API_BASE = process.env.MERCURY_API_BASE_URL || 'https://api.mercury.com/api/v1';
const MERCURY_API_TOKEN = process.env.MERCURY_API_TOKEN || '';
const MERCURY_ACCOUNT_ID = process.env.MERCURY_ACCOUNT_ID || '';

function getServiceClient() {
    return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
}

function formatMercuryDate(date: Date): string {
    return date.toISOString().split('T')[0];
}

function centsToDollarString(cents: number): string {
    return (cents / 100).toFixed(2);
}

export async function POST(request: NextRequest) {
    try {
        // Authenticate the merchant
        const supabaseAuth = createRouteHandlerClient();
        const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
        }

        const supabase = getServiceClient();

        const { data: merchant, error: merchantError } = await supabase
            .from('merchants')
            .select('id, company_name, mercury_customer_id, billing_email, email')
            .eq('user_id', user.id)
            .single();

        if (merchantError || !merchant) {
            return NextResponse.json({ error: 'Merchant profile not found' }, { status: 404 });
        }

        if (!MERCURY_API_TOKEN) {
            return NextResponse.json(
                { error: 'Mercury API is not configured. Please contact support.' },
                { status: 503 }
            );
        }

        if (!merchant.mercury_customer_id) {
            return NextResponse.json(
                { error: 'Mercury billing is not configured for your account. Please contact support.' },
                { status: 400 }
            );
        }

        // Parse and validate amount
        const body = await request.json();
        const amountCents = Math.round(Number(body.amount_cents));

        if (!amountCents || isNaN(amountCents)) {
            return NextResponse.json({ error: 'amount_cents is required' }, { status: 400 });
        }

        if (amountCents < MIN_AMOUNT_CENTS) {
            return NextResponse.json(
                { error: `Minimum top-up amount is $${(MIN_AMOUNT_CENTS / 100).toFixed(2)}` },
                { status: 400 }
            );
        }

        if (amountCents > MAX_AMOUNT_CENTS) {
            return NextResponse.json(
                { error: `Maximum top-up amount is $${(MAX_AMOUNT_CENTS / 100).toFixed(2)}` },
                { status: 400 }
            );
        }

        // Rate limit: max 3 unpaid invoices at a time
        const { count: openCount } = await supabase
            .from('mercury_invoices')
            .select('id', { count: 'exact', head: true })
            .eq('merchant_id', merchant.id)
            .in('status', ['Unpaid', 'Processing']);

        if ((openCount || 0) >= 3) {
            return NextResponse.json(
                { error: 'You already have 3 open invoices. Please pay existing invoices before requesting more.' },
                { status: 429 }
            );
        }

        // Use explicitly configured Mercury account — no auto-discovery fallback
        const accountId = MERCURY_ACCOUNT_ID;
        if (!accountId) {
            return NextResponse.json(
                { error: 'Mercury deposit account not configured. An admin must set MERCURY_ACCOUNT_ID.' },
                { status: 503 }
            );
        }

        // Create Mercury invoice
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
            destinationAccountId: accountId,
        };

        const mercuryRes = await fetch(`${MERCURY_API_BASE}/ar/invoices`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${MERCURY_API_TOKEN}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(mercuryPayload),
        });

        if (!mercuryRes.ok) {
            const errBody = await mercuryRes.text();
            console.error('Mercury invoice creation failed:', mercuryRes.status, errBody);
            let detail = '';
            try {
                const parsed = JSON.parse(errBody);
                detail = parsed.errors?.message || parsed.message || parsed.error || '';
            } catch { /* non-JSON response */ }
            return NextResponse.json(
                { error: `Failed to create invoice in Mercury${detail ? ': ' + detail : '. The payment provider may be temporarily unavailable — please try again later or contact support.'}` },
                { status: 502 }
            );
        }

        const mercuryInvoice = await mercuryRes.json();

        // Record in our database
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
            console.error('Error recording invoice:', insertError);
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
        console.error('Manual topup error:', error);
        return NextResponse.json({ error: 'Invoice creation failed due to an unexpected error. No charges were applied — please try again.' }, { status: 500 });
    }
}
