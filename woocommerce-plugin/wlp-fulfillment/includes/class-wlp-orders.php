<?php
/**
 * Order sync functionality
 *
 * @package WLP_Fulfillment
 */

defined('ABSPATH') || exit;

class WLP_Orders
{

    /**
     * Initialize order hooks
     */
    public static function init()
    {
        // Hook into order status changes
        add_action('woocommerce_order_status_processing', array(__CLASS__, 'sync_order'), 10, 2);
        add_action('woocommerce_order_status_completed', array(__CLASS__, 'sync_order'), 10, 2);
        add_action('woocommerce_payment_complete', array(__CLASS__, 'sync_order'), 10, 1);

        // Cron job for retry queue
        add_action('wlp_sync_orders', array(__CLASS__, 'process_queue'));

        // Action Scheduler for retries
        add_action('wlp_retry_order_sync', array(__CLASS__, 'retry_single_order'), 10, 1);
    }

    /**
     * Sync order to WhiteLabel Peptides
     *
     * @param int $order_id WooCommerce order ID
     * @param WC_Order|null $order Order object
     */
    public static function sync_order($order_id, $order = null)
    {
        if (!$order) {
            $order = wc_get_order($order_id);
        }

        if (!$order) {
            return;
        }

        $api = WLP_API_Client::instance();
        if (!$api->is_connected()) {
            WLP_Admin::log('warning', "Cannot sync order {$order_id}: Not connected");
            return;
        }

        // Check if already synced
        $supplier_order_id = $order->get_meta('_wlp_order_id');
        if ($supplier_order_id) {
            WLP_Admin::log('debug', "Order {$order_id} already synced as {$supplier_order_id}");
            return;
        }

        // Build order items (only supplier products)
        $items = self::build_order_items($order);

        if (empty($items)) {
            WLP_Admin::log('debug', "Order {$order_id} has no supplier products, skipping");
            return;
        }

        // Prepare order data
        $order_data = array(
            'woo_order_id' => (string) $order_id,
            'woo_order_number' => $order->get_order_number(),
            'currency' => $order->get_currency(),
            'shipping_method' => self::get_shipping_method_type($order),
            'shipping_address' => self::format_address($order, 'shipping'),
            'billing_address' => self::format_address($order, 'billing'),
            'customer_email' => $order->get_billing_email(),
            'customer_note' => $order->get_customer_note(),
            'items' => $items,
        );

        WLP_Admin::log('info', "Syncing order {$order_id} with " . count($items) . " supplier items");

        $result = $api->create_order($order_data);

        if (is_wp_error($result)) {
            self::handle_sync_error($order, $result);
            return;
        }

        // Save supplier order ID
        $order->update_meta_data('_wlp_order_id', $result['supplier_order_id']);
        $order->update_meta_data('_wlp_status', $result['status']);
        $order->update_meta_data('_wlp_synced_at', current_time('mysql'));
        $order->save();

        // Add order note
        $note = sprintf(
            __('Order synced to WhiteLabel Peptides. Supplier Order ID: %s. Status: %s.', 'wlp-fulfillment'),
            $result['supplier_order_id'],
            $result['status']
        );

        if (!$result['is_funded']) {
            $note .= ' ' . __('Note: Awaiting wallet funding.', 'wlp-fulfillment');
        }

        $order->add_order_note($note);

        WLP_Admin::log('info', "Order {$order_id} synced successfully as {$result['supplier_order_id']}");

        // Remove from retry queue if exists
        self::remove_from_queue($order_id);
    }

    /**
     * Build order items from WooCommerce order
     *
     * @param WC_Order $order
     * @return array Items with supplier SKUs
     */
    private static function build_order_items($order)
    {
        $items = array();

        foreach ($order->get_items() as $item_id => $item) {
            $product = $item->get_product();
            if (!$product) {
                continue;
            }

            // Check if product has supplier SKU
            $supplier_sku = $product->get_meta('_wlp_sku');
            if (empty($supplier_sku)) {
                continue;
            }

            $items[] = array(
                'supplier_sku' => $supplier_sku,
                'woo_product_id' => (string) $product->get_id(),
                'qty' => $item->get_quantity(),
                'unit_price_cents' => (int) ($item->get_total() / $item->get_quantity() * 100),
                'name' => $product->get_name(),
            );
        }

        return $items;
    }

    /**
     * Format address for API
     *
     * @param WC_Order $order
     * @param string $type 'shipping' or 'billing'
     * @return array
     */
    private static function format_address($order, $type = 'shipping')
    {
        $prefix = $type === 'billing' ? 'billing' : 'shipping';

        return array(
            'first_name' => $order->{"get_{$prefix}_first_name"}(),
            'last_name' => $order->{"get_{$prefix}_last_name"}(),
            'company' => $order->{"get_{$prefix}_company"}(),
            'address_1' => $order->{"get_{$prefix}_address_1"}(),
            'address_2' => $order->{"get_{$prefix}_address_2"}(),
            'city' => $order->{"get_{$prefix}_city"}(),
            'state' => $order->{"get_{$prefix}_state"}(),
            'postcode' => $order->{"get_{$prefix}_postcode"}(),
            'country' => $order->{"get_{$prefix}_country"}(),
            'phone' => $order->get_billing_phone(),
            'email' => $order->get_billing_email(),
        );
    }

    /**
     * Get shipping method type (STANDARD or EXPEDITED)
     *
     * @param WC_Order $order
     * @return string STANDARD or EXPEDITED
     */
    private static function get_shipping_method_type($order)
    {
        $shipping_methods = $order->get_shipping_methods();

        foreach ($shipping_methods as $shipping_method) {
            $method_id = $shipping_method->get_method_id();
            $method_title = strtolower($shipping_method->get_method_title());

            // Check for expedited shipping indicators
            $expedited_keywords = array('expedited', 'express', '2-day', '2 day', 'priority', 'overnight', 'next day', 'fast');

            foreach ($expedited_keywords as $keyword) {
                if (strpos($method_title, $keyword) !== false) {
                    return 'EXPEDITED';
                }
            }

            // Check for specific WhiteLabel Peptides shipping method selection
            $selected_method = $order->get_meta('_wlp_shipping_method');
            if ($selected_method === 'EXPEDITED') {
                return 'EXPEDITED';
            }
        }

        return 'STANDARD';
    }

    /**
     * Handle sync error
     *
     * @param WC_Order $order
     * @param WP_Error $error
     */
    private static function handle_sync_error($order, $error)
    {
        $error_message = $error->get_error_message();

        WLP_Admin::log('error', "Failed to sync order {$order->get_id()}: {$error_message}");

        // Add to retry queue
        self::add_to_queue($order->get_id(), $error_message);

        // Add order note
        $order->add_order_note(sprintf(
            __('WhiteLabel Peptides sync failed: %s. Will retry automatically.', 'wlp-fulfillment'),
            $error_message
        ));
    }

    /**
     * Add order to retry queue
     */
    private static function add_to_queue($order_id, $error = '')
    {
        global $wpdb;

        $table = $wpdb->prefix . 'wlp_order_queue';

        // Check if already in queue
        $existing = $wpdb->get_var($wpdb->prepare(
            "SELECT id FROM {$table} WHERE order_id = %d AND status = 'pending'",
            $order_id
        ));

        if ($existing) {
            $wpdb->update(
                $table,
                array(
                    'attempts' => $wpdb->get_var($wpdb->prepare(
                        "SELECT attempts FROM {$table} WHERE id = %d",
                        $existing
                    )) + 1,
                    'last_error' => $error,
                ),
                array('id' => $existing)
            );
        } else {
            $wpdb->insert($table, array(
                'order_id' => $order_id,
                'status' => 'pending',
                'attempts' => 1,
                'last_error' => $error,
            ));
        }

        // Schedule retry with Action Scheduler if available
        if (function_exists('as_schedule_single_action')) {
            $delay = self::calculate_retry_delay(1);
            as_schedule_single_action(time() + $delay, 'wlp_retry_order_sync', array($order_id));
        }
    }

    /**
     * Remove from retry queue
     */
    private static function remove_from_queue($order_id)
    {
        global $wpdb;

        $wpdb->update(
            $wpdb->prefix . 'wlp_order_queue',
            array('status' => 'completed', 'synced_at' => current_time('mysql')),
            array('order_id' => $order_id, 'status' => 'pending')
        );
    }

    /**
     * Calculate retry delay with exponential backoff
     */
    private static function calculate_retry_delay($attempt)
    {
        $base_delay = 60; // 1 minute
        $max_delay = 3600; // 1 hour
        $delay = $base_delay * pow(2, $attempt - 1);
        return min($delay, $max_delay);
    }

    /**
     * Process retry queue (cron)
     */
    public static function process_queue()
    {
        global $wpdb;

        $table = $wpdb->prefix . 'wlp_order_queue';
        $max_attempts = 5;

        // Get pending orders
        $pending = $wpdb->get_results($wpdb->prepare(
            "SELECT * FROM {$table} 
             WHERE status = 'pending' 
             AND attempts < %d 
             ORDER BY created_at ASC 
             LIMIT 10",
            $max_attempts
        ));

        foreach ($pending as $item) {
            self::retry_single_order($item->order_id);
        }

        // Mark failed orders as dead letter
        $wpdb->query($wpdb->prepare(
            "UPDATE {$table} SET status = 'failed' WHERE status = 'pending' AND attempts >= %d",
            $max_attempts
        ));
    }

    /**
     * Retry syncing a single order
     */
    public static function retry_single_order($order_id)
    {
        $order = wc_get_order($order_id);
        if (!$order) {
            return;
        }

        WLP_Admin::log('info', "Retrying sync for order {$order_id}");

        self::sync_order($order_id, $order);
    }

    /**
     * Resend recent orders (admin action)
     */
    public static function resend_orders($count = 10)
    {
        $orders = wc_get_orders(array(
            'limit' => $count,
            'status' => array('processing', 'completed'),
            'orderby' => 'date',
            'order' => 'DESC',
            'meta_query' => array(
                array(
                    'key' => '_wlp_order_id',
                    'compare' => 'NOT EXISTS',
                ),
            ),
        ));

        $synced = 0;
        foreach ($orders as $order) {
            self::sync_order($order->get_id(), $order);
            $synced++;
        }

        return $synced;
    }
}
