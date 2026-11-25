import assert from 'node:assert/strict';
import path from 'node:path';
import { readFile } from 'node:fs/promises';
import { chromium } from 'playwright';
import { assertBuild, evidence, fresh, json, local, login, openPage, server } from './ui-integrated-browser.mjs';

const [label] = process.argv.slice(2), dir = await fresh(label);
const browser = await chromium.launch({ channel: 'chrome' });
const report = { builds: { local: await assertBuild(local, 'local'), server: await assertBuild(server, 'server') }, frames: [], sync: {}, errors: [] };
try {
  for (const width of [1440, 390]) for (const theme of ['day', 'night']) {
    const runs = [`matrix-1-${theme}-${width}`, `matrix-tail-${theme}-${width}`];
    const routes = new Map();
    for (const run of runs) {
      const receipt = JSON.parse(await readFile(path.join(evidence, run, 'receipt.json'), 'utf8'));
      for (const row of receipt.results) routes.set(row.key.replace(/-\d+px$/, ''), row.screenshot.url);
    }
    const context = await browser.newContext({ viewport: { width, height: width === 390 ? 844 : 900 }, isMobile: width === 390,
      colorScheme: theme === 'day' ? 'dark' : 'light', serviceWorkers: 'block' });
    await context.addInitScript(theme => globalThis.localStorage.setItem('bitatlas.ui.theme', theme), theme);
    const page = await context.newPage();
    await page.route('**/*.js', route => route.abort());
    for (const [surface, href] of routes) {
      await page.goto(surface === 'login' ? server : href, { waitUntil: 'load' });
      const head = await page.evaluate(() => ({
        empty: globalThis.document.querySelector('#root').childElementCount === 0,
        theme: globalThis.document.documentElement.dataset.theme,
        meta: globalThis.document.querySelector('meta[name=theme-color]').content.toLowerCase(),
        bone: globalThis.getComputedStyle(globalThis.document.documentElement).getPropertyValue('--bone').trim().toLowerCase(),
      }));
      report.frames.push({ width, expectedTheme: theme, surface, url: page.url(), ...head, pass: head.empty && head.theme === theme && head.meta === head.bone });
    }
    await context.close();
  }
  const localPage = await openPage(browser, 1440, 'day');
  await localPage.locator('.subject-overview').waitFor();
  const syncPattern = /^(无待同步记录|待同步 \d+ 条|已同步 \d\d:\d\d)$/;
  assert.equal(await localPage.locator('.topbar .status-chip').filter({ hasText: syncPattern }).count(), 0);
  report.sync.localChipAbsent = true; await localPage.context().close();
  const page = await openPage(browser, 1440, 'day', server);
  assert.equal(await page.locator('.status-chip').count(), 0); report.sync.loginChipAbsent = true;
  await login(page, 'member13');
  const chip = page.locator('.topbar .status-chip').filter({ hasText: syncPattern });
  await chip.waitFor();
  report.sync.initial = await chip.innerText();
  const { account } = await (await page.request.get('/api/v1/auth/me')).json();
  await page.goto('/questions?question=cn408-2009-q01');
  await page.getByRole('button', { name: '开始第 1 题', exact: true }).click();
  await page.locator('.option-list button').first().waitFor();
  await page.context().setOffline(true);
  await page.locator('.option-list button').first().click();
  await page.getByRole('button', { name: '提交答案', exact: true }).click();
  await page.locator('.answer-panel').waitFor();
  // Read only the outbox index's count; do not export account data or queued payloads.
  const sample = await page.waitForFunction(async id => {
    const n = await new Promise((resolve, reject) => {
      const req = globalThis.indexedDB.open(`408-user:${id}`);
      req.onerror = () => reject(req.error);
      req.onsuccess = () => {
        const db = req.result;
        const count = db.transaction('outbox').objectStore('outbox').index('state').count('pending');
        count.onsuccess = () => { db.close(); resolve(count.result); };
        count.onerror = () => { db.close(); reject(count.error); };
      };
    });
    const text = [...globalThis.document.querySelectorAll('.topbar .status-chip')].find(c => c.textContent === `待同步 ${n} 条`)?.textContent;
    return n > 0 && text ? { count: n, text } : null;
  }, account.id, { timeout: 15_000 });
  report.sync.offline = await sample.jsonValue();
  await page.evaluate(() => globalThis.addEventListener('bitatlas-synced', () => { globalThis.document.documentElement.dataset.auditSync = new Date().toISOString(); }, { once: true }));
  await page.context().setOffline(false);
  await page.waitForFunction(() => Boolean(globalThis.document.documentElement.dataset.auditSync), undefined, { timeout: 35_000 });
  const synced = await page.locator('.topbar .status-chip').filter({ hasText: /^已同步 \d\d:\d\d$/ }).innerText();
  report.sync.online = { label: synced, event: await page.locator('html').getAttribute('data-audit-sync') };
  await page.context().close();
} catch (e) { report.errors.push(e.stack); }
finally {
  report.passed = !report.errors.length && report.frames.length === 56 && report.frames.every(r => r.pass) && Boolean(report.sync.online);
  await json(path.join(dir, 'receipt.json'), report);
  console.log(JSON.stringify({ checks: report.frames.length, passed: report.passed, sync: report.sync, errors: report.errors }));
  await browser.close();
  if (!report.passed) process.exitCode = 1;
}
