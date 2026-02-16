/**
 * WhiteLabel Peptides Platform - Database Seed Script
 * Creates sample data for development and testing
 */

import { createClient } from '@supabase/supabase-js';
import { randomBytes, createHash } from 'crypto';

// Get environment variables
const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing required environment variables:');
    console.error('- SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL');
    console.error('- SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false,
    },
});

function generateUUID(): string {
    return crypto.randomUUID();
}

function hashSecret(secret: string): string {
    return createHash('sha256').update(secret).digest('hex');
}

async function seed() {
    console.log('🌱 Starting database seed...\n');

    // ============================================================================
    // PRODUCTS
    // ============================================================================
    console.log('📦 Creating products...');

    const products = [
        {
            id: generateUUID(),
            sku: 'BPC-157-5MG',
            name: 'BPC-157 5mg',
            description: 'Body Protection Compound-157 (BPC-157) is a synthetic peptide derived from a sequence found in human gastric juice.',
            short_description: 'Research peptide - 5mg vial',
            cost_cents: 1500,
            active: true,
            requires_coa: true,
            compliance_copy: 'FOR RESEARCH USE ONLY. Not for human consumption.',
            disclaimer: 'This product is intended solely for in-vitro research and laboratory testing.',
            min_order_qty: 1,
            max_order_qty: 100,
            category: 'Peptides',
            tags: ['peptide', 'research', 'bpc-157'],
            weight_grams: 50,
            dimensions: { length_cm: 5, width_cm: 3, height_cm: 3 },
        },
        {
            id: generateUUID(),
            sku: 'BPC-157-10MG',
            name: 'BPC-157 10mg',
            description: 'Body Protection Compound-157 (BPC-157) is a synthetic peptide derived from a sequence found in human gastric juice. Higher concentration.',
            short_description: 'Research peptide - 10mg vial',
            cost_cents: 2500,
            active: true,
            requires_coa: true,
            compliance_copy: 'FOR RESEARCH USE ONLY. Not for human consumption.',
            disclaimer: 'This product is intended solely for in-vitro research and laboratory testing.',
            min_order_qty: 1,
            max_order_qty: 50,
            category: 'Peptides',
            tags: ['peptide', 'research', 'bpc-157'],
            weight_grams: 50,
            dimensions: { length_cm: 5, width_cm: 3, height_cm: 3 },
        },
        {
            id: generateUUID(),
            sku: 'TB-500-5MG',
            name: 'TB-500 5mg',
            description: 'Thymosin Beta-4 (TB-500) is a naturally occurring peptide present in almost all animal and human cells.',
            short_description: 'Research peptide - 5mg vial',
            cost_cents: 2000,
            active: true,
            requires_coa: true,
            compliance_copy: 'FOR RESEARCH USE ONLY. Not for human consumption.',
            min_order_qty: 1,
            category: 'Peptides',
            tags: ['peptide', 'research', 'tb-500', 'thymosin'],
            weight_grams: 50,
        },
        {
            id: generateUUID(),
            sku: 'GHK-CU-50MG',
            name: 'GHK-Cu 50mg',
            description: 'GHK-Cu (copper peptide) is a naturally occurring copper complex of the tripeptide glycyl-L-histidyl-L-lysine.',
            short_description: 'Copper peptide complex - 50mg',
            cost_cents: 3500,
            active: true,
            requires_coa: true,
            compliance_copy: 'FOR RESEARCH USE ONLY. Not for human consumption.',
            min_order_qty: 1,
            category: 'Peptides',
            tags: ['peptide', 'research', 'copper', 'ghk-cu'],
            weight_grams: 55,
        },
        {
            id: generateUUID(),
            sku: 'NAD-500MG',
            name: 'NAD+ 500mg',
            description: 'Nicotinamide adenine dinucleotide (NAD+) is a coenzyme found in all living cells.',
            short_description: 'Research compound - 500mg',
            cost_cents: 4500,
            active: true,
            requires_coa: false,
            compliance_copy: 'FOR RESEARCH USE ONLY.',
            min_order_qty: 1,
            category: 'Research Compounds',
            tags: ['nad', 'research', 'coenzyme'],
            weight_grams: 60,
        },
    ];

    for (const product of products) {
        const { error } = await supabase.from('products').upsert(product, { onConflict: 'sku' });
        if (error) {
            console.error(`  ❌ Failed to create product ${product.sku}:`, error.message);
        } else {
            console.log(`  ✓ Created product: ${product.sku}`);
        }
    }

    // ============================================================================
    // LOTS (COAs)
    // ============================================================================
    console.log('\n📋 Creating lots...');

    const lots = [
        {
            id: generateUUID(),
            product_id: products[0].id,
            lot_code: 'BPC-2024-001',
            manufactured_at: '2024-01-15',
            expires_at: '2026-01-15',
            quantity: 500,
            notes: 'Initial production batch',
        },
        {
            id: generateUUID(),
            product_id: products[1].id,
            lot_code: 'BPC10-2024-001',
            manufactured_at: '2024-01-20',
            expires_at: '2026-01-20',
            quantity: 300,
        },
        {
            id: generateUUID(),
            product_id: products[2].id,
            lot_code: 'TB500-2024-001',
            manufactured_at: '2024-02-01',
            expires_at: '2026-02-01',
            quantity: 400,
        },
    ];

    for (const lot of lots) {
        const { error } = await supabase.from('lots').upsert(lot, { onConflict: 'product_id,lot_code' });
        if (error) {
            console.error(`  ❌ Failed to create lot ${lot.lot_code}:`, error.message);
        } else {
            console.log(`  ✓ Created lot: ${lot.lot_code}`);
        }
    }

    // ============================================================================
    // SET INVENTORY
    // ============================================================================
    console.log('\n📊 Setting inventory levels...');

    for (const product of products) {
        const { error } = await supabase
            .from('inventory')
            .update({ on_hand: Math.floor(Math.random() * 500) + 100, reserved: 0 })
            .eq('product_id', product.id);

        if (error) {
            console.error(`  ❌ Failed to set inventory for ${product.sku}:`, error.message);
        } else {
            console.log(`  ✓ Set inventory for: ${product.sku}`);
        }
    }

    // ============================================================================
    // DEMO MERCHANT (only in development)
    // ============================================================================
    if (process.env.NODE_ENV !== 'production') {
        console.log('\n🏪 Creating demo merchant...');

        const demoMerchant = {
            id: generateUUID(),
            name: 'Demo Research Lab',
            company_name: 'Demo Research Labs Inc.',
            contact_email: 'demo@example.com',
            contact_phone: '+1-555-0100',
            status: 'ACTIVE',
            tier: 'standard',
            terms_accepted_at: new Date().toISOString(),
            agreement_accepted_at: new Date().toISOString(),
            allowed_regions: ['US'],
            billing_address: {
                address_1: '123 Research Way',
                city: 'San Francisco',
                state: 'CA',
                postcode: '94105',
                country: 'US',
            },
        };

        const { error: merchantError } = await supabase.from('merchants').upsert(demoMerchant);

        if (merchantError) {
            console.error('  ❌ Failed to create demo merchant:', merchantError.message);
        } else {
            console.log('  ✓ Created demo merchant: Demo Research Lab');

            // Create merchant products (whitelist all products)
            console.log('\n🔗 Setting up merchant product whitelist...');

            for (const product of products) {
                const merchantProduct = {
                    id: generateUUID(),
                    merchant_id: demoMerchant.id,
                    product_id: product.id,
                    allowed: true,
                    wholesale_price_cents: Math.round(product.cost_cents * 1.5),
                    map_price_cents: Math.round(product.cost_cents * 2.5),
                    sync_title: true,
                    sync_description: true,
                    sync_price: true,
                };

                const { error } = await supabase.from('merchant_products').upsert(merchantProduct);
                if (error) {
                    console.error(`  ❌ Failed to whitelist ${product.sku}:`, error.message);
                } else {
                    console.log(`  ✓ Whitelisted: ${product.sku}`);
                }
            }

            // Create a demo store
            console.log('\n🔌 Creating demo store connection...');

            const storeSecret = randomBytes(32).toString('base64url');
            const demoStore = {
                id: generateUUID(),
                merchant_id: demoMerchant.id,
                type: 'woocommerce',
                name: 'Demo WooCommerce Store',
                url: 'https://demo-store.example.com',
                status: 'CONNECTED',
                currency: 'USD',
                timezone: 'America/Los_Angeles',
                woo_version: '8.4.0',
            };

            const { error: storeError } = await supabase.from('stores').upsert(demoStore);

            if (storeError) {
                console.error('  ❌ Failed to create demo store:', storeError.message);
            } else {
                console.log('  ✓ Created demo store');

                // Create store secret
                const { error: secretError } = await supabase.from('store_secrets').insert({
                    id: generateUUID(),
                    store_id: demoStore.id,
                    secret_hash: hashSecret(storeSecret),
                    is_active: true,
                });

                if (secretError) {
                    console.error('  ❌ Failed to create store secret:', secretError.message);
                } else {
                    console.log('  ✓ Created store secret');
                    console.log(`\n  📝 Demo Store Secret (save this): ${storeSecret}`);
                    console.log(`  📝 Demo Store ID: ${demoStore.id}`);
                }
            }

            // Fund the demo wallet
            console.log('\n💰 Funding demo wallet...');

            const { data: wallet, error: walletFetchError } = await supabase
                .from('wallet_accounts')
                .select('*')
                .eq('merchant_id', demoMerchant.id)
                .single();

            if (walletFetchError || !wallet) {
                console.error('  ❌ Failed to fetch wallet:', walletFetchError?.message);
            } else {
                const { error: walletError } = await supabase
                    .from('wallet_accounts')
                    .update({ balance_cents: 50000 }) // $500
                    .eq('id', wallet.id);

                if (walletError) {
                    console.error('  ❌ Failed to fund wallet:', walletError.message);
                } else {
                    console.log('  ✓ Funded wallet with $500.00');

                    // Record the transaction
                    await supabase.from('wallet_transactions').insert({
                        id: generateUUID(),
                        merchant_id: demoMerchant.id,
                        wallet_id: wallet.id,
                        type: 'ADJUSTMENT',
                        amount_cents: 50000,
                        balance_after_cents: 50000,
                        description: 'Initial demo balance',
                    });
                }
            }
        }
    }

    console.log('\n✅ Database seed completed!\n');
}

// Run the seed
seed().catch((error) => {
    console.error('Seed failed:', error);
    process.exit(1);
});
