const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 }
  });
  const page = await context.newPage();

  const baseUrl = 'https://unified-frontend-production.up.railway.app';

  try {
    // Go to login page
    console.log('1. Going to login page...');
    await page.goto(`${baseUrl}/login?role=consumer`, { waitUntil: 'networkidle', timeout: 60000 });
    await page.waitForTimeout(3000);

    // Click auto-fill demo credentials button
    console.log('2. Auto-filling demo credentials...');
    const autoFillBtn = page.locator('button:has-text("Auto-fill Demo Credentials")');
    if (await autoFillBtn.count() > 0) {
      await autoFillBtn.click();
      await page.waitForTimeout(1000);
    }

    await page.screenshot({ path: '/root/big-company/screenshots/01_login_filled.png', fullPage: true });

    // Click login button
    console.log('3. Clicking Sign In...');
    const loginBtn = page.locator('button:has-text("Sign in as Consumer")');
    await loginBtn.click();

    // Wait for navigation to complete
    await page.waitForTimeout(5000);
    await page.screenshot({ path: '/root/big-company/screenshots/02_after_login.png', fullPage: true });
    console.log('Current URL:', page.url());

    // Navigate to Shop page
    console.log('4. Going to Shop page...');
    await page.goto(`${baseUrl}/consumer/shop`, { waitUntil: 'networkidle', timeout: 60000 });
    await page.waitForTimeout(3000);
    await page.screenshot({ path: '/root/big-company/screenshots/03_shop.png', fullPage: true });
    console.log('Screenshot: shop page saved');

    // Navigate to Wallet page
    console.log('5. Going to Wallet page...');
    await page.goto(`${baseUrl}/consumer/wallet`, { waitUntil: 'networkidle', timeout: 60000 });
    await page.waitForTimeout(3000);
    await page.screenshot({ path: '/root/big-company/screenshots/04_wallet.png', fullPage: true });
    console.log('Screenshot: wallet page saved');

    // Navigate to Gas page
    console.log('6. Going to Gas page...');
    await page.goto(`${baseUrl}/consumer/gas`, { waitUntil: 'networkidle', timeout: 60000 });
    await page.waitForTimeout(3000);
    await page.screenshot({ path: '/root/big-company/screenshots/05_gas.png', fullPage: true });
    console.log('Screenshot: gas page saved');

    // Navigate to Rewards page
    console.log('7. Going to Rewards page...');
    await page.goto(`${baseUrl}/consumer/rewards`, { waitUntil: 'networkidle', timeout: 60000 });
    await page.waitForTimeout(3000);
    await page.screenshot({ path: '/root/big-company/screenshots/06_rewards.png', fullPage: true });
    console.log('Screenshot: rewards page saved');

    // Navigate to Orders page
    console.log('8. Going to Orders page...');
    await page.goto(`${baseUrl}/consumer/orders`, { waitUntil: 'networkidle', timeout: 60000 });
    await page.waitForTimeout(3000);
    await page.screenshot({ path: '/root/big-company/screenshots/07_orders.png', fullPage: true });
    console.log('Screenshot: orders page saved');

    // Navigate to Profile page
    console.log('9. Going to Profile page...');
    await page.goto(`${baseUrl}/consumer/profile`, { waitUntil: 'networkidle', timeout: 60000 });
    await page.waitForTimeout(3000);
    await page.screenshot({ path: '/root/big-company/screenshots/08_profile.png', fullPage: true });
    console.log('Screenshot: profile page saved');

    // Mobile view screenshots
    console.log('10. Taking mobile screenshots...');
    await context.close();

    const mobileContext = await browser.newContext({
      viewport: { width: 375, height: 812 },
      isMobile: true,
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15'
    });
    const mobilePage = await mobileContext.newPage();

    // Mobile login first
    await mobilePage.goto(`${baseUrl}/login?role=consumer`, { waitUntil: 'networkidle', timeout: 60000 });
    await mobilePage.waitForTimeout(2000);
    const mobileAutoFill = mobilePage.locator('button:has-text("Auto-fill")');
    if (await mobileAutoFill.count() > 0) {
      await mobileAutoFill.click();
      await mobilePage.waitForTimeout(1000);
    }
    const mobileLoginBtn = mobilePage.locator('button:has-text("Sign in")');
    if (await mobileLoginBtn.count() > 0) {
      await mobileLoginBtn.click();
      await mobilePage.waitForTimeout(3000);
    }

    // Mobile wallet page - shows bottom nav
    await mobilePage.goto(`${baseUrl}/consumer/wallet`, { waitUntil: 'networkidle', timeout: 60000 });
    await mobilePage.waitForTimeout(3000);
    await mobilePage.screenshot({ path: '/root/big-company/screenshots/09_mobile_wallet.png', fullPage: false });
    console.log('Screenshot: mobile wallet with bottom nav saved');

    // Mobile orders page
    await mobilePage.goto(`${baseUrl}/consumer/orders`, { waitUntil: 'networkidle', timeout: 60000 });
    await mobilePage.waitForTimeout(3000);
    await mobilePage.screenshot({ path: '/root/big-company/screenshots/10_mobile_orders.png', fullPage: false });
    console.log('Screenshot: mobile orders saved');

    // Mobile rewards page
    await mobilePage.goto(`${baseUrl}/consumer/rewards`, { waitUntil: 'networkidle', timeout: 60000 });
    await mobilePage.waitForTimeout(3000);
    await mobilePage.screenshot({ path: '/root/big-company/screenshots/11_mobile_rewards.png', fullPage: false });
    console.log('Screenshot: mobile rewards saved');

    // Mobile Shop page
    await mobilePage.goto(`${baseUrl}/consumer/shop`, { waitUntil: 'networkidle', timeout: 60000 });
    await mobilePage.waitForTimeout(3000);
    await mobilePage.screenshot({ path: '/root/big-company/screenshots/12_mobile_shop.png', fullPage: false });
    console.log('Screenshot: mobile shop saved');

    await mobileContext.close();
    console.log('\n✅ All screenshots saved to /root/big-company/screenshots/');

  } catch (error) {
    console.error('Error:', error.message);
    await page.screenshot({ path: '/root/big-company/screenshots/error.png', fullPage: true });
  } finally {
    await browser.close();
  }
})();
