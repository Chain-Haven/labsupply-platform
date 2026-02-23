<?php
/**
 * Admin settings page template
 *
 * @package WLP_Fulfillment
 */

defined('ABSPATH') || exit;
?>

<div class="wrap wlp-admin">
    <h1>
        <span class="wlp-logo">&#129514;</span>
        <?php esc_html_e('WhiteLabel Peptides Fulfillment', 'wlp-fulfillment'); ?>
        <span style="font-size:12px; font-weight:normal; color:#888; margin-left:8px;">v<?php echo esc_html(WLP_VERSION); ?></span>
    </h1>

    <div class="wlp-admin-content">
        <!-- Connection Status Card -->
        <div class="wlp-card">
            <h2><?php esc_html_e('Connection Status', 'wlp-fulfillment'); ?></h2>
            
            <?php if ($is_connected): ?>
                <div class="wlp-status wlp-status-connected">
                    <span class="dashicons dashicons-yes-alt"></span>
                    <?php esc_html_e('Connected', 'wlp-fulfillment'); ?>
                </div>
                
                <table class="wlp-info-table">
                    <tr>
                        <th><?php esc_html_e('Store ID', 'wlp-fulfillment'); ?></th>
                        <td><code><?php echo esc_html(substr($settings['store_id'], 0, 8) . '...'); ?></code></td>
                    </tr>
                    <tr>
                        <th><?php esc_html_e('Connected Since', 'wlp-fulfillment'); ?></th>
                        <td><?php echo esc_html($settings['connected_at'] ?: '-'); ?></td>
                    </tr>
                    <tr>
                        <th><?php esc_html_e('API URL', 'wlp-fulfillment'); ?></th>
                        <td><code><?php echo esc_html($settings['api_url']); ?></code></td>
                    </tr>
                </table>
                
                <?php if ($wallet): ?>
                <div class="wlp-wallet-info">
                    <h3><?php esc_html_e('Wallet Balance', 'wlp-fulfillment'); ?></h3>
                    <div class="wlp-balance">
                        $<?php echo number_format(($wallet['balance_cents'] ?? 0) / 100, 2); ?>
                        <span class="wlp-currency"><?php echo esc_html($wallet['currency'] ?? 'USD'); ?></span>
                    </div>
                    <?php if (isset($wallet['reserved_cents']) && $wallet['reserved_cents'] > 0): ?>
                    <p class="wlp-reserved">
                        <?php printf(
                            esc_html__('Reserved: $%s', 'wlp-fulfillment'),
                            number_format($wallet['reserved_cents'] / 100, 2)
                        ); ?>
                    </p>
                    <?php endif; ?>
                </div>
                <?php endif; ?>
                
                <button type="button" class="button button-secondary" id="wlp-disconnect">
                    <?php esc_html_e('Disconnect', 'wlp-fulfillment'); ?>
                </button>
                
            <?php else: ?>
                <div class="wlp-status wlp-status-disconnected">
                    <span class="dashicons dashicons-warning"></span>
                    <?php esc_html_e('Not Connected', 'wlp-fulfillment'); ?>
                </div>
                
                <form id="wlp-connect-form">
                    <p><?php esc_html_e('Enter your connect code from the WhiteLabel Peptides merchant portal:', 'wlp-fulfillment'); ?></p>
                    
                    <input type="text" 
                           id="wlp-connect-code" 
                           name="connect_code" 
                           placeholder="XXXX-XXXX-XXXX" 
                           class="regular-text"
                           style="font-family: monospace; text-transform: uppercase;">
                    
                    <button type="submit" class="button button-primary">
                        <?php esc_html_e('Connect', 'wlp-fulfillment'); ?>
                    </button>
                    
                    <p id="wlp-connect-message" class="wlp-message"></p>
                </form>
                
                <hr>
                
                <p>
                    <?php esc_html_e("Don't have an account?", 'wlp-fulfillment'); ?>
                    <a href="https://whitelabel.peptidetech.co/register" target="_blank">
                        <?php esc_html_e('Sign up for WhiteLabel Peptides', 'wlp-fulfillment'); ?>
                    </a>
                </p>
            <?php endif; ?>
        </div>

        <?php if ($is_connected): ?>
        <!-- Catalog Card -->
        <div class="wlp-card">
            <h2><?php esc_html_e('Product Catalog', 'wlp-fulfillment'); ?></h2>
            
            <p>
                <?php printf(
                    esc_html__('%d products available in your catalog', 'wlp-fulfillment'),
                    $product_count
                ); ?>
            </p>
            
            <?php if ($settings['last_import']): ?>
            <p class="description">
                <?php printf(
                    esc_html__('Last import: %s', 'wlp-fulfillment'),
                    $settings['last_import']
                ); ?>
            </p>
            <?php endif; ?>
            
            <button type="button" class="button button-secondary" id="wlp-refresh-catalog">
                <span class="dashicons dashicons-update"></span>
                <?php esc_html_e('Refresh Catalog', 'wlp-fulfillment'); ?>
            </button>
            
            <button type="button" class="button button-primary" id="wlp-import-products">
                <span class="dashicons dashicons-download"></span>
                <?php esc_html_e('Import All Products', 'wlp-fulfillment'); ?>
            </button>
            
            <p id="wlp-catalog-message" class="wlp-message"></p>
        </div>

        <!-- Bitcoin Payments Card -->
        <div class="wlp-card">
            <h2>&#8383; <?php esc_html_e('Bitcoin Payments', 'wlp-fulfillment'); ?></h2>

            <?php
            $btc_enabled = get_option('woocommerce_wlp_btc_settings', array());
            $btc_is_on = !empty($btc_enabled['enabled']) && $btc_enabled['enabled'] === 'yes';
            ?>

            <p><?php esc_html_e('Let your customers pay with Bitcoin at checkout. Payments are verified on the blockchain and orders are marked as paid automatically.', 'wlp-fulfillment'); ?></p>

            <div class="wlp-btc-toggle-row">
                <label class="wlp-toggle" for="wlp-btc-toggle">
                    <input type="checkbox" id="wlp-btc-toggle" <?php checked($btc_is_on); ?>>
                    <span class="wlp-toggle-slider"></span>
                </label>
                <span class="wlp-btc-toggle-label" id="wlp-btc-toggle-status">
                    <?php echo $btc_is_on
                        ? '<span class="wlp-btc-badge wlp-btc-badge-on">' . esc_html__('Enabled', 'wlp-fulfillment') . '</span>'
                        : '<span class="wlp-btc-badge wlp-btc-badge-off">' . esc_html__('Disabled', 'wlp-fulfillment') . '</span>'; ?>
                </span>
            </div>

            <p id="wlp-btc-toggle-message" class="wlp-message"></p>

            <?php if ($btc_is_on): ?>
            <div class="wlp-btc-active-info">
                <p class="description">
                    <?php
                    printf(
                        esc_html__('Advanced settings (title, description, timeout, markup): %sWooCommerce &gt; Settings &gt; Payments &gt; Bitcoin (BTC)%s', 'wlp-fulfillment'),
                        '<a href="' . esc_url(admin_url('admin.php?page=wc-settings&tab=checkout&section=wlp_btc')) . '">',
                        '</a>'
                    );
                    ?>
                </p>
            </div>
            <?php endif; ?>
        </div>

        <!-- Order Sync Card -->
        <div class="wlp-card">
            <h2><?php esc_html_e('Order Synchronization', 'wlp-fulfillment'); ?></h2>
            
            <p><?php esc_html_e('Orders with supplier products are automatically synced when payment is received. Tracking numbers are applied automatically and orders are marked as completed when shipped.', 'wlp-fulfillment'); ?></p>
            
            <label>
                <input type="checkbox" name="auto_sync" <?php checked($settings['auto_sync'], 'yes'); ?>>
                <?php esc_html_e('Enable automatic order sync', 'wlp-fulfillment'); ?>
            </label>
            
            <hr>
            
            <h3><?php esc_html_e('Manual Resync', 'wlp-fulfillment'); ?></h3>
            <p><?php esc_html_e('Resend recent unsynced orders to WhiteLabel Peptides:', 'wlp-fulfillment'); ?></p>
            
            <select id="wlp-resync-count">
                <option value="5">Last 5 orders</option>
                <option value="10" selected>Last 10 orders</option>
                <option value="25">Last 25 orders</option>
            </select>
            
            <button type="button" class="button" id="wlp-resync-orders">
                <?php esc_html_e('Resync Orders', 'wlp-fulfillment'); ?>
            </button>
            
            <p id="wlp-sync-message" class="wlp-message"></p>
        </div>
        <?php endif; ?>

        <!-- Firewall / API Routes Reference -->
        <div class="wlp-card">
            <h2>&#128274; <?php esc_html_e('Firewall & API Routes', 'wlp-fulfillment'); ?></h2>
            <p><?php esc_html_e('If you use a firewall (Cloudflare, Sucuri, Wordfence), whitelist these routes:', 'wlp-fulfillment'); ?></p>

            <table class="wp-list-table widefat striped" style="max-width:750px;">
                <thead>
                    <tr>
                        <th><?php esc_html_e('Direction', 'wlp-fulfillment'); ?></th>
                        <th><?php esc_html_e('URL', 'wlp-fulfillment'); ?></th>
                        <th><?php esc_html_e('Method', 'wlp-fulfillment'); ?></th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td><strong><?php esc_html_e('Outbound', 'wlp-fulfillment'); ?></strong></td>
                        <td><code><?php echo esc_html($settings['api_url']); ?>/v1/stores/connect/exchange</code></td>
                        <td>POST</td>
                    </tr>
                    <tr>
                        <td><strong><?php esc_html_e('Outbound', 'wlp-fulfillment'); ?></strong></td>
                        <td><code><?php echo esc_html($settings['api_url']); ?>/v1/orders</code></td>
                        <td>POST</td>
                    </tr>
                    <tr>
                        <td><strong><?php esc_html_e('Outbound', 'wlp-fulfillment'); ?></strong></td>
                        <td><code><?php echo esc_html($settings['api_url']); ?>/v1/catalog</code></td>
                        <td>GET</td>
                    </tr>
                    <tr>
                        <td><strong><?php esc_html_e('Outbound', 'wlp-fulfillment'); ?></strong></td>
                        <td><code><?php echo esc_html($settings['api_url']); ?>/v1/tracking/pending</code></td>
                        <td>GET</td>
                    </tr>
                    <tr>
                        <td><strong><?php esc_html_e('Outbound', 'wlp-fulfillment'); ?></strong></td>
                        <td><code><?php echo esc_html($settings['api_url']); ?>/v1/tracking/acknowledge</code></td>
                        <td>POST</td>
                    </tr>
                    <tr>
                        <td><strong><?php esc_html_e('Inbound', 'wlp-fulfillment'); ?></strong></td>
                        <td><code><?php echo esc_url(home_url('/wp-json/wlp/v1/tracking')); ?></code></td>
                        <td>POST</td>
                    </tr>
                    <tr>
                        <td><strong><?php esc_html_e('Inbound', 'wlp-fulfillment'); ?></strong></td>
                        <td><code><?php echo esc_url(home_url('/wp-json/wlp/v1/order-status')); ?></code></td>
                        <td>POST</td>
                    </tr>
                    <tr>
                        <td><strong><?php esc_html_e('Inbound', 'wlp-fulfillment'); ?></strong></td>
                        <td><code><?php echo esc_url(home_url('/wp-json/wlp/v1/health')); ?></code></td>
                        <td>GET</td>
                    </tr>
                </tbody>
            </table>

            <p style="margin-top:12px;">
                <strong><?php esc_html_e('Vercel IP ranges to whitelist for inbound webhooks:', 'wlp-fulfillment'); ?></strong>
                <code>76.76.21.0/24</code>, <code>64.29.18.0/24</code>
            </p>
        </div>

        <!-- Debug Logs Card -->
        <div class="wlp-card">
            <h2><?php esc_html_e('Debug Logs', 'wlp-fulfillment'); ?></h2>
            
            <label>
                <input type="checkbox" 
                       name="debug_mode" 
                       id="wlp-debug-mode"
                       <?php checked($settings['debug_mode'], 'yes'); ?>>
                <?php esc_html_e('Enable debug logging', 'wlp-fulfillment'); ?>
            </label>
            
            <div class="wlp-logs">
                <?php if (!empty($logs)): ?>
                <table class="wp-list-table widefat fixed striped">
                    <thead>
                        <tr>
                            <th style="width: 150px;"><?php esc_html_e('Time', 'wlp-fulfillment'); ?></th>
                            <th style="width: 80px;"><?php esc_html_e('Level', 'wlp-fulfillment'); ?></th>
                            <th><?php esc_html_e('Message', 'wlp-fulfillment'); ?></th>
                        </tr>
                    </thead>
                    <tbody>
                        <?php foreach ($logs as $log): ?>
                        <tr class="wlp-log-<?php echo esc_attr($log->level); ?>">
                            <td><?php echo esc_html($log->created_at); ?></td>
                            <td><span class="log-level log-<?php echo esc_attr($log->level); ?>"><?php echo esc_html($log->level); ?></span></td>
                            <td><?php echo esc_html($log->message); ?></td>
                        </tr>
                        <?php endforeach; ?>
                    </tbody>
                </table>
                <?php else: ?>
                <p class="description"><?php esc_html_e('No logs yet.', 'wlp-fulfillment'); ?></p>
                <?php endif; ?>
            </div>
        </div>
    </div>
</div>
