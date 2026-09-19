import { chromium } from 'playwright';

const BASE = 'http://localhost:5174';

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });

  // Login as admin
  console.log('1. Opening login page...');
  await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page.waitForTimeout(1500);

  const emailInput = page.locator('input[type="email"]').first();
  await emailInput.fill('hp8187081014laptop@gmail.com');
  const pwInput = page.locator('input[type="password"]').first();
  await pwInput.fill('ChangeMe123!');

  const loginBtn = page.locator('button[type="submit"]').first();
  await loginBtn.click();
  await page.waitForTimeout(2000);
  console.log(`   Logged in → ${page.url()}`);

  // Test GroupDetail page
  console.log('\n2. Testing GroupDetail page (homework + feedback tabs)...');
  await page.goto(`${BASE}/groups`, { waitUntil: 'domcontentloaded', timeout: 10000 });
  await page.waitForTimeout(2000);

  // Click on first group card to go to detail
  const groupCard = page.locator('a[href*="/groups/"]').first();
  if (await groupCard.isVisible()) {
    await groupCard.click();
    await page.waitForTimeout(2000);
    console.log(`   GroupDetail URL: ${page.url()}`);

    // Click homework tab
    const hwTab = page.locator('button:has-text("Домашние задания")').first();
    if (await hwTab.isVisible()) {
      await hwTab.click();
      await page.waitForTimeout(1500);
      await page.screenshot({ path: 'screenshots/05-group-homework.png' });
      console.log('   ✅ Homework tab opened');
    }

    // Click feedback tab
    const fbTab = page.locator('button:has-text("Отзывы")').first();
    if (await fbTab.isVisible()) {
      await fbTab.click();
      await page.waitForTimeout(1500);
      await page.screenshot({ path: 'screenshots/06-group-feedback.png' });
      console.log('   ✅ Feedback tab opened');
    }
  } else {
    console.log('   ⚠️ No group cards found, trying direct URL...');
    await page.goto(`${BASE}/groups/group-uuid-1`, { waitUntil: 'domcontentloaded', timeout: 10000 });
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'screenshots/05-group-detail.png' });
  }

  // Test Settings page (password change section)
  console.log('\n3. Testing Settings page (security tab)...');
  await page.goto(`${BASE}/settings`, { waitUntil: 'domcontentloaded', timeout: 10000 });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: 'screenshots/07-settings-general.png' });
  console.log(`   Settings URL: ${page.url()}`);

  // Click security tab
  const secTab = page.locator('button:has-text("Безопасность")').first();
  if (await secTab.isVisible()) {
    await secTab.click();
    await page.waitForTimeout(1500);
    await page.screenshot({ path: 'screenshots/08-settings-security.png' });
    console.log('   ✅ Security tab opened');
  }

  // Test Expenses page
  console.log('\n4. Testing Expenses page...');
  await page.goto(`${BASE}/expenses`, { waitUntil: 'domcontentloaded', timeout: 10000 });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: 'screenshots/09-expenses.png' });
  console.log(`   Expenses URL: ${page.url()}`);

  // Test Payments page
  console.log('\n5. Testing Payments page...');
  await page.goto(`${BASE}/payments`, { waitUntil: 'domcontentloaded', timeout: 10000 });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: 'screenshots/10-payments.png' });
  console.log(`   Payments URL: ${page.url()}`);

  console.log('\n✅ Extended smoke test complete!');
  await browser.close();
})();
