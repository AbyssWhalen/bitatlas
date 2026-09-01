import path from 'node:path';
import { mkdir } from 'node:fs/promises';
import { expect, test, type Page, type TestInfo } from '@playwright/test';

const screenshotRoot = path.resolve('output', 'playwright', 'screenshots');

async function expectNoHorizontalOverflow(page: Page) {
  await expect.poll(() => page.evaluate(() => (
    document.documentElement.scrollWidth <= document.documentElement.clientWidth
  ))).toBe(true);
}

async function captureLab(
  page: Page,
  testInfo: TestInfo,
  name: string,
  stateSelector: string,
) {
  await mkdir(screenshotRoot, { recursive: true });
  const project = testInfo.project.name;
  if (project !== 'chromium-390') {
    await page.screenshot({
      path: path.join(screenshotRoot, `${name}-${project}.png`),
      fullPage: true,
      animations: 'disabled',
    });
    return;
  }

  const main = page.locator('.main-area');
  await main.evaluate((element) => { element.scrollTop = 0; });
  await page.screenshot({
    path: path.join(screenshotRoot, `${name}-${project}-top.png`),
    animations: 'disabled',
  });
  await page.locator(stateSelector).first().evaluate((element) => {
    element.scrollIntoView({ block: 'start' });
  });
  await page.screenshot({
    path: path.join(screenshotRoot, `${name}-${project}-state.png`),
    animations: 'disabled',
  });
  await main.evaluate((element) => { element.scrollTop = element.scrollHeight; });
  await page.screenshot({
    path: path.join(screenshotRoot, `${name}-${project}-bottom.png`),
    animations: 'disabled',
  });
}

test('runs the Q46 TLB, page-table and LRU trace with a practice round trip', async ({ page }, testInfo) => {
  await page.goto('/lab/os-memory?module=disk&preset=cn408-2009-q29');
  await expect(page.getByRole('heading', { name: '磁盘调度实验室' })).toBeVisible();
  await page.goto('/lab/os-memory?module=memory&preset=cn408-2009-q46');
  await expect(page.getByRole('heading', { name: '虚拟内存实验室' })).toBeVisible();
  const labNavigation = page.getByRole('navigation', { name: '实验室科目' });
  await expect(labNavigation.getByRole('link')).toHaveCount(4);
  await expect(labNavigation.getByRole('link', { name: /操作系统/u })).toHaveAttribute('aria-current', 'page');
  await expect(page.locator('.vm-access-timeline button')).toHaveCount(3);
  await expect(page.locator('.vm-address-breakdown')).toContainText('0x2362');
  await expect(page.locator('.vm-transfer-summary')).toContainText('210 ns');

  await page.locator('.vm-access-timeline button').nth(1).click();
  await expect(page.locator('.vm-address-breakdown')).toContainText('0x101565');
  await expect(page.locator('.vm-event-outcome')).toContainText('发生缺页');
  await expect(page.locator('.vm-event-outcome')).toContainText('淘汰页 0');
  await expect(page.locator('.vm-event-outcome')).toContainText('装入页框 0x101');
  await expect(page.locator('.vm-state-table').nth(1).locator('tr.current')).toContainText('1');

  await page.getByLabel('虚拟地址序列').fill('0x0000,0x1000');
  await page.getByLabel('TLB 查询时间，纳秒').fill('5');
  await page.getByLabel('主存访问时间，纳秒').fill('80');
  await page.getByLabel('缺页处理时间，纳秒').fill('9000');
  await expect(page).toHaveURL(/module=memory&addresses=0x0000%2C0x1000&tlbNs=5&memoryNs=80&faultNs=9000$/u);
  await page.goBack();
  await expect(page).toHaveURL(/\/lab\/os-memory\?module=disk&preset=cn408-2009-q29$/u);
  await expect(page.getByRole('heading', { name: '磁盘调度实验室' })).toBeVisible();
  await page.goForward();
  await expect(page).toHaveURL(/module=memory&addresses=0x0000%2C0x1000&tlbNs=5&memoryNs=80&faultNs=9000$/u);
  await page.reload();
  await expect(page.getByLabel('虚拟地址序列')).toHaveValue('0x0000,0x1000');
  await expect(page.getByLabel('主存访问时间，纳秒')).toHaveValue('80');

  const osModules = page.getByRole('navigation', { name: '操作系统实验模块' });
  await osModules.getByRole('link', { name: '磁盘调度' }).click();
  await expect(page.getByRole('heading', { name: '磁盘调度实验室' })).toBeVisible();
  await page.goBack();
  await expect(page.getByLabel('虚拟地址序列')).toHaveValue('0x0000,0x1000');
  await page.goForward();
  await expect(page.getByRole('heading', { name: '磁盘调度实验室' })).toBeVisible();
  await page.goBack();
  await page.getByRole('button', { name: '恢复 Q46 预设' }).click();
  await expect(page).toHaveURL(/\/lab\/os-memory\?module=memory&preset=cn408-2009-q46$/u);

  await page.getByLabel('虚拟地址序列').fill('FFFFH');
  await expect(page.getByRole('alert')).toContainText('超出当前虚拟地址空间');
  await page.getByRole('button', { name: '恢复 Q46 预设' }).click();
  await expect(page.locator('.vm-access-timeline button')).toHaveCount(3);
  await expectNoHorizontalOverflow(page);
  await captureLab(page, testInfo, 'vm-lab', '.vm-state-table');

  await page.getByRole('button', { name: '练习 2009 · Q46' }).click();
  await expect(page.locator('.practice-topbar strong')).toContainText('第 46 题');
  await expect(page.getByRole('button', { name: /TLB \/ LRU 地址转换/u })).toBeVisible();
  await page.getByRole('button', { name: /TLB \/ LRU 地址转换/u }).click();
  await expect(page.getByRole('heading', { name: '虚拟内存实验室' })).toBeVisible();
});

test('calculates the Q47 CIDR plan and applies longest-prefix matching', async ({ page }, testInfo) => {
  await page.goto('/lab/network?module=gbn&preset=cn408-2009-q35');
  await expect(page.getByRole('heading', { name: 'Go-Back-N 实验室' })).toBeVisible();
  await page.goto('/lab/network?module=cidr&preset=cn408-2009-q47');
  await expect(page.getByRole('heading', { name: '计算机网络实验室' })).toBeVisible();
  await expect(page.getByRole('navigation', { name: '实验室科目' }).getByRole('link', { name: /计算机网络/u })).toHaveAttribute('aria-current', 'page');
  await expect(page.locator('.network-prefix-visual').first().locator('.network-bit-ruler > span')).toHaveCount(32);
  await expect(page.locator('.network-split-summary')).toContainText('借 1 bit');
  await expect(page.locator('.network-subnet-table tbody tr')).toHaveCount(2);
  await expect(page.locator('.network-subnet-table')).toContainText('202.118.1.0/25');
  await expect(page.locator('.network-subnet-table')).toContainText('202.118.1.128/25');
  await expect(page.locator('.network-subnet-table')).toContainText('126');
  await expect(page.locator('.network-aggregate-equation')).toContainText('202.118.1.0/24');
  await expect(page.locator('.network-route-table')).toContainText('202.118.3.2');
  await expect(page.locator('.network-route-table')).toContainText('E2');
  await expect(page.locator('.network-lpm-evaluations > article')).toHaveCount(4);
  await expect(page.locator('.network-lpm-selected')).toContainText(/经 DNS 主机\s+路由转发/u);

  const networkModules = page.getByRole('navigation', { name: '计算机网络实验模块' });
  await expect(networkModules.getByRole('link')).toHaveCount(8);
  await expect(networkModules.getByRole('link', { name: 'CIDR / LPM' })).toHaveAttribute('aria-current', 'page');
  await page.getByLabel('父 CIDR').fill('10.0.0.0/24');
  await page.getByLabel('所需子网数').fill('4');
  await page.getByLabel('LPM 目的地址').fill('203.0.113.9');
  await expect(page).toHaveURL(/module=cidr&cidr=10.0.0.0%2F24&subnets=4&destination=203.0.113.9$/u);
  await page.goBack();
  await expect(page).toHaveURL(/\/lab\/network\?module=gbn&preset=cn408-2009-q35$/u);
  await expect(page.getByRole('heading', { name: 'Go-Back-N 实验室' })).toBeVisible();
  await page.goForward();
  await expect(page).toHaveURL(/module=cidr&cidr=10.0.0.0%2F24&subnets=4&destination=203.0.113.9$/u);
  await page.reload();
  await expect(page.getByLabel('父 CIDR')).toHaveValue('10.0.0.0/24');
  await expect(page.getByLabel('所需子网数')).toHaveValue('4');
  await expect(page.getByLabel('LPM 目的地址')).toHaveValue('203.0.113.9');

  await networkModules.getByRole('link', { name: 'Go-Back-N' }).click();
  await expect(page.getByRole('heading', { name: 'Go-Back-N 实验室' })).toBeVisible();
  await page.goBack();
  await expect(page.getByLabel('父 CIDR')).toHaveValue('10.0.0.0/24');
  await page.goForward();
  await expect(page.getByRole('heading', { name: 'Go-Back-N 实验室' })).toBeVisible();
  await page.goBack();
  await page.getByRole('button', { name: '典型预设复位' }).click();
  await expect(page).toHaveURL(/\/lab\/network\?module=cidr&preset=cn408-2009-q47$/u);

  await page.getByLabel('LPM 目的地址').fill('8.8.8.8');
  await expect(page.locator('.network-lpm-selected')).toContainText(/经 互联网\s+路由转发/u);
  await page.getByLabel('父 CIDR').fill('202.118.1.0/33');
  await expect(page.locator('.lab-error').first()).toContainText('前缀长度');
  await page.getByRole('button', { name: '典型预设复位' }).click();
  await expect(page.getByLabel('父 CIDR')).toHaveValue('202.118.1.0/24');
  await expectNoHorizontalOverflow(page);
  await captureLab(page, testInfo, 'network-lab', '.network-subnet-table');

  await page.getByRole('button', { name: '练习 2009 第 47 题' }).click();
  await expect(page.locator('.practice-topbar strong')).toContainText('第 47 题');
  await expect(page.getByRole('button', { name: /CIDR \/ 路由匹配/u })).toBeVisible();
  await page.getByRole('button', { name: /CIDR \/ 路由匹配/u }).click();
  await expect(page.getByRole('heading', { name: '计算机网络实验室' })).toBeVisible();
});
