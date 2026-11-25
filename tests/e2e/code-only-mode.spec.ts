import { expect, test } from '@playwright/test';

test('keeps the public code-only mode usable without the private 2009 pack', async ({ page }) => {
  await page.route('**/content/2*.json?*', async (route) => {
    await route.fulfill({ status: 404, contentType: 'application/json', body: '{}' });
  });
  // The missing-pack banner and learning progress are independent status regions.
  // Hold the latter so this also covers their overlap on slow storage/network.
  let releaseLearning!: () => void;
  const learningReady = new Promise<void>((resolve) => { releaseLearning = resolve; });
  await page.route('**/content/learning.json?*', async (route) => {
    await learningReady;
    await route.continue();
  });

  await page.goto('/');

  await expect(page.locator('.brand-block strong')).toHaveText('BitAtlas');
  const brandIcon = page.locator('.brand-mark img');
  await expect(brandIcon).toHaveAttribute('src', '/favicon.svg');
  await expect.poll(async () => brandIcon.evaluate((image) => image.complete && image.naturalWidth > 0)).toBe(true);
  try {
    await expect(page.getByRole('status')).toHaveCount(2);
    await expect(page.locator('.content-unavailable-banner')).toContainText('本地 2009 题包未安装');
  } finally {
    releaseLearning();
  }
  await expect(page.locator('.fatal-state')).toHaveCount(0);
  await expect(page.getByRole('button', { name: '继续学习' })).toBeDisabled();

  await page.goto('/review/2009');
  await expect(page.getByRole('heading', { name: '本地 2009 题包未安装' })).toBeVisible();
  await expect(page.locator('.fatal-state')).toHaveCount(0);

  await page.getByRole('link', { name: '进入实验' }).click();
  await expect(page).toHaveURL(/\/lab$/);
  await expect(page.getByRole('heading', { name: 'CPU 可视化实验室' })).toBeVisible();
});
