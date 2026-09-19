import { test, expect } from '@playwright/test';

test('Full Parent panel audit', async ({ page }) => {
  const errors = [];
  const failedRequests = [];

  page.on('console', msg => {
    if (msg.type() === 'error') {
      errors.push({ text: msg.text() });
    }
  });
  page.on('requestfailed', req => {
    failedRequests.push({ url: req.url(), error: req.failure()?.errorText });
  });

  // === 1. LOGIN PAGE ===
  await page.goto('http://localhost:5175/login', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  
  console.log('\n=== LOGIN PAGE ===');
  
  const loginInputs = await page.locator('input').all();
  console.log(`Inputs: ${loginInputs.length}`);
  for (const inp of loginInputs) {
    console.log(`  type="${await inp.getAttribute('type')}" placeholder="${await inp.getAttribute('placeholder') || ''}"`);
  }

  const loginBtns = await page.locator('button').all();
  console.log(`Buttons: ${loginBtns.length}`);
  for (const btn of loginBtns) {
    const text = await btn.textContent();
    console.log(`  "${(text || '').trim()}" class="${(await btn.getAttribute('class') || '').substring(0, 80)}"`);
  }

  // === 2. TRY LOGIN ===
  const codeInput = page.locator('input').first();
  const passInput = page.locator('input[type="password"]');
  if (await codeInput.isVisible()) {
    await codeInput.fill('demopare');
  }
  if (await passInput.isVisible()) {
    await passInput.fill('654321');
  }
  
  const submitBtn = page.locator('button[type="submit"], button:has-text("Войти"), button:has-text("Kirish"), button:has-text("Login")').first();
  if (await submitBtn.isVisible()) {
    await submitBtn.click();
    await page.waitForURL('**/dashboard', { timeout: 10000 }).catch(() => {});
    await page.waitForTimeout(2000);
  }

  console.log(`\n📍 After login URL: ${page.url()}`);

  // === 3. DASHBOARD ===
  if (page.url().includes('/dashboard')) {
    console.log('\n=== DASHBOARD ===');
    const dashText = await page.locator('body').innerText();
    console.log(`Content preview: ${dashText.substring(0, 1500)}...`);

    // Navigation sidebar
    const navLinks = await page.locator('nav a, [class*="sidebar"] a, aside a').all();
    console.log(`\nNav links: ${navLinks.length}`);
    for (const link of navLinks) {
      const text = await link.textContent();
      const href = await link.getAttribute('href') || '';
      if (await link.isVisible()) console.log(`  "${(text || '').trim()}" → ${href}`);
    }

    // Child selector
    const selects = await page.locator('select').all();
    console.log(`\nSelect dropdowns: ${selects.length}`);
    for (const sel of selects) {
      const options = await sel.locator('option').all();
      for (const opt of options) {
        const selected = await opt.evaluate(el => el.selected);
        console.log(`  ${await opt.textContent()}${selected ? ' ✓' : ''}`);
      }
    }
  }

  // === 4. NAVIGATE ALL PAGES ===
  const pages = ['/attendance', '/grades', '/debt', '/chat', '/notifications'];
  for (const p of pages) {
    await page.goto(`http://localhost:5175${p}`, { waitUntil: 'domcontentloaded', timeout: 15000 }).catch(() => {});
    await page.waitForTimeout(2000);
    console.log(`\n📍 ${p} — URL: ${page.url()}`);
    const text = await page.locator('body').innerText().catch(() => 'ERROR');
    console.log(`  Content: ${text.substring(0, 800)}`);
  }

  // === 5. REPORT ===
  console.log(`\n${'='.repeat(50)}`);
  console.log(`🚨 CONSOLE ERRORS: ${errors.length}`);
  errors.forEach(e => console.log(`  - ${e.text}`));
  console.log(`🚨 NETWORK FAILURES: ${failedRequests.length}`);
  failedRequests.forEach(r => console.log(`  - ${r.url}: ${r.error}`));
  console.log('✅ ALL CHECKS DONE');
  console.log(`${'='.repeat(50)}`);
});
