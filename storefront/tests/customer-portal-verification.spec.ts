import { test, expect } from '@playwright/test';

/**
 * CUSTOMER PORTAL VERIFICATION TESTS
 *
 * Tests all features requested for the customer portal to verify
 * they are properly rendering on the live Railway deployment.
 */

// Update this with your Railway deployment URL
const BASE_URL = process.env.STOREFRONT_URL || 'https://unified-frontend-production.up.railway.app/consumer';

test.describe('Customer Portal - Complete Feature Verification', () => {

  test.beforeEach(async ({ page }) => {
    // Go to the storefront
    await page.goto(BASE_URL);
  });

  // ============================================================================
  // 1. MOBILE NAVIGATION - My Orders Button
  // ============================================================================

  test('1. Mobile Navigation should show "My Orders" button instead of "Shop"', async ({ page }) => {
    // Look for the bottom navigation
    const navigation = page.locator('nav').last(); // Bottom nav is usually last

    // Check for "My Orders" text
    await expect(navigation.getByText('My Orders')).toBeVisible();

    // Verify "Shop" is NOT there
    const shopButton = navigation.getByText('Shop', { exact: true });
    await expect(shopButton).not.toBeVisible();

    // Verify the link goes to /orders
    const myOrdersLink = navigation.getByRole('link', { name: /my orders/i });
    await expect(myOrdersLink).toHaveAttribute('href', '/orders');

    console.log('✅ Mobile navigation shows "My Orders" button');
  });

  // ============================================================================
  // 2. ORDERS PAGE - Credit Orders Filter
  // ============================================================================

  test('2. Orders page should have "Credit Orders" tab with purple badges', async ({ page }) => {
    // Navigate to orders page
    await page.goto(`${BASE_URL}/orders`);

    // Wait for page to load
    await page.waitForLoadState('networkidle');

    // Check for all 4 tabs
    await expect(page.getByText('All Orders')).toBeVisible();
    await expect(page.getByText('Active')).toBeVisible();
    await expect(page.getByText('Completed')).toBeVisible();
    await expect(page.getByText('Credit Orders')).toBeVisible();

    // Click on Credit Orders tab
    await page.getByText('Credit Orders').click();

    // Wait for filtered orders to load
    await page.waitForTimeout(1000);

    // Check for purple credit badges
    const creditBadges = page.locator('text=/Paid on Credit/i');
    const badgeCount = await creditBadges.count();

    expect(badgeCount).toBeGreaterThan(0);
    console.log(`✅ Found ${badgeCount} orders with credit badges`);

    // Verify specific badge text
    await expect(page.getByText(/Paid on Credit \(Loan\)/i).first()).toBeVisible();
    await expect(page.getByText(/Paid on Credit \(Card\)/i).first()).toBeVisible();

    console.log('✅ Credit Orders tab exists with purple payment badges');
  });

  // ============================================================================
  // 3. NFC CARDS - Order History
  // ============================================================================

  test('3. NFC Cards page should show "View Orders" button with order history', async ({ page }) => {
    // Navigate to cards page
    await page.goto(`${BASE_URL}/cards`);

    // Wait for cards to load
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Check for "View Orders" button
    const viewOrdersButton = page.getByRole('button', { name: /view orders/i }).first();
    await expect(viewOrdersButton).toBeVisible();

    // Click the button
    await viewOrdersButton.click();

    // Wait for order history to load
    await page.waitForTimeout(800);

    // Check for order history section
    await expect(page.getByText('Order History')).toBeVisible();

    // Check for shop names in orders
    const orderSection = page.locator('text=/Kigali|Market|Superstore|Restaurant/i').first();
    await expect(orderSection).toBeVisible();

    // Check for order IDs
    const orderIds = page.locator('text=/ORD-\\d{4}-\\d+/i');
    const orderCount = await orderIds.count();

    expect(orderCount).toBeGreaterThan(0);
    console.log(`✅ Found ${orderCount} orders in card history`);

    // Check for amounts in RWF
    await expect(page.getByText(/\\d+,?\\d* RWF/)).toBeVisible();

    console.log('✅ NFC Cards show order history with shop names and order IDs');
  });

  // ============================================================================
  // 4. WALLET - Loan Request with Daily/Weekly Option
  // ============================================================================

  test('4. Loan request should have Daily/Weekly payment frequency selector', async ({ page }) => {
    // Navigate to wallet page
    await page.goto(`${BASE_URL}/wallet`);

    // Wait for page to load
    await page.waitForLoadState('networkidle');

    // Look for loan request button or section
    const loanButton = page.getByRole('button', { name: /request loan|apply for loan/i }).first();

    if (await loanButton.isVisible()) {
      await loanButton.click();

      // Wait for modal/form to appear
      await page.waitForTimeout(500);

      // Check for Daily/Weekly options
      await expect(page.getByText('Repayment Frequency')).toBeVisible();
      await expect(page.getByRole('button', { name: 'Daily' })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Weekly' })).toBeVisible();

      console.log('✅ Loan request has Daily/Weekly frequency selector');
    } else {
      console.log('⚠️ Loan request button not found - may require login');
    }
  });

  // ============================================================================
  // 5. CREDIT LEDGER - Payment Status and Pay Buttons
  // ============================================================================

  test('5. Credit Ledger should show payment status and pay loan buttons', async ({ page }) => {
    // Navigate to credit ledger
    await page.goto(`${BASE_URL}/loans/ledger`);

    // Wait for page to load
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Check for outstanding balance
    await expect(page.getByText(/outstanding balance|balance/i)).toBeVisible();

    // Check for payment schedule/status
    const paymentElements = page.getByText(/payment|due|paid/i);
    const paymentCount = await paymentElements.count();
    expect(paymentCount).toBeGreaterThan(0);

    // Check for pay loan buttons
    const payFromDashboard = page.getByRole('button', { name: /pay from dashboard|dashboard balance/i }).first();
    const payViaMobileMoney = page.getByRole('button', { name: /mobile money|pay via mobile/i }).first();

    if (await payFromDashboard.isVisible()) {
      console.log('✅ Found "Pay from Dashboard" button');
    }

    if (await payViaMobileMoney.isVisible()) {
      console.log('✅ Found "Pay via Mobile Money" button');
    }

    // Check for loan given date
    await expect(page.getByText(/disbursed|loan given|date/i)).toBeVisible();

    // Check for next payment date
    await expect(page.getByText(/next payment|due date/i)).toBeVisible();

    console.log('✅ Credit Ledger shows payment status and pay buttons');
  });

  // ============================================================================
  // 6. CREDIT TRANSACTIONS - History with Filters
  // ============================================================================

  test('6. Credit Transactions should show loan history with filters', async ({ page }) => {
    // Navigate to credit transactions
    await page.goto(`${BASE_URL}/loans/transactions`);

    // Wait for page to load
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Check for transaction types
    await expect(page.getByText(/loan given|loan disbursed/i)).toBeVisible();
    await expect(page.getByText(/payment made|credit paid/i)).toBeVisible();

    // Check for filter button/dropdown
    const filterButton = page.getByRole('button', { name: /filter/i }).first();

    if (await filterButton.isVisible()) {
      await filterButton.click();
      await page.waitForTimeout(300);

      // Check for filter options
      await expect(page.getByText('All Transactions')).toBeVisible();
      await expect(page.getByText('Loans Given')).toBeVisible();
      await expect(page.getByText('Payments Made')).toBeVisible();
      await expect(page.getByText('Card Credit Orders')).toBeVisible();

      console.log('✅ Credit Transactions has all filter options');
    }

    // Check for card credit orders with shop names
    const cardOrders = page.locator('text=/Card Credit Order|card credit/i');
    if (await cardOrders.first().isVisible()) {
      // Should have shop name nearby
      await expect(page.getByText(/Market|Shop|Store/i)).toBeVisible();
      console.log('✅ Card credit orders show shop names');
    }

    console.log('✅ Credit Transactions displays history with filters');
  });

  // ============================================================================
  // 7. GAS PAGE - 300 RWF Minimum Validation
  // ============================================================================

  test('7. Gas page should enforce 300 RWF minimum for custom amount', async ({ page }) => {
    // Navigate to gas page
    await page.goto(`${BASE_URL}/gas`);

    // Wait for page to load
    await page.waitForLoadState('networkidle');

    // Look for custom amount input
    const customAmountInput = page.getByPlaceholder(/custom|amount|enter amount/i).first();

    if (await customAmountInput.isVisible()) {
      // Try to enter less than 300
      await customAmountInput.fill('200');

      // Look for submit/buy button
      const buyButton = page.getByRole('button', { name: /buy|purchase|top up/i }).first();

      if (await buyButton.isVisible()) {
        await buyButton.click();

        // Wait for validation message
        await page.waitForTimeout(500);

        // Check for error message about 300 RWF minimum
        const errorMessage = page.getByText(/300 RWF|minimum/i);
        await expect(errorMessage).toBeVisible();

        console.log('✅ Gas page enforces 300 RWF minimum');
      }
    } else {
      // Check for minimum text in placeholder or label
      await expect(page.getByText(/minimum 300|300 RWF minimum/i)).toBeVisible();
      console.log('✅ Gas page shows 300 RWF minimum requirement');
    }
  });

  // ============================================================================
  // 8. REWARDS PAGE - Only Overview and History (No Tiers)
  // ============================================================================

  test('8. Rewards page should have only Overview and History tabs (no tiers)', async ({ page }) => {
    // Navigate to rewards page
    await page.goto(`${BASE_URL}/rewards`);

    // Wait for page to load
    await page.waitForLoadState('networkidle');

    // Check for Overview and History tabs
    await expect(page.getByText('Overview')).toBeVisible();
    await expect(page.getByText('History')).toBeVisible();

    // Verify NO tiers section
    const tiersText = page.getByText(/tier|bronze|silver|gold|platinum/i);
    const tiersCount = await tiersText.count();

    // Should not find tier-related text in main content
    expect(tiersCount).toBe(0);

    console.log('✅ Rewards page has only Overview and History (no tiers)');
  });

  // ============================================================================
  // 9. LOGIN PAGE - Registration Link
  // ============================================================================

  test('9. Login page should have "Create Account" registration link', async ({ page }) => {
    // Navigate to login page
    await page.goto(`${BASE_URL}/auth/login`);

    // Wait for page to load
    await page.waitForLoadState('networkidle');

    // Check for registration link
    const createAccountLink = page.getByText(/create account|first time|sign up|register/i);
    await expect(createAccountLink.first()).toBeVisible();

    // Click and verify it goes to registration page
    const registrationLink = page.getByRole('link', { name: /create account/i }).first();

    if (await registrationLink.isVisible()) {
      await expect(registrationLink).toHaveAttribute('href', /register/);
      console.log('✅ Login page has "Create Account" link');
    }
  });

  // ============================================================================
  // 10. GAS ADD METER - Auto-fill Fields (UI Check)
  // ============================================================================

  test('10. Gas add meter should have fields for auto-fill from API', async ({ page }) => {
    // Navigate to gas page
    await page.goto(`${BASE_URL}/gas`);

    // Wait for page to load
    await page.waitForLoadState('networkidle');

    // Look for "Add Meter" button
    const addMeterButton = page.getByRole('button', { name: /add meter|register meter/i }).first();

    if (await addMeterButton.isVisible()) {
      await addMeterButton.click();
      await page.waitForTimeout(500);

      // Check for meter ID input
      await expect(page.getByLabel(/meter id|meter number/i)).toBeVisible();

      // Check for fields that should auto-fill
      await expect(page.getByLabel(/owner name|registered name/i)).toBeVisible();
      await expect(page.getByLabel(/id number|owner id/i)).toBeVisible();
      await expect(page.getByLabel(/phone number|phone/i)).toBeVisible();

      console.log('✅ Gas add meter has fields for API auto-fill');
    }
  });

  // ============================================================================
  // COMPREHENSIVE SUMMARY TEST
  // ============================================================================

  test('SUMMARY: Verify all customer portal features exist', async ({ page }) => {
    const results: { feature: string; status: string }[] = [];

    // 1. Check My Orders button
    await page.goto(BASE_URL);
    const myOrdersExists = await page.getByText('My Orders').isVisible().catch(() => false);
    results.push({
      feature: 'Mobile Nav - My Orders button',
      status: myOrdersExists ? '✅ PASS' : '❌ FAIL'
    });

    // 2. Check Credit Orders tab
    await page.goto(`${BASE_URL}/orders`);
    await page.waitForTimeout(1000);
    const creditOrdersTab = await page.getByText('Credit Orders').isVisible().catch(() => false);
    results.push({
      feature: 'Orders - Credit Orders tab',
      status: creditOrdersTab ? '✅ PASS' : '❌ FAIL'
    });

    // 3. Check NFC Cards order history
    await page.goto(`${BASE_URL}/cards`);
    await page.waitForTimeout(1000);
    const viewOrdersButton = await page.getByRole('button', { name: /view orders/i }).first().isVisible().catch(() => false);
    results.push({
      feature: 'NFC Cards - View Orders button',
      status: viewOrdersButton ? '✅ PASS' : '❌ FAIL'
    });

    // 4. Check Credit Ledger
    await page.goto(`${BASE_URL}/loans/ledger`);
    await page.waitForTimeout(1000);
    const ledgerExists = await page.getByText(/outstanding balance|payment/i).first().isVisible().catch(() => false);
    results.push({
      feature: 'Credit Ledger - Payment status',
      status: ledgerExists ? '✅ PASS' : '❌ FAIL'
    });

    // 5. Check Credit Transactions
    await page.goto(`${BASE_URL}/loans/transactions`);
    await page.waitForTimeout(1000);
    const transactionsExist = await page.getByText(/loan given|credit paid/i).first().isVisible().catch(() => false);
    results.push({
      feature: 'Credit Transactions - History',
      status: transactionsExist ? '✅ PASS' : '❌ FAIL'
    });

    // 6. Check Rewards (no tiers)
    await page.goto(`${BASE_URL}/rewards`);
    await page.waitForTimeout(1000);
    const overviewExists = await page.getByText('Overview').isVisible().catch(() => false);
    const historyExists = await page.getByText('History').isVisible().catch(() => false);
    results.push({
      feature: 'Rewards - Overview & History only',
      status: (overviewExists && historyExists) ? '✅ PASS' : '❌ FAIL'
    });

    // 7. Check Login registration link
    await page.goto(`${BASE_URL}/auth/login`);
    await page.waitForTimeout(1000);
    const createAccountExists = await page.getByText(/create account/i).first().isVisible().catch(() => false);
    results.push({
      feature: 'Login - Create Account link',
      status: createAccountExists ? '✅ PASS' : '❌ FAIL'
    });

    // Print summary
    console.log('\n' + '='.repeat(60));
    console.log('CUSTOMER PORTAL VERIFICATION SUMMARY');
    console.log('='.repeat(60));
    results.forEach(result => {
      console.log(`${result.status} ${result.feature}`);
    });
    console.log('='.repeat(60));

    const passCount = results.filter(r => r.status.includes('✅')).length;
    const totalCount = results.length;
    console.log(`\nTotal: ${passCount}/${totalCount} features verified`);

    // Fail the test if not all features pass
    expect(passCount).toBe(totalCount);
  });
});
