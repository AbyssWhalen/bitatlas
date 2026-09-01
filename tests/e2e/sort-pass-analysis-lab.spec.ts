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
      path: path.join(screenshotRoot, `${project}-sort-pass-q10.png`),
      fullPage: true,
      animations: 'disabled',
    });
    return;
  }

  const main = page.locator('.main-area');
  await main.evaluate((element) => { element.scrollTop = 0; });
  await page.screenshot({ path: path.join(screenshotRoot, `${project}-sort-pass-q10-top.png`), animations: 'disabled' });
  await page.locator('.sort-pass-state-panel').evaluate((element) => element.scrollIntoView({ block: 'start' }));
  await page.screenshot({ path: path.join(screenshotRoot, `${project}-sort-pass-q10-state.png`), animations: 'disabled' });
  await main.evaluate((element) => { element.scrollTop = element.scrollHeight; });
  await page.screenshot({ path: path.join(screenshotRoot, `${project}-sort-pass-q10-bottom.png`), animations: 'disabled' });
}

test('checks Q10 sort-pass invariants, URL recovery, and bidirectional deep links', async ({ page }, testInfo) => {
  const pageErrors: string[] = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));

  await page.goto('/lab/data-structures?module=sort-pass&preset=cn408-2009-q10');
  await expect(page).toHaveURL(/\/lab\/data-structures\?module=sort-pass&preset=cn408-2009-q10$/u);
  await expect(page.getByRole('heading', { name: '排序趟次不变量判别实验室' })).toBeVisible();
  await expect(page.getByText('needs-review')).toBeVisible();
  await expect(page.getByLabel('第二趟序列')).toHaveValue('11,12,13,7,8,9,23,4,5');
  await expect(page.getByLabel('当前判别结论')).toContainText('待判定');
  await expect(page.getByText(/来源答案 B/u)).toHaveCount(0);
  await expect(page.locator('[aria-live="polite"]')).toHaveCount(1);

  const moduleNavigation = page.getByRole('navigation', { name: '数据结构实验模块' });
  await expect(moduleNavigation.getByRole('link')).toHaveCount(8);
  await expect(moduleNavigation.getByRole('link', { name: '趟次判别' })).toHaveAttribute('aria-current', 'page');
  const table = page.getByRole('table', { name: '候选必要不变量' });
  await expect(table.getByRole('row', { name: /A · 起泡排序/u })).toContainText('待检查');
  await expect(table.getByRole('row', { name: /C · 选择排序/u })).toContainText('满足其一');
  const counter = page.locator('.sort-pass-step-explorer .step-transport > span');
  await expect(counter).toHaveText('1 / 6');

  const next = page.getByRole('button', { name: '下一步' });
  await next.click();
  await expect(table.getByRole('row', { name: /A · 起泡排序/u })).toContainText('已排除');
  await next.click();
  await expect(table.getByRole('row', { name: /B · 插入排序/u })).toContainText('未被必要条件排除');
  await expect(page.getByLabel('当前判别结论')).toContainText('待判定');
  await next.click();
  await expect(table.getByRole('row', { name: /C · 选择排序/u })).toContainText('已排除');
  await next.click();
  await expect(table.getByRole('row', { name: /D · 二路归并排序/u })).toContainText('已排除');
  await expect(page.getByLabel('当前判别结论')).toContainText('待判定');
  await next.click();
  await expect(page.getByLabel('当前判别结论')).toContainText('题列四项中仅 B 未被必要条件排除');
  await expect(page.getByLabel('当前判别结论')).toContainText('不是未知前两趟的重放证明');
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
      page.locator('.sort-pass-current-event').boundingBox(),
      page.locator('.sort-pass-step-explorer').boundingBox(),
      page.locator('.sort-pass-state-panel').boundingBox(),
      page.locator('.sort-pass-conclusion').boundingBox(),
    ]);
    expect(eventBox).not.toBeNull();
    expect(explorerBox).not.toBeNull();
    expect(stateBox).not.toBeNull();
    expect(conclusionBox).not.toBeNull();
    expect(eventBox!.y + eventBox!.height).toBeLessThanOrEqual(explorerBox!.y + 1);
    expect(explorerBox!.y + explorerBox!.height).toBeLessThanOrEqual(stateBox!.y + 1);
    expect(stateBox!.y + stateBox!.height).toBeLessThanOrEqual(conclusionBox!.y + 1);
  }
  await capture(page, testInfo);

  await page.getByRole('button', { name: '复位步骤' }).click();
  await expect(counter).toHaveText('1 / 6');
  await page.getByRole('button', { name: '播放步骤' }).click();
  await expect(page.getByRole('button', { name: '暂停步骤' })).toBeVisible();
  await expect.poll(() => counter.textContent()).not.toBe('1 / 6');
  await page.getByRole('button', { name: '暂停步骤' }).click();

  await page.getByLabel('第二趟序列').fill('1,,3');
  await expect(page.getByRole('alert')).toContainText(/空项|整数|序列/u);
  await expect(table).toHaveCount(0);
  await expect(page.getByLabel('转换步骤')).toHaveCount(0);
  await expect(page.getByLabel('当前判别结论')).toHaveCount(0);
  await page.getByRole('button', { name: '恢复 Q10 预设' }).click();
  await expect(page).toHaveURL(/\/lab\/data-structures\?module=sort-pass&preset=cn408-2009-q10$/u);
  await expect(page.getByRole('alert')).toHaveCount(0);

  await page.getByLabel('第二趟序列').fill('1,2,3,4');
  await expect(page).toHaveURL((url) => url.pathname === '/lab/data-structures'
    && url.searchParams.get('module') === 'sort-pass'
    && url.searchParams.get('values') === '1,2,3,4'
    && !url.searchParams.has('preset'));
  const customUrl = page.url();
  await page.reload();
  await expect(page.getByLabel('第二趟序列')).toHaveValue('1,2,3,4');
  await moduleNavigation.getByRole('link', { name: '趟次判别' }).click();
  await expect(page).toHaveURL(/module=sort-pass&preset=cn408-2009-q10$/u);
  await page.goBack();
  await expect(page).toHaveURL(customUrl);
  await expect(page.getByLabel('第二趟序列')).toHaveValue('1,2,3,4');
  await page.goForward();
  await expect(page).toHaveURL(/module=sort-pass&preset=cn408-2009-q10$/u);

  await page.goto('/lab/data-structures?module=sort-pass&preset=cn408-2009-q41');
  await expect(page.getByRole('alert')).toHaveCount(0);
  await expect(page.getByLabel('第二趟序列')).toHaveValue('11,12,13,7,8,9,23,4,5');
  await page.goto('/lab/data-structures?preset=cn408-2009-q10');
  await expect(page.getByRole('heading', { name: '排序趟次不变量判别实验室' })).toBeVisible();
  await page.goto('/lab/data-structures?module=unknown&preset=cn408-2009-q10');
  await expect(page.getByRole('heading', { name: '最短路径实验室' })).toBeVisible();

  await page.goto('/lab/data-structures?module=sort-pass&preset=cn408-2009-q10');
  await page.getByRole('button', { name: '练习 2009 · Q10' }).click();
  await expect(page.locator('.practice-topbar strong')).toContainText('第 10 题');
  await page.getByRole('button', { name: '排序趟次不变量判别' }).click();
  await expect(page).toHaveURL(/module=sort-pass&preset=cn408-2009-q10$/u);
  await page.getByRole('button', { name: '查看知识节点' }).click();
  await expect(page).toHaveURL((url) => url.pathname === '/knowledge'
    && url.searchParams.get('subject') === 'data-structures'
    && url.searchParams.get('node') === 'topic-2009-q10');
  await expect(page.getByRole('button', { name: '打开对应实验' })).toHaveAttribute('title', '排序趟次不变量判别');
  await page.getByRole('button', { name: '打开对应实验' }).click();
  await expect(page).toHaveURL(/module=sort-pass&preset=cn408-2009-q10$/u);
  await expectNoPageOverflow(page);
  expect(pageErrors).toEqual([]);
});
