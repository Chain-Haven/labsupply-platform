import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Mark this route as dynamic
export const dynamic = 'force-dynamic';

// ChargX API Configuration
const CHARGX_BASE_URL = 'https://api.chargx.io';
const CHARGX_PUBLISHABLE_KEY = process.env.CHARGX_PUBLISHABLE_KEY || '';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

/**
 * POST /api/v1/wallet/topup
 * Process wallet top-up using ChargX payment
 */
export async function POST(request: NextRequest) {
    try {
        // Validate configuration
        if (!CHARGX_PUBLISHABLE_KEY || !supabaseUrl || !supabaseServiceKey) {
            console.error('Payment system not configured');
            return NextResponse.json(
                { error: 'Payment system not configured. Contact support.' },
                { status: 503 }
            );
        }

        const supabase = createClient(supabaseUrl, supabaseServiceKey);
        const body = await request.json();
        const { amount, opaqueData, customer, billingAddress, saveCard } = body;

        // Get merchant ID from header
        const merchantId = request.headers.get('x-merchant-id');
        if (!merchantId) {
            return NextResponse.json(
                { error: 'Authentication required' },
                { status: 401 }
            );
        }

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

        // Get merchant's wallet
        const { data: wallet, error: walletError } = await supabase
            .from('wallet_accounts')
            .select('*')
            .eq('merchant_id', merchantId)
            .single();

        if (walletError || !wallet) {
            return NextResponse.json(
                { error: 'Wallet not found. Please complete merchant setup.' },
                { status: 404 }
            );
        }

        // Generate internal order ID
        const internalOrderId = `topup_${Date.now()}_${merchantId.slice(0, 8)}`;
        const amountCents = Math.round(amount * 100);

        // Call ChargX transact API
        const transactResponse = await fetch(`${CHARGX_BASE_URL}/transact`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-publishable-api-key': CHARGX_PUBLISHABLE_KEY,
            },
            body: JSON.stringify({
                amount: String(amount),
                currency: 'USD',
                type: 'fiat',
                opaqueData,
                customer: {
                    name: customer.name,
                    email: customer.email,
                    phone: customer.phone,
                },
                billingAddress: billingAddress ? {
                    ...billingAddress,
                    countryCode: billingAddress.countryCode || 'USA',
                } : undefined,
                orderId: internalOrderId,
            }),
        });

        const transactResult = await transactResponse.json();

        if (!transactResponse.ok || !transactResult.result) {
            const errorMessage = transactResult.error?.[0]?.errorText || transactResult.message || 'Payment failed';
            console.error('ChargX payment failed:', transactResult);
            return NextResponse.json(
                { error: errorMessage },
                { status: 400 }
            );
        }

        // Update wallet balance
        const newBalance = wallet.balance_cents + amountCents;
        const { error: updateError } = await supabase
            .from('wallet_accounts')
            .update({
                balance_cents: newBalance,
                updated_at: new Date().toISOString(),
            })
            .eq('id', wallet.id);

        if (updateError) {
            console.error('CRITICAL: Wallet update failed after successful payment', {
                merchantId,
                orderId: transactResult.result.orderId,
                amount: amountCents,
            });
            return NextResponse.json(
                { error: 'Payment succeeded but balance update failed. Contact support.' },
                { status: 500 }
            );
        }

        // Record transaction
        await supabase.from('wallet_transactions').insert({
            wallet_id: wallet.id,
            merchant_id: merchantId,
            type: 'TOP_UP',
            amount_cents: amountCents,
            balance_before_cents: wallet.balance_cents,
            balance_after_cents: newBalance,
            payment_provider: 'chargx',
            payment_reference: transactResult.result.orderId,
            payment_display_id: transactResult.result.orderDisplayId,
            status: 'COMPLETED',
            metadata: {
                customer_email: customer.email,
                card_saved: !!saveCard,
            },
            created_at: new Date().toISOString(),
        });

        return NextResponse.json({
            success: true,
            message: 'Wallet topped up successfully',
            result: {
                amount_cents: amountCents,
                new_balance_cents: newBalance,
                transaction_id: transactResult.result.orderId,
                display_id: transactResult.result.orderDisplayId,
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
