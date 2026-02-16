<?php
/**
 * Admin UI and settings pages
 *
 * @package WLP_Fulfillment
 */

defined('ABSPATH') || exit;

class WLP_Admin
{

    /**
     * Initialize admin
     */
    public static function init()
    {
        add_action('admin_menu', array(__CLASS__, 'add_menu'));
        add_action('admin_enqueue_scripts', array(__CLASS__, 'enqueue_scripts'));
        add_action('wp_ajax_wlp_connect', array(__CLASS__, 'ajax_connect'));
        add_action('wp_ajax_wlp_disconnect', array(__CLASS__, 'ajax_disconnect'));
        add_action('wp_ajax_wlp_resync_orders', array(__CLASS__, 'ajax_resync_orders'));
    }

    /**
     * Add admin menu
     */
    public static function add_menu()
    {
        add_submenu_page(
            'woocommerce',
            __('WhiteLabel Peptides', 'wlp-fulfillment'),
            __('WhiteLabel Peptides', 'wlp-fulfillment'),
            'manage_woocommerce',
            'wlp',
            array(__CLASS__, 'render_settings_page')
        );
    }

    /**
     * Enqueue admin scripts
     */
    public static function enqueue_scripts($hook)
    {
        if ($hook !== 'woocommerce_page_wlp') {
            return;
        }

        wp_enqueue_style(
            'wlp-admin',
            WLP_PLUGIN_URL . 'assets/css/admin.css',
            array(),
            WLP_VERSION
        );

        wp_enqueue_script(
            'wlp-admin',
            WLP_PLUGIN_URL . 'assets/js/admin.js',
            array('jquery'),
            WLP_VERSION,
            true
        );

        wp_localize_script('wlp-admin', 'wlpAdmin', array(
            'ajaxUrl' => admin_url('admin-ajax.php'),
            'nonce' => wp_create_nonce('wlp_admin'),
            'strings' => array(
                'connecting' => __('Connecting...', 'wlp-fulfillment'),
                'connected' => __('Connected!', 'wlp-fulfillment'),
                'error' => __('Error:', 'wlp-fulfillment'),
                'importing' => __('Importing products...', 'wlp-fulfillment'),
                'confirm_disconnect' => __('Are you sure you want to disconnect?', 'wlp-fulfillment'),
            ),
        ));
    }

    /**
     * Render settings page
     */
    public static function render_settings_page()
    {
        $api = WLP_API_Client::instance();
        $is_connected = $api->is_connected();
        $settings = WLP_Settings::get_all();

        // Get cached catalog
        $catalog = get_transient('wlp_catalog');
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
            "SELECT * FROM {$wpdb->prefix}wlp_log ORDER BY created_at DESC LIMIT 50"
        );

        include WLP_PLUGIN_DIR . 'templates/admin-settings.php';
    }

    /**
     * Ajax: Connect with code
     */
    public static function ajax_connect()
    {
        check_ajax_referer('wlp_admin', 'nonce');

        if (!current_user_can('manage_woocommerce')) {
            wp_send_json_error('Permission denied');
            return;
        }

        $connect_code = sanitize_text_field($_POST['connect_code'] ?? '');

        if (empty($connect_code)) {
            wp_send_json_error(__('Please enter a connect code', 'wlp-fulfillment'));
            return;
        }

        $api = WLP_API_Client::instance();
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

        self::log('info', 'Successfully connected to WhiteLabel Peptides');

        wp_send_json_success(array(
            'message' => __('Successfully connected!', 'wlp-fulfillment'),
            'store_id' => $result['store_id'],
        ));
    }

    /**
     * Ajax: Disconnect
     */
    public static function ajax_disconnect()
    {
        check_ajax_referer('wlp_admin', 'nonce');

        if (!current_user_can('manage_woocommerce')) {
            wp_send_json_error('Permission denied');
            return;
        }

        $api = WLP_API_Client::instance();
        $api->disconnect();

        self::log('info', 'Disconnected from WhiteLabel Peptides');

        wp_send_json_success(__('Disconnected', 'wlp-fulfillment'));
    }

    /**
     * Ajax: Resync orders
     */
    public static function ajax_resync_orders()
    {
        check_ajax_referer('wlp_admin', 'nonce');

        if (!current_user_can('manage_woocommerce')) {
            wp_send_json_error('Permission denied');
            return;
        }

        $count = intval($_POST['count'] ?? 10);
        $synced = WLP_Orders::resend_orders($count);

        wp_send_json_success(array(
            'synced' => $synced,
            'message' => sprintf(__('%d orders synced', 'wlp-fulfillment'), $synced),
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
            $wpdb->prefix . 'wlp_log',
            array(
                'level' => $level,
                'message' => $message,
                'context' => !empty($context) ? wp_json_encode($context) : null,
            )
        );

        // Keep only last 1000 logs
        $count = $wpdb->get_var("SELECT COUNT(*) FROM {$wpdb->prefix}wlp_log");
        if ($count > 1000) {
            $wpdb->query("DELETE FROM {$wpdb->prefix}wlp_log ORDER BY created_at ASC LIMIT 100");
        }

        // Also log to WooCommerce logger in debug mode
        if (WLP_Settings::get('debug_mode') === 'yes' && function_exists('wc_get_logger')) {
            $logger = wc_get_logger();
            $logger->log($level, $message, array('source' => 'wlp'));
        }
    }
}
