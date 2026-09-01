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
      path: path.join(screenshotRoot, `${project}-memory-expansion-q15.png`),
      fullPage: true,
      animations: 'disabled',
    });
    return;
  }

  const main = page.locator('.main-area');
  await main.evaluate((element) => { element.scrollTop = 0; });
  await page.screenshot({
    path: path.join(screenshotRoot, `${project}-memory-expansion-q15-top.png`),
    animations: 'disabled',
  });
  await page.locator('.memory-chip-regions').scrollIntoViewIfNeeded();
  await page.screenshot({
    path: path.join(screenshotRoot, `${project}-memory-expansion-q15-state.png`),
    animations: 'disabled',
  });
  await main.evaluate((element) => { element.scrollTop = element.scrollHeight; });
  await page.screenshot({
    path: path.join(screenshotRoot, `${project}-memory-expansion-q15-bottom.png`),
    animations: 'disabled',
  });
}

test('replays Q15 memory expansion with URL, practice, and knowledge recovery', async ({ page }, testInfo) => {
  const pageErrors: string[] = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));

  await page.goto('/lab?module=memory-expansion&preset=cn408-2009-q15');
  await expect(page).toHaveURL(/\/lab\?module=memory-expansion&preset=cn408-2009-q15$/u);
  await expect(page.getByRole('heading', { name: '存储器芯片扩展' })).toBeVisible();
  await expect(page.getByText('needs-review')).toBeVisible();

  const tabs = page.getByRole('navigation', { name: '实验类型' });
  await expect(tabs.getByRole('button')).toHaveCount(11);
  await expect(tabs.getByRole('button', { name: '存储扩展' })).toHaveClass(/active/u);
  await expect(page.getByLabel('主存总容量 B')).toHaveValue('65536');
  await expect(page.getByLabel('ROM 容量 B')).toHaveValue('4096');
  await expect(page.getByLabel('容量分区')).toContainText('64 KB');
  await expect(page.getByLabel('容量分区')).toContainText('ROM4 KB');
  await expect(page.getByLabel('容量分区')).toContainText('RAM60 KB');
  await expect(page.getByLabel('ROM 扩展结果')).toContainText('位扩展1');
  await expect(page.getByLabel('ROM 扩展结果')).toContainText('字扩展2');
  await expect(page.getByLabel('ROM 扩展结果')).toContainText('2 片');
  await expect(page.getByLabel('RAM 扩展结果')).toContainText('位扩展2');
  await expect(page.getByLabel('RAM 扩展结果')).toContainText('字扩展15');
  await expect(page.getByLabel('RAM 扩展结果')).toContainText('30 片');
  await expect(page.getByLabel('总芯片数')).toHaveText('32');
  await expect(page.getByLabel('题目答案')).toHaveText('D');
  await expect(page.locator('[data-memory-chip]')).toHaveCount(32);
  await expect(page.getByText('容量守恒')).toBeVisible();
  await expect(page.getByText(/地址译码|片选逻辑/u)).toHaveCount(0);
  await expect(page.locator('.memory-expansion-step-explorer .step-transport > span')).toHaveText('1 / 6');
  await expect(page.getByLabel('当前推导事件')).toContainText('划分 ROM 与 RAM 容量');

  await page.getByRole('button', { name: '下一步' }).click();
  await expect(page.getByLabel('当前推导事件')).toContainText('计算 ROM 位扩展');
  await page.getByRole('button', { name: '播放步骤' }).click();
  await expect(page.getByRole('button', { name: '暂停步骤' })).toBeVisible();
  await expect.poll(() => page.locator('.memory-expansion-step-explorer .step-transport > span').textContent()).not.toBe('2 / 6');
  await page.getByRole('button', { name: '暂停步骤' }).click();
  await page.getByRole('button', { name: '复位步骤' }).click();
  await expect(page.locator('.memory-expansion-step-explorer .step-transport > span')).toHaveText('1 / 6');

  await page.getByLabel('ROM 芯片位宽 bit').fill('3');
  await expect(page.getByRole('alert')).toContainText('ROM 芯片位宽');
  await expect(page.getByLabel('总芯片数')).toHaveCount(0);
  await expect(page.locator('[data-memory-chip]')).toHaveCount(0);
  await expect(page.locator('.memory-expansion-step-explorer')).toHaveCount(0);
  await page.getByRole('button', { name: '恢复 Q15 预设' }).click();
  await expect(page).toHaveURL(/\/lab\?module=memory-expansion&preset=cn408-2009-q15$/u);
  await expect(page.getByRole('alert')).toHaveCount(0);

  await page.getByLabel('主存总容量 B').fill('24576');
  await page.getByLabel('ROM 容量 B').fill('8192');
  await page.getByLabel('ROM 芯片字数').fill('1024');
  await page.getByLabel('ROM 芯片位宽 bit').fill('4');
  await page.getByLabel('RAM 芯片字数').fill('2048');
  await page.getByLabel('RAM 芯片位宽 bit').fill('8');
  await expect(page).toHaveURL((url) => (
    url.pathname === '/lab'
    && url.searchParams.get('module') === 'memory-expansion'
    && url.searchParams.get('totalBytes') === '24576'
    && url.searchParams.get('romBytes') === '8192'
    && url.searchParams.get('romWords') === '1024'
    && url.searchParams.get('romBits') === '4'
    && url.searchParams.get('ramWords') === '2048'
    && url.searchParams.get('ramBits') === '8'
    && url.searchParams.get('preset') === null
  ));
  await expect(page.getByLabel('ROM 扩展结果')).toContainText('16 片');
  await expect(page.getByLabel('RAM 扩展结果')).toContainText('8 片');
  const customUrl = page.url();
  await page.reload();
  await expect(page.getByLabel('主存总容量 B')).toHaveValue('24576');
  await expect(page.getByLabel('ROM 扩展结果')).toContainText('16 片');

  await page.getByRole('button', { name: '查看知识节点' }).click();
  await expect(page).toHaveURL((url) => (
    url.pathname === '/knowledge'
    && url.searchParams.get('subject') === 'computer-organization'
    && url.searchParams.get('node') === 'topic-2009-q15'
  ));
  await expect(page.getByRole('button', { name: '打开对应实验' })).toHaveAttribute('title', '存储器芯片扩展');
  await page.getByRole('button', { name: '打开对应实验' }).click();
  await expect(page).toHaveURL(/\/lab\?module=memory-expansion&preset=cn408-2009-q15$/u);
  await page.goBack();
  await expect(page).toHaveURL(/\/knowledge\?subject=computer-organization&node=topic-2009-q15$/u);
  await page.goBack();
  await expect(page).toHaveURL(customUrl);
  await expect(page.getByLabel('主存总容量 B')).toHaveValue('24576');
  await page.goForward();
  await expect(page).toHaveURL(/\/knowledge\?subject=computer-organization&node=topic-2009-q15$/u);
  await page.getByRole('button', { name: '打开对应实验' }).click();

  await expectNoPageOverflow(page);
  await capture(page, testInfo);

  if (testInfo.project.name === 'chromium-390') {
    await expect.poll(() => page.evaluate(() => {
      const event = document.querySelector<HTMLElement>('.memory-expansion-current-event')?.getBoundingClientRect();
      const chips = document.querySelector<HTMLElement>('.memory-chip-regions')?.getBoundingClientRect();
      const explorer = document.querySelector<HTMLElement>('.memory-expansion-step-explorer')?.getBoundingClientRect();
      return Boolean(event && chips && explorer && event.bottom <= chips.top && chips.bottom <= explorer.top);
    })).toBe(true);
  }

  await page.getByRole('button', { name: '相关真题 1 题' }).click();
  await expect(page.locator('.practice-topbar strong')).toContainText('第 15 题');
  await expect(page.getByRole('button', { name: '存储器芯片扩展' })).toBeVisible();
  await page.getByRole('button', { name: '存储器芯片扩展' }).click();
  await expect(page).toHaveURL(/\/lab\?module=memory-expansion&preset=cn408-2009-q15$/u);
  await expect(page.getByRole('heading', { name: '存储器芯片扩展' })).toBeVisible();
  await expectNoPageOverflow(page);
  expect(pageErrors).toEqual([]);
});
