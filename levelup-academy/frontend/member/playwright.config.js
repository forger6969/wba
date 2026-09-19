import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 60000,
  use: {
    browserName: 'chromium',
    headless: false,
    viewport: { width: 1440, height: 900 },
  },
});
