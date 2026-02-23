/**
 * Testing Orders API
 * GET  - List testing orders with filters (admin only)
 * POST - Create a new testing order with addon calculations and wallet deduction
 *        Accepts merchant_id='current' to resolve from the authenticated user's session.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireAdmin } from '@/lib/admin-api-auth';
import { createRouteHandlerClient } from '@/lib/supabase-server';
import { z } from 'zod';

// Addon constants
const TESTING_ADDON_EXTRA_QTY: Record<string, number> = {
    conformity: 2, sterility: 1, endotoxins: 1, net_content: 0, purity: 0,
};
const TESTING_ADDON_FEE_CENTS: Record<string, number> = {
    conformity: 5000, sterility: 25000, endotoxins: 25000, net_content: 0, purity: 0,
};
const TESTING_SHIPPING_FEE_CENTS = 5000;

const testingOrderItemSchema = z.object({
    product_id: z.string().uuid(),
    sku: z.string().min(1).max(50),
    product_name: z.string().min(1).max(255),
    product_cost_cents: z.number().int().min(0),
    addon_conformity: z.boolean().default(false),
    addon_sterility: z.boolean().default(false),
    addon_endotoxins: z.boolean().default(false),
    addon_net_content: z.boolean().default(false),
    addon_purity: z.boolean().default(false),
});

const createTestingOrderSchema = z.object({
    merchant_id: z.union([z.literal('current'), z.string().uuid()]),
    testing_lab_id: z.string().uuid(),
    items: z.array(testingOrderItemSchema).min(1).max(50),
    notes: z.string().max(2000).optional(),
});

const testingOrderFiltersSchema = z.object({
    merchant_id: z.string().uuid().optional(),
    testing_lab_id: z.string().uuid().optional(),
    status: z.string().optional(),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
});

function validateInput<T extends z.ZodSchema>(schema: T, input: unknown) {
    const result = schema.safeParse(input);
    if (result.success) return { success: true as const, data: result.data as z.infer<T> };
    return { success: false as const, errors: result.error };
}

function formatZodErrors(error: z.ZodError) {
    const formatted: Record<string, string[]> = {};
    for (const issue of error.issues) {
        const path = issue.path.join('.');
        if (!formatted[path]) formatted[path] = [];
        formatted[path].push(issue.message);
    }
    return formatted;
}

export const dynamic = 'force-dynamic';

function getServiceClient() {
    return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
}

function calculateItemTotals(item: {
    product_cost_cents: number;
    addon_conformity: boolean;
    addon_sterility: boolean;
    addon_endotoxins: boolean;
    addon_net_content: boolean;
    addon_purity: boolean;
}) {
    let extraQty = 0;
    let testingFeeCents = 0;

    if (item.addon_conformity) {
        extraQty += TESTING_ADDON_EXTRA_QTY['conformity'];
        testingFeeCents += TESTING_ADDON_FEE_CENTS['conformity'];
    }
    if (item.addon_sterility) {
        extraQty += TESTING_ADDON_EXTRA_QTY['sterility'];
        testingFeeCents += TESTING_ADDON_FEE_CENTS['sterility'];
    }
    if (item.addon_endotoxins) {
        extraQty += TESTING_ADDON_EXTRA_QTY['endotoxins'];
        testingFeeCents += TESTING_ADDON_FEE_CENTS['endotoxins'];
    }
    if (item.addon_net_content) {
        extraQty += TESTING_ADDON_EXTRA_QTY['net_content'];
        testingFeeCents += TESTING_ADDON_FEE_CENTS['net_content'];
    }
    if (item.addon_purity) {
        extraQty += TESTING_ADDON_EXTRA_QTY['purity'];
        testingFeeCents += TESTING_ADDON_FEE_CENTS['purity'];
    }

    const baseQty = 1;
    const totalQty = baseQty + extraQty;
    const productCost = item.product_cost_cents * totalQty;

    return { baseQty, totalQty, productCost, testingFeeCents };
}

export async function GET(request: NextRequest) {
    try {
        const authResult = await requireAdmin();
        if (authResult instanceof NextResponse) return authResult;

        const { searchParams } = new URL(request.url);
        const filters = Object.fromEntries(searchParams.entries());
        const validation = validateInput(testingOrderFiltersSchema, filters);

        const supabase = getServiceClient();

        let query = supabase
            .from('testing_orders')
            .select(`
                *,
                testing_labs(id, name, email),
                merchants(id, name, company_name, contact_email),
                testing_order_items(*)
            `)
            .order('created_at', { ascending: false });

        if (validation.success) {
            if (validation.data.merchant_id) {
                query = query.eq('merchant_id', validation.data.merchant_id);
            }
            if (validation.data.testing_lab_id) {
                query = query.eq('testing_lab_id', validation.data.testing_lab_id);
            }
            if (validation.data.status) {
                query = query.eq('status', validation.data.status);
            }
            const limit = validation.data.limit || 20;
            const page = validation.data.page || 1;
            const from = (page - 1) * limit;
            query = query.range(from, from + limit - 1);
        }

        const { data, error, count } = await query;

        if (error) {
            console.error('Testing orders fetch error:', error);
            return NextResponse.json({ error: 'Failed to load testing orders from the database. Please refresh and try again.' }, { status: 500 });
        }

        return NextResponse.json({ data, total: count });
    } catch (error) {
        console.error('Testing orders GET error:', error);
        return NextResponse.json({ error: 'Failed to load testing orders due to an unexpected error. Please try again.' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const validation = validateInput(createTestingOrderSchema, body);
        if (!validation.success) {
            return NextResponse.json(
                { error: 'Validation failed', details: formatZodErrors(validation.errors) },
                { status: 400 }
            );
        }

        let { merchant_id } = validation.data;
        const { testing_lab_id, items, notes } = validation.data;
        const supabase = getServiceClient();

        // Resolve merchant_id='current' from the authenticated user's session
        if (merchant_id === 'current') {
            const userClient = createRouteHandlerClient();
            const { data: { user }, error: userError } = await userClient.auth.getUser();
            if (userError || !user) {
                return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
            }

            const { data: resolved } = await supabase
                .from('merchants')
                .select('id')
                .eq('user_id', user.id)
                .single();

            if (!resolved) {
                return NextResponse.json({ error: 'No merchant account linked to this user' }, { status: 403 });
            }
            merchant_id = resolved.id;
        } else {
            // Explicit merchant_id requires admin auth
            const authResult = await requireAdmin();
            if (authResult instanceof NextResponse) return authResult;
        }

        // Verify the testing lab exists and is active
        const { data: lab, error: labError } = await supabase
            .from('testing_labs')
            .select('id, name, email')
            .eq('id', testing_lab_id)
            .eq('active', true)
            .single();

        if (labError || !lab) {
            return NextResponse.json({ error: 'Testing lab not found or inactive' }, { status: 400 });
        }

        // Verify the merchant exists
        const { data: merchant, error: merchantError } = await supabase
            .from('merchants')
            .select('id, name, contact_email')
            .eq('id', merchant_id)
            .single();

        if (merchantError || !merchant) {
            return NextResponse.json({ error: 'Merchant not found' }, { status: 400 });
        }

        // Calculate totals for each item
        const processedItems = items.map((item: z.infer<typeof testingOrderItemSchema>) => {
            const calc = calculateItemTotals(item);
            return {
                ...item,
                base_qty: calc.baseQty,
                total_qty: calc.totalQty,
                product_cost_cents: calc.productCost,
                testing_fee_cents: calc.testingFeeCents,
            };
        });

        const totalProductCostCents = processedItems.reduce((sum: number, i: { product_cost_cents: number }) => sum + i.product_cost_cents, 0);
        const totalTestingFeeCents = processedItems.reduce((sum: number, i: { testing_fee_cents: number }) => sum + i.testing_fee_cents, 0);
        const shippingFeeCents = TESTING_SHIPPING_FEE_CENTS;
        const grandTotalCents = totalProductCostCents + totalTestingFeeCents + shippingFeeCents;

        // Check merchant USD wallet balance (testing orders use USD)
        const { data: wallet } = await supabase
            .from('wallet_accounts')
            .select('id, balance_cents, reserved_cents')
            .eq('merchant_id', merchant_id)
            .eq('currency', 'USD')
            .single();

        if (!wallet) {
            return NextResponse.json({ error: 'Merchant wallet not found' }, { status: 400 });
        }

        const availableBalance = wallet.balance_cents - wallet.reserved_cents;
        if (availableBalance < grandTotalCents) {
            return NextResponse.json({
                error: 'Insufficient wallet balance',
                details: {
                    available_cents: availableBalance,
                    required_cents: grandTotalCents,
                },
            }, { status: 400 });
        }

        // Create the parent order row (for shipment tracking integration)
        const idempotencyKey = `testing-${merchant_id}-${Date.now()}`;
        const { data: order, error: orderError } = await supabase
            .from('orders')
            .insert({
                store_id: null,
                merchant_id,
                woo_order_id: `TESTING-${Date.now()}`,
                woo_order_number: `TST-${Date.now().toString(36).toUpperCase()}`,
                order_type: 'TESTING',
                status: 'RECEIVED',
                currency: 'USD',
                subtotal_cents: totalProductCostCents,
                handling_cents: totalTestingFeeCents,
                shipping_estimate_cents: shippingFeeCents,
                total_estimate_cents: grandTotalCents,
                shipping_address: {},
                supplier_notes: notes || `Testing order for ${merchant.name}`,
                idempotency_key: idempotencyKey,
            })
            .select()
            .single();

        // If order creation fails due to store_id constraint, create testing order without parent order
        let orderId = order?.id || null;

        if (orderError) {
            console.warn('Could not create parent order row (store_id FK constraint), proceeding without:', orderError.message);
            orderId = null;
        }

        // Create order_items for the parent order (if created)
        if (orderId) {
            const orderItems = processedItems.map((item: { product_id: string; sku: string; product_name: string; total_qty: number; product_cost_cents: number }) => ({
                order_id: orderId,
                product_id: item.product_id,
                sku: item.sku,
                name: item.product_name,
                qty: item.total_qty,
                unit_price_cents: item.product_cost_cents / item.total_qty,
            }));

            await supabase.from('order_items').insert(orderItems);
        }

        // Get invoice email from admin settings
        let invoiceEmail = 'whitelabel@peptidetech.co';
        const { data: settingsRow } = await supabase
            .from('admin_settings')
            .select('settings')
            .eq('id', 'global')
            .single();

        if (settingsRow?.settings?.testing_invoice_email) {
            invoiceEmail = settingsRow.settings.testing_invoice_email;
        }

        // Create the testing order
        const { data: testingOrder, error: testingError } = await supabase
            .from('testing_orders')
            .insert({
                order_id: orderId,
                merchant_id,
                testing_lab_id,
                status: 'AWAITING_SHIPMENT',
                shipping_fee_cents: shippingFeeCents,
                total_testing_fee_cents: totalTestingFeeCents,
                total_product_cost_cents: totalProductCostCents,
                grand_total_cents: grandTotalCents,
                invoice_email: invoiceEmail,
                notes,
            })
            .select()
            .single();

        if (testingError || !testingOrder) {
            console.error('Testing order create error:', testingError);
            return NextResponse.json({ error: 'Failed to save testing order to the database. The order was not created — please try again.' }, { status: 500 });
        }

        // Create testing order items
        const testingItems = processedItems.map((item: {
            product_id: string; sku: string; product_name: string; base_qty: number;
            addon_conformity: boolean; addon_sterility: boolean; addon_endotoxins: boolean;
            addon_net_content: boolean; addon_purity: boolean; total_qty: number;
            product_cost_cents: number; testing_fee_cents: number;
        }) => ({
            testing_order_id: testingOrder.id,
            product_id: item.product_id,
            sku: item.sku,
            product_name: item.product_name,
            base_qty: item.base_qty,
            addon_conformity: item.addon_conformity,
            addon_sterility: item.addon_sterility,
            addon_endotoxins: item.addon_endotoxins,
            addon_net_content: item.addon_net_content,
            addon_purity: item.addon_purity,
            total_qty: item.total_qty,
            product_cost_cents: item.product_cost_cents,
            testing_fee_cents: item.testing_fee_cents,
        }));

        const { error: itemsError } = await supabase
            .from('testing_order_items')
            .insert(testingItems);

        if (itemsError) {
            console.error('Testing order items create error:', itemsError);
        }

        // Deduct from merchant wallet
        const newBalance = wallet.balance_cents - grandTotalCents;
        await supabase
            .from('wallet_accounts')
            .update({ balance_cents: newBalance })
            .eq('id', wallet.id)
            .eq('balance_cents', wallet.balance_cents); // Optimistic lock

        // Record wallet transaction
        await supabase.from('wallet_transactions').insert({
            merchant_id,
            wallet_id: wallet.id,
            type: 'SETTLEMENT',
            amount_cents: -grandTotalCents,
            balance_after_cents: newBalance,
            reference_type: 'testing_order',
            reference_id: testingOrder.id,
            description: `Testing order - Products: $${(totalProductCostCents / 100).toFixed(2)}, Testing fees: $${(totalTestingFeeCents / 100).toFixed(2)}, Shipping: $${(shippingFeeCents / 100).toFixed(2)}`,
            metadata: {
                testing_order_id: testingOrder.id,
                lab_name: lab.name,
                item_count: processedItems.length,
            },
        });

        // Record audit event
        await supabase.from('audit_events').insert({
            merchant_id,
            action: 'testing_order.created',
            entity_type: 'testing_order',
            entity_id: testingOrder.id,
            metadata: {
                lab_name: lab.name,
                grand_total_cents: grandTotalCents,
                item_count: processedItems.length,
            },
        });

        return NextResponse.json({
            data: {
                ...testingOrder,
                items: testingItems,
                lab,
            },
            costs: {
                product_cost_cents: totalProductCostCents,
                testing_fee_cents: totalTestingFeeCents,
                shipping_fee_cents: shippingFeeCents,
                grand_total_cents: grandTotalCents,
            },
        }, { status: 201 });
    } catch (error) {
        console.error('Testing orders POST error:', error);
        return NextResponse.json({ error: 'Failed to create testing order due to an unexpected error. No charges were applied — please try again.' }, { status: 500 });
    }
}
