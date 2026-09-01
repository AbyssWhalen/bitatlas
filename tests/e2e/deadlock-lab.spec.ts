import path from 'node:path';
import { mkdir } from 'node:fs/promises';
import { expect, test, type Page, type TestInfo } from '@playwright/test';

const screenshotRoot = path.resolve('output', 'playwright', 'screenshots');

async function expectNoPageOverflow(page: Page) {
  await expect.poll(() => page.evaluate(() => {
    const main = document.querySelector<HTMLElement>('.main-area');
    return document.documentElement.scrollWidth <= document.documentElement.clientWidth
      && (!main || main.scrollWidth <= main.clientWidth);
  })).toBe(true);
}

async function capture(page: Page, testInfo: TestInfo) {
  await mkdir(screenshotRoot, { recursive: true });
  const project = testInfo.project.name;
  if (project !== 'chromium-390') {
    await page.screenshot({
      path: path.join(screenshotRoot, `${project}-deadlock-q25.png`),
      fullPage: true,
      animations: 'disabled',
    });
    return;
  }

  const main = page.locator('.main-area');
  await main.evaluate((element) => { element.scrollTop = 0; });
  await page.screenshot({
    path: path.join(screenshotRoot, `${project}-deadlock-q25-top.png`),
    animations: 'disabled',
  });
  await page.locator('.deadlock-current-event').evaluate((element) => {
    element.scrollIntoView({ block: 'start' });
  });
  await page.screenshot({
    path: path.join(screenshotRoot, `${project}-deadlock-q25-state.png`),
    animations: 'disabled',
  });
  await main.evaluate((element) => { element.scrollTop = element.scrollHeight; });
  await page.screenshot({
    path: path.join(screenshotRoot, `${project}-deadlock-q25-bottom.png`),
    animations: 'disabled',
  });
}

test('replays the Q25 deadlock threshold, safe boundary, URL state, and practice roundtrip', async ({ page }, testInfo) => {
  const pageErrors: string[] = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));

  await page.goto('/lab/os-memory?module=deadlock&preset=cn408-2009-q25');
  await expect(page).toHaveURL(/\/lab\/os-memory\?module=deadlock&preset=cn408-2009-q25$/u);
  await expect(page.getByRole('heading', { name: '单类资源死锁实验室' })).toBeVisible();
  await expect(page.getByText('needs-review')).toBeVisible();
  const moduleNavigation = page.getByRole('navigation', { name: '操作系统实验模块' });
  await expect(moduleNavigation.getByRole('link')).toHaveCount(7);
  await expect(moduleNavigation.getByRole('link', { name: '死锁阈值' })).toHaveAttribute('aria-current', 'page');
  await expect(page.getByLabel('资源总数 R')).toHaveValue('8');
  await expect(page.getByLabel('进程数量 K')).toHaveValue('4');
  await expect(page.getByLabel('单进程最大需求 M')).toHaveValue('3');
  await expect(page.getByLabel('最小死锁进程数')).toContainText('4');
  await expect(page.getByLabel('当前可用资源')).toContainText('0');
  await expect(page.getByRole('status', { name: '死锁状态' })).toContainText('可能发生死锁');
  await expect(page.locator('[data-resource-owner]')).toHaveCount(8);
  await expect(page.locator('[data-resource-available]')).toHaveCount(0);
  await expect(page.getByRole('article', { name: /进程 P/u })).toHaveCount(4);
  await expect(page.locator('[data-process-status="waiting"]')).toHaveCount(4);

  await page.getByRole('button', { name: '下一步' }).click();
  await expect(page.locator('.deadlock-current-event')).toContainText('检测到死锁状态');
  await expect(page.getByLabel('当前可用资源')).toContainText('0');
  await expectNoPageOverflow(page);

  if (testInfo.project.name === 'chromium-390') {
    const [eventBox, explorerBox, poolBox] = await Promise.all([
      page.locator('.deadlock-current-event').boundingBox(),
      page.locator('.deadlock-step-explorer').boundingBox(),
      page.locator('.deadlock-pool-panel').boundingBox(),
    ]);
    expect(eventBox).not.toBeNull();
    expect(explorerBox).not.toBeNull();
    expect(poolBox).not.toBeNull();
    expect(eventBox!.y + eventBox!.height).toBeLessThanOrEqual(explorerBox!.y + 1);
    expect(explorerBox!.y + explorerBox!.height).toBeLessThanOrEqual(poolBox!.y + 1);
    expect(explorerBox!.height).toBeLessThan(430);
    await expect(page.locator('.deadlock-current-event code')).toHaveCSS('font-size', '10px');
    await expect(page.locator('.mobile-nav')).toHaveCSS('position', 'static');
  }
  await capture(page, testInfo);

  await page.getByLabel('资源总数 R').fill('0');
  await expect(page.getByRole('alert')).toContainText('资源总数');
  await expect(page.getByLabel('转换步骤')).toHaveCount(0);
  await expect(page.getByRole('article', { name: /进程 P/u })).toHaveCount(0);
  await page.getByRole('button', { name: '恢复 Q25 预设' }).click();
  await expect(page.getByLabel('资源总数 R')).toHaveValue('8');

  await page.getByLabel('进程数量 K').fill('3');
  await expect(page).toHaveURL(/module=deadlock&resources=8&processes=3&max-demand=3$/u);
  await expect(page.getByRole('status', { name: '死锁状态' })).toContainText('安全序列');
  await expect(page.getByLabel('当前可用资源')).toContainText('2');
  await expect(page.getByRole('article', { name: /进程 P/u })).toHaveCount(3);
  await page.getByRole('button', { name: '下一步' }).click();
  await expect(page.locator('[data-process-id="P1"]')).toHaveAttribute('data-process-status', 'running');
  await expect(page.getByLabel('当前可用资源')).toContainText('1');
  await page.getByRole('button', { name: '下一步' }).click();
  await expect(page.locator('[data-process-id="P1"]')).toHaveAttribute('data-process-status', 'completed');
  await expect(page.getByLabel('当前可用资源')).toContainText('4');

  const customUrl = page.url();
  await page.reload();
  await expect(page.getByLabel('进程数量 K')).toHaveValue('3');
  await expect(page.getByLabel('当前可用资源')).toContainText('2');
  await moduleNavigation.getByRole('link', { name: '死锁阈值' }).click();
  await expect(page).toHaveURL(/\/lab\/os-memory\?module=deadlock&preset=cn408-2009-q25$/u);
  await expect(page.getByLabel('进程数量 K')).toHaveValue('4');
  await page.goBack();
  await expect(page).toHaveURL(customUrl);
  await expect(page.getByLabel('进程数量 K')).toHaveValue('3');
  await page.goForward();
  await expect(page).toHaveURL(/\/lab\/os-memory\?module=deadlock&preset=cn408-2009-q25$/u);

  await page.getByRole('button', { name: '练习 2009 · Q25' }).click();
  await expect(page.locator('.practice-topbar strong')).toContainText('第 25 题');
  await page.getByRole('button', { name: '单类资源死锁阈值' }).click();
  await expect(page).toHaveURL(/\/lab\/os-memory\?module=deadlock&preset=cn408-2009-q25$/u);
  await expect(page.getByRole('heading', { name: '单类资源死锁实验室' })).toBeVisible();
  expect(pageErrors).toEqual([]);
});
