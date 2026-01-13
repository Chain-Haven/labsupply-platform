import { NextRequest, NextResponse } from 'next/server';
import { chargx, ChargXError } from '@/lib/chargx';

/**
 * GET /v1/payment/pretransact
 * Get pretransact keys for card tokenization on frontend
 */
export async function GET() {
    try {
        const pretransactKeys = await chargx.getPretransactKeys();

        return NextResponse.json(pretransactKeys);
    } catch (error) {
        console.error('Failed to get pretransact keys:', error);

        if (error instanceof ChargXError) {
            return NextResponse.json(
                { error: error.getDisplayMessage() },
                { status: error.statusCode }
            );
        }

        return NextResponse.json(
            { error: 'Failed to initialize payment' },
            { status: 500 }
        );
    }
}
