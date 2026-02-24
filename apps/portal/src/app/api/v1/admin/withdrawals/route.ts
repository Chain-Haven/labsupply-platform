/**
 * GET/PATCH /api/v1/admin/withdrawals
 * Admin withdrawal request management.
 * GET: List all withdrawal requests
 * PATCH: Update status (PROCESSING / COMPLETED / REJECTED)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { validateBody, withdrawalActionSchema } from '@/lib/api-schemas';
import { adjustWalletBalance } from '@/lib/wallet-ops';
import { requireAdmin } from '@/lib/admin-api-auth';

export const dynamic = 'force-dynamic';

function getServiceClient() {
    return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
}

export async function GET(request: NextRequest) {
    try {
        const authResult = await requireAdmin();
        if (authResult instanceof NextResponse) return authResult;
        const { admin } = authResult;

        const { searchParams } = new URL(request.url);
        const status = searchParams.get('status');

        const sc = getServiceClient();

        let query = sc
            .from('withdrawal_requests')
            .select('*')
            .order('requested_at', { ascending: false })
            .limit(100);

        if (status) query = query.eq('status', status);

        const { data: requests, error } = await query;

        if (error) {
            return NextResponse.json({ error: 'Failed to load withdrawal requests. Please refresh and try again.' }, { status: 500 });
        }

        return NextResponse.json({ data: requests || [] });
    } catch (error) {
        console.error('Admin withdrawals fetch error:', error);
        return NextResponse.json({ error: 'Withdrawal operation failed unexpectedly. Please try again.' }, { status: 500 });
    }
}

export async function PATCH(request: NextRequest) {
    try {
        const authResult = await requireAdmin();
        if (authResult instanceof NextResponse) return authResult;
        const { admin } = authResult;

        const body = await request.json();
        const validation = validateBody(withdrawalActionSchema, body);
        if ('error' in validation) {
            return NextResponse.json(validation, { status: 400 });
        }
        const { data } = validation;
        const { withdrawal_id, status, admin_notes } = data;

        const validStatuses = ['PROCESSING', 'COMPLETED', 'REJECTED'];
        if (!validStatuses.includes(status)) {
            return NextResponse.json({ error: `Status must be one of: ${validStatuses.join(', ')}` }, { status: 400 });
        }

        const sc = getServiceClient();

        // Fetch the withdrawal request
        const { data: withdrawal, error: fetchErr } = await sc
            .from('withdrawal_requests')
            .select('*')
            .eq('id', withdrawal_id)
            .single();

        if (fetchErr || !withdrawal) {
            return NextResponse.json({ error: 'Withdrawal request not found' }, { status: 404 });
        }

        const updates: Record<string, unknown> = {
            status,
            admin_notes: admin_notes || withdrawal.admin_notes,
        };

        if (status === 'COMPLETED') {
            updates.completed_at = new Date().toISOString();

            // Deduct the balance from the merchant's wallet
            const { data: wallet } = await sc
                .from('wallet_accounts')
                .select('id')
                .eq('merchant_id', withdrawal.merchant_id)
                .eq('currency', withdrawal.currency)
                .single();

            if (wallet) {
                const txType = withdrawal.currency === 'USD' ? 'USD_WITHDRAWAL_COMPLETED' : 'BTC_WITHDRAWAL_COMPLETED';
                try {
                    await adjustWalletBalance(sc, {
                        walletId: wallet.id,
                        merchantId: withdrawal.merchant_id,
                        amountCents: -Number(withdrawal.amount_minor),
                        type: txType,
                        referenceType: 'withdrawal_request',
                        referenceId: withdrawal.id,
                        description: `${withdrawal.currency} withdrawal completed`,
                        metadata: { currency: withdrawal.currency, amount_minor: withdrawal.amount_minor, destination: withdrawal.currency === 'USD' ? withdrawal.payout_email : withdrawal.payout_btc_address },
                        idempotencyKey: `withdrawal-${withdrawal.id}`,
                    });
                } catch (err) {
                    console.error('Withdrawal wallet deduction failed:', err);
                    return NextResponse.json({ error: 'Failed to deduct from wallet' }, { status: 500 });
                }
            }

            // Set merchant status to CLOSED permanently
            await sc
                .from('merchants')
                .update({ status: 'CLOSED' })
                .eq('id', withdrawal.merchant_id);
        }

        // Update the withdrawal request
        const { error: updateErr } = await sc
            .from('withdrawal_requests')
            .update(updates)
            .eq('id', withdrawal_id);

        if (updateErr) {
            return NextResponse.json({ error: 'Failed to update withdrawal status. The database rejected the change — please try again.' }, { status: 500 });
        }

        // Audit log
        await sc.from('audit_events').insert({
            actor_user_id: admin.id,
            merchant_id: withdrawal.merchant_id,
            action: `admin.withdrawal_${status.toLowerCase()}`,
            entity_type: 'withdrawal_request',
            entity_id: withdrawal_id,
            metadata: {
                currency: withdrawal.currency,
                amount_minor: withdrawal.amount_minor,
                new_status: status,
            },
        });

        return NextResponse.json({ data: { id: withdrawal_id, status } });
    } catch (error) {
        console.error('Admin withdrawal update error:', error);
        return NextResponse.json({ error: 'Withdrawal operation failed unexpectedly. Please try again.' }, { status: 500 });
    }
}
