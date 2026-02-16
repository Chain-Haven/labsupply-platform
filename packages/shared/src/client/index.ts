/**
 * LabSupply Platform - API Client SDK
 * TypeScript client for consuming the LabSupply API
 */

import {
    generateSignature,
    generateNonce,
    nowMs,
} from '../utils';
import type {
    ApiResponse,
    CatalogResponse,
    ConnectExchangeRequest,
    ConnectExchangeResponse,
    CreateOrderRequest,
    CreateOrderResponse,
    CreateShipmentRequest,
    CreateShipmentResponse,
    MarkShippedRequest,
    ImportStatusRequest,
    TrackingUpdatePayload,
    WalletBalanceResponse,
    MercuryInvoice,
    BillingSettings,
    Order,
    Shipment,
    PaginatedResponse,
} from '../types';

export interface LabSupplyClientConfig {
    baseUrl: string;
    storeId?: string;
    storeSecret?: string;
    timeout?: number;
}

export interface RequestOptions {
    headers?: Record<string, string>;
    signal?: AbortSignal;
}

export class LabSupplyClient {
    private baseUrl: string;
    private storeId?: string;
    private storeSecret?: string;
    private timeout: number;

    constructor(config: LabSupplyClientConfig) {
        this.baseUrl = config.baseUrl.replace(/\/$/, ''); // Remove trailing slash
        this.storeId = config.storeId;
        this.storeSecret = config.storeSecret;
        this.timeout = config.timeout ?? 30000;
    }

    /**
     * Set store credentials after exchange
     */
    setCredentials(storeId: string, storeSecret: string): void {
        this.storeId = storeId;
        this.storeSecret = storeSecret;
    }

    /**
     * Clear stored credentials
     */
    clearCredentials(): void {
        this.storeId = undefined;
        this.storeSecret = undefined;
    }

    /**
     * Generate signed headers for authenticated requests
     */
    private generateSignedHeaders(body: string): Record<string, string> {
        if (!this.storeId || !this.storeSecret) {
            throw new Error('Store credentials not set');
        }

        const timestamp = nowMs().toString();
        const nonce = generateNonce();

        const signature = generateSignature({
            storeId: this.storeId,
            timestamp,
            nonce,
            body,
            secret: this.storeSecret,
        });

        return {
            'x-store-id': this.storeId,
            'x-timestamp': timestamp,
            'x-nonce': nonce,
            'x-signature': signature,
        };
    }

    /**
     * Make HTTP request with optional signing
     */
    private async request<T>(
        method: string,
        path: string,
        body?: unknown,
        options: RequestOptions & { signed?: boolean } = {}
    ): Promise<ApiResponse<T>> {
        const { headers = {}, signal, signed = true } = options;
        const url = `${this.baseUrl}${path}`;
        const bodyStr = body ? JSON.stringify(body) : '';

        const requestHeaders: Record<string, string> = {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            ...headers,
        };

        // Add signed headers if credentials are available and signing is enabled
        if (signed && this.storeId && this.storeSecret) {
            Object.assign(requestHeaders, this.generateSignedHeaders(bodyStr));
        }

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeout);

        try {
            const response = await fetch(url, {
                method,
                headers: requestHeaders,
                body: body ? bodyStr : undefined,
                signal: signal ?? controller.signal,
            });

            clearTimeout(timeoutId);

            const data = await response.json();

            if (!response.ok) {
                return {
                    success: false,
                    error: data.error ?? {
                        code: 'UNKNOWN_ERROR',
                        message: `Request failed with status ${response.status}`,
                    },
                };
            }

            return {
                success: true,
                data: data.data ?? data,
            };
        } catch (error) {
            clearTimeout(timeoutId);

            if (error instanceof Error && error.name === 'AbortError') {
                return {
                    success: false,
                    error: {
                        code: 'TIMEOUT',
                        message: 'Request timed out',
                    },
                };
            }

            return {
                success: false,
                error: {
                    code: 'NETWORK_ERROR',
                    message: error instanceof Error ? error.message : 'Network error',
                },
            };
        }
    }

    // ============================================================================
    // Connection APIs
    // ============================================================================

    /**
     * Exchange connect code for store credentials
     */
    async exchangeConnectCode(
        request: ConnectExchangeRequest
    ): Promise<ApiResponse<ConnectExchangeResponse>> {
        return this.request<ConnectExchangeResponse>(
            'POST',
            '/v1/stores/connect/exchange',
            request,
            { signed: false }
        );
    }

    /**
     * Rotate store secret
     */
    async rotateSecret(): Promise<ApiResponse<{ new_secret: string; rotated_at: string }>> {
        return this.request('POST', '/v1/stores/rotate-secret', {});
    }

    /**
     * Check connection health
     */
    async healthCheck(): Promise<ApiResponse<{ status: string; timestamp: string }>> {
        return this.request('GET', '/v1/health', undefined, { signed: false });
    }

    // ============================================================================
    // Catalog APIs
    // ============================================================================

    /**
     * Get available catalog products
     */
    async getCatalog(): Promise<ApiResponse<CatalogResponse>> {
        return this.request<CatalogResponse>('GET', '/v1/catalog');
    }

    /**
     * Report import status back to server
     */
    async reportImportStatus(request: ImportStatusRequest): Promise<ApiResponse<void>> {
        return this.request('POST', '/v1/catalog/import-status', request);
    }

    // ============================================================================
    // Order APIs
    // ============================================================================

    /**
     * Create a new supplier order
     */
    async createOrder(request: CreateOrderRequest): Promise<ApiResponse<CreateOrderResponse>> {
        return this.request<CreateOrderResponse>('POST', '/v1/orders', request);
    }

    /**
     * Get order by ID
     */
    async getOrder(orderId: string): Promise<ApiResponse<Order>> {
        return this.request<Order>('GET', `/v1/orders/${orderId}`);
    }

    /**
     * Get orders for the connected store
     */
    async getOrders(params?: {
        status?: string;
        page?: number;
        limit?: number;
    }): Promise<ApiResponse<PaginatedResponse<Order>>> {
        const queryParams = new URLSearchParams();
        if (params?.status) queryParams.set('status', params.status);
        if (params?.page) queryParams.set('page', params.page.toString());
        if (params?.limit) queryParams.set('limit', params.limit.toString());

        const query = queryParams.toString();
        const path = query ? `/v1/orders?${query}` : '/v1/orders';

        return this.request<PaginatedResponse<Order>>('GET', path);
    }

    /**
     * Cancel an order
     */
    async cancelOrder(
        orderId: string,
        reason?: string
    ): Promise<ApiResponse<{ success: boolean }>> {
        return this.request('POST', `/v1/orders/${orderId}/cancel`, { reason });
    }

    /**
     * Get order updates (for polling)
     */
    async getOrderUpdates(params?: {
        since?: string;
        limit?: number;
    }): Promise<ApiResponse<Array<{ order_id: string; status: string; updated_at: string }>>> {
        const queryParams = new URLSearchParams();
        if (params?.since) queryParams.set('since', params.since);
        if (params?.limit) queryParams.set('limit', params.limit.toString());

        const query = queryParams.toString();
        const path = query ? `/v1/orders/updates?${query}` : '/v1/orders/updates';

        return this.request('GET', path);
    }

    // ============================================================================
    // Wallet APIs
    // ============================================================================

    /**
     * Get wallet balance
     */
    async getWalletBalance(): Promise<ApiResponse<WalletBalanceResponse>> {
        return this.request<WalletBalanceResponse>('GET', '/v1/wallet');
    }

    /**
     * Get Mercury invoices for the merchant
     */
    async getInvoices(params?: {
        status?: string;
        page?: number;
        limit?: number;
    }): Promise<ApiResponse<PaginatedResponse<MercuryInvoice>>> {
        const queryParams = new URLSearchParams();
        if (params?.status) queryParams.set('status', params.status);
        if (params?.page) queryParams.set('page', params.page.toString());
        if (params?.limit) queryParams.set('limit', params.limit.toString());

        const query = queryParams.toString();
        const path = query ? `/v1/merchant/invoices?${query}` : '/v1/merchant/invoices';

        return this.request<PaginatedResponse<MercuryInvoice>>('GET', path);
    }

    /**
     * Update billing settings (threshold, target balance, billing email)
     */
    async updateBillingSettings(
        settings: BillingSettings
    ): Promise<ApiResponse<BillingSettings>> {
        return this.request<BillingSettings>('PATCH', '/v1/merchant/billing-settings', settings);
    }

    // ============================================================================
    // Shipment APIs
    // ============================================================================

    /**
     * Create a shipment for an order
     */
    async createShipment(
        request: CreateShipmentRequest
    ): Promise<ApiResponse<CreateShipmentResponse>> {
        return this.request<CreateShipmentResponse>('POST', '/v1/shipments', request);
    }

    /**
     * Get shipment by ID
     */
    async getShipment(shipmentId: string): Promise<ApiResponse<Shipment>> {
        return this.request<Shipment>('GET', `/v1/shipments/${shipmentId}`);
    }

    /**
     * Mark shipment as shipped
     */
    async markShipped(
        shipmentId: string,
        request: MarkShippedRequest
    ): Promise<ApiResponse<{ success: boolean }>> {
        return this.request('POST', `/v1/shipments/${shipmentId}/ship`, request);
    }

    // ============================================================================
    // Tracking Update (For receiving updates from server)
    // ============================================================================

    /**
     * Get pending tracking updates for this store
     */
    async getTrackingUpdates(): Promise<ApiResponse<TrackingUpdatePayload>> {
        return this.request<TrackingUpdatePayload>('GET', '/v1/tracking/pending');
    }

    /**
     * Acknowledge tracking updates have been processed
     */
    async acknowledgeTrackingUpdates(
        orderIds: string[]
    ): Promise<ApiResponse<{ acknowledged: number }>> {
        return this.request('POST', '/v1/tracking/acknowledge', { order_ids: orderIds });
    }
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Create a new LabSupply client instance
 */
export function createLabSupplyClient(config: LabSupplyClientConfig): LabSupplyClient {
    return new LabSupplyClient(config);
}

/**
 * Create client for WooCommerce plugin (with credentials from WP options)
 */
export function createPluginClient(
    baseUrl: string,
    storeId: string,
    storeSecret: string
): LabSupplyClient {
    return new LabSupplyClient({
        baseUrl,
        storeId,
        storeSecret,
        timeout: 30000,
    });
}
