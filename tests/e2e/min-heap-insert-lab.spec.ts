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

async function expectHeap(page: Page, values: readonly string[]) {
  const cells = page.getByLabel('当前层序数组').locator('code');
  await expect(cells).toHaveCount(values.length);
  await expect(cells).toHaveText([...values]);
}

async function capture(page: Page, testInfo: TestInfo) {
  await mkdir(screenshotRoot, { recursive: true });
  const project = testInfo.project.name;
  if (project !== 'chromium-390') {
    await page.screenshot({
      path: path.join(screenshotRoot, `${project}-min-heap-insert-q09.png`),
      fullPage: true,
      animations: 'disabled',
    });
    return;
  }

  const main = page.locator('.main-area');
  await main.evaluate((element) => { element.scrollTop = 0; });
  await page.screenshot({
    path: path.join(screenshotRoot, `${project}-min-heap-insert-q09-top.png`),
    animations: 'disabled',
  });
  await page.locator('.min-heap-state-panel').evaluate((element) => {
    element.scrollIntoView({ block: 'start' });
  });
  await page.screenshot({
    path: path.join(screenshotRoot, `${project}-min-heap-insert-q09-state.png`),
    animations: 'disabled',
  });
  await main.evaluate((element) => { element.scrollTop = element.scrollHeight; });
  await page.screenshot({
    path: path.join(screenshotRoot, `${project}-min-heap-insert-q09-bottom.png`),
    animations: 'disabled',
  });
}

test('replays Q9 min-heap insertion, URL state, recovery, and practice deep links', async ({ page }, testInfo) => {
  const pageErrors: string[] = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));

  await page.goto('/lab/data-structures?module=min-heap&preset=cn408-2009-q09');
  await expect(page).toHaveURL(/\/lab\/data-structures\?module=min-heap&preset=cn408-2009-q09$/u);
  await expect(page.getByRole('heading', { name: '小根堆插入实验室' })).toBeVisible();
  await expect(page.getByText('needs-review')).toBeVisible();

  const moduleNavigation = page.getByRole('navigation', { name: '数据结构实验模块' });
  await expect(moduleNavigation.getByRole('link')).toHaveCount(8);
  await expect(moduleNavigation.getByRole('link', { name: '小根堆插入' })).toHaveAttribute('aria-current', 'page');
  await expect(page.getByLabel('初始小根堆')).toHaveValue('5,8,12,19,28,20,15,22');
  await expect(page.getByLabel('插入关键字')).toHaveValue('3');
  await expect(page.getByLabel('交换次数')).toContainText('3');
  await expect(page.getByLabel('最终层序')).toContainText('3, 5, 12, 8, 28, 20, 15, 22, 19');
  await expect(page.locator('.min-heap-step-explorer .step-transport > span')).toHaveText('1 / 6');
  await expectHeap(page, ['5', '8', '12', '19', '28', '20', '15', '22']);

  const nextStep = page.getByRole('button', { name: '下一步' });
  await nextStep.click();
  await expect(page.getByLabel('当前堆事件')).toContainText('追加关键字 3');
  await expectHeap(page, ['5', '8', '12', '19', '28', '20', '15', '22', '3']);

  await nextStep.click();
  await expect(page.getByLabel('当前堆事件')).toContainText('3 与父结点 19 交换');
  await expectHeap(page, ['5', '8', '12', '3', '28', '20', '15', '22', '19']);

  await nextStep.click();
  await expect(page.getByLabel('当前堆事件')).toContainText('3 与父结点 8 交换');
  await expectHeap(page, ['5', '3', '12', '8', '28', '20', '15', '22', '19']);

  await nextStep.click();
  await expect(page.getByLabel('当前堆事件')).toContainText('3 与父结点 5 交换');
  await expectHeap(page, ['3', '5', '12', '8', '28', '20', '15', '22', '19']);
  await expect(page.getByLabel('当前根结点')).toContainText('3');
  await expect(page.locator('[data-heap-index="0"]')).toHaveClass(/focus/u);
  await expectNoPageOverflow(page);

  if (testInfo.project.name === 'chromium-390') {
    const [eventBox, explorerBox, stateBox] = await Promise.all([
      page.locator('.min-heap-current-event').boundingBox(),
      page.locator('.min-heap-step-explorer').boundingBox(),
      page.locator('.min-heap-state-panel').boundingBox(),
    ]);
    expect(eventBox).not.toBeNull();
    expect(explorerBox).not.toBeNull();
    expect(stateBox).not.toBeNull();
    expect(eventBox!.y + eventBox!.height).toBeLessThanOrEqual(explorerBox!.y + 1);
    expect(explorerBox!.y + explorerBox!.height).toBeLessThanOrEqual(stateBox!.y + 1);
    expect(explorerBox!.height).toBeLessThan(430);
    await expect(page.locator('.mobile-nav')).toHaveCSS('position', 'static');
  }
  await capture(page, testInfo);

  await nextStep.click();
  await expect(page.getByLabel('当前堆事件')).toContainText('上浮完成，停在索引 0');
  await expect(page.locator('.min-heap-step-explorer .step-transport > span')).toHaveText('6 / 6');
  await expectHeap(page, ['3', '5', '12', '8', '28', '20', '15', '22', '19']);

  await page.getByRole('button', { name: '复位步骤' }).click();
  const stepCounter = page.locator('.min-heap-step-explorer .step-transport > span');
  await expect(stepCounter).toHaveText('1 / 6');
  await expectHeap(page, ['5', '8', '12', '19', '28', '20', '15', '22']);
  await page.getByRole('button', { name: '播放步骤' }).click();
  await expect(page.getByRole('button', { name: '暂停步骤' })).toBeVisible();
  await expect.poll(() => stepCounter.textContent()).not.toBe('1 / 6');
  await page.getByRole('button', { name: '暂停步骤' }).click();

  await page.getByLabel('初始小根堆').fill('8,5,12');
  await expect(page.getByRole('alert')).toContainText(/initialHeap must be a min-heap/u);
  await expect(page.getByLabel('转换步骤')).toHaveCount(0);
  await expect(page.getByLabel('当前堆树')).toHaveCount(0);
  await expect(page.getByLabel('当前层序数组')).toHaveCount(0);
  await page.getByRole('button', { name: '恢复 Q9 预设' }).click();
  await expect(page).toHaveURL(/\/lab\/data-structures\?module=min-heap&preset=cn408-2009-q09$/u);
  await expect(page.getByRole('alert')).toHaveCount(0);

  await page.getByLabel('初始小根堆').fill('1,4,2');
  await page.getByLabel('插入关键字').fill('0');
  await expect(page).toHaveURL((url) => (
    url.pathname === '/lab/data-structures'
    && url.searchParams.get('module') === 'min-heap'
    && url.searchParams.get('heap') === '1,4,2'
    && url.searchParams.get('value') === '0'
  ));
  await expect(page.getByLabel('最终层序')).toContainText('0, 1, 2, 4');
  const customUrl = page.url();
  await page.reload();
  await expect(page.getByLabel('初始小根堆')).toHaveValue('1,4,2');
  await expect(page.getByLabel('插入关键字')).toHaveValue('0');

  await moduleNavigation.getByRole('link', { name: '小根堆插入' }).click();
  await expect(page).toHaveURL(/\/lab\/data-structures\?module=min-heap&preset=cn408-2009-q09$/u);
  await expect(page.getByLabel('初始小根堆')).toHaveValue('5,8,12,19,28,20,15,22');
  await page.goBack();
  await expect(page).toHaveURL(customUrl);
  await expect(page.getByLabel('初始小根堆')).toHaveValue('1,4,2');
  await page.goForward();
  await expect(page).toHaveURL(/\/lab\/data-structures\?module=min-heap&preset=cn408-2009-q09$/u);

  await page.getByRole('button', { name: '练习 2009 · Q9' }).click();
  await expect(page.locator('.practice-topbar strong')).toContainText('第 9 题');
  await page.getByRole('button', { name: '小根堆插入' }).click();
  await expect(page).toHaveURL(/\/lab\/data-structures\?module=min-heap&preset=cn408-2009-q09$/u);
  await expect(page.getByRole('heading', { name: '小根堆插入实验室' })).toBeVisible();

  await page.goto('/lab/data-structures?preset=cn408-2009-q09');
  await expect(page).toHaveURL(/\/lab\/data-structures\?preset=cn408-2009-q09$/u);
  await expect(page.getByRole('heading', { name: '小根堆插入实验室' })).toBeVisible();
  await expect(page.getByLabel('初始小根堆')).toHaveValue('5,8,12,19,28,20,15,22');
  await expectNoPageOverflow(page);
  expect(pageErrors).toEqual([]);
});
