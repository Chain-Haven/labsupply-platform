/**
 * POST /api/v1/merchant/connect-code
 * Generate a connect code for the authenticated merchant to link a WooCommerce store
 */

import { NextResponse } from 'next/server';
import { requireMerchant, getServiceClient } from '@/lib/merchant-api-auth';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

export async function POST() {
    try {
        const authResult = await requireMerchant();
        if (authResult instanceof NextResponse) return authResult;
        const { merchant } = authResult.data;

        const serviceClient = getServiceClient();

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
            return NextResponse.json({ error: 'Failed to generate store connect code. Please try again.' }, { status: 500 });
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
        return NextResponse.json({ error: 'Connect code generation failed unexpectedly. Please try again.' }, { status: 500 });
    }
}
