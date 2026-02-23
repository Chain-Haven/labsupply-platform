<?php
/**
 * Tracking update handler
 *
 * Handles tracking data from the fulfillment API:
 * - Polling for pending tracking updates (hourly cron)
 * - Applying tracking data to WooCommerce orders
 * - Auto-completing orders when shipped
 * - Displaying tracking info on frontend, admin, and in emails
 *
 * @package WLP_Fulfillment
 */

defined('ABSPATH') || exit;

class WLP_Tracking
{

    public static function init()
    {
        // Cron polling
        add_action('wlp_check_tracking', array(__CLASS__, 'poll_tracking_updates'));

        // Customer order details page
        add_action('woocommerce_order_details_after_order_table', array(__CLASS__, 'display_order_tracking'));

        // Admin order edit page (HPOS-compatible)
        add_action('woocommerce_admin_order_data_after_shipping_address', array(__CLASS__, 'display_admin_tracking'));
        add_action('add_meta_boxes', array(__CLASS__, 'add_tracking_meta_box'));

        // WooCommerce emails — attach tracking info to completed order email
        add_action('woocommerce_email_order_details', array(__CLASS__, 'display_email_tracking'), 25, 4);
    }

    /**
     * Poll for tracking updates (cron)
     */
    public static function poll_tracking_updates()
    {
        try {
            $api = WLP_API_Client::instance();

            if (!$api->is_connected()) {
                return;
            }

            $updates = $api->get_tracking_updates();

            if (is_wp_error($updates) || empty($updates['updates'])) {
                return;
            }

            $acknowledged = array();

            foreach ($updates['updates'] as $update) {
                $result = self::apply_tracking_update($update);
                if ($result) {
                    $acknowledged[] = $update['supplier_order_id'];
                }
            }

            if (!empty($acknowledged)) {
                $api->acknowledge_tracking($acknowledged);
            }
        } catch (Throwable $e) {
            if (class_exists('WLP_Admin')) {
                WLP_Admin::log('error', 'Tracking poll failed: ' . $e->getMessage());
            }
        }
    }

    /**
     * Apply a tracking update to a WooCommerce order
     */
    public static function apply_tracking_update($update)
    {
        if (empty($update['woo_order_id'])) {
            return false;
        }

        $order = wc_get_order($update['woo_order_id']);
        if (!$order) {
            WLP_Admin::log('warning', "Cannot find order for tracking update: {$update['woo_order_id']}");
            return false;
        }

        $supplier_order_id = $order->get_meta('_wlp_order_id');
        if (!empty($supplier_order_id) && !empty($update['supplier_order_id']) && $supplier_order_id !== $update['supplier_order_id']) {
            WLP_Admin::log('warning', "Supplier order ID mismatch for order {$update['woo_order_id']}");
            return false;
        }

        // Save tracking meta
        $order->update_meta_data('_wlp_tracking_number', sanitize_text_field($update['tracking_number'] ?? ''));
        $order->update_meta_data('_wlp_tracking_url', esc_url_raw($update['tracking_url'] ?? ''));
        $order->update_meta_data('_wlp_carrier', sanitize_text_field($update['carrier'] ?? ''));
        $order->update_meta_data('_wlp_shipped_at', sanitize_text_field($update['shipped_at'] ?? ''));
        $order->update_meta_data('_wlp_status', sanitize_text_field($update['status'] ?? 'shipped'));

        // Customer-visible order note with tracking link
        $note = sprintf(
            __('Your order has been shipped via %s.', 'wlp-fulfillment'),
            esc_html($update['carrier'] ?? 'carrier')
        );
        $note .= ' ' . sprintf(
            __('Tracking number: %s', 'wlp-fulfillment'),
            esc_html($update['tracking_number'] ?? '')
        );

        if (!empty($update['tracking_url'])) {
            $note .= sprintf(
                ' — <a href="%s" target="_blank">%s</a>',
                esc_url($update['tracking_url']),
                __('Track your package', 'wlp-fulfillment')
            );
        }

        $order->add_order_note($note, true);

        // Auto-complete the order when shipped
        if (!empty($update['status']) && $update['status'] === 'shipped') {
            $target_status = apply_filters('wlp_shipped_order_status', 'completed');
            if ($order->get_status() !== $target_status) {
                $order->update_status($target_status, __('Order shipped and completed via WhiteLabel Peptides fulfillment.', 'wlp-fulfillment'));
            }
        }

        $order->save();

        WLP_Admin::log('info', "Applied tracking update for order {$update['woo_order_id']}: {$update['tracking_number']}");

        do_action('wlp_tracking_updated', $order, $update);

        return true;
    }

    /**
     * Get tracking info for an order
     */
    public static function get_tracking_info($order_id)
    {
        $order = wc_get_order($order_id);
        if (!$order) {
            return null;
        }

        $tracking_number = $order->get_meta('_wlp_tracking_number');
        if (empty($tracking_number)) {
            return null;
        }

        return array(
            'tracking_number' => $tracking_number,
            'tracking_url' => $order->get_meta('_wlp_tracking_url'),
            'carrier' => $order->get_meta('_wlp_carrier'),
            'shipped_at' => $order->get_meta('_wlp_shipped_at'),
        );
    }

    /**
     * Display tracking on the customer "My Account > Order" page
     */
    public static function display_order_tracking($order)
    {
        $tracking = self::get_tracking_info($order->get_id());
        if (!$tracking) {
            return;
        }

        echo '<h2>' . esc_html__('Shipping Information', 'wlp-fulfillment') . '</h2>';
        echo '<table class="woocommerce-table woocommerce-table--order-details shop_table order_details">';
        echo '<tr><th>' . esc_html__('Carrier', 'wlp-fulfillment') . '</th><td>' . esc_html($tracking['carrier']) . '</td></tr>';
        echo '<tr><th>' . esc_html__('Tracking Number', 'wlp-fulfillment') . '</th><td>';

        if (!empty($tracking['tracking_url'])) {
            echo '<a href="' . esc_url($tracking['tracking_url']) . '" target="_blank" rel="noopener">' . esc_html($tracking['tracking_number']) . ' &rarr;</a>';
        } else {
            echo esc_html($tracking['tracking_number']);
        }

        echo '</td></tr>';

        if (!empty($tracking['shipped_at'])) {
            echo '<tr><th>' . esc_html__('Shipped', 'wlp-fulfillment') . '</th><td>' . esc_html(date_i18n(get_option('date_format'), strtotime($tracking['shipped_at']))) . '</td></tr>';
        }

        echo '</table>';
    }

    /**
     * Display tracking in the WP Admin order edit page (after shipping address)
     */
    public static function display_admin_tracking($order)
    {
        $tracking = self::get_tracking_info($order->get_id());
        if (!$tracking) {
            return;
        }

        echo '<div class="wlp-admin-tracking" style="margin-top:12px; padding:10px 12px; background:#f0f7ff; border:1px solid #c3daff; border-radius:4px;">';
        echo '<h4 style="margin:0 0 6px; color:#1e40af;">&#128230; WhiteLabel Peptides Shipment</h4>';
        echo '<p style="margin:2px 0;"><strong>' . esc_html__('Carrier:', 'wlp-fulfillment') . '</strong> ' . esc_html($tracking['carrier']) . '</p>';
        echo '<p style="margin:2px 0;"><strong>' . esc_html__('Tracking:', 'wlp-fulfillment') . '</strong> ';

        if (!empty($tracking['tracking_url'])) {
            echo '<a href="' . esc_url($tracking['tracking_url']) . '" target="_blank" rel="noopener">' . esc_html($tracking['tracking_number']) . '</a>';
        } else {
            echo '<code>' . esc_html($tracking['tracking_number']) . '</code>';
        }

        echo '</p>';

        if (!empty($tracking['shipped_at'])) {
            echo '<p style="margin:2px 0;"><strong>' . esc_html__('Shipped:', 'wlp-fulfillment') . '</strong> ' . esc_html(date_i18n(get_option('date_format') . ' ' . get_option('time_format'), strtotime($tracking['shipped_at']))) . '</p>';
        }

        echo '</div>';
    }

    /**
     * Add a meta box on the order edit page for tracking (HPOS-safe)
     */
    public static function add_tracking_meta_box()
    {
        $screen = 'shop_order';

        try {
            if (function_exists('wc_get_container')
                && class_exists(\Automattic\WooCommerce\Internal\DataStores\Orders\CustomOrdersTableController::class)
            ) {
                $controller = wc_get_container()->get(\Automattic\WooCommerce\Internal\DataStores\Orders\CustomOrdersTableController::class);
                if ($controller->custom_orders_table_usage_is_enabled()) {
                    $screen = wc_get_page_screen_id('shop-order');
                }
            }
        } catch (Throwable $e) {
            // Fall back to legacy screen
        }

        add_meta_box(
            'wlp-tracking-info',
            __('WhiteLabel Fulfillment', 'wlp-fulfillment'),
            array(__CLASS__, 'render_tracking_meta_box'),
            $screen,
            'side',
            'default'
        );
    }

    /**
     * Render the tracking meta box content
     */
    public static function render_tracking_meta_box($post_or_order)
    {
        $order = ($post_or_order instanceof WC_Order) ? $post_or_order : wc_get_order($post_or_order->ID);
        if (!$order) {
            echo '<p>' . esc_html__('Order not found.', 'wlp-fulfillment') . '</p>';
            return;
        }

        $supplier_id = $order->get_meta('_wlp_order_id');
        $tracking = self::get_tracking_info($order->get_id());
        $synced_at = $order->get_meta('_wlp_synced_at');
        $status = $order->get_meta('_wlp_status');

        if (!$supplier_id) {
            echo '<p style="color:#666;">' . esc_html__('This order has not been synced to WhiteLabel Peptides.', 'wlp-fulfillment') . '</p>';
            return;
        }

        echo '<p><strong>' . esc_html__('Supplier Order:', 'wlp-fulfillment') . '</strong><br><code style="font-size:11px;">' . esc_html($supplier_id) . '</code></p>';

        if ($status) {
            $badge_color = $status === 'SHIPPED' ? '#059669' : ($status === 'COMPLETE' ? '#16a34a' : '#d97706');
            echo '<p><strong>' . esc_html__('Status:', 'wlp-fulfillment') . '</strong> <span style="background:' . $badge_color . '; color:#fff; padding:2px 8px; border-radius:10px; font-size:11px;">' . esc_html($status) . '</span></p>';
        }

        if ($synced_at) {
            echo '<p><strong>' . esc_html__('Synced:', 'wlp-fulfillment') . '</strong> ' . esc_html($synced_at) . '</p>';
        }

        if ($tracking) {
            echo '<hr style="margin:8px 0;">';
            echo '<p><strong>' . esc_html__('Carrier:', 'wlp-fulfillment') . '</strong> ' . esc_html($tracking['carrier']) . '</p>';
            echo '<p><strong>' . esc_html__('Tracking:', 'wlp-fulfillment') . '</strong> ';

            if (!empty($tracking['tracking_url'])) {
                echo '<a href="' . esc_url($tracking['tracking_url']) . '" target="_blank">' . esc_html($tracking['tracking_number']) . '</a>';
            } else {
                echo esc_html($tracking['tracking_number']);
            }
            echo '</p>';

            if (!empty($tracking['shipped_at'])) {
                echo '<p><strong>' . esc_html__('Shipped:', 'wlp-fulfillment') . '</strong> ' . esc_html(date_i18n(get_option('date_format'), strtotime($tracking['shipped_at']))) . '</p>';
            }
        }
    }

    /**
     * Add tracking info to WooCommerce order emails (completed, shipped)
     */
    public static function display_email_tracking($order, $sent_to_admin, $plain_text, $email)
    {
        if (!$order || !in_array($email->id, array('customer_completed_order', 'customer_invoice'), true)) {
            return;
        }

        $tracking = self::get_tracking_info($order->get_id());
        if (!$tracking) {
            return;
        }

        if ($plain_text) {
            echo "\n\n=== " . __('Shipping Information', 'wlp-fulfillment') . " ===\n";
            echo __('Carrier:', 'wlp-fulfillment') . ' ' . $tracking['carrier'] . "\n";
            echo __('Tracking Number:', 'wlp-fulfillment') . ' ' . $tracking['tracking_number'] . "\n";
            if (!empty($tracking['tracking_url'])) {
                echo __('Track your package:', 'wlp-fulfillment') . ' ' . $tracking['tracking_url'] . "\n";
            }
        } else {
            echo '<div style="margin:16px 0; padding:16px; border:1px solid #e2e8f0; border-radius:6px; background:#f8fafc;">';
            echo '<h2 style="margin:0 0 8px; font-size:16px; color:#1e293b;">' . esc_html__('Shipping Information', 'wlp-fulfillment') . '</h2>';
            echo '<p style="margin:4px 0;"><strong>' . esc_html__('Carrier:', 'wlp-fulfillment') . '</strong> ' . esc_html($tracking['carrier']) . '</p>';
            echo '<p style="margin:4px 0;"><strong>' . esc_html__('Tracking Number:', 'wlp-fulfillment') . '</strong> ';

            if (!empty($tracking['tracking_url'])) {
                echo '<a href="' . esc_url($tracking['tracking_url']) . '" style="color:#7c3aed; text-decoration:underline;" target="_blank">' . esc_html($tracking['tracking_number']) . '</a>';
            } else {
                echo esc_html($tracking['tracking_number']);
            }

            echo '</p>';

            if (!empty($tracking['shipped_at'])) {
                echo '<p style="margin:4px 0;"><strong>' . esc_html__('Shipped:', 'wlp-fulfillment') . '</strong> ' . esc_html(date_i18n(get_option('date_format'), strtotime($tracking['shipped_at']))) . '</p>';
            }

            echo '</div>';
        }
    }
}
