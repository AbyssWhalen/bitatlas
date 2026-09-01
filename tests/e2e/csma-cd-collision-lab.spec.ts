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
      path: path.join(screenshotRoot, `${project}-csma-cd-collision-q37.png`),
      fullPage: true,
      animations: 'disabled',
    });
    return;
  }

  const main = page.locator('.main-area');
  await main.evaluate((element) => { element.scrollTop = 0; });
  await page.screenshot({
    path: path.join(screenshotRoot, `${project}-csma-cd-collision-q37-top.png`),
    animations: 'disabled',
  });
  await page.locator('.csma-cd-equation').evaluate((element) => {
    element.scrollIntoView({ block: 'start' });
  });
  await page.screenshot({
    path: path.join(screenshotRoot, `${project}-csma-cd-collision-q37-state.png`),
    animations: 'disabled',
  });
  await main.evaluate((element) => { element.scrollTop = element.scrollHeight; });
  await page.screenshot({
    path: path.join(screenshotRoot, `${project}-csma-cd-collision-q37-bottom.png`),
    animations: 'disabled',
  });
}

test('replays Q37 CSMA/CD distance reduction, URL state, recovery, and bidirectional deep links', async ({ page }, testInfo) => {
  const pageErrors: string[] = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));

  await page.goto('/lab/network?module=csma-cd&preset=cn408-2009-q37');
  await expect(page).toHaveURL(/\/lab\/network\?module=csma-cd&preset=cn408-2009-q37$/u);
  await expect(page.getByRole('heading', { name: 'CSMA/CD 碰撞域实验室' })).toBeVisible();
  await expect(page.getByText('needs-review')).toBeVisible();

  const moduleNavigation = page.getByLabel('计算机网络实验模块');
  await expect(moduleNavigation.getByRole('link')).toHaveCount(8);
  await expect(moduleNavigation.getByRole('link', { name: 'CSMA/CD' })).toHaveAttribute('aria-current', 'page');
  await expect(moduleNavigation.getByRole('link', { name: 'CSMA/CD' })).toHaveClass(/active/u);
  await expect(page.getByLabel('传输速率')).toHaveValue('1000000000');
  await expect(page.getByLabel('传播速度')).toHaveValue('200000000');
  await expect(page.getByLabel('减少的最小帧长')).toHaveValue('800');
  await expect(page.getByLabel('CSMA/CD 距离变化公式')).toContainText('80 m');
  await expect(page.locator('.csma-cd-metrics').getByText('0.8 μs', { exact: true })).toHaveCount(2);
  await expect(page.locator('.csma-cd-timeline').getByText('0.8 μs', { exact: true })).toHaveCount(2);
  await expect(page.getByLabel('减少 80 米才能保持 CSMA/CD 碰撞检测的往返时延约束')).toContainText('80 m');

  const stepCounter = page.getByLabel('转换步骤').locator('.step-transport > span');
  await expect(stepCounter).toHaveText('1 / 5');
  await expect(page.getByLabel('当前 CSMA/CD 推导步骤')).toContainText('读取题设参数');
  await page.getByRole('button', { name: '下一步' }).click();
  await expect(stepCounter).toHaveText('2 / 5');
  await expect(page.getByLabel('当前 CSMA/CD 推导步骤')).toContainText('计算发送时间差');
  await expect(page.getByLabel('当前 CSMA/CD 推导步骤')).toContainText('0.0000008 s');
  await page.getByRole('button', { name: '下一步' }).click();
  await expect(page.getByLabel('当前 CSMA/CD 推导步骤')).toContainText('匹配往返传播时延');
  await expectNoPageOverflow(page);
  await capture(page, testInfo);

  await page.getByRole('button', { name: '复位步骤' }).click();
  await expect(stepCounter).toHaveText('1 / 5');
  await expect(page.getByLabel('当前 CSMA/CD 推导步骤')).toContainText('读取题设参数');
  await page.getByRole('button', { name: '播放步骤' }).click();
  await expect(page.getByRole('button', { name: '暂停步骤' })).toBeVisible();
  await expect.poll(() => stepCounter.textContent()).not.toBe('1 / 5');
  await page.getByRole('button', { name: '暂停步骤' }).click();
  await page.getByRole('button', { name: '复位步骤' }).click();
  await expect(stepCounter).toHaveText('1 / 5');

  await page.getByLabel('减少的最小帧长').fill('0');
  await expect(page.getByRole('alert')).toContainText('正整数');
  await expect(page.getByLabel('转换步骤')).toHaveCount(0);
  await expect(page.getByLabel('CSMA/CD 距离变化公式')).toHaveCount(0);
  await expect(page.locator('.csma-cd-timeline')).toHaveCount(0);
  await page.getByRole('button', { name: '恢复 Q37 预设' }).click();
  await expect(page).toHaveURL(/\/lab\/network\?module=csma-cd&preset=cn408-2009-q37$/u);
  await expect(page.getByRole('alert')).toHaveCount(0);
  await expect(page.getByLabel('减少的最小帧长')).toHaveValue('800');

  await page.getByLabel('传输速率').fill('100000000');
  await page.getByLabel('传播速度').fill('200000000');
  await page.getByLabel('减少的最小帧长').fill('100');
  await expect(page).toHaveURL((url) => (
    url.pathname === '/lab/network'
    && url.searchParams.get('module') === 'csma-cd'
    && url.searchParams.get('rate') === '100000000'
    && url.searchParams.get('speed') === '200000000'
    && url.searchParams.get('reduction') === '100'
    && url.searchParams.get('preset') === null
  ));
  await expect(page.getByLabel('CSMA/CD 距离变化公式')).toContainText('100 m');
  await expect(page.locator('.csma-cd-metrics').getByText('1 μs', { exact: true })).toHaveCount(2);
  await expect(page.locator('.csma-cd-timeline').getByText('1 μs', { exact: true })).toHaveCount(2);
  const customUrl = page.url();
  await page.reload();
  await expect(page.getByLabel('传输速率')).toHaveValue('100000000');
  await expect(page.getByLabel('传播速度')).toHaveValue('200000000');
  await expect(page.getByLabel('减少的最小帧长')).toHaveValue('100');
  await expect(page.getByLabel('CSMA/CD 距离变化公式')).toContainText('100 m');

  await moduleNavigation.getByRole('link', { name: 'CSMA/CD' }).click();
  await expect(page).toHaveURL(/\/lab\/network\?module=csma-cd&preset=cn408-2009-q37$/u);
  await expect(page.getByLabel('减少的最小帧长')).toHaveValue('800');
  await page.goBack();
  await expect(page).toHaveURL(customUrl);
  await expect(page.getByLabel('减少的最小帧长')).toHaveValue('100');
  await page.goForward();
  await expect(page).toHaveURL(/\/lab\/network\?module=csma-cd&preset=cn408-2009-q37$/u);
  await expect(page.getByLabel('减少的最小帧长')).toHaveValue('800');

  await page.getByRole('button', { name: '练习 2009 · Q37' }).click();
  await expect(page.locator('.practice-topbar strong')).toContainText('第 37 题');
  await page.getByRole('button', { name: 'CSMA/CD 碰撞域距离' }).click();
  await expect(page).toHaveURL(/\/lab\/network\?module=csma-cd&preset=cn408-2009-q37$/u);
  await expect(page.getByRole('heading', { name: 'CSMA/CD 碰撞域实验室' })).toBeVisible();

  await page.getByRole('button', { name: '查看知识节点' }).click();
  await expect(page).toHaveURL((url) => (
    url.pathname === '/knowledge'
    && url.searchParams.get('subject') === 'computer-networks'
    && url.searchParams.get('node') === 'topic-2009-q37'
  ));
  await expect(page.getByRole('button', { name: '打开对应实验' })).toHaveAttribute('title', 'CSMA/CD 碰撞域距离');
  await page.getByRole('button', { name: '打开对应实验' }).click();
  await expect(page).toHaveURL(/\/lab\/network\?module=csma-cd&preset=cn408-2009-q37$/u);
  await expect(page.getByRole('heading', { name: 'CSMA/CD 碰撞域实验室' })).toBeVisible();

  await page.goto('/lab/network?preset=cn408-2009-q37');
  await expect(page).toHaveURL(/\/lab\/network\?preset=cn408-2009-q37$/u);
  await expect(page.getByRole('heading', { name: 'CSMA/CD 碰撞域实验室' })).toBeVisible();
  await expect(page.getByLabel('CSMA/CD 距离变化公式')).toContainText('80 m');
  await expectNoPageOverflow(page);
  expect(pageErrors).toEqual([]);
});
