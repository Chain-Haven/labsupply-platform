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

const PACKABLE_STATUSES = ['RELEASED_TO_FULFILLMENT', 'PICKING'];

export async function POST(
    request: NextRequest,
    { params }: { params: { id: string } },
) {
    try {
        const authResult = await requireAdmin();
        if (authResult instanceof NextResponse) return authResult;

        const supabase = getServiceClient();
        const orderId = params.id;

        const body = await request.json();
        const items: Array<{ order_item_id: string; lot_code: string }> = body.items;

        if (!Array.isArray(items) || items.length === 0) {
            return NextResponse.json(
                { error: 'items array is required and must not be empty' },
                { status: 400 },
            );
        }

        const { data: order, error: orderErr } = await supabase
            .from('orders')
            .select('id, status, merchant_id')
            .eq('id', orderId)
            .single();

        if (orderErr || !order) {
            return NextResponse.json({ error: 'Order not found' }, { status: 404 });
        }

        if (!PACKABLE_STATUSES.includes(order.status)) {
            return NextResponse.json(
                {
                    error: `Order status must be RELEASED_TO_FULFILLMENT or PICKING to pack. Current status: ${order.status}`,
                },
                { status: 400 },
            );
        }

        const currentStatus = order.status;

        for (const item of items) {
            const { data: orderItem, error: itemErr } = await supabase
                .from('order_items')
                .select('id, product_id, qty')
                .eq('id', item.order_item_id)
                .eq('order_id', orderId)
                .single();

            if (itemErr || !orderItem) {
                return NextResponse.json(
                    { error: `Order item ${item.order_item_id} not found on this order` },
                    { status: 400 },
                );
            }

            const { data: lot, error: lotErr } = await supabase
                .from('lots')
                .select('id, quantity')
                .eq('lot_code', item.lot_code)
                .eq('product_id', orderItem.product_id)
                .single();

            if (lotErr || !lot) {
                return NextResponse.json(
                    { error: `Lot "${item.lot_code}" not found for product ${orderItem.product_id}` },
                    { status: 400 },
                );
            }

            const { error: updateErr } = await supabase
                .from('order_items')
                .update({ lot_id: lot.id, lot_code: item.lot_code })
                .eq('id', item.order_item_id);

            if (updateErr) {
                console.error('Order item lot assignment error:', updateErr);
                return NextResponse.json(
                    { error: `Failed to assign lot to order item ${item.order_item_id}` },
                    { status: 500 },
                );
            }

            // Deplete the lot quantity and reduce inventory on_hand
            const depleteQty = orderItem.qty || 1;
            if (lot.quantity !== null) {
                const newLotQty = Math.max(0, (lot.quantity || 0) - depleteQty);
                await supabase.from('lots')
                    .update({ quantity: newLotQty })
                    .eq('id', lot.id);
            }

            if (orderItem.product_id) {
                const { data: inv } = await supabase
                    .from('inventory')
                    .select('id, on_hand')
                    .eq('product_id', orderItem.product_id)
                    .single();

                if (inv) {
                    const newOnHand = Math.max(0, inv.on_hand - depleteQty);
                    await supabase.from('inventory')
                        .update({ on_hand: newOnHand })
                        .eq('id', inv.id);
                }
            }
        }

        const { error: statusErr } = await supabase
            .from('orders')
            .update({ status: 'PACKED' })
            .eq('id', orderId);

        if (statusErr) {
            console.error('Order status update error:', statusErr);
            return NextResponse.json(
                { error: 'Failed to update order status to PACKED' },
                { status: 500 },
            );
        }

        await supabase.from('order_status_history').insert({
            order_id: orderId,
            from_status: currentStatus,
            to_status: 'PACKED',
            notes: 'Order packed with lot assignments',
        }).then(() => {}, () => {});

        await supabase.from('audit_events').insert({
            action: 'order.packed',
            entity_type: 'order',
            entity_id: orderId,
            new_values: { items: body.items },
        }).then(() => {}, () => {});

        return NextResponse.json({
            data: {
                orderId,
                status: 'PACKED',
                items_packed: items.length,
            },
        });
    } catch (error) {
        console.error('Pack order error:', error);
        return NextResponse.json(
            { error: 'Failed to pack order. Please try again.' },
            { status: 500 },
        );
    }
}
