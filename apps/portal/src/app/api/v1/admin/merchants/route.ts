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

export async function GET(request: NextRequest) {
    try {
        const authResult = await requireAdmin();
        if (authResult instanceof NextResponse) return authResult;

        const supabase = getServiceClient();
        const { searchParams } = new URL(request.url);
        const status = searchParams.get('status');
        const kyb_status = searchParams.get('kyb_status');
        const search = searchParams.get('search');
        const page = parseInt(searchParams.get('page') || '1', 10);
        const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 100);
        const offset = (page - 1) * limit;

        // Query only columns known to exist in production schema
        let query = supabase
            .from('merchants')
            .select(`
                id, user_id, email, company_name, website_url, phone,
                status, kyb_status, can_ship,
                wallet_balance_cents, subscription_status,
                legal_opinion_letter_url,
                billing_name, price_adjustment_percent,
                created_at, updated_at
            `, { count: 'exact' })
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1);

        if (status) {
            query = query.eq('status', status);
        }
        if (kyb_status) {
            query = query.eq('kyb_status', kyb_status);
        }
        if (search) {
            query = query.or(`company_name.ilike.%${search}%,email.ilike.%${search}%`);
        }

        const { data, count, error } = await query;

        if (error) {
            console.warn('Merchants fetch error:', error.code, error.message);
            return NextResponse.json({ data: [], pagination: { page, limit, total: 0, has_more: false } });
        }

        return NextResponse.json({
            data: data || [],
            pagination: { page, limit, total: count || 0, has_more: (count || 0) > offset + limit },
        });
    } catch (error) {
        console.error('Merchants API error:', error);
        return NextResponse.json({ error: 'Failed to load merchants. Please refresh and try again.' }, { status: 500 });
    }
}

export async function PATCH(request: NextRequest) {
    try {
        const authResult = await requireAdmin();
        if (authResult instanceof NextResponse) return authResult;

        const supabase = getServiceClient();
        const body = await request.json();
        const { id, ...updates } = body;

        if (!id) {
            return NextResponse.json({ error: 'Merchant ID required' }, { status: 400 });
        }

        const allowedFields = [
            'status', 'can_ship', 'kyb_status', 'company_name', 'email', 'phone',
            'website_url', 'billing_name', 'billing_email', 'tier', 'price_adjustment_percent',
        ];
        const safeUpdates: Record<string, unknown> = {};
        for (const key of allowedFields) {
            if (updates[key] !== undefined) {
                safeUpdates[key] = updates[key];
            }
        }

        if (Object.keys(safeUpdates).length === 0) {
            return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
        }

        const { data, error } = await supabase
            .from('merchants')
            .update(safeUpdates)
            .eq('id', id)
            .select()
            .single();

        if (error) {
            console.error('Merchant update error:', error);
            return NextResponse.json({ error: 'Failed to update merchant. The database rejected the changes — verify the data and try again.' }, { status: 500 });
        }

        // Audit log -- ignore errors if table doesn't exist
        await supabase.from('audit_events').insert({
            action: 'merchant.updated',
            entity_type: 'merchant',
            entity_id: id,
            new_values: safeUpdates,
        }).then(() => {}, () => {});

        return NextResponse.json({ data });
    } catch (error) {
        console.error('Merchants PATCH error:', error);
        return NextResponse.json({ error: 'Failed to update merchant due to an unexpected error. Please try again.' }, { status: 500 });
    }
}
