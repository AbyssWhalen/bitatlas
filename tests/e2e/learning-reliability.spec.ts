import { readFileSync } from 'node:fs';
import path from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import { computeContentPackHash } from '@408os/content-schema';
import type { ContentPack, DailyPlan } from '@408os/domain';

const pack = (year: number): ContentPack => JSON.parse(readFileSync(path.resolve('apps/web/public/content', `${year}.json`), 'utf8'));
async function plans(page: Page): Promise<DailyPlan[]> {
  return page.evaluate(() => new Promise((resolve, reject) => {
    const request = indexedDB.open('408-user');
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const db = request.result;
      const tx = db.transaction('dailyPlans');
      const all = tx.objectStore('dailyPlans').getAll();
      all.onsuccess = () => resolve(all.result);
      tx.oncomplete = () => db.close();
    };
  }));
}

test('keeps the saved plan when question versions change and resolves legacy knowledge links', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('button', { name: '复习 3 张卡片' })).toBeEnabled();
  const before = await plans(page);
  const original = pack(2009);
  const legacyNode = original.questions[0]!.knowledgePointIds.find((id) => id.startsWith('topic-'))!;
  await page.goto(`/knowledge?node=${encodeURIComponent(legacyNode)}`);
  await expect(page).toHaveURL(/node=ds\.foundations\.queue/);
  await expect(page.locator('.knowledge-status')).toContainText('799 / 799');
  const updated = structuredClone(original);
  updated.manifest.contentVersion = '2009.2-draft.1';
  for (const question of updated.questions) question.contentVersion = updated.manifest.contentVersion;
  updated.manifest.sha256 = computeContentPackHash(updated);
  await page.route('**/content/2009.json?*', (route) => route.fulfill({ json: updated }));
  await page.reload();
  await expect(page.locator('.knowledge-status')).toContainText('752 / 799');
  await expect(page.getByRole('alert')).toContainText('缺少匹配版本的映射');
  await page.goto('/');
  await expect(page.getByRole('button', { name: '开始剩余 0 题' })).toBeDisabled();
  await expect(page.locator('.task-list')).toContainText('不可用');
  expect(await plans(page)).toEqual(before);
  await page.goto('/questions?year=2009');
  await page.getByRole('button', { name: '开始第 1 题', exact: true }).click();
  await page.locator('.option-list > button').first().click();
  await page.getByRole('button', { name: '提交答案', exact: true }).click();
  await expect(page.getByRole('button', { name: '提交答案', exact: true })).toHaveCount(0);
  await page.goto('/');
  await expect(page.locator('.task-list li').filter({ hasText: '2009 · 第 1 题' })).toContainText('不可用');
  expect(await plans(page)).toEqual(before);
});

test('refreshes the saved daily plan and statistics across Beijing midnight and sleep recovery', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-11-20T15:59:50Z') });
  await page.goto('/');
  await expect(page.locator('.daily-plan-section')).toContainText('2026-11-20');
  await expect(page.getByRole('button', { name: '开始剩余 8 题' })).toBeEnabled();
  await page.clock.fastForward(11_000);
  await expect(page.locator('.daily-plan-section')).toContainText('2026-11-21');
  expect((await plans(page)).map((plan) => plan.date)).toEqual(['2026-11-20', '2026-11-21']);
  await page.goto('/stats');
  await expect(page.locator('.heatmap-meta')).toContainText('2026-11-21');
  await page.clock.setSystemTime(new Date('2026-11-24T03:00:00Z'));
  await page.evaluate(() => window.dispatchEvent(new Event('pageshow')));
  await expect(page.locator('.heatmap-meta')).toContainText('2026-11-24');
  await page.goto('/');
  await expect(page.locator('.daily-plan-section')).toContainText('2026-11-24');
});

test.describe('offline learning content', () => {
  test.use({ serviceWorkers: 'allow' });

  test('resumes an interrupted extra-year image cache without re-downloading validated images', async ({ page, context }) => {
    const extra = pack(2010);
    const first = extra.assets[0]!.path;
    const second = extra.assets[1]!.path;
    const downloads: string[] = [];
    page.on('request', (request) => {
      if (request.url().includes('/cn408-2010/') && request.url().includes('__408os_validate')) downloads.push(new URL(request.url()).pathname);
    });
    await page.route(/\/content\/20(?:1[1-9]|2[0-5])\.json/, (route) => route.fulfill({ status: 404 }));
    await page.route(`**${second}?*`, (route) => route.abort('connectionreset'));
    await page.goto('/');
    await expect(page.getByRole('button', { name: '开始剩余 8 题' })).toBeEnabled();
    await expect.poll(() => downloads.includes(second), { timeout: 20_000 }).toBe(true);
    const cached = (asset: string) => page.evaluate(async (url) => !!await (await caches.open('408os-content-assets-v2')).match(url), asset);
    expect(await cached(first)).toBe(true);
    expect(await cached(second)).toBe(false);
    const initialCount = downloads.filter((url) => url === first).length;
    await page.unroute(`**${second}?*`);
    await page.reload();
    await expect.poll(() => cached(second), { timeout: 20_000 }).toBe(true);
    expect(downloads.filter((url) => url === first)).toHaveLength(initialCount);
    await page.evaluate(async () => { await navigator.serviceWorker.ready; });
    await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);
    await context.setOffline(true);
    const offlineBytes = await page.evaluate(async (url) => (await (await fetch(url)).arrayBuffer()).byteLength, second);
    expect(offlineBytes).toBeGreaterThan(100);
  });

  test('keeps cards, progress, formulas and local fonts available after an offline restart', async ({ page, context }, info) => {
    await page.goto('/knowledge');
    await expect(page.locator('.knowledge-status')).toContainText('799 / 799');
    await page.goto('/review?concept=co.representation.float');
    await page.getByRole('button', { name: '加练本组 2 张' }).click();
    await expect(page).toHaveURL(/\/review\/cards\/[^/]+$/);
    const cardPath = new URL(page.url()).pathname;
    await page.getByRole('button', { name: '查看解释' }).click();
    await page.getByRole('button', { name: '记得', exact: true }).click();
    // A click completes before IndexedDB commits; navigate only after the saved
    // cursor is visible, then verify that exact checkpoint after reopening.
    await expect(page.locator('.card-review-page .page-header')).toContainText('完成 1 / 2 张');
    await page.goto('/questions?question=cn408-2009-q12');
    await page.getByRole('button', { name: '开始第 12 题', exact: true }).click();
    await expect(page.locator('.katex')).toHaveCount(6);
    const mathCount = await page.locator('.katex').count();
    await page.evaluate(async () => { await navigator.serviceWorker.ready; await document.fonts.ready; });
    await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);
    await context.setOffline(true);
    await page.reload();
    await expect(page.locator('.katex')).toHaveCount(mathCount);
    expect(await page.locator('.katex-error').count()).toBe(0);
    const fonts = await page.evaluate(async () => {
      const loaded = await document.fonts.load('18px "KaTeX_Main"');
      const keys = await caches.keys();
      const requests = (await Promise.all(keys.map(async (key) => (await (await caches.open(key)).keys())))).flat();
      return { loaded: loaded.length, cachedWoff2: requests.filter((request) => /\.woff2(?:\?|$)/.test(request.url)).length };
    });
    expect(fonts.loaded).toBeGreaterThan(0);
    expect(fonts.cachedWoff2).toBeGreaterThan(10);
    const contrast = await page.locator('.question-body .content-blocks p, .option-list .content-blocks p').evaluateAll((nodes) => {
      const rgb = (value: string) => (value.match(/[\d.]+/g) ?? []).map(Number);
      const luminance = (values: number[]) => values.slice(0, 3).map((v) => {
        const n = v / 255;
        return n <= 0.04045 ? n / 12.92 : ((n + 0.055) / 1.055) ** 2.4;
      }).reduce((sum, v, i) => sum + v * [0.2126, 0.7152, 0.0722][i]!, 0);
      return nodes.map((node) => {
        const style = getComputedStyle(node);
        let parent: Element | null = node;
        let background = [10, 14, 12];
        while (parent) {
          const color = rgb(getComputedStyle(parent).backgroundColor);
          if (color.length === 3 || color[3] === 1) { background = color; break; }
          parent = parent.parentElement;
        }
        const a = luminance(rgb(style.color)), b = luminance(background);
        return { ratio: (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05), fontSize: style.fontSize, lineHeight: style.lineHeight };
      });
    });
    expect(contrast.length).toBeGreaterThan(0);
    for (const sample of contrast) { expect(sample.ratio).toBeGreaterThanOrEqual(4.5); expect(sample.fontSize).toBe('18px'); }
    await info.attach('offline-formula-and-reading', { body: JSON.stringify({ mathCount, fonts, contrast }, null, 2), contentType: 'application/json' });
    await page.screenshot({ path: info.outputPath('offline-formula.png'), fullPage: true });
    await page.close();
    const reopened = await context.newPage();
    await reopened.goto(cardPath);
    await expect(reopened.locator('.card-review-page .page-header')).toContainText('完成 1 / 2 张');
    await expect(reopened.getByRole('button', { name: '查看解释' })).toBeVisible();
    await reopened.getByRole('button', { name: '查看解释' }).click();
    await reopened.getByRole('button', { name: '记得', exact: true }).click();
    await expect(reopened.getByRole('heading', { name: '本轮复习总结' })).toBeVisible();
    await expect(reopened.locator('.study-panel')).toContainText('2 张已完成本轮');
    await expect(reopened.locator('.study-panel')).toContainText('0 张出现过');
    await reopened.close();
  });
});
