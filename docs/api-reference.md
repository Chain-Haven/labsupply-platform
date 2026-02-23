# WhiteLabel Peptides API Reference

## Base URL

```
Production: https://api.whitelabel.peptidetech.co/v1
Development: http://localhost:3001/v1
```

## Authentication

All API requests (except health check and connect code exchange) require HMAC-signed headers:

| Header | Description |
|--------|-------------|
| `X-Store-Id` | Your store's unique identifier |
| `X-Timestamp` | Current Unix timestamp in milliseconds |
| `X-Nonce` | Random 32-character hex string |
| `X-Signature` | HMAC-SHA256 signature |

### Signature Generation

```typescript
const signatureString = `${storeId}:${timestamp}:${nonce}:${bodyHash}`;
const signature = HMAC-SHA256(signatureString, storeSecret);
```

Where `bodyHash` is `SHA256(requestBody)` for POST/PUT/PATCH, or `SHA256('')` for GET/DELETE.

---

## Endpoints

### Health Check

```
GET /v1/health
```

Returns API status. No authentication required.

**Response:**
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "timestamp": "2024-01-10T12:00:00.000Z",
    "version": "1.0.0"
  }
}
```

---

### Store Connection

#### Exchange Connect Code

```
POST /v1/stores/connect/exchange
```

Exchange a connect code from the portal for store credentials. No HMAC auth required.

**Request:**
```json
{
  "connect_code": "ABC1-2DEF-3GHI",
  "store_url": "https://mystore.com",
  "store_name": "My Research Store",
  "woo_version": "8.4.0",
  "currency": "USD",
  "timezone": "America/New_York"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "store_id": "uuid",
    "store_secret": "secret_xxxxx",
    "api_base_url": "https://api.whitelabel.peptidetech.co"
  }
}
```

#### Rotate Secret

```
POST /v1/stores/rotate-secret
```

Generate a new store secret. The current secret is immediately invalidated.

**Response:**
```json
{
  "success": true,
  "data": {
    "new_secret": "secret_yyyyy",
    "rotated_at": "2024-01-10T12:00:00.000Z"
  }
}
```

---

### Catalog

#### Get Catalog

```
GET /v1/catalog
```

Retrieve all products whitelisted for your merchant account.

**Response:**
```json
{
  "success": true,
  "data": {
    "products": [
      {
        "id": "uuid",
        "sku": "BPC-157-5MG",
        "name": "BPC-157 5mg",
        "description": "Research peptide...",
        "short_description": "5mg lyophilized...",
        "images": [
          {
            "id": "uuid",
            "url": "https://..."
          }
        ],
        "wholesale_price_cents": 2500,
        "map_price_cents": 4999,
        "dimensions": {
          "length_cm": 5,
          "width_cm": 5,
          "height_cm": 2
        },
        "weight_grams": 10,
        "category": "Peptides",
        "in_stock": true,
        "available_qty": 142,
        "min_qty": 1,
        "max_qty": 50,
        "requires_coa": true,
        "compliance_copy": "For research use only...",
        "disclaimer": "This product is not..."
      }
    ],
    "last_updated": "2024-01-10T12:00:00.000Z"
  }
}
```

---

### Orders

#### Create Order

```
POST /v1/orders
```

Submit a new order for fulfillment. Orders are idempotent based on `woo_order_id`.

**Request:**
```json
{
  "woo_order_id": "1001",
  "woo_order_number": "WC-1001",
  "currency": "USD",
  "shipping_address": {
    "first_name": "John",
    "last_name": "Doe",
    "address_1": "123 Research Blvd",
    "city": "Las Vegas",
    "state": "NV",
    "postcode": "89101",
    "country": "US",
    "phone": "555-0100",
    "email": "john@example.com"
  },
  "billing_address": {},
  "customer_email": "john@example.com",
  "customer_note": "Please ship ASAP",
  "items": [
    {
      "supplier_sku": "BPC-157-5MG",
      "woo_product_id": "42",
      "qty": 2,
      "unit_price_cents": 2500,
      "name": "BPC-157 5mg"
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "supplier_order_id": "uuid",
    "status": "FUNDED",
    "estimated_total_cents": 5895,
    "wallet_balance_cents": 50000,
    "is_funded": true
  }
}
```

#### List Orders

```
GET /v1/orders?status=FUNDED&page=1&limit=20
```

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `status` | string | Filter by order status |
| `page` | number | Page number (default: 1) |
| `limit` | number | Items per page (max: 100) |

#### Get Order

```
GET /v1/orders/{id}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "woo_order_id": "1001",
    "status": "SHIPPED",
    "subtotal_cents": 5000,
    "total_estimate_cents": 5895,
    "actual_total_cents": 5850,
    "order_items": [...],
    "shipments": [...]
  }
}
```

#### Cancel Order

```
POST /v1/orders/{id}/cancel
```

**Request:**
```json
{
  "reason": "Customer requested cancellation",
  "refund_to_wallet": true
}
```

---

### Wallet

#### Get Balance

```
GET /v1/wallet
```

**Response:**
```json
{
  "success": true,
  "data": {
    "balance_cents": 50000,
    "reserved_cents": 5895,
    "available_cents": 44105,
    "currency": "USD",
    "pending_payments": 0
  }
}
```

#### Wallet Funding

Wallet funding is handled via Mercury invoicing. When a merchant's available balance drops below
their configured threshold, an invoice is automatically generated and emailed via the Mercury
Accounts Receivable API. Once the merchant pays and the funds settle (invoice status = `Paid`),
the wallet balance is credited automatically.

**Mercury Invoice Statuses:**
- `Unpaid` - Invoice sent, awaiting payment
- `Processing` - Payment initiated, not yet settled
- `Paid` - Payment settled, wallet credited
- `Cancelled` - Invoice cancelled

---

### Shipments

#### Create Shipment (Admin)

```
POST /v1/shipments
```

Creates a shipment for an order. If ShipStation is configured, automatically purchases a label.

**Request:**
```json
{
  "order_id": "uuid",
  "carrier": "usps",
  "service": "usps_priority_mail",
  "weight_oz": 16
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "shipment_id": "uuid",
    "order_id": "uuid",
    "status": "LABEL_CREATED",
    "carrier": "usps",
    "service": "usps_priority_mail",
    "tracking_number": "9400111899223100123456",
    "tracking_url": "https://track.shipstation.com/tracking/9400111899223100123456",
    "label_url": "https://...",
    "rate_cents": 895
  }
}
```

#### Mark Shipped (Admin)

```
POST /v1/shipments/{id}/ship
```

Marks a shipment as shipped with tracking info and triggers wallet settlement.

**Request:**
```json
{
  "tracking_number": "9400111899223100123456",
  "tracking_url": "https://...",
  "carrier": "usps",
  "actual_cost_cents": 895
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "shipment_id": "uuid",
    "order_id": "uuid",
    "status": "IN_TRANSIT",
    "tracking_number": "9400111899223100123456"
  }
}
```

### Tracking

#### Get Pending Updates

```
GET /v1/tracking/pending
```

Returns orders with tracking info that haven't been acknowledged by the store. Used by WooCommerce plugin polling.

#### Acknowledge Updates

```
POST /v1/tracking/acknowledge
```

Acknowledges that tracking updates have been processed by the store.

**Request:**
```json
{
  "order_ids": ["uuid1", "uuid2"]
}
```

#### Order Updates (Delta Sync)

```
GET /v1/orders/updates?since=2024-01-10T00:00:00Z&limit=50
```

Returns orders updated since the given timestamp. Lightweight alternative to full order listing.

**Response:**
```json
{
  "success": true,
  "data": {
    "updates": [
      {
        "order_id": "uuid",
        "status": "SHIPPED",
        "updated_at": "2024-01-10T12:00:00Z"
      }
    ]
  }
}
```

### Webhooks

#### ShipStation Webhook

```
POST /v1/webhooks/shipstation
```

Receives delivery events from ShipStation. Automatically transitions shipments to DELIVERED and orders to COMPLETE.

---

## Shipment Statuses

| Status | Description |
|--------|-------------|
| `PENDING` | Shipment created, no label yet |
| `LABEL_CREATED` | Label purchased, awaiting pickup |
| `PICKED_UP` | Carrier has picked up package |
| `IN_TRANSIT` | Package in transit |
| `DELIVERED` | Package delivered |
| `FAILED` | Delivery failed |
| `RETURNED` | Package returned |

---

## Order Statuses

| Status | Description |
|--------|-------------|
| `RECEIVED` | Order received, validating |
| `AWAITING_FUNDS` | Insufficient wallet balance |
| `FUNDED` | Funds reserved from wallet |
| `RELEASED_TO_FULFILLMENT` | Ready for picking |
| `PICKING` | Items being picked |
| `PACKED` | Packed and ready to ship |
| `SHIPPED` | Label created, in transit |
| `COMPLETE` | Delivered |
| `ON_HOLD_PAYMENT` | Payment issue |
| `ON_HOLD_COMPLIANCE` | Compliance review needed |
| `CANCELLED` | Order cancelled |
| `REFUNDED` | Funds refunded to wallet |

---

## Error Responses

All errors follow this format:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable message",
    "details": {}
  }
}
```

### Common Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `UNAUTHORIZED` | 401 | Invalid or missing authentication |
| `FORBIDDEN` | 403 | No permission for this resource |
| `NOT_FOUND` | 404 | Resource not found |
| `VALIDATION_ERROR` | 400 | Invalid request body |
| `INSUFFICIENT_FUNDS` | 400 | Wallet balance too low |
| `SIGNATURE_EXPIRED` | 401 | Request timestamp too old |
| `SIGNATURE_INVALID` | 401 | HMAC signature mismatch |
| `RATE_LIMITED` | 429 | Too many requests |

---

## Rate Limits

| Endpoint Type | Limit |
|---------------|-------|
| Read operations | 100 req/min |
| Write operations | 30 req/min |
| Webhook callbacks | 10 req/min |

Rate limit headers are included in responses:
- `X-RateLimit-Limit`
- `X-RateLimit-Remaining`
- `X-RateLimit-Reset`
