/**
 * Admin Testing Order Detail API
 * GET   - Get a single testing order with items
 * PATCH - Update status, add invoice info, etc.
 * POST  - Resend lab notification email
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireAdmin } from '@/lib/admin-api-auth';
import { z } from 'zod';

const updateTestingOrderStatusSchema = z.object({
    status: z.enum(['PENDING', 'AWAITING_SHIPMENT', 'SHIPPED', 'IN_TESTING', 'RESULTS_RECEIVED', 'COMPLETE']),
    notes: z.string().max(2000).optional(),
    lab_invoice_number: z.string().max(100).optional(),
    lab_invoice_amount_cents: z.number().int().min(0).optional(),
});

function validateInput<T extends z.ZodSchema>(schema: T, input: unknown) {
    const result = schema.safeParse(input);
    if (result.success) return { success: true as const, data: result.data as z.infer<T> };
    return { success: false as const, errors: result.error };
}

function formatZodErrors(error: z.ZodError) {
    const formatted: Record<string, string[]> = {};
    for (const issue of error.issues) {
        const path = issue.path.join('.');
        if (!formatted[path]) formatted[path] = [];
        formatted[path].push(issue.message);
    }
    return formatted;
}

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
        const { data, error } = await supabase
            .from('testing_orders')
            .select(`
                *,
                testing_labs(id, name, email, phone),
                merchants(id, name, company_name, contact_email),
                testing_order_items(*)
            `)
            .eq('id', params.id)
            .single();

        if (error || !data) {
            return NextResponse.json({ error: 'Testing order not found' }, { status: 404 });
        }

        return NextResponse.json({ data });
    } catch (error) {
        console.error('Testing order GET error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function PATCH(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const authResult = await requireAdmin();
        if (authResult instanceof NextResponse) return authResult;

        const body = await request.json();
        const validation = validateInput(updateTestingOrderStatusSchema, body);
        if (!validation.success) {
            return NextResponse.json(
                { error: 'Validation failed', details: formatZodErrors(validation.errors) },
                { status: 400 }
            );
        }

        const supabase = getServiceClient();
        const updates: Record<string, unknown> = {
            status: validation.data.status,
        };

        if (validation.data.notes !== undefined) {
            updates.notes = validation.data.notes;
        }
        if (validation.data.lab_invoice_number !== undefined) {
            updates.lab_invoice_number = validation.data.lab_invoice_number;
        }
        if (validation.data.lab_invoice_amount_cents !== undefined) {
            updates.lab_invoice_amount_cents = validation.data.lab_invoice_amount_cents;
        }
        if (validation.data.status === 'RESULTS_RECEIVED') {
            updates.results_received_at = new Date().toISOString();
        }

        const { data, error } = await supabase
            .from('testing_orders')
            .update(updates)
            .eq('id', params.id)
            .select(`
                *,
                testing_labs(id, name, email),
                merchants(id, name, contact_email),
                testing_order_items(*)
            `)
            .single();

        if (error || !data) {
            console.error('Testing order update error:', error);
            return NextResponse.json({ error: 'Failed to update testing order' }, { status: 500 });
        }

        // Record audit event
        await supabase.from('audit_events').insert({
            merchant_id: data.merchant_id,
            action: 'testing_order.status_updated',
            entity_type: 'testing_order',
            entity_id: params.id,
            new_values: updates,
        });

        return NextResponse.json({ data });
    } catch (error) {
        console.error('Testing order PATCH error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function POST(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const authResult = await requireAdmin();
        if (authResult instanceof NextResponse) return authResult;

        const body = await request.json();
        const { action } = body;

        if (action !== 'resend_lab_email') {
            return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
        }

        const supabase = getServiceClient();

        // Reset tracking_notified_at to allow re-send on next poll
        const { data, error } = await supabase
            .from('testing_orders')
            .update({ tracking_notified_at: null })
            .eq('id', params.id)
            .select()
            .single();

        if (error || !data) {
            return NextResponse.json({ error: 'Testing order not found' }, { status: 404 });
        }

        // If the order already has a tracking number, it will be picked up by the cron.
        // Otherwise, the email will be sent when a tracking number is detected.
        const hasTracking = !!data.tracking_number;

        return NextResponse.json({
            data,
            message: hasTracking
                ? 'Lab notification will be re-sent on next poll cycle (within 5 minutes)'
                : 'Lab notification will be sent once a tracking number is detected',
        });
    } catch (error) {
        console.error('Testing order POST error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
