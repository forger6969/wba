import { chromium } from 'playwright';

const BASE = 'http://localhost:5174';

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });

  console.log('1. Opening login page...');
  await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: 'screenshots/01-login.png' });
  console.log('   Screenshot: screenshots/01-login.png');

  console.log('2. Filling email...');
  const emailInput = page.locator('input[type="email"], input[name="email"], input[placeholder*="mail"]').first();
  await emailInput.fill('hp8187081014laptop@gmail.com');

  console.log('3. Filling password...');
  const pwInput = page.locator('input[type="password"]').first();
  await pwInput.fill('ChangeMe123!');

  await page.screenshot({ path: 'screenshots/02-filled.png' });
  console.log('   Screenshot: screenshots/02-filled.png');

  console.log('4. Clicking login button...');
  const loginBtn = page.locator('button[type="submit"], button:has-text("Войти")').first();
  await loginBtn.click();

  // Wait for navigation after login
  await page.waitForTimeout(3000);
  await page.screenshot({ path: 'screenshots/03-after-login.png' });
  console.log(`   Current URL: ${page.url()}`);
  console.log('   Screenshot: screenshots/03-after-login.png');

  // Check if we're logged in
  const currentUrl = page.url();
  if (currentUrl.includes('/login')) {
    console.log('   ⚠️ Still on login page — checking for errors...');
    const errorEl = page.locator('[role="alert"], .alert-error').first();
    if (await errorEl.isVisible()) {
      console.log(`   Error: ${await errorEl.textContent()}`);
    }
  } else {
    console.log('   ✅ Logged in successfully!');
  }

  // Navigate to admin pages
  const pages_to_test = [
    { url: '/', name: 'Dashboard' },
    { url: '/students', name: 'Students' },
    { url: '/groups', name: 'Groups' },
    { url: '/payments', name: 'Payments' },
    { url: '/expenses', name: 'Expenses' },
    { url: '/mentors', name: 'Mentors' },
    { url: '/reports', name: 'Reports' },
    { url: '/settings', name: 'Settings' },
    { url: '/chat', name: 'Chat' },
  ];

  for (const p of pages_to_test) {
    console.log(`\n5. Navigating to ${p.name} (${p.url})...`);
    await page.goto(`${BASE}${p.url}`, { waitUntil: 'domcontentloaded', timeout: 10000 }).catch(() => {});
    await page.waitForTimeout(1500);
    const screenshotName = p.name.toLowerCase().replace(/\s+/g, '-');
    await page.screenshot({ path: `screenshots/04-${screenshotName}.png` });
    console.log(`   URL: ${page.url()}`);
    console.log(`   Screenshot: screenshots/04-${screenshotName}.png`);

    // Check for console errors
    const errors = [];
    page.on('pageerror', (err) => errors.push(err.message));
    if (errors.length > 0) {
      console.log(`   ⚠️ Console errors: ${errors.join(', ')}`);
    }
  }

  console.log('\n✅ Smoke test complete!');
  await browser.close();
})();
