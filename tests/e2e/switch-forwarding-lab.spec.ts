import { expect, test } from '@playwright/test';
import { checkTraceAndLinks, openModule } from './network-exhibit-flow';

test('switch Q36 distinguishes a matched port, a miss and a malformed table', async ({ page }) => {
  const url = await openModule(page, 'switch-forwarding', 36, '交换机转发');
  await expect(page.getByLabel('转发决策', { exact: true })).toContainText('P3');
  await page.getByLabel('目的 MAC', { exact: true }).fill('aa:bb:cc:dd:ee:ff');
  await expect(page.getByLabel('转发决策', { exact: true })).toContainText('P4');
  await page.getByLabel('目的 MAC', { exact: true }).fill('02:00:00:00:00:77');
  await expect(page.getByLabel('转发决策', { exact: true })).toContainText('没有匹配项');
  const tableInput = page.getByRole('textbox', { name: '静态转发表', exact: true });
  await tableInput.fill('02:00:00:00:00:77=uplink-1');
  await page.reload();
  await expect(page.getByLabel('转发决策', { exact: true })).toContainText('uplink-1');
  await tableInput.fill('invalid');
  await expect(page.getByRole('alert')).toContainText('转发表');
  await expect(page.locator('.lab-exhibit-canvas')).toHaveCount(0);
  await page.getByRole('button', { name: '恢复 Q36 预设' }).click();
  await expect(page).toHaveURL(url);
  await checkTraceAndLinks(page, 36, url);
});
