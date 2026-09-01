import { expect, test, type Page } from '@playwright/test';

async function expectNoPageOverflow(page: Page) {
  await expect.poll(() => page.evaluate(() => {
    const main = document.querySelector<HTMLElement>('.main-area');
    return document.documentElement.scrollWidth <= document.documentElement.clientWidth
      && (!main || main.scrollWidth <= main.clientWidth);
  })).toBe(true);
}

test('replays Q27 segmented-address field derivation across viewports', async ({ page }) => {
  await page.goto('/lab/os-memory?module=segmentation-address&preset=cn408-2009-q27');
  await expect(page.getByRole('heading', { name: '分段地址字段实验室' })).toBeVisible();
  await expect(page.getByText('needs-review')).toBeVisible();
  await expect(page.getByLabel('最大段长公式')).toContainText('2^24 B');
  await expect(page.getByRole('img', { name: '32 位地址由 8 位段号和 24 位段内位移组成' })).toBeVisible();
  await expect(page.getByLabel('操作系统实验模块').getByRole('link')).toHaveCount(7);
  await expect(page.getByLabel('操作系统实验模块').getByRole('link', { name: '分段地址' })).toHaveAttribute('aria-current', 'page');
  await expect(page.getByLabel('转换步骤').locator('.step-transport > span')).toHaveText('1 / 5');

  await page.getByRole('button', { name: '下一步' }).click();
  await expect(page.getByLabel('当前分段地址推导步骤')).toContainText('划分段号字段');
  await page.getByLabel('地址总位数').fill('16');
  await page.getByLabel('段号位数').fill('4');
  await expect(page).toHaveURL((url) => (
    url.searchParams.get('module') === 'segmentation-address'
      && url.searchParams.get('addressBits') === '16'
      && url.searchParams.get('segmentBits') === '4'
      && url.searchParams.get('preset') === null
  ));
  await expect(page.getByLabel('最大段长公式')).toContainText('2^12 B');

  await page.getByLabel('段号位数').fill('16');
  await expect(page.getByRole('alert')).toContainText('段号位数');
  await page.getByRole('button', { name: '恢复 Q27 预设' }).click();
  await expect(page).toHaveURL(/module=segmentation-address&preset=cn408-2009-q27/u);
  await expect(page.getByLabel('最大段长公式')).toContainText('2^24 B');
  await expectNoPageOverflow(page);
});
