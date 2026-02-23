/**
 * PATCH /api/v1/merchant/billing-settings
 * Update billing email, low-balance threshold, and target balance for the authenticated merchant
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireMerchant, getServiceClient } from '@/lib/merchant-api-auth';

export const dynamic = 'force-dynamic';

export async function PATCH(request: NextRequest) {
    try {
        const authResult = await requireMerchant();
        if (authResult instanceof NextResponse) return authResult;
        const { merchant } = authResult.data;

        const body = await request.json();
        const { billing_email, low_balance_threshold_cents, target_balance_cents } = body;

        // Validate
        const updates: Record<string, unknown> = {};

        if (billing_email !== undefined) {
            if (typeof billing_email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(billing_email)) {
                return NextResponse.json({ error: 'Invalid billing email' }, { status: 400 });
            }
            updates.billing_email = billing_email;
        }

        if (low_balance_threshold_cents !== undefined) {
            if (typeof low_balance_threshold_cents !== 'number' || low_balance_threshold_cents < 10000) {
                return NextResponse.json({ error: 'Threshold must be at least $100' }, { status: 400 });
            }
            updates.low_balance_threshold_cents = low_balance_threshold_cents;
        }

        if (target_balance_cents !== undefined) {
            if (typeof target_balance_cents !== 'number' || target_balance_cents < 10000) {
                return NextResponse.json({ error: 'Target balance must be at least $100' }, { status: 400 });
            }
            updates.target_balance_cents = target_balance_cents;
        }

        // Cross-validate threshold vs target
        const effectiveThreshold = (updates.low_balance_threshold_cents as number) ?? merchant.low_balance_threshold_cents ?? 100000;
        const effectiveTarget = (updates.target_balance_cents as number) ?? merchant.target_balance_cents ?? 300000;

        if (effectiveTarget < effectiveThreshold) {
            return NextResponse.json(
                { error: 'Target balance must be at least equal to the threshold' },
                { status: 400 }
            );
        }

        if (Object.keys(updates).length === 0) {
            return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
        }

        const supabase = getServiceClient();
        const { data, error } = await supabase
            .from('merchants')
            .update(updates)
            .eq('id', merchant.id)
            .select('billing_email, low_balance_threshold_cents, target_balance_cents')
            .single();

        if (error) {
            console.error('Error updating billing settings:', error);
            return NextResponse.json({ error: 'Failed to save billing settings. Verify your changes are valid and try again.' }, { status: 500 });
        }

        return NextResponse.json({ data });
    } catch (error) {
        console.error('Billing settings update error:', error);
        return NextResponse.json({ error: 'Billing settings operation failed unexpectedly. Please try again.' }, { status: 500 });
    }
}

export async function GET() {
    try {
        const authResult = await requireMerchant();
        if (authResult instanceof NextResponse) return authResult;
        const { merchant } = authResult.data;

        return NextResponse.json({
            data: {
                billing_email: merchant.billing_email,
                low_balance_threshold_cents: merchant.low_balance_threshold_cents,
                target_balance_cents: merchant.target_balance_cents,
            },
        });
    } catch (error) {
        console.error('Billing settings fetch error:', error);
        return NextResponse.json({ error: 'Billing settings operation failed unexpectedly. Please try again.' }, { status: 500 });
    }
}
