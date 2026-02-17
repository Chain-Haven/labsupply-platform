# WhiteLabel Peptides Platform

A production-quality monorepo for a Supliful-style supplier and merchant integration platform, specialized for peptides and research compounds. Features in-house fulfillment, prepay wallet billing, and WooCommerce integration via a distributable WordPress plugin.

## 🏗 Architecture

```
whitelabel-peptides-platform/
├── apps/
│   ├── portal/          # Next.js merchant & admin portal
│   └── api/             # Next.js API with Inngest workflows
├── packages/
│   ├── shared/          # Shared types, schemas, utils, & SDK client
│   └── db/              # Supabase schema, migrations, RLS policies
├── woocommerce-plugin/  # WooCommerce fulfillment connector
│   └── wlp-fulfillment/
├── docs/                # Documentation
└── .github/workflows/   # CI/CD pipelines
```

## 🚀 Quick Start

### Prerequisites

- Node.js 20+
- pnpm 8+
- Supabase CLI (for local development)
- Docker (for Supabase local)

### Installation

```bash
# Clone the repository
git clone https://github.com/your-org/whitelabel-peptides-platform.git
cd whitelabel-peptides-platform

# Install dependencies
pnpm install

# Copy environment file and configure
cp .env.example .env
# Edit .env with your Supabase, Mercury, and Inngest credentials

# Start Supabase locally
pnpm db:start

# Run migrations
pnpm db:migrate

# Seed the database
pnpm db:seed

# Start development servers
pnpm dev
```

### Development URLs

- **Portal**: http://localhost:3000
- **API**: http://localhost:3001
- **Supabase Studio**: http://localhost:54323

## 📦 Packages

### `@whitelabel-peptides/shared`

Core shared package containing:

- **Types**: Full TypeScript interfaces for all domain entities (merchants, orders, products, etc.)
- **Schemas**: Zod validation schemas for API requests
- **Utils**: HMAC signing, hashing, currency formatting, retry logic
- **Client**: TypeScript SDK for API consumption

### `@whitelabel-peptides/db`

Database package with:

- **Migrations**: Supabase SQL migrations for schema, RLS, and storage
- **Seeds**: Development seed data
- **Types**: Generated TypeScript types from Supabase

## 🔧 Key Features

### For Merchants

- **Connect WooCommerce Store**: Simple plugin-based connection flow
- **Catalog Import**: Browse and import whitelisted products
- **Wallet System**: Prepay funds for automatic order processing
- **Order Tracking**: Real-time tracking updates synced to WooCommerce

### For Suppliers

- **Product Management**: Configure catalog with compliance documentation
- **Order Fulfillment**: Dashboard for order processing and shipping
- **Merchant Management**: Onboard and manage merchant accounts
- **Analytics**: Revenue and order insights

### Technical Highlights

- **HMAC-Signed Requests**: Secure API authentication without long-lived tokens
- **Idempotent Operations**: Safe retries for webhooks and order creation
- **Durable Workflows**: Inngest-powered background jobs with built-in retries
- **Row-Level Security**: Multi-tenant data isolation in Supabase
- **Wallet Reservations**: Funds held for orders, settled on shipment

## 🔐 Security

- Secrets encrypted at rest using sodium/AES-256
- Request signatures with timestamp-based replay protection
- Row-level security policies on all database tables
- Audit logging for all sensitive operations
- No plaintext credentials in logs

## 📚 Documentation

- [API Reference](./docs/api-reference.md)
- [Database Schema](./docs/database-schema.md)
- [Plugin Installation](./docs/plugin-guide.md)
- [Deployment Guide](./docs/deployment.md)

## 🧪 Testing

### Unit Tests

```bash
# Run all unit tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Run tests with coverage
pnpm test:coverage
```

### E2E Tests (Playwright)

End-to-end tests cover auth flows (login, register, magic links, password reset), onboarding, and error scenarios.

**Prerequisites:** Supabase project with `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in `.env`.

```bash
# Create test users (run once, or when resetting test data)
pnpm create:test-user

# Run E2E tests (starts dev server automatically)
pnpm test:e2e

# Run with browser visible
pnpm test:e2e:headed

# Interactive UI mode
pnpm test:e2e:ui

# Debug mode
pnpm test:e2e:debug
```

**CI:** E2E tests run in GitHub Actions. Configure these secrets for the `test-e2e` job:

- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## 🚢 Deployment

### Vercel Deployment

The portal and API apps are configured for Vercel deployment:

```bash
# Deploy preview
vercel

# Deploy production
vercel --prod
```

### Environment Variables

See `.env.example` for required environment variables. Key variables:

- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Server-side Supabase key
- `MERCURY_API_TOKEN` - Mercury Banking API token for invoicing
- `MERCURY_ACCOUNT_ID` - Mercury checking account ID (destination for invoice payments)
- `INNGEST_EVENT_KEY` - Inngest workflow events key
- `HMAC_SECRET_KEY` - 32-byte hex key for request signing

## 📄 License

Proprietary - All Rights Reserved

## 🤝 Contributing

This is a private repository. For feature requests or bug reports, please open an issue.
