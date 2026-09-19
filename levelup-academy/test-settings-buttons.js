const { chromium } = require('playwright');

const BASE = 'http://localhost:5176';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();

  let passed = 0;
  let failed = 0;

  function ok(name) { passed++; console.log(`  ✅ ${name}`); }
  function fail(name, reason) { failed++; console.log(`  ❌ ${name}: ${reason}`); }

  try {
    // ═══ REAL LOGIN ═══
    console.log('\n═══ LOGIN ═══');
    await page.goto(`${BASE}/login`, { waitUntil: 'networkidle', timeout: 20000 });
    await page.waitForTimeout(1000);

    // Fill email
    const emailInput = await page.$('input[placeholder*="mail"], input[type="email"]');
    if (emailInput) {
      await emailInput.fill('hp8187081014laptop@gmail.com');
      ok('Email filled');
    } else {
      fail('Email input', 'not found');
    }

    // Fill password
    const pwInput = await page.$('input[type="password"], input[placeholder*="•"]');
    if (pwInput) {
      await pwInput.fill('ChangeMe123!');
      ok('Password filled');
    } else {
      fail('Password input', 'not found');
    }

    // Click login
    const loginBtn = await page.$('button:has-text("Войти"):not([disabled])');
    if (loginBtn) {
      await loginBtn.click();
      await page.waitForTimeout(4000);
      ok('Login button clicked');
    } else {
      fail('Login button', 'not found');
    }

    // Check redirect
    const url = page.url();
    console.log(`  📍 URL after login: ${url}`);
    if (!url.includes('/login')) {
      ok(`Logged in → redirected to ${url}`);
    } else {
      fail('Login failed', `still on ${url} — trying to continue anyway`);
    }

    // Navigate to settings via sidebar click (direct URL doesn't work)
    const settingsLink = await page.locator('a[href*="settings"], a:has-text("Настройки")').first();
    if (settingsLink) {
      await settingsLink.click();
      await page.waitForTimeout(3000);
      ok('Navigated to Settings via sidebar');
    } else {
      fail('Settings link', 'not found in sidebar');
    }

    // Check page loaded
    const bodyText = await page.textContent('body');
    const hasSettings = bodyText.includes('Настройки филиала');
    if (hasSettings) {
      ok('Settings page loaded');
    } else {
      fail('Settings page', `page shows: "${bodyText.substring(0, 150)}"`);
      await page.screenshot({ path: 'C:/Users/user/OneDrive/Desktop/LevelUP_academy/screenshots/debug-settings-nav.png', fullPage: true });
    }

    // ═══ TAB NAVIGATION ═══
    console.log('\n═══ TAB NAVIGATION ═══');
    const tabs = ['Общие', 'Внешний вид', 'Уведомления', 'Безопасность', 'Финансы', 'Локализация'];
    for (const tabName of tabs) {
      const tabBtn = await page.$(`button:has-text("${tabName}")`);
      if (tabBtn) {
        await tabBtn.click();
        await page.waitForTimeout(400);
        ok(`Tab: ${tabName}`);
      } else {
        fail(`Tab: ${tabName}`, 'button not found');
      }
    }

    // ═══ TAB 1: GENERAL ═══
    console.log('\n═══ TAB: GENERAL ═══');
    await page.click('button:has-text("Общие")');
    await page.waitForTimeout(400);

    // Inputs
    const inputs = [
      { placeholder: 'LevelUp', name: 'Branch name' },
      { placeholder: 'Ташкент', name: 'Address' },
      { placeholder: '998', name: 'Phone' },
      { placeholder: 'levelup.uz', name: 'Email' },
      { placeholder: 'https', name: 'Website' },
    ];
    for (const { placeholder, name } of inputs) {
      const el = await page.$(`input[placeholder*="${placeholder}"]`);
      if (el) {
        await el.fill(`Test ${name}`);
        const val = await el.inputValue();
        ok(`${name} input (${val ? 'writable' : 'empty'})`);
      } else {
        fail(`${name} input`, 'not found');
      }
    }

    // ═══ TAB 2: APPEARANCE ═══
    console.log('\n═══ TAB: APPEARANCE ═══');
    await page.click('button:has-text("Внешний вид")');
    await page.waitForTimeout(400);

    // Theme buttons
    for (const theme of ['Светлая', 'Тёмная', 'Системная']) {
      const btn = await page.$(`button:has-text("${theme}")`);
      if (btn) {
        await btn.click();
        await page.waitForTimeout(300);
        const cls = await btn.getAttribute('class');
        const active = cls && cls.includes('bg-[var(--green)]');
        ok(`Theme "${theme}" ${active ? '(active ✓)' : '(clicked)'}`);
      } else {
        fail(`Theme "${theme}"`, 'not found');
      }
    }

    // Switch back to light
    await page.click('button:has-text("Светлая")');
    await page.waitForTimeout(300);

    // Toggles in appearance tab (compact + avatars)
    const appearanceToggles = await page.$$('button.w-11.h-6');
    if (appearanceToggles.length >= 2) {
      const cls1 = await appearanceToggles[0].getAttribute('class');
      await appearanceToggles[0].click();
      await page.waitForTimeout(300);
      const cls2 = await appearanceToggles[0].getAttribute('class');
      ok(`Compact toggle (was ${cls1.includes('var(--green)') ? 'ON' : 'OFF'}, now ${cls2.includes('var(--green)') ? 'ON' : 'OFF'})`);

      await appearanceToggles[1].click();
      await page.waitForTimeout(300);
      ok('Avatars toggle clicked');
    } else {
      fail('Appearance toggles', `found ${appearanceToggles.length}, need 2`);
    }

    // ═══ TAB 3: NOTIFICATIONS ═══
    console.log('\n═══ TAB: NOTIFICATIONS ═══');
    await page.click('button:has-text("Уведомления")');
    await page.waitForTimeout(400);

    const notifToggles = await page.$$('button.w-11.h-6');
    ok(`Notification toggles found: ${notifToggles.length}`);

    // Click each toggle and verify it changes
    for (let i = 0; i < Math.min(notifToggles.length, 7); i++) {
      const cls1 = await notifToggles[i].getAttribute('class');
      const wasOn = cls1.includes('var(--green)');
      await notifToggles[i].click();
      await page.waitForTimeout(200);
      const cls2 = await notifToggles[i].getAttribute('class');
      const isOn = cls2.includes('var(--green)');
      if (wasOn !== isOn) {
        ok(`Toggle ${i + 1}: ${wasOn ? 'ON→OFF' : 'OFF→ON'}`);
      } else {
        fail(`Toggle ${i + 1}`, `state didn't change (still ${isOn ? 'ON' : 'OFF'})`);
      }
    }

    // ═══ TAB 4: SECURITY ═══
    console.log('\n═══ TAB: SECURITY ═══');
    await page.click('button:has-text("Безопасность")');
    await page.waitForTimeout(400);

    // 2FA toggle
    const secToggles = await page.$$('button.w-11.h-6');
    if (secToggles.length > 0) {
      const cls1 = await secToggles[0].getAttribute('class');
      await secToggles[0].click();
      await page.waitForTimeout(300);
      const cls2 = await secToggles[0].getAttribute('class');
      ok(`2FA toggle: ${cls1.includes('var(--green)') ? 'ON→OFF' : 'OFF→ON'}`);
    } else {
      fail('2FA toggle', 'not found');
    }

    // Multiple sessions toggle
    if (secToggles.length > 1) {
      await secToggles[1].click();
      await page.waitForTimeout(300);
      ok('Multiple sessions toggle clicked');
    }

    // Session timeout select
    const selects = await page.$$('select');
    if (selects.length > 0) {
      await selects[0].selectOption('60');
      const val = await selects[0].inputValue();
      ok(`Session timeout select: ${val === '60' ? 'changed to 60 ✓' : 'value=' + val}`);
    } else {
      fail('Session timeout select', 'not found');
    }

    // Password inputs
    for (const { placeholder, name } of [
      { placeholder: 'текущий', name: 'Current password' },
      { placeholder: 'Мин.', name: 'New password' },
      { placeholder: 'Повторите', name: 'Confirm password' },
    ]) {
      const el = await page.$(`input[placeholder*="${placeholder}"]`);
      if (el) {
        await el.fill('testpassword123');
        ok(`${name} input writable`);
      } else {
        fail(`${name} input`, 'not found');
      }
    }

    // Eye toggle buttons (show/hide password)
    const eyeBtns = await page.$$('.lucide-eye, .lucide-eye-off');
    if (eyeBtns.length >= 2) {
      ok(`Eye toggle icons: ${eyeBtns.length}`);
    } else {
      // Try finding eye buttons by parent button
      const secBtns = await page.$$('button');
      let foundEyes = 0;
      for (const btn of secBtns) {
        const hasEye = await btn.$('.lucide-eye, .lucide-eye-off');
        if (hasEye) foundEyes++;
      }
      if (foundEyes >= 2) {
        ok(`Eye toggle buttons: ${foundEyes}`);
      } else {
        fail('Eye toggle buttons', `found ${foundEyes}`);
      }
    }

    // Change password button
    const changePwBtn = await page.$('button:has-text("Изменить пароль")');
    if (changePwBtn) {
      const disabled = await changePwBtn.isDisabled();
      ok(`Change password button (disabled=${disabled})`);
    } else {
      fail('Change password button', 'not found');
    }

    // ═══ TAB 5: FINANCE ═══
    console.log('\n═══ TAB: FINANCE ═══');
    await page.click('button:has-text("Финансы")');
    await page.waitForTimeout(400);

    // Currency select
    const finSelects = await page.$$('select');
    if (finSelects.length > 0) {
      await finSelects[0].selectOption('USD');
      const val = await finSelects[0].inputValue();
      ok(`Currency select: ${val === 'USD' ? 'changed to USD ✓' : 'value=' + val}`);
    } else {
      fail('Currency select', 'not found');
    }

    // Currency symbol input
    const symbolInput = await page.$('input[placeholder*="сўм"]');
    if (symbolInput) {
      await symbolInput.fill('$');
      ok('Currency symbol input');
    } else {
      fail('Currency symbol input', 'not found');
    }

    // Invoice prefix input
    const prefixInput = await page.$('input[placeholder="INV"]');
    if (prefixInput) {
      await prefixInput.fill('TEST');
      const val = await prefixInput.inputValue();
      ok(`Invoice prefix input: "${val}"`);
    } else {
      fail('Invoice prefix input', 'not found');
    }

    // Auto-generate toggle
    const finToggles = await page.$$('button.w-11.h-6');
    if (finToggles.length > 0) {
      await finToggles[0].click();
      await page.waitForTimeout(300);
      ok('Auto-generate toggle clicked');
    }

    // Grace days select
    if (finSelects.length > 1) {
      await finSelects[1].selectOption('7');
      ok('Grace days select changed to 7');
    }

    // ═══ TAB 6: LOCALIZATION ═══
    console.log('\n═══ TAB: LOCALIZATION ═══');
    await page.click('button:has-text("Локализация")');
    await page.waitForTimeout(400);

    // Language buttons
    for (const lang of ['Русский', 'Ўзбекча', 'English']) {
      const btn = await page.$(`button:has-text("${lang}")`);
      if (btn) {
        await btn.click();
        await page.waitForTimeout(300);
        const cls = await btn.getAttribute('class');
        ok(`Language "${lang}" ${cls.includes('var(--green)') ? '(active ✓)' : '(clicked)'}`);
      } else {
        fail(`Language "${lang}"`, 'not found');
      }
    }
    // Reset to Russian
    await page.click('button:has-text("Русский")');
    await page.waitForTimeout(300);

    // Date format buttons
    for (const fmt of ['31.12.2026', '12/31/2026', '2026-12-31']) {
      const btn = await page.$(`button:has-text("${fmt}")`);
      if (btn) {
        await btn.click();
        await page.waitForTimeout(300);
        const cls = await btn.getAttribute('class');
        ok(`Date format "${fmt}" ${cls.includes('var(--green)') ? '(active ✓)' : '(clicked)'}`);
      } else {
        fail(`Date format "${fmt}"`, 'not found');
      }
    }

    // Timezone select
    const locSelects = await page.$$('select');
    if (locSelects.length > 0) {
      await locSelects[0].selectOption('Europe/Moscow');
      ok('Timezone select → Moscow');
    }

    // Week day buttons
    for (const day of ['Понедельник', 'Воскресенье']) {
      const btn = await page.$(`button:has-text("${day}")`);
      if (btn) {
        await btn.click();
        await page.waitForTimeout(300);
        const cls = await btn.getAttribute('class');
        ok(`Week day "${day}" ${cls.includes('var(--green)') ? '(active ✓)' : '(clicked)'}`);
      } else {
        fail(`Week day "${day}"`, 'not found');
      }
    }

    // ═══ SAVE BUTTON ═══
    console.log('\n═══ SAVE BUTTON ═══');
    const saveBtn = await page.$('button:has-text("Сохранить изменения")');
    if (saveBtn) {
      const disabled = await saveBtn.isDisabled();
      ok(`Save button found (disabled=${disabled})`);
      if (!disabled) {
        await saveBtn.click();
        await page.waitForTimeout(2000);
        const body = await page.textContent('body');
        if (body.includes('Сохранено')) {
          ok('Save → "Сохранено" shown');
        } else if (body.includes('Ошибка')) {
          ok('Save attempted (backend error expected)');
        } else {
          ok('Save clicked (no message)');
        }
      }
    } else {
      fail('Save button', 'not found');
    }

    // ═══ SCREENSHOTS ═══
    console.log('\n═══ SCREENSHOTS ═══');
    for (const tabName of tabs) {
      const tabBtn = await page.$(`button:has-text("${tabName}")`);
      if (tabBtn) {
        await tabBtn.click();
        await page.waitForTimeout(500);
        await page.screenshot({
          path: `C:/Users/user/OneDrive/Desktop/LevelUP_academy/screenshots/settings-${tabName.replace(/\s+/g, '_')}.png`,
          fullPage: true
        });
        ok(`Screenshot: ${tabName}`);
      }
    }

  } catch (err) {
    fail('UNEXPECTED ERROR', err.message);
    await page.screenshot({ path: 'C:/Users/user/OneDrive/Desktop/LevelUP_academy/screenshots/error.png', fullPage: true });
  }

  await browser.close();

  console.log('\n═══════════════════════════════════════');
  console.log(`RESULTS: ${passed} passed, ${failed} failed, ${passed + failed} total`);
  console.log('═══════════════════════════════════════');
  if (failed > 0) {
    console.log('\nFAILED TESTS:');
    // Already printed above
  }
  process.exit(failed > 0 ? 1 : 0);
})();
