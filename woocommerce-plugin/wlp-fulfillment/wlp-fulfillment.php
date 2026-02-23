<?php
/**
 * Plugin Name: WhiteLabel Peptides Fulfillment Connector
 * Plugin URI: https://whitelabel.peptidetech.co
 * Description: Connect your WooCommerce store to WhiteLabel Peptides for automated fulfillment of research compounds and peptides.
 * Version: 1.1.0
 * Author: Peptide Technologies
 * Author URI: https://whitelabel.peptidetech.co
 * License: GPL v2 or later
 * License URI: https://www.gnu.org/licenses/gpl-2.0.html
 * Text Domain: wlp-fulfillment
 * Domain Path: /languages
 * Requires at least: 6.0
 * Requires PHP: 7.4
 * WC requires at least: 8.0
 * WC tested up to: 9.6
 *
 * @package WLP_Fulfillment
 */

defined('ABSPATH') || exit;

define('WLP_VERSION', '1.1.0');
define('WLP_PLUGIN_FILE', __FILE__);
define('WLP_PLUGIN_DIR', plugin_dir_path(__FILE__));
define('WLP_PLUGIN_URL', plugin_dir_url(__FILE__));
define('WLP_API_VERSION', 'v1');

/**
 * Check if WooCommerce is active before doing anything
 */
function wlp_check_woocommerce() {
    if (!class_exists('WooCommerce')) {
        add_action('admin_notices', function() {
            echo '<div class="notice notice-error"><p><strong>WhiteLabel Peptides Fulfillment</strong> requires WooCommerce to be installed and active.</p></div>';
        });
        return false;
    }
    return true;
}

/**
 * Initialize the plugin — wrapped in try/catch to prevent fatal errors
 */
function wlp_init() {
    if (!wlp_check_woocommerce()) {
        return;
    }

    try {
        require_once WLP_PLUGIN_DIR . 'includes/class-wlp-crypto.php';
        require_once WLP_PLUGIN_DIR . 'includes/class-wlp-api-client.php';
        require_once WLP_PLUGIN_DIR . 'includes/class-wlp-settings.php';
        require_once WLP_PLUGIN_DIR . 'includes/class-wlp-catalog.php';
        require_once WLP_PLUGIN_DIR . 'includes/class-wlp-orders.php';
        require_once WLP_PLUGIN_DIR . 'includes/class-wlp-tracking.php';
        require_once WLP_PLUGIN_DIR . 'includes/class-wlp-admin.php';
        require_once WLP_PLUGIN_DIR . 'includes/class-wlp-rest-api.php';

        WLP_Settings::init();
        WLP_Catalog::init();
        WLP_Orders::init();
        WLP_Tracking::init();
        WLP_Admin::init();
        WLP_REST_API::init();

        // BTC payment gateway — registered via WooCommerce filter
        require_once WLP_PLUGIN_DIR . 'includes/class-wlp-btc-gateway.php';
        add_filter('woocommerce_payment_gateways', function ($gateways) {
            $gateways[] = 'WLP_BTC_Gateway';
            return $gateways;
        });

        // Block checkout integration
        add_action('woocommerce_blocks_loaded', function () {
            if (class_exists('Automattic\WooCommerce\Blocks\Payments\Integrations\AbstractPaymentMethodType')) {
                require_once WLP_PLUGIN_DIR . 'includes/class-wlp-btc-blocks.php';
                add_action(
                    'woocommerce_blocks_payment_method_type_registration',
                    function ($registry) {
                        $registry->register(new WLP_BTC_Blocks_Integration());
                    }
                );
            }
        });

        load_plugin_textdomain('wlp-fulfillment', false, dirname(plugin_basename(__FILE__)) . '/languages');
    } catch (Throwable $e) {
        add_action('admin_notices', function() use ($e) {
            echo '<div class="notice notice-error"><p><strong>WhiteLabel Peptides Fulfillment</strong> failed to initialize: ' . esc_html($e->getMessage()) . '</p></div>';
        });
    }
}
add_action('plugins_loaded', 'wlp_init', 20);

/**
 * Activation hook
 */
function wlp_activate() {
    global $wpdb;

    $charset_collate = $wpdb->get_charset_collate();

    $table_name = $wpdb->prefix . 'wlp_order_queue';
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

    $log_table = $wpdb->prefix . 'wlp_log';
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

    if (!wp_next_scheduled('wlp_sync_orders')) {
        wp_schedule_event(time(), 'every_five_minutes', 'wlp_sync_orders');
    }

    if (!wp_next_scheduled('wlp_check_tracking')) {
        wp_schedule_event(time(), 'every_five_minutes', 'wlp_check_tracking');
    }

    // Flag to show the post-activation firewall notice
    set_transient('wlp_activation_notice', true, 60 * 60);

    flush_rewrite_rules();
}
register_activation_hook(__FILE__, 'wlp_activate');

/**
 * Deactivation hook
 */
function wlp_deactivate() {
    wp_clear_scheduled_hook('wlp_sync_orders');
    wp_clear_scheduled_hook('wlp_check_tracking');
    flush_rewrite_rules();
}
register_deactivation_hook(__FILE__, 'wlp_deactivate');

/**
 * Custom cron schedule
 */
function wlp_cron_schedules($schedules) {
    $schedules['every_five_minutes'] = array(
        'interval' => 300,
        'display'  => __('Every 5 Minutes', 'wlp-fulfillment'),
    );
    return $schedules;
}
add_filter('cron_schedules', 'wlp_cron_schedules');

/**
 * Declare HPOS compatibility
 */
add_action('before_woocommerce_init', function() {
    if (class_exists(\Automattic\WooCommerce\Utilities\FeaturesUtil::class)) {
        \Automattic\WooCommerce\Utilities\FeaturesUtil::declare_compatibility('custom_order_tables', __FILE__, true);
    }
});

/**
 * Persistent admin notice after activation — firewall whitelist instructions
 */
function wlp_activation_admin_notice() {
    if (!get_transient('wlp_activation_notice')) {
        return;
    }

    $api_base = get_option('wlp_api_url', 'https://api.whitelabel.peptidetech.co');
    $portal_base = 'https://whitelabel.peptidetech.co';
    ?>
    <div class="notice notice-warning is-dismissible" id="wlp-firewall-notice">
        <h3 style="margin-top:0.75em;">&#128274; WhiteLabel Peptides — Firewall Configuration Required</h3>
        <p>If your hosting provider uses a firewall (Cloudflare, Sucuri, Wordfence, etc.), please <strong>whitelist the following API routes</strong> to ensure the plugin works correctly:</p>
        <table class="widefat" style="max-width:700px; margin:10px 0;">
            <thead><tr><th>Direction</th><th>URL / Route</th><th>Method</th></tr></thead>
            <tbody>
                <tr><td><strong>Outbound</strong> (your site → API)</td><td><code><?php echo esc_html($api_base); ?>/v1/*</code></td><td>GET, POST</td></tr>
                <tr><td><strong>Inbound</strong> (API → your site)</td><td><code><?php echo esc_url(home_url('/wp-json/wlp/v1/tracking')); ?></code></td><td>POST</td></tr>
                <tr><td><strong>Inbound</strong> (API → your site)</td><td><code><?php echo esc_url(home_url('/wp-json/wlp/v1/order-status')); ?></code></td><td>POST</td></tr>
                <tr><td><strong>Inbound</strong> (API → your site)</td><td><code><?php echo esc_url(home_url('/wp-json/wlp/v1/health')); ?></code></td><td>GET</td></tr>
            </tbody>
        </table>
        <p><strong>IP addresses to whitelist for inbound webhooks:</strong></p>
        <ul style="list-style:disc; margin-left:20px;">
            <li><code>76.76.21.0/24</code> (Vercel edge network)</li>
            <li><code>64.29.18.0/24</code> (Vercel edge network)</li>
        </ul>
        <p>
            <strong>Wordfence users:</strong> Go to Wordfence → Firewall → Manage WAF → Whitelisted URLs and add <code>/wp-json/wlp/v1/</code><br>
            <strong>Cloudflare users:</strong> Create a WAF rule to skip security for requests matching URI path <code>/wp-json/wlp/v1/*</code>
        </p>
        <p><a href="<?php echo esc_url(admin_url('admin.php?page=wlp')); ?>" class="button button-primary">Go to Plugin Settings</a></p>
    </div>
    <script>
    jQuery(function($){
        $(document).on('click', '#wlp-firewall-notice .notice-dismiss', function(){
            $.post(ajaxurl, {action:'wlp_dismiss_activation_notice', _wpnonce:'<?php echo wp_create_nonce('wlp_dismiss_notice'); ?>'});
        });
    });
    </script>
    <?php
}
add_action('admin_notices', 'wlp_activation_admin_notice');

function wlp_dismiss_activation_notice() {
    check_ajax_referer('wlp_dismiss_notice');
    delete_transient('wlp_activation_notice');
    wp_die();
}
add_action('wp_ajax_wlp_dismiss_activation_notice', 'wlp_dismiss_activation_notice');
