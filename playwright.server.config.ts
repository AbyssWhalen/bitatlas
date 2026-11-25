import { defineConfig, devices } from '@playwright/test';
export default defineConfig({
  testDir: './tests/server-e2e', timeout: 60_000, workers: 2,
  outputDir: './output/server-implementation-2026-11-20/browser-results',
  reporter: [['list'], ['html', { outputFolder: './output/server-implementation-2026-11-20/browser-report', open: 'never' }]],
  use: { baseURL: 'http://127.0.0.1:4323', serviceWorkers: 'allow', trace: 'retain-on-failure', screenshot: 'only-on-failure' },
  webServer: { command: 'npx tsx tools/verification/server-browser.ts', url: 'http://127.0.0.1:4323/api/v1/health', reuseExistingServer: false },
  projects: [
    { name: 'server-desktop', use: { ...devices['Desktop Chrome'], channel: 'chrome', viewport: { width: 1440, height: 900 } } },
    { name: 'server-mobile', use: { ...devices['Pixel 7'], channel: 'chrome', viewport: { width: 390, height: 844 } } },
  ],
});
