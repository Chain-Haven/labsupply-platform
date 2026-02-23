<?php
/**
 * BTC Checkout Payment Template
 * Shown on the WooCommerce thank-you page for Bitcoin orders.
 *
 * @package WLP_Fulfillment
 */

defined('ABSPATH') || exit;
?>

<div id="wlp-btc-payment" class="wlp-btc-payment" data-status="waiting">

    <!-- Header -->
    <div class="wlp-btc-header">
        <div class="wlp-btc-logo">&#8383;</div>
        <h2><?php esc_html_e('Complete Your Bitcoin Payment', 'wlp-fulfillment'); ?></h2>
        <p class="wlp-btc-subtitle"><?php esc_html_e('Send the exact amount to the address below', 'wlp-fulfillment'); ?></p>
    </div>

    <!-- Status indicator -->
    <div id="wlp-btc-status" class="wlp-btc-status wlp-btc-status-waiting">
        <div class="wlp-btc-status-icon">
            <div class="wlp-btc-spinner"></div>
        </div>
        <span id="wlp-btc-status-text"><?php esc_html_e('Waiting for payment...', 'wlp-fulfillment'); ?></span>
    </div>

    <!-- Amount -->
    <div class="wlp-btc-amount-card">
        <label class="wlp-btc-label"><?php esc_html_e('Amount to Send', 'wlp-fulfillment'); ?></label>
        <div class="wlp-btc-amount-row">
            <span class="wlp-btc-amount" id="wlp-btc-amount"><?php echo esc_html($btc_amount); ?></span>
            <span class="wlp-btc-currency">BTC</span>
            <button type="button" class="wlp-btc-copy-btn" data-copy="<?php echo esc_attr($btc_amount); ?>" title="<?php esc_attr_e('Copy amount', 'wlp-fulfillment'); ?>">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
            </button>
        </div>
        <div class="wlp-btc-usd-equiv">
            ≈ $<?php echo esc_html(number_format(floatval($order->get_total()), 2)); ?> USD
        </div>
    </div>

    <!-- QR Code -->
    <div class="wlp-btc-qr-section">
        <label class="wlp-btc-label"><?php esc_html_e('Scan QR Code', 'wlp-fulfillment'); ?></label>
        <div class="wlp-btc-qr-wrapper">
            <div id="wlp-btc-qr" class="wlp-btc-qr"></div>
        </div>
        <a href="<?php echo esc_url($bip21_uri); ?>" class="wlp-btc-wallet-btn">
            <?php esc_html_e('Open in Wallet App', 'wlp-fulfillment'); ?>
        </a>
    </div>

    <!-- Address -->
    <div class="wlp-btc-address-card">
        <label class="wlp-btc-label"><?php esc_html_e('Bitcoin Address', 'wlp-fulfillment'); ?></label>
        <div class="wlp-btc-address-row">
            <code class="wlp-btc-address" id="wlp-btc-address"><?php echo esc_html($address); ?></code>
            <button type="button" class="wlp-btc-copy-btn" data-copy="<?php echo esc_attr($address); ?>" title="<?php esc_attr_e('Copy address', 'wlp-fulfillment'); ?>">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
            </button>
        </div>
    </div>

    <!-- Confirmations progress -->
    <div id="wlp-btc-confirmations" class="wlp-btc-confirmations" style="display:none;">
        <label class="wlp-btc-label"><?php esc_html_e('Blockchain Confirmations', 'wlp-fulfillment'); ?></label>
        <div class="wlp-btc-conf-bar">
            <div class="wlp-btc-conf-fill" id="wlp-btc-conf-fill" style="width:0%"></div>
        </div>
        <div class="wlp-btc-conf-text">
            <span id="wlp-btc-conf-count">0</span> / <?php echo esc_html($conf_threshold); ?> <?php esc_html_e('confirmations', 'wlp-fulfillment'); ?>
        </div>
    </div>

    <!-- Timer -->
    <div id="wlp-btc-timer" class="wlp-btc-timer">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
        <span id="wlp-btc-timer-text"></span>
    </div>

    <!-- Trust indicators -->
    <div class="wlp-btc-trust">
        <div class="wlp-btc-trust-item">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
            <span><?php esc_html_e('Secured by the Bitcoin blockchain', 'wlp-fulfillment'); ?></span>
        </div>
        <div class="wlp-btc-trust-item">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
            <span><?php esc_html_e('No account required — pay directly', 'wlp-fulfillment'); ?></span>
        </div>
        <div class="wlp-btc-trust-item">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
            <span><?php esc_html_e('Encrypted end-to-end', 'wlp-fulfillment'); ?></span>
        </div>
    </div>
</div>
