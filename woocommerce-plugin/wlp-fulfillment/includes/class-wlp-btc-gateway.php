<?php
/**
 * WooCommerce Bitcoin Payment Gateway
 *
 * Provides BTC checkout using the merchant's platform-assigned address.
 * Monitors the blockchain via Esplora API for payment confirmation.
 *
 * @package WLP_Fulfillment
 */

defined('ABSPATH') || exit;

class WLP_BTC_Gateway extends WC_Payment_Gateway
{
    private $btc_address = '';
    private $btc_rate = 0;
    private $esplora_base = 'https://blockstream.info/api';
    private $conf_threshold = 3;
    private $btc_network = 'mainnet';

    public function __construct()
    {
        $this->id = 'wlp_btc';
        $this->icon = '';
        $this->has_fields = false;
        $this->method_title = __('Bitcoin (BTC)', 'wlp-fulfillment');
        $this->method_description = __('Accept Bitcoin payments. Customers pay to a unique BTC address and orders are confirmed automatically.', 'wlp-fulfillment');
        $this->supports = array('products');

        $this->init_form_fields();
        $this->init_settings();

        $this->title = $this->get_option('title', __('Pay with Bitcoin', 'wlp-fulfillment'));
        $this->description = $this->get_option('description', __('Pay securely with Bitcoin. Your order will be confirmed after the transaction receives blockchain confirmations.', 'wlp-fulfillment'));
        $this->order_button_text = __('Pay with Bitcoin', 'wlp-fulfillment');

        add_action('woocommerce_update_options_payment_gateways_' . $this->id, array($this, 'process_admin_options'));
        add_action('woocommerce_thankyou_' . $this->id, array($this, 'thankyou_page'));
        add_action('woocommerce_email_before_order_table', array($this, 'email_instructions'), 10, 3);
    }

    public function init_form_fields()
    {
        $this->form_fields = array(
            'enabled' => array(
                'title' => __('Enable/Disable', 'wlp-fulfillment'),
                'type' => 'checkbox',
                'label' => __('Enable Bitcoin Payments', 'wlp-fulfillment'),
                'default' => 'no',
            ),
            'title' => array(
                'title' => __('Title', 'wlp-fulfillment'),
                'type' => 'text',
                'description' => __('Payment method title shown at checkout.', 'wlp-fulfillment'),
                'default' => __('Pay with Bitcoin', 'wlp-fulfillment'),
                'desc_tip' => true,
            ),
            'description' => array(
                'title' => __('Description', 'wlp-fulfillment'),
                'type' => 'textarea',
                'description' => __('Description shown at checkout.', 'wlp-fulfillment'),
                'default' => __('Pay securely with Bitcoin. Your order will be confirmed after the transaction receives blockchain confirmations.', 'wlp-fulfillment'),
                'desc_tip' => true,
            ),
            'order_timeout_minutes' => array(
                'title' => __('Payment Timeout (minutes)', 'wlp-fulfillment'),
                'type' => 'number',
                'description' => __('How long to wait for BTC payment before the order expires.', 'wlp-fulfillment'),
                'default' => '60',
                'desc_tip' => true,
                'custom_attributes' => array('min' => '15', 'max' => '1440'),
            ),
            'rate_markup_percent' => array(
                'title' => __('Rate Markup (%)', 'wlp-fulfillment'),
                'type' => 'number',
                'description' => __('Add a percentage markup to the BTC exchange rate to cover volatility.', 'wlp-fulfillment'),
                'default' => '1',
                'desc_tip' => true,
                'custom_attributes' => array('min' => '0', 'max' => '10', 'step' => '0.5'),
            ),
        );
    }

    public function is_available()
    {
        if (!parent::is_available()) {
            return false;
        }
        $api = WLP_API_Client::instance();
        return $api->is_connected();
    }

    /**
     * Fetch BTC checkout info from the platform API
     */
    private function fetch_checkout_info()
    {
        $api = WLP_API_Client::instance();
        $info = $api->request('GET', 'btc/checkout-info');

        if (is_wp_error($info) || empty($info['enabled'])) {
            return false;
        }

        $this->btc_address = $info['address'] ?? '';
        $this->btc_rate = floatval($info['btc_rate_usd'] ?? 0);
        $this->esplora_base = $info['esplora_base_url'] ?? 'https://blockstream.info/api';
        $this->conf_threshold = intval($info['confirmation_threshold'] ?? 3);
        $this->btc_network = $info['network'] ?? 'mainnet';

        return !empty($this->btc_address) && $this->btc_rate > 0;
    }

    /**
     * Convert USD to BTC (in satoshis)
     */
    private function usd_to_btc($usd_amount)
    {
        if ($this->btc_rate <= 0) return 0;
        $markup = floatval($this->get_option('rate_markup_percent', '1'));
        $effective_rate = $this->btc_rate * (1 + $markup / 100);
        return $usd_amount / $effective_rate;
    }

    /**
     * Process payment — place order on-hold and redirect to thank-you page
     */
    public function process_payment($order_id)
    {
        $order = wc_get_order($order_id);
        if (!$order) {
            return array('result' => 'failure', 'messages' => 'Order not found.');
        }

        if (!$this->fetch_checkout_info()) {
            wc_add_notice(__('Bitcoin payments are temporarily unavailable. Please try another payment method.', 'wlp-fulfillment'), 'error');
            return array('result' => 'failure');
        }

        $total_usd = floatval($order->get_total());
        $btc_amount = $this->usd_to_btc($total_usd);
        $btc_sats = round($btc_amount * 100000000);

        $order->update_meta_data('_wlp_btc_address', $this->btc_address);
        $order->update_meta_data('_wlp_btc_amount', number_format($btc_amount, 8, '.', ''));
        $order->update_meta_data('_wlp_btc_sats', $btc_sats);
        $order->update_meta_data('_wlp_btc_rate', $this->btc_rate);
        $order->update_meta_data('_wlp_btc_esplora', $this->esplora_base);
        $order->update_meta_data('_wlp_btc_conf_threshold', $this->conf_threshold);
        $order->update_meta_data('_wlp_btc_network', $this->btc_network);

        $timeout_min = intval($this->get_option('order_timeout_minutes', '60'));
        $expires_at = time() + ($timeout_min * 60);
        $order->update_meta_data('_wlp_btc_expires_at', $expires_at);

        $order->update_status('on-hold', sprintf(
            __('Awaiting Bitcoin payment of %s BTC to %s', 'wlp-fulfillment'),
            number_format($btc_amount, 8, '.', ''),
            $this->btc_address
        ));
        $order->save();

        wc_reduce_stock_levels($order_id);
        WC()->cart->empty_cart();

        return array(
            'result' => 'success',
            'redirect' => $this->get_return_url($order),
        );
    }

    /**
     * Thank-you page — shows BTC payment UI
     */
    public function thankyou_page($order_id)
    {
        $order = wc_get_order($order_id);
        if (!$order || $order->get_payment_method() !== $this->id) {
            return;
        }

        if ($order->is_paid()) {
            echo '<div class="wlp-btc-confirmed"><p>' . esc_html__('Bitcoin payment confirmed! Your order is being processed.', 'wlp-fulfillment') . '</p></div>';
            return;
        }

        $address = $order->get_meta('_wlp_btc_address');
        $btc_amount = $order->get_meta('_wlp_btc_amount');
        $btc_sats = $order->get_meta('_wlp_btc_sats');
        $esplora = $order->get_meta('_wlp_btc_esplora');
        $conf_threshold = $order->get_meta('_wlp_btc_conf_threshold');
        $expires_at = $order->get_meta('_wlp_btc_expires_at');
        $network = $order->get_meta('_wlp_btc_network');

        if (empty($address) || empty($btc_amount)) {
            echo '<p class="wlp-btc-error">' . esc_html__('Payment information unavailable. Please contact support.', 'wlp-fulfillment') . '</p>';
            return;
        }

        $bip21_uri = 'bitcoin:' . $address . '?amount=' . $btc_amount;

        wp_enqueue_style('wlp-btc-checkout', WLP_PLUGIN_URL . 'assets/css/btc-checkout.css', array(), WLP_VERSION);
        wp_enqueue_script('wlp-btc-checkout', WLP_PLUGIN_URL . 'assets/js/btc-checkout.js', array('jquery'), WLP_VERSION, true);
        wp_localize_script('wlp-btc-checkout', 'wlpBtc', array(
            'address' => $address,
            'amount_btc' => $btc_amount,
            'amount_sats' => $btc_sats,
            'bip21_uri' => $bip21_uri,
            'esplora_base' => $esplora,
            'conf_threshold' => intval($conf_threshold),
            'expires_at' => intval($expires_at),
            'order_id' => $order_id,
            'check_url' => rest_url('wlp/v1/btc-payment-check'),
            'nonce' => wp_create_nonce('wp_rest'),
            'network' => $network,
            'strings' => array(
                'waiting' => __('Waiting for payment...', 'wlp-fulfillment'),
                'detected' => __('Payment detected! Waiting for confirmations...', 'wlp-fulfillment'),
                'confirmed' => __('Payment confirmed!', 'wlp-fulfillment'),
                'expired' => __('Payment window expired.', 'wlp-fulfillment'),
                'confirmations' => __('confirmations', 'wlp-fulfillment'),
                'copy_success' => __('Copied!', 'wlp-fulfillment'),
            ),
        ));

        include WLP_PLUGIN_DIR . 'templates/btc-checkout.php';
    }

    /**
     * Add payment instructions to emails
     */
    public function email_instructions($order, $sent_to_admin, $plain_text)
    {
        if (!$order || $order->get_payment_method() !== $this->id || $order->is_paid()) {
            return;
        }

        $address = $order->get_meta('_wlp_btc_address');
        $btc_amount = $order->get_meta('_wlp_btc_amount');

        if (empty($address) || empty($btc_amount)) {
            return;
        }

        if ($plain_text) {
            echo "\n\n=== " . __('Bitcoin Payment Details', 'wlp-fulfillment') . " ===\n";
            echo __('Amount:', 'wlp-fulfillment') . ' ' . $btc_amount . " BTC\n";
            echo __('Address:', 'wlp-fulfillment') . ' ' . $address . "\n";
            echo __('Please send the exact amount to the address above.', 'wlp-fulfillment') . "\n";
        } else {
            echo '<div style="margin:16px 0; padding:16px; border:2px solid #f7931a; border-radius:8px; background:#fffbf5;">';
            echo '<h2 style="margin:0 0 8px; font-size:16px; color:#f7931a;">&#8383; ' . esc_html__('Bitcoin Payment Details', 'wlp-fulfillment') . '</h2>';
            echo '<p style="margin:4px 0;"><strong>' . esc_html__('Amount:', 'wlp-fulfillment') . '</strong> ' . esc_html($btc_amount) . ' BTC</p>';
            echo '<p style="margin:4px 0;"><strong>' . esc_html__('Address:', 'wlp-fulfillment') . '</strong> <code style="background:#f1f1f1; padding:2px 6px; border-radius:3px; word-break:break-all;">' . esc_html($address) . '</code></p>';
            echo '<p style="margin:8px 0 0; color:#666; font-size:13px;">' . esc_html__('Please send the exact amount to the address above. Your order will be confirmed once the payment receives enough blockchain confirmations.', 'wlp-fulfillment') . '</p>';
            echo '</div>';
        }
    }
}
