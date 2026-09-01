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
      path: path.join(screenshotRoot, `${project}-semaphore-q45.png`),
      fullPage: true,
      animations: 'disabled',
    });
    return;
  }

  const main = page.locator('.main-area');
  await main.evaluate((element) => { element.scrollTop = 0; });
  await page.screenshot({
    path: path.join(screenshotRoot, `${project}-semaphore-q45-top.png`),
    animations: 'disabled',
  });
  await page.locator('.semaphore-current-event').evaluate((element) => {
    element.scrollIntoView({ block: 'start' });
  });
  await page.screenshot({
    path: path.join(screenshotRoot, `${project}-semaphore-q45-state.png`),
    animations: 'disabled',
  });
  await main.evaluate((element) => { element.scrollTop = element.scrollHeight; });
  await page.screenshot({
    path: path.join(screenshotRoot, `${project}-semaphore-q45-bottom.png`),
    animations: 'disabled',
  });
}

async function clickNext(page: Page, times: number) {
  for (let index = 0; index < times; index += 1) {
    await page.getByRole('button', { name: '下一步' }).click();
  }
}

test('replays Q45 slots, FIFO blocking, direct handoff, and exact practice roundtrip', async ({ page }, testInfo) => {
  const pageErrors: string[] = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));

  await page.goto('/lab/os-memory?module=semaphore&preset=cn408-2009-q45');
  await expect(page).toHaveURL(/\/lab\/os-memory\?module=semaphore&preset=cn408-2009-q45$/u);
  await expect(page.getByRole('heading', { name: '信号量同步实验室' })).toBeVisible();
  await expect(page.getByText('needs-review')).toBeVisible();
  const moduleNavigation = page.getByRole('navigation', { name: '操作系统实验模块' });
  const tabs = moduleNavigation.getByRole('link');
  await expect(tabs).toHaveCount(7);
  await expect(moduleNavigation.getByRole('link', { name: '信号量同步' })).toHaveAttribute('aria-current', 'page');
  await expect(page.locator('[data-buffer-slot]')).toHaveCount(2);
  await expect(page.locator('[data-buffer-slot][data-buffer-value=""]')).toHaveCount(2);
  await expect(page.locator('[data-semaphore-id="mutex"]')).toHaveAttribute('data-semaphore-value', '1');
  await expect(page.locator('[data-semaphore-id="empty"]')).toHaveAttribute('data-semaphore-value', '2');
  await expect(page.locator('[data-semaphore-id="odd"]')).toHaveAttribute('data-semaphore-value', '0');
  await expect(page.locator('[data-semaphore-id="even"]')).toHaveAttribute('data-semaphore-value', '0');

  await clickNext(page, 2);
  await expect(page.locator('[data-process-id="P2"]')).toHaveAttribute('data-process-status', 'blocked');
  await expect(page.locator('[data-process-id="P3"]')).toHaveAttribute('data-process-status', 'blocked');
  await expect(page.getByLabel('odd FIFO 阻塞队列')).toContainText('P2');
  await expect(page.getByLabel('even FIFO 阻塞队列')).toContainText('P3');

  await clickNext(page, 6);
  await expect(page.locator('[data-event-outcome="woken"]')).toBeVisible();
  await expect(page.locator('[data-process-id="P2"]')).toHaveAttribute('data-process-status', 'ready');
  await expect(page.locator('[data-semaphore-id="odd"]')).toHaveAttribute('data-semaphore-value', '0');
  await expect(page.locator('[data-buffer-value="3"]')).toContainText('奇数');
  await expect(page.getByText(/许可直接移交给 P2/u)).toBeVisible();

  const stepCounter = page.locator('.semaphore-step-explorer .step-transport > span');
  const stepBeforePlay = await stepCounter.textContent();
  await page.getByRole('button', { name: '播放步骤' }).click();
  await expect(page.getByRole('button', { name: '暂停步骤' })).toBeVisible();
  await expect.poll(() => stepCounter.textContent()).not.toBe(stepBeforePlay);
  await page.getByRole('button', { name: '暂停步骤' }).click();
  await expectNoPageOverflow(page);

  if (testInfo.project.name === 'chromium-390') {
    const [eventBox, explorerBox, bufferBox] = await Promise.all([
      page.locator('.semaphore-current-event').boundingBox(),
      page.locator('.semaphore-step-explorer').boundingBox(),
      page.locator('.semaphore-buffer-panel').boundingBox(),
    ]);
    expect(eventBox).not.toBeNull();
    expect(explorerBox).not.toBeNull();
    expect(bufferBox).not.toBeNull();
    expect(eventBox!.y + eventBox!.height).toBeLessThanOrEqual(explorerBox!.y + 1);
    expect(explorerBox!.y + explorerBox!.height).toBeLessThanOrEqual(bufferBox!.y + 1);
    expect(explorerBox!.height).toBeLessThan(420);
    await expect(page.getByLabel('odd FIFO 阻塞队列').locator('small')).toHaveCSS('font-size', '10px');
    await expect(page.locator('.mobile-nav')).toHaveCSS('position', 'static');
    const [mainBox, navBox] = await Promise.all([
      page.locator('.main-area').boundingBox(),
      page.locator('.mobile-nav').boundingBox(),
    ]);
    expect(mainBox).not.toBeNull();
    expect(navBox).not.toBeNull();
    expect(mainBox!.y + mainBox!.height).toBeLessThanOrEqual(navBox!.y + 1);
  }
  await capture(page, testInfo);

  await page.getByRole('button', { name: '复位步骤' }).click();
  await expect(page.locator('[data-process-id="P2"]')).toHaveAttribute('data-process-status', 'ready');
  await page.getByLabel('Q45 操作脚本').fill('P1 eval alert(1)');
  await expect(page.getByRole('alert')).toContainText('第 1 行');
  await expect(page.locator('[data-buffer-slot]')).toHaveCount(0);
  await expect(page.getByLabel('转换步骤')).toHaveCount(0);
  await page.getByRole('button', { name: '恢复 Q45 预设' }).click();
  await expect(page.locator('[data-buffer-slot]')).toHaveCount(2);
  await expect(page).toHaveURL(/\/lab\/os-memory\?module=semaphore&preset=cn408-2009-q45$/u);

  await page.getByLabel('缓冲区容量 N').fill('3');
  await page.getByLabel('Q45 操作脚本').fill([
    'P1 produce 5',
    'P1 P(empty)',
    'P1 P(mutex)',
    'P1 put',
    'P1 V(mutex)',
    'P1 V(odd)',
  ].join('\n'));
  await expect(page.getByText('6 条原子操作 · 7 个可重放状态')).toBeVisible();
  await clickNext(page, 6);
  await expect(page.locator('[data-buffer-slot]')).toHaveCount(3);
  await expect(page.locator('[data-buffer-value="5"]')).toContainText('奇数');
  await expect(page.locator('[data-semaphore-id="odd"]')).toHaveAttribute('data-semaphore-value', '1');
  const customUrl = page.url();
  await page.reload();
  await expect(page.getByLabel('缓冲区容量 N')).toHaveValue('3');
  await expect(page.getByLabel('Q45 操作脚本')).toHaveValue([
    'P1 produce 5',
    'P1 P(empty)',
    'P1 P(mutex)',
    'P1 put',
    'P1 V(mutex)',
    'P1 V(odd)',
  ].join('\n'));
  await expect(page.getByText('6 条原子操作 · 7 个可重放状态')).toBeVisible();

  await page.getByRole('navigation', { name: '操作系统实验模块' }).getByRole('link', { name: '信号量同步' }).click();
  await expect(page).toHaveURL(/\/lab\/os-memory\?module=semaphore&preset=cn408-2009-q45$/u);
  await expect(page.getByLabel('缓冲区容量 N')).toHaveValue('2');
  await page.goBack();
  await expect(page).toHaveURL(customUrl);
  await expect(page.getByLabel('缓冲区容量 N')).toHaveValue('3');
  await expect(page.getByLabel('Q45 操作脚本')).toHaveValue(/P1 produce 5/u);
  await page.goForward();
  await expect(page).toHaveURL(/\/lab\/os-memory\?module=semaphore&preset=cn408-2009-q45$/u);
  await expect(page.getByLabel('缓冲区容量 N')).toHaveValue('2');

  await page.getByRole('button', { name: '练习 2009 · Q45' }).click();
  await expect(page.locator('.practice-topbar strong')).toContainText('第 45 题');
  await page.getByRole('button', { name: '信号量同步与奇偶缓冲区' }).click();
  await expect(page).toHaveURL(/\/lab\/os-memory\?module=semaphore&preset=cn408-2009-q45$/u);
  await expect(page.getByRole('heading', { name: '信号量同步实验室' })).toBeVisible();
  expect(pageErrors).toEqual([]);
});
