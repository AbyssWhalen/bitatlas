import { expect, test, type Page } from '@playwright/test';

async function expectNoPageOverflow(page: Page) {
  await expect.poll(() => page.evaluate(() => {
    const main = document.querySelector<HTMLElement>('.main-area');
    return document.documentElement.scrollWidth <= document.documentElement.clientWidth
      && (!main || main.scrollWidth <= main.clientWidth);
  })).toBe(true);
}

test('replays Q20 bus bandwidth derivation across viewports', async ({ page }) => {
  await page.goto('/lab?module=bus-bandwidth&preset=cn408-2009-q20');
  await expect(page.getByRole('heading', { name: '总线带宽' })).toBeVisible();
  await expect(page.getByText('needs-review')).toBeVisible();
  await expect(page.getByLabel('总线带宽 MB/s')).toContainText('20 MB/s');
  await expect(page.getByLabel('总线带宽 Mbit/s')).toContainText('160 Mbit/s');
  await expect(page.getByLabel('题目答案')).toContainText('B');
  const tabs = page.getByRole('navigation', { name: '实验类型' });
  await expect(tabs.getByRole('button')).toHaveCount(11);
  await expect(tabs.getByRole('button', { name: '总线带宽' })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByLabel('转换步骤').locator('.step-transport > span')).toHaveText('1 / 7');

  await page.getByRole('button', { name: '下一步' }).click();
  await expect(page.getByLabel('当前推导事件')).toContainText('计算一个时钟周期');
  await page.getByLabel('每总线周期传输 B').fill('8');
  await page.getByLabel('每总线周期占用时钟数').fill('4');
  await page.getByLabel('总线时钟频率 MHz').fill('25');
  await expect(page).toHaveURL((url) => (
    url.searchParams.get('module') === 'bus-bandwidth'
      && url.searchParams.get('bytes') === '8'
      && url.searchParams.get('clocks') === '4'
      && url.searchParams.get('frequency') === '25'
      && url.searchParams.get('preset') === null
  ));
  await expect(page.getByLabel('总线带宽 MB/s')).toContainText('50 MB/s');

  await page.getByLabel('每总线周期传输 B').fill('0');
  await expect(page.getByRole('alert')).toContainText('每总线周期传输');
  await expect(page.getByLabel('总线带宽 MB/s')).toHaveCount(0);
  await page.getByRole('button', { name: '恢复 Q20 预设' }).click();
  await expect(page).toHaveURL(/module=bus-bandwidth&preset=cn408-2009-q20/u);
  await expect(page.getByLabel('总线带宽 MB/s')).toContainText('20 MB/s');
  await expectNoPageOverflow(page);
});
