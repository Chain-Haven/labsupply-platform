<?php
/**
 * Cryptographic utilities for secure secret storage and HMAC signing
 *
 * @package LabSupply_Fulfillment
 */

defined('ABSPATH') || exit;

class LabSupply_Crypto
{

    /**
     * Encrypt a secret for storage
     *
     * @param string $secret The secret to encrypt
     * @return string|false The encrypted secret or false on failure
     */
    public static function encrypt_secret($secret)
    {
        if (!function_exists('sodium_crypto_secretbox')) {
            // Fallback to OpenSSL if libsodium not available
            return self::openssl_encrypt($secret);
        }

        $key = self::get_encryption_key();
        $nonce = random_bytes(SODIUM_CRYPTO_SECRETBOX_NONCEBYTES);

        $encrypted = sodium_crypto_secretbox($secret, $nonce, $key);

        // Combine nonce + encrypted data
        $combined = $nonce . $encrypted;

        return base64_encode($combined);
    }

    /**
     * Decrypt a stored secret
     *
     * @param string $encrypted_secret The encrypted secret
     * @return string|false The decrypted secret or false on failure
     */
    public static function decrypt_secret($encrypted_secret)
    {
        if (!function_exists('sodium_crypto_secretbox_open')) {
            return self::openssl_decrypt($encrypted_secret);
        }

        $key = self::get_encryption_key();
        $combined = base64_decode($encrypted_secret);

        if (strlen($combined) < SODIUM_CRYPTO_SECRETBOX_NONCEBYTES) {
            return false;
        }

        $nonce = substr($combined, 0, SODIUM_CRYPTO_SECRETBOX_NONCEBYTES);
        $encrypted = substr($combined, SODIUM_CRYPTO_SECRETBOX_NONCEBYTES);

        $decrypted = sodium_crypto_secretbox_open($encrypted, $nonce, $key);

        return $decrypted;
    }

    /**
     * Get the encryption key derived from WordPress salts
     *
     * @return string 32-byte key
     */
    private static function get_encryption_key()
    {
        $salt = defined('AUTH_KEY') ? AUTH_KEY : 'labsupply-default-key';
        $salt .= defined('SECURE_AUTH_KEY') ? SECURE_AUTH_KEY : '';

        // Derive a 32-byte key
        return hash('sha256', $salt, true);
    }

    /**
     * OpenSSL encryption fallback
     */
    private static function openssl_encrypt($data)
    {
        $key = self::get_encryption_key();
        $iv = openssl_random_pseudo_bytes(16);

        $encrypted = openssl_encrypt($data, 'AES-256-CBC', $key, 0, $iv);

        return base64_encode($iv . $encrypted);
    }

    /**
     * OpenSSL decryption fallback
     */
    private static function openssl_decrypt($data)
    {
        $key = self::get_encryption_key();
        $decoded = base64_decode($data);

        $iv = substr($decoded, 0, 16);
        $encrypted = substr($decoded, 16);

        return openssl_decrypt(base64_decode($encrypted), 'AES-256-CBC', $key, 0, $iv);
    }

    /**
     * Generate HMAC signature for API requests
     *
     * @param string $store_id The store ID
     * @param string $timestamp Request timestamp
     * @param string $nonce Random nonce
     * @param string $body Request body
     * @param string $secret Store secret
     * @return string HMAC signature
     */
    public static function generate_signature($store_id, $timestamp, $nonce, $body, $secret)
    {
        // Hash the body first
        $body_hash = hash('sha256', $body);

        // Create signing string
        $signing_string = "{$store_id}:{$timestamp}:{$nonce}:{$body_hash}";

        // Generate HMAC
        return hash_hmac('sha256', $signing_string, $secret);
    }

    /**
     * Verify HMAC signature from incoming request
     *
     * @param array $headers Request headers
     * @param string $body Request body
     * @param string $secret Store secret
     * @return bool Whether signature is valid
     */
    public static function verify_signature($headers, $body, $secret)
    {
        $store_id = isset($headers['X-Store-Id']) ? $headers['X-Store-Id'] : '';
        $timestamp = isset($headers['X-Timestamp']) ? $headers['X-Timestamp'] : '';
        $nonce = isset($headers['X-Nonce']) ? $headers['X-Nonce'] : '';
        $signature = isset($headers['X-Signature']) ? $headers['X-Signature'] : '';

        if (empty($store_id) || empty($timestamp) || empty($nonce) || empty($signature)) {
            return false;
        }

        // Check timestamp is within 5 minute window
        $timestamp_ms = intval($timestamp);
        $now_ms = time() * 1000;
        $five_minutes_ms = 5 * 60 * 1000;

        if (abs($now_ms - $timestamp_ms) > $five_minutes_ms) {
            return false;
        }

        // Generate expected signature
        $expected = self::generate_signature($store_id, $timestamp, $nonce, $body, $secret);

        // Constant-time comparison
        return hash_equals($expected, $signature);
    }

    /**
     * Generate a random nonce
     *
     * @return string 32-character hex nonce
     */
    public static function generate_nonce()
    {
        return bin2hex(random_bytes(16));
    }
}
