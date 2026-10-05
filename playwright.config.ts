import { availableParallelism, freemem } from 'node:os';
import { defineConfig, devices } from '@playwright/test';

const playwrightPort = Number.parseInt(process.env.PLAYWRIGHT_TEST_PORT ?? '4173', 10);
const playwrightBaseUrl = `http://127.0.0.1:${playwrightPort}`;
const gibibyte = 1024 ** 3;
// Each worker owns Chrome, Node and up to three live pages. Reserve memory for
// the build/OS; use --workers=8 explicitly when measuring the known stress case.
const playwrightWorkers = Math.max(1, Math.min(
  4,
  availableParallelism(),
  Math.floor((freemem() - gibibyte) / (2 * gibibyte)),
));

export default defineConfig({
  testDir: '.',
  testMatch: ['tests/e2e/**/*.spec.ts', 'apps/web/e2e/**/*.spec.ts'],
  // Generated diagnostic copies must never become part of the release suite.
  testIgnore: ['**/output/**'],
  workers: playwrightWorkers,
  outputDir: './output/playwright/results',
  reporter: [['list'], ['html', { outputFolder: './output/playwright/report', open: 'never' }]],
  use: {
    baseURL: playwrightBaseUrl,
    serviceWorkers: 'block',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: `npm run preview -w @408os/web -- --host 127.0.0.1 --port ${playwrightPort}`,
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
