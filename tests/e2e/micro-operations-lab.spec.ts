import path from 'node:path';
import { mkdir } from 'node:fs/promises';
import { expect, test, type Page, type TestInfo } from '@playwright/test';

const screenshotRoot = path.resolve('output', 'playwright', 'screenshots');
const canonicalPath = '/lab?module=micro-operations&preset=cn408-2009-q44&schedule=parallel-5';
const canonicalUrl = /\/lab\?module=micro-operations&preset=cn408-2009-q44&schedule=parallel-5$/u;

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
      path: path.join(screenshotRoot, `${project}-micro-operations-q44.png`),
      fullPage: true,
      animations: 'disabled',
    });
    return;
  }

  const main = page.locator('.main-area');
  await main.evaluate((element) => { element.scrollTop = 0; });
  await page.screenshot({
    path: path.join(screenshotRoot, `${project}-micro-operations-q44-top.png`),
    animations: 'disabled',
  });
  await page.locator('.micro-operations-state-panel').scrollIntoViewIfNeeded();
  await page.screenshot({
    path: path.join(screenshotRoot, `${project}-micro-operations-q44-state.png`),
    animations: 'disabled',
  });
  await main.evaluate((element) => { element.scrollTop = element.scrollHeight; });
  await page.screenshot({
    path: path.join(screenshotRoot, `${project}-micro-operations-q44-bottom.png`),
    animations: 'disabled',
  });
}

test('replays Q44 micro-operation schedules with URL, practice, and knowledge recovery', async ({ page }, testInfo) => {
  const pageErrors: string[] = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));

  await page.goto(canonicalPath);
  await expect(page).toHaveURL(canonicalUrl);
  await expect(page.getByRole('heading', { name: '数据通路微操作调度' })).toBeVisible();
  await expect(page.getByText('needs-review')).toBeVisible();

  const tabs = page.getByRole('navigation', { name: '实验类型' });
  await expect(tabs.getByRole('button')).toHaveCount(11);
  await expect(tabs.getByRole('button', { name: '微操作调度' })).toHaveClass(/active/u);
  await expect(page.getByRole('button', { name: '5 拍并行方案' })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByLabel('R0 初值')).toHaveValue('4660');
  await expect(page.getByLabel('R1 地址')).toHaveValue('256');
  await expect(page.getByLabel('目标内存字初值')).toHaveValue('255');
  await expect(page.getByLabel('当前微操作')).toContainText('C5');
  await expect(page.getByLabel('当前寄存器状态')).toContainText('Aunknown');
  await expect(page.getByLabel('当前寄存器状态')).toContainText('ACunknown');
  await expect(page.getByLabel('当前寄存器状态')).toContainText('MDRunknown');
  await expect(page.getByLabel('AB 地址总线')).toContainText('MARunknown');
  await expect(page.locator('.micro-operations-step-explorer .step-transport > span')).toHaveText('1 / 5');
  await expect(page.locator('[aria-live="polite"]')).toHaveCount(1);

  await page.getByRole('button', { name: '下一步' }).click();
  await expect(page.getByLabel('当前微操作')).toContainText('MDR <- M(MAR)');
  await expect(page.getByLabel('当前微操作')).toContainText('A <- R0');
  await expect(page.getByLabel('AB 地址总线')).toContainText('MAR0x0100');
  await expect(page.getByLabel('DB 数据总线')).toContainText('memory0x00ff');
  await expect(page.getByLabel('CPU 内总线')).toContainText('R00x1234');
  await expect(page.getByLabel('有效控制信号')).toContainText('MemR');
  await expect(page.getByLabel('有效控制信号')).toContainText('MDRinE');
  await expect(page.getByLabel('当前寄存器状态')).toContainText('A0x1234');
  await expect(page.getByLabel('当前寄存器状态')).toContainText('MDR0x00ff');
  await expect(page.getByLabel('当前寄存器状态')).toContainText('ACunknown');

  await page.getByRole('button', { name: '播放步骤' }).click();
  await expect(page.getByRole('button', { name: '暂停步骤' })).toBeVisible();
  await expect.poll(() => page.locator('.micro-operations-step-explorer .step-transport > span').textContent()).not.toBe('2 / 5');
  await page.getByRole('button', { name: '暂停步骤' }).click();
  await page.getByRole('button', { name: '复位步骤' }).click();
  await expect(page.locator('.micro-operations-step-explorer .step-transport > span')).toHaveText('1 / 5');

  await page.getByRole('button', { name: '6 拍分步方案' }).click();
  await expect(page).toHaveURL(/\/lab\?module=micro-operations&preset=cn408-2009-q44&schedule=split-6$/u);
  await expect(page.locator('.micro-operations-step-explorer .step-transport > span')).toHaveText('1 / 6');
  for (const cycle of [6, 7, 8, 9, 10]) {
    await page.getByRole('button', { name: '下一步' }).click();
    await expect(page.getByLabel('当前微操作')).toContainText(`C${cycle}`);
    await expect(page.getByLabel('AB 地址总线')).toContainText('MAR0x0100');
    if (cycle === 6) {
      await expect(page.getByLabel('CPU 内总线')).toContainText('idle');
      await expect(page.getByLabel('当前寄存器状态')).toContainText('Aunknown');
      await expect(page.getByLabel('当前寄存器状态')).toContainText('ACunknown');
    }
  }
  await expect(page.getByLabel('当前寄存器状态')).toContainText('A0x00ff');
  await expect(page.getByLabel('当前寄存器状态')).toContainText('M[R1]0x1333');

  await page.getByRole('button', { name: '5 拍并行方案' }).click();
  await expect(page.locator('.micro-operations-step-explorer .step-transport > span')).toHaveText('1 / 5');
  for (const cycle of [6, 7, 8, 9]) {
    await page.getByRole('button', { name: '下一步' }).click();
    await expect(page.getByLabel('当前微操作')).toContainText(`C${cycle}`);
    await expect(page.getByLabel('AB 地址总线')).toContainText('MAR0x0100');
  }
  await expect(page.getByLabel('当前寄存器状态')).toContainText('A0x1234');
  await expect(page.getByLabel('当前寄存器状态')).toContainText('M[R1]0x1333');
  await expect(page.getByLabel('架构可见结果')).toContainText('暂存 A 可能不同');

  await page.getByLabel('R0 初值').fill('65535');
  await page.getByLabel('R1 地址').fill('65535');
  await page.getByLabel('目标内存字初值').fill('2');
  await expect(page).toHaveURL((url) => (
    url.pathname === '/lab'
    && url.searchParams.get('module') === 'micro-operations'
    && url.searchParams.get('schedule') === 'parallel-5'
    && url.searchParams.get('r0') === '65535'
    && url.searchParams.get('r1') === '65535'
    && url.searchParams.get('memoryWord') === '2'
    && url.searchParams.get('preset') === null
  ));
  await expect(page.getByLabel('架构可见结果')).toContainText('0x0001');
  await page.reload();
  await expect(page.getByLabel('R0 初值')).toHaveValue('65535');
  await expect(page.getByLabel('架构可见结果')).toContainText('0x0001');

  await page.getByLabel('目标内存字初值').fill('65536');
  await expect(page.getByRole('alert')).toContainText('16 位');
  await expect(page.getByLabel('当前寄存器状态')).toHaveCount(0);
  await expect(page.locator('.micro-operations-step-explorer')).toHaveCount(0);
  await page.getByRole('button', { name: '恢复 Q44 预设' }).click();
  await expect(page).toHaveURL(canonicalUrl);
  await expect(page.getByRole('alert')).toHaveCount(0);

  await page.getByLabel('R0 初值').fill('7');
  await page.getByLabel('R1 地址').fill('8');
  await page.getByLabel('目标内存字初值').fill('9');
  const customUrl = page.url();
  await page.getByRole('button', { name: '查看知识节点' }).click();
  await expect(page).toHaveURL((url) => (
    url.pathname === '/knowledge'
    && url.searchParams.get('subject') === 'computer-organization'
    && url.searchParams.get('node') === 'topic-2009-q44'
  ));
  await expect(page.getByRole('button', { name: '打开对应实验' })).toHaveAttribute('title', '数据通路微操作调度');
  await page.getByRole('button', { name: '打开对应实验' }).click();
  await expect(page).toHaveURL(canonicalUrl);
  await page.goBack();
  await expect(page).toHaveURL(/\/knowledge\?subject=computer-organization&node=topic-2009-q44$/u);
  await page.goBack();
  await expect(page).toHaveURL(customUrl);
  await expect(page.getByLabel('R0 初值')).toHaveValue('7');
  await expect(page.locator('.micro-operations-step-explorer .step-transport > span')).toHaveText('1 / 5');
  await page.goForward();
  await expect(page).toHaveURL(/\/knowledge\?subject=computer-organization&node=topic-2009-q44$/u);
  await page.getByRole('button', { name: '打开对应实验' }).click();

  await page.getByRole('button', { name: '下一步' }).click();
  await expect(page.getByLabel('当前微操作')).toContainText('C6');
  await expectNoPageOverflow(page);
  await capture(page, testInfo);

  if (testInfo.project.name === 'chromium-390') {
    await expect.poll(() => page.evaluate(() => {
      const event = document.querySelector<HTMLElement>('.micro-operations-current-event')?.getBoundingClientRect();
      const explorer = document.querySelector<HTMLElement>('.micro-operations-step-explorer')?.getBoundingClientRect();
      const state = document.querySelector<HTMLElement>('.micro-operations-state-panel')?.getBoundingClientRect();
      return Boolean(event && explorer && state && event.bottom <= explorer.top && explorer.bottom <= state.top);
    })).toBe(true);
  }

  await page.getByRole('button', { name: '相关真题 1 题' }).click();
  await expect(page.locator('.practice-topbar strong')).toContainText('第 44 题');
  await expect(page.getByRole('button', { name: '数据通路微操作调度' })).toBeVisible();
  await page.getByRole('button', { name: '数据通路微操作调度' }).click();
  await expect(page).toHaveURL(canonicalUrl);
  await expect(page.getByRole('heading', { name: '数据通路微操作调度' })).toBeVisible();
  await expectNoPageOverflow(page);
  expect(pageErrors).toEqual([]);
});
