import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireAdmin } from '@/lib/admin-api-auth';
import { generatePackingSlipPdf } from '@/lib/packing-slip';

export const dynamic = 'force-dynamic';

function getServiceClient() {
    return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
}

export async function GET(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const authResult = await requireAdmin();
        if (authResult instanceof NextResponse) return authResult;

        const supabase = getServiceClient();
        const orderId = params.id;

        const { data: order, error } = await supabase
            .from('orders')
            .select(`
                id, woo_order_id, woo_order_number, shipping_address, shipped_at, created_at,
                merchant_id,
                order_items(sku, name, qty, lot_code),
                shipments(tracking_number, carrier)
            `)
            .eq('id', orderId)
            .single();

        if (error || !order) {
            return NextResponse.json({ error: 'Order not found' }, { status: 404 });
        }

        const { data: merchant } = await supabase
            .from('merchants')
            .select('company_name, email')
            .eq('id', order.merchant_id)
            .single();

        const shipment = Array.isArray(order.shipments) ? order.shipments[0] : null;
        const shippingAddr = order.shipping_address || {};

        const pdfBytes = await generatePackingSlipPdf({
            orderId: order.id,
            wooOrderId: order.woo_order_id || order.id,
            wooOrderNumber: order.woo_order_number,
            merchantName: merchant?.company_name || merchant?.email || 'Unknown',
            shippingAddress: shippingAddr,
            items: (order.order_items || []).map((item: any) => ({
                sku: item.sku || '',
                name: item.name || '',
                qty: item.qty || 0,
                lot_code: item.lot_code,
            })),
            trackingNumber: shipment?.tracking_number,
            carrier: shipment?.carrier,
            shipDate: order.shipped_at
                ? new Date(order.shipped_at).toLocaleDateString()
                : new Date(order.created_at).toLocaleDateString(),
            coaBaseUrl: process.env.NEXT_PUBLIC_APP_URL || 'https://portal.peptidetech.co',
        });

        return new NextResponse(Buffer.from(pdfBytes), {
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': `inline; filename="packing-slip-${order.woo_order_id || order.id}.pdf"`,
            },
        });
    } catch (error) {
        console.error('Packing slip generation error:', error);
        return NextResponse.json({ error: 'Failed to generate packing slip' }, { status: 500 });
    }
}
