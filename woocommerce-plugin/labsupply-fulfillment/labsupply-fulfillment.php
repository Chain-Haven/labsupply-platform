<?php
/**
 * Plugin Name: LabSupply Fulfillment Connector
 * Plugin URI: https://labsupply.io
 * Description: Connect your WooCommerce store to LabSupply for automated fulfillment of research compounds and peptides.
 * Version: 1.0.0
 * Author: LabSupply
 * Author URI: https://labsupply.io
 * License: GPL v2 or later
 * License URI: https://www.gnu.org/licenses/gpl-2.0.html
 * Text Domain: labsupply-fulfillment
 * Domain Path: /languages
 * Requires at least: 6.0
 * Requires PHP: 7.4
 * WC requires at least: 8.0
 * WC tested up to: 8.4
 *
 * @package LabSupply_Fulfillment
 */

defined('ABSPATH') || exit;

// Plugin constants
define('LABSUPPLY_VERSION', '1.0.0');
define('LABSUPPLY_PLUGIN_FILE', __FILE__);
define('LABSUPPLY_PLUGIN_DIR', plugin_dir_path(__FILE__));
define('LABSUPPLY_PLUGIN_URL', plugin_dir_url(__FILE__));
define('LABSUPPLY_API_VERSION', 'v1');

/**
 * Check if WooCommerce is active
 */
function labsupply_check_woocommerce() {
    if (!class_exists('WooCommerce')) {
        add_action('admin_notices', function() {
            echo '<div class="error"><p>';
            echo esc_html__('LabSupply Fulfillment Connector requires WooCommerce to be installed and active.', 'labsupply-fulfillment');
            echo '</p></div>';
        });
        return false;
    }
    return true;
}

/**
 * Initialize the plugin
 */
function labsupply_init() {
    if (!labsupply_check_woocommerce()) {
        return;
    }

    // Load dependencies
    require_once LABSUPPLY_PLUGIN_DIR . 'includes/class-labsupply-crypto.php';
    require_once LABSUPPLY_PLUGIN_DIR . 'includes/class-labsupply-api-client.php';
    require_once LABSUPPLY_PLUGIN_DIR . 'includes/class-labsupply-settings.php';
    require_once LABSUPPLY_PLUGIN_DIR . 'includes/class-labsupply-catalog.php';
    require_once LABSUPPLY_PLUGIN_DIR . 'includes/class-labsupply-orders.php';
    require_once LABSUPPLY_PLUGIN_DIR . 'includes/class-labsupply-tracking.php';
    require_once LABSUPPLY_PLUGIN_DIR . 'includes/class-labsupply-admin.php';
    require_once LABSUPPLY_PLUGIN_DIR . 'includes/class-labsupply-rest-api.php';

    // Initialize components
    LabSupply_Settings::init();
    LabSupply_Catalog::init();
    LabSupply_Orders::init();
    LabSupply_Tracking::init();
    LabSupply_Admin::init();
    LabSupply_REST_API::init();

    // Load text domain
    load_plugin_textdomain('labsupply-fulfillment', false, dirname(plugin_basename(__FILE__)) . '/languages');
}
add_action('plugins_loaded', 'labsupply_init', 20);

/**
 * Activation hook
 */
function labsupply_activate() {
    // Create custom tables if needed
    global $wpdb;
    
    $charset_collate = $wpdb->get_charset_collate();
    
    // Order sync queue table
    $table_name = $wpdb->prefix . 'labsupply_order_queue';
    $sql = "CREATE TABLE IF NOT EXISTS {$table_name} (
        id bigint(20) NOT NULL AUTO_INCREMENT,
        order_id bigint(20) NOT NULL,
        status varchar(50) NOT NULL DEFAULT 'pending',
        attempts int(11) NOT NULL DEFAULT 0,
        last_error text,
        synced_at datetime DEFAULT NULL,
        created_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        KEY order_id (order_id),
        KEY status (status)
    ) {$charset_collate};";
    
    require_once(ABSPATH . 'wp-admin/includes/upgrade.php');
    dbDelta($sql);
    
    // Event log table
    $log_table = $wpdb->prefix . 'labsupply_log';
    $sql = "CREATE TABLE IF NOT EXISTS {$log_table} (
        id bigint(20) NOT NULL AUTO_INCREMENT,
        level varchar(20) NOT NULL DEFAULT 'info',
        message text NOT NULL,
        context text,
        created_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        KEY level (level),
        KEY created_at (created_at)
    ) {$charset_collate};";
    dbDelta($sql);
    
    // Schedule cron jobs
    if (!wp_next_scheduled('labsupply_sync_orders')) {
        wp_schedule_event(time(), 'every_five_minutes', 'labsupply_sync_orders');
    }
    
    if (!wp_next_scheduled('labsupply_check_tracking')) {
        wp_schedule_event(time(), 'hourly', 'labsupply_check_tracking');
    }
    
    // Flush rewrite rules
    flush_rewrite_rules();
}
register_activation_hook(__FILE__, 'labsupply_activate');

/**
 * Deactivation hook
 */
function labsupply_deactivate() {
    // Clear scheduled hooks
    wp_clear_scheduled_hook('labsupply_sync_orders');
    wp_clear_scheduled_hook('labsupply_check_tracking');
    
    flush_rewrite_rules();
}
register_deactivation_hook(__FILE__, 'labsupply_deactivate');

/**
 * Add custom cron schedule
 */
function labsupply_cron_schedules($schedules) {
    $schedules['every_five_minutes'] = array(
        'interval' => 300,
        'display'  => __('Every 5 Minutes', 'labsupply-fulfillment'),
    );
    return $schedules;
}
add_filter('cron_schedules', 'labsupply_cron_schedules');

/**
 * Declare HPOS compatibility
 */
add_action('before_woocommerce_init', function() {
    if (class_exists(\Automattic\WooCommerce\Utilities\FeaturesUtil::class)) {
        \Automattic\WooCommerce\Utilities\FeaturesUtil::declare_compatibility('custom_order_tables', __FILE__, true);
    }
});
