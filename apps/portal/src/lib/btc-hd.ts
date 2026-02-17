/**
 * BTC HD Wallet Derivation (BIP84 - Native SegWit bech32)
 * Server-side only - used by API routes for address derivation.
 */

import * as ecc from 'tiny-secp256k1';
import { BIP32Factory } from 'bip32';
import * as bitcoin from 'bitcoinjs-lib';
import bs58check from 'bs58check';

const bip32 = BIP32Factory(ecc);

const ZPUB_VERSION = Buffer.from('04b24746', 'hex');
const VPUB_VERSION = Buffer.from('045f1cf6', 'hex');
const XPUB_VERSION = Buffer.from('0488b21e', 'hex');
const TPUB_VERSION = Buffer.from('043587cf', 'hex');

function normalizeXpub(key: string): { xpub: string; network: bitcoin.Network } {
    const raw = Buffer.from(bs58check.decode(key));
    const versionBytes = raw.subarray(0, 4);

    if (versionBytes.equals(ZPUB_VERSION)) {
        const converted = Buffer.concat([XPUB_VERSION, raw.subarray(4)]);
        return { xpub: bs58check.encode(converted), network: bitcoin.networks.bitcoin };
    }
    if (versionBytes.equals(VPUB_VERSION)) {
        const converted = Buffer.concat([TPUB_VERSION, raw.subarray(4)]);
        return { xpub: bs58check.encode(converted), network: bitcoin.networks.testnet };
    }
    if (versionBytes.equals(XPUB_VERSION)) {
        return { xpub: key, network: bitcoin.networks.bitcoin };
    }
    if (versionBytes.equals(TPUB_VERSION)) {
        return { xpub: key, network: bitcoin.networks.testnet };
    }

    throw new Error(`Unsupported extended key prefix: ${versionBytes.toString('hex')}`);
}

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
    const child = node.derive(0).derive(index);

    const { address } = bitcoin.payments.p2wpkh({
        pubkey: Buffer.from(child.publicKey),
        network,
    });

    if (!address) throw new Error(`Failed to derive address at index ${index}`);
    return address;
}

export function validateXpub(key: string): boolean {
    try {
        const { xpub, network } = normalizeXpub(key);
        bip32.fromBase58(xpub, network);
        return true;
    } catch {
        return false;
    }
}

export function validateBech32Address(addr: string): boolean {
    try {
        bitcoin.address.fromBech32(addr);
        return true;
    } catch {
        return false;
    }
}
