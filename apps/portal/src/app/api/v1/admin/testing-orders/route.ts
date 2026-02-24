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
import { adjustWalletBalance } from '@/lib/wallet-ops';
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
    product_id: z.string().min(1).max(100),
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
    merchant_id: z.union([z.literal('current'), z.string().min(1)]),
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

            // Check direct ownership first, then team membership
            const { data: owned } = await supabase
                .from('merchants')
                .select('id')
                .eq('user_id', user.id)
                .maybeSingle();

            if (owned) {
                merchant_id = owned.id;
            } else {
                const { data: membership } = await supabase
                    .from('merchant_users')
                    .select('merchant_id')
                    .eq('user_id', user.id)
                    .eq('is_active', true)
                    .maybeSingle();

                if (membership) {
                    merchant_id = membership.merchant_id;
                } else {
                    return NextResponse.json({ error: 'No merchant account linked to this user' }, { status: 403 });
                }
            }
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
        const COMPLIANCE_RESERVE_CENTS = 50000; // $500
        const { data: wallet } = await supabase
            .from('wallet_accounts')
            .select('id, balance_cents, reserved_cents')
            .eq('merchant_id', merchant_id)
            .eq('currency', 'USD')
            .single();

        if (!wallet) {
            return NextResponse.json({ error: 'Merchant wallet not found' }, { status: 400 });
        }

        // Smart billing: deduct from wallet if it keeps balance above compliance reserve,
        // otherwise create a Mercury invoice for the testing order cost
        const availableBalance = wallet.balance_cents - wallet.reserved_cents;
        const balanceAfterDeduction = availableBalance - grandTotalCents;
        const canPayFromWallet = balanceAfterDeduction >= COMPLIANCE_RESERVE_CENTS;
        let paymentMethod: 'wallet' | 'invoice' = canPayFromWallet ? 'wallet' : 'invoice';

        // Create parent order row so testing orders appear in all order views
        const idempotencyKey = `testing-${merchant_id}-${Date.now()}`;
        const orderNumber = `TST-${Date.now().toString(36).toUpperCase()}`;
        let orderId: string | null = null;

        const { data: order, error: orderError } = await supabase
            .from('orders')
            .insert({
                merchant_id,
                woo_order_id: `TESTING-${Date.now()}`,
                woo_order_number: orderNumber,
                order_type: 'TESTING',
                status: 'RECEIVED',
                currency: 'USD',
                subtotal_cents: totalProductCostCents,
                handling_cents: totalTestingFeeCents,
                shipping_estimate_cents: shippingFeeCents,
                total_estimate_cents: grandTotalCents,
                shipping_address: {},
                supplier_notes: notes || `3rd Party Testing Order - ${lab.name}`,
                idempotency_key: idempotencyKey,
            })
            .select('id')
            .single();

        if (order) {
            orderId = order.id;

            // Create order_items for the parent order
            const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
            const orderItems = processedItems.map((item: { product_id: string; sku: string; product_name: string; total_qty: number; product_cost_cents: number }) => ({
                order_id: orderId,
                product_id: UUID_RE.test(item.product_id) ? item.product_id : null,
                sku: item.sku,
                name: item.product_name,
                qty: item.total_qty,
                unit_price_cents: item.total_qty > 0 ? Math.round(item.product_cost_cents / item.total_qty) : 0,
            }));

            await supabase.from('order_items').insert(orderItems);
        } else if (orderError) {
            console.warn('Could not create parent order row, proceeding without:', orderError.message);
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
        // If paying by invoice, order starts as PENDING until invoice is paid
        const initialStatus = paymentMethod === 'wallet' ? 'AWAITING_SHIPMENT' : 'PENDING';
        const initialPaymentStatus = paymentMethod === 'wallet' ? 'paid' : 'invoice_sent';

        const { data: testingOrder, error: testingError } = await supabase
            .from('testing_orders')
            .insert({
                order_id: orderId,
                merchant_id,
                testing_lab_id,
                status: initialStatus,
                payment_status: initialPaymentStatus,
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
        // product_id may be a UUID (real DB product) or a catalog ID (e.g. 'pep-001')
        const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

        const testingItems = processedItems.map((item: {
            product_id: string; sku: string; product_name: string; base_qty: number;
            addon_conformity: boolean; addon_sterility: boolean; addon_endotoxins: boolean;
            addon_net_content: boolean; addon_purity: boolean; total_qty: number;
            product_cost_cents: number; testing_fee_cents: number;
        }) => {
            const isUuid = UUID_REGEX.test(item.product_id);
            return {
                testing_order_id: testingOrder.id,
                product_id: isUuid ? item.product_id : null,
                catalog_product_id: isUuid ? null : item.product_id,
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
            };
        });

        const { error: itemsError } = await supabase
            .from('testing_order_items')
            .insert(testingItems);

        if (itemsError) {
            console.error('Testing order items create error:', itemsError);
        }

        let invoiceCreated = false;
        let invoicePayUrl: string | null = null;

        if (paymentMethod === 'wallet') {
            // Deduct from merchant wallet
            await adjustWalletBalance(supabase, {
                walletId: wallet.id,
                merchantId: merchant_id,
                amountCents: -grandTotalCents,
                type: 'SETTLEMENT',
                referenceType: 'testing_order',
                referenceId: testingOrder.id,
                description: `Testing order - Products: $${(totalProductCostCents / 100).toFixed(2)}, Testing fees: $${(totalTestingFeeCents / 100).toFixed(2)}, Shipping: $${(shippingFeeCents / 100).toFixed(2)}`,
                metadata: { testing_order_id: testingOrder.id, lab_name: lab.name, item_count: processedItems.length },
                idempotencyKey: `testing-order-${testingOrder.id}`,
            });
        } else {
            // Create a Mercury invoice for the testing order
            const mercuryToken = process.env.MERCURY_API_TOKEN;
            const mercuryAccountId = process.env.MERCURY_ACCOUNT_ID;
            const { data: merchantFull } = await supabase
                .from('merchants')
                .select('mercury_customer_id, billing_email, company_name, email')
                .eq('id', merchant_id)
                .single();

            if (mercuryToken && mercuryAccountId && merchantFull?.mercury_customer_id) {
                try {
                    const dueDate = new Date();
                    dueDate.setDate(dueDate.getDate() + 7);
                    const dueDateStr = dueDate.toISOString().split('T')[0];
                    const todayStr = new Date().toISOString().split('T')[0];
                    const merchantName = merchantFull.company_name || merchantFull.email;

                    const mercuryRes = await fetch('https://api.mercury.com/api/v1/ar/invoices', {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${mercuryToken}`,
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            customerId: merchantFull.mercury_customer_id,
                            dueDate: dueDateStr,
                            invoiceDate: todayStr,
                            lineItems: [{
                                name: `3rd Party Testing Order - ${merchantName}`,
                                unitPrice: (grandTotalCents / 100).toFixed(2),
                                quantity: 1,
                            }],
                            ccEmails: [],
                            payerMemo: `Testing order for ${merchantName}. Products: $${(totalProductCostCents / 100).toFixed(2)}, Testing fees: $${(totalTestingFeeCents / 100).toFixed(2)}, Shipping: $${(shippingFeeCents / 100).toFixed(2)}`,
                            sendEmailOption: 'SendNow',
                            creditCardEnabled: false,
                            achDebitEnabled: true,
                            useRealAccountNumber: false,
                            destinationAccountId: mercuryAccountId,
                        }),
                        signal: AbortSignal.timeout(15000),
                    });

                    if (mercuryRes.ok) {
                        const mercuryInvoice = await mercuryRes.json();
                        invoiceCreated = true;
                        invoicePayUrl = mercuryInvoice.slug
                            ? `https://app.mercury.com/pay/${mercuryInvoice.slug}`
                            : null;

                        const { data: invoiceRow } = await supabase.from('mercury_invoices').insert({
                            merchant_id,
                            mercury_invoice_id: mercuryInvoice.id,
                            mercury_invoice_number: mercuryInvoice.invoiceNumber,
                            mercury_slug: mercuryInvoice.slug,
                            amount_cents: grandTotalCents,
                            status: 'Unpaid',
                            due_date: dueDateStr,
                        }).select('id').single();

                        // Link the invoice to the testing order
                        if (invoiceRow && testingOrder) {
                            await supabase.from('testing_orders')
                                .update({ payment_invoice_id: invoiceRow.id })
                                .eq('id', testingOrder.id);
                        }
                    } else {
                        console.error('Mercury invoice creation failed for testing order:', await mercuryRes.text());
                    }
                } catch (err) {
                    console.error('Mercury invoice creation error:', err);
                }
            }
        }

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
                payment_method: paymentMethod,
                invoice_created: invoiceCreated,
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
            billing: {
                method: paymentMethod,
                invoice_created: invoiceCreated,
                invoice_pay_url: invoicePayUrl,
            },
        }, { status: 201 });
    } catch (error) {
        console.error('Testing orders POST error:', error);
        return NextResponse.json({ error: 'Failed to create testing order due to an unexpected error. No charges were applied — please try again.' }, { status: 500 });
    }
}
