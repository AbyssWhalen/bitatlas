import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from '@playwright/test';
import localConfig from '../../playwright.config';
import serverConfig from '../../playwright.server.config';

const root = fileURLToPath(new URL('../../', import.meta.url));
const run = process.env.BITATLAS_INTEGRATED_BATCH;
if (!run || !/^[a-z0-9-]+$/.test(run)) throw new Error('Use ui-integrated-e2e.mjs with a new batch label.');
const dir = path.join(root, 'output/playwright/opus-ui-2026-11-22/stage-4-integrated', run);
const isServer = process.env.BITATLAS_INTEGRATED_MODE === 'server';
const base = isServer ? serverConfig : localConfig;
export default defineConfig({
  ...base, webServer: undefined, workers: 1, retries: 0,
  testDir: isServer ? path.join(dir, 'server-spec') : root,
  testMatch: isServer ? ['**/account-flow.spec.ts'] : localConfig.testMatch,
  testIgnore: isServer ? [] : ['**/output/**', '**/*-lab.spec.ts', '**/*-labs.spec.ts'],
  // Four lab-specific cases live inside non-lab specs and take lab screenshots.
  grepInvert: isServer ? undefined : /keeps all number-lab modes|keeps the RV32I bit ruler|uses the strict CPU number lab|encodes and decodes RV32I/,
  outputDir: path.join(dir, 'results'),
  reporter: [['list'], ['json', { outputFile: path.join(dir, 'report.json') }]],
  use: { ...base.use, baseURL: `http://127.0.0.1:${isServer ? 4349 : 4351}` },
});
