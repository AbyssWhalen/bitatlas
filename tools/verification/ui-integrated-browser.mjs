import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { seedServer, TEST_PASSWORD } from './server-fixture.ts';

export const evidence = path.resolve('output/playwright/opus-ui-2026-11-22/stage-4-integrated');
export const local = 'http://127.0.0.1:4351';
export const server = 'http://127.0.0.1:4349';
export const sha256 = (data) => createHash('sha256').update(data).digest('hex');
export const json = (file, data) => writeFile(file, `${JSON.stringify(data, null, 2)}\n`);
export async function fresh(label) {
  assert.match(label, /^[a-z0-9-]+$/);
  const dest = path.join(evidence, label);
  await mkdir(dest); // Never replace past evidence.
  return dest;
}
export async function openPage(browser, width, theme, origin = local) {
  const ctx = await browser.newContext({ baseURL: origin, viewport: { width, height: width === 390 ? 844 : 900 },
    deviceScaleFactor: 1, isMobile: width === 390, hasTouch: width === 390, locale: 'zh-CN', timezoneId: 'Asia/Shanghai',
    serviceWorkers: 'block', reducedMotion: 'reduce', colorScheme: theme === 'day' ? 'light' : 'dark' });
  const page = await ctx.newPage();
  await page.goto('/');
  await page.evaluate((theme) => globalThis.localStorage.setItem('bitatlas.ui.theme', theme), theme);
  await page.reload();
  return page;
}
export async function login(page, account = 'member18') {
  await page.getByLabel('用户名', { exact: true }).fill(account);
  await page.getByLabel('密码', { exact: true }).fill(TEST_PASSWORD);
  await page.getByRole('button', { name: '登录', exact: true }).click();
  await page.locator('.shell-v2 .topbar').waitFor();
}
export async function readyRegister(page) {
  await page.waitForFunction(() => globalThis.document.querySelectorAll('button[data-concept]').length === 102);
  await page.waitForFunction(() => [...globalThis.document.querySelectorAll('.knowledge-graph-canvas canvas')].some((el) => {
    if (!el.width || !el.height) return false;
    const data = el.getContext('2d')?.getImageData(0, 0, el.width, el.height).data;
    for (let i = 3; data && i < data.length; i += 16) if (data[i]) return true;
    return false;
  }));
}
export async function shot(page, dest, name, fullPage = false) {
  await page.evaluate(() => globalThis.document.fonts.ready);
  await page.mouse.move(-1, -1);
  const bytes = await page.screenshot({ fullPage, animations: 'disabled', caret: 'hide' });
  await writeFile(path.join(dest, `${name}.png`), bytes, { flag: 'wx' });
  return { name, sha256: sha256(bytes), bytes: bytes.length, url: page.url() };
}
export async function assertBuild(origin, mode) {
  const disk = await readFile(path.join(evidence, `build-${mode}-1/index.html`));
  const bytes = Buffer.from(await (await fetch(origin)).arrayBuffer());
  assert.equal(sha256(bytes), sha256(disk), `${origin} does not serve build-${mode}-1`);
  return sha256(bytes);
}
async function priority(label) {
  const dest = await fresh(label);
  const hash = await assertBuild(server, 'server');
  const browser = await chromium.launch({ channel: 'chrome' });
  const shots = [];
  try {
    for (const [width, theme] of [[1440, 'day'], [1440, 'night'], [390, 'day']]) {
      const page = await openPage(browser, width, theme, server);
      await login(page);
      await page.locator('.task-list').waitFor();
      if (width === 1440 && theme === 'day') shots.push(await shot(page, dest, 'today-1440-day'));
      await page.goto('/knowledge');
      await readyRegister(page);
      shots.push(await shot(page, dest, `knowledge-${width}-${theme}${width === 390 ? '-collapsed' : ''}`));
      if (width === 390) {
        await page.getByRole('button', { name: '展开数据结构概念格' }).click();
        await page.locator('.register-row.is-open button.bit').first().waitFor();
        shots.push(await shot(page, dest, 'knowledge-390-day-expanded'));
      }
      await page.context().close();
    }
  } finally {
    await json(path.join(dest, 'receipt.json'), { buildIndex: hash, shots });
    await browser.close();
  }
}
if (fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const [mode, label] = process.argv.slice(2);
  if (mode === 'serve') {
    const dir = await fresh(label);
    const fixture = await seedServer(dir, 4349, path.join(evidence, 'build-server-1'));
    console.log('Stage 4 disposable fixture ready on 4349.');
    for (const signal of ['SIGTERM', 'SIGINT']) process.once(signal, () => { void fixture.app.close(); });
  } else if (mode === 'priority') await priority(label);
  else throw new Error('Expected serve or priority and a fresh label.');
}
