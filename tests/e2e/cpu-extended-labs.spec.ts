import { expect, test, type Page } from '@playwright/test';

async function expectNoPageOverflow(page: Page) {
  await expect.poll(() => page.evaluate(() => {
    const main = document.querySelector<HTMLElement>('.main-area');
    return document.documentElement.scrollWidth <= document.documentElement.clientWidth
      && (!main || main.scrollWidth <= main.clientWidth);
  })).toBe(true);
}

async function captureMobileSection(page: Page, selector: string, name: string) {
  const section = page.locator(selector).first();
  await section.scrollIntoViewIfNeeded();
  await expect(section).toBeVisible();
  await section.screenshot({ path: `output/playwright/screenshots/${name}-chromium-390.png` });
  await expect.poll(() => section.evaluate((element) => {
    const bounds = element.getBoundingClientRect();
    const main = element.closest<HTMLElement>('.main-area')?.getBoundingClientRect();
    return !main || (bounds.bottom > main.top && bounds.top < main.bottom);
  })).toBe(true);
}

test('replays Q14 Cache mapping, LRU write-back, and the practice deep link', async ({ page }, testInfo) => {
  await page.goto('/lab?module=cache');
  await expect(page.getByRole('heading', { name: 'CPU 可视化实验室' })).toBeVisible();
  await expect(page.getByRole('heading', { name: '组相联 Cache' })).toBeVisible();
  await expect(page.getByRole('navigation', { name: '实验类型' }).getByRole('button')).toHaveCount(11);
  await expect(page.getByRole('button', { name: 'Cache 映射' })).toHaveClass(/active/u);
  await expect(page.locator('.cache-address-fields .set')).toContainText('100');
  await expect(page.locator('.cache-address-fields .set')).toContainText('4');
  await expect(page.locator('.cache-outcome-row')).toContainText('129 · 块 4');
  await expect(page.getByRole('button', { name: '相关真题 2 题' })).toBeVisible();

  await page.getByLabel('选择 Cache 例题').selectOption('lru');
  await expect(page.locator('.cache-access-timeline button')).toHaveCount(6);
  await expect(page.locator('.cache-trace-section')).toContainText('1 / 6 命中 · 16.7%');
  await expect(page.locator('.cache-summary-grid')).toContainText('脏块写回1');
  await page.locator('.cache-access-timeline button').last().click();
  await expect(page.locator('.cache-outcome-row')).toContainText('读取地址0 · 块 0');
  await expect(page.locator('.cache-state-table tr.current')).toContainText('0');

  await page.getByLabel('Cache 块大小').fill('3');
  await expect(page.getByRole('alert')).toContainText('块大小必须是 2 的正整数次幂');
  await page.getByRole('button', { name: '恢复 Cache Q14 预设' }).click();
  await expect(page.locator('.cache-outcome-row')).toContainText('129 · 块 4');
  await expectNoPageOverflow(page);
  await page.locator('.cpu-lab-page').screenshot({
    path: `output/playwright/screenshots/cache-lab-${testInfo.project.name}.png`,
  });
  if (testInfo.project.name === 'chromium-390') {
    await captureMobileSection(page, '.cache-control-panel', 'cache-control');
    await captureMobileSection(page, '.cache-lab-layout > .step-explorer', 'cache-step-trace');
    await captureMobileSection(page, '.cache-trace-section', 'cache-access-trace');
  }

  await page.getByRole('button', { name: '相关真题 2 题' }).click();
  await expect(page.locator('.practice-topbar strong')).toContainText('第 14 题');
  await expect(page.getByRole('button', { name: /组相联 Cache 映射/u })).toBeVisible();
  await page.getByRole('button', { name: /组相联 Cache 映射/u }).click();
  await expect(page).toHaveURL(/\/lab\?module=cache$/u);
  await expect(page.getByRole('heading', { name: '组相联 Cache' })).toBeVisible();
});

test('executes a branch through the single-cycle datapath and restores it from practice', async ({ page }, testInfo) => {
  await page.goto('/lab?module=datapath');
  await expect(page.getByRole('heading', { name: 'RV32I 单周期数据通路' })).toBeVisible();
  await expect(page.getByRole('button', { name: '单周期数据通路' })).toHaveClass(/active/u);
  await expect(page.locator('.datapath-stage')).toHaveCount(5);
  await expect(page.locator('.datapath-control-grid')).toContainText('RegWrite');
  await expect(page.locator('.datapath-control-grid')).toContainText('ALUOp');
  await expect(page.locator('.datapath-instruction-summary')).toContainText('add x5, x6, x7');

  await page.getByLabel('选择数据通路例题').selectOption('beq x1, x2, 12');
  await expect(page.locator('.datapath-instruction-summary')).toContainText('beq x1, x2, 12');
  await expect(page.locator('.datapath-result-line')).toContainText('Next PC: 0x0000100c');
  await expect(page.locator('.datapath-control-grid')).toContainText('PCSourcebranch');
  await page.getByRole('button', { name: '下一步' }).click();
  await expect(page.locator('.datapath-stage').nth(1)).toHaveClass(/active/u);

  await page.getByLabel('PC').fill('0x100000000');
  await expect(page.getByRole('alert')).toContainText('PC 必须是 32 位无符号整数');
  await page.getByRole('button', { name: '恢复默认数据通路预设' }).click();
  await expect(page.locator('.datapath-instruction-summary')).toContainText('add x5, x6, x7');
  await expectNoPageOverflow(page);
  await page.locator('.cpu-lab-page').screenshot({
    path: `output/playwright/screenshots/datapath-lab-${testInfo.project.name}.png`,
  });
  if (testInfo.project.name === 'chromium-390') {
    await captureMobileSection(page, '.datapath-lab-panel > .lab-control-panel', 'datapath-input');
    await captureMobileSection(page, '.datapath-control-panel', 'datapath-control-signals');
    await captureMobileSection(page, '.datapath-stage-strip', 'datapath-stages-start');
    await page.locator('.datapath-stage-strip').evaluate((element) => { element.scrollLeft = element.scrollWidth; });
    await page.locator('.datapath-stage-strip').screenshot({ path: 'output/playwright/screenshots/datapath-stages-end-chromium-390.png' });
    await captureMobileSection(page, '.datapath-lab-panel > .step-explorer', 'datapath-step-trace');
  }

  await page.getByRole('button', { name: '相关真题 2 题' }).click();
  await expect(page.locator('.practice-topbar strong')).toContainText('第 11 题');
  await expect(page.getByRole('button', { name: /RV32I 单周期数据通路/u })).toBeVisible();
  await page.getByRole('button', { name: /RV32I 单周期数据通路/u }).click();
  await expect(page).toHaveURL(/\/lab\?module=datapath$/u);
  await expect(page.getByRole('heading', { name: 'RV32I 单周期数据通路' })).toBeVisible();
});
