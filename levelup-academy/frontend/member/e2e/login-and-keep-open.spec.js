import { test } from '@playwright/test';

test('Login and keep browser open for manual viewing', async ({ page }) => {
  // Login page
  await page.goto('http://localhost:5175/login', { waitUntil: 'networkidle' });
  
  // Fill login form
  await page.locator('input').first().fill('demopare');
  await page.locator('input[type="password"]').fill('654321');
  await page.locator('button[type="submit"]').click();
  
  // Wait for redirect to dashboard
  await page.waitForURL('**/dashboard', { timeout: 10000 });
  await page.waitForTimeout(2000);
  
  // Keep browser open - pause for manual inspection
  await page.pause();
});