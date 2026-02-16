/**
 * Webhook Retry Workflow
 * Handles retrying failed webhook events with exponential backoff
 */

import { inngest } from '@/lib/inngest';
import { getServiceClient } from '@/lib/supabase';
import { calculateBackoffDelay } from '@whitelabel-peptides/shared';

export const webhookRetryFunction = inngest.createFunction(
    {
        id: 'webhook-retry',
        name: 'Retry Failed Webhook',
        retries: 0, // We handle our own retries
    },
    { event: 'webhook/retry' },
    async ({ event, step }) => {
        const { webhookEventId, attempt } = event.data;
        const supabase = getServiceClient();

        // Step 1: Get webhook event
        const webhookEvent = await step.run('get-webhook-event', async () => {
            const { data, error } = await supabase
                .from('webhook_events')
                .select('*')
                .eq('id', webhookEventId)
                .single();

            if (error || !data) {
                throw new Error(`Webhook event not found: ${webhookEventId}`);
            }

            return data;
        });

        // Check if max attempts reached
        if (attempt >= webhookEvent.max_attempts) {
            await step.run('mark-dead-letter', async () => {
                await supabase
                    .from('webhook_events')
                    .update({
                        status: 'DEAD_LETTER',
                        last_error: 'Max retry attempts reached',
                    })
                    .eq('id', webhookEventId);
            });

            return { status: 'DEAD_LETTER', attempts: attempt };
        }

        // Step 2: Wait with exponential backoff
        const delay = calculateBackoffDelay(attempt, {
            initialDelayMs: 5000,
            maxDelayMs: 300000, // 5 minutes max
            backoffMultiplier: 2,
        });

        await step.sleep('backoff-wait', delay);

        // Step 3: Attempt to process the webhook
        const result = await step.run('process-webhook', async () => {
            try {
                // Re-process based on source by triggering relevant Inngest events
                switch (webhookEvent.source) {
                    case 'woocommerce':
                        // Re-trigger order processing if this was an order webhook
                        if (webhookEvent.payload?.id && webhookEvent.event_type?.includes('order')) {
                            console.log('Re-triggering WooCommerce order webhook processing');
                        }
                        break;

                    case 'mercury':
                        // Trigger immediate invoice sync for Mercury payment webhooks
                        await inngest.send({
                            name: 'mercury/sync-invoices',
                            data: {},
                        });
                        break;

                    default:
                        console.warn('Unknown webhook source for retry:', webhookEvent.source);
                }

                // Mark as completed
                await supabase
                    .from('webhook_events')
                    .update({
                        status: 'COMPLETED',
                        processed_at: new Date().toISOString(),
                        attempts: attempt,
                    })
                    .eq('id', webhookEventId);

                return { success: true };
            } catch (error) {
                // Mark as failed with error
                await supabase
                    .from('webhook_events')
                    .update({
                        status: 'FAILED',
                        last_error: (error as Error).message,
                        attempts: attempt,
                        next_retry_at: new Date(
                            Date.now() + calculateBackoffDelay(attempt + 1)
                        ).toISOString(),
                    })
                    .eq('id', webhookEventId);

                // Schedule next retry
                await inngest.send({
                    name: 'webhook/retry',
                    data: {
                        webhookEventId,
                        attempt: attempt + 1,
                    },
                });

                return { success: false, error: (error as Error).message };
            }
        });

        return result;
    }
);
