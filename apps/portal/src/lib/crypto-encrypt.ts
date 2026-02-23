/**
 * BTC xPub Encryption/Decryption Utility (server-side only)
 * Uses AES-256-GCM. Format: iv:authTag:ciphertext (all hex-encoded)
 */

import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;

function getEncryptionKey(): Buffer {
    const key = process.env.BTC_XPUB_ENCRYPTION_KEY;
    if (!key || key.length !== 64) {
        throw new Error('BTC_XPUB_ENCRYPTION_KEY must be a 64-character hex string (32 bytes)');
    }
    return Buffer.from(key, 'hex');
}

export function encryptValue(plaintext: string): string {
    const key = getEncryptionKey();
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
    const authTag = cipher.getAuthTag();
    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`;
}

export function decryptValue(encryptedValue: string): string {
    const key = getEncryptionKey();
    const parts = encryptedValue.split(':');
    if (parts.length !== 3) throw new Error('Invalid encrypted format: expected iv:authTag:ciphertext. The stored value may be corrupted.');

    const [ivHex, authTagHex, ciphertextHex] = parts;
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    const ciphertext = Buffer.from(ciphertextHex, 'hex');

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);
    const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
    return decrypted.toString('utf8');
}
