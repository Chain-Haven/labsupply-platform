import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireAdmin } from '@/lib/admin-api-auth';

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
        const reason = body.reason || 'Admin refund';

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
            .select('id, balance_cents, reserved_cents')
            .eq('merchant_id', order.merchant_id)
            .eq('currency', 'USD')
            .single();

        if (!wallet) {
            return NextResponse.json({ error: 'Merchant wallet not found' }, { status: 500 });
        }

        const newBalance = wallet.balance_cents + refundAmountCents;

        const preSettlementStatuses = ['FUNDED', 'PACKED', 'RELEASED_TO_FULFILLMENT', 'PICKING'];
        let newReserved = wallet.reserved_cents;
        if (preSettlementStatuses.includes(order.status) && order.total_estimate_cents) {
            newReserved = Math.max(0, wallet.reserved_cents - order.total_estimate_cents);
        }

        const { error: walletErr } = await supabase
            .from('wallet_accounts')
            .update({ balance_cents: newBalance, reserved_cents: newReserved })
            .eq('id', wallet.id);

        if (walletErr) {
            return NextResponse.json({ error: 'Failed to credit wallet' }, { status: 500 });
        }

        await supabase.from('wallet_transactions').insert({
            merchant_id: order.merchant_id,
            wallet_id: wallet.id,
            type: 'REFUND',
            amount_cents: refundAmountCents,
            balance_after_cents: newBalance,
            reference_type: 'order',
            reference_id: orderId,
            description: `Refund: ${reason}`,
        });

        await supabase
            .from('orders')
            .update({ status: 'REFUNDED' })
            .eq('id', orderId);

        await supabase.from('order_status_history').insert({
            order_id: orderId,
            from_status: order.status,
            to_status: 'REFUNDED',
            notes: reason,
        }).then(() => {}, () => {});

        await supabase.from('audit_events').insert({
            merchant_id: order.merchant_id,
            action: 'order.refunded',
            entity_type: 'order',
            entity_id: orderId,
            metadata: { reason, refund_amount_cents: refundAmountCents },
        }).then(() => {}, () => {});

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
