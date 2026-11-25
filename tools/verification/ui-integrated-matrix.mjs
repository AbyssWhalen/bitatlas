import assert from 'node:assert/strict';
import path from 'node:path';
import { mkdir, writeFile } from 'node:fs/promises';
import { gzipSync } from 'node:zlib';
import { chromium } from 'playwright';
import { auditText } from './ui-text-contrast.mjs';
import { checkThemeStartup } from './ui-theme-regression.mjs';
import { assertBuild, fresh, json, local, login, openPage, readyRegister, server, sha256, shot } from './ui-integrated-browser.mjs';

const [label, theme, widthArg, part = 'all'] = process.argv.slice(2);
assert(['all', 'tail'].includes(part));
const width = Number(widthArg);
assert(['day', 'night'].includes(theme) && [1440, 390].includes(width));
const dest = await fresh(label);
const bg = path.join(dest, 'background');
await mkdir(bg);
const cached = new Set();
const receipt = { width, theme, results: [], errors: [], pageErrors: [], builds: {} };
const browser = await chromium.launch({ channel: 'chrome' });
receipt.chrome = browser.version();
function monitor(page) { page.on('pageerror', (e) => receipt.pageErrors.push({ url: page.url(), error: e.message })); }
async function sizeOf(page, size) {
  await page.getByLabel('正文字号', { exact: true }).selectOption(String(size));
  await page.waitForFunction((size) => globalThis.getComputedStyle(globalThis.document.documentElement).getPropertyValue('--reading-font-size').trim() === `${size}px`, size);
}
async function measure(page, route, size, mode) {
  const key = `${route}-${size}px`;
  await page.evaluate(async () => {
    const { document } = globalThis;
    document.activeElement?.blur();
    document.scrollingElement.scrollTop = 0;
    const main = document.querySelector('.main-area'); if (main) main.scrollTop = 0;
    await document.fonts.ready;
    await new Promise((r) => globalThis.requestAnimationFrame(() => globalThis.requestAnimationFrame(r)));
  });
  const state = await page.evaluate(() => {
    const { document, innerWidth, getComputedStyle } = globalThis;
    const root = document.documentElement, main = document.querySelector('.main-area');
    return { width: innerWidth, viewportMeta: document.querySelector('meta[name=viewport]')?.content,
      rootOverflow: root.scrollWidth - innerWidth, mainOverflow: main ? main.scrollWidth - main.clientWidth : null,
      actualSize: getComputedStyle(root).getPropertyValue('--reading-font-size').trim(), theme: root.dataset.theme,
      themeColor: document.querySelector('meta[name=theme-color]').content, bone: getComputedStyle(root).getPropertyValue('--bone').trim(),
      heading: document.querySelector('h1')?.textContent, syncChips: [...document.querySelectorAll('.topbar .status-chip')].map((el) => el.textContent) };
  });
  assert.equal(state.width, width); assert.match(state.viewportMeta, /width=device-width/);
  assert.equal(state.theme, theme); assert.equal(state.actualSize, `${size}px`);
  assert.equal(state.themeColor.toLowerCase(), state.bone.toLowerCase());
  const screenshot = await shot(page, dest, key, true);
  const measured = await auditText(page);
  const frames = [];
  for (const { scroll, bytes } of measured.backgrounds) {
    const hash = sha256(bytes);
    if (!cached.has(hash)) { await writeFile(path.join(bg, `${hash}.png`), bytes); cached.add(hash); }
    frames.push({ scroll, sha256: hash });
  }
  assert(measured.records.length > 0);
  const failures = measured.records.filter(r => !r.pass).map(({ selector, text, ratio, threshold, x, y, scroll, color, background }) =>
    ({ selector, text, ratio, threshold, x, y, scroll, color, background }));
  await writeFile(path.join(dest, `${key}-contrast.json.gz`), gzipSync(JSON.stringify({ frames, records: measured.records, limitations: measured.limitations })));
  receipt.results.push({ key, mode, ...state, screenshot, textChecked: measured.records.length, failures,
    min: Math.min(...measured.records.map(r => r.ratio)) });
  await json(path.join(dest, 'receipt.json'), receipt);
  console.log(`${key}: ${measured.records.length} text, ${failures.length} failures, overflow ${state.rootOverflow}/${state.mainOverflow}`);
}
async function route(page, name, url, ready, mode = 'server', action) {
  try {
    await page.goto(url);
    if (action) await action();
    await page.locator(ready).first().waitFor();
    for (const size of [18, 24]) { await sizeOf(page, size); await measure(page, name, size, mode); }
  } catch (e) {
    receipt.errors.push({ route: name, message: e.message });
    await json(path.join(dest, 'receipt.json'), receipt);
    console.error(name, e.message);
  }
}
try {
  receipt.builds.local = await assertBuild(local, 'local');
  receipt.builds.server = await assertBuild(server, 'server');
  // HTML head with React blocked, storage-denied path, system changes, and no-JS CSS fallback.
  if (part === 'all' && width === 1440 && theme === 'day') for (const [mode, origin] of [['local', local], ['server', server]]) {
    const folder = path.join(dest, `startup-${mode}`); await mkdir(folder);
    await checkThemeStartup(browser, origin, folder);
  }
  const page = await openPage(browser, width, theme, server); monitor(page);
  await login(page, 'member19');
  if (part === 'all') {
  await page.getByRole('heading', { name: '今日学习', exact: true }).waitFor();
  await route(page, 'today', '/', '.subject-overview-list a', 'server', () => page.locator('.task-list').waitFor());
  await route(page, 'knowledge', '/knowledge', '.register', 'server', () => readyRegister(page));
  await route(page, 'questions', '/questions?year=2009', '.question-row');
  await route(page, 'practice', '/questions?year=2009', '.practice-topbar', 'server', () => page.getByRole('button', { name: '开始第 1 题', exact: true }).click());
  if (page.url().includes('/practice/')) {
    await page.locator('.option-list > button[aria-keyshortcuts="A"]').click();
    await page.getByRole('button', { name: '提交答案', exact: true }).click();
    await page.locator('.answer-panel').waitFor();
    await page.getByRole('button', { name: '结束', exact: true }).click();
    await page.getByRole('heading', { name: '本轮总结', exact: true }).waitFor();
    await route(page, 'summary', page.url(), '.sec-summary h1', 'server', () => page.getByRole('heading', { name: '本轮总结', exact: true }).waitFor());
  }
  await route(page, 'wrong', '/wrong', '.sec-wrong h1');
  await route(page, 'review', '/review', '.memory-preview');
  await route(page, 'stats', '/stats', '.heatmap span');
  await route(page, 'settings', '/settings', '.sec-settings h1');
  await route(page, 'more', '/more', '.sec-more h1');
  await route(page, 'documents-server', '/documents', 'a[href^="/documents/"]');
  }
  // Login has no preference control. Unmount the authenticated shell after setting the
  // real preference; the same document retains that reading size on the login form.
  for (const size of (part === 'tail' ? [24] : [18, 24])) {
    await page.goto('/settings');
    await sizeOf(page, size);
    await page.getByRole('button', { name: '退出并锁定本地记录' }).click();
    await page.getByRole('button', { name: '登录', exact: true }).waitFor();
    await measure(page, 'login', size, 'server');
    if (size === 18) await login(page, 'member19');
  }
  await page.context().close();
  const lp = await openPage(browser, width, theme); monitor(lp);
  await route(lp, 'documents-local', '/documents', '.sec-documents h1', 'local');
  await route(lp, 'settings-local', '/settings', '.sec-settings h1', 'local');
  await lp.context().close();
} catch (e) {
  receipt.errors.push({ route: 'batch', message: e.stack });
} finally {
  receipt.passed = !receipt.errors.length && !receipt.pageErrors.length && receipt.results.length === (part === 'tail' ? 5 : 28) &&
    receipt.results.every(r => r.rootOverflow <= 0 && (r.mainOverflow === null || r.mainOverflow <= 0) && !r.failures.length);
  await json(path.join(dest, 'receipt.json'), receipt);
  await browser.close();
  if (!receipt.passed) process.exitCode = 1;
}
