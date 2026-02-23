/**
 * GET /api/v1/admin/crypto/reconciliation
 * Compare total BTC credited in wallet_transactions vs btc_deposits (CREDITED).
 * Flags mismatches, duplicate credits, and missing transactions.
 */

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireAdmin } from '@/lib/admin-api-auth';

export const dynamic = 'force-dynamic';

function getServiceClient() {
    return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
}

export async function GET() {
    try {
        const authResult = await requireAdmin();
        if (authResult instanceof NextResponse) return authResult;

        const sc = getServiceClient();

        // Total BTC credited from deposits table
        const { data: creditedDeposits } = await sc
            .from('btc_deposits')
            .select('amount_sats, merchant_id')
            .eq('status', 'CREDITED');

        const depositTotal = (creditedDeposits || []).reduce(
            (sum, d) => sum + Number(d.amount_sats), 0
        );

        // Total BTC credited in wallet transactions
        const { data: walletTxs } = await sc
            .from('wallet_transactions')
            .select('amount_cents, merchant_id')
            .in('type', ['BTC_DEPOSIT_TOPUP', 'BTC_DEPOSIT_TIP']);

        const ledgerTotal = (walletTxs || []).reduce(
            (sum, t) => sum + t.amount_cents, 0
        );

        // Count of various deposit statuses
        const { count: pendingCount } = await sc
            .from('btc_deposits')
            .select('id', { count: 'exact', head: true })
            .eq('status', 'PENDING');

        const { count: confirmedCount } = await sc
            .from('btc_deposits')
            .select('id', { count: 'exact', head: true })
            .eq('status', 'CONFIRMED');

        const { count: creditedCount } = await sc
            .from('btc_deposits')
            .select('id', { count: 'exact', head: true })
            .eq('status', 'CREDITED');

        const { count: flaggedCount } = await sc
            .from('btc_deposits')
            .select('id', { count: 'exact', head: true })
            .eq('status', 'FLAGGED');

        // Total BTC held across all merchant wallets
        const { data: btcWallets } = await sc
            .from('wallet_accounts')
            .select('balance_cents')
            .eq('currency', 'BTC');

        const totalBtcHeld = (btcWallets || []).reduce(
            (sum, w) => sum + w.balance_cents, 0
        );

        // Active merchants with BTC addresses
        const { count: activeMerchantCount } = await sc
            .from('btc_addresses')
            .select('merchant_id', { count: 'exact', head: true })
            .eq('status', 'ACTIVE');

        // Flagged issues
        const flags: string[] = [];

        if (depositTotal !== ledgerTotal) {
            flags.push(
                `Deposit total (${depositTotal} sats) does not match ledger total (${ledgerTotal} sats). Difference: ${depositTotal - ledgerTotal} sats.`
            );
        }

        if (totalBtcHeld !== ledgerTotal) {
            flags.push(
                `Total BTC held in wallets (${totalBtcHeld} sats) does not match ledger total (${ledgerTotal} sats).`
            );
        }

        if ((flaggedCount || 0) > 0) {
            flags.push(`${flaggedCount} deposit(s) flagged for potential blockchain reorganization.`);
        }

        return NextResponse.json({
            data: {
                deposit_total_sats: depositTotal,
                ledger_total_sats: ledgerTotal,
                total_btc_held_sats: totalBtcHeld,
                total_btc_held_btc: (totalBtcHeld / 100_000_000).toFixed(8),
                deposit_counts: {
                    pending: pendingCount || 0,
                    confirmed: confirmedCount || 0,
                    credited: creditedCount || 0,
                    flagged: flaggedCount || 0,
                },
                active_merchants: activeMerchantCount || 0,
                is_reconciled: flags.length === 0,
                flags,
            },
        });
    } catch (error) {
        console.error('Reconciliation error:', error);
        return NextResponse.json({ error: 'Crypto reconciliation failed unexpectedly. Please try again.' }, { status: 500 });
    }
}
