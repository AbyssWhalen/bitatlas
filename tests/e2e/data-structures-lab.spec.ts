import path from 'node:path';
import { mkdir } from 'node:fs/promises';
import { expect, test } from '@playwright/test';

const screenshotRoot = path.resolve('output', 'playwright', 'screenshots');

test('runs the Q41 shortest-path comparison without layout overflow', async ({ page }) => {
  await page.goto('/lab/data-structures?preset=cn408-2009-q41');
  await expect(page.getByRole('heading', { name: '最短路径实验室' })).toBeVisible();
  await expect(page.getByText('needs-review')).toBeVisible();

  const graph = page.locator('.ds-graph');
  await expect(graph).toBeVisible();
  await expect(graph.locator('.ds-edge')).toHaveCount(4);
  await expect(graph.locator('.ds-node')).toHaveCount(4);
  await expect.poll(() => graph.evaluate((element) => {
    const bounds = element.getBoundingClientRect();
    return bounds.width > 250 && bounds.height > 120;
  })).toBe(true);
  await expect.poll(() => page.evaluate(() => (
    document.documentElement.scrollWidth <= document.documentElement.clientWidth
  ))).toBe(true);

  await expect(graph.locator('[data-node-id="S"]')).toHaveClass(/current/u);
  await page.getByRole('button', { name: '下一步' }).click();
  await expect(graph.locator('[data-node-id="A"]')).toHaveClass(/current/u);

  await page.getByRole('button', { name: 'Dijkstra' }).click();
  await expect(page.getByText('初始化全局距离', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: '播放步骤' }).click();
  await expect(page.getByRole('button', { name: '暂停步骤' })).toBeVisible();
  await page.getByRole('button', { name: '暂停步骤' }).click();
  await page.getByRole('button', { name: '下一步' }).click();
  await page.getByRole('button', { name: '复位步骤' }).click();
  await expect(graph.locator('[data-node-id="S"]')).toHaveClass(/current/u);
});

test('runs Q42 as a one-pass linked-list trace with exact practice roundtrip', async ({ page }, testInfo) => {
  await page.goto('/lab/data-structures?module=linked-list&preset=cn408-2009-q42');
  await expect(page.getByRole('heading', { name: '单链表双指针实验室' })).toBeVisible();
  await expect(page.locator('[data-node-index]')).toHaveCount(7);
  await expect(page.getByText('data = 9')).toBeVisible();
  await expect(page.locator('[data-node-index="0"]')).toHaveClass(/fast/u);
  await expect(page.locator('[data-node-index="0"]')).toHaveClass(/slow/u);

  await page.getByRole('button', { name: '下一步' }).click();
  await expect(page.locator('[data-node-index="1"]')).toHaveClass(/fast/u);
  await expect(page.locator('[data-node-index="0"]')).toHaveClass(/slow/u);
  await mkdir(screenshotRoot, { recursive: true });
  await page.screenshot({
    path: path.join(screenshotRoot, `${testInfo.project.name}-data-structures-linked-list.png`),
    fullPage: true,
    animations: 'disabled',
  });

  await page.getByLabel('倒数位置 k').fill('7');
  await expect(page.getByText('未找到')).toBeVisible();
  await expect(page.getByText(/链长 6 小于 k=7/u)).toBeVisible();
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);

  await page.getByRole('button', { name: '练习 2009 · Q42' }).click();
  await expect(page.locator('.practice-topbar strong')).toContainText('第 42 题');
  await page.getByRole('button', { name: '单链表倒数第 k 个结点' }).click();
  await expect(page).toHaveURL(/\/lab\/data-structures\?module=linked-list&preset=cn408-2009-q42$/u);
  await expect(page.getByRole('heading', { name: '单链表双指针实验室' })).toBeVisible();
});
