/**
 * Testing Tracking Poll
 * Runs every 5 minutes to check if testing order shipments have tracking numbers.
 * When a tracking number is found, fires a testing/tracking-found event
 * to trigger the lab notification email.
 */

import { inngest } from '@/lib/inngest';
import { getServiceClient } from '@/lib/supabase';

export const testingTrackingPollFunction = inngest.createFunction(
    {
        id: 'testing-tracking-poll',
        name: 'Poll Testing Shipments for Tracking',
        retries: 2,
    },
    { cron: '*/5 * * * *' },
    async ({ step }) => {
        const supabase = getServiceClient();

        // Find testing orders awaiting shipment where we haven't notified the lab yet
        const pendingOrders = await step.run('find-pending-testing-orders', async () => {
            const { data, error } = await supabase
                .from('testing_orders')
                .select(`
                    id,
                    order_id,
                    merchant_id,
                    testing_lab_id,
                    status,
                    tracking_number
                `)
                .in('status', ['AWAITING_SHIPMENT', 'SHIPPED'])
                .is('tracking_notified_at', null)
                .limit(50);

            if (error) {
                console.error('Error fetching pending testing orders:', error);
                return [];
            }

            return data || [];
        });

        if (pendingOrders.length === 0) {
            return { checked: 0, found: 0 };
        }

        let foundCount = 0;

        // Check each testing order for tracking numbers
        for (const testingOrder of pendingOrders) {
            const trackingFound = await step.run(
                `check-tracking-${testingOrder.id}`,
                async (): Promise<{
                    found: boolean;
                    trackingNumber: string | null;
                    carrier: string | null;
                    trackingUrl: string | null;
                }> => {
                    // If the testing order already has a tracking number directly
                    if (testingOrder.tracking_number) {
                        return {
                            found: true,
                            trackingNumber: testingOrder.tracking_number,
                            carrier: null,
                            trackingUrl: null,
                        };
                    }

                    // Check via linked order's shipments
                    if (testingOrder.order_id) {
                        const { data: shipments } = await supabase
                            .from('shipments')
                            .select('tracking_number, tracking_url, carrier')
                            .eq('order_id', testingOrder.order_id)
                            .not('tracking_number', 'is', null)
                            .limit(1);

                        if (shipments && shipments.length > 0) {
                            return {
                                found: true,
                                trackingNumber: shipments[0].tracking_number,
                                carrier: shipments[0].carrier,
                                trackingUrl: shipments[0].tracking_url,
                            };
                        }
                    }

                    return { found: false, trackingNumber: null, carrier: null, trackingUrl: null };
                }
            );

            if (trackingFound.found && trackingFound.trackingNumber) {
                // Update the testing order with tracking info
                await step.run(`update-testing-order-${testingOrder.id}`, async () => {
                    await supabase
                        .from('testing_orders')
                        .update({
                            tracking_number: trackingFound.trackingNumber,
                            tracking_url: trackingFound.trackingUrl || null,
                            carrier: trackingFound.carrier || null,
                            status: 'SHIPPED',
                        })
                        .eq('id', testingOrder.id);
                });

                // Fire event to send lab notification
                await step.run(`notify-lab-${testingOrder.id}`, async () => {
                    await inngest.send({
                        name: 'testing/tracking-found',
                        data: {
                            testingOrderId: testingOrder.id,
                            trackingNumber: trackingFound.trackingNumber!,
                            carrier: trackingFound.carrier || 'Unknown',
                            trackingUrl: trackingFound.trackingUrl || null,
                        },
                    });
                });

                foundCount++;
            }
        }

        return {
            checked: pendingOrders.length,
            found: foundCount,
        };
    }
);
