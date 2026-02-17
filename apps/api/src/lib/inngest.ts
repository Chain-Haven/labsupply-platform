/**
 * WhiteLabel Peptides API - Inngest Client Configuration
 * Durable workflow engine for background jobs
 */

import { Inngest } from 'inngest';

// Create the Inngest client
export const inngest = new Inngest({
    id: 'whitelabel-peptides-platform',
    name: 'WhiteLabel Peptides Platform',
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
        merchantId: string;
        walletId: string;
        amountCents: number;
        mercuryInvoiceId?: string;
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

export type MercuryCheckBalancesEvent = {
    name: 'mercury/check-balances';
    data: Record<string, never>;
};

export type MercurySyncInvoicesEvent = {
    name: 'mercury/sync-invoices';
    data: Record<string, never>;
};

export type MercuryInvoiceCreatedEvent = {
    name: 'mercury/invoice-created';
    data: {
        merchantId: string;
        mercuryInvoiceId: string;
        amountCents: number;
    };
};

export type ComplianceScanEvent = {
    name: 'compliance/scan';
    data: Record<string, never>;
};

export type ComplianceScanMerchantEvent = {
    name: 'compliance/scan-merchant';
    data: {
        merchantId: string;
    };
};

export type BtcSyncDepositsEvent = {
    name: 'btc/sync-deposits';
    data: Record<string, never>;
};

export type TestingTrackingPollEvent = {
    name: 'testing/tracking-poll';
    data: Record<string, never>;
};

export type TestingTrackingFoundEvent = {
    name: 'testing/tracking-found';
    data: {
        testingOrderId: string;
        trackingNumber: string;
        carrier: string;
        trackingUrl?: string | null;
    };
};

// Union type of all events
export type WhiteLabelPeptidesEvents =
    | OrderReceivedEvent
    | PaymentSucceededEvent
    | ShipmentCreatedEvent
    | ShipmentShippedEvent
    | WebhookRetryEvent
    | WalletReservationEvent
    | NotifyStoreEvent
    | MercuryCheckBalancesEvent
    | MercurySyncInvoicesEvent
    | MercuryInvoiceCreatedEvent
    | ComplianceScanEvent
    | ComplianceScanMerchantEvent
    | BtcSyncDepositsEvent
    | TestingTrackingPollEvent
    | TestingTrackingFoundEvent;
