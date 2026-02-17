/**
 * Mercury Check Balances Cron
 * Runs every 15 minutes to check merchant balances and auto-generate invoices
 * when a merchant's available balance drops below their configured threshold.
 */

import { inngest } from '@/lib/inngest';
import { getServiceClient } from '@/lib/supabase';
import {
    createInvoice,
    centsToDollarString,
    formatMercuryDate,
} from '@/lib/mercury';

const COMPLIANCE_RESERVE_CENTS = 50000; // $500.00
const MIN_INVOICE_AMOUNT_CENTS = 10000; // $100.00 minimum invoice

export const mercuryCheckBalancesFunction = inngest.createFunction(
    {
        id: 'mercury-check-balances',
        name: 'Mercury: Check Balances & Auto-Invoice',
        retries: 2,
        concurrency: [{ limit: 1 }],
    },
    { cron: '*/15 * * * *' },
    async ({ step }) => {
        const supabase = getServiceClient();

        // Step 1: Get all active merchants with Mercury billing configured
        const merchants = await step.run('get-active-merchants', async () => {
            const { data, error } = await supabase
                .from('merchants')
                .select(`
                    id,
                    name,
                    billing_email,
                    mercury_customer_id,
                    low_balance_threshold_cents,
                    target_balance_cents,
                    wallet_accounts!inner(
                        id,
                        balance_cents,
                        reserved_cents,
                        currency
                    )
                `)
                .eq('status', 'ACTIVE')
                .eq('wallet_accounts.currency', 'USD')
                .not('mercury_customer_id', 'is', null)
                .not('billing_email', 'is', null);

            if (error) {
                console.error('Error fetching merchants:', error);
                return [];
            }

            return data || [];
        });

        if (merchants.length === 0) {
            return { message: 'No active merchants with Mercury billing configured', invoicesCreated: 0 };
        }

        // Step 2: Check each merchant's balance and create invoices if needed
        const results = await step.run('check-balances-and-invoice', async () => {
            const invoiced: Array<{ merchantId: string; amount: number }> = [];
            const skipped: Array<{ merchantId: string; reason: string }> = [];

            for (const merchant of merchants) {
                const wallet = Array.isArray(merchant.wallet_accounts)
                    ? merchant.wallet_accounts[0]
                    : merchant.wallet_accounts;

                if (!wallet) {
                    skipped.push({ merchantId: merchant.id, reason: 'no_wallet' });
                    continue;
                }

                const available = wallet.balance_cents - wallet.reserved_cents - COMPLIANCE_RESERVE_CENTS;

                if (available >= merchant.low_balance_threshold_cents) {
                    continue;
                }

                // Check for existing open invoice
                const { data: openInvoices } = await supabase
                    .from('mercury_invoices')
                    .select('id')
                    .eq('merchant_id', merchant.id)
                    .in('status', ['Unpaid', 'Processing'])
                    .limit(1);

                if (openInvoices && openInvoices.length > 0) {
                    skipped.push({ merchantId: merchant.id, reason: 'open_invoice_exists' });
                    continue;
                }

                // Calculate invoice amount = target - current (excluding reserve)
                const currentBalance = wallet.balance_cents - wallet.reserved_cents;
                let invoiceAmountCents = merchant.target_balance_cents - currentBalance;

                if (invoiceAmountCents < MIN_INVOICE_AMOUNT_CENTS) {
                    invoiceAmountCents = MIN_INVOICE_AMOUNT_CENTS;
                }

                try {
                    const dueDate = new Date();
                    dueDate.setDate(dueDate.getDate() + 7);

                    const mercuryInvoice = await createInvoice({
                        customerId: merchant.mercury_customer_id!,
                        dueDate: formatMercuryDate(dueDate),
                        invoiceDate: formatMercuryDate(new Date()),
                        lineItems: [
                            {
                                name: `Wallet Funding - ${merchant.name}`,
                                unitPrice: centsToDollarString(invoiceAmountCents),
                                quantity: 1,
                            },
                        ],
                        sendEmailOption: 'SendNow',
                        payerMemo: `Wallet replenishment for ${merchant.name}. Pay via ACH to fund your WhiteLabel Peptides account.`,
                    });

                    // Record in our database
                    const { error: insertError } = await supabase
                        .from('mercury_invoices')
                        .insert({
                            merchant_id: merchant.id,
                            mercury_invoice_id: mercuryInvoice.id,
                            mercury_invoice_number: mercuryInvoice.invoiceNumber,
                            mercury_slug: mercuryInvoice.slug,
                            amount_cents: invoiceAmountCents,
                            status: 'Unpaid',
                            due_date: formatMercuryDate(dueDate),
                        });

                    if (insertError) {
                        console.error(`Error recording invoice for merchant ${merchant.id}:`, insertError);
                    }

                    // Create notification for merchant
                    await supabase.from('notifications').insert({
                        merchant_id: merchant.id,
                        type: 'INVOICE_SENT',
                        title: 'Invoice Sent',
                        message: `A $${(invoiceAmountCents / 100).toFixed(2)} invoice has been sent to ${merchant.billing_email}. Pay to fund your wallet.`,
                        data: {
                            mercury_invoice_id: mercuryInvoice.id,
                            amount_cents: invoiceAmountCents,
                            payment_url: `https://app.mercury.com/pay/${mercuryInvoice.slug}`,
                        },
                    });

                    invoiced.push({ merchantId: merchant.id, amount: invoiceAmountCents });
                } catch (err) {
                    console.error(`Error creating Mercury invoice for merchant ${merchant.id}:`, err);
                    skipped.push({ merchantId: merchant.id, reason: `api_error: ${(err as Error).message}` });
                }
            }

            return { invoiced, skipped };
        });

        // Log audit
        await step.run('log-audit', async () => {
            if (results.invoiced.length > 0) {
                await supabase.from('audit_events').insert({
                    action: 'mercury.auto_invoice_batch',
                    entity_type: 'system',
                    entity_id: 'mercury-check-balances',
                    metadata: {
                        merchants_checked: merchants.length,
                        invoices_created: results.invoiced.length,
                        merchants_skipped: results.skipped.length,
                        invoiced: results.invoiced,
                    },
                });
            }
        });

        return {
            merchantsChecked: merchants.length,
            invoicesCreated: results.invoiced.length,
            skipped: results.skipped.length,
        };
    }
);
