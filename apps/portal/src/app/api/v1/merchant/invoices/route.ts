/**
 * GET /api/v1/merchant/invoices
 * List Mercury invoices for the authenticated merchant.
 * Also performs a quick inline sync for this merchant's open invoices
 * against Mercury API so statuses are always fresh.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireMerchant, getServiceClient } from '@/lib/merchant-api-auth';
import { adjustWalletBalance } from '@/lib/wallet-ops';

export const dynamic = 'force-dynamic';

const MERCURY_API_BASE = 'https://api.mercury.com/api/v1';

async function quickSyncMerchantInvoices(supabase: ReturnType<typeof getServiceClient>, merchantId: string) {
    const mercuryToken = process.env.MERCURY_API_TOKEN;
    if (!mercuryToken) return;

    const { data: openInvoices } = await supabase
        .from('mercury_invoices')
        .select('id, mercury_invoice_id, amount_cents, status')
        .eq('merchant_id', merchantId)
        .in('status', ['Unpaid', 'Processing'])
        .eq('wallet_credited', false);

    if (!openInvoices || openInvoices.length === 0) return;

    for (const inv of openInvoices) {
        try {
            const res = await fetch(`${MERCURY_API_BASE}/ar/invoices/${inv.mercury_invoice_id}`, {
                headers: { 'Authorization': `Bearer ${mercuryToken}`, 'Accept': 'application/json' },
                signal: AbortSignal.timeout(8000),
            });
            if (!res.ok) continue;

            const mercury = await res.json();
            if (mercury.status === inv.status) continue;

            if (mercury.status === 'Paid') {
                // Claim + credit wallet atomically
                const { data: claimed } = await supabase
                    .from('mercury_invoices')
                    .update({ status: 'Paid', wallet_credited: true })
                    .eq('id', inv.id)
                    .eq('wallet_credited', false)
                    .select('id')
                    .single();

                if (claimed) {
                    const { data: wallet } = await supabase
                        .from('wallet_accounts')
                        .select('id')
                        .eq('merchant_id', merchantId)
                        .eq('currency', 'USD')
                        .single();

                    if (wallet) {
                        try {
                            const result = await adjustWalletBalance(supabase, {
                                walletId: wallet.id,
                                merchantId,
                                amountCents: inv.amount_cents,
                                type: 'TOPUP',
                                referenceType: 'mercury_invoice',
                                referenceId: inv.id,
                                description: `Mercury invoice payment (${inv.mercury_invoice_id})`,
                                metadata: { mercury_invoice_id: inv.mercury_invoice_id, source: 'mercury_invoicing' },
                                idempotencyKey: `invoice-credit-${inv.id}`,
                            });

                            await supabase.from('mercury_invoices').update({ wallet_transaction_id: result.transactionId }).eq('id', inv.id);

                            await supabase.from('notifications').insert({
                                merchant_id: merchantId,
                                type: 'INVOICE_PAID',
                                title: 'Payment Received',
                                message: `$${(inv.amount_cents / 100).toFixed(2)} has been credited to your wallet.`,
                                data: { mercury_invoice_id: inv.mercury_invoice_id, amount_cents: inv.amount_cents, transaction_id: result.transactionId },
                            });

                            // Auto-advance testing orders linked to this invoice
                            const { data: linkedTOs } = await supabase
                                .from('testing_orders')
                                .select('id, status')
                                .eq('payment_invoice_id', inv.id)
                                .eq('payment_status', 'invoice_sent');
                            for (const to of linkedTOs || []) {
                                await supabase.from('testing_orders')
                                    .update({
                                        payment_status: 'paid',
                                        status: to.status === 'PENDING' ? 'AWAITING_SHIPMENT' : to.status,
                                    })
                                    .eq('id', to.id);
                            }
                        } catch {
                            await supabase.from('mercury_invoices').update({ wallet_credited: false, status: 'Paid' }).eq('id', inv.id);
                        }
                    } else {
                        await supabase.from('mercury_invoices').update({ wallet_credited: false }).eq('id', inv.id);
                    }
                }
            } else if (mercury.status === 'Processing') {
                await supabase.from('mercury_invoices').update({ status: 'Processing' }).eq('id', inv.id);
            } else if (mercury.status === 'Cancelled') {
                await supabase.from('mercury_invoices').update({ status: 'Cancelled' }).eq('id', inv.id);
            }
        } catch {
            // Best-effort sync, don't block the response
        }
    }
}

export async function GET(request: NextRequest) {
    try {
        const authResult = await requireMerchant();
        if (authResult instanceof NextResponse) return authResult;
        const { merchant } = authResult.data;

        const supabase = getServiceClient();

        // Quick sync this merchant's invoices with Mercury before returning
        await quickSyncMerchantInvoices(supabase, merchant.id);

        const { searchParams } = new URL(request.url);
        const status = searchParams.get('status');
        const page = parseInt(searchParams.get('page') || '1', 10);
        const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 100);
        const offset = (page - 1) * limit;

        let query = supabase
            .from('mercury_invoices')
            .select('*', { count: 'exact' })
            .eq('merchant_id', merchant.id)
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1);

        if (status) {
            query = query.eq('status', status);
        }

        const { data: invoices, count, error } = await query;

        if (error) {
            console.error('Error fetching invoices:', error);
            return NextResponse.json({ error: 'Failed to load invoices from the database. Please refresh and try again.' }, { status: 500 });
        }

        return NextResponse.json({
            data: invoices || [],
            pagination: {
                page,
                limit,
                total: count || 0,
                has_more: (count || 0) > offset + limit,
            },
        });
    } catch (error) {
        console.error('Invoice list error:', error);
        return NextResponse.json({ error: 'Failed to load invoices due to an unexpected error. Please try again.' }, { status: 500 });
    }
}
