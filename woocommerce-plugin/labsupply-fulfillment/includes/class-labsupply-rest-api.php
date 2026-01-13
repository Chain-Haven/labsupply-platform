<?php
/**
 * REST API endpoints for receiving callbacks from LabSupply
 *
 * @package LabSupply_Fulfillment
 */

defined('ABSPATH') || exit;

class LabSupply_REST_API
{

    const NAMESPACE = 'labsupply/v1';

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
        $encrypted_secret = get_option('labsupply_store_secret', '');
        if (empty($encrypted_secret)) {
            return new WP_Error('not_connected', 'Store not connected', array('status' => 401));
        }

        $secret = LabSupply_Crypto::decrypt_secret($encrypted_secret);
        if (!$secret) {
            return new WP_Error('secret_error', 'Failed to decrypt secret', array('status' => 500));
        }

        // Verify store ID matches
        $stored_id = get_option('labsupply_store_id', '');
        if ($headers['X-Store-Id'] !== $stored_id) {
            return new WP_Error('store_mismatch', 'Store ID mismatch', array('status' => 403));
        }

        // Verify signature
        if (!LabSupply_Crypto::verify_signature($headers, $body, $secret)) {
            LabSupply_Admin::log('warning', 'Invalid signature on incoming request');
            return new WP_Error('invalid_signature', 'Invalid request signature', array('status' => 401));
        }

        return true;
    }

    /**
     * Handle tracking update callback
     *
     * @param WP_REST_Request $request
     * @return WP_REST_Response
     */
    public static function handle_tracking_update($request)
    {
        $data = $request->get_json_params();

        if (empty($data['updates']) || !is_array($data['updates'])) {
            return new WP_REST_Response(array(
                'success' => false,
                'error' => 'Invalid payload',
            ), 400);
        }

        $processed = array();
        $errors = array();

        foreach ($data['updates'] as $update) {
            $result = LabSupply_Tracking::apply_tracking_update($update);

            if ($result) {
                $processed[] = $update['supplier_order_id'];
            } else {
                $errors[] = $update['supplier_order_id'];
            }
        }

        LabSupply_Admin::log('info', sprintf(
            'Processed %d tracking updates, %d errors',
            count($processed),
            count($errors)
        ));

        return new WP_REST_Response(array(
            'success' => true,
            'processed' => $processed,
            'errors' => $errors,
        ), 200);
    }

    /**
     * Handle order status update
     *
     * @param WP_REST_Request $request
     * @return WP_REST_Response
     */
    public static function handle_order_status($request)
    {
        $data = $request->get_json_params();

        $woo_order_id = $data['woo_order_id'] ?? '';
        $supplier_order_id = $data['supplier_order_id'] ?? '';
        $new_status = $data['status'] ?? '';

        if (empty($woo_order_id) || empty($new_status)) {
            return new WP_REST_Response(array(
                'success' => false,
                'error' => 'Missing required fields',
            ), 400);
        }

        $order = wc_get_order($woo_order_id);

        if (!$order) {
            return new WP_REST_Response(array(
                'success' => false,
                'error' => 'Order not found',
            ), 404);
        }

        // Update supplier status meta
        $order->update_meta_data('_labsupply_status', $new_status);
        $order->save();

        // Add order note
        $order->add_order_note(sprintf(
            __('LabSupply status updated: %s', 'labsupply-fulfillment'),
            $new_status
        ));

        LabSupply_Admin::log('info', "Order {$woo_order_id} status updated to {$new_status}");

        return new WP_REST_Response(array(
            'success' => true,
        ), 200);
    }

    /**
     * Health check endpoint
     *
     * @return WP_REST_Response
     */
    public static function health_check()
    {
        $api = LabSupply_API_Client::instance();

        return new WP_REST_Response(array(
            'status' => 'ok',
            'connected' => $api->is_connected(),
            'version' => LABSUPPLY_VERSION,
            'woo_version' => defined('WC_VERSION') ? WC_VERSION : 'unknown',
        ), 200);
    }
}
