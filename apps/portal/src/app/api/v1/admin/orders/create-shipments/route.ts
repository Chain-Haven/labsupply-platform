/**
 * POST /api/v1/admin/orders/create-shipments
 * Batch-creates shipments for selected order IDs via the external API.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-api-auth';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
    try {
        const authResult = await requireAdmin();
        if (authResult instanceof NextResponse) return authResult;

        const body = await request.json();
        const orderIds: string[] = body.order_ids || [];

        if (!orderIds.length) {
            return NextResponse.json({ error: 'No order IDs provided' }, { status: 400 });
        }

        const apiBaseUrl = process.env.APP_BASE_URL || 'http://localhost:3001';
        const adminToken = process.env.ADMIN_API_TOKEN || '';
        const results: Array<{ order_id: string; success: boolean; shipment_id?: string; error?: string }> = [];

        for (const orderId of orderIds) {
            try {
                const res = await fetch(`${apiBaseUrl}/v1/shipments`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${adminToken}`,
                    },
                    body: JSON.stringify({
                        order_id: orderId,
                        carrier: 'usps',
                        service: 'usps_priority_mail',
                    }),
                });

                const data = await res.json();
                if (res.ok && data.data) {
                    results.push({ order_id: orderId, success: true, shipment_id: data.data.shipment_id });
                } else {
                    results.push({ order_id: orderId, success: false, error: data.error?.message || 'Unknown error' });
                }
            } catch (err) {
                results.push({ order_id: orderId, success: false, error: (err as Error).message });
            }
        }

        return NextResponse.json({
            total: orderIds.length,
            succeeded: results.filter(r => r.success).length,
            failed: results.filter(r => !r.success).length,
            results,
        });
    } catch (error) {
        console.error('Create shipments error:', error);
        return NextResponse.json({ error: 'Shipment creation failed unexpectedly. No shipments were created — please try again.' }, { status: 500 });
    }
}
