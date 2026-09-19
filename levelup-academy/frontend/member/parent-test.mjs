import { chromium } from '@playwright/test';

const browser = await chromium.launch({ headless: false });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

// 1. Login page
await page.goto('http://localhost:5175');
await page.waitForTimeout(2000);
await page.screenshot({ path: 'screenshots/01-login-page.png', fullPage: true });
console.log('✅ 01-login-page.png — Login page captured');

// 2. Try logging in with demo parent credentials
// Check if there's a login form
const form = await page.$('form');
if (form) {
  const inputs = await page.$$('input');
  console.log(`Found ${inputs.length} input fields`);
  
  // Fill in parent credentials
  for (const input of inputs) {
    const type = await input.getAttribute('type');
    const placeholder = await input.getAttribute('placeholder');
    console.log(`Input type=${type}, placeholder=${placeholder}`);
  }
}

// Get console messages
page.on('console', msg => {
  if (msg.type() === 'error') {
    console.log(`🚨 CONSOLE ERROR: ${msg.text()}`);
  }
});

// Get all network requests
page.on('requestfailed', request => {
  console.log(`🚨 NETWORK FAILED: ${request.url()} — ${request.failure()?.errorText}`);
});

await page.waitForTimeout(3000);
await browser.close();
