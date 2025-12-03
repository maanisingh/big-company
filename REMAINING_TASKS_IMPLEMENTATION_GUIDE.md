# BIG Company - Remaining Tasks Implementation Guide

## ✅ Completed Tasks (9/25)
1. ✅ Fix URL confusion: consolidate two sites into one domain
2. ✅ Remove 'Don't have account' prompts from login pages
3. ✅ Create Admin Dashboard with user management
4. ✅ Test admin login and account creation API integration
5. ✅ Verify admin can access protected routes and create accounts
6. ✅ Fix admin dashboard stats and list endpoints (SQL errors)
7. ✅ Test admin account creation endpoints
8. ✅ Make categories editable (add/remove functionality)
9. ✅ Restrict credit approval to goods only (no cash withdrawal) - **Already implemented via wallet_loan_separation migration**

---

## 🚀 Quick Implementation Tasks (High Priority)

### Task 10: Remove Cash Payment Option from Checkout
**Files to modify:**
- `/root/big-company/unified-frontend/src/pages/retailer/POSPage.tsx`
- `/root/big-company/storefront/src/app/shop/checkout/page.tsx` (if exists)

**Changes:**
1. Find payment method selection (line ~83): `setPaymentMethod<'wallet' | 'nfc' | 'credit'>`
2. Remove `'cash'` option if present
3. Update payment method radio buttons/options to only show: NFC Card, Wallet, Credit
4. Update daily stats to exclude cash_transactions

**Implementation:**
```tsx
// Remove from payment methods
const [paymentMethod, setPaymentMethod] = useState<'wallet' | 'nfc' | 'credit'>('nfc');

// Remove cash option from UI
<Radio.Group value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
  <Radio value="nfc">NFC Card</Radio>
  <Radio value="wallet">Wallet</Radio>
  <Radio value="credit">Credit</Radio>
  {/* REMOVE: <Radio value="cash">Cash</Radio> */}
</Radio.Group>
```

---

### Task 11-13: BIG Shop Card Payment System
**Goal:** Route all payments through BIG Shop Card with PIN entry

**Database Schema (Already exists in init-db.sql):**
```sql
CREATE TABLE bigcompany.nfc_cards (
    user_id VARCHAR(255) NOT NULL,
    card_uid VARCHAR(100) NOT NULL UNIQUE,
    dashboard_id VARCHAR(50) NOT NULL UNIQUE,
    pin_hash VARCHAR(255),
    is_active BOOLEAN DEFAULT true
);
```

**Backend API to create:**
File: `/root/big-company/medusa-backend/src/api/routes/nfc/index.ts`

Add endpoint:
```typescript
/**
 * POST /store/nfc/pay
 * Process payment with BIG Shop Card
 */
router.post('/pay', async (req, res) => {
  const { card_number, pin, amount, payment_source } = req.body;

  // 1. Verify card exists and is active
  // 2. Verify PIN hash matches
  // 3. Check balance based on payment_source ('wallet' or 'credit')
  // 4. Process payment
  // 5. Deduct from appropriate balance
});
```

**Frontend Changes:**

File: `/root/big-company/unified-frontend/src/pages/retailer/POSPage.tsx`

Add card payment modal:
```tsx
const [cardNumber, setCardNumber] = useState('');
const [pin, setPin] = useState('');
const [useWallet, setUseWallet] = useState(true); // true = wallet, false = credit

// In payment modal
<Modal title="BIG Shop Card Payment">
  <Input
    placeholder="Card Number"
    value={cardNumber}
    onChange={(e) => setCardNumber(e.target.value)}
    maxLength={12}
  />
  <Input.Password
    placeholder="PIN"
    value={pin}
    onChange={(e) => setPin(e.target.value)}
    maxLength={4}
  />
  <Radio.Group value={useWallet} onChange={(e) => setUseWallet(e.target.value)}>
    <Radio value={true}>Pay from Wallet</Radio>
    <Radio value={false}>Pay from Credit</Radio>
  </Radio.Group>
</Modal>
```

---

### Task 14: Restrict Card Issuance to Admin Only
**Files to modify:**
- `/root/big-company/medusa-backend/src/api/routes/admin/index.ts` - Already has NFC endpoints
- Remove any customer-facing card registration endpoints

**Implementation:**
1. Verify `/admin/nfc-cards/register` endpoint exists (lines 1342-1381 in admin/index.ts)
2. Remove or disable any `/store/nfc/register` endpoints
3. Add validation to ensure only admins can create cards

---

### Task 15: Show Only Used Cards in Retailer Portal
**File:** `/root/big-company/unified-frontend/src/pages/retailer/NFCCardsPage.tsx`

**Current query:** Fetches all cards
**Change to:**
```typescript
// Filter cards by last_used_at IS NOT NULL
const response = await retailerApi.get('/nfc-cards?filter=used');
```

**Backend API:**
Add filter to `/retailer/nfc-cards` endpoint to only return cards where `last_used_at IS NOT NULL`

---

### Task 16: Add Meter ID Field for Gas Rewards
**Database:** Table already exists in init-db.sql
```sql
CREATE TABLE bigcompany.utility_meters (
    user_id VARCHAR(255) NOT NULL,
    meter_type VARCHAR(50) DEFAULT 'gas',
    meter_number VARCHAR(100) NOT NULL
);
```

**Frontend Changes:**
File: `/root/big-company/unified-frontend/src/pages/consumer/WalletPage.tsx`

Add gas rewards section:
```tsx
<Form.Item label="Gas Meter ID">
  <Input
    placeholder="Enter meter number"
    disabled={!isPaidFromWallet} // Only enable for wallet payments, not loans
  />
</Form.Item>
```

**Validation:** Only allow meter ID entry when `payment_source === 'wallet'` (not loan balance)

---

### Task 17: Remove Branch from Retailer Dashboard
**File:** `/root/big-company/unified-frontend/src/pages/retailer/RetailerDashboard.tsx`

**Changes:**
1. Search for "branch" references
2. Remove branch selector/display
3. Remove BranchesPage.tsx from routes
4. Update AppLayout.tsx to remove branch menu item

```tsx
// REMOVE from App.tsx:
<Route path="branches" element={<BranchesPage />} />

// REMOVE from AppLayout.tsx menu items:
{ key: 'branches', icon: <ApartmentOutlined />, label: 'Branches', path: '/retailer/branches' }
```

---

## 📊 Complex Implementation Tasks

### Task 18-19: Ledger System with Company Payment Flow
**Database Migration needed:** Create new table

```sql
CREATE TABLE bigcompany.company_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_type VARCHAR(30) CHECK (transaction_type IN (
    'retailer_sale',      -- 60% to retailer
    'company_commission', -- 28% to company
    'gas_rewards_pool',   -- 12% to gas rewards
    'wholesaler_payment',
    'platform_fee'
  )),
  amount DECIMAL(15, 2) NOT NULL,
  from_user_id UUID,
  to_user_id UUID,
  reference_id UUID,
  reference_type VARCHAR(30),
  percentage DECIMAL(5, 2),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE bigcompany.retailer_earnings_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  retailer_id UUID NOT NULL,
  transaction_type VARCHAR(20) CHECK (transaction_type IN ('earning', 'withdrawal', 'credit_approval')),
  amount DECIMAL(15, 2) NOT NULL,
  balance_after DECIMAL(15, 2) NOT NULL,
  reference_id UUID,
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

**Implementation:**
Every sale should trigger 3 transactions:
1. 60% → Retailer earnings (debit)
2. 28% → Company account (credit)
3. 12% → Gas rewards pool (credit)

---

### Task 20: Add Profit Margin Filters
**File:** `/root/big-company/unified-frontend/src/pages/retailer/InventoryPage.tsx`

**Add filters:**
```tsx
<DatePicker.RangePicker
  onChange={(dates) => setProfitDateRange(dates)}
  placeholder={['Start Date', 'End Date']}
/>

<Select placeholder="Time Period">
  <Option value="daily">Daily</Option>
  <Option value="weekly">Weekly</Option>
  <Option value="monthly">Monthly</Option>
</Select>
```

**Backend API:**
```typescript
// GET /retailer/inventory/profit-analysis
router.get('/profit-analysis', async (req, res) => {
  const { start_date, end_date, period } = req.query;

  // Calculate:
  // profit = selling_price - cost_price
  // margin = (profit / selling_price) * 100
});
```

---

### Task 21: Implement Profit Split
**On every sale transaction:**
```typescript
const totalAmount = cartTotal;
const retailerShare = totalAmount * 0.60;  // 60%
const companyShare = totalAmount * 0.28;   // 28%
const gasRewardShare = totalAmount * 0.12; // 12%

// Record in ledger
await db.query(`
  INSERT INTO bigcompany.company_ledger
  (transaction_type, amount, from_user_id, to_user_id, percentage)
  VALUES
  ('retailer_sale', $1, $2, NULL, 60.00),
  ('company_commission', $3, $2, 'company_account', 28.00),
  ('gas_rewards_pool', $4, $2, 'gas_pool', 12.00)
`, [retailerShare, retailerId, companyShare, gasRewardShare]);
```

---

### Task 22-23: Address Field & Location Filters
**Database Migration:**
```sql
ALTER TABLE customer
ADD COLUMN address JSONB DEFAULT '{}';

-- Add GIS extension for location-based queries
CREATE EXTENSION IF NOT EXISTS postgis;

ALTER TABLE customer
ADD COLUMN location geography(POINT, 4326);

-- Add to merchant_profiles
ALTER TABLE bigcompany.merchant_profiles
ADD COLUMN location geography(POINT, 4326);
```

**Frontend:**
```tsx
<Form.Item label="Address">
  <Input.TextArea
    placeholder="Street address"
    value={address.street}
  />
  <Input placeholder="City" value={address.city} />
  <Input placeholder="Province" value={address.province} />
  <Input placeholder="Postal Code" value={address.postal_code} />
</Form.Item>
```

**API for shop filtering:**
```typescript
// GET /store/retailers/nearby?lat=&lng=&radius=5000
// Returns retailers within 5km radius
```

---

### Task 24: Remove Transfer Button
**File:** `/root/big-company/unified-frontend/src/pages/consumer/WalletPage.tsx`

**Change:**
```tsx
// REMOVE:
<Button icon={<SendOutlined />}>Transfer Money</Button>

// KEEP:
<Button icon={<DollarOutlined />}>Top Up</Button>
```

---

### Task 25: Add Credit Ledger to Customer Portal
**File:** `/root/big-company/unified-frontend/src/pages/consumer/ProfilePage.tsx`

**Add credit history tab:**
```tsx
<Tabs>
  <TabPane tab="Profile" key="profile">...</TabPane>
  <TabPane tab="Credit History" key="credit">
    <List
      dataSource={creditHistory}
      renderItem={(item) => (
        <List.Item>
          <List.Item.Meta
            title={item.description}
            description={`${item.amount} RWF - ${item.date}`}
          />
          <Tag color={item.type === 'approval' ? 'green' : 'red'}>
            {item.type}
          </Tag>
        </List.Item>
      )}
    />
  </TabPane>
</Tabs>
```

**Backend API:**
```typescript
// GET /store/wallet/credit-history
router.get('/credit-history', async (req, res) => {
  const customerId = req.user.customer_id;

  const history = await db.query(`
    SELECT * FROM bigcompany.balance_transactions
    WHERE user_id = $1 AND balance_type = 'loan'
    ORDER BY created_at DESC
  `, [customerId]);

  res.json({ history: history.rows });
});
```

---

## 📝 Implementation Priority

### Phase 1 (Immediate - 1-2 hours):
- ✅ Task 9: Credit restriction (Already done)
- [ ] Task 10: Remove cash payment
- [ ] Task 17: Remove branch from dashboard
- [ ] Task 24: Remove transfer button

### Phase 2 (Short term - 2-4 hours):
- [ ] Task 11-13: BIG Shop Card payment system
- [ ] Task 14: Restrict card issuance
- [ ] Task 15: Show only used cards
- [ ] Task 16: Add meter ID field

### Phase 3 (Medium term - 4-8 hours):
- [ ] Task 18-19: Ledger system
- [ ] Task 20: Profit margin filters
- [ ] Task 21: Profit split implementation
- [ ] Task 25: Credit ledger

### Phase 4 (Long term - 8+ hours):
- [ ] Task 22-23: Address fields & location filters

---

## 🛠️ Quick Start Commands

### Build Backend:
```bash
cd /root/big-company/medusa-backend
npm run build
pm2 restart medusa-backend
```

### Build Frontend:
```bash
cd /root/big-company/unified-frontend
npm run build
pm2 restart unified-frontend
```

### Apply Database Migrations:
```bash
# Connect to database
psql $DATABASE_URL -f migrations/new_migration.sql
```

---

## 📚 Key Files Reference

**Backend:**
- Admin API: `/root/big-company/medusa-backend/src/api/routes/admin/index.ts`
- NFC API: `/root/big-company/medusa-backend/src/api/routes/nfc/index.ts`
- Wallet API: `/root/big-company/medusa-backend/src/api/routes/wallet/index.ts`
- Loans API: `/root/big-company/medusa-backend/src/api/routes/loans/index.ts`

**Frontend:**
- POS Page: `/root/big-company/unified-frontend/src/pages/retailer/POSPage.tsx`
- Wallet Page: `/root/big-company/unified-frontend/src/pages/consumer/WalletPage.tsx`
- NFC Cards: `/root/big-company/unified-frontend/src/pages/retailer/NFCCardsPage.tsx`
- Dashboard: `/root/big-company/unified-frontend/src/pages/retailer/RetailerDashboard.tsx`
- App Routes: `/root/big-company/unified-frontend/src/App.tsx`
- Layout/Menu: `/root/big-company/unified-frontend/src/components/AppLayout.tsx`

**Database:**
- Init Schema: `/root/big-company/medusa-backend/init-db.sql`
- Wallet/Loan Separation: `/root/big-company/medusa-backend/migrations/004_wallet_loan_separation.sql`
- Categories: `/root/big-company/medusa-backend/migrations/003_categories_management.sql`

---

## ✨ Open Source Tools Being Used

1. **Medusa.js** - Headless commerce platform
2. **PostgreSQL** - Database with PostGIS for location features
3. **Blnk Ledger** - Double-entry bookkeeping for financial transactions
4. **React + Ant Design** - Frontend UI framework
5. **Express.js** - Backend API framework
6. **PM2** - Process manager for Node.js
7. **Prisma/Raw SQL** - Database ORM and queries

---

**Status:** 9/25 tasks completed (36%)
**Next Steps:** Continue with Phase 1 tasks for immediate deployment
