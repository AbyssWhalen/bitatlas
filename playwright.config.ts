import { defineConfig, devices } from '@playwright/test';

const playwrightPort = Number.parseInt(process.env.PLAYWRIGHT_TEST_PORT ?? '4173', 10);
const playwrightBaseUrl = `http://127.0.0.1:${playwrightPort}`;

export default defineConfig({
  testDir: '.',
  testMatch: ['tests/e2e/**/*.spec.ts', 'apps/web/e2e/**/*.spec.ts'],
  workers: 8,
  outputDir: './output/playwright/results',
  reporter: [['list'], ['html', { outputFolder: './output/playwright/report', open: 'never' }]],
  use: {
    baseURL: playwrightBaseUrl,
    serviceWorkers: 'block',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: `npm run build && npm run preview -w @408os/web -- --host 127.0.0.1 --port ${playwrightPort}`,
    url: playwrightBaseUrl,
    reuseExistingServer: process.env.PLAYWRIGHT_TEST_PORT === undefined,
  },
  projects: [
    {
      name: 'chromium-1440',
      use: { ...devices['Desktop Chrome'], channel: 'chrome', viewport: { width: 1440, height: 900 } },
    },
    {
      name: 'chromium-1366',
      use: { ...devices['Desktop Chrome'], channel: 'chrome', viewport: { width: 1366, height: 768 } },
    },
    {
      name: 'chromium-390',
      use: { ...devices['Pixel 7'], channel: 'chrome', viewport: { width: 390, height: 844 } },
    },
  ],
});
