# Customer Portal Implementation Requirements

**Project:** Big Company - Customer Portal
**Date:** 2025-12-05
**Status:** Implementation Required

---

## 1. Credit and Wallet Features

### 1.1 Request Loan (NEEDS UPDATE)
**Current:** Basic loan request with amount only
**Required:**
- Add payment frequency field: Daily or Weekly
- Update loan request modal to include:
  ```typescript
  interface LoanRequest {
    amount: number;
    repaymentFrequency: 'daily' | 'weekly'; // NEW FIELD
    productId: string;
  }
  ```

**File:** `/storefront/src/app/wallet/page.tsx` (Request Loan Modal - line 428)

**Changes:**
1. Add radio buttons for Daily/Weekly payment frequency
2. Update API call to include `repaymentFrequency`
3. Display repayment schedule preview based on frequency

---

### 1.2 Credit Ledger (NEW PAGE REQUIRED)
**Location:** `/storefront/src/app/loans/ledger/page.tsx` (CREATE NEW)

**Features:**
- Payment Status: Show date loan was given (disbursement date)
- Next Payment: Show deadline date for next payment
- "Pay Loan" button with two options:
  - Pay from Dashboard Balance
  - Pay via Mobile Money
- Display current outstanding balance
- Show repayment schedule (daily or weekly)

**UI Layout:**
```
┌─────────────────────────────────────┐
│ Active Loan #12345                  │
│ Outstanding: 50,000 RWF             │
│─────────────────────────────────────│
│ Payment Status: Dec 1, 2025         │
│ Next Payment Due: Dec 8, 2025       │
│─────────────────────────────────────│
│ [Pay from Balance] [Mobile Money]   │
└─────────────────────────────────────┘
```

---

### 1.3 Credit Transactions (NEW PAGE REQUIRED)
**Location:** `/storefront/src/app/loans/transactions/page.tsx` (CREATE NEW)

**Features:**
- Show loan disbursement history
- Show credit payment history
- Include physical store orders paid by card on credit
- Filter by type: All | Loans Given | Payments Made | Card Credit Orders

**Transaction Types:**
1. **Loan Given** - When loan is disbursed
2. **Credit Paid** - When payment is made
3. **Card Credit Order** - Orders from physical store paid on credit

---

### 1.4 Orders Paid on Credit
**Requirement:** All orders paid on credit in physical store by Card should be located under "orders paid by credit"

**Implementation:**
- Add filter to `/orders` page for credit orders
- New tab/section: "Credit Orders"
- Show orders where `payment_method = 'card_credit'`

---

## 2. My NFC Cards (UPDATE REQUIRED)

**File:** `/storefront/src/app/cards/page.tsx`

**Current:** Basic card listing
**Required:** Add comprehensive order history for each card

**Features to Add:**
1. Card ID display
2. Order ID for each purchase made with card
3. Order amount
4. Shop name where order was placed
5. Invoice view option for each order

**UI Layout:**
```
┌─────────────────────────────────────┐
│ NFC Card #1234-5678                 │
│─────────────────────────────────────│
│ Order History:                      │
│ ┌─────────────────────────────────┐ │
│ │ Order #ORD-001                  │ │
│ │ Shop: Main Street Store         │ │
│ │ Amount: 15,000 RWF              │ │
│ │ Date: Dec 5, 2025               │ │
│ │ [View Invoice]                  │ │
│ └─────────────────────────────────┘ │
│ ...more orders...                   │
└─────────────────────────────────────┘
```

---

## 3. Gas Top-up Features

### 3.1 Add Meter (UPDATE REQUIRED)
**File:** `/storefront/src/app/gas/page.tsx`

**Current:** Manual entry for all fields
**Required:** Auto-fill from API

**Manual Input:**
- Meter ID (user enters)
- Nickname (user enters)

**Auto-filled from Gas Management API:**
- Owner Full Name
- Owner ID Number
- Phone Number

**API Integration:**
```typescript
// When user enters meter ID:
const meterInfo = await fetch(`/api/gas/meter-info/${meterId}`);
// Returns:
{
  owner_full_name: string;
  owner_id_number: string;
  phone_number: string;
  // Auto-populate these fields
}
```

---

### 3.2 Buy Gas (UPDATE REQUIRED)
**File:** `/storefront/src/app/gas/page.tsx`

**Changes Required:**
1. **Minimum Amount:** Set minimum to 300 RWF (currently no minimum)
2. **Remove Meter ID Dropdown:** For gas reward purchases
   - This option should ONLY be available in shop sales
   - Customer portal: Only allow purchase for pre-registered meters
3. **Add validation:**
   ```typescript
   if (amount < 300) {
     alert('Minimum purchase amount is 300 RWF');
     return;
   }
   ```

---

## 4. Rewards Dashboard (MAJOR UPDATE)

**File:** `/storefront/src/app/rewards/page.tsx`

**Current:** Shows tiers, overview, and history
**Required:** Remove tiers completely

**Keep:**
- Overview section
- History section

**Remove:**
- Current tier display
- Tier progression
- Tier benefits section
- "Upgrade to next tier" section

**New Structure:**
```
┌─────────────────────────────────────┐
│ Rewards Overview                    │
│ Total Points: 1,250                 │
│ Available: 1,000                    │
│ Pending: 250                        │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│ Rewards History                     │
│ - Dec 5: Earned 100 points          │
│ - Dec 4: Redeemed 50 points         │
│ - Dec 3: Earned 200 points          │
└─────────────────────────────────────┘
```

---

## 5. Mobile Navigation Update

**File:** `/storefront/src/components/MobileNav.tsx` or `/storefront/src/app/layout.tsx`

**Change:**
- **Remove:** Rewards button at bottom navigation
- **Replace with:** My Orders button

**Current Bottom Nav:**
```
[ Home ] [ Shop ] [ Rewards ] [ Profile ]
```

**New Bottom Nav:**
```
[ Home ] [ Shop ] [ My Orders ] [ Profile ]
```

---

## 6. Customer Self-Registration

**Files:**
- `/storefront/src/app/auth/login/page.tsx`
- `/storefront/src/app/auth/register/page.tsx` (CREATE IF NEEDED)

**Requirement:** "customers should sign in then create account themselves when they login for first time …only on customer"

**Implementation:**
1. On login page, add "First time? Create Account" link
2. Customer clicks login → If no account exists, redirect to registration
3. Registration flow:
   ```
   Login Page → Check if user exists
   ↓ (if not exists)
   Registration Page → Create account → Login automatically
   ```

**Registration should be ONLY for customers (not retailers/wholesalers)**

---

## Implementation Priority

### Phase 1 (High Priority)
1. ✅ Update Loan Request - add daily/weekly payment option
2. ✅ Create Credit Ledger page with pay loan functionality
3. ✅ Update Gas Buy - set 300 RWF minimum, remove meter dropdown
4. ✅ Update Rewards - remove tiers

### Phase 2 (Medium Priority)
5. ✅ Create Credit Transactions history page
6. ✅ Update NFC Cards - add order history with invoice view
7. ✅ Update Mobile Nav - replace rewards with orders
8. ✅ Add credit orders to orders page

### Phase 3 (Lower Priority)
9. ✅ Update Add Meter - implement API auto-fill
10. ✅ Implement customer self-registration flow

---

## API Endpoints Required

### New/Updated Backend Endpoints:

1. **Loan Request (Update):**
   ```
   POST /api/customers/loans/request
   Body: { amount, productId, repaymentFrequency: 'daily' | 'weekly' }
   ```

2. **Pay Loan (New):**
   ```
   POST /api/customers/loans/{loanId}/pay
   Body: { amount, paymentMethod: 'dashboard' | 'mobile_money' }
   ```

3. **Credit Transactions (New):**
   ```
   GET /api/customers/credit/transactions
   Returns: [{ type, amount, date, description }]
   ```

4. **Card Order History (New):**
   ```
   GET /api/customers/cards/{cardId}/orders
   Returns: [{ orderId, shopName, amount, date, invoiceUrl }]
   ```

5. **Gas Meter Info (New):**
   ```
   GET /api/gas/meter-info/{meterId}
   Returns: { owner_full_name, owner_id_number, phone_number }
   ```

6. **Credit Orders (Update):**
   ```
   GET /api/customers/orders?paymentType=credit
   Returns: Orders paid on credit (card or loan)
   ```

---

## Files to Create/Update

### Create New:
1. `/storefront/src/app/loans/ledger/page.tsx` - Credit Ledger
2. `/storefront/src/app/loans/transactions/page.tsx` - Credit Transactions
3. `/storefront/src/app/auth/register/page.tsx` - Self-registration (if doesn't exist)

### Update Existing:
1. `/storefront/src/app/wallet/page.tsx` - Add repayment frequency to loan request
2. `/storefront/src/app/loans/page.tsx` - Update to show payment frequency
3. `/storefront/src/app/cards/page.tsx` - Add order history per card
4. `/storefront/src/app/gas/page.tsx` - Auto-fill meter info, 300 RWF minimum
5. `/storefront/src/app/rewards/page.tsx` - Remove tiers
6. `/storefront/src/app/orders/page.tsx` - Add credit orders filter
7. `/storefront/src/components/MobileNav.tsx` - Replace rewards with orders
8. `/storefront/src/app/auth/login/page.tsx` - Add registration link

---

## Testing Checklist

- [ ] Loan request includes daily/weekly option
- [ ] Credit ledger shows payment status and due dates
- [ ] Pay loan button works with dashboard balance
- [ ] Pay loan button works with mobile money
- [ ] Credit transactions show all types correctly
- [ ] Card orders display with shop name and invoice
- [ ] Gas meter auto-fills owner information
- [ ] Gas purchase enforces 300 RWF minimum
- [ ] Rewards page shows overview and history only (no tiers)
- [ ] Mobile nav has "My Orders" instead of "Rewards"
- [ ] Customer can self-register on first login
- [ ] Credit orders appear in orders list

---

**Next Steps:**
1. Review this document with the team
2. Create backend API endpoints listed above
3. Implement frontend changes in priority order
4. Test each feature thoroughly
5. Deploy to staging for user acceptance testing

