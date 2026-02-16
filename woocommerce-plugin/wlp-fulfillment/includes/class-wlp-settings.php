<?php
/**
 * Settings management
 *
 * @package WLP_Fulfillment
 */

defined('ABSPATH') || exit;

class WLP_Settings
{

    /**
     * Initialize settings
     */
    public static function init()
    {
        // Nothing to init for now, settings are handled by admin class
    }

    /**
     * Get a setting value
     *
     * @param string $key
     * @param mixed $default
     * @return mixed
     */
    public static function get($key, $default = '')
    {
        return get_option('wlp_' . $key, $default);
    }

    /**
     * Set a setting value
     *
     * @param string $key
     * @param mixed $value
     */
    public static function set($key, $value)
    {
        update_option('wlp_' . $key, $value);
    }

    /**
     * Check if connected
     */
    public static function is_connected()
    {
        return WLP_API_Client::instance()->is_connected();
    }

    /**
     * Get connection status
     */
    public static function get_connection_status()
    {
        if (!self::is_connected()) {
            return 'disconnected';
        }

        // Check if API is reachable
        $api = WLP_API_Client::instance();
        if ($api->health_check()) {
            return 'connected';
        }

        return 'error';
    }

    /**
     * Get all settings
     */
    public static function get_all()
    {
        return array(
            'api_url' => self::get('api_url', 'https://api.whitelabel.peptidetech.co'),
            'store_id' => self::get('store_id', ''),
            'connected_at' => self::get('connected_at', ''),
            'last_import' => self::get('last_import', ''),
            'auto_sync' => self::get('auto_sync', 'yes'),
            'debug_mode' => self::get('debug_mode', 'no'),
        );
    }
}
