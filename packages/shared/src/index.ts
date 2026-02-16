/**
 * LabSupply Platform - Shared Package
 * Re-exports all types, schemas, utils, and client
 */

// Types
export * from './types';

// Schemas
export * from './schemas';

// Utilities
export * from './utils';

// Client
export { LabSupplyClient, createLabSupplyClient, createPluginClient } from './client';
export type { LabSupplyClientConfig } from './client';

// Constants
export const API_VERSION = 'v1';
export const PLATFORM_NAME = 'LabSupply';

// Compliance Disclaimers
export const DISCLAIMERS = {
    RESEARCH_ONLY: 'FOR RESEARCH USE ONLY. Not for human consumption. Not for veterinary use. These products are intended solely for research purposes.',
    AGE_VERIFICATION: 'By purchasing these products, you certify that you are at least 18 years of age and that the products will be used for legitimate research purposes only.',
    MERCHANT_AGREEMENT: 'By connecting your store, you agree to our Merchant Agreement and acknowledge that you are responsible for ensuring compliance with all applicable laws and regulations in your jurisdiction.',
} as const;

// Order status transitions
export const ORDER_STATUS_TRANSITIONS: Record<string, string[]> = {
    RECEIVED: ['AWAITING_FUNDS', 'FUNDED', 'ON_HOLD_COMPLIANCE', 'CANCELLED'],
    AWAITING_FUNDS: ['FUNDED', 'ON_HOLD_PAYMENT', 'CANCELLED'],
    ON_HOLD_PAYMENT: ['AWAITING_FUNDS', 'FUNDED', 'CANCELLED'],
    ON_HOLD_COMPLIANCE: ['RECEIVED', 'CANCELLED'],
    FUNDED: ['RELEASED_TO_FULFILLMENT', 'ON_HOLD_COMPLIANCE', 'CANCELLED', 'REFUNDED'],
    RELEASED_TO_FULFILLMENT: ['PICKING', 'CANCELLED', 'REFUNDED'],
    PICKING: ['PACKED', 'RELEASED_TO_FULFILLMENT'],
    PACKED: ['SHIPPED', 'PICKING'],
    SHIPPED: ['COMPLETE', 'REFUNDED'],
    COMPLETE: ['REFUNDED'],
    CANCELLED: [],
    REFUNDED: [],
};

/**
 * Check if an order status transition is valid
 */
export function isValidStatusTransition(from: string, to: string): boolean {
    const allowed = ORDER_STATUS_TRANSITIONS[from];
    return allowed?.includes(to) ?? false;
}

// Payment method configurations
export const PAYMENT_METHOD_CONFIG = {
    mercury_invoice: {
        label: 'Mercury Invoice (ACH)',
        fundsConfirmationDelay: 3 * 24 * 60 * 60 * 1000, // ~3 days for ACH settlement
        isReversible: false,
        chargebackWindow: 0,
    },
    ach: {
        label: 'ACH Transfer',
        fundsConfirmationDelay: 4 * 24 * 60 * 60 * 1000, // 4 days in ms
        isReversible: true,
        chargebackWindow: 60, // days
    },
    adjustment: {
        label: 'Manual Adjustment',
        fundsConfirmationDelay: 0,
        isReversible: false,
        chargebackWindow: 0,
    },
} as const;

// Compliance reserve
export const COMPLIANCE_RESERVE_CENTS = 50000; // $500.00

// Shipping carriers
export const CARRIERS = {
    USPS: 'usps',
    UPS: 'ups',
    FEDEX: 'fedex',
    DHL: 'dhl',
} as const;

// Region restriction helpers
export const RESTRICTED_REGIONS = {
    // Example: Some compounds may be restricted in certain states
    // This should be configurable per product
    DEFAULT_ALLOWED_COUNTRIES: ['US'],
    DEFAULT_RESTRICTED_STATES: [] as string[],
} as const;
