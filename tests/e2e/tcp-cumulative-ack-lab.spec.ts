import { expect, test } from '@playwright/test';
import { checkTraceAndLinks, openModule } from './network-exhibit-flow';

test('TCP Q38 recomputes byte ranges and cumulative ACK from both payloads', async ({ page }) => {
  const url = await openModule(page, 'tcp-ack', 38, 'TCP ACK');
  await expect(page.getByLabel('TCP 累计确认公式')).toContainText('ACK 1000');
  await page.getByLabel('首段序列号').fill('10');
  await page.getByLabel('第一个 payload').fill('4');
  await page.getByLabel('第二个 payload').fill('6');
  await page.reload();
  await expect(page.getByLabel('TCP 累计确认公式')).toContainText('ACK 20');
  await expect(page.getByLabel('TCP 字节区间')).toContainText('[14, 20)');
  await page.getByLabel('第一个 payload').fill('0');
  await expect(page.getByRole('alert')).toContainText('payload');
  await expect(page.locator('.lab-exhibit-canvas')).toHaveCount(0);
  await page.getByRole('button', { name: '恢复 Q38 预设' }).click();
  await expect(page).toHaveURL(url);
  await checkTraceAndLinks(page, 38, url);
});
