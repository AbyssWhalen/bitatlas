import assert from 'node:assert/strict';
import { constants } from 'node:fs';
import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { gzipSync } from 'node:zlib';
import { chromium } from 'playwright';
import { createApp } from '../../apps/server/src/app.ts';
import { TEST_PASSWORD } from './server-fixture.ts';
import { routes, snapshot, stableScreenshot, compareImages } from './ui-style-regression.mjs';
import { auditText } from './ui-text-contrast.mjs';

const root = process.cwd();
const evidence = path.resolve(root, 'output/playwright/opus-ui-2026-11-22/stage-2-theme');
const digest = (value) => createHash('sha256').update(value).digest('hex');
async function writeJson(file, value, compact = false) {
  const text = Buffer.from(`${JSON.stringify(value, null, 2)}\n`);
  await writeFile(file, compact && text.length >= 32768 ? JSON.stringify({
    format: 'bitatlas-style-evidence-gzip-v1', uncompressedBytes: text.length,
    sha256: digest(text), gzipBase64: gzipSync(text, { level: 9 }).toString('base64'),
  }) + '\n' : text);
}

export async function checkThemeStartup(browser, origin, destination) {
  const checks = [];
  for (const test of [
    { stored: 'day', system: 'dark', expected: 'day' },
    { stored: 'night', system: 'light', expected: 'night' },
    { stored: null, system: 'dark', expected: 'night' },
    { stored: null, system: 'light', expected: 'day' },
    { stored: 'invalid', system: 'dark', expected: 'night' },
    { stored: null, system: 'light', blocked: true, expected: 'day' },
  ]) {
    const context = await browser.newContext({ colorScheme: test.system, serviceWorkers: 'block' });
    await context.addInitScript((test) => {
      if (test.blocked) Object.defineProperty(globalThis, 'localStorage', { get: () => { throw new Error('Storage denied'); } });
      else if (test.stored !== null) globalThis.localStorage.setItem('bitatlas.ui.theme', test.stored);
    }, test);
    const page = await context.newPage();
    // Inspect the head script before the React module can run.
    await page.route('**/*.js', (route) => route.abort());
    await page.goto(origin, { waitUntil: 'domcontentloaded' });
    const state = await page.evaluate(() => ({
      theme: globalThis.document.documentElement.dataset.theme,
      meta: globalThis.document.querySelector('meta[name=theme-color]').content,
      bone: globalThis.getComputedStyle(globalThis.document.documentElement).getPropertyValue('--bone').trim(),
    }));
    assert.equal(state.theme, test.expected);
    assert.equal(state.meta.toLowerCase(), state.bone.toLowerCase());
    checks.push({ ...test, state, passed: true });
    if (!test.blocked) {
      const opposite = test.system === 'dark' ? 'light' : 'dark';
      await page.emulateMedia({ colorScheme: opposite });
      const expected = test.stored === 'day' || test.stored === 'night' ? test.stored : opposite === 'dark' ? 'night' : 'day';
      await page.waitForFunction((expected) => globalThis.document.documentElement.dataset.theme === expected, expected);
      assert.equal(await page.locator('meta[name=theme-color]').getAttribute('content'), expected === 'night' ? '#161615' : '#ECECE7');
      checks.push({ kind: 'System-change preference precedence', stored: test.stored, system: opposite, expected, passed: true });
      await page.evaluate(() => { globalThis.document.documentElement.dataset.theme = 'night'; });
      await page.waitForFunction(() => globalThis.document.querySelector('meta[name=theme-color]').content === '#161615');
      checks.push({ kind: 'data-theme mutation updates meta', passed: true });
    }
    await context.close();
  }
  const context = await browser.newContext({ colorScheme: 'dark', javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto(origin);
  const fallback = await page.locator('html').evaluate((el) => ({
    theme: el.getAttribute('data-theme'), bone: globalThis.getComputedStyle(el).getPropertyValue('--bone').trim(),
  }));
  assert.equal(fallback.theme, null); assert.equal(fallback.bone.toLowerCase(), '#161615');
  checks.push({ kind: 'CSS dark fallback without script', ...fallback, passed: true });
  await context.close();
  await writeJson(path.join(destination, 'theme-startup.json'), checks);
  return checks;
}

export async function captureThemes(label, buildArg) {
  assert.match(label, /^[a-z0-9-]+$/);
  const build = path.resolve(root, buildArg);
  assert(build.startsWith(evidence + path.sep));
  const destination = path.join(evidence, label);
  await mkdir(destination, { recursive: true });
  const baseline = path.join(root, 'output/request-sync-2026-11-22/browser-fixture');
  const database = path.join(destination, 'server.sqlite');
  await copyFile(path.join(baseline, 'baseline.sqlite'), database, constants.COPYFILE_EXCL);
  const origin = 'http://127.0.0.1:4349';
  // Both clocks must share the same Beijing date. Otherwise a capture crossing
  // midnight receives a server plan that the frozen browser correctly rejects.
  const fixedTime = JSON.parse(await readFile(path.join(root, 'output/playwright/opus-ui-2026-11-22/stage-1/clock.json'), 'utf8')).fixedTime;
  const server = createApp({ database, files: path.join(baseline, 'files'), origin, webRoot: build, now: () => Date.parse(fixedTime) });
  await server.app.listen({ host: '127.0.0.1', port: 4349 });
  const browser = await chromium.launch({ channel: 'chrome' });
  const receipt = { label, build, buildIndexSha256: digest(await readFile(path.join(build, 'index.html'))), chrome: browser.version(),
    workers: 1, fixedTime, results: [], passed: false };
  try {
    receipt.startup = await checkThemeStartup(browser, origin, destination);
    for (const theme of ['day', 'night']) for (const width of [1440, 390, 1024]) {
      const context = await browser.newContext({
        baseURL: origin, viewport: { width, height: width === 390 ? 844 : 900 }, deviceScaleFactor: 1,
        isMobile: width === 390, hasTouch: width === 390, serviceWorkers: 'block',
        reducedMotion: 'reduce', colorScheme: theme === 'night' ? 'dark' : 'light', locale: 'zh-CN', timezoneId: 'Asia/Shanghai',
      });
      await context.addInitScript((theme) => globalThis.localStorage.setItem('bitatlas.ui.theme', theme), theme);
      const page = await context.newPage();
      page.setDefaultTimeout(30_000);
      await page.clock.setFixedTime(new Date(fixedTime));
      const errors = [];
      page.on('pageerror', (error) => errors.push(error.message));
      await page.goto('/');
      await page.getByLabel('用户名', { exact: true }).fill(width === 390 ? 'member1' : 'member0');
      await page.getByLabel('密码', { exact: true }).fill(TEST_PASSWORD);
      await page.getByRole('button', { name: '登录', exact: true }).click();
      await page.getByRole('heading', { name: '今日学习', exact: true }).waitFor();
      for (const [name, url, ready] of routes.filter(([name]) => width !== 1024 || name === 'today')) {
        await page.goto(url);
        if (name === 'practice') await page.getByRole('button', { name: '开始第 1 题', exact: true }).click();
        await page.locator(ready).first().waitFor();
        await page.evaluate(() => globalThis.document.fonts.ready);
        if (name === 'knowledge') await page.waitForFunction(() => Array.from(globalThis.document.querySelectorAll('.knowledge-graph-canvas canvas')).some((canvas) => {
          const ctx = canvas.getContext('2d'); if (!ctx || !canvas.width || !canvas.height) return false;
          const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
          for (let i = 3; i < pixels.length; i += 16) if (pixels[i]) return true;
          return false;
        }));
        await page.mouse.move(-1, -1);
        for (const size of [18, 24]) {
          await page.getByLabel('正文字号', { exact: true }).selectOption(String(size));
          await page.waitForFunction((size) => globalThis.getComputedStyle(globalThis.document.documentElement).getPropertyValue('--reading-font-size').trim() === `${size}px`, size);
          await page.evaluate(() => {
            globalThis.document.activeElement?.blur();
            globalThis.document.scrollingElement.scrollTop = 0;
            const main = globalThis.document.querySelector('.main-area'); if (main) main.scrollTop = 0;
          });
          // Reading preference persistence triggers React/ResizeObserver updates.
          // Allow the existing 180ms graph centering animation and a paint to finish;
          // stableScreenshot still requires byte-identical consecutive captures.
          await page.waitForTimeout(350);
          const key = `${theme}-${width}-${name}-${size}px`;
          const screenshot = path.join(destination, `${key}.png`);
          let screenshotNoise = null;
          try { await stableScreenshot(page, screenshot); }
          catch (error) {
            // Stage 2 has no pixel-equivalence gate. Chrome's GPU can dither dark
            // gradients by one RGB unit between identical paints. Preserve both
            // samples and exact diff; never accept movement or a >1 channel delta.
            const last = screenshot.replace('.png', '-unstable-3.png');
            screenshotNoise = await compareImages(page, screenshot.replace('.png', '-unstable-2.png'), last, screenshot.replace('.png', '-paint-noise.png'));
            if (screenshotNoise.maximumChannelDelta > 1) throw error;
            await copyFile(last, screenshot, constants.COPYFILE_EXCL);
            await writeJson(screenshot.replace('.png', '-paint-noise.json'), screenshotNoise);
          }
          const state = await snapshot(page);
          const themed = await page.evaluate(() => {
            const { document, getComputedStyle } = globalThis;
            const main = document.querySelector('.main-area');
            const lab = document.querySelector('.page[class*="-lab-page"]');
            return { theme: document.documentElement.dataset.theme, meta: document.querySelector('meta[name=theme-color]').content,
              bone: getComputedStyle(document.documentElement).getPropertyValue('--bone').trim(),
              mainOverflow: main ? main.scrollWidth - main.clientWidth : 0,
              lab: lab ? { background: getComputedStyle(lab).backgroundColor, ink: getComputedStyle(lab).color,
                paper: getComputedStyle(lab).getPropertyValue('--paper').trim() } : null };
          });
          assert.equal(state.viewport.width, width);
          assert.match(state.viewportMeta ?? '', /width=device-width/);
          assert.equal(themed.theme, theme);
          await writeJson(path.join(destination, `${key}.json`), { ...state, ...themed }, true);
          let contrast;
          if (size === 18) {
            contrast = await auditText(page);
            for (const frame of contrast.backgrounds) await writeFile(path.join(destination, `${key}-background-${frame.scroll}.png`), frame.bytes);
            delete contrast.backgrounds;
            await writeJson(path.join(destination, `${key}-contrast.json`), contrast, true);
          }
          const result = { key, overflow: state.overflow, mainOverflow: themed.mainOverflow, lab: themed.lab,
            records: state.records.length, textChecked: contrast?.records.length ?? 0, screenshotNoise,
            contrastFailures: contrast?.records.filter((row) => !row.pass) ?? [] };
          receipt.results.push(result);
          await writeJson(path.join(destination, 'receipt.json'), receipt);
          console.log(JSON.stringify({ key, overflow: result.overflow, mainOverflow: result.mainOverflow,
            textChecked: result.textChecked, failures: result.contrastFailures.length }));
        }
      }
      receipt.errors = [...(receipt.errors || []), ...errors];
      await context.close();
    }
    receipt.passed = receipt.results.every((row) => row.overflow <= 0 && row.mainOverflow <= 0 && row.contrastFailures.length === 0) && receipt.errors.length === 0;
  } catch (error) {
    receipt.error = error.stack;
    throw error;
  } finally {
    await writeJson(path.join(destination, 'receipt.json'), receipt);
    await browser.close();
    await server.app.close();
  }
}
