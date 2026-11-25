import assert from 'node:assert/strict';
import path from 'node:path';
import { readFile, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';
import { assertBuild, fresh, json, local, openPage, readyRegister, shot } from './ui-integrated-browser.mjs';

const [label] = process.argv.slice(2);
const dest = await fresh(label);
const browser = await chromium.launch({ channel: 'chrome' });
const report = { build: await assertBuild(local, 'local'), chrome: browser.version(), history: [], checks: [], pageErrors: [] };
const save = () => json(path.join(dest, 'receipt.json'), report);
const learning = JSON.parse(await readFile('apps/web/public/content/learning.json', 'utf8'));
const packs = new Map();
for (const year of [2009, 2010]) {
  for (const q of JSON.parse(await readFile(`apps/web/public/content/${year}.json`, 'utf8')).questions) packs.set(q.id, q);
}
async function check(name, fn) {
  try {
    report.checks.push({ name, pass: true, detail: await fn() });
  } catch (e) { report.checks.push({ name, pass: false, error: e.stack }); }
  await save();
}
function watch(page) { page.on('pageerror', e => report.pageErrors.push({ url: page.url(), error: e.message })); }
async function respond(page, id, right) {
  const q = packs.get(id);
  const option = right ? q.answer.optionId : q.options.find(o => o.id !== q.answer.optionId).id;
  await page.goto(`/questions?question=${id}`);
  await page.getByRole('button', { name: `开始第 ${q.number} 题`, exact: true }).click();
  await page.locator(`.option-list button[aria-keyshortcuts="${option}"]`).click();
  await page.getByRole('button', { name: '提交答案', exact: true }).click();
  await page.locator('.answer-panel').waitFor();
  await page.getByRole('button', { name: '结束', exact: true }).click();
  await page.getByRole('heading', { name: '本轮总结', exact: true }).waitFor();
  report.history.push({ day: await page.evaluate(() => new Date().toISOString().slice(0, 10)), id, action: right ? 'correct-first-answer' : 'wrong-first-answer' });
  await save();
}
async function rate(page, concept) {
  await page.goto(`/review?concept=${concept}`);
  await page.getByRole('button', { name: '加练本组 1 张', exact: true }).click();
  await page.getByRole('button', { name: '查看解释', exact: true }).click();
  await page.getByRole('button', { name: '记得', exact: true }).click();
  await page.getByRole('heading', { name: '本轮复习总结', exact: true }).waitFor();
  report.history.push({ day: await page.evaluate(() => new Date().toISOString().slice(0, 10)), concept, action: 'card-rated-remembered' });
  await save();
}
async function geometry(page) {
  const groups = await page.locator('.register-cells').evaluateAll(groups => groups.map(group => {
    const rects = [...group.querySelectorAll('button.bit')].map(el => el.getBoundingClientRect());
    const horizontal = [], vertical = [];
    for (const [i, r] of rects.entries()) {
      if (i && r.y === rects[i - 1].y) horizontal.push(r.left - rects[i - 1].right);
      if (i && r.y !== rects[i - 1].y) vertical.push(r.top - rects[i - 1].bottom);
    }
    return { id: group.id, length: rects.length, minWidth: Math.min(...rects.map(r => r.width)), minHeight: Math.min(...rects.map(r => r.height)),
      minHorizontal: horizontal.length ? Math.min(...horizontal) : null, minVertical: vertical.length ? Math.min(...vertical) : null };
  }));
  assert.equal(groups.length, 4);
  assert.equal(groups.reduce((v, g) => v + g.length, 0), 102);
  for (const g of groups) {
    assert(g.minWidth >= 24 && g.minHeight >= 24, JSON.stringify(g));
    assert(g.minHorizontal >= 6 && (g.minVertical === null || g.minVertical >= 6), JSON.stringify(g));
  }
  return groups;
}
async function keyboard(page) {
  const groups = page.locator('.register-cells');
  const checks = [];
  for (const group of await groups.all()) {
    const bits = group.locator('button.bit');
    const count = await bits.count();
    const stop = group.locator('button.bit[tabindex="0"]');
    assert.equal(await stop.count(), 1);
    await stop.focus(); await page.keyboard.press('Shift+Tab'); await page.keyboard.press('Tab');
    for (const [key, index] of [['Home', 0], ['ArrowRight', 1], ['ArrowLeft', 0], ['End', count - 1], ['ArrowRight', count - 1], ['Home', 0], ['ArrowLeft', 0]]) {
      await page.keyboard.press(key);
      const state = await bits.nth(index).evaluate(el => {
        const style = globalThis.getComputedStyle(el);
        return { id: el.dataset.concept, focused: el === globalThis.document.activeElement, visible: el.matches(':focus-visible'),
          outline: style.outline, drawn: style.outlineStyle !== 'none' && parseFloat(style.outlineWidth) > 0, caption: globalThis.document.querySelector('.register-caption').textContent,
          accessible: el.getAttribute('aria-label'), tab: el.tabIndex };
      });
      assert(state.focused && state.visible && state.drawn && state.tab === 0, JSON.stringify(state));
      assert.equal(state.caption, state.accessible);
      assert.equal(await stop.count(), 1);
      checks.push({ group: await group.getAttribute('id'), key, ...state });
    }
    await page.keyboard.press('Tab');
    assert.equal(await group.evaluate(el => el.contains(globalThis.document.activeElement)), false);
  }
  return checks;
}
async function clickDetail(page, concept, subject) {
  const el = page.locator(`button[data-concept="${concept}"]`);
  const before = await el.getAttribute('class'), description = (await el.getAttribute('aria-label')).split(' · ');
  await el.click();
  await page.waitForURL(u => u.searchParams.get('node') === concept && u.searchParams.get('subject') === subject);
  // History changes at dispatch; the outgoing subject's detail can still exist
  // until the next React commit. Wait for the clicked concept's own heading.
  const immediate = await page.locator('.knowledge-detail-panel h2').textContent();
  await page.locator('.knowledge-detail-panel').getByRole('heading', { name: description[0], exact: true }).waitFor();
  await page.locator('.knowledge-detail-panel .concept-evidence').waitFor();
  const state = await page.locator('.concept-state').innerText();
  const detail = await page.locator('.concept-evidence').innerText();
  assert(state.includes(description[1]), JSON.stringify({ concept, state, description })); assert.equal(await el.getAttribute('class'), before);
  assert.equal(await page.locator('.knowledge-detail-panel h2').innerText(), description[0]);
  for (const section of ['已练题目', '记忆卡', '最近学习']) assert(detail.includes(section));
  return { url: page.url(), concept, state, detail, before, immediate, after: await el.getAttribute('class') };
}
async function icon(page, theme) {
  const button = page.locator('.topbar button[aria-label*="主题"]');
  await button.locator(`svg.lucide-${theme === 'day' ? 'moon' : 'sun'}`).waitFor();
  const opposite = theme === 'day' ? '夜班' : '白昼';
  assert.equal(await button.getAttribute('aria-label'), `切换到${opposite}主题`);
  assert.equal(await page.locator('html').getAttribute('data-theme'), theme);
  return theme;
}
async function statePixels(page, theme) {
  const patterns = [];
  const marked = await page.locator('button.bit.is-today').count();
  assert(marked > 0);
  for (const state of ['unstarted', 'practicing', 'consolidating', 'stable', 'today']) {
    const bit = page.locator(`button.bit.is-${state}`).first();
    const bytes = await bit.screenshot({ animations: 'disabled' });
    await writeFile(path.join(dest, `${theme}-${state}.png`), bytes);
    const p = await page.evaluate(async base64 => {
      const img = new globalThis.Image(); img.src = `data:image/png;base64,${base64}`; await img.decode();
      const canvas = globalThis.document.createElement('canvas'); canvas.width = img.width; canvas.height = img.height;
      const ctx = canvas.getContext('2d'); ctx.drawImage(img, 0, 0);
      const data = ctx.getImageData(0, 0, img.width, img.height).data;
      const color = (x, y) => [...data.slice((y * img.width + x) * 4, (y * img.width + x) * 4 + 3)];
      return { upper: color(6, 6), lower: color(6, img.height - 6), center: color(Math.floor(img.width / 2), Math.floor(img.height / 2)),
        upperRight: color(img.width - 4, 2), lowerLeft: color(2, img.height - 4) };
    }, bytes.toString('base64'));
    patterns.push({ state, concept: await bit.getAttribute('data-concept'), pixels: p });
  }
  const [u, p, c, s, t] = patterns.map(p => p.pixels);
  assert.deepEqual(u.upper, u.lower); assert.deepEqual(s.upper, s.lower);
  assert.notDeepEqual(u.upper, s.upper); assert.notDeepEqual(p.center, p.upper);
  assert.notDeepEqual(c.upper, c.lower); assert.deepEqual(c.lower, s.lower);
  const color = theme === 'day' ? [200, 56, 26] : await page.locator('html').evaluate(el => {
    const hex = globalThis.getComputedStyle(el).getPropertyValue('--signal').trim();
    return [1, 3, 5].map(start => parseInt(hex.slice(start, start + 2), 16));
  });
  assert.deepEqual(t.upperRight, color); assert.notDeepEqual(t.upperRight, t.lowerLeft);
  return { patterns, marked };
}
async function expectedMarkers(page) {
  const dbRows = await page.evaluate(() => new Promise((resolve, reject) => {
    const r = globalThis.indexedDB.open('408-user');
    r.onerror = () => reject(r.error);
    r.onsuccess = async () => {
      const db = r.result;
      try {
        const rows = await Promise.all(['dailyPlans', 'attempts', 'cardReviewEvents'].map(name => new Promise((done, fail) => {
          const req = db.transaction(name).objectStore(name).getAll(); req.onsuccess = () => done(req.result); req.onerror = () => fail(req.error);
        })));
        resolve({ plan: rows[0].find(p => p.date === '2026-11-24'), attempts: rows[1].length, events: rows[2].length });
      } catch (e) { reject(e); } finally { db.close(); }
    };
  }));
  assert.equal(dbRows.attempts, 6); assert.equal(dbRows.events, 3);
  const expected = new Set(dbRows.plan.items.flatMap(item => (item.kind === 'question'
    ? learning.mappings.find(m => m.questionId === item.targetId && m.questionContentVersion === item.contentVersion)
    : learning.cards.find(c => c.id === item.targetId && c.version === item.contentVersion))?.conceptIds ?? []));
  const visible = await page.locator('button.bit.is-today').evaluateAll(bits => bits.map(el => el.dataset.concept).sort());
  assert.deepEqual(visible, [...expected].sort());
  return { day: dbRows.plan.date, items: dbRows.plan.items.length, matched: visible, actualAttempts: dbRows.attempts, actualCardEvents: dbRows.events };
}
try {
  const page = await openPage(browser, 1440, 'day');
  watch(page);
  await page.clock.setFixedTime(new Date('2026-11-23T04:00:00Z'));
  await page.goto('/knowledge');
  await page.waitForFunction(() => globalThis.document.querySelector('.knowledge-status')?.textContent.includes('799 / 799'));
  for (const day of [23, 24]) {
    await page.clock.setFixedTime(new Date(`2026-11-${day}T04:00:00Z`));
    await respond(page, 'cn408-2009-q01', true); await respond(page, 'cn408-2010-q02', true);
    await rate(page, 'ds.foundations.queue');
  }
  await respond(page, 'cn408-2009-q02', true); await respond(page, 'cn408-2009-q03', false);
  await rate(page, 'ds.foundations.stack');
  await page.goto('/'); await page.locator('.subject-overview-list').waitFor();
  await check('four-subject overview, no percentages, two Beijing study days', async () => {
    const text = await page.locator('.subject-overview').innerText(), breakdown = await page.locator('.today-breakdown').innerText();
    assert(!/[%％]/.test(text)); assert.equal(await page.locator('.subject-overview-list li').count(), 4);
    assert.match(breakdown, /本周已学 2 天/); assert.match(breakdown, /涉及 [1-9]\d* 个概念/);
    return { text, breakdown };
  });
  await page.goto('/knowledge'); await readyRegister(page);
  await check('register has four independently derived states and no percentages', async () => {
    const states = Object.fromEntries(await Promise.all(['unstarted', 'practicing', 'consolidating', 'stable']
      .map(async s => [s, await page.locator(`button.bit.is-${s}`).count()])));
    assert(Object.values(states).every(n => n > 0));
    for (const [id, state] of [['ds.foundations.queue', 'stable'], ['ds.foundations.stack', 'consolidating'], ['ds.trees.traversal', 'practicing']]) {
      assert((await page.locator(`button[data-concept="${id}"]`).getAttribute('class')).includes(`is-${state}`));
    }
    assert(!/[%％]/.test(await page.locator('.register').innerText()));
    return states;
  });
  await check('today markers equal the saved plan mappings', () => expectedMarkers(page));
  await check('1440 measured cells and adjacent gaps', () => geometry(page));
  await check('1440 keyboard, one stop per subject, caption and visible focus', () => keyboard(page));
  await check('1440 detail and immutable clicked state', () => clickDetail(page, 'ds.foundations.queue', 'data-structures'));
  await check('cross-subject URL and detail', () => clickDetail(page, 'co.memory.cache', 'computer-organization'));
  for (const theme of ['day', 'night']) {
    if (theme === 'night') await page.locator('.topbar button[aria-label*="主题"]').click();
    await check(`${theme} icon and refresh persistence`, async () => {
      await icon(page, theme); await page.reload(); await readyRegister(page); await icon(page, theme);
      assert.equal(await page.evaluate(() => globalThis.localStorage.getItem('bitatlas.ui.theme')), theme);
      return theme;
    });
    await page.locator('.register').scrollIntoViewIfNeeded(); await page.mouse.move(-1, -1);
    await check(`${theme} four raster states and painted red corner`, () => statePixels(page, theme));
    await page.locator('.register').screenshot({ path: path.join(dest, `register-1440-${theme}-with-history.png`), animations: 'disabled' });
  }
  await check('external theme mutation updates icon before returning to day', async () => {
    await page.evaluate(() => { globalThis.document.documentElement.dataset.theme = 'day'; }); await icon(page, 'day');
    await page.evaluate(() => { globalThis.document.documentElement.dataset.theme = 'night'; }); await icon(page, 'night');
    await page.locator('.topbar button[aria-label*="主题"]').click(); await page.reload();
    await readyRegister(page); return icon(page, 'day');
  });
  await page.context().close();
  const phone = await openPage(browser, 390, 'day'); watch(phone); await phone.goto('/knowledge'); await readyRegister(phone);
  await check('390 four collapsed meters by default and first subject expands independently', async () => {
    assert.equal(await phone.locator('.register-row .register-meter:visible').count(), 4);
    assert.equal(await phone.locator('.register-toggle[aria-expanded=false]:visible').count(), 4);
    assert.equal(await phone.locator('button.bit:visible').count(), 0);
    await phone.locator('.register-toggle').first().click();
    assert.equal(await phone.locator('button.bit:visible').count(), 28);
    assert.equal(await phone.locator('.register-toggle[aria-expanded=true]').count(), 1);
    return { before: 0, after: 28, collapsed: 3 };
  });
  for (const toggle of await phone.locator('.register-toggle').all()) {
    if ((await toggle.getAttribute('aria-expanded')) === 'false') await toggle.click();
  }
  await check('390 measured cells and adjacent gaps after expanding', () => geometry(phone));
  await check('390 keyboard in all four expanded subjects', () => keyboard(phone));
  await check('390 click updates URL, detail and preserves state', () => clickDetail(phone, 'ds.foundations.stack', 'data-structures'));
  await check('390 day/night icon toggles and survives reload', async () => {
    await icon(phone, 'day'); await phone.locator('.topbar button[aria-label*="主题"]').click(); await icon(phone, 'night');
    await phone.reload(); await readyRegister(phone); return icon(phone, 'night');
  });
  await phone.context().close();
} catch (e) {
  report.error = e.stack;
  const live = browser.contexts().flatMap(c => c.pages()).at(-1);
  if (live) {
    report.lastUrl = live.url();
    report.lastText = (await live.locator('body').innerText().catch(() => '')).slice(0, 2000);
    await shot(live, dest, 'last-page').catch(() => undefined);
  }
} finally {
  report.passed = !report.error && !report.pageErrors.length && report.checks.every(c => c.pass);
  await save(); await browser.close();
  console.log(JSON.stringify({ steps: report.history.length, checks: report.checks.length, failures: report.checks.filter(c => !c.pass).map(c => c.name), error: report.error }));
  if (!report.passed) process.exitCode = 1;
}
