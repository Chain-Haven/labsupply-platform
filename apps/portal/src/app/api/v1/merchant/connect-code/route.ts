/**
 * POST /api/v1/merchant/connect-code
 * Generate a connect code for the authenticated merchant to link a WooCommerce store
 */

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createRouteHandlerClient } from '@/lib/supabase-server';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

export async function POST() {
    try {
        // Authenticate merchant
        const supabase = createRouteHandlerClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const serviceClient = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );

        // Get merchant
        const { data: merchant } = await serviceClient
            .from('merchants')
            .select('id, status')
            .eq('user_id', user.id)
            .single();

        if (!merchant) {
            return NextResponse.json({ error: 'Merchant not found' }, { status: 404 });
        }

        // Generate a unique connect code (format: XXXX-XXXX-XXXX)
        const rawCode = crypto.randomBytes(9).toString('base64url').toUpperCase().slice(0, 12);
        const formattedCode = `${rawCode.slice(0, 4)}-${rawCode.slice(4, 8)}-${rawCode.slice(8, 12)}`;
        const flatCode = rawCode; // stored without dashes

        // Expires in 24 hours
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

        // Insert connect code
        const { data: code, error } = await serviceClient
            .from('connect_codes')
            .insert({
                merchant_id: merchant.id,
                code: flatCode,
                expires_at: expiresAt.toISOString(),
            })
            .select('id, code, expires_at')
            .single();

        if (error) {
            console.error('Connect code creation error:', error);
            return NextResponse.json({ error: 'Failed to create connect code' }, { status: 500 });
        }

        return NextResponse.json({
            data: {
                code: formattedCode,
                flat_code: flatCode,
                expires_at: expiresAt.toISOString(),
            },
        });
    } catch (error) {
        console.error('Connect code error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
