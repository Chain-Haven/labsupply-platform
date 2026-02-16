/**
 * Admin Mercury Invoice Routes
 * GET  - List all invoices + merchant billing info
 * POST - Create manual invoice or cancel invoice
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

function getServiceClient() {
    return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
}

/**
 * GET /api/v1/admin/mercury/invoices
 * Returns all invoices and merchant billing overview
 */
export async function GET() {
    try {
        const supabase = getServiceClient();

        // Get all invoices with merchant info
        const { data: invoices, error: invoicesError } = await supabase
            .from('mercury_invoices')
            .select(`
                id,
                merchant_id,
                mercury_invoice_id,
                mercury_slug,
                amount_cents,
                status,
                due_date,
                wallet_credited,
                created_at,
                merchants!inner(
                    name,
                    billing_email
                )
            `)
            .order('created_at', { ascending: false })
            .limit(100);

        if (invoicesError) {
            console.error('Error fetching invoices:', invoicesError);
        }

        const formattedInvoices = (invoices || []).map((inv: Record<string, unknown>) => {
            const merchant = inv.merchants as Record<string, unknown>;
            return {
                id: inv.id,
                merchant_id: inv.merchant_id,
                merchant_name: merchant?.name || 'Unknown',
                merchant_email: merchant?.billing_email || '',
                mercury_invoice_id: inv.mercury_invoice_id,
                mercury_slug: inv.mercury_slug,
                amount_cents: inv.amount_cents,
                status: inv.status,
                due_date: inv.due_date,
                wallet_credited: inv.wallet_credited,
                created_at: inv.created_at,
            };
        });

        // Get merchant billing overview
        const { data: merchants, error: merchantsError } = await supabase
            .from('merchants')
            .select(`
                id,
                name,
                billing_email,
                low_balance_threshold_cents,
                target_balance_cents,
                mercury_customer_id,
                wallet_accounts(
                    balance_cents,
                    reserved_cents
                )
            `)
            .eq('status', 'ACTIVE')
            .not('mercury_customer_id', 'is', null);

        if (merchantsError) {
            console.error('Error fetching merchants:', merchantsError);
        }

        // Count pending invoices per merchant
        const { data: pendingCounts } = await supabase
            .from('mercury_invoices')
            .select('merchant_id')
            .in('status', ['Unpaid', 'Processing']);

        const pendingCountMap = new Map<string, number>();
        (pendingCounts || []).forEach((row: { merchant_id: string }) => {
            pendingCountMap.set(row.merchant_id, (pendingCountMap.get(row.merchant_id) || 0) + 1);
        });

        const formattedMerchants = (merchants || []).map((m: Record<string, unknown>) => {
            const wallet = Array.isArray(m.wallet_accounts)
                ? m.wallet_accounts[0] as Record<string, unknown> | undefined
                : m.wallet_accounts as Record<string, unknown> | undefined;

            return {
                id: m.id,
                name: m.name,
                billing_email: m.billing_email || '',
                low_balance_threshold_cents: m.low_balance_threshold_cents || 100000,
                target_balance_cents: m.target_balance_cents || 300000,
                balance_cents: (wallet?.balance_cents as number) || 0,
                reserved_cents: (wallet?.reserved_cents as number) || 0,
                pending_invoice_count: pendingCountMap.get(m.id as string) || 0,
            };
        });

        return NextResponse.json({
            data: {
                invoices: formattedInvoices,
                merchants: formattedMerchants,
            },
        });
    } catch (error) {
        console.error('Admin invoices fetch error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

/**
 * POST /api/v1/admin/mercury/invoices
 * Create a manual invoice for a merchant, or cancel an existing invoice
 */
export async function POST(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const action = searchParams.get('action');

        const token = process.env.MERCURY_API_TOKEN;
        const accountId = process.env.MERCURY_ACCOUNT_ID;

        if (!token || !accountId) {
            return NextResponse.json({ error: 'Mercury API not configured' }, { status: 503 });
        }

        const supabase = getServiceClient();

        if (action === 'cancel') {
            // Cancel an invoice
            const invoiceId = searchParams.get('id');
            if (!invoiceId) {
                return NextResponse.json({ error: 'Invoice ID required' }, { status: 400 });
            }

            const { data: invoice } = await supabase
                .from('mercury_invoices')
                .select('mercury_invoice_id, status')
                .eq('id', invoiceId)
                .single();

            if (!invoice || invoice.status !== 'Unpaid') {
                return NextResponse.json({ error: 'Invoice not found or not cancellable' }, { status: 400 });
            }

            // Cancel via Mercury API
            const cancelRes = await fetch(
                `https://api.mercury.com/api/v1/ar/invoices/${invoice.mercury_invoice_id}/cancel`,
                {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${token}` },
                }
            );

            if (!cancelRes.ok) {
                return NextResponse.json({ error: 'Failed to cancel invoice in Mercury' }, { status: 502 });
            }

            await supabase
                .from('mercury_invoices')
                .update({ status: 'Cancelled' })
                .eq('id', invoiceId);

            return NextResponse.json({ success: true });
        }

        // Create manual invoice
        const body = await request.json();
        const { merchant_id, amount_cents } = body;

        if (!merchant_id) {
            return NextResponse.json({ error: 'Merchant ID required' }, { status: 400 });
        }

        // Get merchant info
        const { data: merchant } = await supabase
            .from('merchants')
            .select('id, name, mercury_customer_id, billing_email, target_balance_cents, wallet_accounts(balance_cents, reserved_cents)')
            .eq('id', merchant_id)
            .single();

        if (!merchant || !merchant.mercury_customer_id) {
            return NextResponse.json({ error: 'Merchant not found or Mercury not configured' }, { status: 400 });
        }

        // Calculate amount if not provided
        const wallet = Array.isArray(merchant.wallet_accounts)
            ? merchant.wallet_accounts[0]
            : merchant.wallet_accounts;
        const currentBalance = (wallet?.balance_cents || 0) - (wallet?.reserved_cents || 0);
        const invoiceAmount = amount_cents || Math.max(10000, merchant.target_balance_cents - currentBalance);

        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + 7);
        const dueDateStr = dueDate.toISOString().split('T')[0];
        const invoiceDateStr = new Date().toISOString().split('T')[0];

        // Create in Mercury
        const mercuryRes = await fetch('https://api.mercury.com/api/v1/ar/invoices', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                customerId: merchant.mercury_customer_id,
                dueDate: dueDateStr,
                invoiceDate: invoiceDateStr,
                lineItems: [
                    {
                        name: `Wallet Funding - ${merchant.name}`,
                        unitPrice: (invoiceAmount / 100).toFixed(2),
                        quantity: 1,
                    },
                ],
                ccEmails: [],
                sendEmailOption: 'SendNow',
                creditCardEnabled: false,
                achDebitEnabled: true,
                useRealAccountNumber: false,
                destinationAccountId: accountId,
            }),
        });

        if (!mercuryRes.ok) {
            const errorBody = await mercuryRes.text();
            console.error('Mercury create invoice error:', errorBody);
            return NextResponse.json({ error: 'Failed to create invoice in Mercury' }, { status: 502 });
        }

        const mercuryInvoice = await mercuryRes.json();

        // Record in database
        await supabase.from('mercury_invoices').insert({
            merchant_id,
            mercury_invoice_id: mercuryInvoice.id,
            mercury_invoice_number: mercuryInvoice.invoiceNumber,
            mercury_slug: mercuryInvoice.slug,
            amount_cents: invoiceAmount,
            status: 'Unpaid',
            due_date: dueDateStr,
        });

        return NextResponse.json({ success: true, invoice: mercuryInvoice });
    } catch (error) {
        console.error('Admin invoice action error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
