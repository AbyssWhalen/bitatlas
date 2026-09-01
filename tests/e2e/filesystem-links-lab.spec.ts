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
      path: path.join(screenshotRoot, `${project}-filesystem-links-q31.png`),
      fullPage: true,
      animations: 'disabled',
    });
    return;
  }

  const main = page.locator('.main-area');
  await main.evaluate((element) => { element.scrollTop = 0; });
  await page.screenshot({
    path: path.join(screenshotRoot, `${project}-filesystem-links-q31-top.png`),
    animations: 'disabled',
  });
  await page.locator('.filesystem-current-event').evaluate((element) => {
    element.scrollIntoView({ block: 'start' });
  });
  await page.screenshot({
    path: path.join(screenshotRoot, `${project}-filesystem-links-q31-state.png`),
    animations: 'disabled',
  });
  await main.evaluate((element) => { element.scrollTop = element.scrollHeight; });
  await page.screenshot({
    path: path.join(screenshotRoot, `${project}-filesystem-links-q31-bottom.png`),
    animations: 'disabled',
  });
}

async function clickNext(page: Page, times: number) {
  for (let index = 0; index < times; index += 1) {
    await page.getByRole('button', { name: '下一步' }).click();
  }
}

test('replays Q31 hard and symbolic links, URL state, failure recovery, and practice roundtrip', async ({ page }, testInfo) => {
  const pageErrors: string[] = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));

  await page.goto('/lab/os-memory?module=filesystem-links&preset=cn408-2009-q31');
  await expect(page).toHaveURL(/\/lab\/os-memory\?module=filesystem-links&preset=cn408-2009-q31$/u);
  await expect(page.getByRole('heading', { name: '软硬链接实验室' })).toBeVisible();
  await expect(page.getByText('needs-review')).toBeVisible();

  const moduleNavigation = page.getByRole('navigation', { name: '操作系统实验模块' });
  await expect(moduleNavigation.getByRole('link')).toHaveCount(7);
  await expect(moduleNavigation.getByRole('link', { name: '文件链接' })).toHaveAttribute('aria-current', 'page');
  await expect(page.getByLabel('目标文件名')).toHaveValue('F1');
  await expect(page.getByLabel('符号链接名')).toHaveValue('F2');
  await expect(page.getByLabel('硬链接名')).toHaveValue('F3');
  await expect(page.getByLabel('目录项 F1')).toHaveAttribute('data-entry-status', 'present');
  await expect(page.getByLabel('目录项 F2')).toHaveAttribute('data-entry-status', 'absent');
  await expect(page.getByLabel('目录项 F3')).toHaveAttribute('data-entry-status', 'absent');
  await expect(page.getByLabel('目标 inode 引用计数')).toHaveText('1');

  await page.getByRole('button', { name: '下一步' }).click();
  await expect(page.getByLabel('目录项 F2')).toHaveAttribute('data-entry-status', 'present');
  await expect(page.locator('[data-inode-id="inode-symlink"]')).toContainText('target: F1 · resolved');
  await expect(page.getByLabel('目标 inode 引用计数')).toHaveText('1');

  await page.getByRole('button', { name: '下一步' }).click();
  await expect(page.getByLabel('目录项 F3')).toHaveAttribute('data-entry-status', 'present');
  await expect(page.getByLabel('目标 inode 引用计数')).toHaveText('2');

  await page.getByRole('button', { name: '下一步' }).click();
  await expect(page.getByLabel('目录项 F1')).toHaveAttribute('data-entry-status', 'absent');
  await expect(page.getByLabel('目录项 F2')).toHaveAttribute('data-entry-status', 'dangling');
  await expect(page.getByLabel('目录项 F3')).toHaveAttribute('data-entry-status', 'present');
  await expect(page.getByLabel('目标 inode 引用计数')).toHaveText('1');
  await expect(page.locator('[data-inode-id="inode-symlink"]')).toContainText('target: F1 · dangling');
  await expect(page.getByRole('status', { name: '链接解析状态' }))
    .toContainText(/F2 已悬空；F3 仍可访问 inode-target/u);
  await expectNoPageOverflow(page);

  if (testInfo.project.name === 'chromium-390') {
    const [eventBox, explorerBox, directoryBox] = await Promise.all([
      page.locator('.filesystem-current-event').boundingBox(),
      page.locator('.filesystem-links-step-explorer').boundingBox(),
      page.locator('.filesystem-directory-panel').boundingBox(),
    ]);
    expect(eventBox).not.toBeNull();
    expect(explorerBox).not.toBeNull();
    expect(directoryBox).not.toBeNull();
    expect(eventBox!.y + eventBox!.height).toBeLessThanOrEqual(explorerBox!.y + 1);
    expect(explorerBox!.y + explorerBox!.height).toBeLessThanOrEqual(directoryBox!.y + 1);
    expect(explorerBox!.height).toBeLessThan(420);
    await expect(page.locator('.filesystem-current-event code')).toHaveCSS('font-size', '10px');
    await expect(page.locator('.mobile-nav')).toHaveCSS('position', 'static');
  }
  await capture(page, testInfo);

  await page.getByLabel('符号链接名').fill('F1');
  await expect(page.getByRole('alert')).toContainText(/different|distinct|不同/u);
  await expect(page.getByLabel('转换步骤')).toHaveCount(0);
  await expect(page.locator('[data-inode-id]')).toHaveCount(0);
  await page.getByRole('button', { name: '恢复 Q31 预设' }).click();
  await expect(page).toHaveURL(/\/lab\/os-memory\?module=filesystem-links&preset=cn408-2009-q31$/u);
  await expect(page.getByRole('alert')).toHaveCount(0);
  await expect(page.getByLabel('符号链接名')).toHaveValue('F2');

  await page.getByLabel('目标文件名').fill('report');
  await page.getByLabel('符号链接名').fill('shortcut');
  await page.getByLabel('硬链接名').fill('archive');
  await expect(page).toHaveURL(/module=filesystem-links&target=report&symlink=shortcut&hardlink=archive$/u);
  await expect(page.getByLabel('目录项 report')).toHaveAttribute('data-entry-status', 'present');
  await clickNext(page, 3);
  await expect(page.getByLabel('目录项 shortcut')).toHaveAttribute('data-entry-status', 'dangling');
  await expect(page.getByLabel('目录项 archive')).toHaveAttribute('data-entry-status', 'present');

  const customUrl = page.url();
  await page.reload();
  await expect(page.getByLabel('目标文件名')).toHaveValue('report');
  await expect(page.getByLabel('符号链接名')).toHaveValue('shortcut');
  await expect(page.getByLabel('硬链接名')).toHaveValue('archive');
  await moduleNavigation.getByRole('link', { name: '文件链接' }).click();
  await expect(page).toHaveURL(/\/lab\/os-memory\?module=filesystem-links&preset=cn408-2009-q31$/u);
  await expect(page.getByLabel('目标文件名')).toHaveValue('F1');
  await page.goBack();
  await expect(page).toHaveURL(customUrl);
  await expect(page.getByLabel('目标文件名')).toHaveValue('report');
  await page.goForward();
  await expect(page).toHaveURL(/\/lab\/os-memory\?module=filesystem-links&preset=cn408-2009-q31$/u);

  await page.getByRole('button', { name: '练习 2009 · Q31' }).click();
  await expect(page.locator('.practice-topbar strong')).toContainText('第 31 题');
  await page.getByRole('button', { name: '软硬链接与引用计数' }).click();
  await expect(page).toHaveURL(/\/lab\/os-memory\?module=filesystem-links&preset=cn408-2009-q31$/u);
  await expect(page.getByRole('heading', { name: '软硬链接实验室' })).toBeVisible();
  expect(pageErrors).toEqual([]);
});
