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
      path: path.join(screenshotRoot, `${project}-complete-binary-tree-q05.png`),
      fullPage: true,
      animations: 'disabled',
    });
    return;
  }

  const main = page.locator('.main-area');
  await main.evaluate((element) => { element.scrollTop = 0; });
  await page.screenshot({ path: path.join(screenshotRoot, `${project}-complete-binary-tree-q05-top.png`), animations: 'disabled' });
  await page.locator('.complete-tree-state-panel').evaluate((element) => element.scrollIntoView({ block: 'start' }));
  await page.screenshot({ path: path.join(screenshotRoot, `${project}-complete-binary-tree-q05-state.png`), animations: 'disabled' });
  await main.evaluate((element) => { element.scrollTop = element.scrollHeight; });
  await page.screenshot({ path: path.join(screenshotRoot, `${project}-complete-binary-tree-q05-bottom.png`), animations: 'disabled' });
}

test('derives Q5 maximum nodes, restores URL state, and keeps bidirectional deep links', async ({ page }, testInfo) => {
  const pageErrors: string[] = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));

  await page.goto('/lab/data-structures?module=complete-tree&preset=cn408-2009-q05');
  await expect(page).toHaveURL(/\/lab\/data-structures\?module=complete-tree&preset=cn408-2009-q05$/u);
  await expect(page.getByRole('heading', { name: '完全二叉树最大结点实验室' })).toBeVisible();
  await expect(page.getByText('needs-review')).toBeVisible();
  await expect(page.getByLabel('叶结点所在层 L')).toHaveValue('6');
  await expect(page.getByLabel('该层叶结点数 k')).toHaveValue('8');
  await expect(page.getByLabel('当前最大结点结论')).toContainText('待推导');
  await expect(page.locator('[aria-live="polite"]')).toHaveCount(1);

  const moduleNavigation = page.getByRole('navigation', { name: '数据结构实验模块' });
  await expect(moduleNavigation.getByRole('link')).toHaveCount(8);
  await expect(moduleNavigation.getByRole('link', { name: '完全树极值' })).toHaveAttribute('aria-current', 'page');
  const counter = page.locator('.complete-tree-step-explorer .step-transport > span');
  await expect(counter).toHaveText('1 / 6');

  const next = page.getByRole('button', { name: '下一步' });
  await next.click();
  await expect(page.getByLabel('当前推导状态')).toContainText('容量 32');
  await expect(page.getByLabel('当前推导状态')).toContainText('前 6 层共 63 个结点');
  await next.click();
  await expect(page.getByRole('img', { name: /目标层容量分区/u })).toContainText('24 个内部结点');
  await expect(page.getByRole('img', { name: /目标层容量分区/u })).toContainText('8 个叶结点');
  await expect(page.locator('.complete-tree-slots span[data-kind="internal"]')).toHaveCount(24);
  await expect(page.locator('.complete-tree-slots span[data-kind="leaf"]')).toHaveCount(8);
  await next.click();
  await expect(page.getByLabel('当前推导状态')).toContainText('最大高度 7');
  await next.click();
  await expect(page.getByLabel('当前推导状态')).toContainText('第 7 层新增 48 个结点');
  await expect(page.getByLabel('当前最大结点结论')).toContainText('待推导');
  await next.click();
  await expect(page.getByLabel('当前最大结点结论')).toContainText('最大结点数 111');
  await expect(page.getByLabel('当前最大结点结论')).toContainText('来源选项 C');
  await expect(counter).toHaveText('6 / 6');
  await expectNoPageOverflow(page);

  if (testInfo.project.name === 'chromium-390') {
    const links = moduleNavigation.getByRole('link');
    const boxes = await Promise.all(Array.from({ length: 8 }, (_, index) => links.nth(index).boundingBox()));
    expect(boxes.every(Boolean)).toBe(true);
    expect(boxes[0]!.y).toBe(boxes[3]!.y);
    expect(boxes[4]!.y).toBe(boxes[7]!.y);
    expect(boxes[4]!.y).toBeGreaterThan(boxes[0]!.y);
    const [eventBox, explorerBox, stateBox, conclusionBox] = await Promise.all([
      page.locator('.complete-tree-current-event').boundingBox(),
      page.locator('.complete-tree-step-explorer').boundingBox(),
      page.locator('.complete-tree-state-panel').boundingBox(),
      page.locator('.complete-tree-conclusion').boundingBox(),
    ]);
    expect(eventBox).not.toBeNull();
    expect(explorerBox).not.toBeNull();
    expect(stateBox).not.toBeNull();
    expect(conclusionBox).not.toBeNull();
    expect(eventBox!.y + eventBox!.height).toBeLessThanOrEqual(explorerBox!.y + 1);
    expect(explorerBox!.y + explorerBox!.height).toBeLessThanOrEqual(stateBox!.y + 1);
    expect(stateBox!.y + stateBox!.height).toBeLessThanOrEqual(conclusionBox!.y + 1);
    await expect(page.locator('.mobile-nav')).toHaveCSS('position', 'static');
  }
  await capture(page, testInfo);

  await page.getByRole('button', { name: '复位步骤' }).click();
  await expect(counter).toHaveText('1 / 6');
  await page.getByRole('button', { name: '播放步骤' }).click();
  await expect(page.getByRole('button', { name: '暂停步骤' })).toBeVisible();
  await expect.poll(() => counter.textContent()).not.toBe('1 / 6');
  await page.getByRole('button', { name: '暂停步骤' }).click();

  await page.getByLabel('叶结点所在层 L').fill('3');
  await page.getByLabel('该层叶结点数 k').fill('5');
  await expect(page.getByRole('alert')).toContainText(/叶结点数|容量|4/u);
  await expect(page.getByLabel('当前推导状态')).toHaveCount(0);
  await expect(page.getByLabel('转换步骤')).toHaveCount(0);
  await expect(page.getByLabel('当前最大结点结论')).toHaveCount(0);
  await page.getByRole('button', { name: '恢复 Q5 预设' }).click();
  await expect(page).toHaveURL(/module=complete-tree&preset=cn408-2009-q05$/u);
  await expect(page.getByRole('alert')).toHaveCount(0);

  await page.getByLabel('叶结点所在层 L').fill('3');
  await page.getByLabel('该层叶结点数 k').fill('1');
  await expect(page).toHaveURL((url) => url.pathname === '/lab/data-structures'
    && url.searchParams.get('module') === 'complete-tree'
    && url.searchParams.get('leafLevel') === '3'
    && url.searchParams.get('leafCount') === '1'
    && !url.searchParams.has('preset'));
  const customUrl = page.url();
  await page.reload();
  await expect(page.getByLabel('叶结点所在层 L')).toHaveValue('3');
  await expect(page.getByLabel('该层叶结点数 k')).toHaveValue('1');
  for (let step = 0; step < 5; step += 1) await page.getByRole('button', { name: '下一步' }).click();
  await expect(page.getByLabel('当前最大结点结论')).toContainText('最大结点数 13');
  await expect(page.getByLabel('当前最大结点结论')).not.toContainText('来源选项 C');

  await page.goto('/lab/data-structures?module=complete-tree&leafLevel=52&leafCount=1');
  for (let step = 0; step < 5; step += 1) await page.getByRole('button', { name: '下一步' }).click();
  await expect(page.getByLabel('最大构型指标')).toContainText('4503599627370495');
  await expect(page.getByLabel('最大构型指标')).toContainText('4503599627370494');
  await expectNoPageOverflow(page);
  if (testInfo.project.name === 'chromium-390') {
    const metricBoxes = await Promise.all(Array.from({ length: 3 }, (_, index) => (
      page.getByLabel('最大构型指标').getByRole('group').nth(index).boundingBox()
    )));
    expect(metricBoxes.every(Boolean)).toBe(true);
    expect(metricBoxes[0]!.y + metricBoxes[0]!.height).toBeLessThanOrEqual(metricBoxes[1]!.y + 1);
    expect(metricBoxes[1]!.y + metricBoxes[1]!.height).toBeLessThanOrEqual(metricBoxes[2]!.y + 1);
  }

  await page.goto(customUrl);
  await moduleNavigation.getByRole('link', { name: '完全树极值' }).click();
  await expect(page).toHaveURL(/module=complete-tree&preset=cn408-2009-q05$/u);
  await page.goBack();
  await expect(page).toHaveURL(customUrl);
  await expect(page.getByLabel('叶结点所在层 L')).toHaveValue('3');
  await page.goForward();
  await expect(page).toHaveURL(/module=complete-tree&preset=cn408-2009-q05$/u);

  await page.goto('/lab/data-structures?module=complete-tree&preset=cn408-2009-q41&leafLevel=3&leafCount=1');
  await expect(page.getByRole('alert')).toHaveCount(0);
  await expect(page.getByLabel('叶结点所在层 L')).toHaveValue('6');
  await page.goto('/lab/data-structures?preset=cn408-2009-q05');
  await expect(page.getByRole('heading', { name: '完全二叉树最大结点实验室' })).toBeVisible();
  await page.goto('/lab/data-structures?module=unknown&preset=cn408-2009-q05');
  await expect(page.getByRole('heading', { name: '最短路径实验室' })).toBeVisible();

  await page.goto('/lab/data-structures?module=complete-tree&preset=cn408-2009-q05');
  await page.getByRole('button', { name: '练习 2009 · Q5' }).click();
  await expect(page.locator('.practice-topbar strong')).toContainText('第 5 题');
  await page.getByRole('button', { name: '完全二叉树最大结点数' }).click();
  await expect(page).toHaveURL(/module=complete-tree&preset=cn408-2009-q05$/u);
  await page.getByRole('button', { name: '查看知识节点' }).click();
  await expect(page).toHaveURL((url) => url.pathname === '/knowledge'
    && url.searchParams.get('subject') === 'data-structures'
    && url.searchParams.get('node') === 'topic-2009-q05');
  await expect(page.getByRole('button', { name: '打开对应实验' })).toHaveAttribute('title', '完全二叉树最大结点数');
  await page.getByRole('button', { name: '打开对应实验' }).click();
  await expect(page).toHaveURL(/module=complete-tree&preset=cn408-2009-q05$/u);
  await expectNoPageOverflow(page);
  expect(pageErrors).toEqual([]);
});
