# BIG Company - Railway Deployment Guide

## Services Overview

Deploy the following services on Railway:

### 1. PostgreSQL (Railway Native)
- Use Railway's built-in PostgreSQL plugin
- Database name: `bigcompany`
- Run init-db.sql after creation

### 2. Redis (Railway Native)
- Use Railway's built-in Redis plugin

### 3. Medusa Backend
- **Source**: `/medusa-backend`
- **Build Command**: `npm install && npm run build`
- **Start Command**: `npm start`
- **Environment Variables**:
  ```
  DATABASE_URL=${{Postgres.DATABASE_URL}}
  REDIS_URL=${{Redis.REDIS_URL}}
  JWT_SECRET=<generate-secure-secret>
  COOKIE_SECRET=<generate-secure-secret>
  STORE_CORS=https://storefront.${{RAILWAY_PROJECT_NAME}}.railway.app
  ADMIN_CORS=https://retailer.${{RAILWAY_PROJECT_NAME}}.railway.app,https://wholesaler.${{RAILWAY_PROJECT_NAME}}.railway.app
  BLNK_URL=https://blnk.${{RAILWAY_PROJECT_NAME}}.railway.app
  AFRICASTALKING_API_KEY=<from-dashboard>
  AFRICASTALKING_USERNAME=<from-dashboard>
  ```

### 4. Blnk Finance
- **Docker Image**: `jerryenebeli/blnk:latest`
- **Environment Variables**:
  ```
  BLNK_SECRET_KEY=<generate-secure-secret>
  DATABASE_URL=${{Postgres.DATABASE_URL}}
  REDIS_URL=${{Redis.REDIS_URL}}
  ```

### 5. n8n Workflow Engine
- **Docker Image**: `n8nio/n8n`
- **Environment Variables**:
  ```
  N8N_BASIC_AUTH_ACTIVE=true
  N8N_BASIC_AUTH_USER=admin
  N8N_BASIC_AUTH_PASSWORD=<secure-password>
  DB_TYPE=postgresdb
  DB_POSTGRESDB_DATABASE=n8n
  DB_POSTGRESDB_HOST=${{Postgres.PGHOST}}
  DB_POSTGRESDB_PORT=${{Postgres.PGPORT}}
  DB_POSTGRESDB_USER=${{Postgres.PGUSER}}
  DB_POSTGRESDB_PASSWORD=${{Postgres.PGPASSWORD}}
  MEDUSA_URL=https://api.${{RAILWAY_PROJECT_NAME}}.railway.app
  BLNK_URL=https://blnk.${{RAILWAY_PROJECT_NAME}}.railway.app
  AFRICASTALKING_API_KEY=<from-dashboard>
  AFRICASTALKING_USERNAME=<from-dashboard>
  ```
- After deployment, import workflows from `/n8n-workflows/`

### 6. Customer Storefront (Next.js)
- **Source**: `/storefront`
- **Build Command**: `npm install && npm run build`
- **Start Command**: `npm start`
- **Environment Variables**:
  ```
  NEXT_PUBLIC_MEDUSA_BACKEND_URL=https://api.${{RAILWAY_PROJECT_NAME}}.railway.app
  ```

### 7. Retailer Dashboard
- **Source**: `/retailer-dashboard`
- **Build Command**: `npm install && npm run build`
- **Start Command**: `npx serve -s dist -l 3001`
- **Environment Variables**:
  ```
  VITE_MEDUSA_BACKEND_URL=https://api.${{RAILWAY_PROJECT_NAME}}.railway.app
  ```

### 8. Wholesaler Dashboard
- **Source**: `/wholesaler-dashboard`
- **Build Command**: `npm install && npm run build`
- **Start Command**: `npx serve -s dist -l 3002`
- **Environment Variables**:
  ```
  VITE_MEDUSA_BACKEND_URL=https://api.${{RAILWAY_PROJECT_NAME}}.railway.app
  ```

## Custom Domains (Recommended)

Configure these domains after deployment:

| Service | Subdomain |
|---------|-----------|
| Medusa API | api.big.rw |
| Storefront | www.big.rw / big.rw |
| Retailer Dashboard | retailer.big.rw |
| Wholesaler Dashboard | wholesaler.big.rw |
| n8n | workflows.big.rw |

## Deployment Order

1. Deploy PostgreSQL and Redis first
2. Run `init-db.sql` on PostgreSQL
3. Deploy Blnk Finance
4. Deploy Medusa Backend
5. Deploy n8n and import workflows
6. Deploy frontend apps (storefront, dashboards)

## Post-Deployment Setup

### 1. Configure Africa's Talking
- Set USSD callback URL: `https://api.big.rw/ussd`
- Set SMS callback URL (optional): `https://api.big.rw/sms/callback`

### 2. Configure Payment Webhooks
- MTN MoMo callback: `https://workflows.big.rw/webhook/momo-callback`
- Airtel Money callback: `https://workflows.big.rw/webhook/airtel-callback`

### 3. Initialize Blnk Ledgers
Run this after Blnk is deployed:
```bash
# Create main ledgers
curl -X POST https://blnk.big.rw/ledgers \
  -H "Content-Type: application/json" \
  -d '{"name": "customer_wallets"}'

curl -X POST https://blnk.big.rw/ledgers \
  -H "Content-Type: application/json" \
  -d '{"name": "loans_ledger"}'

curl -X POST https://blnk.big.rw/ledgers \
  -H "Content-Type: application/json" \
  -d '{"name": "gas_rewards"}'
```

## Scaling Recommendations

| Service | Initial | Growth |
|---------|---------|--------|
| PostgreSQL | Starter | Pro (when >10k users) |
| Redis | Starter | Pro (for high traffic) |
| Medusa | 1 replica | 2-3 replicas |
| Storefronts | 1 replica each | 2 replicas |

## Monitoring

- Enable Railway's built-in metrics
- Set up alerts for:
  - Database connection limits
  - Memory usage > 80%
  - Error rate spikes
