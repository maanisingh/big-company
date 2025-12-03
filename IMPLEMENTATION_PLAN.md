# BIG Company - Comprehensive Implementation Plan

**Date:** December 2, 2025
**Status:** Planning Phase
**Total Features:** 21 major changes

---

## Overview

This document outlines the complete implementation plan for the BIG Company platform enhancements, focusing on admin controls, payment systems, profit distribution, and retailer/customer workflows.

---

## 0️⃣ Admin Dashboard

### Requirements
- Admin portal for managing platform
- Create accounts for retailers and wholesalers
- Issue BIG Shop Cards
- Manage categories
- View platform analytics

### Implementation
- [ ] Create admin login page
- [ ] Build admin dashboard UI
- [ ] Add user management module (create retailer/wholesaler accounts)
- [ ] Add card issuance module
- [ ] Add category management module
- [ ] Add analytics dashboard

**Priority:** 🔴 HIGH
**Estimated Time:** 3-4 days

---

## 1️⃣ Remove "Don't Have Account" Prompts

### Requirements
- Remove registration links from login pages
- Only admin can create retailer/wholesaler accounts
- Customers can still self-register

### Implementation
- [x] Update consumer-login.html
- [x] Update retailer-login.html
- [x] Update wholesaler-login.html

**Priority:** 🟢 LOW
**Estimated Time:** 10 minutes

---

## 2️⃣ Admin-Only Account Creation

### Requirements
- Retailers and wholesalers created by admin only
- Customers can self-register through mobile app/website
- Admin assigns credentials and settings

### Implementation
- [ ] Create admin user creation forms
- [ ] Disable public retailer/wholesaler registration
- [ ] Send welcome emails with credentials
- [ ] Add initial setup wizard for new users

**Priority:** 🔴 HIGH
**Estimated Time:** 1 day

---

## 3️⃣ Wholesaler Dashboard

### Status
✅ No changes needed

---

## 4️⃣ Editable Categories

### Requirements
- Admin can add new product categories
- Admin can edit existing categories
- Admin can remove/archive categories
- Categories sync across all portals

### Implementation
- [ ] Create category CRUD API endpoints
- [ ] Build admin category management UI
- [ ] Add category validation
- [ ] Implement category archiving (soft delete)
- [ ] Update product forms to use dynamic categories

**Priority:** 🟡 MEDIUM
**Estimated Time:** 1 day

---

## 5️⃣ Retailer Dashboard

### Status
✅ No changes needed (except items listed separately)

---

## 6️⃣ Credit Approval - Goods Only

### Requirements
- Credit from wholesaler can ONLY be used to purchase goods
- Credit cannot be withdrawn as cash
- Credit balance tracked separately from wallet balance
- Orders must use credit if available

### Implementation
- [ ] Add `credit_type` field (GOODS_ONLY, GENERAL)
- [ ] Restrict withdrawal API to check credit type
- [ ] Update checkout to prioritize credit for goods
- [ ] Add validation to prevent cash withdrawal from goods credit
- [ ] Display clear messaging about credit restrictions

**Priority:** 🔴 HIGH
**Estimated Time:** 2 days

---

## 8️⃣ Remove Cash Payment Option

### Requirements
- Remove "Cash" as payment option in checkout
- All payments must go through:
  - BIG Shop Card
  - Wallet Balance
  - Credit Balance

### Implementation
- [ ] Remove cash option from checkout UI
- [ ] Update payment API to reject cash payments
- [ ] Update order flow documentation

**Priority:** 🟡 MEDIUM
**Estimated Time:** 2 hours

---

## 9️⃣ BIG Shop Card - Manual Entry

### Requirements
- Retailer can enter customer's card number and PIN
- Used when customer is not physically present
- Validates card and processes payment
- Records transaction under customer's account

### Implementation
- [ ] Create card entry form in retailer checkout
- [ ] Add card number + PIN validation API
- [ ] Process payment through BIG Shop Card system
- [ ] Link transaction to customer account
- [ ] Add security measures (rate limiting, encryption)

**Priority:** 🔴 HIGH
**Estimated Time:** 2 days

---

## 🔟 Wallet/Credit Options with BIG Shop Card

### Requirements
- When retailer selects BIG Shop Card, show additional options:
  - Pay with Customer Wallet
  - Pay with Customer Credit
  - Pay with Card Balance
- Customer chooses payment source

### Implementation
- [ ] Update checkout UI to show payment source options
- [ ] Add payment source selection API
- [ ] Update payment processing to handle different sources
- [ ] Show customer's available balances

**Priority:** 🟡 MEDIUM
**Estimated Time:** 1 day

---

## 1️⃣1️⃣ All Payments Through BIG Shop Card

### Requirements
- Every transaction must be processed through BIG Shop Card system
- BIG Shop Card acts as payment gateway
- Supports multiple funding sources (wallet, credit, card balance)

### Implementation
- [ ] Create unified payment processing service
- [ ] Route all payments through BIG Shop Card API
- [ ] Add transaction logging
- [ ] Implement reconciliation system

**Priority:** 🔴 HIGH
**Estimated Time:** 3 days

---

## 1️⃣2️⃣ Admin-Only Card Issuance

### Requirements
- Only admin can issue new BIG Shop Cards
- Retailers cannot issue cards
- Admin sets card limits and permissions
- Cards linked to customer accounts

### Implementation
- [ ] Remove card issuance from retailer portal
- [ ] Create admin card issuance module
- [ ] Add card request workflow (optional)
- [ ] Implement card activation process

**Priority:** 🟡 MEDIUM
**Estimated Time:** 1 day

---

## 1️⃣3️⃣ Retailer Portal - Show Used Cards Only

### Requirements
- Retailer sees only cards that have been used in their shop
- Cards shown with customer name and last 4 digits
- Transaction history for each card
- Privacy protection for other retailers' data

### Implementation
- [ ] Filter cards by retailer_id in transactions
- [ ] Update card list API with retailer filter
- [ ] Show card usage statistics
- [ ] Add transaction history per card

**Priority:** 🟡 MEDIUM
**Estimated Time:** 1 day

---

## 1️⃣4️⃣ Gas Rewards with Meter ID

### Requirements
- **Wallet payments:** Customer must enter meter ID to receive gas rewards
- **Credit/Loan payments:** No meter ID needed, no gas rewards given
- Gas reward = profit percentage set by admin
- Meter ID validated before processing

### Implementation
- [ ] Add meter_id field to payment flow
- [ ] Conditional field: show only for wallet payments
- [ ] Calculate gas reward based on profit percentage
- [ ] Credit gas reward to customer's gas meter account
- [ ] Skip gas rewards for credit/loan payments

**Priority:** 🔴 HIGH
**Estimated Time:** 2 days

---

## 1️⃣5️⃣ Remove Branch from Retailer Dashboard

### Requirements
- Remove branch management/selection from retailer portal
- Single location per retailer (for now)
- Simplify retailer interface

### Implementation
- [ ] Remove branch UI components
- [ ] Update APIs to use single location
- [ ] Clean up database queries

**Priority:** 🟢 LOW
**Estimated Time:** 2 hours

---

## 1️⃣6️⃣ Ledger System - Company Payment Flow

### Requirements
- When retailer orders from wholesaler:
  1. Company pays wholesaler immediately
  2. Order amount deducted from retailer's ledger (credit side)
  3. Retailer pays back company over time
  4. Ledger tracks retailer's debt to company

### Implementation
- [ ] Create ledger schema (debit/credit accounting)
- [ ] Implement company payment gateway
- [ ] Auto-deduct from retailer ledger on order
- [ ] Add repayment tracking
- [ ] Generate ledger statements

**Priority:** 🔴 HIGH
**Estimated Time:** 4-5 days

---

## 1️⃣7️⃣ Wallet Ledger Configuration

### Requirements
- **Debit side:** Retailer's earnings from sales
- **Credit side:** Credit approvals from aligned wholesaler
- Clear separation of earnings vs. approved credit
- Running balance calculation

### Implementation
- [ ] Update ledger schema with correct entry types
- [ ] Debit entries: sales revenue, profit earnings
- [ ] Credit entries: credit approvals, loans from wholesaler
- [ ] Calculate net balance
- [ ] Display ledger in retailer wallet

**Priority:** 🔴 HIGH
**Estimated Time:** 2 days

---

## 1️⃣8️⃣ Profit Margin Filters

### Requirements
- Inventory profit margin report
- Filters: Per day, Per month, Custom date range
- Show total profit for selected period
- Export reports

### Implementation
- [ ] Add date range filter UI
- [ ] Create profit margin aggregation API
- [ ] Support daily, monthly, custom ranges
- [ ] Add charts/visualizations
- [ ] Export to CSV/PDF

**Priority:** 🟡 MEDIUM
**Estimated Time:** 1 day

---

## 1️⃣9️⃣ Profit Distribution System

### Requirements

**Profit Split:**
- **60%** to Retailer (earnings)
- **28%** to Company (platform fee)
- **12%** to Gas Rewards (for customers with meter ID)

**Special Case (No Meter ID):**
- **60%** to Retailer
- **40%** to Company (no gas rewards)

### Implementation
- [ ] Create profit calculation service
- [ ] Split profit on every sale transaction
- [ ] Track retailer earnings (60%)
- [ ] Track company earnings (28% or 40%)
- [ ] Track gas rewards pool (12% or 0%)
- [ ] Credit gas rewards to customer meters
- [ ] Generate profit reports

**Priority:** 🔴 HIGH
**Estimated Time:** 3 days

---

## 2️⃣0️⃣ Customer Address & Location Filtering

### Requirements
- Add address field to customer profile
- Manual location filtering (no API integration)
- Filter customers by proximity to retailer
- Search customers by address

### Implementation
- [ ] Add address fields to customer schema
- [ ] Update customer registration/profile forms
- [ ] Create manual distance filter UI
- [ ] Implement address search
- [ ] Add "nearby customers" filter

**Priority:** 🟡 MEDIUM
**Estimated Time:** 1 day

---

## 2️⃣1️⃣ Retailer Shop Location Filtering

### Requirements
- Filter retailer shops by customer address
- Show nearest retailers to customer
- Manual distance calculation
- Map view (optional enhancement)

### Implementation
- [ ] Add retailer location to shop profile
- [ ] Create proximity filter algorithm
- [ ] Show nearest retailers to customer
- [ ] Sort by distance
- [ ] Display retailer address and distance

**Priority:** 🟡 MEDIUM
**Estimated Time:** 1 day

---

## 2️⃣2️⃣ Remove Transfer Button

### Requirements
- Customers cannot transfer money to other customers
- Remove "Transfer" option from topup/transfer page
- Keep only "Topup" functionality
- Prevent peer-to-peer transfers

### Implementation
- [ ] Remove transfer button from UI
- [ ] Disable transfer API endpoints for customers
- [ ] Update documentation

**Priority:** 🟢 LOW
**Estimated Time:** 30 minutes

---

## 2️⃣3️⃣ Customer Credit Ledger

### Requirements
- Customer portal shows credit ledger
- Display wallet balance payments
- Display credit balance payments
- Transaction history with payment method
- Running balance

### Implementation
- [ ] Create customer ledger view
- [ ] Show wallet transactions (debit entries)
- [ ] Show credit transactions (credit entries)
- [ ] Display payment method for each transaction
- [ ] Calculate running balance
- [ ] Add date filters

**Priority:** 🟡 MEDIUM
**Estimated Time:** 1 day

---

## Implementation Priority Order

### Phase 1: Critical (Week 1)
1. Admin Dashboard creation
2. Credit approval - goods only restriction
3. Ledger system implementation
4. Profit distribution system (60/28/12 split)
5. All payments through BIG Shop Card

### Phase 2: Important (Week 2)
6. BIG Shop Card manual entry
7. Gas rewards with meter ID
8. Wallet ledger configuration
9. Remove cash payment option
10. Admin-only card issuance

### Phase 3: Enhancement (Week 3)
11. Editable categories
12. Wallet/credit options with card
13. Show used cards only in retailer portal
14. Profit margin filters
15. Customer address & filtering

### Phase 4: UI Cleanup (Week 4)
16. Remove branch from retailer dashboard
17. Retailer shop location filtering
18. Remove transfer button
19. Customer credit ledger
20. Remove "don't have account" prompts
21. Testing and bug fixes

---

## Technical Stack

**Frontend:**
- React TypeScript
- Tailwind CSS
- React Router
- Recharts (for reports)

**Backend:**
- Medusa.js (Node.js/TypeScript)
- PostgreSQL
- Redis (caching)
- JWT authentication

**Payment Integration:**
- BIG Shop Card system
- Wallet system
- Credit/loan system
- Gas rewards integration

---

## Database Changes Needed

1. **Users Table:**
   - Add `role` field validation (admin/retailer/wholesaler/customer)
   - Add `created_by_admin` flag

2. **Categories Table:**
   - Add CRUD functionality
   - Add `archived` flag (soft delete)

3. **Credit Table:**
   - Add `credit_type` (GOODS_ONLY, GENERAL)
   - Add `restriction` metadata

4. **Transactions Table:**
   - Add `payment_source` (WALLET, CREDIT, CARD)
   - Add `meter_id` (nullable)
   - Add `gas_reward_amount`

5. **Ledger Table (NEW):**
   - id, user_id, entry_type (DEBIT/CREDIT)
   - amount, balance, description
   - transaction_id, created_at

6. **Profit Table (NEW):**
   - id, transaction_id, total_profit
   - retailer_amount (60%)
   - company_amount (28% or 40%)
   - gas_reward_amount (12% or 0%)
   - created_at

7. **Customers Table:**
   - Add `address` field
   - Add `latitude`, `longitude` (optional)

8. **Cards Table:**
   - Add `issued_by_admin` flag
   - Add `last_used_at` timestamp

---

## Testing Checklist

- [ ] Admin can create retailer accounts
- [ ] Admin can create wholesaler accounts
- [ ] Admin can issue BIG Shop Cards
- [ ] Categories are editable
- [ ] Credit only works for goods purchases
- [ ] Cash payment option removed
- [ ] BIG Shop Card manual entry works
- [ ] Gas rewards calculated correctly
- [ ] Profit split: 60/28/12 working
- [ ] Ledger entries correct
- [ ] Customer address filtering works
- [ ] Transfer button removed
- [ ] All payments route through BIG Shop Card

---

## Rollout Plan

1. **Development:** 3-4 weeks
2. **Testing:** 1 week
3. **UAT with admin:** 3 days
4. **Soft launch:** 1 week (limited users)
5. **Full production:** After validation

---

**Total Estimated Time:** 4-5 weeks
**Team Size Recommended:** 2-3 developers + 1 QA tester
**Budget Consideration:** Medium to Large implementation

---

## Next Steps

1. Review and approve this plan
2. Set up development environment
3. Create database migration scripts
4. Begin Phase 1 implementation
5. Weekly progress reviews

---

**Status:** 📋 Plan Ready for Review
**Approval Needed:** ✅ Yes
**Questions?** Ask before starting implementation!
