/**
 * BTC Sync Deposits Cron
 * Runs every 5 minutes to poll the blockchain for deposits to active BTC addresses.
 *
 * Steps:
 * 1. Fetch all ACTIVE btc_addresses
 * 2. For each, poll Esplora for transactions
 * 3. Insert/update btc_deposits rows (PENDING -> CONFIRMED)
 * 4. Credit confirmed deposits to BTC wallet (idempotent)
 * 5. Rotate address on first tx detection
 * 6. Reorg safety check for previously credited deposits
 */

import { inngest } from '@/lib/inngest';
import { getServiceClient } from '@/lib/supabase';
import {
    getAddressTxs,
    getBlockHeight,
    calculateConfirmations,
    EsploraTx,
} from '@/lib/esplora';
import { getAllActiveAddresses, rotateAddress } from '@/lib/btc-address-manager';

const DEFAULT_CONFIRMATION_THRESHOLD = 3;

async function getConfirmationThreshold(
    supabase: ReturnType<typeof getServiceClient>
): Promise<number> {
    const { data } = await supabase
        .from('admin_crypto_settings')
        .select('value_encrypted')
        .eq('key', 'btc_confirmation_threshold')
        .single();

    if (data?.value_encrypted) {
        const val = parseInt(data.value_encrypted, 10);
        if (!isNaN(val) && val > 0) return val;
    }

    return DEFAULT_CONFIRMATION_THRESHOLD;
}

export const btcSyncDepositsFunction = inngest.createFunction(
    {
        id: 'btc-sync-deposits',
        name: 'BTC: Sync Deposit Statuses',
        retries: 2,
        concurrency: [{ limit: 1 }],
    },
    { cron: '*/5 * * * *' },
    async ({ step }) => {
        const supabase = getServiceClient();

        // Step 1: Get all active addresses + current block height + confirmation threshold
        const { activeAddresses, currentBlockHeight, threshold } = await step.run(
            'get-active-addresses',
            async () => {
                const [addresses, blockHeight, confThreshold] = await Promise.all([
                    getAllActiveAddresses(supabase),
                    getBlockHeight(),
                    getConfirmationThreshold(supabase),
                ]);

                return {
                    activeAddresses: addresses,
                    currentBlockHeight: blockHeight,
                    threshold: confThreshold,
                };
            }
        );

        if (activeAddresses.length === 0) {
            return { message: 'No active BTC addresses to monitor', processed: 0 };
        }

        // Step 2: Poll Esplora for each address and process deposits
        const pollResults = await step.run('poll-and-process', async () => {
            const newDeposits: string[] = [];
            const updatedDeposits: string[] = [];
            const rotatedAddresses: string[] = [];
            const errors: Array<{ address: string; error: string }> = [];

            for (const addr of activeAddresses) {
                try {
                    const txs = await getAddressTxs(addr.address);

                    if (txs.length === 0) continue;

                    let addressHasNewTx = false;

                    for (const tx of txs) {
                        // Find outputs paying to our address
                        for (let voutIdx = 0; voutIdx < tx.vout.length; voutIdx++) {
                            const output = tx.vout[voutIdx];
                            if (output.scriptpubkey_address !== addr.address) continue;

                            const confirmations = calculateConfirmations(
                                tx.status.block_height,
                                currentBlockHeight
                            );

                            // Check if this deposit already exists (idempotent by txid+vout)
                            const { data: existing } = await supabase
                                .from('btc_deposits')
                                .select('id, status, confirmations')
                                .eq('txid', tx.txid)
                                .eq('vout', voutIdx)
                                .maybeSingle();

                            if (!existing) {
                                // New deposit detected
                                const newStatus = confirmations >= threshold ? 'CONFIRMED' : 'PENDING';

                                const { error: insertErr } = await supabase
                                    .from('btc_deposits')
                                    .insert({
                                        merchant_id: addr.merchant_id,
                                        purpose: addr.purpose,
                                        address: addr.address,
                                        derivation_index: addr.derivation_index,
                                        txid: tx.txid,
                                        vout: voutIdx,
                                        amount_sats: output.value,
                                        confirmations,
                                        block_height: tx.status.block_height || null,
                                        status: newStatus,
                                        raw_provider_payload: tx as unknown as Record<string, unknown>,
                                    });

                                if (!insertErr) {
                                    newDeposits.push(tx.txid);
                                    addressHasNewTx = true;
                                }
                            } else if (existing.status === 'PENDING') {
                                // Update confirmations for pending deposits
                                const newStatus = confirmations >= threshold ? 'CONFIRMED' : 'PENDING';

                                const { error: updateErr } = await supabase
                                    .from('btc_deposits')
                                    .update({
                                        confirmations,
                                        block_height: tx.status.block_height || existing.id, // keep existing if null
                                        status: newStatus,
                                    })
                                    .eq('id', existing.id);

                                if (!updateErr && newStatus !== existing.status) {
                                    updatedDeposits.push(tx.txid);
                                }
                            } else if (existing.status === 'CONFIRMED' || existing.status === 'CREDITED') {
                                // Update confirmation count for tracking
                                await supabase
                                    .from('btc_deposits')
                                    .update({ confirmations })
                                    .eq('id', existing.id);
                            }
                        }
                    }

                    // Rotate address if new tx detected on it
                    if (addressHasNewTx) {
                        try {
                            await rotateAddress(supabase, addr.id, addr.merchant_id, addr.purpose as 'TOPUP' | 'TIP');
                            rotatedAddresses.push(addr.address);
                        } catch (rotateErr) {
                            console.error(`Failed to rotate address ${addr.address}:`, rotateErr);
                        }
                    }
                } catch (err) {
                    console.error(`Error polling address ${addr.address}:`, err);
                    errors.push({
                        address: addr.address,
                        error: (err as Error).message,
                    });
                }
            }

            return { newDeposits, updatedDeposits, rotatedAddresses, errors };
        });

        // Step 3: Credit confirmed deposits to BTC wallets
        const creditResults = await step.run('credit-wallets', async () => {
            const credited: Array<{ depositId: string; merchantId: string; sats: number }> = [];
            const creditErrors: Array<{ depositId: string; error: string }> = [];

            // Find all CONFIRMED deposits that haven't been credited yet
            const { data: confirmedDeposits, error: fetchErr } = await supabase
                .from('btc_deposits')
                .select('*')
                .eq('status', 'CONFIRMED')
                .is('wallet_transaction_id', null);

            if (fetchErr || !confirmedDeposits || confirmedDeposits.length === 0) {
                return { credited, creditErrors };
            }

            for (const deposit of confirmedDeposits) {
                try {
                    // Idempotent claim: atomically move from CONFIRMED to CREDITED
                    const { data: claimed, error: claimErr } = await supabase
                        .from('btc_deposits')
                        .update({ status: 'CREDITED', credited_at: new Date().toISOString() })
                        .eq('id', deposit.id)
                        .eq('status', 'CONFIRMED')
                        .select('id')
                        .single();

                    if (claimErr || !claimed) {
                        continue; // Already claimed by another run
                    }

                    // Get the BTC wallet for this merchant
                    const { data: wallet, error: walletErr } = await supabase
                        .from('wallet_accounts')
                        .select('id, balance_cents')
                        .eq('merchant_id', deposit.merchant_id)
                        .eq('currency', 'BTC')
                        .single();

                    if (walletErr || !wallet) {
                        console.error(`BTC wallet not found for merchant ${deposit.merchant_id}`);
                        // Rollback the claim
                        await supabase
                            .from('btc_deposits')
                            .update({ status: 'CONFIRMED', credited_at: null })
                            .eq('id', deposit.id);
                        creditErrors.push({ depositId: deposit.id, error: 'Wallet not found' });
                        continue;
                    }

                    const newBalance = wallet.balance_cents + Number(deposit.amount_sats);

                    // Atomic balance update
                    const { error: updateErr } = await supabase
                        .from('wallet_accounts')
                        .update({ balance_cents: newBalance })
                        .eq('id', wallet.id)
                        .eq('balance_cents', wallet.balance_cents);

                    if (updateErr) {
                        // Rollback
                        await supabase
                            .from('btc_deposits')
                            .update({ status: 'CONFIRMED', credited_at: null })
                            .eq('id', deposit.id);
                        creditErrors.push({ depositId: deposit.id, error: 'Balance update failed' });
                        continue;
                    }

                    // Record wallet transaction
                    const txType = deposit.purpose === 'TIP' ? 'BTC_DEPOSIT_TIP' : 'BTC_DEPOSIT_TOPUP';
                    const { data: txn } = await supabase
                        .from('wallet_transactions')
                        .insert({
                            merchant_id: deposit.merchant_id,
                            wallet_id: wallet.id,
                            type: txType,
                            amount_cents: Number(deposit.amount_sats),
                            balance_after_cents: newBalance,
                            reference_type: 'btc_deposit',
                            reference_id: deposit.id,
                            description: `BTC deposit ${deposit.txid.substring(0, 8)}... (${deposit.amount_sats} sats)`,
                            metadata: {
                                txid: deposit.txid,
                                vout: deposit.vout,
                                amount_sats: deposit.amount_sats,
                                address: deposit.address,
                                purpose: deposit.purpose,
                            },
                        })
                        .select('id')
                        .single();

                    // Link transaction to deposit
                    if (txn?.id) {
                        await supabase
                            .from('btc_deposits')
                            .update({ wallet_transaction_id: txn.id })
                            .eq('id', deposit.id);
                    }

                    credited.push({
                        depositId: deposit.id,
                        merchantId: deposit.merchant_id,
                        sats: Number(deposit.amount_sats),
                    });
                } catch (err) {
                    creditErrors.push({
                        depositId: deposit.id,
                        error: (err as Error).message,
                    });
                }
            }

            return { credited, creditErrors };
        });

        // Step 4: Reorg safety check
        const reorgResults = await step.run('reorg-check', async () => {
            const flagged: string[] = [];

            // Check all CREDITED deposits to make sure they still have enough confirmations
            const { data: creditedDeposits } = await supabase
                .from('btc_deposits')
                .select('id, txid, block_height, confirmations, merchant_id')
                .eq('status', 'CREDITED')
                .not('block_height', 'is', null);

            if (!creditedDeposits || creditedDeposits.length === 0) {
                return { flagged };
            }

            for (const deposit of creditedDeposits) {
                const newConfs = calculateConfirmations(
                    deposit.block_height,
                    currentBlockHeight
                );

                // If confirmations dropped below threshold, flag it
                if (newConfs < threshold && deposit.confirmations >= threshold) {
                    await supabase
                        .from('btc_deposits')
                        .update({ status: 'FLAGGED', confirmations: newConfs })
                        .eq('id', deposit.id);

                    flagged.push(deposit.id);

                    // Create admin notification
                    await supabase.from('audit_events').insert({
                        action: 'btc.reorg_detected',
                        entity_type: 'btc_deposit',
                        entity_id: deposit.id,
                        metadata: {
                            txid: deposit.txid,
                            merchant_id: deposit.merchant_id,
                            old_confirmations: deposit.confirmations,
                            new_confirmations: newConfs,
                            threshold,
                        },
                    });
                }
            }

            return { flagged };
        });

        // Step 5: Audit log
        await step.run('log-audit', async () => {
            const totalProcessed =
                pollResults.newDeposits.length +
                pollResults.updatedDeposits.length +
                creditResults.credited.length;

            if (totalProcessed > 0 || reorgResults.flagged.length > 0) {
                await supabase.from('audit_events').insert({
                    action: 'btc.sync_deposits_batch',
                    entity_type: 'system',
                    entity_id: 'btc-sync-deposits',
                    metadata: {
                        addresses_checked: activeAddresses.length,
                        new_deposits: pollResults.newDeposits.length,
                        updated_deposits: pollResults.updatedDeposits.length,
                        credited: creditResults.credited.length,
                        rotated_addresses: pollResults.rotatedAddresses.length,
                        flagged_reorgs: reorgResults.flagged.length,
                        errors: pollResults.errors.length + creditResults.creditErrors.length,
                    },
                });
            }
        });

        return {
            addressesChecked: activeAddresses.length,
            newDeposits: pollResults.newDeposits.length,
            updatedDeposits: pollResults.updatedDeposits.length,
            credited: creditResults.credited.length,
            rotatedAddresses: pollResults.rotatedAddresses.length,
            flaggedReorgs: reorgResults.flagged.length,
            errors: pollResults.errors.length,
        };
    }
);
