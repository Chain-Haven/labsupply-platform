/**
 * Esplora-compatible Blockchain API Client
 * Supports Blockstream and mempool.space APIs for monitoring BTC transactions.
 * Provider URL is configurable to allow swapping between services.
 */

const DEFAULT_BASE_URL = 'https://blockstream.info/api';
const REQUEST_DELAY_MS = 150; // rate-limit: ~6 req/s to stay under provider limits

export interface EsploraTxOutput {
    scriptpubkey: string;
    scriptpubkey_asm: string;
    scriptpubkey_type: string;
    scriptpubkey_address?: string;
    value: number;
}

export interface EsploraTxInput {
    txid: string;
    vout: number;
    prevout?: EsploraTxOutput;
    scriptsig: string;
    sequence: number;
}

export interface EsploraTxStatus {
    confirmed: boolean;
    block_height?: number;
    block_hash?: string;
    block_time?: number;
}

export interface EsploraTx {
    txid: string;
    version: number;
    locktime: number;
    vin: EsploraTxInput[];
    vout: EsploraTxOutput[];
    size: number;
    weight: number;
    fee: number;
    status: EsploraTxStatus;
}

function getBaseUrl(): string {
    return process.env.ESPLORA_BASE_URL || DEFAULT_BASE_URL;
}

async function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

let lastRequestTime = 0;

async function rateLimitedFetch(url: string): Promise<Response> {
    const now = Date.now();
    const timeSinceLast = now - lastRequestTime;
    if (timeSinceLast < REQUEST_DELAY_MS) {
        await sleep(REQUEST_DELAY_MS - timeSinceLast);
    }
    lastRequestTime = Date.now();

    const response = await fetch(url, {
        headers: { 'User-Agent': 'WhiteLabel-Peptides/1.0' },
    });

    if (!response.ok) {
        throw new Error(
            `Esplora API error: ${response.status} ${response.statusText} for ${url}`
        );
    }

    return response;
}

/**
 * Get all transactions for an address.
 * Returns most recent first, up to 25 per call (Esplora default).
 */
export async function getAddressTxs(address: string): Promise<EsploraTx[]> {
    const url = `${getBaseUrl()}/address/${address}/txs`;
    const response = await rateLimitedFetch(url);
    return response.json();
}

/**
 * Get the status of a specific transaction.
 */
export async function getTxStatus(
    txid: string
): Promise<EsploraTxStatus> {
    const url = `${getBaseUrl()}/tx/${txid}/status`;
    const response = await rateLimitedFetch(url);
    return response.json();
}

/**
 * Get current block height (tip height).
 */
export async function getBlockHeight(): Promise<number> {
    const url = `${getBaseUrl()}/blocks/tip/height`;
    const response = await rateLimitedFetch(url);
    const text = await response.text();
    return parseInt(text, 10);
}

/**
 * Calculate confirmations for a transaction given current block height.
 */
export function calculateConfirmations(
    txBlockHeight: number | undefined,
    currentBlockHeight: number
): number {
    if (!txBlockHeight) return 0;
    return Math.max(0, currentBlockHeight - txBlockHeight + 1);
}

/**
 * Build an explorer URL for a transaction (for admin dashboard links).
 */
export function getExplorerTxUrl(txid: string): string {
    const base = getBaseUrl();
    if (base.includes('mempool.space')) {
        return `https://mempool.space/tx/${txid}`;
    }
    // Default to Blockstream
    return `https://blockstream.info/tx/${txid}`;
}
