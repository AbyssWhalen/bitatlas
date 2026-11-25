import { expect, test } from '@playwright/test';
import { checkTraceAndLinks, openModule } from './network-exhibit-flow';

test('FTP Q40 keeps the selected channel and recovers from an invalid input', async ({ page }) => {
  const url = await openModule(page, 'ftp-control', 40, 'FTP 连接');
  await expect(page.getByLabel('当前连接')).toContainText('TCP/21');
  await page.getByRole('combobox', { name: '观察事件' }).selectOption('data');
  await expect(page).toHaveURL(/channel=data$/);
  await expect(page.getByLabel('当前连接')).toContainText('TCP/20');
  await page.reload();
  await expect(page.getByRole('combobox', { name: '观察事件' })).toHaveValue('data');
  await page.goto('/lab/network?module=ftp-control&channel=invalid');
  await expect(page.getByRole('alert')).toContainText('控制或数据');
  await expect(page.locator('.lab-exhibit-canvas')).toHaveCount(0);
  await page.getByRole('button', { name: '恢复 Q40 预设' }).click();
  await expect(page).toHaveURL(url);
  await checkTraceAndLinks(page, 40, url);
});
