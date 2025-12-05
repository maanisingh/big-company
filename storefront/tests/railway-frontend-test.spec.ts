import { test, expect } from '@playwright/test';

const BASE_URL = 'https://unified-frontend-production.up.railway.app/consumer';

test.describe('Railway Frontend Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');
  });

  test('Homepage loads correctly', async ({ page }) => {
    await page.screenshot({ path: 'tests/screenshots/01-homepage.png', fullPage: true });

    // Check for main elements
    const title = await page.title();
    console.log('Page title:', title);

    // Check if navigation is present
    const nav = await page.locator('nav').count();
    console.log('Navigation elements:', nav);
  });

  test('Shop page - Location modal and store selection', async ({ page }) => {
    await page.goto(`${BASE_URL}/shop`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    await page.screenshot({ path: 'tests/screenshots/02-shop-initial.png', fullPage: true });

    // Check if location modal appears
    const locationModal = await page.getByText('Enter Your Location').count();
    console.log('Location modal present:', locationModal > 0);

    // Check for District/Sector/Cell inputs
    const districtInput = await page.locator('input[placeholder*="District"]').count();
    const sectorInput = await page.locator('input[placeholder*="Sector"]').count();
    const cellInput = await page.locator('input[placeholder*="Cell"]').count();

    console.log('Location inputs - District:', districtInput, 'Sector:', sectorInput, 'Cell:', cellInput);

    // Check for "Explore Another Store" text
    const exploreButton = await page.getByText('Explore Another Store').count();
    console.log('Explore Another Store button present:', exploreButton > 0);
  });

  test('Wallet page - 3 balance types structure', async ({ page }) => {
    await page.goto(`${BASE_URL}/wallet`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    await page.screenshot({ path: 'tests/screenshots/03-wallet-full.png', fullPage: true });

    // Check for Available Balance
    const availableBalance = await page.getByText('Available Balance').count();
    console.log('Available Balance present:', availableBalance > 0);

    // Check for Dashboard Balance
    const dashboardBalance = await page.getByText('Dashboard Balance').count();
    console.log('Dashboard Balance present:', dashboardBalance > 0);

    // Check for Credit Balance
    const creditBalance = await page.getByText('Credit Balance').count();
    console.log('Credit Balance present:', creditBalance > 0);

    // Check for Top Up button
    const topUpButton = await page.getByText('Top Up').count();
    console.log('Top Up button present:', topUpButton > 0);

    // Check for Request Refund button
    const refundButton = await page.getByText('Request Refund').count();
    console.log('Request Refund button present:', refundButton > 0);

    // Check for Request Loan button
    const loanButton = await page.getByText('Request Loan').count();
    console.log('Request Loan button present:', loanButton > 0);

    // Check that old elements are NOT present
    const linkedCards = await page.getByText('Linked NFC Cards').count();
    const monthSpending = await page.getByText("This Month's Spending").count();
    console.log('Old "Linked NFC Cards" present:', linkedCards > 0, '(should be false)');
    console.log('Old "This Month\'s Spending" present:', monthSpending > 0, '(should be false)');
  });

  test('Orders page - Tracking and management', async ({ page }) => {
    await page.goto(`${BASE_URL}/orders`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    await page.screenshot({ path: 'tests/screenshots/04-orders.png', fullPage: true });

    // Check for My Orders header
    const ordersHeader = await page.getByText('My Orders').count();
    console.log('My Orders header present:', ordersHeader > 0);

    // Check for filter tabs
    const allOrders = await page.getByText('All Orders').count();
    const activeOrders = await page.getByText('Active', { exact: true }).count();
    const completedOrders = await page.getByText('Completed').count();

    console.log('Filter tabs - All:', allOrders > 0, 'Active:', activeOrders > 0, 'Completed:', completedOrders > 0);
  });

  test('Gas page - Dashboard balance and meter management', async ({ page }) => {
    await page.goto(`${BASE_URL}/gas`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    await page.screenshot({ path: 'tests/screenshots/05-gas.png', fullPage: true });

    // Check for Dashboard Balance (not "Wallet balance")
    const dashboardBalance = await page.getByText('Dashboard Balance').count();
    console.log('Dashboard Balance present:', dashboardBalance > 0);

    // Check for meter management
    const myMeters = await page.getByText('My Gas Meters').count();
    console.log('My Gas Meters section present:', myMeters > 0);

    // Check that old "Wallet balance" is NOT present
    const walletBalance = await page.locator('text=/^Wallet balance$/i').count();
    console.log('Old "Wallet balance" present:', walletBalance > 0, '(should be false)');
  });

  test('Rewards page - Redesigned without redeem/tier/ranking', async ({ page }) => {
    await page.goto(`${BASE_URL}/rewards`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    await page.screenshot({ path: 'tests/screenshots/06-rewards.png', fullPage: true });

    // Check for Gas Rewards header
    const rewardsHeader = await page.getByText('Gas Rewards').count();
    console.log('Gas Rewards header present:', rewardsHeader > 0);

    // Check for Overview and History tabs only
    const overviewTab = await page.getByText('Overview', { exact: true }).count();
    const historyTab = await page.getByText('History', { exact: true }).count();

    console.log('Overview tab present:', overviewTab > 0);
    console.log('History tab present:', historyTab > 0);

    // Check that old tabs are NOT present
    const redeemTab = await page.getByText('Redeem', { exact: true }).count();
    const rankingTab = await page.getByText('Ranking', { exact: true }).count();

    console.log('Old "Redeem" tab present:', redeemTab > 0, '(should be false)');
    console.log('Old "Ranking" tab present:', rankingTab > 0, '(should be false)');

    // Check for new Overview items
    const shopAndGas = await page.getByText('Shop and get free gas').count();
    const shareRewards = await page.getByText('Share your gas rewards').count();
    const shareExperience = await page.getByText('Share your experience').count();
    const inviteFriends = await page.getByText('Invite friends').count();

    console.log('New overview items:');
    console.log('  - Shop and get free gas:', shopAndGas > 0);
    console.log('  - Share your gas rewards:', shareRewards > 0);
    console.log('  - Share your experience:', shareExperience > 0);
    console.log('  - Invite friends:', inviteFriends > 0);
  });

  test('Cards page - Maximum 3 cards with transactions', async ({ page }) => {
    await page.goto(`${BASE_URL}/cards`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    await page.screenshot({ path: 'tests/screenshots/07-cards.png', fullPage: true });

    // Check for NFC Cards header
    const cardsHeader = await page.getByText('NFC Cards').count();
    console.log('NFC Cards header present:', cardsHeader > 0);

    // Check for Link New Card button
    const linkCardButton = await page.getByText('Link New Card').count();
    console.log('Link New Card button present:', linkCardButton > 0);

    // Check for max 3 cards messaging
    const maxCards = await page.getByText(/maximum.*3.*cards/i).count();
    console.log('Max 3 cards info present:', maxCards > 0);
  });

  test('Checkout page - Payment options (Wallet and Mobile Money only)', async ({ page }) => {
    await page.goto(`${BASE_URL}/shop/checkout`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    await page.screenshot({ path: 'tests/screenshots/08-checkout.png', fullPage: true });

    // Check for wallet payment option
    const walletOption = await page.getByText('Wallet', { exact: false }).count();
    console.log('Wallet payment option present:', walletOption > 0);

    // Check for mobile money option
    const mobileMoneyOption = await page.getByText('Mobile Money').count();
    console.log('Mobile Money payment option present:', mobileMoneyOption > 0);

    // Check that cash on delivery is NOT present
    const cashOnDelivery = await page.getByText('Cash on Delivery').count();
    console.log('Old "Cash on Delivery" present:', cashOnDelivery > 0, '(should be false)');
  });

  test('Navigation menu check', async ({ page }) => {
    await page.screenshot({ path: 'tests/screenshots/09-navigation.png', fullPage: true });

    // Check for main navigation items
    const shopLink = await page.getByRole('link', { name: /shop/i }).count();
    const ordersLink = await page.getByRole('link', { name: /orders/i }).count();
    const walletLink = await page.getByRole('link', { name: /wallet/i }).count();
    const gasLink = await page.getByRole('link', { name: /gas/i }).count();

    console.log('Navigation items:');
    console.log('  - Shop:', shopLink > 0);
    console.log('  - Orders:', ordersLink > 0);
    console.log('  - Wallet:', walletLink > 0);
    console.log('  - Gas:', gasLink > 0);
  });
});
