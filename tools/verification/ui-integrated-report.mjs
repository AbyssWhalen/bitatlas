import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { gunzipSync } from 'node:zlib';
import { evidence, sha256 } from './ui-integrated-browser.mjs';

const load = async (...parts) => JSON.parse(await readFile(path.join(evidence, ...parts), 'utf8'));
const destination = process.argv[2] ?? 'delivery';
assert.match(destination, /^[a-z0-9-]+$/);
const views = [], failedText = [], batchStops = [], cases = new Set(), pageErrors = [];
for (const theme of ['day', 'night']) for (const width of [1440, 390]) {
  for (const run of [`matrix-1-${theme}-${width}`, `matrix-tail-${theme}-${width}`]) {
    const receipt = await load(run, 'receipt.json');
    batchStops.push(...receipt.errors.map(e => ({ run, route: e.route, message: e.message })));
    pageErrors.push(...receipt.pageErrors.map(e => ({ run, ...e })));
    for (const r of receipt.results) {
      const key = `${theme}-${width}-${r.key}`;
      assert(!cases.has(key)); cases.add(key);
      const bytes = await readFile(path.join(evidence, run, `${r.key}.png`));
      assert.equal(sha256(bytes), r.screenshot.sha256);
      const detail = JSON.parse(gunzipSync(await readFile(path.join(evidence, run, `${r.key}-contrast.json.gz`))));
      assert.equal(detail.records.length, r.textChecked);
      assert.equal(detail.records.filter(t => !t.pass).length, r.failures.length);
      for (const f of r.failures) failedText.push({ run, key, ...f });
      views.push({ run, theme, width, key: r.key, text: r.textChecked, docOverflow: r.rootOverflow, mainOverflow: r.mainOverflow,
        minimum: r.min, failed: r.failures.length, screenshot: `${run}/${r.key}.png`, sha256: r.screenshot.sha256 });
    }
  }
}
const surfaces = [...new Set(views.map(r => r.key.replace(/-\d+px$/, '')))].sort();
assert.equal(surfaces.length, 14);
for (const theme of ['day', 'night']) for (const width of [1440, 390]) for (const route of surfaces) for (const size of [18, 24]) {
  assert(cases.has(`${theme}-${width}-${route}-${size}px`));
}
const getSpecs = suite => [...(suite.specs ?? []), ...(suite.suites ?? []).flatMap(getSpecs)];
const e2e = [];
for (const project of ['chromium-1440', 'chromium-1366', 'chromium-390', 'server-desktop', 'server-mobile']) {
  const dir = `e2e-1-${project}`, r = await load(dir, 'report.json'), batch = await load(dir, 'batch.json');
  const tests = r.suites.flatMap(getSpecs).flatMap(s => s.tests);
  const actualWorkers = new Set(tests.flatMap(t => t.results).map(a => a.parallelIndex));
  e2e.push({ project, exit: batch.exitCode, configuredWorkers: r.config.workers, actualConcurrentSlots: actualWorkers.size,
    passed: r.stats.expected, failed: r.stats.unexpected, skipped: r.stats.skipped, flaky: r.stats.flaky,
    reportedTests: tests.length, seconds: Math.round(r.stats.duration) / 1000, path: `${dir}/report.json` });
}
const discovery = await load('all-local-discovery.json');
const declared = discovery.suites.flatMap(getSpecs);
const expected = declared.flatMap(s => s.tests).length;
const labOnly = discovery.suites.filter(s => /-labs?\.spec\.ts$/.test(s.file));
const labOnlyCases = labOnly.flatMap(getSpecs).flatMap(s => s.tests).length;
const register = await load('register-2', 'receipt.json');
const shell = await load('shell-1', 'receipt.json');
const startups = [];
for (const mode of ['local', 'server']) startups.push(...await load('matrix-1-day-1440', `startup-${mode}`, 'theme-startup.json'));
const vitest = await load('vitest-1.json'), lint = await load('lint-final.json');
const summary = {
  label: 'stage-4-integrated-2026-11-24', acceptancePassed: failedText.length === 0 && e2e.every(b => b.exit === 0)
    && pageErrors.length === 0 && views.every(v => v.docOverflow <= 0 && !(v.mainOverflow > 0)) && register.passed && shell.passed,
  builds: shell.builds, lint: { files: lint.length, errors: lint.reduce((n, f) => n + f.errorCount, 0), warnings: lint.reduce((n, f) => n + f.warningCount, 0) },
  typecheck: await load('typecheck-2.json'), vitest: { files: vitest.testResults.length, passed: vitest.numPassedTests, failed: vitest.numFailedTests,
    skipped: vitest.numPendingTests, todo: vitest.numTodoTests }, e2e,
  discoveredLocal: expected, excludedLocal: { labSpecFiles: labOnly.length, labSpecCases: labOnlyCases,
    labCasesInMixedFiles: expected - labOnlyCases - e2e.filter(e => e.project.startsWith('chromium')).reduce((n, e) => n + e.reportedTests, 0) },
  matrix: { surfaces, cases: views.length, text: views.reduce((s, v) => s + v.text, 0), failures: failedText,
    rootOverflow: views.filter(v => v.docOverflow > 0).length, mainOverflow: views.filter(v => v.mainOverflow > 0).length,
    noMain: views.filter(v => v.mainOverflow === null).length, pageErrors, views, interruptedAttempts: batchStops },
  startup: { modeChecks: startups.length, modePass: startups.filter(c => c.passed).length, routeCases: shell.frames.length, routePass: shell.frames.filter(c => c.pass).length },
  register: { passed: register.checks.filter(c => c.pass).length, failed: register.checks.filter(c => !c.pass).length, path: 'register-2/receipt.json' },
  sync: shell.sync, serviceClose: await load('services-closed.json'), priorityScreenshots: (await load('priority-1', 'receipt.json')).shots,
};
await writeFile(path.join(evidence, `${destination}.json`), `${JSON.stringify(summary, null, 2)}\n`, { flag: 'wx' });
console.log(JSON.stringify({ acceptancePassed: summary.acceptancePassed, matrix: cases.size, text: summary.matrix.text, failedText: failedText.length,
  e2e: e2e.reduce((s, r) => s + r.passed, 0), excluded: summary.excludedLocal, lint: summary.lint }));
