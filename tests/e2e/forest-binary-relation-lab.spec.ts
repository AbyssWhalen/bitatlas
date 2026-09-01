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
      path: path.join(screenshotRoot, `${project}-forest-binary-relation-q06.png`),
      fullPage: true,
      animations: 'disabled',
    });
    return;
  }

  const main = page.locator('.main-area');
  await main.evaluate((element) => { element.scrollTop = 0; });
  await page.screenshot({
    path: path.join(screenshotRoot, `${project}-forest-binary-relation-q06-top.png`),
    animations: 'disabled',
  });
  await page.locator('.forest-binary-state-panel').evaluate((element) => {
    element.scrollIntoView({ block: 'start' });
  });
  await page.screenshot({
    path: path.join(screenshotRoot, `${project}-forest-binary-relation-q06-state.png`),
    animations: 'disabled',
  });
  await main.evaluate((element) => { element.scrollTop = element.scrollHeight; });
  await page.screenshot({
    path: path.join(screenshotRoot, `${project}-forest-binary-relation-q06-bottom.png`),
    animations: 'disabled',
  });
}

test('replays Q6 forest conversion, URL recovery, and bidirectional deep links', async ({ page }, testInfo) => {
  const pageErrors: string[] = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));

  await page.goto('/lab/data-structures?module=forest-conversion&preset=cn408-2009-q06&path=LR');
  await expect(page).toHaveURL(/\/lab\/data-structures\?module=forest-conversion&preset=cn408-2009-q06&path=LR$/u);
  await expect(page.getByRole('heading', { name: '森林与二叉树转换实验室' })).toBeVisible();
  await expect(page.getByText('needs-review')).toBeVisible();

  const moduleNavigation = page.getByRole('navigation', { name: '数据结构实验模块' });
  await expect(moduleNavigation.getByRole('link')).toHaveCount(8);
  await expect(moduleNavigation.getByRole('link', { name: '森林转换' })).toHaveAttribute('aria-current', 'page');
  await expect(page.getByRole('button', { name: 'LR', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByLabel('二叉树视图')).toContainText('u');
  await expect(page.getByLabel('森林视图')).toContainText('children');
  await expect(page.getByLabel('当前关系')).toContainText('待判定');
  await expect(page.getByLabel('当前关系')).toContainText('匹配题干命题待判定');
  await expect(page.getByLabel('森林视图')).toContainText('等待两条边解码后判定');
  await expect(page.getByLabel('题干命题判定')).toContainText('I');
  const stepCounter = page.locator('.forest-binary-step-explorer .step-transport > span');
  await expect(stepCounter).toHaveText('1 / 5');

  const nextStep = page.getByRole('button', { name: '下一步' });
  await nextStep.click();
  await expect(page.getByLabel('当前证明步骤')).toContainText('解码第 1 条边');
  await nextStep.click();
  await expect(page.getByLabel('当前证明步骤')).toContainText('解码第 2 条边');
  await expect(page.getByLabel('当前关系')).toContainText('待判定');
  await expect(page.getByLabel('森林视图')).toContainText('等待两条边解码后判定');
  await nextStep.click();
  await expect(page.getByLabel('当前证明步骤')).toContainText('分类关系');
  await expect(page.getByLabel('当前关系')).toContainText('u 是 v 的父结点');
  await expect(page.getByLabel('当前关系')).toContainText('匹配题干命题I');
  await expect(page.getByLabel('森林视图')).toContainText('u 是 v 的父结点');
  await expect(stepCounter).toHaveText('4 / 5');
  await expectNoPageOverflow(page);

  if (testInfo.project.name === 'chromium-390') {
    const [eventBox, explorerBox, stateBox] = await Promise.all([
      page.locator('.forest-binary-current-event').boundingBox(),
      page.locator('.forest-binary-step-explorer').boundingBox(),
      page.locator('.forest-binary-state-panel').boundingBox(),
    ]);
    expect(eventBox).not.toBeNull();
    expect(explorerBox).not.toBeNull();
    expect(stateBox).not.toBeNull();
    expect(eventBox!.y + eventBox!.height).toBeLessThanOrEqual(explorerBox!.y + 1);
    expect(explorerBox!.y + explorerBox!.height).toBeLessThanOrEqual(stateBox!.y + 1);
  }
  await capture(page, testInfo);

  await page.getByRole('button', { name: '复位步骤' }).click();
  await expect(stepCounter).toHaveText('1 / 5');
  await page.getByRole('button', { name: '播放步骤' }).click();
  await expect(page.getByRole('button', { name: '暂停步骤' })).toBeVisible();
  await expect.poll(() => stepCounter.textContent()).not.toBe('1 / 5');
  await page.getByRole('button', { name: '暂停步骤' }).click();

  await page.getByRole('button', { name: 'RR', exact: true }).click();
  await expect(page).toHaveURL(/path=RR$/u);
  await expect(page.getByLabel('当前关系')).toContainText('待判定');
  await nextStep.click();
  await nextStep.click();
  await nextStep.click();
  await expect(page.getByLabel('当前关系')).toContainText('同一父结点下的兄弟');
  await page.reload();
  await expect(page.getByRole('button', { name: 'RR', exact: true })).toHaveAttribute('aria-pressed', 'true');

  await page.goto('/lab/data-structures?module=forest-conversion&preset=cn408-2009-q06&path=bad');
  await expect(page.getByRole('alert')).toContainText(/path|LL|LR|RL|RR/u);
  await expect(page.getByLabel('二叉树视图')).toHaveCount(0);
  await page.getByRole('button', { name: '恢复 Q6 预设' }).click();
  await expect(page).toHaveURL(/module=forest-conversion&preset=cn408-2009-q06&path=LR$/u);

  await page.getByRole('button', { name: 'RR', exact: true }).click();
  const customUrl = page.url();
  await moduleNavigation.getByRole('link', { name: '森林转换' }).click();
  await expect(page).toHaveURL(/module=forest-conversion&preset=cn408-2009-q06&path=LR$/u);
  await page.goBack();
  await expect(page).toHaveURL(customUrl);
  await expect(page.getByRole('button', { name: 'RR', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await page.goForward();
  await expect(page).toHaveURL(/module=forest-conversion&preset=cn408-2009-q06&path=LR$/u);

  await page.getByRole('button', { name: '练习 2009 · Q6' }).click();
  await expect(page.locator('.practice-topbar strong')).toContainText('第 6 题');
  await page.getByRole('button', { name: /森林.*转换/u }).click();
  await expect(page).toHaveURL(/module=forest-conversion&preset=cn408-2009-q06&path=LR$/u);

  await page.getByRole('button', { name: '查看知识节点' }).click();
  await expect(page).toHaveURL((url) => (
    url.pathname === '/knowledge'
    && url.searchParams.get('subject') === 'data-structures'
    && url.searchParams.get('node') === 'topic-2009-q06'
  ));
  await page.getByRole('button', { name: '打开对应实验' }).click();
  await expect(page).toHaveURL(/module=forest-conversion&preset=cn408-2009-q06&path=LR$/u);
  await expectNoPageOverflow(page);
  expect(pageErrors).toEqual([]);
});
