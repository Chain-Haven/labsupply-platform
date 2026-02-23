<?php
/**
 * WooCommerce Blocks integration for BTC payment gateway.
 * Registers the payment method for the block-based checkout.
 *
 * @package WLP_Fulfillment
 */

defined('ABSPATH') || exit;

use Automattic\WooCommerce\Blocks\Payments\Integrations\AbstractPaymentMethodType;

final class WLP_BTC_Blocks_Integration extends AbstractPaymentMethodType
{
    protected $name = 'wlp_btc';

    public function initialize()
    {
        $this->settings = get_option('woocommerce_wlp_btc_settings', array());
    }

    public function is_active()
    {
        return !empty($this->settings['enabled']) && $this->settings['enabled'] === 'yes';
    }

    public function get_payment_method_script_handles()
    {
        wp_register_script(
            'wlp-btc-blocks',
            WLP_PLUGIN_URL . 'assets/js/btc-blocks.js',
            array('wc-blocks-registry', 'wc-settings', 'wp-element', 'wp-html-entities', 'wp-i18n'),
            WLP_VERSION,
            true
        );
        return array('wlp-btc-blocks');
    }

    public function get_payment_method_data()
    {
        return array(
            'title' => $this->settings['title'] ?? __('Pay with Bitcoin', 'wlp-fulfillment'),
            'description' => $this->settings['description'] ?? __('Pay securely with Bitcoin. Your order will be confirmed after blockchain confirmations.', 'wlp-fulfillment'),
            'supports' => array('products'),
        );
    }
}
