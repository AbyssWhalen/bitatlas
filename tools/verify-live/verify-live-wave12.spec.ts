// 线上验收（国内直连）：启动性能修复 + 内容重建（题干配图/解析恢复/错字）后的真实 Chrome 检查。
// 运行：node --import tsx tools/verify-live/verify-live-wave12.spec.ts
import { chromium } from 'playwright';
import path from 'node:path';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(here, '..', '..');
const base = 'https://408.fytjut.com';
const shotDir = path.join(projectRoot, 'output', 'playwright', 'verify-live-wave12');

let failures = 0;
async function check(name: string, body: () => Promise<void>) {
  try {
    await body();
    console.log(`PASS ${name}`);
  } catch (error) {
    failures += 1;
    console.error(`FAIL ${name}:`, error instanceof Error ? error.message.split('\n')[0] : error);
  }
}
function expect(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

await mkdir(shotDir, { recursive: true });
const browser = await chromium.launch({
  channel: 'chrome',
  args: ['--host-resolver-rules=MAP 408.fytjut.com 104.21.35.89'],
});

// 桌面上下文：启用 SW 以覆盖 PWA 离线路径。
const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, serviceWorkers: 'allow' });
const page = await context.newPage();
const consoleErrors: string[] = [];
page.on('pageerror', (error) => consoleErrors.push(`pageerror: ${error.message}`));
page.on('console', (message) => {
  if (message.type() === 'error') consoleErrors.push(message.text());
});

await check('首屏：默认 2009 视图 47 题（冷启动一次完成）', async () => {
  await page.goto(`${base}/questions`, { timeout: 60_000 });
  await page.locator('.result-summary strong').getByText('47').waitFor({ timeout: 60_000 });
});

await check('年份筛选 17 年（后台扩展安装已完成）', async () => {
  await page.locator('[aria-label="年份筛选"] button', { hasText: '2019' }).waitFor({ timeout: 60_000 });
  const chips = await page.locator('[aria-label="年份筛选"] button').allTextContents();
  expect(chips.length === 17, `年份按钮应为 17 个，实际 ${chips.length}`);
});

await check('2019 Q5：题干图（AOE 网）内嵌页面图加载', async () => {
  await page.locator('[aria-label="年份筛选"] button', { hasText: '2019' }).click();
  await page.locator('.result-summary strong').getByText('47').waitFor({ timeout: 90_000 });
  await page.getByRole('button', { name: '开始第 5 题', exact: true }).click();
  await page.locator('.practice-topbar strong').getByText('第 5 题').waitFor({ timeout: 90_000 });
  const optionText = await page.locator('.option-list button').first().innerText();
  expect(!optionText.includes('图示'), 'Q5 不应再是图示占位选项');
  await page.waitForFunction(() => {
    const images = [...document.querySelectorAll('.question-workspace img')];
    return images.length > 0 && images.every((image) => image.complete && image.naturalWidth > 0);
  }, undefined, { timeout: 60_000 });
  await page.screenshot({ path: path.join(shotDir, 'live-2019-q5-stem-figure.png'), fullPage: true });
});

await check('2019 Q24 图示选项题保持占位选项 + 页面图', async () => {
  await page.goto(`${base}/questions`, { timeout: 60_000 });
  await page.locator('[aria-label="年份筛选"] button', { hasText: '2019' }).click();
  await page.locator('.result-summary strong').getByText('47').waitFor({ timeout: 90_000 });
  await page.getByRole('button', { name: '开始第 24 题', exact: true }).click();
  await page.locator('.practice-topbar strong').getByText('第 24 题').waitFor({ timeout: 90_000 });
  const optionText = await page.locator('.option-list button').first().innerText();
  expect(optionText.includes('图示'), 'Q24 选项应为图示占位说明');
  await page.waitForFunction(() => {
    const images = [...document.querySelectorAll('.question-workspace img')];
    return images.length > 0 && images.every((image) => image.complete && image.naturalWidth > 0);
  }, undefined, { timeout: 60_000 });
});

await check('2010 Q1 题干无「大千」错字', async () => {
  await page.goto(`${base}/questions`, { timeout: 60_000 });
  await page.locator('[aria-label="年份筛选"] button', { hasText: '2010' }).click();
  await page.locator('.result-summary strong').getByText('47').waitFor({ timeout: 90_000 });
  const rowText = await page.locator('.question-row').first().innerText();
  expect(!rowText.includes('大千'), '2010 Q1 题干不应再含「大千」');
});

await check('2018 Q6：题干「己知」已修且解析为恢复的真实文本', async () => {
  await page.goto(`${base}/questions`, { timeout: 60_000 });
  await page.locator('[aria-label="年份筛选"] button', { hasText: '2018' }).click();
  await page.locator('.result-summary strong').getByText('47').waitFor({ timeout: 90_000 });
  await page.getByRole('button', { name: '开始第 6 题', exact: true }).click();
  await page.locator('.practice-topbar strong').getByText('第 6 题').waitFor({ timeout: 90_000 });
  const practiceText = await page.locator('.question-workspace').innerText();
  expect(!practiceText.includes('己知'), '2018 Q6 题干不应再含「己知」');
  await page.locator('.option-list button').first().click();
  await page.getByRole('button', { name: /提交答案/ }).click();
  await page.locator('.answer-panel').waitFor({ timeout: 60_000 });
  const panelText = await page.locator('.answer-panel').innerText();
  expect(!panelText.includes('暂缺文字版'), '2018 Q6 解析不应是占位文案');
  expect(panelText.length > 80, '2018 Q6 解析过短，疑似未恢复');
});

await check('数据页：无假安装问题（Response.clone 回归已修）', async () => {
  await page.goto(`${base}/settings`, { timeout: 60_000 });
  await page.waitForTimeout(1000);
  const settingsText = await page.locator('main').innerText();
  expect(!settingsText.includes('Body has already been consumed'), '不应再显示 clone 类安装问题');
  expect(!settingsText.includes('安装失败'), '不应显示安装失败条目');
});

let warmed2019Asset = false;
await check('等待 2019 来源页资产进入 Cache Storage（离线前置）', async () => {
  await page.waitForFunction(async () => {
    if (typeof caches === 'undefined') return false;
    const keys = await caches.keys();
    for (const key of keys) {
      const hit = await caches.open(key).then((cache) => cache.match('/content/cn408-2019/source/paper-1.jpg'));
      if (hit) return true;
    }
    return false;
  }, undefined, { timeout: 180_000, polling: 5_000 });
  warmed2019Asset = true;
});

await check('PWA 离线：断网重载后应用与 2009 题包可用', async () => {
  expect(warmed2019Asset, '前置：2019 资产未预热');
  await page.waitForFunction(async () => {
    const registration = await navigator.serviceWorker?.getRegistration();
    return registration?.active?.state === 'activated';
  }, undefined, { timeout: 120_000, polling: 2_000 });
  await context.setOffline(true);
  await page.reload({ timeout: 60_000 });
  await page.locator('.result-summary strong').getByText('47').waitFor({ timeout: 60_000 });
  await page.screenshot({ path: path.join(shotDir, 'live-offline-questions.png'), fullPage: true });
  await context.setOffline(false);
});

const mobile = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block', isMobile: true, hasTouch: true });
const mobilePage = await mobile.newPage();
await check('移动 390：2019 Q5 题干图 + 无横向溢出', async () => {
  await mobilePage.goto(`${base}/questions`, { timeout: 60_000 });
  await mobilePage.locator('.result-summary strong').getByText('47').waitFor({ timeout: 90_000 });
  await mobilePage.locator('[aria-label="年份筛选"] button', { hasText: '2019' }).click();
  await mobilePage.locator('.result-summary strong').getByText('47').waitFor({ timeout: 90_000 });
  await mobilePage.getByRole('button', { name: '开始第 5 题', exact: true }).click();
  await mobilePage.locator('.practice-topbar strong').getByText('第 5 题').waitFor({ timeout: 90_000 });
  await mobilePage.waitForFunction(() => {
    const images = [...document.querySelectorAll('.question-workspace img')];
    return images.length > 0 && images.every((image) => image.complete && image.naturalWidth > 0);
  }, undefined, { timeout: 60_000 });
  const overflow = await mobilePage.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
  expect(!overflow, '390 视口出现横向溢出');
  await mobilePage.screenshot({ path: path.join(shotDir, 'live-mobile-2019-q5.png'), fullPage: true });
});

await check('无 console error / pageerror（桌面全流程）', async () => {
  // GitHub Pages 对 SPA 深链接文档返回 404 再回退 index.html，是 RELEASE.md 已文档化的既有行为。
  const realErrors = consoleErrors.filter((text) => !text.includes('ERR_INTERNET_DISCONNECTED') && !/status of 404/.test(text));
  expect(realErrors.length === 0, `console 错误: ${realErrors.slice(0, 5).join(' | ')}`);
});

await browser.close();
console.log(failures === 0 ? 'ALL PASS' : `FAILURES: ${failures}`);
process.exit(failures === 0 ? 0 : 1);
