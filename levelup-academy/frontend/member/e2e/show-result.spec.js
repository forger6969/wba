import { test } from '@playwright/test';

test('Show Parent panel result', async ({ page }) => {
  const errors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') errors.push(msg.text());
  });

  // 1. Login page
  await page.goto('http://localhost:5175/login', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: 'screenshots/final-01-login.png', fullPage: true });

  // 2. Login
  await page.locator('input').first().fill('demopare');
  await page.locator('input[type="password"]').fill('654321');
  await page.locator('button[type="submit"]').click();
  await page.waitForURL('**/dashboard', { timeout: 10000 }).catch(() => {});
  await page.waitForTimeout(2000);
  await page.screenshot({ path: 'screenshots/final-02-dashboard.png', fullPage: true });

  // 3. Other pages
  const pages = ['/attendance', '/grades', '/debt', '/chat', '/notifications'];
  for (const p of pages) {
    await page.goto(`http://localhost:5175${p}`, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForTimeout(2000);
    const name = p.replace('/', '');
    await page.screenshot({ path: `screenshots/final-${name}.png`, fullPage: true });
  }

  console.log('\n=== SCREENSHOTS CAPTURED ===');
  console.log('✅ final-01-login.png');
  console.log('✅ final-02-dashboard.png');
  console.log('✅ final-attendance.png');
  console.log('✅ final-grades.png');
  console.log('✅ final-debt.png');
  console.log('✅ final-chat.png');
  console.log('✅ final-notifications.png');
  console.log(`Errors: ${errors.length}`);
});
