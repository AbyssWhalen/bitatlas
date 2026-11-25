// Local, deterministic browser evidence for the stage-1 CSS migration.
// Uses the installed Playwright library; installs no packages and never touches live data.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { constants } from 'node:fs';
import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { createApp } from '../../apps/server/src/app.ts';
import { TEST_PASSWORD } from './server-fixture.ts';
import { readEvidence } from './ui-style-evidence.mjs';
import { captureThemes } from './ui-theme-regression.mjs';

const root = process.cwd();
const evidence = path.resolve(root, 'output/playwright/opus-ui-2026-11-22/stage-1');
const [mode, label, buildArg, cssArg] = process.argv.slice(2);
const writeJson = (file, value) => writeFile(file, `${JSON.stringify(value, null, 2)}\n`);
const digest = (value) => createHash('sha256').update(value).digest('hex');
export const routes = [
  ['today', '/', '.task-list'],
  ['questions', '/questions?year=2009', '.question-row'],
  ['practice', '/questions?year=2009', '.practice-topbar'],
  ['review', '/review', '.memory-preview'],
  ['knowledge', '/knowledge', '.knowledge-graph-canvas canvas'],
  ['stats', '/stats', '.heatmap span'],
  ['settings', '/settings', '.backup-band'],
  ['more', '/more', '.more-grid'],
  ['data-structures', '/lab/data-structures', '.ds-lab-page'],
  ['operating-systems', '/lab/os-memory?module=memory', '.vm-lab-page'],
  ['network', '/lab/network?module=cidr', '.network-lab-page'],
  ['cpu', '/lab', '.radix-output-list'],
];

export async function stableScreenshot(page, file) {
  // Chromium can update scroll extents after its first beyond-viewport paint.
  // Require two identical PNGs; keep every unstable first sample as evidence.
  let previous;
  for (let attempt = 1; attempt <= 4; attempt++) {
    const current = await page.screenshot({ fullPage: true, animations: 'disabled', caret: 'hide' });
    if (previous?.equals(current)) { await writeFile(file, current); return; }
    if (previous) await writeFile(file.replace(/\.png$/, `-unstable-${attempt - 1}.png`), previous);
    previous = current;
    await page.evaluate(() => new Promise((resolve) => globalThis.requestAnimationFrame(() => globalThis.requestAnimationFrame(resolve))));
  }
  throw new Error(`Screenshot did not stabilize within 4 samples: ${file}`);
}

export async function snapshot(page) {
  return page.evaluate(() => {
    const { document, getComputedStyle, Node, innerWidth, innerHeight, devicePixelRatio } = globalThis;
    const properties = [
      'display', 'position', 'grid-template-columns', 'grid-template-rows', 'grid-area',
      'flex-direction', 'flex-wrap', 'gap', 'align-items', 'justify-content',
      'width', 'height', 'min-width', 'min-height', 'max-width', 'max-height',
      'padding', 'margin', 'box-sizing', 'overflow-x', 'overflow-y',
      'color', 'background-color', 'background-image', 'border', 'border-radius',
      'box-shadow', 'text-shadow', 'opacity', 'filter', 'transform',
      'font-family', 'font-size', 'font-weight', 'line-height', 'letter-spacing',
      'white-space', 'text-align', 'text-overflow', 'overflow-wrap', 'fill', 'stroke',
      'outline', 'outline-offset', 'visibility',
    ];
    function elementPath(el) {
      if (el === document.documentElement) return 'html';
      return `${elementPath(el.parentElement)}>${el.tagName.toLowerCase()}:nth-child(${Array.from(el.parentElement.children).indexOf(el) + 1})`;
    }
    const elements = Array.from(document.querySelectorAll('html, body, #root, .app-shell *, .account-sync-notice'));
    const records = [];
    const smallText = [];
    const smallTargets = [];
    for (const el of elements) {
      const box = el.getBoundingClientRect();
      if (!el.getClientRects().length) continue;
      const css = getComputedStyle(el);
      const key = elementPath(el);
      const record = {
        key, tag: el.tagName, class: el.getAttribute('class'), text: el.childElementCount === 0 ? el.textContent?.trim().slice(0, 100) : '',
        rect: { x: box.x, y: box.y, width: box.width, height: box.height },
        style: Object.fromEntries(properties.map((prop) => [prop, css.getPropertyValue(prop)])),
        pseudo: Object.fromEntries(['::before', '::after'].map((pseudo) => {
          const style = getComputedStyle(el, pseudo);
          return [pseudo, { content: style.content, ...Object.fromEntries(properties.map((prop) => [prop, style.getPropertyValue(prop)])) }];
        })),
      };
      records.push(record);
      if (Array.from(el.childNodes).some((node) => node.nodeType === Node.TEXT_NODE && node.textContent.trim()) && parseFloat(css.fontSize) < 13) {
        smallText.push({ key, tag: el.tagName, class: record.class, fontSize: css.fontSize, text: el.textContent?.trim().slice(0, 80) });
      }
      if (el.matches('button, a[href], input, select, textarea, summary') && (box.width < 24 || box.height < 24)) {
        smallTargets.push({ key, class: record.class, width: box.width, height: box.height, text: el.textContent?.trim().slice(0, 80) });
      }
    }
    return {
      viewport: { width: innerWidth, height: innerHeight, dpr: devicePixelRatio },
      viewportMeta: document.querySelector('meta[name=viewport]')?.content,
      overflow: document.documentElement.scrollWidth - innerWidth,
      title: document.querySelector('h1')?.textContent,
      mobileNavLinks: document.querySelectorAll('.mobile-nav a').length,
      formulaCount: document.querySelectorAll('.katex').length,
      formulaErrors: document.querySelectorAll('.katex-error').length,
      smallText, smallTargets, records,
    };
  });
}

async function capture() {
  assert.match(label, /^[a-z0-9-]+$/);
  const build = path.resolve(root, buildArg);
  assert(build.startsWith(evidence + path.sep));
  const destination = path.join(evidence, label);
  await mkdir(destination, { recursive: true });
  const baseline = path.join(root, 'output/request-sync-2026-11-22/browser-fixture');
  const database = path.join(destination, 'server.sqlite');
  // A reused label is rejected, preserving previous evidence and preventing accidental reuse of learning state.
  await copyFile(path.join(baseline, 'baseline.sqlite'), database, constants.COPYFILE_EXCL);
  const origin = 'http://127.0.0.1:4349';
  const server = createApp({ database, files: path.join(baseline, 'files'), origin, webRoot: build });
  await server.app.listen({ host: '127.0.0.1', port: 4349 });
  const browser = await chromium.launch({ channel: 'chrome' });
  const clockFile = path.join(evidence, 'clock.json');
  let fixedTime;
  try { ({ fixedTime } = JSON.parse(await readFile(clockFile, 'utf8'))); }
  catch { fixedTime = new Date().toISOString(); await writeJson(clockFile, { fixedTime }); }
  const receipt = {
    label, workers: 1, chrome: browser.version(), fixedTime, build,
    buildIndexSha256: digest(await readFile(path.join(build, 'index.html'))),
    cssOverride: cssArg ?? null, results: [], passed: false,
  };
  try {
    for (const width of [1440, 390]) {
      const context = await browser.newContext({
        baseURL: origin, viewport: { width, height: width === 390 ? 844 : 900 },
        deviceScaleFactor: 1, isMobile: width === 390, hasTouch: width === 390,
        serviceWorkers: 'block', reducedMotion: 'reduce', colorScheme: 'dark',
        locale: 'zh-CN', timezoneId: 'Asia/Shanghai',
      });
      const page = await context.newPage();
      page.setDefaultTimeout(30_000);
      const errors = [];
      page.on('pageerror', (error) => errors.push(error.message));
      await page.clock.setFixedTime(new Date(fixedTime));
      if (cssArg) {
        const css = await readFile(path.resolve(root, cssArg), 'utf8');
        await page.route('**/assets/index-*.css', (route) => route.fulfill({ contentType: 'text/css', body: css }));
      }
      await page.goto('/');
      await page.getByLabel('用户名', { exact: true }).fill(width === 1440 ? 'member0' : 'member1');
      await page.getByLabel('密码', { exact: true }).fill(TEST_PASSWORD);
      await page.getByRole('button', { name: '登录', exact: true }).click();
      await page.getByRole('heading', { name: '今日学习', exact: true }).waitFor();
      await page.getByRole('button', { name: /开始剩余 [1-9]/ }).waitFor();
      for (const [name, url, ready] of routes) {
        await page.goto(url);
        if (name === 'practice') {
          await page.getByRole('button', { name: '开始第 1 题', exact: true }).click();
        }
        await page.locator(ready).first().waitFor();
        await page.evaluate(() => globalThis.document.fonts.ready);
        if (name === 'knowledge') {
          // A visible canvas can still be blank while Cytoscape is painting,
          // especially during concurrent typecheck/build jobs.
          await page.waitForFunction(() => Array.from(globalThis.document.querySelectorAll('.knowledge-graph-canvas canvas')).some((canvas) => {
            const context = canvas.getContext('2d');
            if (!context || !canvas.width || !canvas.height) return false;
            const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
            for (let i = 3; i < pixels.length; i += 16) if (pixels[i]) return true;
            return false;
          }));
        }
        await page.waitForTimeout(350);
        await page.mouse.move(-1, -1);
        await page.evaluate(() => { globalThis.document.activeElement?.blur(); globalThis.scrollTo(0, 0); });
        await page.evaluate(() => new Promise((resolve) => globalThis.requestAnimationFrame(() => globalThis.requestAnimationFrame(resolve))));
        const key = `${width}-${name}`;
        await stableScreenshot(page, path.join(destination, `${key}.png`));
        const state = await snapshot(page);
        assert.equal(state.viewport.width, width);
        assert.match(state.viewportMeta ?? '', /width=device-width/);
        assert.equal(state.mobileNavLinks, 5);
        await writeJson(path.join(destination, `${key}.json`), state);
        receipt.results.push({ key, overflow: state.overflow, records: state.records.length, smallText: state.smallText.length, smallTargets: state.smallTargets.length });
        await writeJson(path.join(destination, 'receipt.json'), receipt);
        console.log(JSON.stringify(receipt.results.at(-1)));
        if (label.startsWith('after')) {
          // Verify the explicit night selector is visually identical in this dark-only stage.
          await page.evaluate(() => globalThis.document.documentElement.dataset.theme = 'night');
          await stableScreenshot(page, path.join(destination, `${key}-night.png`));
          await writeJson(path.join(destination, `${key}-night.json`), await snapshot(page));
          await page.evaluate(() => delete globalThis.document.documentElement.dataset.theme);
          await page.getByLabel('正文字号', { exact: true }).selectOption('24');
          await page.waitForFunction(() => globalThis.getComputedStyle(globalThis.document.documentElement).getPropertyValue('--reading-font-size').trim() === '24px');
          await page.waitForTimeout(100);
          await page.evaluate(() => { globalThis.document.activeElement?.blur(); globalThis.scrollTo(0, 0); });
          await stableScreenshot(page, path.join(destination, `${key}-24px.png`));
          await writeJson(path.join(destination, `${key}-24px.json`), await snapshot(page));
          await page.getByLabel('正文字号', { exact: true }).selectOption('18');
          await page.waitForFunction(() => globalThis.getComputedStyle(globalThis.document.documentElement).getPropertyValue('--reading-font-size').trim() === '18px');
        }
      }
      if (label.startsWith('after')) {
        const keyboard = [];
        async function activate(locator, key = 'Enter') {
          await locator.focus();
          // Use an actual keyboard event so :focus-visible and button activation
          // are exercised, without relying on pointer clicks in this workflow.
          await page.keyboard.press('Tab');
          await page.keyboard.press('Shift+Tab');
          const focus = await locator.evaluate((element) => {
            const style = globalThis.getComputedStyle(element);
            return { focused: element === globalThis.document.activeElement, visible: element.matches(':focus-visible'),
              outline: style.outline, boxShadow: style.boxShadow };
          });
          assert(focus.focused && focus.visible);
          assert(!focus.outline.startsWith('none') || focus.boxShadow !== 'none');
          keyboard.push(focus);
          await locator.press(key);
        }
        await page.goto('/questions?year=2009');
        await activate(page.getByRole('button', { name: '开始第 1 题', exact: true }));
        await page.locator('.practice-topbar').waitFor();
        await activate(page.locator('.option-list > button').first(), 'Space');
        await activate(page.getByRole('button', { name: '提交答案', exact: true }));
        await page.locator('.answer-status').waitFor();
        await activate(page.getByRole('button', { name: /原卷第/ }).first());
        await page.waitForFunction(() => Array.from(globalThis.document.querySelectorAll('.source-pages img')).some((image) => image.complete && image.naturalWidth > 0));
        await page.screenshot({ path: path.join(destination, `${width}-keyboard-source.png`), fullPage: true, animations: 'disabled' });
        await page.goto('/review?concept=ds.foundations.queue');
        await activate(page.getByRole('button', { name: /加练本组/ }).first());
        await activate(page.getByRole('button', { name: '查看解释', exact: true }));
        await activate(page.getByRole('button', { name: '记得', exact: true }));
        await page.getByRole('heading', { name: '本轮复习总结', exact: true }).waitFor();
        await writeJson(path.join(destination, `${width}-keyboard.json`), {
          passed: true, activations: keyboard.length, focusChecks: keyboard, sourceImageLoaded: true,
          practiceSubmitted: true, cardRecallRevealedAndRated: true,
        });
      }
      assert.deepEqual(errors, []);
      await context.close();
    }
    receipt.passed = true;
  } catch (error) {
    receipt.error = error.stack;
    throw error;
  } finally {
    await writeJson(path.join(destination, 'receipt.json'), receipt);
    await browser.close();
    await server.app.close();
  }
}

export async function compareImages(page, left, right, diffPath) {
  const [a, b] = await Promise.all([readFile(left), readFile(right)]);
  const result = await page.evaluate(async ([a, b]) => {
    const { document, Image, ImageData } = globalThis;
    async function image(data) {
      const img = new Image();
      img.src = `data:image/png;base64,${data}`;
      await img.decode();
      return img;
    }
    const [left, right] = await Promise.all([image(a), image(b)]);
    const width = Math.max(left.width, right.width), height = Math.max(left.height, right.height);
    function pixels(img) {
      const canvas = document.createElement('canvas');
      canvas.width = width; canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);
      return ctx.getImageData(0, 0, width, height);
    }
    const before = pixels(left), after = pixels(right), diff = new ImageData(width, height);
    let changedPixels = 0, aboveOnePixels = 0, maximumChannelDelta = 0;
    let minX = width, minY = height, maxX = -1, maxY = -1;
    for (let i = 0; i < before.data.length; i += 4) {
      let changed = false, aboveOne = false;
      for (let channel = 0; channel < 4; channel++) {
        const delta = Math.abs(before.data[i + channel] - after.data[i + channel]);
        if (delta) changed = true;
        if (delta > 1) aboveOne = true;
        maximumChannelDelta = Math.max(maximumChannelDelta, delta);
      }
      if (aboveOne) {
        aboveOnePixels++;
        const x = (i / 4) % width, y = Math.floor(i / 4 / width);
        minX = Math.min(minX, x); minY = Math.min(minY, y); maxX = Math.max(maxX, x); maxY = Math.max(maxY, y);
      }
      if (changed) { changedPixels++; diff.data[i] = 255; diff.data[i + 2] = 70; diff.data[i + 3] = 255; }
      else { diff.data[i] = after.data[i] / 4; diff.data[i + 1] = after.data[i + 1] / 4; diff.data[i + 2] = after.data[i + 2] / 4; diff.data[i + 3] = 255; }
    }
    const canvas = document.createElement('canvas');
    canvas.width = width; canvas.height = height;
    canvas.getContext('2d').putImageData(diff, 0, 0);
    return { before: [left.width, left.height], after: [right.width, right.height], changedPixels,
      totalPixels: width * height, changedPercent: 100 * changedPixels / (width * height), maximumChannelDelta,
      aboveOnePixels, aboveOneBounds: aboveOnePixels ? { minX, minY, maxX, maxY } : null,
      diff: canvas.toDataURL('image/png').split(',')[1] };
  }, [a.toString('base64'), b.toString('base64')]);
  await writeFile(diffPath, Buffer.from(result.diff, 'base64'));
  delete result.diff;
  return result;
}

function compareStyles(before, after) {
  const changes = [];
  const original = new Map(before.records.map((record) => [record.key, record]));
  for (const record of after.records) {
    const previous = original.get(record.key);
    if (!previous) { changes.push({ key: record.key, kind: 'added', class: record.class }); continue; }
    original.delete(record.key);
    for (const field of ['rect', 'style', 'pseudo']) {
      for (const [property, value] of Object.entries(record[field])) {
        if (JSON.stringify(previous[field][property]) !== JSON.stringify(value)) {
          changes.push({ key: record.key, class: record.class, field, property, before: previous[field][property], after: value });
        }
      }
    }
  }
  for (const record of original.values()) changes.push({ key: record.key, kind: 'removed', class: record.class });
  return changes;
}

async function compare() {
  const [beforeLabel, afterLabel] = [label, buildArg];
  const destination = path.join(evidence, `compare-${beforeLabel}-${afterLabel}`);
  await mkdir(destination, { recursive: true });
  const browser = await chromium.launch({ channel: 'chrome' });
  const page = await browser.newPage();
  const results = [];
  try {
    for (const width of [1440, 390]) for (const [name] of routes) {
      const key = `${width}-${name}`;
      const [before, after] = await Promise.all([beforeLabel, afterLabel].map((label) =>
        readEvidence(path.join(evidence, label, `${key}.json`))));
      const styles = compareStyles(before, after);
      await writeJson(path.join(destination, `${key}-styles.json`), styles);
      const pixels = await compareImages(page, path.join(evidence, beforeLabel, `${key}.png`),
        path.join(evidence, afterLabel, `${key}.png`), path.join(destination, `${key}-diff.png`));
      const result = { key, pixels, computedStyleChanges: styles.length, overflowBefore: before.overflow, overflowAfter: after.overflow };
      if (afterLabel.startsWith('after')) {
        result.nightPixels = await compareImages(page, path.join(evidence, afterLabel, `${key}.png`),
          path.join(evidence, afterLabel, `${key}-night.png`), path.join(destination, `${key}-night-diff.png`));
        result.overflow24px = (await readEvidence(path.join(evidence, afterLabel, `${key}-24px.json`))).overflow;
      }
      results.push(result);
      console.log(JSON.stringify(result));
    }
  } finally {
    await writeJson(path.join(destination, 'summary.json'), {
      before: beforeLabel, after: afterLabel, cases: results.length,
      pixelIdentical: results.filter((result) => result.pixels.changedPixels === 0).length,
      styleIdentical: results.filter((result) => result.computedStyleChanges === 0).length, results,
    });
    await browser.close();
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  assert(['capture', 'compare', 'themes'].includes(mode), 'Usage: node --import tsx tools/verification/ui-style-regression.mjs capture LABEL BUILD [CSS] | compare BEFORE AFTER | themes LABEL BUILD');
  if (mode === 'capture') await capture();
  else if (mode === 'compare') await compare();
  else await captureThemes(label, buildArg);
}
