# BIG Company - Rwanda E-Commerce & Fintech Platform

A comprehensive multi-tenant e-commerce and fintech platform for Rwanda, featuring customer web app, retailer POS, wholesaler B2B, USSD support, and mobile money integration.

## Project Status: In Development

### What's Built
- [x] Medusa backend with marketplace plugin
- [x] Blnk Finance wallet/ledger integration
- [x] Next.js customer storefront
- [x] Refine.dev retailer dashboard
- [x] Refine.dev wholesaler dashboard
- [x] BullMQ job workers for payments/SMS
- [x] USSD handler for Africa's Talking
- [x] Loans module
- [x] Docker Compose orchestration

### What Needs To Be Done

#### End-Customer Web App
- [ ] Account creation with phone number, OTP verification
- [ ] Dashboard balance setup (MTN MoMo / Airtel Money top-up)
- [ ] Shopping from retailers (find nearby shops, view inventory, checkout)
- [ ] Gas meter top-up (predefined amounts: 300, 500, 1000, 2000, 5000, 10000 RWF)
- [ ] Shop card integration (NFC card linked to dashboard)
- [ ] Loan request and usage (food loans with restrictions)
- [ ] Gas reward tracking (12% of profit >= 1000 RWF)
- [ ] Order management and tracking

#### USSD Support (*939# > 6. BIG Company)
- [ ] Top up shop card via USSD
- [ ] Buy gas via USSD
- [ ] Mobile money payment integration

#### Physical Card (NFC)
- [ ] Card UID linking to web app
- [ ] POS tap-to-pay functionality
- [ ] Balance deduction from dashboard or trigger MoMo push

#### Retailer Dashboard
- [ ] Complete stock/inventory management with alerts
- [ ] Online customer order management
- [ ] Credit order approval for food loans
- [ ] Sales & earnings tracking (net payout after taxes/commissions)
- [ ] Performance metrics and analytics

#### Wholesaler Dashboard
- [ ] Stock management with SKUs, expiry dates
- [ ] Retailer order management and credit approval
- [ ] Stock movement tracking
- [ ] Performance monitoring per retailer
- [ ] Demand forecasting and price adjustment tools

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        CUSTOMER LAYER                           │
├─────────────────┬─────────────────┬─────────────────────────────┤
│   Web App       │   USSD (*939#)  │   Physical Card (NFC)       │
│   (Next.js)     │   Africa's      │   POS Integration           │
│                 │   Talking       │                             │
└────────┬────────┴────────┬────────┴──────────────┬──────────────┘
         │                 │                       │
         ▼                 ▼                       ▼
┌─────────────────────────────────────────────────────────────────┐
│                      MEDUSA BACKEND                             │
│  - Product Catalog    - Order Management    - User Auth         │
│  - Marketplace Plugin - Payment Webhooks    - API Routes        │
└────────┬────────────────────────────────────────┬───────────────┘
         │                                        │
         ▼                                        ▼
┌─────────────────────────┐    ┌─────────────────────────────────┐
│     BLNK FINANCE        │    │        BULLMQ WORKERS           │
│  - Wallet Ledger        │    │  - Payment Processing           │
│  - Transaction History  │    │  - SMS Notifications            │
│  - Balance Management   │    │  - Loan Processing              │
│                         │    │  - Gas Top-up                   │
└─────────────────────────┘    │  - Credit Management            │
                               └─────────────────────────────────┘
         │                                        │
         ▼                                        ▼
┌─────────────────────────┐    ┌─────────────────────────────────┐
│      PAYMENT GATEWAYS   │    │      EXTERNAL SERVICES          │
│  - MTN MoMo             │    │  - Africa's Talking (SMS/USSD)  │
│  - Airtel Money         │    │  - Gas Meter API                │
└─────────────────────────┘    └─────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                     ADMIN DASHBOARDS                            │
├─────────────────────────────────┬───────────────────────────────┤
│      Retailer Dashboard         │     Wholesaler Dashboard      │
│      (Refine.dev + Ant Design)  │     (Refine.dev + Ant Design) │
│  - POS System                   │  - B2B Order Management       │
│  - Inventory Management         │  - Retailer Management        │
│  - Order Fulfillment            │  - Stock Distribution         │
│  - Credit Approval              │  - Credit Approval            │
└─────────────────────────────────┴───────────────────────────────┘
```

## Tech Stack

| Component | Technology |
|-----------|------------|
| Backend | Medusa 2.0 |
| Wallet/Ledger | Blnk Finance |
| Customer Frontend | Next.js 14, TailwindCSS |
| Admin Dashboards | Refine.dev, Ant Design |
| Job Queue | BullMQ |
| Database | PostgreSQL 15 |
| Cache | Redis 7 |
| SMS/USSD | Africa's Talking |
| Payments | MTN MoMo, Airtel Money |
| Container | Docker Compose |

## Directory Structure

```
big-company/
├── medusa-backend/          # Medusa e-commerce backend
│   ├── src/
│   │   ├── api/            # API routes (wallet, gas, loans, ussd, nfc)
│   │   ├── jobs/           # BullMQ workers
│   │   └── services/       # Blnk, SMS services
│   └── Dockerfile
├── storefront/              # Customer web app (Next.js)
│   ├── src/
│   │   ├── app/            # Pages (wallet, gas, loans, cards)
│   │   ├── components/     # UI components
│   │   └── lib/            # API client, state management
│   └── Dockerfile
├── retailer-dashboard/      # Retailer admin (Refine.dev)
│   ├── src/
│   │   └── pages/          # Dashboard, POS, inventory, orders, credit
│   └── Dockerfile
├── wholesaler-dashboard/    # Wholesaler admin (Refine.dev)
│   ├── src/
│   │   └── pages/          # Dashboard, inventory, orders, retailers, credit
│   └── Dockerfile
├── docker-compose.yml       # Container orchestration
├── init-db.sql             # Database initialization
└── blnk.json               # Blnk Finance config
```

## Environment Variables

```env
# Database
DATABASE_URL=postgres://bigcompany:password@postgres:5432/bigcompany

# Redis
REDIS_URL=redis://redis:6379

# Blnk Finance
BLNK_API_URL=http://blnk:5001

# Africa's Talking
AT_API_KEY=your_api_key
AT_USERNAME=your_username
AT_SHORTCODE=939

# MTN MoMo
MOMO_API_KEY=your_api_key
MOMO_API_USER=your_user_id
MOMO_ENVIRONMENT=sandbox

# Airtel Money
AIRTEL_CLIENT_ID=your_client_id
AIRTEL_CLIENT_SECRET=your_secret
```

## Quick Start

```bash
# Start all services
docker-compose up -d

# Services will be available at:
# - Storefront: http://localhost:3010
# - Retailer Dashboard: http://localhost:3011
# - Wholesaler Dashboard: http://localhost:3012
# - Medusa API: http://localhost:9000
# - Blnk Finance: http://localhost:5001
```

## Payment Flow

1. **Top-up**: Customer initiates MoMo/Airtel payment -> Webhook received -> Blnk ledger updated
2. **Purchase**: Customer checkout -> Verify balance in Blnk -> Deduct from ledger -> Update retailer stock
3. **Gas**: Customer selects amount -> Payment processed -> Gas API called -> Units delivered to meter
4. **Loan**: Admin approves -> Credit added to Blnk ledger (restricted) -> Auto-recovery from future transactions

## License

Proprietary - BIG Company Rwanda
