// Two real production builds, isolated Chrome data and a loopback-only server.
// Markers are injected by a test plugin; repository sources are never rewritten.
import assert from 'node:assert/strict';
import http from 'node:http';
import path from 'node:path';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { build } from 'vite';
import { chromium, expect } from '@playwright/test';

const root = fileURLToPath(new URL('../../', import.meta.url));
const output = path.resolve(root, process.argv[2] ?? path.join('output', `pwa-upgrade-${Date.now()}`));
if (!output.startsWith(path.join(root, 'output') + path.sep)) throw new Error('Evidence must stay in the project output directory');
await mkdir(output, { recursive: true });
const receipt = { startedAt: new Date().toISOString(), output, results: [], passed: false };
const builds = {};
for (const label of ['A', 'B']) {
  const outDir = path.join(output, `build-${label}`);
  builds[label] = outDir;
  await build({
    root: path.join(root, 'apps', 'web'),
    configFile: path.join(root, 'apps', 'web', 'vite.config.ts'),
    build: { outDir, emptyOutDir: false },
    plugins: [{
      name: 'acceptance-build-marker',
      enforce: 'pre',
      transformIndexHtml(html) { return html.replace('</head>', `<meta name="acceptance-build" content="${label}"></head>`); },
      transform(source, id) {
        if (id.replaceAll('\\', '/').endsWith('/src/pages/QuestionsPage.tsx')) {
          return source.replace('真题浏览', `真题浏览（验收 ${label}）`);
        }
      },
    }],
  });
}
let active = builds.A;
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.woff2': 'font/woff2', '.wasm': 'application/wasm' };
const server = http.createServer(async (request, response) => {
  try {
    const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
    const file = path.resolve(active, `.${pathname === '/' || !path.extname(pathname) ? '/index.html' : pathname}`);
    const relative = path.relative(active, file);
    if (relative.startsWith('..') || path.isAbsolute(relative)) { response.writeHead(403).end(); return; }
    const body = await readFile(file);
    response.writeHead(200, { 'Content-Type': mime[path.extname(file)] ?? 'application/octet-stream', 'Cache-Control': 'no-store' }).end(body);
  } catch { response.writeHead(404).end('Not found'); }
});
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const baseURL = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ channel: 'chrome' });
try {
  for (const width of [1440, 390]) {
    active = builds.A;
    const context = await browser.newContext({ baseURL, viewport: { width, height: 900 }, serviceWorkers: 'allow' });
    try {
      const first = await context.newPage();
      await first.goto('/');
      await expect(first.getByRole('button', { name: '复习 3 张卡片' })).toBeEnabled();
      await first.evaluate(async () => { await navigator.serviceWorker.ready; });
      await expect.poll(() => first.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);
      const draft = await context.newPage();
      await draft.goto('/questions?question=cn408-2009-q41');
      await draft.getByRole('button', { name: '开始第 41 题', exact: true }).click();
      await expect(draft).toHaveURL(/\/practice\/[^/]+$/);
      const practicePath = new URL(draft.url()).pathname;
      const text = `PWA ${width} 未保存的笔记全文`;
      await draft.getByPlaceholder('记录易错点').fill(text);
      const noteCount = () => draft.evaluate(() => new Promise((resolve, reject) => {
        const request = globalThis.indexedDB.open('408-user');
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
          const db = request.result, tx = db.transaction('notes');
          const count = tx.objectStore('notes').count();
          count.onsuccess = () => resolve(count.result);
          tx.oncomplete = () => db.close();
        };
      }));
      assert.equal(await noteCount(), 0);
      active = builds.B;
      await draft.evaluate(async () => { await (await navigator.serviceWorker.getRegistration()).update(); });
      await expect(draft.getByText('新版本已准备好', { exact: true })).toBeVisible({ timeout: 30_000 });
      await expect(draft.getByPlaceholder('记录易错点')).toHaveValue(text);
      assert.equal(await noteCount(), 0);
      const waiting = await draft.evaluate(async () => !!(await navigator.serviceWorker.getRegistration()).waiting);
      assert.equal(waiting, true);
      await expect(draft.locator('meta[name="acceptance-build"]')).toHaveAttribute('content', 'A');
      const oldChunk = (await readdir(path.join(builds.A, 'assets'))).find((name) => name.startsWith('QuestionsPage-') && name.endsWith('.js'));
      const serverStatus = (await fetch(`${baseURL}/assets/${oldChunk}`)).status;
      assert.equal(serverStatus, 404);
      const browserStatus = await first.evaluate(async (chunk) => (await fetch(`/assets/${chunk}`)).status, oldChunk);
      assert.equal(browserStatus, 200);
      await first.locator('a[href="/questions"]:visible').first().click();
      await expect(first.getByRole('heading', { name: '真题浏览（验收 A）' })).toBeVisible();
      await draft.screenshot({ path: path.join(output, `waiting-${width}.png`), fullPage: true });
      await draft.getByRole('heading', { name: '笔记', exact: true }).click();
      await expect.poll(noteCount).toBe(1);
      await first.close();
      await draft.close();
      const reopened = await context.newPage();
      await reopened.goto(practicePath);
      await expect(reopened.locator('meta[name="acceptance-build"]')).toHaveAttribute('content', 'B', { timeout: 15_000 });
      await expect(reopened.getByPlaceholder('记录易错点')).toHaveValue(text);
      await reopened.goto('/questions');
      await expect(reopened.getByRole('heading', { name: '真题浏览（验收 B）' })).toBeVisible();
      await context.setOffline(true);
      await reopened.goto(practicePath);
      await expect(reopened.getByPlaceholder('记录易错点')).toHaveValue(text);
      await reopened.reload();
      await expect(reopened.locator('meta[name="acceptance-build"]')).toHaveAttribute('content', 'B');
      await expect(reopened.getByPlaceholder('记录易错点')).toHaveValue(text);
      const overflow = await reopened.evaluate(() => globalThis.document.documentElement.scrollWidth - globalThis.innerWidth);
      assert(overflow <= 1);
      await reopened.screenshot({ path: path.join(output, `updated-offline-${width}.png`), fullPage: true });
      receipt.results.push({ width, waiting, serverStatus, browserStatus, oldChunk, unsavedDraftPreserved: true, savedDraftRestoredOffline: true, activated: 'B', overflow });
    } finally { await context.close(); }
  }
  receipt.passed = true;
} catch (error) {
  receipt.error = String(error?.stack ?? error);
  throw error;
} finally {
  receipt.finishedAt = new Date().toISOString();
  await writeFile(path.join(output, 'receipt.json'), JSON.stringify(receipt, null, 2));
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
  console.log(JSON.stringify(receipt, null, 2));
}
