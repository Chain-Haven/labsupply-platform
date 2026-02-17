/**
 * Testing Lab Notification
 * Triggered when a tracking number is detected for a testing shipment.
 * Sends a professional email to the testing lab with shipment details,
 * product list, required tests, and invoice instructions.
 */

import { inngest } from '@/lib/inngest';
import { getServiceClient } from '@/lib/supabase';
import { sendTestingLabNotificationEmail, sendTestingMerchantNotificationEmail } from '@/lib/testing-lab-emails';

export const testingLabNotifyFunction = inngest.createFunction(
    {
        id: 'testing-lab-notify',
        name: 'Notify Testing Lab of Incoming Shipment',
        retries: 3,
    },
    { event: 'testing/tracking-found' },
    async ({ event, step }) => {
        const { testingOrderId, trackingNumber, carrier, trackingUrl } = event.data;
        const supabase = getServiceClient();

        // Load the full testing order with items, lab, and merchant
        const orderDetails = await step.run('load-testing-order', async () => {
            const { data, error } = await supabase
                .from('testing_orders')
                .select(`
                    *,
                    testing_labs(id, name, email),
                    merchants(id, name, company_name, contact_email),
                    testing_order_items(
                        id,
                        product_name,
                        sku,
                        total_qty,
                        addon_conformity,
                        addon_sterility,
                        addon_endotoxins,
                        addon_net_content,
                        addon_purity
                    )
                `)
                .eq('id', testingOrderId)
                .single();

            if (error || !data) {
                throw new Error(`Testing order not found: ${testingOrderId}`);
            }

            return data;
        });

        // Skip if already notified
        if (orderDetails.tracking_notified_at) {
            return { skipped: true, reason: 'Already notified' };
        }

        const lab = orderDetails.testing_labs;
        const merchant = orderDetails.merchants;

        if (!lab?.email) {
            throw new Error('Testing lab email not configured');
        }

        // Build item list with tests
        const items = (orderDetails.testing_order_items || []).map((item: {
            product_name: string;
            sku: string;
            total_qty: number;
            addon_conformity: boolean;
            addon_sterility: boolean;
            addon_endotoxins: boolean;
            addon_net_content: boolean;
            addon_purity: boolean;
        }) => {
            const tests: string[] = [];
            if (item.addon_conformity) tests.push('Conformity');
            if (item.addon_sterility) tests.push('Sterility');
            if (item.addon_endotoxins) tests.push('Endotoxins');
            if (item.addon_net_content) tests.push('Net Content');
            if (item.addon_purity) tests.push('Purity');

            return {
                productName: item.product_name,
                sku: item.sku,
                totalQty: item.total_qty,
                tests,
            };
        });

        // Send lab notification email
        await step.run('send-lab-email', async () => {
            await sendTestingLabNotificationEmail({
                labName: lab.name,
                labEmail: lab.email,
                merchantName: merchant?.company_name || merchant?.name || 'Unknown Merchant',
                testingOrderId,
                trackingNumber,
                carrier: carrier || 'Unknown',
                trackingUrl,
                invoiceEmail: orderDetails.invoice_email || 'whitelabel@peptidetech.co',
                items,
            });
        });

        // Mark as notified
        await step.run('mark-notified', async () => {
            await supabase
                .from('testing_orders')
                .update({
                    tracking_notified_at: new Date().toISOString(),
                    tracking_number: trackingNumber,
                    carrier: carrier || null,
                    tracking_url: trackingUrl || null,
                })
                .eq('id', testingOrderId);
        });

        // Notify the merchant that their testing shipment is on the way
        if (merchant?.contact_email) {
            await step.run('notify-merchant', async () => {
                await sendTestingMerchantNotificationEmail({
                    merchantEmail: merchant.contact_email,
                    merchantName: merchant.company_name || merchant.name || 'Merchant',
                    testingOrderId,
                    labName: lab.name,
                    newStatus: 'SHIPPED',
                    items: items.map((i: { productName: string; sku: string }) => ({ productName: i.productName, sku: i.sku })),
                });
            });
        }

        // Record audit event
        await step.run('audit', async () => {
            await supabase.from('audit_events').insert({
                merchant_id: orderDetails.merchant_id,
                action: 'testing_order.lab_notified',
                entity_type: 'testing_order',
                entity_id: testingOrderId,
                metadata: {
                    lab_name: lab.name,
                    lab_email: lab.email,
                    tracking_number: trackingNumber,
                    carrier,
                    items_count: items.length,
                },
            });
        });

        return {
            testingOrderId,
            labNotified: lab.email,
            merchantNotified: merchant?.contact_email || null,
            trackingNumber,
            itemCount: items.length,
        };
    }
);
