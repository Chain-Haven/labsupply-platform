<?php
/**
 * Tracking update handler
 *
 * @package LabSupply_Fulfillment
 */

defined('ABSPATH') || exit;

class LabSupply_Tracking
{

    /**
     * Initialize tracking hooks
     */
    public static function init()
    {
        // Cron job
        add_action('labsupply_check_tracking', array(__CLASS__, 'poll_tracking_updates'));
    }

    /**
     * Poll for tracking updates (cron)
     */
    public static function poll_tracking_updates()
    {
        $api = LabSupply_API_Client::instance();

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

        // Acknowledge processed updates
        if (!empty($acknowledged)) {
            $api->acknowledge_tracking($acknowledged);
        }
    }

    /**
     * Apply a tracking update to a WooCommerce order
     *
     * @param array $update Tracking update data
     * @return bool Success
     */
    public static function apply_tracking_update($update)
    {
        // Find order by WooCommerce order ID
        $order = wc_get_order($update['woo_order_id']);

        if (!$order) {
            LabSupply_Admin::log('warning', "Cannot find order for tracking update: {$update['woo_order_id']}");
            return false;
        }

        // Verify supplier order ID matches
        $supplier_order_id = $order->get_meta('_labsupply_order_id');
        if ($supplier_order_id !== $update['supplier_order_id']) {
            LabSupply_Admin::log('warning', "Supplier order ID mismatch for order {$update['woo_order_id']}");
            return false;
        }

        // Update tracking information
        $order->update_meta_data('_labsupply_tracking_number', $update['tracking_number']);
        $order->update_meta_data('_labsupply_tracking_url', $update['tracking_url'] ?? '');
        $order->update_meta_data('_labsupply_carrier', $update['carrier']);
        $order->update_meta_data('_labsupply_shipped_at', $update['shipped_at']);
        $order->update_meta_data('_labsupply_status', $update['status']);

        // Add order note
        $note = sprintf(
            __('LabSupply Tracking Update: %s via %s', 'labsupply-fulfillment'),
            $update['tracking_number'],
            $update['carrier']
        );

        if (!empty($update['tracking_url'])) {
            $note .= sprintf(
                ' - <a href="%s" target="_blank">%s</a>',
                esc_url($update['tracking_url']),
                __('Track Package', 'labsupply-fulfillment')
            );
        }

        $order->add_order_note($note);

        // Update order status if shipped
        if ($update['status'] === 'shipped') {
            // Mark as completed or a custom shipped status
            $target_status = apply_filters('labsupply_shipped_order_status', 'completed');
            $order->update_status($target_status, __('Shipped via LabSupply fulfillment.', 'labsupply-fulfillment'));
        }

        $order->save();

        LabSupply_Admin::log('info', "Applied tracking update for order {$update['woo_order_id']}: {$update['tracking_number']}");

        // Trigger action for third-party integrations
        do_action('labsupply_tracking_updated', $order, $update);

        return true;
    }

    /**
     * Get tracking info for an order
     *
     * @param int $order_id
     * @return array|null
     */
    public static function get_tracking_info($order_id)
    {
        $order = wc_get_order($order_id);

        if (!$order) {
            return null;
        }

        $tracking_number = $order->get_meta('_labsupply_tracking_number');

        if (empty($tracking_number)) {
            return null;
        }

        return array(
            'tracking_number' => $tracking_number,
            'tracking_url' => $order->get_meta('_labsupply_tracking_url'),
            'carrier' => $order->get_meta('_labsupply_carrier'),
            'shipped_at' => $order->get_meta('_labsupply_shipped_at'),
        );
    }

    /**
     * Display tracking info on order details
     */
    public static function display_order_tracking($order)
    {
        $tracking = self::get_tracking_info($order->get_id());

        if (!$tracking) {
            return;
        }

        echo '<h2>' . esc_html__('Shipping Information', 'labsupply-fulfillment') . '</h2>';
        echo '<table class="woocommerce-table">';
        echo '<tr><th>' . esc_html__('Carrier', 'labsupply-fulfillment') . '</th><td>' . esc_html($tracking['carrier']) . '</td></tr>';
        echo '<tr><th>' . esc_html__('Tracking Number', 'labsupply-fulfillment') . '</th><td>';

        if (!empty($tracking['tracking_url'])) {
            echo '<a href="' . esc_url($tracking['tracking_url']) . '" target="_blank">' . esc_html($tracking['tracking_number']) . '</a>';
        } else {
            echo esc_html($tracking['tracking_number']);
        }

        echo '</td></tr>';

        if (!empty($tracking['shipped_at'])) {
            echo '<tr><th>' . esc_html__('Shipped Date', 'labsupply-fulfillment') . '</th><td>' . esc_html(date_i18n(get_option('date_format'), strtotime($tracking['shipped_at']))) . '</td></tr>';
        }

        echo '</table>';
    }
}

// Display tracking on order details page
add_action('woocommerce_order_details_after_order_table', array('LabSupply_Tracking', 'display_order_tracking'));
