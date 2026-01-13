import { z } from 'zod';

// ChargX API Configuration
const CHARGX_BASE_URL = 'https://api.chargx.io';
const CHARGX_PUBLISHABLE_KEY = process.env.CHARGX_PUBLISHABLE_KEY || '';

// Response Types
export interface ChargXPretransactResponse {
    authData: {
        apiLoginID: string;
        clientKey: string;
    };
    isProduction: boolean;
    cardTokenRequestUrl: string;
    cardTokenRequestParams: Record<string, unknown>;
    googlePay?: {
        methodData: Array<{
            supportedMethods: string;
            data: Record<string, unknown>;
        }>;
    };
    applePay?: {
        paymentRequest: Record<string, unknown>;
    };
}

export interface ChargXOpaqueData {
    dataDescriptor?: string;
    dataValue?: string;
    token?: string;
}

export interface ChargXCustomer {
    name: string;
    email: string;
    phone?: string;
    lastName?: string;
}

export interface ChargXBillingAddress {
    street: string;
    unit?: string;
    city: string;
    state: string;
    zipCode: string;
    countryCode: string;
    phone?: string;
}

export interface ChargXTransactionResponse {
    message: string;
    result?: {
        orderId: string;
        orderDisplayId: string;
    };
    error?: Array<{
        errorCode: string;
        errorText: string;
    }>;
}

export interface ChargXVaultResponse {
    message: string;
    result?: {
        customerVaultId: string;
    };
    error?: Array<{
        errorCode: string;
        errorText: string;
    }>;
}

// Validation Schemas
export const chargeRequestSchema = z.object({
    amount: z.union([z.string(), z.number()]).transform(String),
    currency: z.string().default('USD'),
    opaqueData: z.object({
        dataDescriptor: z.string().optional(),
        dataValue: z.string().optional(),
        token: z.string().optional(),
    }).refine(
        (data) => data.token || (data.dataDescriptor && data.dataValue),
        'Either token or dataDescriptor+dataValue is required'
    ),
    vaultId: z.string().optional(),
    customer: z.object({
        name: z.string(),
        email: z.string().email(),
        phone: z.string().optional(),
    }),
    billingAddress: z.object({
        street: z.string(),
        unit: z.string().optional(),
        city: z.string(),
        state: z.string(),
        zipCode: z.string(),
        countryCode: z.string().length(3),
        phone: z.string().optional(),
    }).optional(),
    orderId: z.string().optional(),
});

export type ChargeRequest = z.infer<typeof chargeRequestSchema>;

/**
 * ChargX API Client
 * Handles all payment processing via ChargX payment gateway
 */
export class ChargXClient {
    private apiKey: string;
    private baseUrl: string;

    constructor(apiKey?: string) {
        this.apiKey = apiKey || CHARGX_PUBLISHABLE_KEY;
        this.baseUrl = CHARGX_BASE_URL;

        if (!this.apiKey) {
            console.warn('ChargX API key not configured. Payment processing will fail.');
        }
    }

    /**
     * Make authenticated request to ChargX API
     */
    private async request<T>(
        method: 'GET' | 'POST' | 'DELETE',
        endpoint: string,
        body?: Record<string, unknown>
    ): Promise<T> {
        const url = `${this.baseUrl}${endpoint}`;

        const headers: Record<string, string> = {
            'x-publishable-api-key': this.apiKey,
            'Content-Type': 'application/json',
        };

        const options: RequestInit = {
            method,
            headers,
        };

        if (body && method !== 'GET') {
            options.body = JSON.stringify(body);
        }

        const response = await fetch(url, options);
        const data = await response.json();

        if (!response.ok) {
            throw new ChargXError(
                data.message || 'ChargX API error',
                data.error || [],
                response.status
            );
        }

        return data as T;
    }

    /**
     * Retrieve pretransact keys for card tokenization
     * Call this before collecting card details on the frontend
     */
    async getPretransactKeys(): Promise<ChargXPretransactResponse> {
        return this.request<ChargXPretransactResponse>('GET', '/pretransact');
    }

    /**
     * Charge a credit card (authorize and capture)
     */
    async chargeCard(params: {
        amount: string | number;
        currency?: string;
        opaqueData?: ChargXOpaqueData;
        vaultId?: string;
        customer: ChargXCustomer;
        billingAddress?: ChargXBillingAddress;
        orderId?: string;
    }): Promise<ChargXTransactionResponse> {
        const body = {
            amount: String(params.amount),
            currency: params.currency || 'USD',
            type: 'fiat',
            ...(params.opaqueData && { opaqueData: params.opaqueData }),
            ...(params.vaultId && { vaultId: params.vaultId }),
            customer: params.customer,
            ...(params.billingAddress && { billingAddress: params.billingAddress }),
            ...(params.orderId && { orderId: params.orderId }),
        };

        return this.request<ChargXTransactionResponse>('POST', '/transact', body);
    }

    /**
     * Authorize a credit card (reserve funds without capturing)
     */
    async authorizeCard(params: {
        amount: string | number;
        currency?: string;
        opaqueData?: ChargXOpaqueData;
        vaultId?: string;
        customer: ChargXCustomer;
        billingAddress?: ChargXBillingAddress;
        orderId?: string;
    }): Promise<ChargXTransactionResponse> {
        const body = {
            amount: String(params.amount),
            currency: params.currency || 'USD',
            type: 'fiat',
            ...(params.opaqueData && { opaqueData: params.opaqueData }),
            ...(params.vaultId && { vaultId: params.vaultId }),
            customer: params.customer,
            ...(params.billingAddress && { billingAddress: params.billingAddress }),
            ...(params.orderId && { orderId: params.orderId }),
        };

        return this.request<ChargXTransactionResponse>('POST', '/card/authorize', body);
    }

    /**
     * Capture a previously authorized transaction
     */
    async captureTransaction(orderId: string): Promise<ChargXTransactionResponse> {
        return this.request<ChargXTransactionResponse>('POST', '/transaction/capture', {
            orderId,
        });
    }

    /**
     * Refund a settled transaction
     */
    async refundTransaction(orderId: string): Promise<{ message: string }> {
        return this.request<{ message: string }>('POST', '/transaction/refund', {
            orderId,
        });
    }

    /**
     * Void an unsettled transaction
     */
    async voidTransaction(orderId: string): Promise<{ message: string }> {
        return this.request<{ message: string }>('POST', '/transaction/void', {
            orderId,
        });
    }

    /**
     * Store card in vault for repeat payments
     */
    async createVault(opaqueData: ChargXOpaqueData): Promise<ChargXVaultResponse> {
        return this.request<ChargXVaultResponse>('POST', '/v1/vault', {
            opaqueData,
        });
    }

    /**
     * Create a subscription for recurring payments
     */
    async createSubscription(params: {
        variant_id: string;
        opaqueData: ChargXOpaqueData;
        customer: {
            email: string;
            name: string;
            lastName: string;
            phone?: string;
        };
        address: {
            street: string;
            city: string;
            zipCode: string;
            countryCode: string;
            unit?: string;
            state?: string;
        };
    }): Promise<{ id: string }> {
        return this.request<{ id: string }>('POST', '/subscription', params);
    }

    /**
     * Get subscription details
     */
    async getSubscription(subscriptionId: string): Promise<{
        subscription: {
            id: string;
            name: string;
            status: string;
            subscription_id: string;
            length: number;
            unit: string;
            start_date: string;
            total_occurrences: number;
            trial_occurrences: number;
            amount: number;
            trial_amount: number;
        };
    }> {
        return this.request('GET', `/subscription/${subscriptionId}`);
    }

    /**
     * Cancel a subscription
     */
    async cancelSubscription(subscriptionId: string): Promise<{
        id: string;
        object: string;
        canceled: boolean;
    }> {
        return this.request('DELETE', `/subscription/${subscriptionId}`);
    }
}

/**
 * ChargX Error class for handling API errors
 */
export class ChargXError extends Error {
    public errors: Array<{ errorCode: string; errorText: string }>;
    public statusCode: number;

    constructor(
        message: string,
        errors: Array<{ errorCode: string; errorText: string }> = [],
        statusCode: number = 400
    ) {
        super(message);
        this.name = 'ChargXError';
        this.errors = errors;
        this.statusCode = statusCode;
    }

    /**
     * Get human-readable error message
     */
    getDisplayMessage(): string {
        if (this.errors.length > 0) {
            const error = this.errors[0];
            return this.getErrorMessage(error.errorCode) || error.errorText;
        }
        return this.message;
    }

    /**
     * Map error codes to user-friendly messages
     */
    private getErrorMessage(code: string): string | null {
        const messages: Record<string, string> = {
            '2': 'Your card was declined by your bank. Please try a different card.',
            '3': 'This transaction requires approval. Please contact your bank.',
            '4': 'This card has been reported lost or stolen.',
            '27': 'Billing address does not match the card on file.',
            '44': 'The security code (CVV) is incorrect.',
            '45': 'Address and security code verification failed.',
            '65': 'Security code mismatch.',
        };
        return messages[code] || null;
    }
}

// Export singleton instance
export const chargx = new ChargXClient();

// Export for custom instances
export default ChargXClient;
