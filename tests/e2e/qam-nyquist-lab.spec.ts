import { expect, test, type Page } from '@playwright/test';

async function expectNoPageOverflow(page: Page) {
  await expect.poll(() => page.evaluate(() => {
    const main = document.querySelector<HTMLElement>('.main-area');
    return document.documentElement.scrollWidth <= document.documentElement.clientWidth
      && (!main || main.scrollWidth <= main.clientWidth);
  })).toBe(true);
}

test('replays Q34 QAM and Nyquist rate derivation across viewports', async ({ page }) => {
  await page.goto('/lab/network?module=qam-nyquist&preset=cn408-2009-q34');
  await expect(page.getByRole('heading', { name: 'QAM / 奈氏准则实验室' })).toBeVisible();
  await expect(page.getByText('needs-review')).toBeVisible();
  await expect(page.getByLabel('QAM 最大速率公式')).toContainText('24 kbps');
  await expect(page.getByLabel('计算机网络实验模块').getByRole('link')).toHaveCount(8);
  await expect(page.getByLabel('计算机网络实验模块').getByRole('link', { name: 'QAM / 奈氏' })).toHaveAttribute('aria-current', 'page');
  await expect(page.getByLabel('转换步骤').locator('.step-transport > span')).toHaveText('1 / 5');

  await page.getByRole('button', { name: '下一步' }).click();
  await expect(page.getByLabel('当前 QAM 推导步骤')).toContainText('组合符号状态');
  await page.getByLabel('链路带宽').fill('8000');
  await page.getByLabel('相位数量').fill('8');
  await page.getByLabel('振幅数量').fill('2');
  await expect(page).toHaveURL((url) => (
    url.searchParams.get('module') === 'qam-nyquist'
    && url.searchParams.get('bandwidth') === '8000'
    && url.searchParams.get('phases') === '8'
    && url.searchParams.get('amplitudes') === '2'
    && url.searchParams.get('preset') === null
  ));
  await expect(page.getByLabel('QAM 最大速率公式')).toContainText('64 kbps');

  await page.getByLabel('相位数量').fill('1');
  await expect(page.getByRole('alert')).toContainText('相位数量');
  await page.getByRole('button', { name: '恢复 Q34 预设' }).click();
  await expect(page).toHaveURL(/module=qam-nyquist&preset=cn408-2009-q34/u);
  await expect(page.getByLabel('QAM 最大速率公式')).toContainText('24 kbps');
  await expectNoPageOverflow(page);
});
