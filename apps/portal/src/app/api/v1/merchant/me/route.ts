/**
 * GET /api/v1/merchant/me  — Return the authenticated user's merchant profile.
 * POST /api/v1/merchant/me — Create a merchant profile for the authenticated user.
 * Uses service role for DB queries to avoid client-side RLS issues.
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

async function getAuthUser() {
    const supabase = createRouteHandlerClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) return null;
    return user;
}

export async function GET() {
    try {
        const user = await getAuthUser();
        if (!user) {
            return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
        }

        const serviceClient = getServiceClient();

        // Check direct ownership first
        const { data: ownedMerchant } = await serviceClient
            .from('merchants')
            .select('*')
            .eq('user_id', user.id)
            .maybeSingle();

        if (ownedMerchant) {
            return NextResponse.json({ ...ownedMerchant, merchant_role: 'MERCHANT_OWNER' });
        }

        // Check team membership
        const { data: membership } = await serviceClient
            .from('merchant_users')
            .select('role, merchant_id')
            .eq('user_id', user.id)
            .eq('is_active', true)
            .maybeSingle();

        if (membership) {
            const { data: merchant } = await serviceClient
                .from('merchants')
                .select('*')
                .eq('id', membership.merchant_id)
                .single();

            if (merchant) {
                return NextResponse.json({ ...merchant, merchant_role: membership.role });
            }
        }

        return NextResponse.json({ error: 'Merchant profile not found' }, { status: 404 });
    } catch (err) {
        console.error('Error in GET /api/v1/merchant/me:', err);
        return NextResponse.json({ error: 'Failed to load merchant profile. Please refresh and try again.' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const user = await getAuthUser();
        if (!user) {
            return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
        }

        const body = await request.json();
        const serviceClient = getServiceClient();

        // Check if profile already exists
        const { data: existing } = await serviceClient
            .from('merchants')
            .select('id')
            .eq('user_id', user.id)
            .single();

        if (existing) {
            // Already exists, return the full profile
            const { data: merchant } = await serviceClient
                .from('merchants')
                .select('*')
                .eq('user_id', user.id)
                .single();
            return NextResponse.json(merchant);
        }

        const { error: insertError } = await serviceClient
            .from('merchants')
            .insert({
                user_id: user.id,
                email: user.email,
                company_name: body.companyName || null,
                status: 'pending',
                kyb_status: 'not_started',
                wallet_balance_cents: 0,
            });

        if (insertError) {
            console.error('Error creating merchant profile:', insertError);
            return NextResponse.json({ error: 'Failed to create merchant profile. An account with this email may already exist.' }, { status: 500 });
        }

        const { data: merchant } = await serviceClient
            .from('merchants')
            .select('*')
            .eq('user_id', user.id)
            .single();

        return NextResponse.json(merchant, { status: 201 });
    } catch (err) {
        console.error('Error in POST /api/v1/merchant/me:', err);
        return NextResponse.json({ error: 'Failed to create merchant profile due to an unexpected error. Please try again.' }, { status: 500 });
    }
}

export async function PATCH(request: NextRequest) {
    try {
        const user = await getAuthUser();
        if (!user) {
            return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
        }

        const body = await request.json();
        const serviceClient = getServiceClient();

        // Resolve merchant: owner or team member
        let merchantId: string | null = null;

        const { data: ownedMerchant } = await serviceClient
            .from('merchants')
            .select('id')
            .eq('user_id', user.id)
            .maybeSingle();

        if (ownedMerchant) {
            merchantId = ownedMerchant.id;
        } else {
            const { data: membership } = await serviceClient
                .from('merchant_users')
                .select('merchant_id, role')
                .eq('user_id', user.id)
                .eq('is_active', true)
                .maybeSingle();
            if (membership && membership.role !== 'MERCHANT_USER') {
                merchantId = membership.merchant_id;
            }
        }

        if (!merchantId) {
            return NextResponse.json({ error: 'Merchant profile not found or insufficient permissions' }, { status: 403 });
        }

        // Whitelist allowed fields to prevent privilege escalation
        const ALLOWED_FIELDS = new Set([
            'company_name', 'website_url', 'phone', 'billing_email',
            'low_balance_threshold_cents', 'target_balance_cents',
            'selected_package_id', 'name', 'contact_phone',
        ]);

        // Resolve package slug to UUID if provided
        if (body.selected_package_slug) {
            const { data: pkg } = await serviceClient
                .from('service_packages')
                .select('id')
                .eq('slug', body.selected_package_slug)
                .single();
            if (pkg) {
                body.selected_package_id = pkg.id;
            }
        }

        const sanitized: Record<string, unknown> = {};
        for (const [k, v] of Object.entries(body)) {
            if (ALLOWED_FIELDS.has(k)) sanitized[k] = v;
        }

        if (Object.keys(sanitized).length === 0) {
            return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
        }

        const { error: updateError } = await serviceClient
            .from('merchants')
            .update(sanitized)
            .eq('id', merchantId);

        if (updateError) {
            console.error('Error updating merchant profile:', updateError);
            return NextResponse.json({ error: 'Failed to update merchant profile. Verify your changes are valid and try again.' }, { status: 500 });
        }

        const { data: merchant } = await serviceClient
            .from('merchants')
            .select('*')
            .eq('id', merchantId)
            .single();

        return NextResponse.json(merchant);
    } catch (err) {
        console.error('Error in PATCH /api/v1/merchant/me:', err);
        return NextResponse.json({ error: 'Failed to update merchant profile due to an unexpected error. Please try again.' }, { status: 500 });
    }
}
