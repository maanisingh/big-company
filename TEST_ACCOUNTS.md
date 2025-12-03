# Test Accounts for BigCompany Platform

This document contains test account credentials for all user types in the BigCompany platform.

## Admin Account

**Admin Portal**: https://bigcompany.alexandratechlab.com/admin

**Credentials:**
- Email: `admin@bigcompany.rw`
- Password: `admin123`

**Capabilities:**
- Full platform management
- View all endpoints and reports
- Create retailer/wholesaler accounts
- Manage NFC cards, loans, categories
- Access dashboard with platform statistics

---

## Consumer Account (Store)

**Store Portal**: https://bigcompany.alexandratechlab.com/

**Credentials:**
- Phone: `0788123456` (or `250788123456`)
- PIN: `1234`

**Capabilities:**
- Browse and purchase products
- Manage wallet
- View transaction history
- NFC card payments
- Gas purchases

**API Endpoints:**
- Login: `POST /store/auth/login`
- Registration flow: `/store/auth/send-otp` → `/store/auth/verify-otp` → `/store/auth/register`

---

## Retailer Account

**Test Retailer Created:**
- Email: `test.retailer@example.com`
- Business: Test Retailer Business
- Phone: `+250788123456`
- Location: Kigali, Rwanda
- Credit Limit: 100,000 RWF

**Capabilities:**
- POS system for sales
- Inventory management
- Credit management
- Customer management

---

## Wholesaler Account

**Test Wholesaler Created:**
- Email: `test.wholesaler2@example.com`
- Company: Test Wholesaler Company
- Phone: `+250788654322`
- Location: Kigali, Rwanda

**Capabilities:**
- Bulk sales to retailers
- Inventory management
- Credit terms management
- Order management

---

## API Endpoints Status

All endpoints are operational and returning 200 status codes:

### Admin Endpoints
- ✅ GET `/admin/dashboard` - Platform statistics
- ✅ GET `/admin/categories` - Product categories
- ✅ GET `/admin/reports` - Summary reports
- ✅ GET `/admin/reports/revenue` - Revenue reports
- ✅ GET `/admin/reports/transactions` - Transaction reports
- ✅ GET `/admin/nfc-cards` - NFC card management
- ✅ GET `/admin/retailers` - Retailer list
- ✅ GET `/admin/wholesalers` - Wholesaler list
- ✅ GET `/admin/loans` - Loan management
- ✅ POST `/admin/accounts/create-retailer` - Create retailer
- ✅ POST `/admin/accounts/create-wholesaler` - Create wholesaler
- ✅ POST `/admin/categories` - Create category

### Store/Consumer Endpoints
- ✅ POST `/store/auth/login` - Consumer login
- ✅ POST `/store/auth/send-otp` - Send OTP for registration
- ✅ POST `/store/auth/verify-otp` - Verify OTP
- ✅ POST `/store/auth/register` - Complete registration

---

## Recent Fixes (December 3, 2025)

### Backend Fixes
1. **Categories Endpoint** - Fixed 500 error by correcting table reference from `bigcompany.product_categories` to `product_category`
2. **Reports Authentication** - Added authentication middleware to `/admin/reports` endpoint
3. **Category CRUD** - Fixed all category operations with proper ID generation and required fields

### Frontend Fixes
1. **AccountManagementPage** - Added null-safety for status field
2. **RetailerManagementPage** - Fixed undefined credit_limit and current_balance
3. **WholesalerManagementPage** - Fixed undefined number values
4. **ReportsPage** - Added safe handling for all summary statistics

---

## Creating Additional Test Accounts

### To Create a Consumer:
```bash
# Calculate PIN hash
node -e "
const crypto = require('crypto');
const pin = 'YOUR_PIN';
const secret = 'bigcompany_pin_secret';
const hash = crypto.createHash('sha256').update(pin + secret).digest('hex');
console.log('PIN Hash:', hash);
"

# Then insert into database
PGPASSWORD="bigcompany_password" psql -U bigcompany_user -h localhost -p 5435 -d bigcompany << SQL
INSERT INTO customer (id, email, first_name, last_name, phone, has_account, metadata)
VALUES ('YOUR_ID', 'email@example.com', 'First', 'Last', '250788XXXXXX', true,
  '{"pin_hash": "YOUR_HASH", "phone": "250788XXXXXX"}'::jsonb);
SQL
```

### To Create a Retailer (via API):
```bash
curl -X POST https://bigcompany-api.alexandratechlab.com/admin/accounts/create-retailer \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "retailer@example.com",
    "password": "password123",
    "business_name": "Business Name",
    "phone": "+250788XXXXXX",
    "address": "Kigali, Rwanda",
    "credit_limit": 100000
  }'
```

---

## Notes

- All passwords and PINs shown here are for **testing purposes only**
- **Do not use these credentials in production**
- Change all default passwords before going live
- The admin account is hardcoded in `/src/api/routes/admin/index.ts`
- Consumer PINs are hashed with SHA256 + secret salt
