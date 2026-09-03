// 线上验收（走本机 V2RayN 代理）：17 套题包发布后的真实 Chrome 检查。
// 运行：node --import tsx tools/verify-live/verify-live-17years.spec.ts
import { chromium } from 'playwright';
import path from 'node:path';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(here, '..', '..');
const base = 'https://408.fytjut.com';
const shotDir = path.join(projectRoot, 'output', 'playwright', 'verify-live-17years');

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
const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, serviceWorkers: 'block' });
const page = await context.newPage();

await check('默认 2009 视图 47 题', async () => {
  await page.goto(`${base}/questions`, { timeout: 60_000 });
  await page.locator('.result-summary strong').getByText('47').waitFor({ timeout: 60_000 });
});

await check('年份筛选显示全部 17 年', async () => {
  const chips = await page.locator('[aria-label="年份筛选"] button').allTextContents();
  expect(chips.length === 17, `年份按钮应为 17 个，实际 ${chips.length}: ${chips.join(',')}`);
  for (const year of ['2009', '2013', '2019', '2025']) expect(chips.includes(year), `缺 ${year}`);
});

await check('切换 2015 并练习 Q1（答案 A）', async () => {
  await page.locator('[aria-label="年份筛选"] button', { hasText: '2015' }).click();
  await page.locator('.result-summary strong').getByText('47').waitFor({ timeout: 90_000 });
  await page.getByRole('button', { name: '开始第 24 题', exact: true }).click();
  await page.locator('.practice-topbar strong').getByText('第 24 题').waitFor({ timeout: 90_000 });
  const options = page.locator('.option-list button');
  expect(await options.count() === 4, '选项数不为 4');
  await options.nth(0).click();
  await page.getByRole('button', { name: '提交答案' }).click();
  await page.getByRole('status').getByText(/回答(正确|错误)/).waitFor({ timeout: 90_000 });
  await page.screenshot({ path: path.join(shotDir, 'live-2015-practice.png'), fullPage: true });
});

await check('2019 图示选项题：题干内嵌页面图加载', async () => {
  await page.goto(`${base}/questions`, { timeout: 60_000 });
  await page.locator('[aria-label="年份筛选"] button', { hasText: '2019' }).click();
  await page.locator('.result-summary strong').getByText('47').waitFor({ timeout: 90_000 });
  await page.getByRole('button', { name: '开始第 24 题', exact: true }).click();
  await page.locator('.practice-topbar strong').getByText('第 24 题').waitFor({ timeout: 90_000 });
  const stemImage = page.locator('.question-workspace img');
  await stemImage.first().waitFor({ timeout: 90_000 });
  await page.waitForFunction(() => {
    const images = [...document.querySelectorAll('.question-workspace img')];
    return images.length > 0 && images.every((image) => image.complete && image.naturalWidth > 0);
  }, undefined, { timeout: 60_000 });
  const optionText = await page.locator('.option-list button').first().innerText();
  expect(optionText.includes('图示'), '选项应为图示占位说明');
  await page.screenshot({ path: path.join(shotDir, 'live-2019-figure-question.png'), fullPage: true });
});

await check('2025 综合题作答（自评）', async () => {
  await page.goto(`${base}/questions`, { timeout: 60_000 });
  await page.locator('[aria-label="年份筛选"] button', { hasText: '2025' }).click();
  await page.locator('.result-summary strong').getByText('47').waitFor({ timeout: 90_000 });
  await page.getByRole('button', { name: '开始第 41 题', exact: true }).click();
  await page.locator('.practice-topbar strong').getByText('第 41 题').waitFor({ timeout: 90_000 });
  await page.getByLabel('作答草稿').fill('2025 综合题练习草稿');
  await page.getByRole('button', { name: '查看参考答案' }).click();
  await page.getByRole('spinbutton', { name: '自评分' }).fill('8');
  await page.getByRole('button', { name: '完成自评' }).click();
  await page.getByRole('status').getByText(/自评/).waitFor({ timeout: 90_000 });
  await page.screenshot({ path: path.join(shotDir, 'live-2025-comprehensive.png'), fullPage: true });
});

await check('模考门禁保持关闭', async () => {
  await page.goto(`${base}/mock`, { timeout: 60_000 });
  await page.getByText('尚未完成 47 题人工复核').waitFor({ timeout: 90_000 });
});

await browser.close();
console.log(failures === 0 ? 'ALL PASS' : `${failures} FAILED`);
process.exitCode = failures === 0 ? 0 : 1;
