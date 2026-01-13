<?php
/**
 * Admin settings page template
 *
 * @package LabSupply_Fulfillment
 */

defined('ABSPATH') || exit;
?>

<div class="wrap labsupply-admin">
    <h1>
        <span class="labsupply-logo">🧪</span>
        <?php esc_html_e('LabSupply Fulfillment', 'labsupply-fulfillment'); ?>
    </h1>

    <div class="labsupply-admin-content">
        <!-- Connection Status Card -->
        <div class="labsupply-card">
            <h2><?php esc_html_e('Connection Status', 'labsupply-fulfillment'); ?></h2>
            
            <?php if ($is_connected): ?>
                <div class="labsupply-status labsupply-status-connected">
                    <span class="dashicons dashicons-yes-alt"></span>
                    <?php esc_html_e('Connected', 'labsupply-fulfillment'); ?>
                </div>
                
                <table class="labsupply-info-table">
                    <tr>
                        <th><?php esc_html_e('Store ID', 'labsupply-fulfillment'); ?></th>
                        <td><code><?php echo esc_html(substr($settings['store_id'], 0, 8) . '...'); ?></code></td>
                    </tr>
                    <tr>
                        <th><?php esc_html_e('Connected Since', 'labsupply-fulfillment'); ?></th>
                        <td><?php echo esc_html($settings['connected_at'] ?: '-'); ?></td>
                    </tr>
                    <tr>
                        <th><?php esc_html_e('API URL', 'labsupply-fulfillment'); ?></th>
                        <td><code><?php echo esc_html($settings['api_url']); ?></code></td>
                    </tr>
                </table>
                
                <?php if ($wallet): ?>
                <div class="labsupply-wallet-info">
                    <h3><?php esc_html_e('Wallet Balance', 'labsupply-fulfillment'); ?></h3>
                    <div class="labsupply-balance">
                        $<?php echo number_format($wallet['balance_cents'] / 100, 2); ?>
                        <span class="labsupply-currency"><?php echo esc_html($wallet['currency']); ?></span>
                    </div>
                    <?php if ($wallet['reserved_cents'] > 0): ?>
                    <p class="labsupply-reserved">
                        <?php printf(
                            esc_html__('Reserved: $%s', 'labsupply-fulfillment'),
                            number_format($wallet['reserved_cents'] / 100, 2)
                        ); ?>
                    </p>
                    <?php endif; ?>
                </div>
                <?php endif; ?>
                
                <button type="button" class="button button-secondary" id="labsupply-disconnect">
                    <?php esc_html_e('Disconnect', 'labsupply-fulfillment'); ?>
                </button>
                
            <?php else: ?>
                <div class="labsupply-status labsupply-status-disconnected">
                    <span class="dashicons dashicons-warning"></span>
                    <?php esc_html_e('Not Connected', 'labsupply-fulfillment'); ?>
                </div>
                
                <form id="labsupply-connect-form">
                    <p><?php esc_html_e('Enter your connect code from the LabSupply merchant portal:', 'labsupply-fulfillment'); ?></p>
                    
                    <input type="text" 
                           id="labsupply-connect-code" 
                           name="connect_code" 
                           placeholder="XXXX-XXXX-XXXX" 
                           class="regular-text"
                           style="font-family: monospace; text-transform: uppercase;">
                    
                    <button type="submit" class="button button-primary">
                        <?php esc_html_e('Connect', 'labsupply-fulfillment'); ?>
                    </button>
                    
                    <p id="labsupply-connect-message" class="labsupply-message"></p>
                </form>
                
                <hr>
                
                <p>
                    <?php esc_html_e("Don't have an account?", 'labsupply-fulfillment'); ?>
                    <a href="https://portal.labsupply.io/register" target="_blank">
                        <?php esc_html_e('Sign up for LabSupply', 'labsupply-fulfillment'); ?>
                    </a>
                </p>
            <?php endif; ?>
        </div>

        <?php if ($is_connected): ?>
        <!-- Catalog Card -->
        <div class="labsupply-card">
            <h2><?php esc_html_e('Product Catalog', 'labsupply-fulfillment'); ?></h2>
            
            <p>
                <?php printf(
                    esc_html__('%d products available in your catalog', 'labsupply-fulfillment'),
                    $product_count
                ); ?>
            </p>
            
            <?php if ($settings['last_import']): ?>
            <p class="description">
                <?php printf(
                    esc_html__('Last import: %s', 'labsupply-fulfillment'),
                    $settings['last_import']
                ); ?>
            </p>
            <?php endif; ?>
            
            <button type="button" class="button button-secondary" id="labsupply-refresh-catalog">
                <span class="dashicons dashicons-update"></span>
                <?php esc_html_e('Refresh Catalog', 'labsupply-fulfillment'); ?>
            </button>
            
            <button type="button" class="button button-primary" id="labsupply-import-products">
                <span class="dashicons dashicons-download"></span>
                <?php esc_html_e('Import All Products', 'labsupply-fulfillment'); ?>
            </button>
            
            <p id="labsupply-catalog-message" class="labsupply-message"></p>
        </div>

        <!-- Order Sync Card -->
        <div class="labsupply-card">
            <h2><?php esc_html_e('Order Synchronization', 'labsupply-fulfillment'); ?></h2>
            
            <p><?php esc_html_e('Orders with supplier products are automatically synced when payment is received.', 'labsupply-fulfillment'); ?></p>
            
            <label>
                <input type="checkbox" name="auto_sync" <?php checked($settings['auto_sync'], 'yes'); ?>>
                <?php esc_html_e('Enable automatic order sync', 'labsupply-fulfillment'); ?>
            </label>
            
            <hr>
            
            <h3><?php esc_html_e('Manual Resync', 'labsupply-fulfillment'); ?></h3>
            <p><?php esc_html_e('Resend recent unsynced orders to LabSupply:', 'labsupply-fulfillment'); ?></p>
            
            <select id="labsupply-resync-count">
                <option value="5">Last 5 orders</option>
                <option value="10" selected>Last 10 orders</option>
                <option value="25">Last 25 orders</option>
            </select>
            
            <button type="button" class="button" id="labsupply-resync-orders">
                <?php esc_html_e('Resync Orders', 'labsupply-fulfillment'); ?>
            </button>
            
            <p id="labsupply-sync-message" class="labsupply-message"></p>
        </div>
        <?php endif; ?>

        <!-- Debug Logs Card -->
        <div class="labsupply-card">
            <h2><?php esc_html_e('Debug Logs', 'labsupply-fulfillment'); ?></h2>
            
            <label>
                <input type="checkbox" 
                       name="debug_mode" 
                       id="labsupply-debug-mode"
                       <?php checked($settings['debug_mode'], 'yes'); ?>>
                <?php esc_html_e('Enable debug logging', 'labsupply-fulfillment'); ?>
            </label>
            
            <div class="labsupply-logs">
                <?php if (!empty($logs)): ?>
                <table class="wp-list-table widefat fixed striped">
                    <thead>
                        <tr>
                            <th style="width: 150px;"><?php esc_html_e('Time', 'labsupply-fulfillment'); ?></th>
                            <th style="width: 80px;"><?php esc_html_e('Level', 'labsupply-fulfillment'); ?></th>
                            <th><?php esc_html_e('Message', 'labsupply-fulfillment'); ?></th>
                        </tr>
                    </thead>
                    <tbody>
                        <?php foreach ($logs as $log): ?>
                        <tr class="labsupply-log-<?php echo esc_attr($log->level); ?>">
                            <td><?php echo esc_html($log->created_at); ?></td>
                            <td><span class="log-level log-<?php echo esc_attr($log->level); ?>"><?php echo esc_html($log->level); ?></span></td>
                            <td><?php echo esc_html($log->message); ?></td>
                        </tr>
                        <?php endforeach; ?>
                    </tbody>
                </table>
                <?php else: ?>
                <p class="description"><?php esc_html_e('No logs yet.', 'labsupply-fulfillment'); ?></p>
                <?php endif; ?>
            </div>
        </div>
    </div>
</div>
