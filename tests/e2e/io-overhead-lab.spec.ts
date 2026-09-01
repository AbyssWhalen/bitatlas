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
      path: path.join(screenshotRoot, `${project}-io-overhead-q43.png`),
      fullPage: true,
      animations: 'disabled',
    });
    return;
  }

  const main = page.locator('.main-area');
  await main.evaluate((element) => { element.scrollTop = 0; });
  await page.screenshot({
    path: path.join(screenshotRoot, `${project}-io-overhead-q43-top.png`),
    animations: 'disabled',
  });
  await page.locator('.io-overhead-current-event').scrollIntoViewIfNeeded();
  await page.screenshot({
    path: path.join(screenshotRoot, `${project}-io-overhead-q43-state.png`),
    animations: 'disabled',
  });
  await main.evaluate((element) => { element.scrollTop = element.scrollHeight; });
  await page.screenshot({
    path: path.join(screenshotRoot, `${project}-io-overhead-q43-bottom.png`),
    animations: 'disabled',
  });
}

test('replays Q43 interrupt and DMA CPU overhead with URL recovery and practice roundtrip', async ({ page }, testInfo) => {
  const pageErrors: string[] = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));

  await page.goto('/lab?module=io-overhead&preset=cn408-2009-q43');
  await expect(page).toHaveURL(/\/lab\?module=io-overhead&preset=cn408-2009-q43$/u);
  await expect(page.getByRole('heading', { name: '中断与 DMA CPU 开销' })).toBeVisible();
  await expect(page.getByText('needs-review')).toBeVisible();

  const tabs = page.getByRole('navigation', { name: '实验类型' });
  await expect(tabs.getByRole('button')).toHaveCount(11);
  await expect(tabs.getByRole('button', { name: 'I/O 开销' })).toHaveClass(/active/u);
  await expect(page.getByLabel('CPU 频率 MHz')).toHaveValue('500');
  await expect(page.getByLabel('中断方式 CPU 占用')).toContainText('2.5%');
  await expect(page.getByLabel('DMA 方式 CPU 占用')).toContainText('0.1%');
  await expect(page.getByLabel('CPU 开销相对降低')).toContainText('96%');
  await expect(page.getByText(/1 MB = 1,000,000 B/u)).toBeVisible();
  await expect(page.getByText(/DMA 与 CPU 无访存冲突/u)).toBeVisible();
  await expect(page.locator('.io-overhead-step-explorer .step-transport > span')).toHaveText('1 / 7');
  await expect(page.getByLabel('当前推导事件')).toContainText('换算每秒 CPU 时钟预算');

  await page.getByRole('button', { name: '下一步' }).click();
  await expect(page.getByLabel('当前推导事件')).toContainText('计算每次中断的 CPU 开销');
  await page.getByRole('button', { name: '播放步骤' }).click();
  await expect(page.getByRole('button', { name: '暂停步骤' })).toBeVisible();
  await expect.poll(() => page.locator('.io-overhead-step-explorer .step-transport > span').textContent()).not.toBe('2 / 7');
  await page.getByRole('button', { name: '暂停步骤' }).click();
  await page.getByRole('button', { name: '复位步骤' }).click();
  await expect(page.locator('.io-overhead-step-explorer .step-transport > span')).toHaveText('1 / 7');

  await page.getByLabel('CPU 频率 MHz').fill('');
  await expect(page.getByRole('alert')).toContainText('CPU 频率');
  await expect(page.getByLabel('中断方式 CPU 占用')).toHaveCount(0);
  await page.getByRole('button', { name: '恢复 Q43 预设' }).click();
  await expect(page).toHaveURL(/\/lab\?module=io-overhead&preset=cn408-2009-q43$/u);
  await expect(page.getByRole('alert')).toHaveCount(0);

  await page.getByLabel('CPU 频率 MHz').fill('1000');
  await expect(page).toHaveURL((url) => (
    url.pathname === '/lab'
    && url.searchParams.get('module') === 'io-overhead'
    && url.searchParams.get('cpu') === '1000'
    && url.searchParams.get('preset') === null
  ));
  const customUrl = page.url();
  await page.reload();
  await expect(page.getByLabel('CPU 频率 MHz')).toHaveValue('1000');
  await expect(page.getByLabel('中断方式 CPU 占用')).toContainText('1.25%');
  await page.getByRole('button', { name: '恢复 Q43 预设' }).click();

  await expectNoPageOverflow(page);
  await capture(page, testInfo);

  await page.getByRole('button', { name: '相关真题 1 题' }).click();
  await expect(page.locator('.practice-topbar strong')).toContainText('第 43 题');
  await expect(page.getByRole('button', { name: '中断与 DMA CPU 开销' })).toBeVisible();
  await page.getByRole('button', { name: '中断与 DMA CPU 开销' }).click();
  await expect(page).toHaveURL(/\/lab\?module=io-overhead&preset=cn408-2009-q43$/u);
  await expect(page.getByRole('heading', { name: '中断与 DMA CPU 开销' })).toBeVisible();
  expect(customUrl).toContain('/lab?module=io-overhead');
  expect(pageErrors).toEqual([]);
});
