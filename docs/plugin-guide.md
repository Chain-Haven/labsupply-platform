# WhiteLabel Peptides WooCommerce Plugin Guide

The WhiteLabel Peptides Fulfillment Connector plugin enables your WooCommerce store to automatically sync orders to the WhiteLabel Peptides fulfillment platform and receive tracking updates.

## Requirements

- WordPress 6.0+
- WooCommerce 8.0+
- PHP 7.4+
- SSL certificate (HTTPS required for API communication)

## Installation

### Manual Installation

1. Download the `wlp-fulfillment.zip` file from the portal or releases
2. In WordPress admin, go to **Plugins → Add New → Upload Plugin**
3. Select the ZIP file and click **Install Now**
4. Click **Activate Plugin**

### Composer Installation

```bash
composer require whitelabel-peptides/woocommerce-connector
```

## Connection Setup

### Step 1: Get a Connect Code

1. Log in to your WhiteLabel Peptides merchant portal
2. Go to **Stores → Connect Store**
3. Click **Generate Connect Code**
4. Copy the 12-character code (format: `XXXX-XXXX-XXXX`)

### Step 2: Connect Your Store

1. In WordPress admin, go to **WooCommerce → WhiteLabel Peptides**
2. Enter the connect code
3. Click **Connect**
4. Upon success, you'll see your Store ID and connection status

The plugin automatically sends:
- Your store URL
- Store name
- WooCommerce version
- Currency settings
- Timezone

## How It Works

### Product Import

1. Go to **WooCommerce → WhiteLabel Peptides**
2. Click **Refresh Catalog** to load available products
3. Click **Import All Products** to create WooCommerce products

Imported products:
- Are created as Simple products
- Use the supplier's SKU
- Include wholesale pricing (which you can adjust)
- Store the supplier product ID in metadata
- Sync images and descriptions

### Order Synchronization

When an order containing supplier products is marked as Processing or Completed:

1. The plugin extracts items with supplier SKUs
2. Formats the shipping address and order details
3. Sends a signed request to the WhiteLabel Peptides API
4. Stores the supplier order ID in order metadata
5. Adds an order note with sync status

If the sync fails:
- The order is added to a retry queue
- The plugin retries with exponential backoff
- After 5 failures, the order is marked for manual review

### Tracking Updates

The plugin polls for tracking updates hourly. When tracking is available:

1. Tracking number and carrier are saved to order metadata
2. A tracking link is added to the order notes
3. The customer receives the standard WooCommerce shipping notification
4. Order status is updated to Completed

## Settings

| Setting | Description |
|---------|-------------|
| **API URL** | WhiteLabel Peptides API endpoint (auto-configured) |
| **Store ID** | Your store's unique identifier |
| **Auto Sync** | Enable/disable automatic order syncing |
| **Debug Mode** | Enable detailed logging |

## Webhook Endpoints

The plugin registers the following REST endpoints:

```
GET  /wp-json/wlp-fulfillment/v1/health
POST /wp-json/wlp-fulfillment/v1/tracking
POST /wp-json/wlp-fulfillment/v1/order-status
```

These endpoints receive callbacks from the WhiteLabel Peptides server for:
- Tracking updates
- Order status changes
- Inventory alerts

All incoming requests are verified using HMAC signatures.

## Troubleshooting

### Connection Issues

**"Invalid connect code"**
- Verify the code hasn't expired (valid for 24 hours)
- Check for typos - codes are case-insensitive
- Generate a new code from the portal

**"Connection failed"**
- Ensure your site uses HTTPS
- Check that cURL is enabled in PHP
- Verify no firewall is blocking outbound connections

### Order Sync Issues

**Orders not syncing**
- Verify the plugin is connected (check status in settings)
- Ensure products have the `_wlp_sku` meta field
- Check the debug logs for errors

**"Insufficient funds" errors**
- Top up your wallet in the merchant portal
- Orders will auto-process once funded

### Tracking Not Updating

**No tracking information**
- Tracking is polled hourly; wait for the next cron run
- Manually trigger: **WooCommerce → Status → Scheduled Actions → wlp_check_tracking**

## Debugging

Enable debug mode in settings to log:
- All API requests and responses
- Signature generation details
- Order sync attempts
- Tracking update processing

Logs are stored in:
- Custom `wp_wlp_log` table (viewable in settings)
- WooCommerce logs (if enabled): `/wp-content/uploads/wc-logs/`

## Security

The plugin implements:
- **Encrypted Secret Storage**: Store secrets are encrypted using WordPress salts
- **HMAC-Signed Requests**: All API requests include timestamp-based signatures
- **Signature Verification**: Incoming webhooks are verified before processing
- **Nonce Protection**: All admin AJAX actions use WordPress nonces

## Uninstallation

Deactivating the plugin:
- Clears scheduled cron jobs
- Does NOT delete stored credentials or sync history

To fully remove:
1. Deactivate and delete the plugin
2. Run: `DELETE FROM wp_options WHERE option_name LIKE 'wlp_%'`
3. The custom tables (`wp_wlp_order_queue`, `wp_wlp_log`) remain for audit purposes

## Support

- **Documentation**: https://docs.whitelabel.peptidetech.co
- **Email**: support@whitelabel.peptidetech.co
- **Portal**: https://portal.whitelabel.peptidetech.co/support
