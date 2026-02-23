/**
 * POST /api/v1/merchant/withdraw
 * Create a withdrawal request. This permanently closes the merchant account.
 *
 * Body: { currency: 'USD'|'BTC', payout_email?: string, payout_btc_address?: string }
 *
 * Guards:
 * - USD withdrawals draw from USD wallet only, require payout_email
 * - BTC withdrawals draw from BTC wallet only, require payout_btc_address (bech32)
 * - Sufficient confirmed balance required
 * - Merchant status set to CLOSING immediately
 * - Email sent to whitelabel@peptidetech.co
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createRouteHandlerClient } from '@/lib/supabase-server';
import { validateBech32Address } from '@/lib/btc-hd';
import nodemailer from 'nodemailer';

export const dynamic = 'force-dynamic';

function getServiceClient() {
    return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
}

async function getAuthenticatedMerchant() {
    const supabase = createRouteHandlerClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) return null;

    const sc = getServiceClient();
    const { data: merchant } = await sc
        .from('merchants')
        .select('id, name, company_name, contact_email, status')
        .eq('user_id', user.id)
        .single();

    return merchant;
}

async function sendWithdrawalEmail(details: {
    merchantName: string;
    merchantEmail: string;
    currency: string;
    amount: number;
    destination: string;
    destinationType: string;
}) {
    try {
        const transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST || 'smtp.gmail.com',
            port: parseInt(process.env.SMTP_PORT || '587'),
            secure: false,
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS,
            },
        });

        const amountDisplay = details.currency === 'USD'
            ? `$${(details.amount / 100).toFixed(2)} USD`
            : `${details.amount} sats (${(details.amount / 100_000_000).toFixed(8)} BTC)`;

        await transporter.sendMail({
            from: process.env.SMTP_FROM || 'noreply@peptidetech.co',
            to: 'whitelabel@peptidetech.co',
            subject: `Withdrawal Request - ${details.merchantName} (${details.currency})`,
            html: `
                <h2>Withdrawal Request</h2>
                <p><strong>Merchant:</strong> ${details.merchantName}</p>
                <p><strong>Email:</strong> ${details.merchantEmail}</p>
                <p><strong>Currency:</strong> ${details.currency}</p>
                <p><strong>Amount:</strong> ${amountDisplay}</p>
                <p><strong>${details.destinationType}:</strong> ${details.destination}</p>
                <p><strong>Timestamp:</strong> ${new Date().toISOString()}</p>
                <br/>
                <p style="color: #dc2626; font-weight: bold;">Account is closing permanently.</p>
                <p>Please process this withdrawal and mark it as completed in the admin dashboard.</p>
            `,
        });
    } catch (err) {
        console.error('Failed to send withdrawal notification email:', err);
    }
}

export async function POST(request: NextRequest) {
    try {
        const merchant = await getAuthenticatedMerchant();
        if (!merchant) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        if (merchant.status === 'CLOSED' || merchant.status === 'CLOSING') {
            return NextResponse.json(
                { error: 'Account is already closed or closing' },
                { status: 400 }
            );
        }

        const body = await request.json();
        const { currency, payout_email, payout_btc_address } = body;

        // Validate currency
        if (currency !== 'USD' && currency !== 'BTC') {
            return NextResponse.json({ error: 'Invalid currency' }, { status: 400 });
        }

        // Validate destination
        if (currency === 'USD') {
            if (!payout_email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payout_email)) {
                return NextResponse.json({ error: 'Valid payout email required for USD withdrawal' }, { status: 400 });
            }
        } else {
            if (!payout_btc_address || !validateBech32Address(payout_btc_address)) {
                return NextResponse.json({ error: 'Valid bech32 BTC address required for BTC withdrawal' }, { status: 400 });
            }
        }

        const sc = getServiceClient();

        // Get wallet balance for the specified currency
        const { data: wallet } = await sc
            .from('wallet_accounts')
            .select('id, balance_cents, reserved_cents')
            .eq('merchant_id', merchant.id)
            .eq('currency', currency)
            .single();

        if (!wallet) {
            return NextResponse.json({ error: 'Wallet not found' }, { status: 404 });
        }

        const available = wallet.balance_cents - wallet.reserved_cents;
        if (available <= 0) {
            return NextResponse.json({ error: 'Insufficient balance for withdrawal' }, { status: 400 });
        }

        // Withdraw the full available balance
        const withdrawAmount = available;

        // Create withdrawal request
        const { data: withdrawalReq, error: insertErr } = await sc
            .from('withdrawal_requests')
            .insert({
                merchant_id: merchant.id,
                currency,
                amount_minor: withdrawAmount,
                payout_email: currency === 'USD' ? payout_email : null,
                payout_btc_address: currency === 'BTC' ? payout_btc_address : null,
                status: 'PENDING_ADMIN',
                merchant_name_snapshot: merchant.company_name || merchant.name,
                merchant_email_snapshot: merchant.contact_email,
                closure_confirmed_at: new Date().toISOString(),
            })
            .select('id')
            .single();

        if (insertErr || !withdrawalReq) {
            console.error('Failed to create withdrawal request:', insertErr);
            return NextResponse.json({ error: 'Failed to submit withdrawal request. No funds were deducted — please try again.' }, { status: 500 });
        }

        // Record ledger transaction
        const txType = currency === 'USD' ? 'USD_WITHDRAWAL_REQUESTED' : 'BTC_WITHDRAWAL_REQUESTED';
        await sc.from('wallet_transactions').insert({
            merchant_id: merchant.id,
            wallet_id: wallet.id,
            type: txType,
            amount_cents: -withdrawAmount,
            balance_after_cents: wallet.balance_cents,
            reference_type: 'withdrawal_request',
            reference_id: withdrawalReq.id,
            description: `${currency} withdrawal requested`,
            metadata: {
                currency,
                amount_minor: withdrawAmount,
                withdrawal_request_id: withdrawalReq.id,
            },
        });

        // Set merchant status to CLOSING
        await sc
            .from('merchants')
            .update({ status: 'CLOSING' })
            .eq('id', merchant.id);

        // Send notification email
        const merchantName = merchant.company_name || merchant.name || 'Unknown';
        await sendWithdrawalEmail({
            merchantName,
            merchantEmail: merchant.contact_email,
            currency,
            amount: withdrawAmount,
            destination: currency === 'USD' ? payout_email : payout_btc_address,
            destinationType: currency === 'USD' ? 'Payout Email' : 'BTC Address',
        });

        // Audit log
        await sc.from('audit_events').insert({
            merchant_id: merchant.id,
            action: 'merchant.withdrawal_requested',
            entity_type: 'withdrawal_request',
            entity_id: withdrawalReq.id,
            metadata: {
                currency,
                amount_minor: withdrawAmount,
                merchant_name: merchantName,
                merchant_email: merchant.contact_email,
            },
        });

        return NextResponse.json({
            data: {
                id: withdrawalReq.id,
                currency,
                amount_minor: withdrawAmount,
                status: 'PENDING_ADMIN',
                message: 'Withdrawal request submitted. Your account will be closed permanently.',
            },
        });
    } catch (error) {
        console.error('Withdrawal request error:', error);
        return NextResponse.json({ error: 'Withdrawal request failed unexpectedly. No funds were deducted — please try again.' }, { status: 500 });
    }
}
