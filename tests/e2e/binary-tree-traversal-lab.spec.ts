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
      path: path.join(screenshotRoot, `${project}-binary-tree-traversal-q03.png`),
      fullPage: true,
      animations: 'disabled',
    });
    return;
  }

  const main = page.locator('.main-area');
  await main.evaluate((element) => { element.scrollTop = 0; });
  await page.screenshot({
    path: path.join(screenshotRoot, `${project}-binary-tree-traversal-q03-top.png`),
    animations: 'disabled',
  });
  await page.getByLabel('当前二叉树').evaluate((element) => {
    element.scrollIntoView({ block: 'start' });
  });
  await page.screenshot({
    path: path.join(screenshotRoot, `${project}-binary-tree-traversal-q03-state.png`),
    animations: 'disabled',
  });
  await main.evaluate((element) => { element.scrollTop = element.scrollHeight; });
  await page.screenshot({
    path: path.join(screenshotRoot, `${project}-binary-tree-traversal-q03-bottom.png`),
    animations: 'disabled',
  });
}

test('replays Q3 traversal, URL history, recovery, and bidirectional deep links', async ({ page }, testInfo) => {
  const pageErrors: string[] = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));

  await page.goto('/lab/data-structures?module=tree-traversal&preset=cn408-2009-q03&order=RNL');
  await expect(page).toHaveURL(/\/lab\/data-structures\?module=tree-traversal&preset=cn408-2009-q03&order=RNL$/u);
  await expect(page.getByRole('heading', { name: '二叉树遍历实验室' })).toBeVisible();
  await expect(page.getByText('needs-review')).toBeVisible();

  const moduleNavigation = page.getByRole('navigation', { name: '数据结构实验模块' });
  await expect(moduleNavigation.getByRole('link')).toHaveCount(8);
  await expect(moduleNavigation.getByRole('link', { name: '二叉树遍历' })).toHaveAttribute('aria-current', 'page');
  await expect(page.getByLabel('层序结点')).toHaveValue('1,2,3,4,5,#,#,#,#,6,7');
  await expect(page.getByRole('button', { name: 'RNL', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByLabel('遍历结果')).toContainText('3, 1, 7, 5, 6, 2, 4');
  await expect(page.getByLabel('当前二叉树').locator('[data-tree-node-id]')).toHaveCount(7);

  const stepCounter = page.getByLabel('转换步骤').locator('.step-transport > span');
  await expect(stepCounter).toHaveText('1 / 22');
  await expect(page.getByLabel('递归调用栈')).toContainText('空');

  const nextStep = page.getByRole('button', { name: '下一步' });
  await nextStep.click();
  await expect(page.getByLabel('当前遍历事件')).toContainText('进入结点 1');
  await expect(page.getByLabel('递归调用栈')).toContainText('1');
  await nextStep.click();
  await expect(page.getByLabel('当前遍历事件')).toContainText('进入结点 3');
  await expect(page.getByLabel('递归调用栈')).toContainText('3');
  await nextStep.click();
  await expect(page.getByLabel('当前遍历事件')).toContainText('访问结点 3');
  await expect(stepCounter).toHaveText('4 / 22');
  await expect(page.getByLabel('当前二叉树').locator('[data-tree-node-id="3"]')).toHaveClass(/visited/u);
  await expectNoPageOverflow(page);
  await capture(page, testInfo);

  await page.getByRole('button', { name: '复位步骤' }).click();
  await expect(stepCounter).toHaveText('1 / 22');
  await expect(page.getByLabel('递归调用栈')).toContainText('空');
  await page.getByRole('button', { name: '播放步骤' }).click();
  await expect(page.getByRole('button', { name: '暂停步骤' })).toBeVisible();
  await expect.poll(() => stepCounter.textContent()).not.toBe('1 / 22');
  await page.getByRole('button', { name: '暂停步骤' }).click();

  await page.getByLabel('层序结点').fill('1,#,#,2');
  await expect(page.getByRole('alert')).toContainText(/父结点|不可达|层序/u);
  await expect(page.getByLabel('转换步骤')).toHaveCount(0);
  await expect(page.getByLabel('当前二叉树')).toHaveCount(0);
  await expect(page.getByLabel('遍历结果')).toHaveCount(0);
  await page.getByRole('button', { name: '恢复 Q3 预设' }).click();
  await expect(page).toHaveURL(/\/lab\/data-structures\?module=tree-traversal&preset=cn408-2009-q03&order=RNL$/u);
  await expect(page.getByRole('alert')).toHaveCount(0);

  await page.getByLabel('层序结点').fill('A,B,C');
  await page.getByRole('button', { name: 'NLR', exact: true }).click();
  await expect(page).toHaveURL((url) => (
    url.pathname === '/lab/data-structures'
    && url.searchParams.get('module') === 'tree-traversal'
    && url.searchParams.get('tree') === 'A,B,C'
    && url.searchParams.get('order') === 'NLR'
    && url.searchParams.get('preset') === null
  ));
  await expect(page.getByLabel('遍历结果')).toContainText('A, B, C');
  const customUrl = page.url();
  await page.reload();
  await expect(page.getByLabel('层序结点')).toHaveValue('A,B,C');
  await expect(page.getByRole('button', { name: 'NLR', exact: true })).toHaveAttribute('aria-pressed', 'true');

  await moduleNavigation.getByRole('link', { name: '二叉树遍历' }).click();
  await expect(page).toHaveURL(/\/lab\/data-structures\?module=tree-traversal&preset=cn408-2009-q03&order=RNL$/u);
  await expect(page.getByLabel('层序结点')).toHaveValue('1,2,3,4,5,#,#,#,#,6,7');
  await page.goBack();
  await expect(page).toHaveURL(customUrl);
  await expect(page.getByLabel('层序结点')).toHaveValue('A,B,C');
  await page.goForward();
  await expect(page).toHaveURL(/\/lab\/data-structures\?module=tree-traversal&preset=cn408-2009-q03&order=RNL$/u);

  await page.getByRole('button', { name: '练习 2009 · Q3' }).click();
  await expect(page.locator('.practice-topbar strong')).toContainText('第 3 题');
  await page.getByRole('button', { name: /二叉树.*遍历/u }).click();
  await expect(page).toHaveURL(/\/lab\/data-structures\?module=tree-traversal&preset=cn408-2009-q03&order=RNL$/u);
  await expect(page.getByRole('heading', { name: '二叉树遍历实验室' })).toBeVisible();

  await page.getByRole('button', { name: '查看知识节点' }).click();
  await expect(page).toHaveURL((url) => (
    url.pathname === '/knowledge'
    && url.searchParams.get('subject') === 'data-structures'
    && url.searchParams.get('node') === 'topic-2009-q03'
  ));
  await expect(page.getByRole('button', { name: '打开对应实验' })).toBeVisible();
  await page.getByRole('button', { name: '打开对应实验' }).click();
  await expect(page).toHaveURL(/\/lab\/data-structures\?module=tree-traversal&preset=cn408-2009-q03&order=RNL$/u);

  await page.goto('/lab/data-structures?preset=cn408-2009-q03');
  await expect(page).toHaveURL(/\/lab\/data-structures\?preset=cn408-2009-q03$/u);
  await expect(page.getByRole('heading', { name: '二叉树遍历实验室' })).toBeVisible();
  await expect(page.getByLabel('遍历结果')).toContainText('3, 1, 7, 5, 6, 2, 4');
  await expectNoPageOverflow(page);
  expect(pageErrors).toEqual([]);
});
