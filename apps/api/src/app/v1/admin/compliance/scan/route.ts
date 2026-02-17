/**
 * Admin Compliance API - Trigger On-Demand Scan
 * POST /v1/admin/compliance/scan
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { withAdminAuth, AdminAuthResult, logAdminAction } from '@/lib/admin-auth';
import { inngest } from '@/lib/inngest';
import { z } from 'zod';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const scanRequestSchema = z.object({
    merchant_id: z.string().uuid(),
});

async function handlePost(request: NextRequest, auth: AdminAuthResult) {
    const body = await request.json();
    const { merchant_id } = scanRequestSchema.parse(body);

    // Verify merchant exists
    const { data: merchant, error } = await supabase
        .from('merchants')
        .select('id, company_name')
        .eq('id', merchant_id)
        .single();

    if (error || !merchant) {
        return NextResponse.json({ error: 'Merchant not found' }, { status: 404 });
    }

    // Check if there's already a running scan for this merchant
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

    // Trigger the on-demand scan via Inngest
    await inngest.send({
        name: 'compliance/scan-merchant',
        data: { merchantId: merchant_id },
    });

    // Log audit
    await logAdminAction(
        auth,
        'compliance.scan.triggered',
        'merchant',
        merchant_id,
        { after: { triggered_by: auth.adminId } },
        request
    );

    return NextResponse.json({
        message: `Compliance scan triggered for ${merchant.company_name}`,
        merchant_id,
    });
}

export const POST = withAdminAuth(handlePost);
