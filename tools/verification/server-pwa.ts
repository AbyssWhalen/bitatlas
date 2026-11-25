import path from 'node:path';
import { mkdir, writeFile } from 'node:fs/promises';
import { build } from 'vite';
import { chromium, expect } from '@playwright/test';
import { seedServer, TEST_PASSWORD } from './server-fixture';
import { createApp } from '../../apps/server/src/app';

const root = path.resolve('.');
const output = path.join(root, 'output', 'server-implementation-2026-11-20', `server-pwa-${Date.now()}`);
await mkdir(output, { recursive: true });
const builds = { A: path.join(output, 'A'), B: path.join(output, 'B') };
for (const label of ['A', 'B'] as const) await build({
  root: path.join(root, 'apps', 'web'), configFile: path.join(root, 'apps', 'web', 'vite.config.ts'), mode: 'server',
  build: { outDir: builds[label], emptyOutDir: false },
  plugins: [{ name: 'server-pwa-marker', transformIndexHtml: (html) => html.replace('</head>', `<meta name="server-build" content="${label}"></head>`),
    enforce: 'pre', transform: (code, id) => id.replaceAll('\\', '/').endsWith('/src/pages/QuestionsPage.tsx') ? code.replace('真题浏览', `真题浏览 ${label}`) : undefined }],
});
const browser = await chromium.launch({ channel: 'chrome' });
const results: unknown[] = [];
try {
  for (const width of [1440, 390]) {
    const folder = path.join(output, `data-${width}`);
    let server = await seedServer(folder, 4326, builds.A);
    const context = await browser.newContext({ baseURL: 'http://127.0.0.1:4326', viewport: { width, height: 900 }, serviceWorkers: 'allow' });
    try {
      const page = await context.newPage(); await page.goto('/');
      await page.getByLabel('用户名', { exact: true }).fill('member0');
      await page.getByLabel('密码', { exact: true }).fill(TEST_PASSWORD);
      await page.getByRole('button', { name: '登录', exact: true }).click();
      await expect(page.getByRole('button', { name: /开始剩余 8 题/ })).toBeEnabled({ timeout: 30000 });
      await page.evaluate(async () => { await navigator.serviceWorker.ready; });
      await expect.poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller))).toBe(true);
      await page.goto('/questions?question=cn408-2009-q01');
      await page.getByRole('button', { name: '开始第 1 题', exact: true }).click();
      await expect(page).toHaveURL(/\/practice\/[^/]+$/);
      const practicePath = new URL(page.url()).pathname;
      const note = `服务器 PWA ${width} 原始笔记`;
      await page.getByPlaceholder('记录易错点').fill(note);
      await server.app.close();
      const replacement = createApp({ database: path.join(folder, 'server.sqlite'), files: path.join(folder, 'files'),
        origin: 'http://127.0.0.1:4326', webRoot: builds.B });
      await replacement.app.listen({ host: '127.0.0.1', port: 4326 });
      server = { ...replacement, fileId: server.fileId };
      await page.evaluate(async () => { await (await navigator.serviceWorker.ready).update(); });
      await expect.poll(() => page.evaluate(async () => Boolean((await navigator.serviceWorker.getRegistration())?.waiting))).toBe(true);
      await expect(page.locator('meta[name="server-build"]')).toHaveAttribute('content', 'A');
      await expect(page.getByPlaceholder('记录易错点')).toHaveValue(note);
      await page.getByRole('heading', { name: '笔记', exact: true }).click();
      const accountId = (await (await page.request.get('/api/v1/auth/me')).json()).account.id as string;
      await expect.poll(() => page.evaluate((id) => new Promise<boolean>((resolve) => {
        const request = indexedDB.open(`408-user:${id}`); request.onsuccess = () => {
          const db = request.result; const notes = db.transaction('notes').objectStore('notes').count();
          notes.onsuccess = () => { resolve(notes.result === 1); db.close(); };
        };
      }), accountId)).toBe(true);
      await page.close();
      const reopened = await context.newPage(); await reopened.goto(practicePath);
      await expect(reopened.locator('meta[name="server-build"]')).toHaveAttribute('content', 'B', { timeout: 15000 });
      await expect(reopened.getByPlaceholder('记录易错点')).toHaveValue(note);
      await expect.poll(() => reopened.locator('.brand-mark img').evaluate((image) => (image as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
      await context.setOffline(true); await reopened.reload();
      await expect(reopened.getByPlaceholder('记录易错点')).toHaveValue(note);
      expect(await reopened.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await reopened.screenshot({ path: path.join(output, `offline-${width}.png`), fullPage: true });
      results.push({ width, waitingProtectedDraft: true, activated: 'B', offlineAccountAndNoteRestored: true });
    } finally { await context.close(); await server.app.close(); }
  }
  await writeFile(path.join(output, 'receipt.json'), JSON.stringify({ passed: true, results }, null, 2));
} catch (error) {
  await writeFile(path.join(output, 'receipt.json'), JSON.stringify({ passed: false, error: String(error), results }, null, 2)); throw error;
} finally { await browser.close(); }
console.log(JSON.stringify({ output, results }));
