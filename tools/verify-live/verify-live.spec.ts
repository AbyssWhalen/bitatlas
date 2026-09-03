// 线上验收：https://408.fytjut.com 题包公开发布后的真实 Chrome 检查。
// 运行：node --import tsx tools/verify-live/verify-live.spec.ts
//
// 覆盖：
//   1) 桌面 1440：真题页 47 题、Q1 作答提交、解析、来源页图片加载
//   2) /mock 保持 verified 门禁关闭
//   3) 移动 390：真题页 47 题、无横向溢出
//   4) 全程收集 console error（既有 Cytoscape warning 不计入）

import { chromium } from 'playwright';
import path from 'node:path';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(here, '..', '..');
const base = 'https://408.fytjut.com';
const shotDir = path.join(projectRoot, 'output', 'playwright', 'verify-live-pack');

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
const browser = await chromium.launch({ channel: 'chrome' });

const consoleErrors: string[] = [];
// GitHub Pages 对应用深链接本身返回 HTTP 404 + 404.html 回退（docs/RELEASE.md 文档化的既有设计），
// 只统计非文档类资源或非站点路由的 4xx/5xx。
const isDocumentFallback = (url: string) => /^https:\/\/408\.fytjut\.com\/[^?]*$/.test(url) && !/\.[a-z0-9]+$/i.test(url);
const desktop = await browser.newContext({ viewport: { width: 1440, height: 900 }, serviceWorkers: 'block' });
const page = await desktop.newPage();
page.on('response', (response) => {
  if (response.status() >= 400 && !isDocumentFallback(response.url())) {
    consoleErrors.push(`${response.status()} ${response.url()}`);
  }
});
page.on('pageerror', (error) => consoleErrors.push(`pageerror: ${error.message}`));

await check('桌面：真题页安装并显示 47 题', async () => {
  await page.goto(`${base}/questions`);
  await page.locator('.result-summary strong').getByText('47').waitFor({ timeout: 30_000 });
  await page.locator('.question-list .question-row').first().waitFor({ timeout: 15_000 });
  const rows = await page.locator('.question-list .question-row').count();
  expect(rows === 47, `题目行数应为 47，实际 ${rows}`);
  await page.screenshot({ path: path.join(shotDir, 'live-desktop-questions.png'), fullPage: true });
});

await check('桌面：Q1 作答提交与解析', async () => {
  await page.getByRole('button', { name: '开始第 1 题', exact: true }).click();
  await page.locator('.practice-topbar strong').getByText('第 1 题').waitFor({ timeout: 15_000 });
  const options = page.locator('.option-list button');
  expect(await options.count() === 4, '应有 4 个选项');
  await options.nth(1).click();
  await page.getByRole('button', { name: '提交答案' }).click();
  await page.getByRole('status').getByText('回答正确').waitFor({ timeout: 15_000 });
  await page.screenshot({ path: path.join(shotDir, 'live-desktop-practice.png'), fullPage: true });
});

await check('桌面：来源页扫描图加载', async () => {
  const trigger = page.getByRole('button', { name: /原卷第/ });
  await trigger.click();
  const dialog = page.getByRole('dialog', { name: '来源页' });
  await dialog.waitFor({ timeout: 15_000 });
  await page.waitForFunction(() => {
    const images = [...document.querySelectorAll('img')].filter((entry) => entry.src.includes('/content/cn408-2009/'));
    return images.length > 0 && images.every((image) => image.complete && image.naturalWidth > 0);
  }, undefined, { timeout: 30_000 });
  await page.screenshot({ path: path.join(shotDir, 'live-desktop-source-page.png') });
  await page.keyboard.press('Escape');
});

await check('桌面：刷新后练习恢复', async () => {
  await page.reload();
  await page.locator('.practice-topbar strong').getByText('第 1 题').waitFor({ timeout: 15_000 });
  await page.getByRole('status').getByText('回答正确').waitFor({ timeout: 15_000 });
});

await check('桌面：模考入口保持关闭', async () => {
  await page.goto(`${base}/mock`);
  await page.getByText('尚未完成 47 题人工复核').waitFor({ timeout: 15_000 });
  await page.screenshot({ path: path.join(shotDir, 'live-desktop-mock-closed.png'), fullPage: true });
});

await desktop.close();

const mobile = await browser.newContext({
  viewport: { width: 390, height: 844 },
  isMobile: true,
  hasTouch: true,
  userAgent: 'Mozilla/5.0 (Linux; Android 10; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Mobile Safari/537.36',
  serviceWorkers: 'block',
});
const mpage = await mobile.newPage();
mpage.on('response', (response) => {
  if (response.status() >= 400 && !isDocumentFallback(response.url())) {
    consoleErrors.push(`mobile: ${response.status()} ${response.url()}`);
  }
});
mpage.on('pageerror', (error) => consoleErrors.push(`mobile pageerror: ${error.message}`));

await check('移动 390：真题页 47 题且无横向溢出', async () => {
  await mpage.goto(`${base}/questions`);
  await mpage.locator('.result-summary strong').getByText('47').waitFor({ timeout: 30_000 });
  const rows = await mpage.locator('.question-list .question-row').count();
  expect(rows === 47, `题目行数应为 47，实际 ${rows}`);
  await mpage.waitForFunction(
    () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
    undefined,
    { timeout: 15_000 },
  );
  await mpage.screenshot({ path: path.join(shotDir, 'live-mobile-questions.png'), fullPage: true });
});

await check('移动 390：练习页可用', async () => {
  await mpage.getByRole('button', { name: '开始第 2 题', exact: true }).click();
  await mpage.locator('.practice-topbar strong').getByText('第 2 题').waitFor({ timeout: 15_000 });
  const options = mpage.locator('.option-list button');
  await options.first().waitFor({ timeout: 15_000 });
  await options.nth(0).click();
  await mpage.getByRole('button', { name: '提交答案' }).click();
  await mpage.getByRole('status').getByText(/回答(正确|错误)/).waitFor({ timeout: 15_000 });
  await mpage.screenshot({ path: path.join(shotDir, 'live-mobile-practice.png'), fullPage: true });
});

await mobile.close();
await browser.close();

const realErrors = consoleErrors.filter((entry) => !entry.includes('/favicon.ico'));
if (realErrors.length > 0) {
  failures += 1;
  console.error(`FAIL 控制台无错误: ${realErrors.length} 条`, realErrors.slice(0, 5));
} else {
  console.log('PASS 控制台无错误');
}
console.log(failures === 0 ? 'ALL PASS' : `${failures} FAILED`);
process.exitCode = failures === 0 ? 0 : 1;
