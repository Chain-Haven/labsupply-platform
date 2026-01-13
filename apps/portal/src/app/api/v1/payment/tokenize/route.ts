import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/v1/payment/tokenize
 * Mock tokenization endpoint for demo/development mode
 * In production, this would be handled by ChargX's cardTokenRequestUrl
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();

        // Validate the request has card data
        const cardData = body?.securePaymentContainerRequest?.data?.token;
        if (!cardData?.cardNumber || cardData.cardNumber === '#cardNumber#') {
            return NextResponse.json(
                { error: 'Invalid card data' },
                { status: 400 }
            );
        }

        // Generate a mock token (in production, ChargX does this)
        const mockToken = `tok_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;

        // Return mock opaque data
        return NextResponse.json({
            opaqueData: {
                dataDescriptor: 'COMMON.ACCEPT.INAPP.PAYMENT',
                dataValue: mockToken,
            },
        });
    } catch (error) {
        console.error('Tokenization error:', error);
        return NextResponse.json(
            { error: 'Failed to tokenize card' },
            { status: 500 }
        );
    }
}
