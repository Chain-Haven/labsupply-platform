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
import { mercuryCheckBalancesFunction } from './functions/mercury-check-balances';
import { mercurySyncInvoicesFunction } from './functions/mercury-sync-invoices';
import { storeNotifyTrackingFunction } from './functions/store-notify-tracking';
import { complianceScanFunction, complianceScanOnDemandFunction } from './functions/compliance-scan';

// Export the Inngest handler
export const { GET, POST, PUT } = serve({
    client: inngest,
    functions: [
        orderReceivedFunction,
        paymentSucceededFunction,
        shipmentShippedFunction,
        webhookRetryFunction,
        mercuryCheckBalancesFunction,
        mercurySyncInvoicesFunction,
        storeNotifyTrackingFunction,
        complianceScanFunction,
        complianceScanOnDemandFunction,
    ],
});
