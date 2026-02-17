/**
 * Mercury Sync Invoices Cron
 * Runs every 5 minutes to poll Mercury for invoice status changes.
 * When an invoice becomes "Paid" (settled), credits the merchant's wallet.
 * Only settled money is used - "Processing" invoices do NOT credit the wallet.
 */

import { inngest } from '@/lib/inngest';
import { getServiceClient } from '@/lib/supabase';
import { getInvoice as getMercuryInvoice } from '@/lib/mercury';
import { OrderStatus } from '@whitelabel-peptides/shared';

export const mercurySyncInvoicesFunction = inngest.createFunction(
    {
        id: 'mercury-sync-invoices',
        name: 'Mercury: Sync Invoice Statuses',
        retries: 2,
        concurrency: [{ limit: 1 }],
    },
    { cron: '*/5 * * * *' },
    async ({ step }) => {
        const supabase = getServiceClient();

        // Step 1: Get all open (non-settled) invoices
        const openInvoices = await step.run('get-open-invoices', async () => {
            const { data, error } = await supabase
                .from('mercury_invoices')
                .select('id, merchant_id, mercury_invoice_id, amount_cents, status')
                .in('status', ['Unpaid', 'Processing'])
                .eq('wallet_credited', false)
                .order('created_at', { ascending: true });

            if (error) {
                console.error('Error fetching open invoices:', error);
                return [];
            }

            return data || [];
        });

        if (openInvoices.length === 0) {
            return { message: 'No open invoices to sync', synced: 0 };
        }

        // Step 2: Check each invoice with Mercury API
        const results = await step.run('sync-invoice-statuses', async () => {
            const credited: Array<{ invoiceId: string; merchantId: string; amount: number }> = [];
            const statusUpdates: Array<{ invoiceId: string; oldStatus: string; newStatus: string }> = [];
            const errors: Array<{ invoiceId: string; error: string }> = [];

            for (const invoice of openInvoices) {
                try {
                    const mercuryInvoice = await getMercuryInvoice(invoice.mercury_invoice_id);
                    const newStatus = mercuryInvoice.status;

                    if (newStatus === invoice.status) {
                        continue;
                    }

                    statusUpdates.push({
                        invoiceId: invoice.id,
                        oldStatus: invoice.status,
                        newStatus,
                    });

                    if (newStatus === 'Paid') {
                        // SETTLED: Credit the merchant's wallet
                        const creditResult = await creditWallet(
                            supabase,
                            invoice.merchant_id,
                            invoice.amount_cents,
                            invoice.id,
                            invoice.mercury_invoice_id
                        );

                        if (creditResult.success) {
                            // Update invoice status (wallet_credited and transaction_id already set by creditWallet)
                            await supabase
                                .from('mercury_invoices')
                                .update({ status: 'Paid' })
                                .eq('id', invoice.id);

                            credited.push({
                                invoiceId: invoice.id,
                                merchantId: invoice.merchant_id,
                                amount: invoice.amount_cents,
                            });

                            // Notify merchant
                            await supabase.from('notifications').insert({
                                merchant_id: invoice.merchant_id,
                                type: 'INVOICE_PAID',
                                title: 'Payment Received',
                                message: `$${(invoice.amount_cents / 100).toFixed(2)} has been credited to your wallet from invoice payment.`,
                                data: {
                                    mercury_invoice_id: invoice.mercury_invoice_id,
                                    amount_cents: invoice.amount_cents,
                                    transaction_id: creditResult.transactionId,
                                },
                            });
                        }
                    } else if (newStatus === 'Processing') {
                        // Payment initiated but NOT settled - update status only
                        await supabase
                            .from('mercury_invoices')
                            .update({ status: 'Processing' })
                            .eq('id', invoice.id);
                    } else if (newStatus === 'Cancelled') {
                        await supabase
                            .from('mercury_invoices')
                            .update({ status: 'Cancelled' })
                            .eq('id', invoice.id);
                    }
                } catch (err) {
                    console.error(`Error syncing invoice ${invoice.id}:`, err);
                    errors.push({
                        invoiceId: invoice.id,
                        error: (err as Error).message,
                    });
                }
            }

            return { credited, statusUpdates, errors };
        });

        // Step 3: Re-attempt funding for AWAITING_FUNDS orders for merchants who got credits
        if (results.credited.length > 0) {
            await step.run('resume-awaiting-orders', async () => {
                const merchantIds = [...new Set(results.credited.map(c => c.merchantId))];

                for (const merchantId of merchantIds) {
                    const { data: awaitingOrders } = await supabase
                        .from('orders')
                        .select('id, store_id, woo_order_id, total_estimate_cents')
                        .eq('merchant_id', merchantId)
                        .eq('status', OrderStatus.AWAITING_FUNDS)
                        .order('created_at', { ascending: true });

                    if (!awaitingOrders || awaitingOrders.length === 0) continue;

                    for (const order of awaitingOrders) {
                        await inngest.send({
                            name: 'order/received',
                            data: {
                                orderId: order.id,
                                storeId: order.store_id,
                                merchantId,
                                wooOrderId: order.woo_order_id || '',
                                totalEstimateCents: order.total_estimate_cents,
                            },
                        });
                    }
                }
            });
        }

        // Log audit
        await step.run('log-audit', async () => {
            if (results.credited.length > 0 || results.statusUpdates.length > 0) {
                await supabase.from('audit_events').insert({
                    action: 'mercury.sync_invoices_batch',
                    entity_type: 'system',
                    entity_id: 'mercury-sync-invoices',
                    metadata: {
                        invoices_checked: openInvoices.length,
                        invoices_credited: results.credited.length,
                        status_updates: results.statusUpdates.length,
                        errors: results.errors.length,
                    },
                });
            }
        });

        return {
            invoicesChecked: openInvoices.length,
            credited: results.credited.length,
            statusUpdates: results.statusUpdates.length,
            errors: results.errors.length,
        };
    }
);

/**
 * Credit a merchant's wallet from a settled Mercury invoice payment.
 * This is the ONLY path to increase wallet balance - ensuring only settled money is used.
 *
 * Idempotency: Uses the mercury_invoices.wallet_credited flag with a conditional update
 * to prevent double-crediting. The flag is set atomically BEFORE the wallet update.
 */
async function creditWallet(
    supabase: ReturnType<typeof getServiceClient>,
    merchantId: string,
    amountCents: number,
    invoiceId: string,
    mercuryInvoiceId: string
): Promise<{ success: boolean; transactionId?: string }> {
    // Idempotency guard: atomically claim this invoice for crediting.
    // Only succeeds if wallet_credited is still false, preventing double-credit from concurrent runs.
    const { data: claimed, error: claimError } = await supabase
        .from('mercury_invoices')
        .update({ wallet_credited: true })
        .eq('id', invoiceId)
        .eq('wallet_credited', false)
        .select('id')
        .single();

    if (claimError || !claimed) {
        console.warn(`Invoice ${invoiceId} already credited or claim failed, skipping wallet credit`);
        return { success: false };
    }

    // Get USD wallet (Mercury invoicing is USD-only)
    const { data: wallet, error: walletError } = await supabase
        .from('wallet_accounts')
        .select('id, balance_cents')
        .eq('merchant_id', merchantId)
        .eq('currency', 'USD')
        .single();

    if (walletError || !wallet) {
        console.error(`CRITICAL: Wallet not found for merchant ${merchantId} after claiming invoice ${invoiceId}:`, walletError);
        // Rollback the claim so a future run can retry
        await supabase
            .from('mercury_invoices')
            .update({ wallet_credited: false })
            .eq('id', invoiceId);
        return { success: false };
    }

    const newBalance = wallet.balance_cents + amountCents;

    // Atomic balance update using current balance to prevent stale reads
    const { error: updateError } = await supabase
        .from('wallet_accounts')
        .update({ balance_cents: newBalance })
        .eq('id', wallet.id)
        .eq('balance_cents', wallet.balance_cents);

    if (updateError) {
        console.error(`CRITICAL: Failed to credit wallet for merchant ${merchantId}, invoice ${invoiceId}:`, updateError);
        // Rollback the claim
        await supabase
            .from('mercury_invoices')
            .update({ wallet_credited: false })
            .eq('id', invoiceId);
        return { success: false };
    }

    // Record transaction
    const { data: txn, error: txnError } = await supabase
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
            metadata: {
                mercury_invoice_id: mercuryInvoiceId,
                source: 'mercury_invoicing',
            },
        })
        .select('id')
        .single();

    if (txnError) {
        console.error(`Error recording wallet transaction for merchant ${merchantId}:`, txnError);
    }

    // Update invoice with transaction ID
    if (txn?.id) {
        await supabase
            .from('mercury_invoices')
            .update({ wallet_transaction_id: txn.id })
            .eq('id', invoiceId);
    }

    return { success: true, transactionId: txn?.id };
}
