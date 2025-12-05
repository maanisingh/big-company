import { test, expect } from '@playwright/test';

const BASE_URL = 'https://unified-frontend-production.up.railway.app';
const DEMO_PHONE = '250788100001';
const DEMO_PIN = '1234';

test.describe('Railway Authenticated Frontend Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to login page
    await page.goto(`${BASE_URL}/consumer`);
    await page.waitForLoadState('networkidle');

    // Click auto-fill demo credentials if available
    const autoFillButton = page.getByText('Auto-fill Demo Credentials');
    if (await autoFillButton.isVisible()) {
      await autoFillButton.click();
      await page.waitForTimeout(500);
    } else {
      // Manual login
      await page.fill('input[placeholder*="Phone" i], input[type="tel"]', DEMO_PHONE);
      await page.fill('input[placeholder*="PIN" i], input[type="password"]', DEMO_PIN);
    }

    // Sign in
    await page.click('button:has-text("Sign in")');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
  });

  test('After login - Homepage/Dashboard', async ({ page }) => {
    await page.screenshot({ path: 'tests/screenshots/auth-01-dashboard.png', fullPage: true });

    const url = page.url();
    console.log('Current URL after login:', url);

    // Check for wallet/dashboard elements
    const walletText = await page.getByText(/wallet|balance/i).count();
    console.log('Wallet/Balance elements found:', walletText);
  });

  test('Shop page with location modal', async ({ page }) => {
    await page.goto(`${BASE_URL}/consumer/shop`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);

    await page.screenshot({ path: 'tests/screenshots/auth-02-shop.png', fullPage: true });

    // Check for location modal
    const locationModal = await page.getByText(/enter.*location|district|sector|cell/i).count();
    console.log('Location modal/inputs present:', locationModal);

    const districtInput = await page.locator('input[placeholder*="District" i]').count();
    const sectorInput = await page.locator('input[placeholder*="Sector" i]').count();
    const cellInput = await page.locator('input[placeholder*="Cell" i]').count();

    console.log('Location inputs - District:', districtInput, 'Sector:', sectorInput, 'Cell:', cellInput);

    // Check for Explore Another Store
    const exploreButton = await page.getByText('Explore Another Store').count();
    console.log('Explore Another Store button:', exploreButton > 0 ? 'FOUND ✓' : 'NOT FOUND ✗');
  });

  test('Wallet page - 3 balance structure', async ({ page }) => {
    await page.goto(`${BASE_URL}/consumer/wallet`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);

    await page.screenshot({ path: 'tests/screenshots/auth-03-wallet.png', fullPage: true });

    // Check for the 3 balance types
    const availableBalance = await page.getByText('Available Balance').count();
    const dashboardBalance = await page.getByText('Dashboard Balance').count();
    const creditBalance = await page.getByText('Credit Balance').count();

    console.log('=== WALLET STRUCTURE ===');
    console.log('Available Balance:', availableBalance > 0 ? 'FOUND ✓' : 'NOT FOUND ✗');
    console.log('Dashboard Balance:', dashboardBalance > 0 ? 'FOUND ✓' : 'NOT FOUND ✗');
    console.log('Credit Balance:', creditBalance > 0 ? 'FOUND ✓' : 'NOT FOUND ✗');

    // Check for buttons
    const topUpButton = await page.getByRole('button', { name: /top up/i }).count();
    const refundButton = await page.getByRole('button', { name: /request refund/i }).count();
    const loanButton = await page.getByRole('button', { name: /request loan/i }).count();

    console.log('Top Up button:', topUpButton > 0 ? 'FOUND ✓' : 'NOT FOUND ✗');
    console.log('Request Refund button:', refundButton > 0 ? 'FOUND ✓' : 'NOT FOUND ✗');
    console.log('Request Loan button:', loanButton > 0 ? 'FOUND ✓' : 'NOT FOUND ✗');

    // Check OLD elements are gone
    const linkedCards = await page.getByText('Linked NFC Cards').count();
    const monthSpending = await page.getByText("This Month's Spending").count();

    console.log('OLD "Linked NFC Cards":', linkedCards > 0 ? 'STILL PRESENT ✗' : 'REMOVED ✓');
    console.log('OLD "This Month\'s Spending":', monthSpending > 0 ? 'STILL PRESENT ✗' : 'REMOVED ✓');
  });

  test('Orders page', async ({ page }) => {
    await page.goto(`${BASE_URL}/consumer/orders`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);

    await page.screenshot({ path: 'tests/screenshots/auth-04-orders.png', fullPage: true });

    const myOrders = await page.getByText('My Orders').count();
    const allOrders = await page.getByText('All Orders').count();
    const activeTab = await page.getByText('Active').count();
    const completedTab = await page.getByText('Completed').count();

    console.log('=== ORDERS PAGE ===');
    console.log('My Orders header:', myOrders > 0 ? 'FOUND ✓' : 'NOT FOUND ✗');
    console.log('Filter tabs:', allOrders > 0 && activeTab > 0 && completedTab > 0 ? 'FOUND ✓' : 'NOT FOUND ✗');
  });

  test('Gas page - Dashboard Balance', async ({ page }) => {
    await page.goto(`${BASE_URL}/consumer/gas`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);

    await page.screenshot({ path: 'tests/screenshots/auth-05-gas.png', fullPage: true });

    const dashboardBalance = await page.getByText('Dashboard Balance').count();
    const myMeters = await page.getByText('My Gas Meters').count();

    console.log('=== GAS PAGE ===');
    console.log('Dashboard Balance:', dashboardBalance > 0 ? 'FOUND ✓' : 'NOT FOUND ✗');
    console.log('My Gas Meters:', myMeters > 0 ? 'FOUND ✓' : 'NOT FOUND ✗');

    // Check old "Wallet balance" is gone
    const walletBalance = await page.getByText(/^Wallet balance$/i).count();
    console.log('OLD "Wallet balance":', walletBalance > 0 ? 'STILL PRESENT ✗' : 'REMOVED ✓');
  });

  test('Rewards page - Redesigned', async ({ page }) => {
    await page.goto(`${BASE_URL}/consumer/rewards`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);

    await page.screenshot({ path: 'tests/screenshots/auth-06-rewards.png', fullPage: true });

    const gasRewards = await page.getByText('Gas Rewards').count();
    const overviewTab = await page.getByRole('tab', { name: 'Overview' }).count();
    const historyTab = await page.getByRole('tab', { name: 'History' }).count();

    console.log('=== REWARDS PAGE ===');
    console.log('Gas Rewards header:', gasRewards > 0 ? 'FOUND ✓' : 'NOT FOUND ✗');
    console.log('Overview tab:', overviewTab > 0 ? 'FOUND ✓' : 'NOT FOUND ✗');
    console.log('History tab:', historyTab > 0 ? 'FOUND ✓' : 'NOT FOUND ✗');

    // Check OLD tabs are gone
    const redeemTab = await page.getByRole('tab', { name: 'Redeem' }).count();
    const rankingTab = await page.getByRole('tab', { name: 'Ranking' }).count();

    console.log('OLD "Redeem" tab:', redeemTab > 0 ? 'STILL PRESENT ✗' : 'REMOVED ✓');
    console.log('OLD "Ranking" tab:', rankingTab > 0 ? 'STILL PRESENT ✗' : 'REMOVED ✓');

    // Check for new overview items
    const shopAndGas = await page.getByText('Shop and get free gas').count();
    const shareRewards = await page.getByText('Share your gas rewards').count();
    const shareExperience = await page.getByText('Share your experience').count();
    const inviteFriends = await page.getByText('Invite friends').count();

    console.log('New Overview Items:');
    console.log('  Shop and get free gas:', shopAndGas > 0 ? 'FOUND ✓' : 'NOT FOUND ✗');
    console.log('  Share gas rewards:', shareRewards > 0 ? 'FOUND ✓' : 'NOT FOUND ✗');
    console.log('  Share experience:', shareExperience > 0 ? 'FOUND ✓' : 'NOT FOUND ✗');
    console.log('  Invite friends:', inviteFriends > 0 ? 'FOUND ✓' : 'NOT FOUND ✗');
  });

  test('Cards page - Max 3 cards', async ({ page }) => {
    await page.goto(`${BASE_URL}/consumer/cards`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);

    await page.screenshot({ path: 'tests/screenshots/auth-07-cards.png', fullPage: true });

    const nfcCards = await page.getByText('NFC Cards').count();
    const linkCard = await page.getByText('Link New Card').count();
    const maxThree = await page.getByText(/3.*cards|maximum.*3/i).count();

    console.log('=== CARDS PAGE ===');
    console.log('NFC Cards header:', nfcCards > 0 ? 'FOUND ✓' : 'NOT FOUND ✗');
    console.log('Link New Card button:', linkCard > 0 ? 'FOUND ✓' : 'NOT FOUND ✗');
    console.log('Max 3 cards info:', maxThree > 0 ? 'FOUND ✓' : 'NOT FOUND ✗');
  });

  test('Checkout page - Payment options', async ({ page }) => {
    await page.goto(`${BASE_URL}/consumer/shop/checkout`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);

    await page.screenshot({ path: 'tests/screenshots/auth-08-checkout.png', fullPage: true });

    const walletOption = await page.getByText(/wallet.*balance|pay.*wallet/i).count();
    const mobileMoneyOption = await page.getByText('Mobile Money').count();

    console.log('=== CHECKOUT PAGE ===');
    console.log('Wallet payment option:', walletOption > 0 ? 'FOUND ✓' : 'NOT FOUND ✗');
    console.log('Mobile Money option:', mobileMoneyOption > 0 ? 'FOUND ✓' : 'NOT FOUND ✗');

    // Check old options are gone
    const cashOnDelivery = await page.getByText('Cash on Delivery').count();
    console.log('OLD "Cash on Delivery":', cashOnDelivery > 0 ? 'STILL PRESENT ✗' : 'REMOVED ✓');
  });

  test('Full page navigation check', async ({ page }) => {
    await page.screenshot({ path: 'tests/screenshots/auth-09-full-ui.png', fullPage: true });

    console.log('\n=== NAVIGATION CHECK ===');

    // Try to find navigation items
    const nav = await page.locator('nav, [role="navigation"]').count();
    console.log('Navigation elements:', nav);

    if (nav > 0) {
      const links = await page.locator('nav a, [role="navigation"] a').allTextContents();
      console.log('Navigation links:', links.join(', '));
    }
  });
});
