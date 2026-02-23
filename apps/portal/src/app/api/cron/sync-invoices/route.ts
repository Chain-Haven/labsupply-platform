/**
 * GET /api/cron/sync-invoices
 *
 * Polls Mercury API for all open invoices and syncs their status.
 * When an invoice is "Paid" (settled), credits the merchant's wallet.
 *
 * Called by:
 *  - Vercel Cron (every 5 minutes)
 *  - Mercury webhook handler (on transaction events)
 *  - Manual trigger from admin panel or wallet page refresh
 *
 * Protected by CRON_SECRET to prevent unauthorized calls.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const MERCURY_API_BASE = 'https://api.mercury.com/api/v1';

function getServiceClient() {
    return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
}

function getMercuryToken(): string {
    return process.env.MERCURY_API_TOKEN || '';
}

async function getMercuryInvoiceStatus(invoiceId: string): Promise<{ status: string } | null> {
    try {
        const res = await fetch(`${MERCURY_API_BASE}/ar/invoices/${invoiceId}`, {
            headers: {
                'Authorization': `Bearer ${getMercuryToken()}`,
                'Accept': 'application/json',
            },
            signal: AbortSignal.timeout(15000),
        });
        if (!res.ok) {
            console.error(`Mercury API error for invoice ${invoiceId}: ${res.status}`);
            return null;
        }
        return res.json();
    } catch (err) {
        console.error(`Mercury API request failed for invoice ${invoiceId}:`, err);
        return null;
    }
}

async function creditWallet(
    supabase: ReturnType<typeof getServiceClient>,
    merchantId: string,
    amountCents: number,
    invoiceId: string,
    mercuryInvoiceId: string
): Promise<{ success: boolean; transactionId?: string }> {
    const { data: claimed, error: claimError } = await supabase
        .from('mercury_invoices')
        .update({ wallet_credited: true })
        .eq('id', invoiceId)
        .eq('wallet_credited', false)
        .select('id')
        .single();

    if (claimError || !claimed) {
        return { success: false };
    }

    const { data: wallet, error: walletError } = await supabase
        .from('wallet_accounts')
        .select('id, balance_cents')
        .eq('merchant_id', merchantId)
        .eq('currency', 'USD')
        .single();

    if (walletError || !wallet) {
        console.error(`CRITICAL: Wallet not found for merchant ${merchantId}`);
        await supabase.from('mercury_invoices').update({ wallet_credited: false }).eq('id', invoiceId);
        return { success: false };
    }

    const newBalance = wallet.balance_cents + amountCents;

    const { error: updateError } = await supabase
        .from('wallet_accounts')
        .update({ balance_cents: newBalance })
        .eq('id', wallet.id)
        .eq('balance_cents', wallet.balance_cents);

    if (updateError) {
        console.error(`CRITICAL: Failed to credit wallet for merchant ${merchantId}:`, updateError);
        await supabase.from('mercury_invoices').update({ wallet_credited: false }).eq('id', invoiceId);
        return { success: false };
    }

    const { data: txn } = await supabase
        .from('wallet_transactions')
        .insert({
            merchant_id: merchantId,
            wallet_id: wallet.id,
            type: 'TOPUP',
            amount_cents: amountCents,
            balance_after_cents: newBalance,
            reference_type: 'mercury_invoice',
            reference_id: invoiceId,
            description: `Mercury invoice payment (${mercuryInvoiceId})`,
            metadata: { mercury_invoice_id: mercuryInvoiceId, source: 'mercury_invoicing' },
        })
        .select('id')
        .single();

    if (txn?.id) {
        await supabase.from('mercury_invoices').update({ wallet_transaction_id: txn.id }).eq('id', invoiceId);
    }

    await supabase.from('notifications').insert({
        merchant_id: merchantId,
        type: 'INVOICE_PAID',
        title: 'Payment Received',
        message: `$${(amountCents / 100).toFixed(2)} has been credited to your wallet from invoice payment.`,
        data: { mercury_invoice_id: mercuryInvoiceId, amount_cents: amountCents, transaction_id: txn?.id },
    });

    return { success: true, transactionId: txn?.id };
}

export async function GET(request: NextRequest) {
    // Verify authorization: either Vercel Cron secret or admin session
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    // Allow Vercel Cron (sends Bearer <CRON_SECRET>)
    const isCron = cronSecret && authHeader === `Bearer ${cronSecret}`;
    // Allow internal calls with a simple shared key
    const isInternal = request.nextUrl.searchParams.get('key') === cronSecret;

    if (!isCron && !isInternal && cronSecret) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = getServiceClient();

    if (!getMercuryToken()) {
        return NextResponse.json({ error: 'Mercury API not configured' }, { status: 503 });
    }

    const { data: openInvoices, error } = await supabase
        .from('mercury_invoices')
        .select('id, merchant_id, mercury_invoice_id, mercury_invoice_number, amount_cents, status')
        .in('status', ['Unpaid', 'Processing'])
        .eq('wallet_credited', false)
        .order('created_at', { ascending: true });

    if (error || !openInvoices) {
        console.error('Error fetching open invoices:', error);
        return NextResponse.json({ error: 'Failed to fetch invoices' }, { status: 500 });
    }

    if (openInvoices.length === 0) {
        return NextResponse.json({ message: 'No open invoices to sync', synced: 0 });
    }

    const results = {
        checked: openInvoices.length,
        credited: 0,
        updated: 0,
        errors: 0,
    };

    for (const invoice of openInvoices) {
        try {
            const mercuryData = await getMercuryInvoiceStatus(invoice.mercury_invoice_id);
            if (!mercuryData) {
                results.errors++;
                continue;
            }

            const newStatus = mercuryData.status;
            if (newStatus === invoice.status) continue;

            if (newStatus === 'Paid') {
                await supabase.from('mercury_invoices').update({ status: 'Paid' }).eq('id', invoice.id);
                const credit = await creditWallet(supabase, invoice.merchant_id, invoice.amount_cents, invoice.id, invoice.mercury_invoice_id);
                if (credit.success) results.credited++;
                results.updated++;

                // Auto-advance any testing orders linked to this invoice
                const { data: linkedTestingOrders } = await supabase
                    .from('testing_orders')
                    .select('id, status')
                    .eq('payment_invoice_id', invoice.id)
                    .eq('payment_status', 'invoice_sent');

                for (const to of linkedTestingOrders || []) {
                    await supabase.from('testing_orders')
                        .update({
                            payment_status: 'paid',
                            status: to.status === 'PENDING' ? 'AWAITING_SHIPMENT' : to.status,
                        })
                        .eq('id', to.id);
                }
            } else if (newStatus === 'Processing') {
                await supabase.from('mercury_invoices').update({ status: 'Processing' }).eq('id', invoice.id);
                results.updated++;
            } else if (newStatus === 'Cancelled') {
                await supabase.from('mercury_invoices').update({ status: 'Cancelled' }).eq('id', invoice.id);
                results.updated++;
            }
        } catch (err) {
            console.error(`Error syncing invoice ${invoice.mercury_invoice_number}:`, err);
            results.errors++;
        }
    }

    if (results.credited > 0 || results.updated > 0) {
        await supabase.from('audit_events').insert({
            action: 'mercury.sync_invoices',
            entity_type: 'system',
            entity_id: 'cron-sync-invoices',
            metadata: results,
        });
    }

    return NextResponse.json(results);
}
