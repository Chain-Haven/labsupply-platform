import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { chargx, ChargXError, chargeRequestSchema } from '@/lib/chargx';
import { z } from 'zod';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Wallet top-up request schema
const topUpRequestSchema = z.object({
    amount: z.number().min(50).max(10000), // Min $50, Max $10,000
    opaqueData: z.object({
        dataDescriptor: z.string().optional(),
        dataValue: z.string().optional(),
        token: z.string().optional(),
    }).refine(
        (data) => data.token || (data.dataDescriptor && data.dataValue),
        'Payment token is required'
    ),
    vaultId: z.string().optional(),
    saveCard: z.boolean().optional(),
    customer: z.object({
        name: z.string(),
        email: z.string().email(),
        phone: z.string().optional(),
    }),
    billingAddress: z.object({
        street: z.string(),
        unit: z.string().optional(),
        city: z.string(),
        state: z.string(),
        zipCode: z.string(),
        countryCode: z.string().length(3).default('USA'),
        phone: z.string().optional(),
    }).optional(),
});

/**
 * POST /v1/wallet/topup
 * Top up merchant wallet using ChargX payment
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const validated = topUpRequestSchema.parse(body);

        // Get merchant ID from session (simplified - in production use proper auth)
        const merchantId = request.headers.get('x-merchant-id');
        if (!merchantId) {
            return NextResponse.json(
                { error: 'Authentication required' },
                { status: 401 }
            );
        }

        // Get merchant's wallet
        const { data: wallet, error: walletError } = await supabase
            .from('wallets')
            .select('*')
            .eq('merchant_id', merchantId)
            .single();

        if (walletError || !wallet) {
            return NextResponse.json(
                { error: 'Wallet not found' },
                { status: 404 }
            );
        }

        // Generate internal order ID for tracking
        const internalOrderId = `topup_${Date.now()}_${merchantId.slice(0, 8)}`;

        // Charge the card via ChargX
        const chargeResult = await chargx.chargeCard({
            amount: validated.amount,
            currency: 'USD',
            opaqueData: validated.opaqueData,
            vaultId: validated.vaultId,
            customer: validated.customer,
            billingAddress: validated.billingAddress,
            orderId: internalOrderId,
        });

        if (!chargeResult.result) {
            throw new ChargXError('Payment failed', chargeResult.error || []);
        }

        const amountCents = Math.round(validated.amount * 100);

        // Save card to vault if requested
        let vaultId: string | undefined;
        if (validated.saveCard && validated.opaqueData) {
            try {
                const vaultResult = await chargx.createVault(validated.opaqueData);
                vaultId = vaultResult.result?.customerVaultId;

                // Store vault ID with merchant (in production, store securely)
                await supabase
                    .from('merchants')
                    .update({
                        chargx_vault_id: vaultId,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', merchantId);
            } catch (vaultError) {
                console.error('Failed to save card to vault:', vaultError);
                // Don't fail the transaction, card saving is optional
            }
        }

        // Update wallet balance
        const newBalance = wallet.balance_cents + amountCents;

        const { error: updateError } = await supabase
            .from('wallets')
            .update({
                balance_cents: newBalance,
                updated_at: new Date().toISOString(),
            })
            .eq('id', wallet.id);

        if (updateError) {
            // Payment succeeded but wallet update failed - needs manual reconciliation
            console.error('CRITICAL: Wallet update failed after successful payment', {
                merchantId,
                orderId: chargeResult.result.orderId,
                amount: amountCents,
            });

            return NextResponse.json(
                { error: 'Payment succeeded but balance update failed. Please contact support.' },
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
            payment_reference: chargeResult.result.orderId,
            payment_display_id: chargeResult.result.orderDisplayId,
            status: 'COMPLETED',
            metadata: {
                customer_email: validated.customer.email,
                card_saved: !!vaultId,
            },
            created_at: new Date().toISOString(),
        });

        return NextResponse.json({
            success: true,
            message: 'Wallet topped up successfully',
            result: {
                amount_cents: amountCents,
                new_balance_cents: newBalance,
                transaction_id: chargeResult.result.orderId,
                display_id: chargeResult.result.orderDisplayId,
                card_saved: !!vaultId,
            },
        });

    } catch (error) {
        console.error('Wallet top-up error:', error);

        if (error instanceof z.ZodError) {
            return NextResponse.json(
                { error: 'Invalid request', details: error.errors },
                { status: 400 }
            );
        }

        if (error instanceof ChargXError) {
            return NextResponse.json(
                {
                    error: error.getDisplayMessage(),
                    code: error.errors[0]?.errorCode,
                },
                { status: 400 }
            );
        }

        return NextResponse.json(
            { error: 'Payment processing failed' },
            { status: 500 }
        );
    }
}
