/**
 * GET /api/v1/merchant/testing-labs
 * Returns active testing labs for merchant-facing testing order flow.
 * Authenticated merchants can see active labs but cannot modify them.
 */

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createRouteHandlerClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

function getServiceClient() {
    return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
}

export async function GET() {
    try {
        const supabase = createRouteHandlerClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
        }

        const sc = getServiceClient();

        const { data: merchant } = await sc
            .from('merchants')
            .select('id')
            .eq('user_id', user.id)
            .single();

        if (!merchant) {
            return NextResponse.json({ error: 'Merchant profile not found' }, { status: 404 });
        }

        const { data, error } = await sc
            .from('testing_labs')
            .select('id, name, email, phone, is_default, active')
            .eq('active', true)
            .order('is_default', { ascending: false })
            .order('name', { ascending: true });

        if (error) {
            return NextResponse.json({ data: [] });
        }

        return NextResponse.json({ data: data || [] });
    } catch (error) {
        console.error('Merchant testing labs error:', error);
        return NextResponse.json({ data: [] });
    }
}
