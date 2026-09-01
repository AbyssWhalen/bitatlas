import { expect, test, type Page } from '@playwright/test';

async function expectNoPageOverflow(page: Page) {
  await expect.poll(() => page.evaluate(() => {
    const main = document.querySelector<HTMLElement>('.main-area');
    return document.documentElement.scrollWidth <= document.documentElement.clientWidth
      && (!main || main.scrollWidth <= main.clientWidth);
  })).toBe(true);
}

test('runs the five-stage pipeline presets and keeps the cycle state inspectable', async ({ page }, testInfo) => {
  await page.goto('/lab?module=pipeline');
  await expect(page.getByRole('heading', { name: 'CPU 可视化实验室' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'RV32I 五级流水线' })).toBeVisible();
  await expect(page.getByRole('navigation', { name: '实验类型' }).getByRole('button')).toHaveCount(11);
  await expect(page.getByRole('button', { name: '五级流水线' })).toHaveClass(/active/u);
  const pipelineModes = page.getByLabel('流水线实验模式');
  await expect(pipelineModes.getByRole('button')).toHaveCount(2);
  await expect(pipelineModes.getByRole('button', { name: '动态五级流水' })).toHaveAttribute('aria-pressed', 'true');
  await expect(pipelineModes.getByRole('button', { name: '功能段时延' })).toHaveAttribute('aria-pressed', 'false');
  await expect(page.locator('.pipeline-stage-legend')).toContainText('IF');
  await expect(page.locator('.pipeline-stage-legend')).toContainText('WB');
  await expect(page.locator('.pipeline-stage-cell')).not.toHaveCount(0);

  await page.getByLabel('选择流水线例题').selectOption('load-use-stall');
  await expect(page.locator('.pipeline-preset-description')).toContainText('停顿');
  const stallCell = page.locator('.pipeline-stage-cell[data-stage="ST"]').first();
  await expect(stallCell).toBeVisible();
  const stallColumn = await stallCell.evaluate((element) => (element.closest('td') as HTMLTableCellElement | null)?.cellIndex ?? -1);
  await page.locator('.pipeline-chart thead button').nth(stallColumn - 1).click();
  await expect(page.locator('.pipeline-event-panel')).toContainText('停顿 1 周期');
  const forwardingOnSummary = await page.locator('.pipeline-summary-grid').textContent();
  await page.getByRole('switch', { name: /前递 ON/u }).click();
  await expect(page.getByRole('switch', { name: /前递 OFF/u })).toBeVisible();
  await expect.poll(() => page.locator('.pipeline-summary-grid').textContent()).not.toBe(forwardingOnSummary);

  await page.getByRole('button', { name: '下一个周期' }).click();
  await expect(page.locator('.pipeline-cycle-status')).toContainText('C2');
  await expect(page.locator('.pipeline-chart thead button[aria-current="step"]')).toHaveCount(1);
  await page.getByRole('button', { name: '复位周期' }).click();
  await expect(page.locator('.pipeline-cycle-status')).toContainText('C1');
  await page.getByRole('button', { name: '播放流水线' }).click();
  await expect.poll(() => page.locator('.pipeline-cycle-status').textContent()).not.toContain('C1 /', { timeout: 5000 });
  await page.getByRole('button', { name: '暂停流水线' }).click();

  await page.getByLabel('选择流水线例题').selectOption('taken-branch-flush');
  const flushCell = page.locator('.pipeline-stage-cell[data-stage="FL"]').first();
  await expect(flushCell).toBeVisible();
  const flushColumn = await flushCell.evaluate((element) => (element.closest('td') as HTMLTableCellElement | null)?.cellIndex ?? -1);
  await page.locator('.pipeline-chart thead button').nth(flushColumn - 1).click();
  await expect(page.locator('.pipeline-event-panel')).toContainText('冲刷');
  await expect(page.locator('.pipeline-state-panel')).toContainText('x3');

  if (testInfo.project.name === 'chromium-390') {
    const chart = page.locator('.pipeline-chart-scroll');
    await expect.poll(() => chart.evaluate((element) => element.scrollWidth > element.clientWidth)).toBe(true);
    await chart.evaluate((element) => { element.scrollLeft = element.scrollWidth; });
    await chart.screenshot({ path: 'output/playwright/screenshots/pipeline-chart-end-chromium-390.png' });
  }

  await page.locator('.pipeline-lab-panel').screenshot({
    path: `output/playwright/screenshots/pipeline-lab-${testInfo.project.name}.png`,
  });
  if (testInfo.project.name === 'chromium-390') {
    await page.locator('.pipeline-control-panel').screenshot({ path: 'output/playwright/screenshots/pipeline-input-chromium-390.png' });
    await page.locator('.pipeline-timing-section').screenshot({ path: 'output/playwright/screenshots/pipeline-timing-chromium-390.png' });
    await page.locator('.pipeline-result-grid').screenshot({ path: 'output/playwright/screenshots/pipeline-results-chromium-390.png' });
  }

  await page.getByLabel('流水线 RV32I 程序').fill('and x1, x2, x3');
  await expect(page.getByRole('alert')).toContainText('教学子集');
  await expect(page.locator('.pipeline-chart')).toHaveCount(0);
  await expect(page.locator('.pipeline-stage-cell')).toHaveCount(0);
  await expectNoPageOverflow(page);
});

test('calculates the Q18 functional-stage clock and restores its exact deep link', async ({ page }, testInfo) => {
  await page.goto('/lab?module=pipeline&mode=timing&preset=cn408-2009-q18-stage-clock');
  await expect(page.getByRole('heading', { name: 'CPU 可视化实验室' })).toBeVisible();
  await expect(page.getByRole('heading', { name: '功能段时延与时钟周期' })).toBeVisible();
  const pipelineModes = page.getByLabel('流水线实验模式');
  const dynamicMode = pipelineModes.getByRole('button', { name: '动态五级流水' });
  const timingMode = pipelineModes.getByRole('button', { name: '功能段时延' });
  await expect(pipelineModes.getByRole('button')).toHaveCount(2);
  await expect(dynamicMode).toHaveAttribute('aria-pressed', 'false');
  await expect(timingMode).toHaveAttribute('aria-pressed', 'true');
  await dynamicMode.click();
  await expect(page).toHaveURL(/\/lab\?module=pipeline$/u);
  await expect(dynamicMode).toHaveAttribute('aria-pressed', 'true');
  await expect(timingMode).toHaveAttribute('aria-pressed', 'false');
  await timingMode.click();
  await expect(page).toHaveURL(/\/lab\?module=pipeline&mode=timing&preset=cn408-2009-q18-stage-clock$/u);
  await expect(dynamicMode).toHaveAttribute('aria-pressed', 'false');
  await expect(timingMode).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('.pipeline-clock-result')).toContainText('90 ns');
  await page.getByLabel('各功能段时延').fill('100, 80, 70, 60');
  await expect(page.locator('.pipeline-clock-result')).toContainText('100 ns');
  await page.getByRole('button', { name: '恢复 Q18 参数' }).click();
  await expect(page.locator('.pipeline-clock-result')).toContainText('90 ns');
  await page.screenshot({
    path: `output/playwright/screenshots/pipeline-stage-timing-${testInfo.project.name}.png`,
    fullPage: true,
  });
  if (testInfo.project.name === 'chromium-390') {
    await page.locator('.main-area').evaluate((element) => { element.scrollTop = element.scrollHeight; });
    await page.screenshot({ path: 'output/playwright/screenshots/pipeline-stage-timing-bottom-chromium-390.png' });
  }
  await expectNoPageOverflow(page);
  await page.getByRole('button', { name: /相关真题 1 题/u }).click();
  await expect(page.locator('.practice-topbar strong')).toContainText('第 18 题');
  await expect(page.getByRole('button', { name: '流水线功能段时延' })).toBeVisible();
  await page.getByRole('button', { name: '流水线功能段时延' }).click();
  await expect(page).toHaveURL(/\/lab\?module=pipeline&mode=timing&preset=cn408-2009-q18-stage-clock$/u);
});
