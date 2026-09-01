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
      path: path.join(screenshotRoot, `${project}-stack-capacity-q02.png`),
      fullPage: true,
      animations: 'disabled',
    });
    return;
  }

  const main = page.locator('.main-area');
  await main.evaluate((element) => { element.scrollTop = 0; });
  await page.screenshot({
    path: path.join(screenshotRoot, `${project}-stack-capacity-q02-top.png`),
    animations: 'disabled',
  });
  await page.locator('.stack-capacity-stack-section').evaluate((element) => {
    element.scrollIntoView({ block: 'center' });
  });
  await page.screenshot({
    path: path.join(screenshotRoot, `${project}-stack-capacity-q02-state.png`),
    animations: 'disabled',
  });
  await main.evaluate((element) => { element.scrollTop = element.scrollHeight; });
  await page.screenshot({
    path: path.join(screenshotRoot, `${project}-stack-capacity-q02-bottom.png`),
    animations: 'disabled',
  });
}

async function clickNext(page: Page, times: number) {
  for (let index = 0; index < times; index += 1) {
    await page.getByRole('button', { name: '下一步' }).click();
  }
}

test('replays Q2 stack capacity, URL state, failure recovery, and practice roundtrip', async ({ page }, testInfo) => {
  const pageErrors: string[] = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));

  await page.goto('/lab/data-structures?module=stack-capacity&preset=cn408-2009-q02');
  await expect(page).toHaveURL(/\/lab\/data-structures\?module=stack-capacity&preset=cn408-2009-q02$/u);
  await expect(page.getByRole('heading', { name: '栈最小容量实验室' })).toBeVisible();
  await expect(page.getByText('needs-review')).toBeVisible();

  const moduleNavigation = page.getByRole('navigation', { name: '数据结构实验模块' });
  await expect(moduleNavigation.getByRole('link')).toHaveCount(8);
  await expect(moduleNavigation.getByRole('link', { name: '栈容量' })).toHaveAttribute('aria-current', 'page');
  await expect(page.getByLabel('入栈顺序')).toHaveValue('a,b,c,d,e,f,g');
  await expect(page.getByLabel('目标出栈顺序')).toHaveValue('b,d,c,f,e,a,g');
  await expect(page.getByLabel('最小栈容量')).toContainText('3');
  await expect(page.getByLabel('栈容量指标')).toContainText('14');
  await expect(page.getByLabel('当前栈', { exact: true })).toContainText('空栈');
  await expect(page.getByLabel('已出栈并入队的顺序')).toContainText('尚未产生输出');
  await expect(page.locator('.stack-capacity-step-explorer .step-transport > span')).toHaveText('1 / 15');

  await clickNext(page, 5);
  await expect(page.getByLabel('当前栈深度')).toHaveText('3');
  await expect(page.getByLabel('当前峰值深度')).toContainText('3');
  await expect(page.locator('[data-stack-value]')).toHaveCount(3);
  await expect(page.locator('[data-stack-position="top"]')).toContainText('d');
  await expect(page.getByLabel('已出栈并入队的顺序').locator('[data-sequence-value]')).toHaveCount(1);
  await expect(page.getByLabel('已出栈并入队的顺序')).toContainText('b');
  await expectNoPageOverflow(page);

  if (testInfo.project.name === 'chromium-390') {
    const [eventBox, explorerBox, stateBox] = await Promise.all([
      page.locator('.stack-capacity-current-event').boundingBox(),
      page.locator('.stack-capacity-step-explorer').boundingBox(),
      page.locator('.stack-capacity-state-panel').boundingBox(),
    ]);
    expect(eventBox).not.toBeNull();
    expect(explorerBox).not.toBeNull();
    expect(stateBox).not.toBeNull();
    expect(eventBox!.y + eventBox!.height).toBeLessThanOrEqual(explorerBox!.y + 1);
    expect(explorerBox!.y + explorerBox!.height).toBeLessThanOrEqual(stateBox!.y + 1);
    expect(explorerBox!.height).toBeLessThan(430);
    await expect(page.locator('.stack-capacity-current-event code')).toHaveCSS('font-size', '10px');
    await expect(page.locator('.mobile-nav')).toHaveCSS('position', 'static');
  }
  await capture(page, testInfo);

  await clickNext(page, 9);
  await expect(page.getByLabel('当前栈', { exact: true })).toContainText('空栈');
  const outputTokens = page.getByLabel('已出栈并入队的顺序').locator('[data-sequence-value]');
  await expect(outputTokens).toHaveCount(7);
  await expect(outputTokens).toHaveText(['b', 'd', 'c', 'f', 'e', 'a', 'g']);
  await expect(page.locator('.stack-capacity-step-explorer .step-transport > span')).toHaveText('15 / 15');

  await page.getByRole('button', { name: '复位步骤' }).click();
  await expect(page.getByLabel('当前栈', { exact: true })).toContainText('空栈');
  const stepCounter = page.locator('.stack-capacity-step-explorer .step-transport > span');
  await expect(stepCounter).toHaveText('1 / 15');
  await page.getByRole('button', { name: '播放步骤' }).click();
  await expect(page.getByRole('button', { name: '暂停步骤' })).toBeVisible();
  await expect.poll(() => stepCounter.textContent()).not.toBe('1 / 15');
  await page.getByRole('button', { name: '暂停步骤' }).click();

  await page.getByLabel('入栈顺序').fill('a,b,c');
  await page.getByLabel('目标出栈顺序').fill('c,a,b');
  await expect(page.getByRole('alert')).toContainText(/cannot produce expected a.*top is b/u);
  await expect(page.getByLabel('转换步骤')).toHaveCount(0);
  await expect(page.getByLabel('当前栈', { exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: '恢复 Q2 预设' }).click();
  await expect(page).toHaveURL(/\/lab\/data-structures\?module=stack-capacity&preset=cn408-2009-q02$/u);
  await expect(page.getByRole('alert')).toHaveCount(0);

  await page.getByLabel('入栈顺序').fill('x,y,z');
  await page.getByLabel('目标出栈顺序').fill('z,y,x');
  await expect(page).toHaveURL((url) => (
    url.pathname === '/lab/data-structures'
    && url.searchParams.get('module') === 'stack-capacity'
    && url.searchParams.get('input') === 'x,y,z'
    && url.searchParams.get('output') === 'z,y,x'
  ));
  await expect(page.getByLabel('最小栈容量')).toContainText('3');
  const customUrl = page.url();
  await page.reload();
  await expect(page.getByLabel('入栈顺序')).toHaveValue('x,y,z');
  await expect(page.getByLabel('目标出栈顺序')).toHaveValue('z,y,x');

  await moduleNavigation.getByRole('link', { name: '栈容量' }).click();
  await expect(page).toHaveURL(/\/lab\/data-structures\?module=stack-capacity&preset=cn408-2009-q02$/u);
  await expect(page.getByLabel('入栈顺序')).toHaveValue('a,b,c,d,e,f,g');
  await page.goBack();
  await expect(page).toHaveURL(customUrl);
  await expect(page.getByLabel('入栈顺序')).toHaveValue('x,y,z');
  await page.goForward();
  await expect(page).toHaveURL(/\/lab\/data-structures\?module=stack-capacity&preset=cn408-2009-q02$/u);

  await page.getByRole('button', { name: '练习 2009 · Q2' }).click();
  await expect(page.locator('.practice-topbar strong')).toContainText('第 2 题');
  await page.getByRole('button', { name: '栈最小容量' }).click();
  await expect(page).toHaveURL(/\/lab\/data-structures\?module=stack-capacity&preset=cn408-2009-q02$/u);
  await expect(page.getByRole('heading', { name: '栈最小容量实验室' })).toBeVisible();
  expect(pageErrors).toEqual([]);
});
