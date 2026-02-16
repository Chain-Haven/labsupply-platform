/**
 * Mercury Banking API Client
 * Handles Accounts Receivable (invoicing) and account queries
 *
 * API Reference: https://docs.mercury.com/reference/
 */

const MERCURY_API_BASE = 'https://api.mercury.com/api/v1';

function getApiToken(): string {
    const token = process.env.MERCURY_API_TOKEN;
    if (!token) {
        throw new MercuryError('MERCURY_API_TOKEN environment variable is not set');
    }
    return token;
}

// Cached account ID (auto-discovered from Mercury if not set in env)
let _cachedAccountId: string | null = null;

async function getAccountId(): Promise<string> {
    // 1. Check env var override first
    const envId = process.env.MERCURY_ACCOUNT_ID;
    if (envId) return envId;

    // 2. Use cached value
    if (_cachedAccountId) return _cachedAccountId;

    // 3. Auto-discover: fetch all accounts and use the first active checking account
    try {
        const result = await mercuryRequest<{ accounts: MercuryAccount[] }>('GET', '/accounts');
        const checking = result.accounts.find(a => a.type === 'checking' && a.status === 'active')
            || result.accounts[0];
        if (checking) {
            _cachedAccountId = checking.id;
            return checking.id;
        }
    } catch (err) {
        console.error('Failed to auto-discover Mercury account ID:', err);
    }

    throw new MercuryError(
        'No Mercury account found. Set MERCURY_ACCOUNT_ID or ensure your Mercury organization has an active account.'
    );
}

/**
 * Clear the cached account ID (used when admin changes the deposit account)
 */
export function clearAccountIdCache() {
    _cachedAccountId = null;
}

/**
 * Set account ID explicitly (from admin settings stored in DB)
 */
export function setAccountId(id: string) {
    _cachedAccountId = id;
}

// ============================================================================
// Types
// ============================================================================

export interface MercuryCustomer {
    id: string;
    name: string;
    email: string;
    address?: MercuryAddress | null;
    deletedAt?: string | null;
}

export interface MercuryAddress {
    name?: string;
    address1: string;
    address2?: string | null;
    city: string;
    region: string;
    postalCode: string;
    country: string;
}

export interface MercuryLineItem {
    name: string;
    unitPrice: string;
    quantity: number;
    salesTax?: number | null;
}

export interface MercuryInvoiceResponse {
    id: string;
    invoiceNumber: string;
    customerId: string;
    slug: string;
    status: 'Unpaid' | 'Processing' | 'Paid' | 'Cancelled';
    amount: number;
    dueDate: string;
    invoiceDate: string;
    lineItems: MercuryLineItem[];
    ccEmails: string[];
    destinationAccountId: string;
    creditCardEnabled: boolean;
    achDebitEnabled: boolean;
    useRealAccountNumber: boolean;
    payerMemo?: string | null;
    poNumber?: string | null;
    createdAt: string;
    updatedAt: string;
}

export interface CreateInvoiceParams {
    customerId: string;
    dueDate: string;
    invoiceDate: string;
    lineItems: MercuryLineItem[];
    ccEmails?: string[];
    payerMemo?: string | null;
    poNumber?: string | null;
    invoiceNumber?: string | null;
    sendEmailOption?: 'SendNow' | 'DontSend';
    creditCardEnabled?: boolean;
    achDebitEnabled?: boolean;
    useRealAccountNumber?: boolean;
    destinationAccountId?: string;
}

export interface MercuryAccount {
    id: string;
    name: string;
    accountNumber: string;
    routingNumber: string;
    status: string;
    type: string;
    availableBalance: number;
    currentBalance: number;
    kind: string;
    createdAt: string;
}

export interface MercuryPaginatedResponse<T> {
    page: {
        startCursor?: string;
        endCursor?: string;
        hasNextPage: boolean;
        hasPreviousPage: boolean;
    };
}

export interface MercuryInvoiceListResponse extends MercuryPaginatedResponse<MercuryInvoiceResponse> {
    invoices: MercuryInvoiceResponse[];
}

export interface MercuryCustomerListResponse extends MercuryPaginatedResponse<MercuryCustomer> {
    customers: MercuryCustomer[];
}

// ============================================================================
// Error Handling
// ============================================================================

export class MercuryError extends Error {
    public statusCode?: number;
    public responseBody?: unknown;

    constructor(message: string, statusCode?: number, responseBody?: unknown) {
        super(message);
        this.name = 'MercuryError';
        this.statusCode = statusCode;
        this.responseBody = responseBody;
    }
}

// ============================================================================
// HTTP Helper
// ============================================================================

const MERCURY_REQUEST_TIMEOUT_MS = 30000;
const MERCURY_MAX_RETRIES = 3;
const MERCURY_RETRY_BASE_DELAY_MS = 1000;

async function mercuryRequest<T>(
    method: string,
    path: string,
    body?: unknown,
    retries = MERCURY_MAX_RETRIES
): Promise<T> {
    const token = getApiToken();
    const url = `${MERCURY_API_BASE}${path}`;

    const headers: Record<string, string> = {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
    };

    if (body) {
        headers['Content-Type'] = 'application/json';
    }

    let lastError: MercuryError | null = null;

    for (let attempt = 0; attempt <= retries; attempt++) {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), MERCURY_REQUEST_TIMEOUT_MS);

            const response = await fetch(url, {
                method,
                headers,
                body: body ? JSON.stringify(body) : undefined,
                signal: controller.signal,
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                let errorBody: unknown;
                try {
                    errorBody = await response.json();
                } catch {
                    errorBody = await response.text();
                }

                const error = new MercuryError(
                    `Mercury API error: ${response.status} ${response.statusText} [${method} ${path}]`,
                    response.status,
                    errorBody
                );

                // Don't retry client errors (4xx) except 429 (rate limit)
                if (response.status >= 400 && response.status < 500 && response.status !== 429) {
                    throw error;
                }

                lastError = error;
            } else {
                if (response.status === 204) {
                    return undefined as T;
                }
                return response.json() as Promise<T>;
            }
        } catch (err) {
            if (err instanceof MercuryError) {
                // Re-throw 4xx client errors immediately (they won't resolve with retries)
                if (err.statusCode && err.statusCode >= 400 && err.statusCode < 500 && err.statusCode !== 429) {
                    throw err;
                }
                lastError = err;
            } else if (err instanceof Error && err.name === 'AbortError') {
                lastError = new MercuryError(
                    `Mercury API timeout after ${MERCURY_REQUEST_TIMEOUT_MS}ms [${method} ${path}]`,
                    408
                );
            } else {
                lastError = new MercuryError(
                    `Mercury API network error: ${err instanceof Error ? err.message : 'Unknown'} [${method} ${path}]`
                );
            }
        }

        // Exponential backoff before retry
        if (attempt < retries) {
            const delay = MERCURY_RETRY_BASE_DELAY_MS * Math.pow(2, attempt);
            const jitter = Math.random() * delay * 0.3;
            console.warn(`Mercury API retry ${attempt + 1}/${retries} for ${method} ${path} in ${Math.round(delay + jitter)}ms`);
            await new Promise(resolve => setTimeout(resolve, delay + jitter));
        }
    }

    throw lastError || new MercuryError(`Mercury API request failed after ${retries} retries [${method} ${path}]`);
}

// ============================================================================
// Customer API
// ============================================================================

/**
 * Create a new Mercury AR customer
 */
export async function createCustomer(
    name: string,
    email: string,
    address?: MercuryAddress
): Promise<MercuryCustomer> {
    return mercuryRequest<MercuryCustomer>('POST', '/ar/customers', {
        name,
        email,
        address: address ?? null,
    });
}

/**
 * Get a customer by ID
 */
export async function getCustomer(customerId: string): Promise<MercuryCustomer> {
    return mercuryRequest<MercuryCustomer>('GET', `/ar/customers/${customerId}`);
}

/**
 * Update a customer
 */
export async function updateCustomer(
    customerId: string,
    updates: { name?: string; email?: string; address?: MercuryAddress | null }
): Promise<MercuryCustomer> {
    return mercuryRequest<MercuryCustomer>('POST', `/ar/customers/${customerId}`, updates);
}

/**
 * List all customers (paginated)
 */
export async function listCustomers(params?: {
    limit?: number;
    startAfter?: string;
}): Promise<MercuryCustomerListResponse> {
    const queryParts: string[] = [];
    if (params?.limit) queryParts.push(`limit=${params.limit}`);
    if (params?.startAfter) queryParts.push(`start_after=${params.startAfter}`);
    const query = queryParts.length ? `?${queryParts.join('&')}` : '';

    return mercuryRequest<MercuryCustomerListResponse>('GET', `/ar/customers${query}`);
}

// ============================================================================
// Invoice API
// ============================================================================

/**
 * Create a new Mercury AR invoice
 * Automatically sends the invoice email to the customer if sendEmailOption is SendNow (default)
 */
export async function createInvoice(params: CreateInvoiceParams): Promise<MercuryInvoiceResponse> {
    const accountId = params.destinationAccountId ?? await getAccountId();

    return mercuryRequest<MercuryInvoiceResponse>('POST', '/ar/invoices', {
        customerId: params.customerId,
        dueDate: params.dueDate,
        invoiceDate: params.invoiceDate,
        lineItems: params.lineItems,
        ccEmails: params.ccEmails ?? [],
        payerMemo: params.payerMemo ?? null,
        poNumber: params.poNumber ?? null,
        invoiceNumber: params.invoiceNumber ?? null,
        sendEmailOption: params.sendEmailOption ?? 'SendNow',
        creditCardEnabled: params.creditCardEnabled ?? false,
        achDebitEnabled: params.achDebitEnabled ?? true,
        useRealAccountNumber: params.useRealAccountNumber ?? false,
        destinationAccountId: accountId,
    });
}

/**
 * Get an invoice by ID
 */
export async function getInvoice(invoiceId: string): Promise<MercuryInvoiceResponse> {
    return mercuryRequest<MercuryInvoiceResponse>('GET', `/ar/invoices/${invoiceId}`);
}

/**
 * List invoices with optional filters (paginated)
 */
export async function listInvoices(params?: {
    limit?: number;
    startAfter?: string;
    order?: 'asc' | 'desc';
}): Promise<MercuryInvoiceListResponse> {
    const queryParts: string[] = [];
    if (params?.limit) queryParts.push(`limit=${params.limit}`);
    if (params?.startAfter) queryParts.push(`start_after=${params.startAfter}`);
    if (params?.order) queryParts.push(`order=${params.order}`);
    const query = queryParts.length ? `?${queryParts.join('&')}` : '';

    return mercuryRequest<MercuryInvoiceListResponse>('GET', `/ar/invoices${query}`);
}

/**
 * Cancel an invoice (cannot be undone)
 */
export async function cancelInvoice(invoiceId: string): Promise<MercuryInvoiceResponse> {
    return mercuryRequest<MercuryInvoiceResponse>('POST', `/ar/invoices/${invoiceId}/cancel`);
}

/**
 * Update an invoice (only allowed while Unpaid)
 */
export async function updateInvoice(
    invoiceId: string,
    updates: Partial<Omit<CreateInvoiceParams, 'customerId' | 'destinationAccountId'>>
): Promise<MercuryInvoiceResponse> {
    return mercuryRequest<MercuryInvoiceResponse>('POST', `/ar/invoices/${invoiceId}`, updates);
}

// ============================================================================
// Account API
// ============================================================================

/**
 * Get Mercury account details (balance, status)
 */
export async function getAccount(accountId?: string): Promise<MercuryAccount> {
    const id = accountId ?? await getAccountId();
    return mercuryRequest<MercuryAccount>('GET', `/account/${id}`);
}

/**
 * Get all accounts for the organization
 */
export async function getAllAccounts(): Promise<{ accounts: MercuryAccount[] }> {
    return mercuryRequest<{ accounts: MercuryAccount[] }>('GET', '/accounts');
}

// ============================================================================
// Webhook API
// ============================================================================

/**
 * Create a webhook endpoint in Mercury
 */
export async function createWebhook(
    url: string,
    eventTypes?: string[]
): Promise<{ id: string; url: string; secret: string; status: string }> {
    return mercuryRequest('POST', '/webhooks', {
        url,
        eventTypes: eventTypes ?? null,
    });
}

/**
 * Get all webhook endpoints
 */
export async function getWebhooks(): Promise<{
    webhooks: Array<{ id: string; url: string; status: string; eventTypes?: string[] }>;
}> {
    return mercuryRequest('GET', '/webhooks');
}

// ============================================================================
// Convenience Functions
// ============================================================================

/**
 * Build the payment URL for a Mercury invoice
 */
export function getPaymentUrl(slug: string): string {
    return `https://app.mercury.com/pay/${slug}`;
}

/**
 * Format cents to a dollar string for Mercury API (which expects dollar strings)
 */
export function centsToDollarString(cents: number): string {
    return (cents / 100).toFixed(2);
}

/**
 * Convert dollar amount from Mercury API to cents
 */
export function dollarsToCents(dollars: number): number {
    return Math.round(dollars * 100);
}

/**
 * Format a date as YYYY-MM-DD for Mercury API
 */
export function formatMercuryDate(date: Date): string {
    return date.toISOString().split('T')[0];
}
