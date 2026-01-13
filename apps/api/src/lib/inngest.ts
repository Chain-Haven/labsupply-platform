/**
 * LabSupply API - Inngest Client Configuration
 * Durable workflow engine for background jobs
 */

import { Inngest } from 'inngest';

// Create the Inngest client
export const inngest = new Inngest({
    id: 'labsupply-platform',
    name: 'LabSupply Platform',
});

// ============================================================================
// Event Types
// ============================================================================

export type OrderReceivedEvent = {
    name: 'order/received';
    data: {
        orderId: string;
        storeId: string;
        merchantId: string;
        wooOrderId: string;
        totalEstimateCents: number;
    };
};

export type PaymentSucceededEvent = {
    name: 'payment/succeeded';
    data: {
        paymentId: string;
        merchantId: string;
        walletId: string;
        amountCents: number;
        checkoutSessionId: string;
    };
};

export type ShipmentCreatedEvent = {
    name: 'shipment/created';
    data: {
        shipmentId: string;
        orderId: string;
        merchantId: string;
        storeId: string;
    };
};

export type ShipmentShippedEvent = {
    name: 'shipment/shipped';
    data: {
        shipmentId: string;
        orderId: string;
        merchantId: string;
        storeId: string;
        trackingNumber: string;
        carrier: string;
    };
};

export type WebhookRetryEvent = {
    name: 'webhook/retry';
    data: {
        webhookEventId: string;
        attempt: number;
    };
};

export type WalletReservationEvent = {
    name: 'wallet/reserve';
    data: {
        orderId: string;
        merchantId: string;
        amountCents: number;
    };
};

export type NotifyStoreEvent = {
    name: 'store/notify-tracking';
    data: {
        storeId: string;
        orderId: string;
        trackingNumber: string;
        trackingUrl?: string;
        carrier: string;
    };
};

// Union type of all events
export type LabSupplyEvents =
    | OrderReceivedEvent
    | PaymentSucceededEvent
    | ShipmentCreatedEvent
    | ShipmentShippedEvent
    | WebhookRetryEvent
    | WalletReservationEvent
    | NotifyStoreEvent;
