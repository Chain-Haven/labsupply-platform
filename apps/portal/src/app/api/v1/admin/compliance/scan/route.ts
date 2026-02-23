/**
 * Portal proxy: Admin Compliance - Trigger on-demand scan
 * POST /api/v1/admin/compliance/scan
 */

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

export async function POST(request: NextRequest) {
    try {
        const authResult = await requireAdmin();
        if (authResult instanceof NextResponse) return authResult;

        const supabase = getServiceClient();
        const body = await request.json();
        const { merchant_id } = body;

        if (!merchant_id) {
            return NextResponse.json({ error: 'merchant_id is required' }, { status: 400 });
        }

        // Verify merchant exists
        const { data: merchant, error } = await supabase
            .from('merchants')
            .select('id, company_name')
            .eq('id', merchant_id)
            .single();

        if (error || !merchant) {
            return NextResponse.json({ error: 'Merchant not found' }, { status: 404 });
        }

        // Check for running scan
        const { data: runningScan } = await supabase
            .from('compliance_scans')
            .select('id')
            .eq('merchant_id', merchant_id)
            .eq('status', 'running')
            .limit(1);

        if (runningScan && runningScan.length > 0) {
            return NextResponse.json(
                { error: 'A scan is already running for this merchant' },
                { status: 409 }
            );
        }

        // Forward to the API service to trigger the Inngest event
        const apiUrl = process.env.API_URL || 'http://localhost:3001';
        const scanRes = await fetch(`${apiUrl}/v1/admin/compliance/scan`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ merchant_id }),
        });

        if (!scanRes.ok) {
            // Fallback: create a pending scan record directly
            await supabase.from('compliance_scans').insert({
                merchant_id,
                scan_url: 'on-demand',
                status: 'pending',
            });
        }

        return NextResponse.json({
            message: `Compliance scan triggered for ${merchant.company_name}`,
            merchant_id,
        });
    } catch (error) {
        console.error('Compliance scan trigger error:', error);
        return NextResponse.json({ error: 'Compliance scan failed to start. Please try again.' }, { status: 500 });
    }
}
