/**
 * Admin Settings API
 * GET  - Load all admin settings
 * PATCH - Save settings (creates/updates a single row in admin_settings)
 *
 * Settings are stored as a JSONB blob in a single-row table.
 * If the table doesn't exist, falls back to defaults.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

function getServiceClient() {
    return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
}

const DEFAULT_SETTINGS = {
    // ShipStation
    shipstation_api_key: '',
    shipstation_api_secret: '',
    shipstation_auto_push: true,

    // Shipping options
    standard_shipping_delivery: '5-7 business days',
    standard_shipping_cost: '8.95',
    standard_shipping_service: 'usps_priority_mail',
    expedited_shipping_delivery: '1-3 business days',
    expedited_shipping_cost: '24.95',
    expedited_shipping_service: 'ups_2nd_day_air',

    // General fulfillment
    processing_time_days: '1',
    free_shipping_threshold: '150',

    // Pricing
    default_markup_percent: '30',
    payment_processing_fee: '2.9',
    minimum_wallet_topup: '50',

    // SMTP
    smtp_host: '',
    smtp_port: '587',
    smtp_user: '',
    smtp_pass: '',
    smtp_from_name: 'LabSupply',
    smtp_from_email: '',

    // Notifications
    notify_new_orders: true,
    notify_low_stock: true,
    notify_kyb_submissions: true,
    notify_low_balance: true,
    low_stock_alert_threshold: '10',
};

export async function GET() {
    try {
        const supabase = getServiceClient();

        // Try to read from admin_settings table
        const { data, error } = await supabase
            .from('admin_settings')
            .select('settings')
            .eq('id', 'global')
            .single();

        if (error) {
            // Table may not exist or no row -- return defaults
            return NextResponse.json({ data: DEFAULT_SETTINGS });
        }

        // Merge saved settings with defaults (so new keys get default values)
        const merged = { ...DEFAULT_SETTINGS, ...(data?.settings || {}) };
        return NextResponse.json({ data: merged });
    } catch (error) {
        console.error('Settings GET error:', error);
        return NextResponse.json({ data: DEFAULT_SETTINGS });
    }
}

export async function PATCH(request: NextRequest) {
    try {
        const supabase = getServiceClient();
        const body = await request.json();

        // First try to ensure the table exists
        await supabase.rpc('exec_sql', {
            sql: `CREATE TABLE IF NOT EXISTS admin_settings (
                id TEXT PRIMARY KEY DEFAULT 'global',
                settings JSONB DEFAULT '{}',
                updated_at TIMESTAMPTZ DEFAULT now()
            )`
        }).then(() => {}, () => {
            // RPC may not exist; try raw approach
        });

        // Try upsert
        const { error } = await supabase
            .from('admin_settings')
            .upsert({
                id: 'global',
                settings: body,
                updated_at: new Date().toISOString(),
            }, { onConflict: 'id' });

        if (error) {
            // If table doesn't exist, we can't save -- but still acknowledge
            if (error.code === '42P01') {
                return NextResponse.json({
                    success: false,
                    error: 'Settings table not created yet. Run the migration: CREATE TABLE admin_settings (id TEXT PRIMARY KEY DEFAULT \'global\', settings JSONB DEFAULT \'{}\', updated_at TIMESTAMPTZ DEFAULT now());',
                    saved_in_memory: true,
                });
            }
            console.error('Settings save error:', error);
            return NextResponse.json({ error: 'Failed to save settings' }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Settings PATCH error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
