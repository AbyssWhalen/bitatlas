// Loopback-only acceptance of the server build, using disposable accounts.
// Reuse one immutable fixture's assets, but give every run a fresh database.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { constants } from 'node:fs';
import { access, copyFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { chromium, expect } from '@playwright/test';
import { createApp } from '../../apps/server/src/app.ts';
import { seedServer, TEST_PASSWORD } from './server-fixture.ts';

const root = process.cwd();
const phase = path.resolve(root, 'output/request-sync-2026-11-22');
const build = path.join(root, 'apps', 'web', 'dist-server');
const output = path.resolve(root, process.argv[2] ?? `output/playwright/request-sync-2026-11-22/${Date.now()}`);
assert(output.startsWith(path.join(root, 'output') + path.sep), 'Evidence must stay inside project output');
await mkdir(output, { recursive: true });
const serving = process.argv.includes('--serve');
const port = serving ? 4323 : 4337;
const origin = `http://127.0.0.1:${port}`;
const learning = JSON.parse(await readFile(path.join(root, 'apps', 'web', 'public', 'content', 'learning.json'), 'utf8'));
const fixture = path.join(phase, 'browser-fixture', learning.sha256);
const baseline = path.join(fixture, 'baseline.sqlite');
try { await access(baseline); }
catch {
  const initial = await seedServer(fixture, port, build);
  try { await initial.db.backup(baseline); }
  finally { await initial.app.close(); }
}
const database = path.join(output, 'server.sqlite');
await copyFile(baseline, database, constants.COPYFILE_EXCL);
const server = createApp({ database, files: path.join(fixture, 'files'), origin, webRoot: build });
await server.app.listen({ host: '127.0.0.1', port });

async function rows(page, database, table) {
  return page.evaluate(({ database, table }) => new Promise((resolve, reject) => {
    const open = globalThis.indexedDB.open(database);
    open.onerror = () => reject(open.error);
    open.onsuccess = () => {
      const db = open.result;
      if (!db.objectStoreNames.contains(table)) { db.close(); reject(new Error(`Missing table: ${table}`)); return; }
      const read = db.transaction(table).objectStore(table).getAll();
      read.onsuccess = () => { resolve(read.result); db.close(); };
      read.onerror = () => { reject(read.error); db.close(); };
    };
  }), { database, table });
}
const userRows = (page, id, table) => rows(page, `408-user:${id}`, table);
const accountId = (username) => server.db.prepare('SELECT id FROM accounts WHERE username=?').get(username).id;
async function submitLogin(page, username) {
  await page.getByLabel('用户名', { exact: true }).fill(username);
  await page.getByLabel('密码', { exact: true }).fill(TEST_PASSWORD);
  await page.getByRole('button', { name: '登录', exact: true }).click();
  await expect(page.getByRole('button', { name: '登录', exact: true })).toHaveCount(0);
}
async function ready(page) {
  await expect(page.getByRole('heading', { name: '今日学习', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: /开始剩余 [1-9]/ })).toBeEnabled({ timeout: 30_000 });
}
async function navigate(page, href) {
  if (!await page.locator(`a[href="${href}"]:visible`).first().isVisible()) {
    const menu = page.getByRole('button', { name: '更多', exact: true });
    if (await menu.isVisible()) await menu.click();
    else await page.locator('a[href="/more"]:visible').first().click();
  }
  await page.locator(`a[href="${href}"]:visible`).first().click();
  await expect(page).toHaveURL(new RegExp(`${href === '/' ? '/$' : `${href}$`}`));
}
const syncButton = (page) => page.getByRole('button', { name: '同步并查看状态', exact: true });
const accountPanel = (page) => page.locator('section').filter({ has: page.getByRole('heading', { name: '账号与同步', exact: true }) });
async function synced(page) {
  await syncButton(page).click();
  await expect(accountPanel(page).getByRole('status')).toContainText('待同步 0 条');
  await expect(syncButton(page)).toBeEnabled();
}
async function pauseClock(page) {
  await page.clock.pauseAt(await page.evaluate(() => Date.now() + 1000));
}

async function verify() {
  const receipt = {
    startedAt: new Date().toISOString(), origin, workers: 1,
    buildIndexSha256: createHash('sha256').update(await readFile(path.join(build, 'index.html'))).digest('hex'),
    results: [], passed: false,
  };
  const browser = await chromium.launch({ channel: 'chrome' });
  const record = async (name, width, details = {}) => {
    const result = { name, width, ...details };
    receipt.results.push(result);
    await writeFile(path.join(output, 'receipt.json'), JSON.stringify(receipt, null, 2));
    console.log(JSON.stringify(result));
  };
  try {
    for (const width of [1440, 390]) {
      const context = await browser.newContext({ baseURL: origin, viewport: { width, height: width === 390 ? 844 : 900 },
        isMobile: width === 390, hasTouch: width === 390, serviceWorkers: 'allow' });
      try {
        const page = await context.newPage();
        page.setDefaultTimeout(15_000);
        await page.clock.install();
        const errors = [];
        page.on('pageerror', (error) => errors.push(error.message));
        const requests = [];
        page.on('request', (request) => requests.push(new URL(request.url()).pathname));
        const username = width === 1440 ? 'member0' : 'member1';
        const id = accountId(username);
        await page.goto('/');
        await submitLogin(page, username);
        await ready(page);
        const plan = await userRows(page, id, 'dailyPlans');
        assert.equal(plan.length, 1);
        assert.equal(requests.filter((url) => url === '/api/v1/content/bitatlas-learning').length, 1);
        assert.equal((await rows(page, `408-content:${id}`, 'questions')).length, 799);
        const cardCount = (await rows(page, `408-content:${id}`, 'learningPacks'))[0].cards.length;
        assert.equal(cardCount, 156);
        await record('cold-login-and-content', width, { questions: 799, cards: cardCount, learningBodyRequests: 1 });

        requests.length = 0;
        await page.reload();
        await ready(page);
        const bodyRequests = requests.filter((url) => url.startsWith('/api/v1/content/'));
        assert.deepEqual(bodyRequests, []);
        assert.deepEqual(await userRows(page, id, 'dailyPlans'), plan);
        await record('unchanged-catalog-reuses-content', width, {
          contentBodyRequests: bodyRequests.length,
          catalogRequests: requests.filter((url) => url === '/api/v1/content').length,
          dailyPlanUnchanged: true,
        });
        await page.screenshot({ path: path.join(output, `cached-today-${width}.png`), fullPage: true });

        await navigate(page, '/review', width);
        await page.getByRole('button', { name: /加练本组/ }).click();
        await expect(page).toHaveURL(/\/review\/cards\/[^/]+$/);
        await page.getByRole('button', { name: '查看解释', exact: true }).click();
        await page.getByRole('button', { name: '记得', exact: true }).click();
        await expect(page.getByText(/完成 1 \/ 10 张/)).toBeVisible();
        await expect.poll(async () => (await userRows(page, id, 'cardReviewEvents')).length).toBe(1);
        await page.waitForFunction(() => globalThis.navigator.serviceWorker.controller?.state === 'activated');
        const cardPath = new URL(page.url()).pathname;
        await context.setOffline(true);
        await page.reload();
        await expect(page.locator('.flashcard')).toBeVisible({ timeout: 30_000 });
        await expect(page.getByText(/完成 1 \/ 10 张/)).toBeVisible();
        assert.equal((await userRows(page, id, 'cardReviewEvents')).length, 1);
        await page.screenshot({ path: path.join(output, `offline-cards-${width}.png`), fullPage: true });
        assert((await page.evaluate(() => globalThis.document.documentElement.scrollWidth - globalThis.innerWidth)) <= 1);
        await context.setOffline(false);
        await record('offline-reopen-preserves-card-rating', width, { cardPath, ratingEvents: 1, overflow: 0 });

        await navigate(page, '/settings', width);
        await synced(page);
        await pauseClock(page);
        let dropping = true;
        let dropped;
        const pushes = [];
        await context.route('**/api/v1/sync/push', async (route) => {
          const mutation = route.request().postDataJSON();
          pushes.push(mutation.operationId);
          if (dropping) {
            const response = await route.fetch();
            assert.equal(response.status(), 200);
            dropped = { route, operationId: mutation.operationId };
          } else await route.continue();
        });
        await navigate(page, '/questions', width);
        await page.getByRole('button', { name: '2009', exact: true }).click();
        await expect(page.locator('.result-summary strong')).toHaveText('47');
        await page.getByRole('button', { name: '开始第 1 题', exact: true }).click();
        await expect(page).toHaveURL(/\/practice\/[^/]+$/);
        const note = `deadline-${width}-original-text`;
        await page.getByPlaceholder('记录易错点').fill(note);
        await page.getByRole('heading', { name: '笔记', exact: true }).click();
        await expect.poll(async () => (await userRows(page, id, 'notes')).some((row) => row.body === note)).toBe(true);
        await navigate(page, '/settings', width);
        const before = (await userRows(page, id, 'outbox')).map((row) => row.operationId).sort();
        assert(before.length > 0);
        await syncButton(page).click();
        await expect.poll(() => dropped?.operationId).toBeTruthy();
        await expect(syncButton(page)).toBeDisabled();
        await page.clock.fastForward(30_001);
        await expect(accountPanel(page).getByRole('status')).toContainText('请求超时');
        await expect(syncButton(page)).toBeEnabled();
        assert.deepEqual((await userRows(page, id, 'outbox')).map((row) => row.operationId).sort(), before);
        assert((await userRows(page, id, 'notes')).some((row) => row.body === note));
        dropping = false;
        await dropped.route.abort();
        await synced(page);
        assert.equal((await userRows(page, id, 'outbox')).length, 0);
        assert.equal(pushes.filter((operationId) => operationId === dropped.operationId).length, 2);
        assert.equal(server.db.prepare('SELECT COUNT(*) AS n FROM operations WHERE account_id=? AND operation_id=?')
          .get(id, dropped.operationId).n, 1);
        const serverNotes = server.db.prepare("SELECT payload FROM entities WHERE account_id=? AND kind='notes' AND deleted=0").all(id);
        assert.equal(serverNotes.filter((row) => JSON.parse(row.payload).body === note).length, 1);
        await record('lost-acknowledgment-timeout-and-idempotent-retry', width, {
          deadlineMilliseconds: 30_000, clock: 'Playwright virtual time',
          retainedOperations: before.length, repeatedRequestCount: 2, serverOperationCount: 1, notePreserved: true,
        });

        let gateway = true;
        await context.route('**/api/v1/sync/pull*', async (route) => {
          if (gateway) await route.fulfill({ status: 502, contentType: 'text/html', body: '<html>private upstream diagnostic</html>' });
          else await route.continue();
        });
        await syncButton(page).click();
        await expect(accountPanel(page).getByRole('status')).toContainText('HTTP 502');
        await expect(accountPanel(page).getByRole('status')).not.toContainText(/SyntaxError|upstream|JSON/);
        await expect(syncButton(page)).toBeEnabled();
        await expect(page.getByRole('button', { name: '登录', exact: true })).toHaveCount(0);
        gateway = false;
        await synced(page);
        await record('html-gateway-error-and-recovery', width, { status: 502, retrySucceeded: true });
        assert.deepEqual(errors, []);
      } finally { await context.close(); }

      for (const sameAccount of [false, true]) {
        const context = await browser.newContext({ baseURL: origin, viewport: { width, height: 900 }, serviceWorkers: 'allow' });
        try {
          const page = await context.newPage();
          page.setDefaultTimeout(15_000);
          await page.clock.install();
          const index = sameAccount ? (width === 1440 ? 6 : 7) : (width === 1440 ? 2 : 4);
          const oldUsername = `member${index}`;
          const newUsername = sameAccount ? oldUsername : `member${index + 1}`;
          const oldId = accountId(oldUsername), newId = accountId(newUsername);
          let oldLearning, oldFiles, oldPull;
          let interceptLearning = true, interceptFiles = true, interceptPull = true;
          await context.route('**/api/v1/content/bitatlas-learning', async (route) => {
            if (interceptLearning) { interceptLearning = false; oldLearning = { route, response: await route.fetch() }; }
            else await route.continue();
          });
          await context.route('**/api/v1/files', async (route) => {
            if (interceptFiles) { interceptFiles = false; oldFiles = route; }
            else await route.continue();
          });
          await context.route('**/api/v1/sync/pull*', async (route) => {
            if (interceptPull) { interceptPull = false; oldPull = route; }
            else await route.continue();
          });
          const aborted = [];
          page.on('requestfailed', (request) => {
            if (request.url().includes('/sync/pull')) aborted.push(request.failure()?.errorText);
          });
          await page.goto('/');
          await submitLogin(page, oldUsername);
          await expect.poll(() => Boolean(oldLearning && oldPull)).toBe(true);
          await pauseClock(page);
          await navigate(page, '/documents', width);
          await expect.poll(() => Boolean(oldFiles)).toBe(true);
          await navigate(page, '/settings', width);
          await page.getByRole('button', { name: '退出并锁定本地记录', exact: true }).click();
          await expect(page.getByRole('button', { name: '登录', exact: true })).toBeVisible();
          await submitLogin(page, newUsername);
          await expect(accountPanel(page)).toContainText(newUsername);
          await navigate(page, '/', width);
          await ready(page);
          const installed = await rows(page, `408-content:${newId}`, 'learningPacks');
          assert.equal(installed.length, 1);
          await oldLearning.route.fulfill({ response: oldLearning.response });
          await oldFiles.fulfill({ status: 401, contentType: 'text/html', body: '' });
          await oldPull.fulfill({ status: 401, contentType: 'text/html', body: '' });
          await expect.poll(() => aborted.length).toBeGreaterThan(0);
          await navigate(page, '/settings', width);
          await synced(page);
          await expect(accountPanel(page)).toContainText(newUsername);
          assert.deepEqual(await rows(page, `408-content:${newId}`, 'learningPacks'), installed);
          if (!sameAccount) assert.deepEqual(await rows(page, `408-content:${oldId}`, 'learningPacks'), []);
          // A genuine 401 from the active login must still revoke local access.
          await context.route('**/api/v1/sync/pull*', (route) => route.fulfill({ status: 401, body: '' }));
          await syncButton(page).click();
          await expect(page.getByRole('button', { name: '登录', exact: true })).toBeVisible();
          await record(sameAccount ? 'same-account-new-login-boundaries' : 'switched-account-boundaries', width, {
            cancelledOldSync: true, delayed401DidNotLockNewLogin: true,
            lateLearningDidNotInstall: true, current401Locked: true,
          });
        } finally { await context.close(); }
      }
    }
    receipt.passed = true;
  } catch (error) {
    receipt.error = String(error?.stack ?? error);
    throw error;
  } finally {
    receipt.finishedAt = new Date().toISOString();
    await writeFile(path.join(output, 'receipt.json'), JSON.stringify(receipt, null, 2));
    await browser.close();
    await server.app.close();
    console.log(JSON.stringify({ passed: receipt.passed, checks: receipt.results.length, output }));
  }
}

if (serving) {
  console.log(`Disposable server acceptance fixture ready at ${origin}`);
  for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, () => { void server.app.close(); });
} else {
  await verify();
}
