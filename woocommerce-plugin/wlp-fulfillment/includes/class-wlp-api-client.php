<?php
/**
 * API Client for communicating with WhiteLabel Peptides API
 *
 * @package WLP_Fulfillment
 */

defined('ABSPATH') || exit;

class WLP_API_Client
{

    /**
     * API base URL
     */
    private $base_url;

    /**
     * Store ID
     */
    private $store_id;

    /**
     * Store secret (decrypted)
     */
    private $secret;

    /**
     * Singleton instance
     */
    private static $instance = null;

    /**
     * Get singleton instance
     */
    public static function instance()
    {
        if (self::$instance === null) {
            self::$instance = new self();
        }
        return self::$instance;
    }

    /**
     * Constructor
     */
    private function __construct()
    {
        $this->base_url = get_option('wlp_api_url', 'https://api.whitelabel.peptidetech.co');
        $this->store_id = get_option('wlp_store_id', '');

        $encrypted_secret = get_option('wlp_store_secret', '');
        if ($encrypted_secret) {
            $this->secret = WLP_Crypto::decrypt_secret($encrypted_secret);
        }
    }

    /**
     * Check if connected
     */
    public function is_connected()
    {
        return !empty($this->store_id) && !empty($this->secret);
    }

    /**
     * Make authenticated API request
     *
     * @param string $method HTTP method
     * @param string $endpoint API endpoint
     * @param array $data Request body data
     * @return array|WP_Error Response or error
     */
    public function request($method, $endpoint, $data = array())
    {
        if (!$this->is_connected()) {
            return new WP_Error('not_connected', __('Not connected to WhiteLabel Peptides', 'wlp-fulfillment'));
        }

        $url = trailingslashit($this->base_url) . WLP_API_VERSION . '/' . ltrim($endpoint, '/');
        $body = !empty($data) ? wp_json_encode($data) : '';

        // Generate signature
        $timestamp = (string) (time() * 1000);
        $nonce = WLP_Crypto::generate_nonce();
        $signature = WLP_Crypto::generate_signature(
            $this->store_id,
            $timestamp,
            $nonce,
            $body,
            $this->secret
        );

        $headers = array(
            'Content-Type' => 'application/json',
            'Accept' => 'application/json',
            'X-Store-Id' => $this->store_id,
            'X-Timestamp' => $timestamp,
            'X-Nonce' => $nonce,
            'X-Signature' => $signature,
        );

        $args = array(
            'method' => $method,
            'headers' => $headers,
            'timeout' => 30,
            'sslverify' => true,
        );

        if (!empty($body) && in_array($method, array('POST', 'PUT', 'PATCH'))) {
            $args['body'] = $body;
        }

        WLP_Admin::log('debug', "API Request: {$method} {$endpoint}");

        $response = wp_remote_request($url, $args);

        if (is_wp_error($response)) {
            WLP_Admin::log('error', 'API Error: ' . $response->get_error_message());
            return $response;
        }

        $code = wp_remote_retrieve_response_code($response);
        $body = wp_remote_retrieve_body($response);
        $parsed = json_decode($body, true);

        if ($code >= 400) {
            $error_message = isset($parsed['error']['message'])
                ? $parsed['error']['message']
                : "API returned status {$code}";

            WLP_Admin::log('error', "API Error ({$code}): {$error_message}");

            return new WP_Error(
                isset($parsed['error']['code']) ? $parsed['error']['code'] : 'api_error',
                $error_message,
                array('status' => $code)
            );
        }

        WLP_Admin::log('debug', "API Response: {$code}");

        return isset($parsed['data']) ? $parsed['data'] : $parsed;
    }

    /**
     * Exchange connect code for credentials
     *
     * @param string $connect_code The connect code from portal
     * @return array|WP_Error Credentials or error
     */
    public function exchange_connect_code($connect_code)
    {
        $url = trailingslashit($this->base_url) . WLP_API_VERSION . '/stores/connect/exchange';

        $data = array(
            'connect_code' => $connect_code,
            'store_url' => home_url(),
            'store_name' => get_bloginfo('name'),
            'woo_version' => defined('WC_VERSION') ? WC_VERSION : 'unknown',
            'currency' => get_woocommerce_currency(),
            'timezone' => wp_timezone_string(),
        );

        $response = wp_remote_post($url, array(
            'headers' => array(
                'Content-Type' => 'application/json',
                'Accept' => 'application/json',
            ),
            'body' => wp_json_encode($data),
            'timeout' => 30,
        ));

        if (is_wp_error($response)) {
            return $response;
        }

        $code = wp_remote_retrieve_response_code($response);
        $body = json_decode(wp_remote_retrieve_body($response), true);

        if ($code >= 400) {
            return new WP_Error(
                isset($body['error']['code']) ? $body['error']['code'] : 'exchange_failed',
                isset($body['error']['message']) ? $body['error']['message'] : 'Failed to exchange connect code'
            );
        }

        return isset($body['data']) ? $body['data'] : $body;
    }

    /**
     * Get catalog products
     */
    public function get_catalog()
    {
        return $this->request('GET', 'catalog');
    }

    /**
     * Create supplier order
     */
    public function create_order($order_data)
    {
        return $this->request('POST', 'orders', $order_data);
    }

    /**
     * Cancel order
     */
    public function cancel_order($order_id, $reason = '')
    {
        return $this->request('POST', "orders/{$order_id}/cancel", array('reason' => $reason));
    }

    /**
     * Get wallet balance
     */
    public function get_wallet_balance()
    {
        return $this->request('GET', 'wallet');
    }

    /**
     * Get tracking updates
     */
    public function get_tracking_updates()
    {
        return $this->request('GET', 'tracking/pending');
    }

    /**
     * Acknowledge tracking updates
     */
    public function acknowledge_tracking($order_ids)
    {
        return $this->request('POST', 'tracking/acknowledge', array('order_ids' => $order_ids));
    }

    /**
     * Report import status
     */
    public function report_import_status($products)
    {
        return $this->request('POST', 'catalog/import-status', array(
            'store_id' => $this->store_id,
            'products' => $products,
        ));
    }

    /**
     * Health check
     */
    public function health_check()
    {
        $url = trailingslashit($this->base_url) . WLP_API_VERSION . '/health';

        $response = wp_remote_get($url, array('timeout' => 10));

        if (is_wp_error($response)) {
            return false;
        }

        return wp_remote_retrieve_response_code($response) === 200;
    }

    /**
     * Save connection credentials
     */
    public function save_credentials($store_id, $store_secret, $api_url = '')
    {
        update_option('wlp_store_id', $store_id);
        update_option('wlp_store_secret', WLP_Crypto::encrypt_secret($store_secret));

        if ($api_url) {
            update_option('wlp_api_url', $api_url);
        }

        // Reinitialize
        $this->store_id = $store_id;
        $this->secret = $store_secret;
        if ($api_url) {
            $this->base_url = $api_url;
        }

        update_option('wlp_connected_at', current_time('mysql'));
    }

    /**
     * Disconnect store
     */
    public function disconnect()
    {
        delete_option('wlp_store_id');
        delete_option('wlp_store_secret');
        delete_option('wlp_connected_at');

        $this->store_id = '';
        $this->secret = '';
    }

    /**
     * Get store ID
     */
    public function get_store_id()
    {
        return $this->store_id;
    }
}
