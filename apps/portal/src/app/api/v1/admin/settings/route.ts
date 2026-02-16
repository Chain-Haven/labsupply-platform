/**
 * Admin Settings API
 * GET  - Load all admin settings
 * PATCH - Save settings
 *
 * Tries admin_settings table first. If it doesn't exist, returns a flag
 * so the client can use localStorage as fallback.
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

const DEFAULT_SETTINGS: Record<string, string | boolean> = {
    shipstation_api_key: '',
    shipstation_api_secret: '',
    shipstation_auto_push: true,
    standard_shipping_delivery: '5-7 business days',
    standard_shipping_cost: '8.95',
    standard_shipping_service: 'usps_priority_mail',
    expedited_shipping_delivery: '1-3 business days',
    expedited_shipping_cost: '24.95',
    expedited_shipping_service: 'ups_2nd_day_air',
    processing_time_days: '1',
    free_shipping_threshold: '150',
    default_markup_percent: '30',
    payment_processing_fee: '2.9',
    minimum_wallet_topup: '50',
    smtp_host: '',
    smtp_port: '587',
    smtp_user: '',
    smtp_pass: '',
    smtp_from_name: 'LabSupply',
    smtp_from_email: '',
    notify_new_orders: true,
    notify_low_stock: true,
    notify_kyb_submissions: true,
    notify_low_balance: true,
    low_stock_alert_threshold: '10',
    mercury_ach_enabled: true,
    mercury_cc_enabled: false,
    mercury_real_account: false,
    mercury_destination_account_id: '',
};

export async function GET() {
    try {
        const authResult = await requireAdmin();
        if (authResult instanceof NextResponse) return authResult;

        const supabase = getServiceClient();

        const { data, error } = await supabase
            .from('admin_settings')
            .select('settings')
            .eq('id', 'global')
            .single();

        if (error) {
            // Table doesn't exist or empty -- return defaults with flag
            return NextResponse.json({
                data: DEFAULT_SETTINGS,
                source: error.code === '42P01' ? 'defaults_no_table' : 'defaults',
            });
        }

        const merged = { ...DEFAULT_SETTINGS, ...(data?.settings || {}) };
        return NextResponse.json({ data: merged, source: 'database' });
    } catch (error) {
        console.error('Settings GET error:', error);
        return NextResponse.json({ data: DEFAULT_SETTINGS, source: 'defaults' });
    }
}

export async function PATCH(request: NextRequest) {
    try {
        const authResult = await requireAdmin();
        if (authResult instanceof NextResponse) return authResult;

        const supabase = getServiceClient();
        const body = await request.json();

        // First get existing settings so we merge, not overwrite
        const { data: existing } = await supabase
            .from('admin_settings')
            .select('settings')
            .eq('id', 'global')
            .single()
            .then(res => res, () => ({ data: null }));

        const merged = { ...(existing?.settings || {}), ...body };

        const { error } = await supabase
            .from('admin_settings')
            .upsert({
                id: 'global',
                settings: merged,
                updated_at: new Date().toISOString(),
            }, { onConflict: 'id' });

        if (error) {
            if (error.code === '42P01') {
                // Table doesn't exist -- tell client to use localStorage
                return NextResponse.json({
                    success: false,
                    useLocalStorage: true,
                    message: 'Settings saved to browser only. Create the admin_settings table for server persistence.',
                });
            }
            console.error('Settings save error:', error);
            return NextResponse.json({ success: false, error: 'Failed to save' }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Settings PATCH error:', error);
        return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
    }
}
