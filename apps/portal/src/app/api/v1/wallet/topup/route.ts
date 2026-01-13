import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/v1/wallet/topup
 * Process wallet top-up using ChargX payment (demo mode)
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();

        const { amount, opaqueData, customer, billingAddress, saveCard } = body;

        // Validate required fields
        if (!amount || amount < 5) {
            return NextResponse.json(
                { error: 'Minimum top-up amount is $5.00' },
                { status: 400 }
            );
        }

        if (!opaqueData || (!opaqueData.token && !opaqueData.dataValue)) {
            return NextResponse.json(
                { error: 'Payment token is required' },
                { status: 400 }
            );
        }

        if (!customer?.name || !customer?.email) {
            return NextResponse.json(
                { error: 'Customer name and email are required' },
                { status: 400 }
            );
        }

        // Simulate ChargX API call delay
        await new Promise(resolve => setTimeout(resolve, 1000));

        // In demo mode, always succeed
        // In production, this would call ChargX /transact endpoint
        const transactionId = `order_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
        const displayId = Math.floor(Math.random() * 9000 + 1000).toString();
        const amountCents = Math.round(amount * 100);

        // Mock: Simulate a declined card for specific test card number
        // (In demo mode, we can't actually check the card, but this shows the error handling works)

        return NextResponse.json({
            success: true,
            message: 'Wallet topped up successfully',
            result: {
                amount_cents: amountCents,
                new_balance_cents: 50000 + amountCents, // Mock: add to existing balance
                transaction_id: transactionId,
                display_id: displayId,
                card_saved: !!saveCard,
            },
        });

    } catch (error) {
        console.error('Wallet top-up error:', error);
        return NextResponse.json(
            { error: 'Payment processing failed' },
            { status: 500 }
        );
    }
}
