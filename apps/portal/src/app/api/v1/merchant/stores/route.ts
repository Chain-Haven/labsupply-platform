/**
 * GET /api/v1/merchant/stores
 * List connected stores for the authenticated merchant
 */

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createRouteHandlerClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const supabase = createRouteHandlerClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const serviceClient = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );

        const { data: merchant } = await serviceClient
            .from('merchants')
            .select('id')
            .eq('user_id', user.id)
            .single();

        if (!merchant) {
            return NextResponse.json({ data: [] });
        }

        const { data: stores, error } = await serviceClient
            .from('stores')
            .select('id, name, url, status, type, currency, last_sync_at, created_at')
            .eq('merchant_id', merchant.id)
            .order('created_at', { ascending: false });

        if (error) {
            return NextResponse.json({ data: [] });
        }

        return NextResponse.json({ data: stores || [] });
    } catch (error) {
        console.error('Merchant stores error:', error);
        return NextResponse.json({ data: [] });
    }
}
