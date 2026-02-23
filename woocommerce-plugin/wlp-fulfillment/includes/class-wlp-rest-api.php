<?php
/**
 * REST API endpoints for receiving callbacks from WhiteLabel Peptides
 *
 * @package WLP_Fulfillment
 */

defined('ABSPATH') || exit;

class WLP_REST_API
{

    const NAMESPACE = 'wlp/v1';

    /**
     * Initialize REST API
     */
    public static function init()
    {
        add_action('rest_api_init', array(__CLASS__, 'register_routes'));
    }

    /**
     * Register REST routes
     */
    public static function register_routes()
    {
        // Tracking update endpoint
        register_rest_route(self::NAMESPACE , '/tracking', array(
            'methods' => 'POST',
            'callback' => array(__CLASS__, 'handle_tracking_update'),
            'permission_callback' => array(__CLASS__, 'verify_signature'),
        ));

        // Health check endpoint
        register_rest_route(self::NAMESPACE , '/health', array(
            'methods' => 'GET',
            'callback' => array(__CLASS__, 'health_check'),
            'permission_callback' => '__return_true',
        ));

        // BTC payment check (called from frontend checkout JS)
        register_rest_route(self::NAMESPACE , '/btc-payment-check', array(
            'methods' => 'POST',
            'callback' => array(__CLASS__, 'handle_btc_payment_check'),
            'permission_callback' => function () {
                return wp_verify_nonce(
                    isset($_SERVER['HTTP_X_WP_NONCE']) ? sanitize_text_field($_SERVER['HTTP_X_WP_NONCE']) : '',
                    'wp_rest'
                ) !== false;
            },
        ));

        // Order status callback
        register_rest_route(self::NAMESPACE , '/order-status', array(
            'methods' => 'POST',
            'callback' => array(__CLASS__, 'handle_order_status'),
            'permission_callback' => array(__CLASS__, 'verify_signature'),
        ));
    }

    /**
     * Verify request signature
     *
     * @param WP_REST_Request $request
     * @return bool|WP_Error
     */
    public static function verify_signature($request)
    {
        $headers = array(
            'X-Store-Id' => $request->get_header('X-Store-Id'),
            'X-Timestamp' => $request->get_header('X-Timestamp'),
            'X-Nonce' => $request->get_header('X-Nonce'),
            'X-Signature' => $request->get_header('X-Signature'),
        );

        $body = $request->get_body();

        // Get stored secret
        $encrypted_secret = get_option('wlp_store_secret', '');
        if (empty($encrypted_secret)) {
            return new WP_Error('not_connected', 'Store not connected', array('status' => 401));
        }

        $secret = WLP_Crypto::decrypt_secret($encrypted_secret);
        if (!$secret) {
            return new WP_Error('secret_error', 'Failed to decrypt secret', array('status' => 500));
        }

        // Verify store ID matches
        $stored_id = get_option('wlp_store_id', '');
        if ($headers['X-Store-Id'] !== $stored_id) {
            return new WP_Error('store_mismatch', 'Store ID mismatch', array('status' => 403));
        }

        // Verify signature
        if (!WLP_Crypto::verify_signature($headers, $body, $secret)) {
            WLP_Admin::log('warning', 'Invalid signature on incoming request');
            return new WP_Error('invalid_signature', 'Invalid request signature', array('status' => 401));
        }

        return true;
    }

    /**
     * Handle tracking update callback — wrapped in try/catch to never return 500
     *
     * @param WP_REST_Request $request
     * @return WP_REST_Response
     */
    public static function handle_tracking_update($request)
    {
        try {
            $data = $request->get_json_params();

            if (empty($data['updates']) || !is_array($data['updates'])) {
                return new WP_REST_Response(array(
                    'success' => false,
                    'error' => 'Invalid payload: expected { "updates": [...] }',
                ), 400);
            }

            $processed = array();
            $errors = array();

            foreach ($data['updates'] as $update) {
                try {
                    $result = WLP_Tracking::apply_tracking_update($update);
                    if ($result) {
                        $processed[] = $update['supplier_order_id'] ?? 'unknown';
                    } else {
                        $errors[] = $update['supplier_order_id'] ?? 'unknown';
                    }
                } catch (Throwable $e) {
                    $errors[] = ($update['supplier_order_id'] ?? 'unknown') . ': ' . $e->getMessage();
                    WLP_Admin::log('error', 'Tracking update exception: ' . $e->getMessage());
                }
            }

            WLP_Admin::log('info', sprintf(
                'Processed %d tracking updates, %d errors',
                count($processed),
                count($errors)
            ));

            return new WP_REST_Response(array(
                'success' => true,
                'processed' => $processed,
                'errors' => $errors,
            ), 200);
        } catch (Throwable $e) {
            WLP_Admin::log('error', 'Tracking webhook fatal error: ' . $e->getMessage());
            return new WP_REST_Response(array(
                'success' => false,
                'error' => 'Internal processing error',
            ), 200); // Return 200 so the API doesn't retry endlessly
        }
    }

    /**
     * Handle order status update
     *
     * @param WP_REST_Request $request
     * @return WP_REST_Response
     */
    public static function handle_order_status($request)
    {
        try {
            $data = $request->get_json_params();

            $woo_order_id = $data['woo_order_id'] ?? '';
            $new_status = $data['status'] ?? '';

            if (empty($woo_order_id) || empty($new_status)) {
                return new WP_REST_Response(array(
                    'success' => false,
                    'error' => 'Missing required fields: woo_order_id and status',
                ), 400);
            }

            $order = wc_get_order($woo_order_id);

            if (!$order) {
                return new WP_REST_Response(array(
                    'success' => false,
                    'error' => "Order #{$woo_order_id} not found in WooCommerce",
                ), 404);
            }

            $order->update_meta_data('_wlp_status', sanitize_text_field($new_status));
            $order->save();

            $order->add_order_note(sprintf(
                __('WhiteLabel Peptides supplier status: %s', 'wlp-fulfillment'),
                esc_html($new_status)
            ));

            // Auto-complete when the supplier marks as SHIPPED or COMPLETE
            $complete_statuses = array('SHIPPED', 'COMPLETE', 'shipped', 'complete');
            if (in_array($new_status, $complete_statuses, true) && !in_array($order->get_status(), array('completed', 'refunded', 'cancelled'), true)) {
                $target_status = apply_filters('wlp_shipped_order_status', 'completed');
                $order->update_status($target_status, __('Auto-completed: supplier fulfilled this order.', 'wlp-fulfillment'));
            }

            WLP_Admin::log('info', "Order {$woo_order_id} status updated to {$new_status}");

            return new WP_REST_Response(array('success' => true), 200);
        } catch (Throwable $e) {
            WLP_Admin::log('error', 'Order status webhook error: ' . $e->getMessage());
            return new WP_REST_Response(array('success' => false, 'error' => 'Internal error'), 200);
        }
    }

    /**
     * Health check endpoint
     *
     * @return WP_REST_Response
     */
    public static function health_check()
    {
        $api = WLP_API_Client::instance();

        return new WP_REST_Response(array(
            'status' => 'ok',
            'connected' => $api->is_connected(),
            'version' => WLP_VERSION,
            'woo_version' => defined('WC_VERSION') ? WC_VERSION : 'unknown',
        ), 200);
    }

    /**
     * BTC payment check — called by frontend JS when blockchain confirms payment
     */
    public static function handle_btc_payment_check($request)
    {
        try {
            $data = $request->get_json_params();
            $order_id = intval($data['order_id'] ?? 0);
            $address = sanitize_text_field($data['address'] ?? '');

            if (!$order_id || !$address) {
                return new WP_REST_Response(array('success' => false, 'error' => 'Missing order_id or address'), 400);
            }

            $order = wc_get_order($order_id);
            if (!$order) {
                return new WP_REST_Response(array('success' => false, 'error' => 'Order not found'), 404);
            }

            if ($order->get_payment_method() !== 'wlp_btc') {
                return new WP_REST_Response(array('success' => false, 'error' => 'Not a BTC order'), 400);
            }

            $stored_address = $order->get_meta('_wlp_btc_address');
            if ($stored_address !== $address) {
                return new WP_REST_Response(array('success' => false, 'error' => 'Address mismatch'), 403);
            }

            if ($order->is_paid()) {
                return new WP_REST_Response(array('success' => true, 'status' => 'already_paid'), 200);
            }

            // Verify payment against Esplora before marking as paid
            $esplora = $order->get_meta('_wlp_btc_esplora') ?: 'https://blockstream.info/api';
            $expected_sats = intval($order->get_meta('_wlp_btc_sats'));
            $conf_threshold = intval($order->get_meta('_wlp_btc_conf_threshold')) ?: 3;

            $response = wp_remote_get($esplora . '/address/' . $address . '/txs', array('timeout' => 15));
            if (is_wp_error($response)) {
                return new WP_REST_Response(array('success' => false, 'error' => 'Cannot verify payment'), 502);
            }

            $txs = json_decode(wp_remote_retrieve_body($response), true);
            if (!is_array($txs)) {
                return new WP_REST_Response(array('success' => false, 'error' => 'Invalid blockchain response'), 502);
            }

            $payment_found = false;
            $payment_txid = '';
            $payment_confirmed = false;

            foreach ($txs as $tx) {
                if (empty($tx['vout']) || !is_array($tx['vout'])) continue;
                foreach ($tx['vout'] as $out) {
                    if (($out['scriptpubkey_address'] ?? '') !== $address) continue;
                    $value = intval($out['value'] ?? 0);
                    $tolerance = max(100, intval($expected_sats * 0.02));
                    if ($value >= $expected_sats - $tolerance) {
                        $payment_found = true;
                        $payment_txid = $tx['txid'] ?? '';
                        if (!empty($tx['status']['confirmed'])) {
                            $payment_confirmed = true;
                        }
                        break 2;
                    }
                }
            }

            if (!$payment_found) {
                return new WP_REST_Response(array('success' => false, 'error' => 'Payment not found on blockchain'), 404);
            }

            $order->update_meta_data('_wlp_btc_txid', $payment_txid);

            if ($payment_confirmed) {
                $order->payment_complete($payment_txid);
                $order->add_order_note(sprintf(
                    __('Bitcoin payment confirmed. TXID: %s', 'wlp-fulfillment'),
                    $payment_txid
                ), true);
                WLP_Admin::log('info', "BTC payment confirmed for order #{$order_id}: {$payment_txid}");
            } else {
                $order->update_status('on-hold', sprintf(
                    __('Bitcoin payment detected (unconfirmed). TXID: %s', 'wlp-fulfillment'),
                    $payment_txid
                ));
            }

            $order->save();

            return new WP_REST_Response(array(
                'success' => true,
                'status' => $payment_confirmed ? 'confirmed' : 'detected',
                'txid' => $payment_txid,
            ), 200);
        } catch (Throwable $e) {
            WLP_Admin::log('error', 'BTC payment check error: ' . $e->getMessage());
            return new WP_REST_Response(array('success' => false, 'error' => 'Internal error'), 200);
        }
    }
}
