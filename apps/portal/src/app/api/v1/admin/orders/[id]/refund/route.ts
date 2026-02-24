import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireAdmin } from '@/lib/admin-api-auth';
import { validateBody, refundSchema } from '@/lib/api-schemas';
import { logNonCritical } from '@/lib/logger';
import { adjustWalletBalance, adjustWalletReserved, WalletNotFoundError } from '@/lib/wallet-ops';

export const dynamic = 'force-dynamic';

function getServiceClient() {
    return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
}

export async function POST(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const authResult = await requireAdmin();
        if (authResult instanceof NextResponse) return authResult;

        const supabase = getServiceClient();
        const orderId = params.id;
        const body = await request.json();
        const validation = validateBody(refundSchema, body);
        if ('error' in validation) {
            return NextResponse.json(validation, { status: 400 });
        }
        const { data } = validation;
        const reason = data.reason;

        const { data: order, error: orderErr } = await supabase
            .from('orders')
            .select('id, status, merchant_id, actual_total_cents, total_estimate_cents, shipments(id, tracking_number, carrier)')
            .eq('id', orderId)
            .single();

        if (orderErr || !order) {
            return NextResponse.json({ error: 'Order not found' }, { status: 404 });
        }

        const refundableStatuses = ['SHIPPED', 'COMPLETE', 'FUNDED', 'PACKED', 'RELEASED_TO_FULFILLMENT', 'PICKING'];
        if (!refundableStatuses.includes(order.status)) {
            return NextResponse.json({
                error: `Cannot refund order in ${order.status} status. Allowed: ${refundableStatuses.join(', ')}`,
            }, { status: 400 });
        }

        if (order.status === 'REFUNDED') {
            return NextResponse.json({ error: 'Order is already refunded' }, { status: 400 });
        }

        const refundAmountCents = order.actual_total_cents || order.total_estimate_cents || 0;

        if (refundAmountCents <= 0) {
            return NextResponse.json({ error: 'No amount to refund' }, { status: 400 });
        }

        const { data: wallet } = await supabase
            .from('wallet_accounts')
            .select('id, reserved_cents')
            .eq('merchant_id', order.merchant_id)
            .eq('currency', 'USD')
            .single();

        if (!wallet) {
            return NextResponse.json({ error: 'Merchant wallet not found' }, { status: 500 });
        }

        let newBalance: number;
        try {
            const result = await adjustWalletBalance(supabase, {
                walletId: wallet.id,
                merchantId: order.merchant_id,
                amountCents: refundAmountCents,
                type: 'REFUND',
                referenceType: 'order',
                referenceId: orderId,
                description: `Refund: ${reason}`,
                idempotencyKey: `refund-${orderId}`,
            });
            newBalance = result.newBalance;

            const preSettlementStatuses = ['FUNDED', 'PACKED', 'RELEASED_TO_FULFILLMENT', 'PICKING'];
            if (preSettlementStatuses.includes(order.status)) {
                await adjustWalletReserved(supabase, wallet.id, -(order.total_estimate_cents || 0));
            }
        } catch (err) {
            if (err instanceof WalletNotFoundError) {
                return NextResponse.json({ error: 'Merchant wallet not found' }, { status: 500 });
            }
            return NextResponse.json({ error: 'Failed to credit wallet' }, { status: 500 });
        }

        await supabase
            .from('orders')
            .update({ status: 'REFUNDED' })
            .eq('id', orderId);

        logNonCritical(supabase.from('order_status_history').insert({
            order_id: orderId,
            from_status: order.status,
            to_status: 'REFUNDED',
            notes: reason,
        }), 'status_history:refund');

        logNonCritical(supabase.from('audit_events').insert({
            merchant_id: order.merchant_id,
            action: 'order.refunded',
            entity_type: 'order',
            entity_id: orderId,
            metadata: { reason, refund_amount_cents: refundAmountCents },
        }), 'audit:order.refunded');

        return NextResponse.json({
            data: {
                orderId,
                status: 'REFUNDED',
                refundAmountCents,
                walletBalanceCents: newBalance,
            },
        });
    } catch (error) {
        console.error('Refund error:', error);
        return NextResponse.json({ error: 'Failed to process refund' }, { status: 500 });
    }
}
