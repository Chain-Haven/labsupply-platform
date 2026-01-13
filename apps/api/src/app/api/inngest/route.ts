/**
 * Inngest Route Handler
 * Serves Inngest functions for the workflow engine
 */

import { serve } from 'inngest/next';
import { inngest } from '@/lib/inngest';
import { orderReceivedFunction } from './functions/order-received';
import { paymentSucceededFunction } from './functions/payment-succeeded';
import { shipmentShippedFunction } from './functions/shipment-shipped';
import { webhookRetryFunction } from './functions/webhook-retry';

// Export the Inngest handler
export const { GET, POST, PUT } = serve({
    client: inngest,
    functions: [
        orderReceivedFunction,
        paymentSucceededFunction,
        shipmentShippedFunction,
        webhookRetryFunction,
    ],
});
