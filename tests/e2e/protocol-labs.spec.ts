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

async function capture(page: Page, testInfo: TestInfo, name: string) {
  await mkdir(screenshotRoot, { recursive: true });
  if (testInfo.project.name === 'chromium-390') {
    const mainArea = page.locator('.main-area');
    await mainArea.evaluate((element) => { element.scrollTop = 0; });
    await page.screenshot({
      path: path.join(screenshotRoot, `${testInfo.project.name}-${name}-top.png`),
      animations: 'disabled',
    });
    await mainArea.evaluate((element) => { element.scrollTop = element.scrollHeight; });
    await page.screenshot({
      path: path.join(screenshotRoot, `${testInfo.project.name}-${name}-bottom.png`),
      animations: 'disabled',
    });
    return;
  }
  await page.screenshot({
    path: path.join(screenshotRoot, `${testInfo.project.name}-${name}.png`),
    fullPage: true,
    animations: 'disabled',
  });
}

test('runs all disk policies while keeping Q29 SCAN fail-closed without bounds', async ({ page }, testInfo) => {
  await page.goto('/lab/os-memory?module=disk&preset=cn408-2009-q29');
  await expect(page.getByRole('heading', { name: '磁盘调度实验室' })).toBeVisible();
  await expect(page.getByRole('navigation', { name: '操作系统实验模块' }).getByRole('link')).toHaveCount(7);
  await expect(page.locator('.disk-policy-switch button')).toHaveCount(5);
  await expect(page.locator('.ds-comparison')).toContainText('110 → 170 → 180 → 195 → 68 → 45 → 35 → 12');
  await expect(page.locator('.vm-address-breakdown')).toContainText('无法由题设唯一计算');

  await page.getByRole('button', { name: 'C-SCAN' }).click();
  await expect(page.getByRole('alert')).toContainText('必须知道物理磁道边界');
  await expect(page).toHaveURL(/policy=c-scan/u);
  await page.getByLabel('使用物理磁道边界').click();
  await expect(page).toHaveURL(/bounds=1/u);
  await expect(page.getByLabel('使用物理磁道边界')).toBeChecked();
  await expect(page.getByRole('alert')).toHaveCount(0);
  await expect(page.locator('.vm-address-breakdown')).toContainText('361 个磁道');
  await expect(page.getByRole('img', { name: /C-SCAN 调度轨迹/u })).toBeVisible();

  await page.getByRole('button', { name: 'FCFS' }).click();
  await expect(page.getByRole('img', { name: /FCFS 调度轨迹/u })).toBeVisible();
  await page.getByRole('button', { name: '播放步骤' }).click();
  await expect(page.getByRole('button', { name: '暂停步骤' })).toBeVisible();
  await page.getByRole('button', { name: '暂停步骤' }).click();
  await expectNoPageOverflow(page);
  await capture(page, testInfo, 'disk-scheduling');

  await page.getByRole('button', { name: '练习 2009 · Q29' }).click();
  await expect(page.locator('.practice-topbar strong')).toContainText('第 29 题');
  await page.getByRole('button', { name: 'SCAN 磁盘调度' }).click();
  await expect(page).toHaveURL(/\/lab\/os-memory\?module=disk&preset=cn408-2009-q29$/u);
  await expect(page.getByRole('heading', { name: '磁盘调度实验室' })).toBeVisible();
});

test('replays Q35 cumulative ACK and Go-Back-N timeout retransmission', async ({ page }, testInfo) => {
  await page.goto('/lab/network?module=cidr&preset=cn408-2009-q47');
  await expect(page.getByRole('heading', { name: '计算机网络实验室' })).toBeVisible();
  await page.goto('/lab/network?module=gbn&preset=cn408-2009-q35');
  await expect(page.getByRole('heading', { name: 'Go-Back-N 实验室' })).toBeVisible();
  const networkModules = page.getByRole('navigation', { name: '计算机网络实验模块' });
  await expect(networkModules.getByRole('link')).toHaveCount(8);
  await expect(networkModules.getByRole('link', { name: 'Go-Back-N' })).toHaveAttribute('aria-current', 'page');
  await expect(page.locator('[data-gbn-sequence]')).toHaveCount(8);
  await expect(page.getByText(/ACK n = 接收方最后按序收到的帧 n/u)).toBeVisible();
  await expect(page.locator('.gbn-result-panel')).toContainText('0, 1, 2, 3');
  await expect(page.locator('.gbn-result-panel')).toContainText('4, 5, 6, 7');

  await page.getByRole('button', { name: '下一步' }).click();
  await expect(page.locator('[data-gbn-sequence="0"]')).toHaveClass(/gbn-in-flight/u);
  await expect(page.locator('[data-gbn-sequence="0"]')).toHaveClass(/gbn-timer-owner/u);
  await page.getByRole('button', { name: '播放步骤' }).click();
  await expect(page.getByRole('button', { name: '暂停步骤' })).toBeVisible();
  await page.getByRole('button', { name: '暂停步骤' }).click();

  await page.getByRole('textbox', { name: '序号空间', exact: true }).fill('4');
  await page.getByLabel('发送窗口大小').fill('2');
  await page.getByLabel('GBN 动作脚本').fill('send\ntimeout');
  await expect(page).toHaveURL(/module=gbn&sequenceSpace=4&windowSize=2&script=send%0Atimeout$/u);
  await page.goBack();
  await expect(page).toHaveURL(/\/lab\/network\?module=cidr&preset=cn408-2009-q47$/u);
  await expect(page.getByRole('heading', { name: '计算机网络实验室' })).toBeVisible();
  await page.goForward();
  await expect(page).toHaveURL(/module=gbn&sequenceSpace=4&windowSize=2&script=send%0Atimeout$/u);
  await page.reload();
  await expect(page.getByRole('textbox', { name: '序号空间', exact: true })).toHaveValue('4');
  await expect(page.getByLabel('发送窗口大小')).toHaveValue('2');
  await expect(page.getByLabel('GBN 动作脚本')).toHaveValue('send\ntimeout');

  await networkModules.getByRole('link', { name: 'CIDR / LPM' }).click();
  await expect(page.getByRole('heading', { name: '计算机网络实验室' })).toBeVisible();
  await page.goBack();
  await expect(page.getByLabel('GBN 动作脚本')).toHaveValue('send\ntimeout');
  await page.goForward();
  await expect(page.getByRole('heading', { name: '计算机网络实验室' })).toBeVisible();
  await page.goBack();
  await page.getByRole('button', { name: '恢复 Q35 预设' }).click();
  await expect(page).toHaveURL(/\/lab\/network\?module=gbn&preset=cn408-2009-q35$/u);

  await expectNoPageOverflow(page);
  await capture(page, testInfo, 'gbn');

  await page.getByLabel('GBN 动作脚本').fill('ack-arrive nope');
  await expect(page.getByRole('alert')).toContainText('第 1 行');
  await expect(page.getByLabel('GBN 步骤状态')).toHaveCount(0);
  await page.getByRole('button', { name: '恢复 Q35 预设' }).click();
  await page.getByRole('button', { name: '练习 2009 · Q35' }).click();
  await expect(page.locator('.practice-topbar strong')).toContainText('第 35 题');
  await page.getByRole('button', { name: 'Go-Back-N 滑动窗口' }).click();
  await expect(page).toHaveURL(/\/lab\/network\?module=gbn&preset=cn408-2009-q35$/u);
});

test('replays Q39 in the named 408 classic congestion model', async ({ page }, testInfo) => {
  await page.goto('/lab/network?module=tcp-congestion&preset=cn408-2009-q39');
  await expect(page.getByRole('heading', { name: 'TCP 拥塞控制实验室' })).toBeVisible();
  await expect(page.getByText('408 经典超时模型')).toBeVisible();
  await expect(page.getByText(/不代表所有现代 TCP 实现/u)).toBeVisible();
  await expect(page.locator('.tcp-cwnd-point')).toHaveCount(2);
  await expect(page.locator('.tcp-state-summary')).toContainText('1 MSS');
  await expect(page.locator('.tcp-state-summary')).toContainText('8 MSS');

  for (let index = 0; index < 4; index += 1) {
    await page.getByRole('button', { name: '下一步' }).click();
  }
  await expect(page.locator('.tcp-cwnd-point')).toHaveCount(6);
  await expect(page.locator('.tcp-state-summary')).toContainText('9 MSS');
  await expectNoPageOverflow(page);
  await capture(page, testInfo, 'tcp-congestion');

  await page.getByLabel('TCP 事件脚本').fill('cubic');
  await expect(page.getByRole('alert')).toContainText('事件“cubic”无效');
  await expect(page.locator('.tcp-window-chart')).toHaveCount(0);
  await page.getByRole('button', { name: '恢复 Q39 预设' }).click();
  await page.getByRole('button', { name: '练习 2009 · Q39' }).click();
  await expect(page.locator('.practice-topbar strong')).toContainText('第 39 题');
  await page.getByRole('button', { name: 'TCP 经典拥塞控制' }).click();
  await expect(page).toHaveURL(/\/lab\/network\?module=tcp-congestion&preset=cn408-2009-q39$/u);
});
