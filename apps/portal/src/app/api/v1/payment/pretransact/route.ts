import { NextRequest, NextResponse } from 'next/server';

// Mark this route as dynamic to prevent static generation errors
export const dynamic = 'force-dynamic';

// ChargX API Configuration
const CHARGX_BASE_URL = 'https://api.chargx.io';
const CHARGX_PUBLISHABLE_KEY = process.env.CHARGX_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_CHARGX_PUBLISHABLE_KEY || '';

/**
 * GET /api/v1/payment/pretransact
 * Proxy to ChargX to get pretransact keys for card tokenization
 */
export async function GET(request: NextRequest) {
    // Validate ChargX keys are configured
    if (!CHARGX_PUBLISHABLE_KEY || !CHARGX_PUBLISHABLE_KEY.startsWith('pk_')) {
        console.error('ChargX publishable key not configured');
        return NextResponse.json(
            {
                error: 'Payment system not configured. Please contact support.',
                code: 'PAYMENT_NOT_CONFIGURED'
            },
            { status: 503 }
        );
    }

    try {
        const response = await fetch(`${CHARGX_BASE_URL}/pretransact`, {
            method: 'GET',
            headers: {
                'x-publishable-api-key': CHARGX_PUBLISHABLE_KEY,
            },
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('ChargX pretransact failed:', response.status, errorText);
            return NextResponse.json(
                {
                    error: 'Payment initialization failed. Please try again.',
                    code: 'PRETRANSACT_FAILED'
                },
                { status: 502 }
            );
        }

        const data = await response.json();
        return NextResponse.json(data);
    } catch (error) {
        console.error('Failed to get pretransact keys:', error);
        return NextResponse.json(
            {
                error: 'Payment service unavailable. Please try again later.',
                code: 'PAYMENT_SERVICE_ERROR'
            },
            { status: 503 }
        );
    }
}
