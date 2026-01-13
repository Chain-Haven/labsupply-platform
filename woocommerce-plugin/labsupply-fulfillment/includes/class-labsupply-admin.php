<?php
/**
 * Admin UI and settings pages
 *
 * @package LabSupply_Fulfillment
 */

defined('ABSPATH') || exit;

class LabSupply_Admin
{

    /**
     * Initialize admin
     */
    public static function init()
    {
        add_action('admin_menu', array(__CLASS__, 'add_menu'));
        add_action('admin_enqueue_scripts', array(__CLASS__, 'enqueue_scripts'));
        add_action('wp_ajax_labsupply_connect', array(__CLASS__, 'ajax_connect'));
        add_action('wp_ajax_labsupply_disconnect', array(__CLASS__, 'ajax_disconnect'));
        add_action('wp_ajax_labsupply_resync_orders', array(__CLASS__, 'ajax_resync_orders'));
    }

    /**
     * Add admin menu
     */
    public static function add_menu()
    {
        add_submenu_page(
            'woocommerce',
            __('LabSupply', 'labsupply-fulfillment'),
            __('LabSupply', 'labsupply-fulfillment'),
            'manage_woocommerce',
            'labsupply',
            array(__CLASS__, 'render_settings_page')
        );
    }

    /**
     * Enqueue admin scripts
     */
    public static function enqueue_scripts($hook)
    {
        if ($hook !== 'woocommerce_page_labsupply') {
            return;
        }

        wp_enqueue_style(
            'labsupply-admin',
            LABSUPPLY_PLUGIN_URL . 'assets/css/admin.css',
            array(),
            LABSUPPLY_VERSION
        );

        wp_enqueue_script(
            'labsupply-admin',
            LABSUPPLY_PLUGIN_URL . 'assets/js/admin.js',
            array('jquery'),
            LABSUPPLY_VERSION,
            true
        );

        wp_localize_script('labsupply-admin', 'labsupplyAdmin', array(
            'ajaxUrl' => admin_url('admin-ajax.php'),
            'nonce' => wp_create_nonce('labsupply_admin'),
            'strings' => array(
                'connecting' => __('Connecting...', 'labsupply-fulfillment'),
                'connected' => __('Connected!', 'labsupply-fulfillment'),
                'error' => __('Error:', 'labsupply-fulfillment'),
                'importing' => __('Importing products...', 'labsupply-fulfillment'),
                'confirm_disconnect' => __('Are you sure you want to disconnect?', 'labsupply-fulfillment'),
            ),
        ));
    }

    /**
     * Render settings page
     */
    public static function render_settings_page()
    {
        $api = LabSupply_API_Client::instance();
        $is_connected = $api->is_connected();
        $settings = LabSupply_Settings::get_all();

        // Get cached catalog
        $catalog = get_transient('labsupply_catalog');
        $product_count = $catalog ? count($catalog['products']) : 0;

        // Get wallet balance
        $wallet = null;
        if ($is_connected) {
            $wallet = $api->get_wallet_balance();
            if (is_wp_error($wallet)) {
                $wallet = null;
            }
        }

        // Get recent logs
        global $wpdb;
        $logs = $wpdb->get_results(
            "SELECT * FROM {$wpdb->prefix}labsupply_log ORDER BY created_at DESC LIMIT 50"
        );

        include LABSUPPLY_PLUGIN_DIR . 'templates/admin-settings.php';
    }

    /**
     * Ajax: Connect with code
     */
    public static function ajax_connect()
    {
        check_ajax_referer('labsupply_admin', 'nonce');

        if (!current_user_can('manage_woocommerce')) {
            wp_send_json_error('Permission denied');
            return;
        }

        $connect_code = sanitize_text_field($_POST['connect_code'] ?? '');

        if (empty($connect_code)) {
            wp_send_json_error(__('Please enter a connect code', 'labsupply-fulfillment'));
            return;
        }

        $api = LabSupply_API_Client::instance();
        $result = $api->exchange_connect_code($connect_code);

        if (is_wp_error($result)) {
            wp_send_json_error($result->get_error_message());
            return;
        }

        // Save credentials
        $api->save_credentials(
            $result['store_id'],
            $result['store_secret'],
            $result['api_base_url'] ?? ''
        );

        self::log('info', 'Successfully connected to LabSupply');

        wp_send_json_success(array(
            'message' => __('Successfully connected!', 'labsupply-fulfillment'),
            'store_id' => $result['store_id'],
        ));
    }

    /**
     * Ajax: Disconnect
     */
    public static function ajax_disconnect()
    {
        check_ajax_referer('labsupply_admin', 'nonce');

        if (!current_user_can('manage_woocommerce')) {
            wp_send_json_error('Permission denied');
            return;
        }

        $api = LabSupply_API_Client::instance();
        $api->disconnect();

        self::log('info', 'Disconnected from LabSupply');

        wp_send_json_success(__('Disconnected', 'labsupply-fulfillment'));
    }

    /**
     * Ajax: Resync orders
     */
    public static function ajax_resync_orders()
    {
        check_ajax_referer('labsupply_admin', 'nonce');

        if (!current_user_can('manage_woocommerce')) {
            wp_send_json_error('Permission denied');
            return;
        }

        $count = intval($_POST['count'] ?? 10);
        $synced = LabSupply_Orders::resend_orders($count);

        wp_send_json_success(array(
            'synced' => $synced,
            'message' => sprintf(__('%d orders synced', 'labsupply-fulfillment'), $synced),
        ));
    }

    /**
     * Log a message
     *
     * @param string $level info|warning|error|debug
     * @param string $message
     * @param array $context
     */
    public static function log($level, $message, $context = array())
    {
        global $wpdb;

        $wpdb->insert(
            $wpdb->prefix . 'labsupply_log',
            array(
                'level' => $level,
                'message' => $message,
                'context' => !empty($context) ? wp_json_encode($context) : null,
            )
        );

        // Keep only last 1000 logs
        $count = $wpdb->get_var("SELECT COUNT(*) FROM {$wpdb->prefix}labsupply_log");
        if ($count > 1000) {
            $wpdb->query("DELETE FROM {$wpdb->prefix}labsupply_log ORDER BY created_at ASC LIMIT 100");
        }

        // Also log to WooCommerce logger in debug mode
        if (LabSupply_Settings::get('debug_mode') === 'yes' && function_exists('wc_get_logger')) {
            $logger = wc_get_logger();
            $logger->log($level, $message, array('source' => 'labsupply'));
        }
    }
}
