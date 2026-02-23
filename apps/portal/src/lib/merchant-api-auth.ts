/**
 * Server-side merchant authentication for API routes.
 * Resolves the authenticated user's merchant context, supporting both
 * direct owners (merchants.user_id) and team members (merchant_users).
 */

import { NextResponse } from 'next/server';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { createRouteHandlerClient } from '@/lib/supabase-server';

export type MerchantRole = 'MERCHANT_OWNER' | 'MERCHANT_ADMIN' | 'MERCHANT_USER';

export interface AuthenticatedMerchant {
    merchant: {
        id: string;
        user_id: string;
        email: string;
        company_name: string | null;
        status: string;
        kyb_status: string;
        [key: string]: unknown;
    };
    role: MerchantRole;
    userId: string;
}

function getServiceClient(): SupabaseClient {
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

/**
 * Resolve the current user's merchant context and role.
 * 1. Check if the user directly owns a merchant (merchants.user_id)
 * 2. Fall back to merchant_users table for team membership
 */
export async function getAuthenticatedMerchant(): Promise<AuthenticatedMerchant | null> {
    const user = await getAuthUser();
    if (!user) return null;

    const serviceClient = getServiceClient();

    const { data: ownedMerchant } = await serviceClient
        .from('merchants')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

    if (ownedMerchant) {
        return {
            merchant: ownedMerchant,
            role: 'MERCHANT_OWNER',
            userId: user.id,
        };
    }

    const { data: membership } = await serviceClient
        .from('merchant_users')
        .select('role, merchant_id')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .maybeSingle();

    if (!membership) return null;

    const { data: merchant } = await serviceClient
        .from('merchants')
        .select('*')
        .eq('id', membership.merchant_id)
        .single();

    if (!merchant) return null;

    return {
        merchant,
        role: membership.role as MerchantRole,
        userId: user.id,
    };
}

/**
 * Require merchant auth or return a 401 response.
 */
export async function requireMerchant(): Promise<{ data: AuthenticatedMerchant } | NextResponse> {
    const result = await getAuthenticatedMerchant();
    if (!result) {
        return NextResponse.json(
            { error: 'Not authenticated or no merchant profile found.' },
            { status: 401 }
        );
    }
    return { data: result };
}

/**
 * Require a specific minimum role level for merchant operations.
 * MERCHANT_OWNER > MERCHANT_ADMIN > MERCHANT_USER
 */
const ROLE_LEVELS: Record<MerchantRole, number> = {
    MERCHANT_OWNER: 3,
    MERCHANT_ADMIN: 2,
    MERCHANT_USER: 1,
};

export async function requireMerchantRole(
    minimumRole: MerchantRole
): Promise<{ data: AuthenticatedMerchant } | NextResponse> {
    const result = await requireMerchant();
    if (result instanceof NextResponse) return result;

    if (ROLE_LEVELS[result.data.role] < ROLE_LEVELS[minimumRole]) {
        return NextResponse.json(
            { error: 'Insufficient permissions for this action.' },
            { status: 403 }
        );
    }
    return result;
}

export { getServiceClient, getAuthUser };
