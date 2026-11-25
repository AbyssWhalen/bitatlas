import path from 'node:path';
import { existsSync } from 'node:fs';
import { defineConfig } from '@playwright/test';
import base from '../../playwright.config';

// Isolated output and preview server; root config and product dependencies unchanged.
const evidence = path.resolve('output/playwright/opus-ui-2026-11-22/stage-2-theme');
const run = process.env.BITATLAS_UI_E2E_RUN ?? '2';
const build = process.env.BITATLAS_UI_E2E_BUILD ?? 'build-local-2';
if (!/^[a-z0-9-]+$/.test(run) || !/^build-local-[a-z0-9-]+$/.test(build)) {
  throw new Error('E2E run/build must be safe evidence-directory names.');
}
const output = path.join(evidence, `e2e-results-${run}`);
// Workers re-import the config after Playwright creates outputDir. The parent
// guard runs once; the inherited marker avoids rejecting that same active run.
const guardKey = `BITATLAS_UI_E2E_GUARD_${run.replaceAll('-', '_')}`;
if (!process.env[guardKey]) {
  if (existsSync(output)) throw new Error(`Use a fresh BITATLAS_UI_E2E_RUN; evidence already exists: ${output}`);
  process.env[guardKey] = 'active';
}
const port = 4351;
export default defineConfig({
  ...base,
  testDir: path.resolve('.'),
  testMatch: [
    'apps/web/e2e/study-flow.spec.ts',
    'tests/e2e/study-flow.spec.ts',
    'tests/e2e/visual.spec.ts',
    'tests/e2e/learning-loop.spec.ts',
    'tests/e2e/code-only-mode.spec.ts',
    'tests/e2e/mock-exam.spec.ts',
    'tests/e2e/data-structures-lab.spec.ts',
  ],
  outputDir: output,
  reporter: [
    ['list'],
    ['json', { outputFile: path.join(evidence, `e2e-${run}.json`) }],
  ],
  use: { ...base.use, baseURL: `http://127.0.0.1:${port}` },
  projects: base.projects?.map((project) => ({ ...project, name: `stage2-${run}-${project.name}` })),
  webServer: {
    command: `npm run preview -w @408os/web -- --host 127.0.0.1 --port ${port} --outDir=${path.join(evidence, build).replaceAll('\\', '/')}`,
    url: `http://127.0.0.1:${port}`,
    reuseExistingServer: false,
  },
});
