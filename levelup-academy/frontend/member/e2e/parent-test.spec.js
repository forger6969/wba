import { test } from '@playwright/test';

test('Open Parent panel and capture screenshots', async ({ page }) => {
  const errors = [];
  const requests = [];

  page.on('console', msg => {
    if (msg.type() === 'error') {
      errors.push(msg.text());
      console.log(`🚨 CONSOLE ERROR: ${msg.text()}`);
    }
  });

  page.on('requestfailed', request => {
    const err = `${request.url()} — ${request.failure()?.errorText}`;
    requests.push(err);
    console.log(`🚨 NETWORK FAIL: ${err}`);
  });

  // 1. Open login page
  await page.goto('http://localhost:5175', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: 'screenshots/01-login-page.png', fullPage: true });
  console.log('✅ 01-login-page.png');

  // 2. Try to log in as parent (demopare / 654321)
  const loginCodeInput = page.locator('input').first();
  const passwordInput = page.locator('input[type="password"]');
  
  if (await loginCodeInput.isVisible()) {
    await loginCodeInput.fill('demopare');
    if (await passwordInput.isVisible()) {
      await passwordInput.fill('654321');
    }
    // Try clicking the login button
    const loginBtn = page.locator('button[type="submit"], button:has-text("Kirish"), button:has-text("Login")').first();
    if (await loginBtn.isVisible()) {
      await loginBtn.click();
      await page.waitForTimeout(3000);
    }
  }

  await page.screenshot({ path: 'screenshots/02-after-login.png', fullPage: true });
  console.log('✅ 02-after-login.png');

  // 3. Check what URL we're on
  console.log(`📍 Current URL: ${page.url()}`);

  // Print all errors found
  if (errors.length > 0 || requests.length > 0) {
    console.log('\n⚠️ ERRORS FOUND:');
    errors.forEach(e => console.log(`  - ${e}`));
    console.log('\n⚠️ NETWORK FAILURES:');
    requests.forEach(r => console.log(`  - ${r}`));
  } else {
    console.log('\n✅ No errors found!');
  }
});
