/**
 * GET/PATCH /api/v1/admin/withdrawals
 * Admin withdrawal request management.
 * GET: List all withdrawal requests
 * PATCH: Update status (PROCESSING / COMPLETED / REJECTED)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createRouteHandlerClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

function getServiceClient() {
    return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
}

async function verifyAdmin(): Promise<string | null> {
    const supabase = createRouteHandlerClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) return null;

    const sc = getServiceClient();
    const { data: admin } = await sc
        .from('supplier_users')
        .select('user_id')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .single();

    return admin ? user.id : null;
}

export async function GET(request: NextRequest) {
    try {
        if (!(await verifyAdmin())) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

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
            return NextResponse.json({ error: 'Failed to fetch withdrawals' }, { status: 500 });
        }

        return NextResponse.json({ data: requests || [] });
    } catch (error) {
        console.error('Admin withdrawals fetch error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function PATCH(request: NextRequest) {
    try {
        const adminId = await verifyAdmin();
        if (!adminId) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const body = await request.json();
        const { withdrawal_id, status, admin_notes } = body;

        if (!withdrawal_id || !status) {
            return NextResponse.json({ error: 'withdrawal_id and status required' }, { status: 400 });
        }

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
                .select('id, balance_cents')
                .eq('merchant_id', withdrawal.merchant_id)
                .eq('currency', withdrawal.currency)
                .single();

            if (wallet) {
                const newBalance = Math.max(0, wallet.balance_cents - Number(withdrawal.amount_minor));

                await sc
                    .from('wallet_accounts')
                    .update({ balance_cents: newBalance })
                    .eq('id', wallet.id);

                // Record completion ledger transaction
                const txType = withdrawal.currency === 'USD'
                    ? 'USD_WITHDRAWAL_COMPLETED'
                    : 'BTC_WITHDRAWAL_COMPLETED';

                await sc.from('wallet_transactions').insert({
                    merchant_id: withdrawal.merchant_id,
                    wallet_id: wallet.id,
                    type: txType,
                    amount_cents: -Number(withdrawal.amount_minor),
                    balance_after_cents: newBalance,
                    reference_type: 'withdrawal_request',
                    reference_id: withdrawal.id,
                    description: `${withdrawal.currency} withdrawal completed`,
                    metadata: {
                        currency: withdrawal.currency,
                        amount_minor: withdrawal.amount_minor,
                        destination: withdrawal.currency === 'USD'
                            ? withdrawal.payout_email
                            : withdrawal.payout_btc_address,
                    },
                });
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
            return NextResponse.json({ error: 'Failed to update withdrawal' }, { status: 500 });
        }

        // Audit log
        await sc.from('audit_events').insert({
            actor_user_id: adminId,
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
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
