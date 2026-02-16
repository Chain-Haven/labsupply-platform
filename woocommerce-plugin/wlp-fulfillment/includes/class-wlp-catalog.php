<?php
/**
 * Catalog import functionality
 *
 * @package WLP_Fulfillment
 */

defined('ABSPATH') || exit;

class WLP_Catalog
{

    /**
     * Initialize catalog hooks
     */
    public static function init()
    {
        // Ajax handlers
        add_action('wp_ajax_wlp_import_products', array(__CLASS__, 'ajax_import_products'));
        add_action('wp_ajax_wlp_refresh_catalog', array(__CLASS__, 'ajax_refresh_catalog'));
    }

    /**
     * Get catalog from API
     *
     * @return array|WP_Error
     */
    public static function get_catalog()
    {
        $api = WLP_API_Client::instance();
        return $api->get_catalog();
    }

    /**
     * Import products from catalog to WooCommerce
     *
     * @param array $product_ids Optional specific product IDs to import
     * @return array Results
     */
    public static function import_products($product_ids = array())
    {
        $catalog = self::get_catalog();

        if (is_wp_error($catalog)) {
            return array(
                'success' => false,
                'error' => $catalog->get_error_message(),
            );
        }

        $products = isset($catalog['products']) ? $catalog['products'] : array();
        $results = array(
            'created' => 0,
            'updated' => 0,
            'failed' => 0,
            'errors' => array(),
            'imported' => array(),
        );

        foreach ($products as $supplier_product) {
            // Filter by product IDs if specified
            if (!empty($product_ids) && !in_array($supplier_product['id'], $product_ids)) {
                continue;
            }

            $result = self::import_single_product($supplier_product);

            if (is_wp_error($result)) {
                $results['failed']++;
                $results['errors'][] = array(
                    'sku' => $supplier_product['sku'],
                    'error' => $result->get_error_message(),
                );
            } else {
                if ($result['action'] === 'created') {
                    $results['created']++;
                } else {
                    $results['updated']++;
                }
                $results['imported'][] = array(
                    'supplier_product_id' => $supplier_product['id'],
                    'woo_product_id' => $result['product_id'],
                    'status' => $result['action'],
                );
            }
        }

        // Report import status to API
        if (!empty($results['imported'])) {
            $api = WLP_API_Client::instance();
            $api->report_import_status($results['imported']);
        }

        // Update last import timestamp
        update_option('wlp_last_import', current_time('mysql'));

        WLP_Admin::log('info', sprintf(
            'Catalog import complete: %d created, %d updated, %d failed',
            $results['created'],
            $results['updated'],
            $results['failed']
        ));

        return array(
            'success' => true,
            'results' => $results,
        );
    }

    /**
     * Import single product
     *
     * @param array $supplier_product Product data from API
     * @return array|WP_Error
     */
    private static function import_single_product($supplier_product)
    {
        $sku = $supplier_product['sku'];

        // Check if product already exists
        $existing_id = wc_get_product_id_by_sku($sku);

        if ($existing_id) {
            // Update existing product
            $product = wc_get_product($existing_id);
            $action = 'updated';
        } else {
            // Create new product
            $product = new WC_Product_Simple();
            $action = 'created';
        }

        try {
            // Set basic product data
            $product->set_name($supplier_product['name']);
            $product->set_sku($sku);
            $product->set_status('publish');
            $product->set_catalog_visibility('visible');
            $product->set_sold_individually(false);

            // Set description
            if (!empty($supplier_product['description'])) {
                $product->set_description($supplier_product['description']);
            }
            if (!empty($supplier_product['short_description'])) {
                $product->set_short_description($supplier_product['short_description']);
            }

            // Set price (wholesale price from supplier)
            $price = $supplier_product['wholesale_price_cents'] / 100;
            $product->set_regular_price($price);
            $product->set_price($price);

            // Set MAP price if available
            if (!empty($supplier_product['map_price_cents'])) {
                $map_price = $supplier_product['map_price_cents'] / 100;
                $product->update_meta_data('_wlp_map_price', $map_price);
            }

            // Set weight/dimensions
            if (!empty($supplier_product['weight_grams'])) {
                // Convert grams to shop weight unit
                $weight_unit = get_option('woocommerce_weight_unit');
                $weight = $supplier_product['weight_grams'];
                if ($weight_unit === 'oz') {
                    $weight = $weight * 0.035274;
                } elseif ($weight_unit === 'lbs') {
                    $weight = $weight * 0.00220462;
                } elseif ($weight_unit === 'kg') {
                    $weight = $weight / 1000;
                }
                $product->set_weight($weight);
            }

            if (!empty($supplier_product['dimensions'])) {
                $dims = $supplier_product['dimensions'];
                if (!empty($dims['length_cm']))
                    $product->set_length($dims['length_cm']);
                if (!empty($dims['width_cm']))
                    $product->set_width($dims['width_cm']);
                if (!empty($dims['height_cm']))
                    $product->set_height($dims['height_cm']);
            }

            // Set stock status based on availability
            $product->set_manage_stock(false);
            $product->set_stock_status($supplier_product['in_stock'] ? 'instock' : 'outofstock');

            // Set category if exists
            if (!empty($supplier_product['category'])) {
                $category_id = self::get_or_create_category($supplier_product['category']);
                if ($category_id) {
                    $product->set_category_ids(array($category_id));
                }
            }

            // Save meta data
            $product->update_meta_data('_wlp_product_id', $supplier_product['id']);
            $product->update_meta_data('_wlp_sku', $sku);
            $product->update_meta_data('_wlp_requires_coa', $supplier_product['requires_coa'] ? 'yes' : 'no');
            $product->update_meta_data('_wlp_last_sync', current_time('mysql'));

            // Add compliance/disclaimer as meta
            if (!empty($supplier_product['compliance_copy'])) {
                $product->update_meta_data('_wlp_compliance', $supplier_product['compliance_copy']);
            }
            if (!empty($supplier_product['disclaimer'])) {
                $product->update_meta_data('_wlp_disclaimer', $supplier_product['disclaimer']);
            }

            // Save product
            $product_id = $product->save();

            // Import images if available
            if (!empty($supplier_product['images']) && $action === 'created') {
                self::import_product_images($product_id, $supplier_product['images']);
            }

            return array(
                'product_id' => $product_id,
                'action' => $action,
            );

        } catch (Exception $e) {
            return new WP_Error('import_failed', $e->getMessage());
        }
    }

    /**
     * Get or create product category
     */
    private static function get_or_create_category($category_name)
    {
        $term = get_term_by('name', $category_name, 'product_cat');

        if ($term) {
            return $term->term_id;
        }

        $result = wp_insert_term($category_name, 'product_cat');

        if (is_wp_error($result)) {
            return null;
        }

        return $result['term_id'];
    }

    /**
     * Import product images
     */
    private static function import_product_images($product_id, $images)
    {
        if (empty($images)) {
            return;
        }

        $attachment_ids = array();

        foreach ($images as $index => $image) {
            $url = $image['url'];

            // Download and attach image
            $attachment_id = self::upload_image_from_url($url, $product_id);

            if ($attachment_id && !is_wp_error($attachment_id)) {
                $attachment_ids[] = $attachment_id;

                // Set first image as featured
                if ($index === 0) {
                    set_post_thumbnail($product_id, $attachment_id);
                }
            }
        }

        // Set gallery images
        if (count($attachment_ids) > 1) {
            $product = wc_get_product($product_id);
            $product->set_gallery_image_ids(array_slice($attachment_ids, 1));
            $product->save();
        }
    }

    /**
     * Upload image from URL
     */
    private static function upload_image_from_url($url, $product_id)
    {
        require_once(ABSPATH . 'wp-admin/includes/file.php');
        require_once(ABSPATH . 'wp-admin/includes/media.php');
        require_once(ABSPATH . 'wp-admin/includes/image.php');

        // Download file
        $tmp = download_url($url);

        if (is_wp_error($tmp)) {
            return $tmp;
        }

        $file_array = array(
            'name' => basename(parse_url($url, PHP_URL_PATH)),
            'tmp_name' => $tmp,
        );

        // Upload to media library
        $attachment_id = media_handle_sideload($file_array, $product_id);

        // Clean up temp file
        @unlink($tmp);

        return $attachment_id;
    }

    /**
     * Ajax handler for product import
     */
    public static function ajax_import_products()
    {
        check_ajax_referer('wlp_admin', 'nonce');

        if (!current_user_can('manage_woocommerce')) {
            wp_send_json_error('Permission denied');
            return;
        }

        $product_ids = isset($_POST['product_ids']) ? array_map('sanitize_text_field', $_POST['product_ids']) : array();

        $result = self::import_products($product_ids);

        if ($result['success']) {
            wp_send_json_success($result['results']);
        } else {
            wp_send_json_error($result['error']);
        }
    }

    /**
     * Ajax handler for catalog refresh
     */
    public static function ajax_refresh_catalog()
    {
        check_ajax_referer('wlp_admin', 'nonce');

        if (!current_user_can('manage_woocommerce')) {
            wp_send_json_error('Permission denied');
            return;
        }

        $catalog = self::get_catalog();

        if (is_wp_error($catalog)) {
            wp_send_json_error($catalog->get_error_message());
            return;
        }

        // Cache catalog
        set_transient('wlp_catalog', $catalog, HOUR_IN_SECONDS);

        wp_send_json_success($catalog);
    }
}
