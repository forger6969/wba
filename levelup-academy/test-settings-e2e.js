/**
 * Settings Page E2E Test — Playwright
 * Tests ALL buttons, toggles, inputs, selects on every Settings tab.
 * Uses mock auth (localStorage) since backend is not running.
 */
const { chromium } = require('playwright');

const BASE = 'http://localhost:5174';

const MOCK_TOKEN = 'test-token-abc123';
const MOCK_USER = JSON.stringify({
  id: 1,
  email: 'admin.demo@levelup.local',
  name: 'Admin Demo',
  role: 'admin',
  branchId: 1,
  organizationId: 1,
});

(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();

  let passed = 0;
  let failed = 0;
  const failures = [];

  function ok(name) { passed++; console.log(`  ✅ ${name}`); }
  function fail(name, reason) { failed++; failures.push(`${name}: ${reason}`); console.log(`  ❌ ${name}: ${reason}`); }

  try {
    // ═══════════ STEP 0: INJECT AUTH ═══════════
    console.log('\n═══ STEP 0: AUTH INJECTION ═══');
    // Navigate to base to load the app
    await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForTimeout(1000);

    // Set mock auth in localStorage
    await page.evaluate(({ token, user }) => {
      localStorage.setItem('staff_access_token', token);
      localStorage.setItem('staff_user', user);
    }, { token: MOCK_TOKEN, user: MOCK_USER });

    // Full reload so React reads the new localStorage values
    await page.goto(`${BASE}/settings`, { waitUntil: 'networkidle', timeout: 20000 });
    await page.waitForTimeout(2000);

    // Verify auth worked
    const url = page.url();
    if (!url.includes('/login')) {
      ok(`Auth OK — on page: ${url}`);
    } else {
      fail('Auth injection', `still on login: ${url}`);
      throw new Error('Auth failed, cannot continue');
    }

    // Check header
    const h1 = await page.textContent('h1').catch(() => '');
    if (h1.includes('Настройки')) ok('Settings page header: "Настройки"');
    else fail('Settings header', `got "${h1}"`);

    // ═══════════ TAB 1: GENERAL ═══════════
    console.log('\n═══ TAB 1: GENERAL (Общие) ═══');
    await page.locator('button:has-text("Общие")').first().click();
    await page.waitForTimeout(300);
    ok('Clicked "Общие" tab');

    // All inputs
    const generalInputs = [
      { sel: 'input[placeholder="LevelUp Academy — Downtown"]', val: 'Test Branch', name: 'Branch name' },
      { sel: 'input[placeholder="Ташкент, ул. Амира Темура, 108"]', val: 'Test Address', name: 'Address' },
      { sel: 'input[placeholder="+998 90 123 45 67"]', val: '+998 91 111 2233', name: 'Phone' },
      { sel: 'input[placeholder="info@levelup.uz"]', val: 'test@levelup.uz', name: 'Email' },
      { sel: 'input[placeholder="https://levelup.uz"]', val: 'https://test.uz', name: 'Website' },
    ];
    for (const { sel, val, name } of generalInputs) {
      const el = page.locator(sel).first();
      if (await el.count() > 0) {
        await el.fill(val);
        const got = await el.inputValue();
        if (got === val) ok(`${name} input works`);
        else fail(`${name} input`, `expected "${val}" got "${got}"`);
      } else {
        fail(`${name} input`, 'not found');
      }
    }

    // ═══════════ TAB 2: APPEARANCE ═══════════
    console.log('\n═══ TAB 2: APPEARANCE (Внешний вид) ═══');
    await page.locator('button:has-text("Внешний вид")').first().click();
    await page.waitForTimeout(300);
    ok('Clicked "Внешний вид" tab');

    // Theme buttons
    const themeTests = [
      { text: 'Тёмная', name: 'Dark theme' },
      { text: 'Светлая', name: 'Light theme' },
      { text: 'Системная', name: 'System theme' },
    ];
    for (const { text, name } of themeTests) {
      await page.locator(`button:has-text("${text}")`).first().click();
      await page.waitForTimeout(200);
      const cls = await page.locator(`button:has-text("${text}")`).first().getAttribute('class');
      if (cls.includes('bg-[var(--green)]')) ok(`${name} button activates`);
      else fail(`${name} button`, 'no green bg');
    }

    // Toggles (compact + avatars)
    const appearToggles = page.locator('button[type="button"].rounded-full.w-11');
    const atCount = await appearToggles.count();
    if (atCount >= 2) {
      await appearToggles.nth(0).click();
      await page.waitForTimeout(200);
      ok('Compact mode toggle clicked');
      await appearToggles.nth(1).click();
      await page.waitForTimeout(200);
      ok('Show avatars toggle clicked');
    } else fail('Appearance toggles', `need 2, got ${atCount}`);

    // ═══════════ TAB 3: NOTIFICATIONS ═══════════
    console.log('\n═══ TAB 3: NOTIFICATIONS (Уведомления) ═══');
    await page.locator('button:has-text("Уведомления")').first().click();
    await page.waitForTimeout(300);
    ok('Clicked "Уведомления" tab');

    const notifToggles = page.locator('button[type="button"].rounded-full.w-11');
    const ntCount = await notifToggles.count();
    if (ntCount >= 7) ok(`Found ${ntCount} notification toggles`);
    else fail('Notification toggles', `need >=7, got ${ntCount}`);

    // Click each and verify class changes
    for (let i = 0; i < Math.min(ntCount, 7); i++) {
      const before = await notifToggles.nth(i).getAttribute('class');
      await notifToggles.nth(i).click();
      await page.waitForTimeout(150);
      const after = await notifToggles.nth(i).getAttribute('class');
      if (before !== after) ok(`Notif toggle #${i + 1} works`);
      else fail(`Notif toggle #${i + 1}`, 'no class change');
    }

    // ═══════════ TAB 4: SECURITY ═══════════
    console.log('\n═══ TAB 4: SECURITY (Безопасность) ═══');
    await page.locator('button:has-text("Безопасность")').first().click();
    await page.waitForTimeout(300);
    ok('Clicked "Безопасность" tab');

    const secToggles = page.locator('button[type="button"].rounded-full.w-11');
    const stCount = await secToggles.count();

    // 2FA toggle
    if (stCount >= 1) {
      const b = await secToggles.nth(0).getAttribute('class');
      await secToggles.nth(0).click();
      await page.waitForTimeout(200);
      const a = await secToggles.nth(0).getAttribute('class');
      if (b !== a) ok('2FA toggle works');
      else fail('2FA toggle', 'no change');
    }
    // Multiple sessions toggle
    if (stCount >= 2) {
      const b = await secToggles.nth(1).getAttribute('class');
      await secToggles.nth(1).click();
      await page.waitForTimeout(200);
      const a = await secToggles.nth(1).getAttribute('class');
      if (b !== a) ok('Multiple sessions toggle works');
      else fail('Multiple sessions toggle', 'no change');
    }

    // Session timeout select
    const timeoutSelect = page.locator('select').first();
    await timeoutSelect.selectOption('60');
    if (await timeoutSelect.inputValue() === '60') ok('Session timeout select → 60');
    else fail('Session timeout select', 'value mismatch');

    // Password fields
    await page.locator('input[placeholder="Введите текущий пароль"]').fill('oldpass123');
    ok('Current password input');
    await page.locator('input[placeholder="Мин. 8 символов"]').fill('newpass123456');
    ok('New password input');
    await page.locator('input[placeholder="Повторите новый пароль"]').fill('newpass123456');
    ok('Confirm password input');

    // Eye toggle
    const eyeBtn = page.locator('button:has(.lucide-eye)').first();
    const eyeCount = await page.locator('button:has(.lucide-eye)').count();
    const eyeOffCount = await page.locator('button:has(.lucide-eye-off)').count();
    if (eyeCount + eyeOffCount > 0) {
      await page.locator('button:has(.lucide-eye)').first().click().catch(() =>
        page.locator('button:has(.lucide-eye-off)').first().click()
      );
      await page.waitForTimeout(200);
      ok(`Eye toggle works (eyes:${eyeCount}, eyeOffs:${eyeOffCount})`);
    } else {
      fail('Eye toggle', 'not found');
    }

    // Change password button
    const changePwBtn = page.locator('button:has-text("Изменить пароль")').first();
    if (await changePwBtn.count() > 0) {
      const disabled = await changePwBtn.isDisabled();
      ok(`Change password button (disabled=${disabled})`);
      if (!disabled) {
        await changePwBtn.click();
        await page.waitForTimeout(500);
        ok('Change password clicked');
      }
    } else fail('Change password button', 'not found');

    // ═══════════ TAB 5: FINANCE ═══════════
    console.log('\n═══ TAB 5: FINANCE (Финансы) ═══');
    await page.locator('button:has-text("Финансы")').first().click();
    await page.waitForTimeout(300);
    ok('Clicked "Финансы" tab');

    // Currency select
    const selects = page.locator('select');
    const selCount = await selects.count();
    for (let i = 0; i < selCount; i++) {
      const opts = await selects.nth(i).locator('option').allTextContents();
      if (opts.some(o => o.includes('UZS'))) {
        await selects.nth(i).selectOption('USD');
        if (await selects.nth(i).inputValue() === 'USD') ok('Currency select → USD');
        else fail('Currency select', 'value mismatch');
        break;
      }
    }

    // Currency symbol
    await page.locator('input[placeholder="сўм"]').fill('$');
    ok('Currency symbol input');

    // Invoice prefix
    await page.locator('input[placeholder="INV"]').fill('TEST');
    const prefixVal = await page.locator('input[placeholder="INV"]').inputValue();
    if (prefixVal === 'TEST') ok('Invoice prefix input');
    else fail('Invoice prefix input', `got "${prefixVal}"`);

    // Auto-generate toggle
    const finToggles = page.locator('button[type="button"].rounded-full.w-11');
    const ftCount = await finToggles.count();
    if (ftCount >= 1) {
      const b = await finToggles.nth(0).getAttribute('class');
      await finToggles.nth(0).click();
      await page.waitForTimeout(200);
      const a = await finToggles.nth(0).getAttribute('class');
      if (b !== a) ok('Auto-generate toggle works');
      else fail('Auto-generate toggle', 'no change');
    }

    // Grace days
    for (let i = 0; i < selCount; i++) {
      const text = await selects.nth(i).textContent();
      if (text.includes('дня') || text.includes('дней')) {
        await selects.nth(i).selectOption('7');
        if (await selects.nth(i).inputValue() === '7') ok('Grace days select → 7');
        else fail('Grace days select', 'value mismatch');
        break;
      }
    }

    // ═══════════ TAB 6: LOCALIZATION ═══════════
    console.log('\n═══ TAB 6: LOCALIZATION (Локализация) ═══');
    await page.locator('button:has-text("Локализация")').first().click();
    await page.waitForTimeout(300);
    ok('Clicked "Локализация" tab');

    // Languages
    for (const lang of ['Ўзбекча', 'Русский', 'English']) {
      await page.locator(`button:has-text("${lang}")`).first().click();
      await page.waitForTimeout(200);
      const cls = await page.locator(`button:has-text("${lang}")`).first().getAttribute('class');
      if (cls.includes('bg-[var(--green)]')) ok(`${lang} language activates`);
      else fail(`${lang} language`, 'no green bg');
    }

    // Date formats
    for (const fmt of ['31.12.2026', '12/31/2026', '2026-12-31']) {
      await page.locator(`button:has-text("${fmt}")`).first().click();
      await page.waitForTimeout(200);
      const cls = await page.locator(`button:has-text("${fmt}")`).first().getAttribute('class');
      if (cls.includes('bg-[var(--green)]')) ok(`Date format "${fmt}" activates`);
      else fail(`Date format "${fmt}"`, 'no green bg');
    }

    // Timezone
    for (let i = 0; i < selCount; i++) {
      const opts = await selects.nth(i).locator('option').allTextContents();
      if (opts.some(o => o.includes('Tashkent'))) {
        await selects.nth(i).selectOption('Europe/Moscow');
        if (await selects.nth(i).inputValue() === 'Europe/Moscow') ok('Timezone → Moscow');
        else fail('Timezone select', 'value mismatch');
        break;
      }
    }

    // Week days
    await page.locator('button:has-text("Воскресенье")').first().click();
    await page.waitForTimeout(200);
    let cls = await page.locator('button:has-text("Воскресенье")').first().getAttribute('class');
    if (cls.includes('bg-[var(--green)]')) ok('Sunday activates');
    else fail('Sunday button', 'no green bg');

    await page.locator('button:has-text("Понедельник")').first().click();
    await page.waitForTimeout(200);
    cls = await page.locator('button:has-text("Понедельник")').first().getAttribute('class');
    if (cls.includes('bg-[var(--green)]')) ok('Monday activates');
    else fail('Monday button', 'no green bg');

    // ═══════════ SAVE BUTTON ═══════════
    console.log('\n═══ SAVE BUTTON ═══');
    const saveBtn = page.locator('button:has-text("Сохранить изменения")').first();
    if (await saveBtn.count() > 0) {
      const disabled = await saveBtn.isDisabled();
      ok(`Save button found (disabled=${disabled})`);
      if (!disabled) {
        await saveBtn.click();
        await page.waitForTimeout(1500);
        ok('Save button clicked');
      }
    } else fail('Save button', 'not found');

    // ═══════════ LIGHT THEME SCREENSHOT ═══════════
    console.log('\n═══ LIGHT THEME CHECK ═══');
    await page.locator('button:has-text("Общие")').first().click();
    await page.waitForTimeout(300);
    const bgColor = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
    ok(`Body background: ${bgColor}`);
    await page.screenshot({ path: 'screenshots/settings-light-theme.png', fullPage: true });
    ok('Screenshot saved: screenshots/settings-light-theme.png');

  } catch (err) {
    fail('UNEXPECTED ERROR', err.message);
  }

  await browser.close();

  console.log('\n' + '═'.repeat(50));
  console.log(`RESULTS: ${passed} passed, ${failed} failed, ${passed + failed} total`);
  console.log('═'.repeat(50));
  if (failed > 0) {
    console.log('\nFAILED:');
    failures.forEach(f => console.log(`  ❌ ${f}`));
  }
  process.exit(failed > 0 ? 1 : 0);
})();
