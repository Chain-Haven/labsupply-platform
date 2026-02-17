/**
 * BTC HD Wallet Derivation (BIP84 - Native SegWit bech32)
 * Derives receive addresses from an xpub/zpub/vpub without ever handling private keys.
 *
 * Derivation path: m/84'/0'/0'/0/<index> (mainnet)
 *                  m/84'/1'/0'/0/<index> (testnet)
 *
 * This module accepts zpub (mainnet) and vpub (testnet) prefixes and converts
 * them to standard xpub/tpub internally for compatibility with bip32.
 */

import * as ecc from 'tiny-secp256k1';
import { BIP32Factory } from 'bip32';
import * as bitcoin from 'bitcoinjs-lib';
import bs58check from 'bs58check';

const bip32 = BIP32Factory(ecc);

// Version byte maps for converting zpub/vpub to xpub/tpub
const ZPUB_VERSION = Buffer.from('04b24746', 'hex'); // zpub prefix bytes
const VPUB_VERSION = Buffer.from('045f1cf6', 'hex'); // vpub prefix bytes
const XPUB_VERSION = Buffer.from('0488b21e', 'hex'); // xpub prefix bytes
const TPUB_VERSION = Buffer.from('043587cf', 'hex'); // tpub prefix bytes

/**
 * Convert zpub/vpub extended public key to standard xpub/tpub format
 * that bip32 library can parse.
 */
function normalizeXpub(key: string): { xpub: string; network: bitcoin.Network } {
    const raw = Buffer.from(bs58check.decode(key));
    const versionBytes = raw.subarray(0, 4);

    if (versionBytes.equals(ZPUB_VERSION)) {
        const converted = Buffer.concat([XPUB_VERSION, raw.subarray(4)]);
        return {
            xpub: bs58check.encode(converted),
            network: bitcoin.networks.bitcoin,
        };
    }

    if (versionBytes.equals(VPUB_VERSION)) {
        const converted = Buffer.concat([TPUB_VERSION, raw.subarray(4)]);
        return {
            xpub: bs58check.encode(converted),
            network: bitcoin.networks.testnet,
        };
    }

    if (versionBytes.equals(XPUB_VERSION)) {
        return { xpub: key, network: bitcoin.networks.bitcoin };
    }

    if (versionBytes.equals(TPUB_VERSION)) {
        return { xpub: key, network: bitcoin.networks.testnet };
    }

    throw new Error(`Unsupported extended key prefix: ${versionBytes.toString('hex')}`);
}

/**
 * Derive a bech32 (P2WPKH) address from an xpub at the given index.
 * BIP84 external chain: xpub/0/<index>
 */
export function deriveAddress(
    xpubInput: string,
    index: number,
    networkOverride?: 'mainnet' | 'testnet'
): string {
    const { xpub, network: detectedNetwork } = normalizeXpub(xpubInput);

    const network = networkOverride
        ? (networkOverride === 'mainnet' ? bitcoin.networks.bitcoin : bitcoin.networks.testnet)
        : detectedNetwork;

    const node = bip32.fromBase58(xpub, network);
    // External chain (receive addresses): 0/<index>
    const child = node.derive(0).derive(index);

    const { address } = bitcoin.payments.p2wpkh({
        pubkey: Buffer.from(child.publicKey),
        network,
    });

    if (!address) {
        throw new Error(`Failed to derive address at index ${index}`);
    }

    return address;
}

/**
 * Validate that a string is a valid extended public key (xpub/zpub/vpub/tpub).
 */
export function validateXpub(key: string): boolean {
    try {
        const { xpub, network } = normalizeXpub(key);
        bip32.fromBase58(xpub, network);
        return true;
    } catch {
        return false;
    }
}

/**
 * Validate a bech32 Bitcoin address.
 */
export function validateBech32Address(addr: string): boolean {
    try {
        bitcoin.address.fromBech32(addr);
        return true;
    } catch {
        return false;
    }
}
