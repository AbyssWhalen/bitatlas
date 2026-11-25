import { test, expect, type Page } from '@playwright/test';
import { TEST_PASSWORD } from '../../tools/verification/server-fixture';
import { readFile } from 'node:fs/promises';

async function login(page: Page, username: string) {
  await page.goto('/');
  await page.getByLabel('用户名', { exact: true }).fill(username);
  await page.getByLabel('密码', { exact: true }).fill(TEST_PASSWORD);
  await page.getByRole('button', { name: '登录', exact: true }).click();
  await expect(page.getByRole('heading', { name: '今日学习', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: /开始剩余 [1-9]/ })).toBeEnabled({ timeout: 30_000 });
}
async function waitForOfflineShell(page: Page) {
  // The authenticated app registers its worker after login. Its install can
  // still be fetching the last precached chunk while the reader is usable.
  await page.waitForFunction(() => navigator.serviceWorker.controller?.state === 'activated');
}
async function accountRows(page: Page, table: string) {
  const { account } = await (await page.request.get('/api/v1/auth/me')).json();
  return page.evaluate(({ accountId, table }) => new Promise<Array<Record<string, unknown>>>((resolve, reject) => {
    const open = indexedDB.open(`408-user:${accountId}`);
    open.onerror = () => reject(open.error);
    open.onsuccess = () => {
      const database = open.result;
      const request = database.transaction(table).objectStore(table).getAll();
      request.onsuccess = () => { resolve(request.result); database.close(); };
      request.onerror = () => { reject(request.error); database.close(); };
    };
  }), { accountId: account.id as string, table });
}
async function startNote(page: Page) {
  await page.goto('/questions?question=cn408-2009-q01');
  await page.getByRole('button', { name: '开始第 1 题', exact: true }).click();
  await expect(page.getByPlaceholder('记录易错点')).toBeVisible();
}
async function saveNote(page: Page, text: string) {
  await page.getByPlaceholder('记录易错点').fill(text);
  await page.getByRole('heading', { name: '笔记', exact: true }).click();
  await expect.poll(async () => (await accountRows(page, 'notes')).some((row) => row.body === text)).toBe(true);
}
async function syncStatus(page: Page) {
  await page.goto('/settings');
  await page.getByRole('button', { name: '同步并查看状态' }).click();
  await expect(page.getByText(/待同步 0 条/)).toBeVisible();
}
async function expectRenderedPdf(page: Page) {
  const canvas = page.locator('.pdf-page-canvas canvas');
  await expect(canvas).toBeVisible({ timeout: 30_000 });
  await expect(page.locator('.pdf-canvas-status')).toHaveCount(0, { timeout: 30_000 });
  const nonwhitePixels = await canvas.evaluate((node) => {
    const element = node as HTMLCanvasElement;
    const pixels = element.getContext('2d')!.getImageData(0, 0, element.width, element.height).data;
    let count = 0;
    for (let offset = 0; offset < pixels.length; offset += 4) {
      if (pixels[offset + 3]! > 0 && Math.min(pixels[offset]!, pixels[offset + 1]!, pixels[offset + 2]!) < 180) count++;
    }
    return count;
  });
  expect(nonwhitePixels).toBeGreaterThan(100);
}
test('invited account learns, syncs, reads a concept article and continues offline', async ({ page, context }, testInfo) => {
  const account = testInfo.project.name === 'server-mobile' ? 'member1' : 'member0';
  await login(page, account);
  await expect.poll(() => page.locator('.brand-mark img').evaluate((image) => (image as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
  for (const icon of ['/favicon.svg', '/pwa-192.png', '/pwa-512.png']) {
    expect((await page.request.get(icon)).status()).toBe(200);
  }
  await page.getByRole('button', { name: /开始剩余 [1-9]/ }).click();
  await expect(page.locator('.question-body')).toBeVisible();
  await page.locator('.option-list button').first().click();
  await page.getByRole('button', { name: /提交答案/ }).click();
  await expect(page.locator('.answer-panel')).toBeVisible();
  await page.getByRole('button', { name: '结束', exact: true }).click();
  await expect(page.getByRole('heading', { name: /本轮/ })).toBeVisible();
  await page.goto('/knowledge?subject=computer-organization&node=co.memory.cache');
  await expect(page.getByRole('heading', { name: /短讲解/ })).toBeVisible();
  await expect(page.getByText('跟着算一遍', { exact: true })).toBeVisible();
  await page.goto('/settings');
  await page.getByRole('button', { name: '同步并查看状态' }).click();
  await expect(page.getByText(/待同步 0 条/)).toBeVisible();
  await page.goto('/questions');
  await expect(page.locator('.result-summary strong')).toHaveText('799');
  await page.getByRole('button', { name: '2025', exact: true }).click();
  await expect(page.locator('.result-summary strong')).toHaveText('47');
  await page.getByRole('button', { name: '开始第 1 题', exact: true }).click();
  await page.locator('.option-list button').first().click();
  await page.getByRole('button', { name: /提交答案/ }).click();
  await expect(page.getByText(/本题文字解析缺失/)).toBeVisible();
  await page.goto('/review');
  await expect(page.getByRole('heading', { name: '复习中心' })).toBeVisible();
  await page.getByRole('button', { name: /加练本组/ }).click();
  await expect(page.getByRole('button', { name: /显示|查看.*解释|翻/ })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('review.png'), fullPage: true });
  await waitForOfflineShell(page);
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole('heading', { name: /登录/ })).toHaveCount(0);
  await expect(page.locator('.flashcard')).toBeVisible({ timeout: 30_000 });
  await context.setOffline(false);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});
test('isolates accounts and round-trips the complete v5 backup', async ({ page }, info) => {
  const index = info.project.name === 'server-mobile' ? 6 : 4;
  await login(page, `member${index}`);
  await startNote(page);
  await saveNote(page, '这个笔记只属于第一个账号');
  await syncStatus(page);
  const downloading = page.waitForEvent('download');
  await page.getByRole('button', { name: '导出备份', exact: true }).click();
  const download = await downloading;
  const bytes = await readFile((await download.path())!);
  expect(JSON.parse(bytes.toString()).schemaVersion).toBe(5);
  page.once('dialog', (dialog) => dialog.accept());
  await page.locator('.backup-band input[type="file"]').last().setInputFiles({ name: 'v5.json', mimeType: 'application/json', buffer: bytes });
  await expect(page.getByText('备份已恢复', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: '退出并锁定本地记录' }).click();
  await login(page, `member${index + 1}`);
  await expect.poll(async () => (await accountRows(page, 'notes')).length).toBe(0);
  await page.goto('/settings');
  await page.locator('.backup-band input[type="file"]').last().setInputFiles({ name: 'other-account.json', mimeType: 'application/json', buffer: bytes });
  await expect(page.getByText(/此 v5 备份属于另一个账号/)).toBeVisible();
  await page.getByRole('button', { name: '退出并锁定本地记录' }).click();
  await login(page, `member${index}`);
  expect((await accountRows(page, 'notes')).some((row) => row.body === '这个笔记只属于第一个账号')).toBe(true);
});
test('preserves both devices note edits and saves an explicit merged version', async ({ page, browser }, info) => {
  const username = info.project.name === 'server-mobile' ? 'member9' : 'member8';
  await login(page, username); await startNote(page);
  await saveNote(page, '共同原文'); await syncStatus(page);
  const second = await browser.newContext({ baseURL: 'http://127.0.0.1:4323', viewport: { width: 390, height: 844 } });
  try {
    const other = await second.newPage();
    await login(other, username); await syncStatus(other); await startNote(other);
    await expect(other.getByPlaceholder('记录易错点')).toHaveValue('共同原文');
    await second.setOffline(true);
    await other.getByPlaceholder('记录易错点').fill('设备二离线原文');
    await other.getByRole('heading', { name: '笔记', exact: true }).click();
    await expect.poll(() => other.evaluate(async () => {
      const names = (await indexedDB.databases()).flatMap((db) => db.name?.startsWith('408-user:') ? [db.name] : []);
      return new Promise<boolean>((resolve) => { const request = indexedDB.open(names[0]!); request.onsuccess = () => {
        const db = request.result; const read = db.transaction('notes').objectStore('notes').getAll();
        read.onsuccess = () => { resolve(read.result.some((note) => note.body === '设备二离线原文')); db.close(); };
      }; });
    })).toBe(true);
    await startNote(page); await saveNote(page, '设备一联网原文'); await syncStatus(page);
    await second.setOffline(false);
    await syncStatus(other);
    const editor = other.locator('details').filter({ has: other.locator('summary', { hasText: '并发修改：notes' }) });
    await editor.locator('summary').click();
    await expect(editor).toContainText('设备二离线原文');
    await expect(editor).toContainText('设备一联网原文');
    await editor.getByLabel('合并后的正文').fill('合并：设备一联网原文 + 设备二离线原文');
    await editor.getByRole('button', { name: '保存合并稿' }).click();
    await expect(editor.getByText(/已保存处理结果/)).toBeVisible();
    await syncStatus(page);
    expect((await accountRows(page, 'notes'))[0]?.body).toBe('合并：设备一联网原文 + 设备二离线原文');
  } finally { await second.close(); }
});
test('requires explicit assignment before migrating anonymous records', async ({ page }, info) => {
  await page.goto('/');
  await page.evaluate(() => new Promise<void>((resolve, reject) => {
    const open = indexedDB.open('408-user', 40);
    open.onupgradeneeded = () => {
      const db = open.result;
      for (const name of ['attempts', 'sessions', 'progresses', 'versionedProgresses', 'notes', 'collections', 'settings', 'changeLog',
        'mockExams', 'dailyPlans', 'reviewSessions', 'cardReviewEvents', 'personalCards', 'practiceEvidence', 'practiceContexts', 'noteConflicts']) {
        db.createObjectStore(name, { keyPath: name === 'settings' ? 'key' : name === 'practiceContexts' ? 'sessionId' : name === 'collections' || name === 'progresses' ? 'questionId' : name === 'versionedProgresses' ? ['questionId', 'questionContentVersion'] : 'id' });
      }
    };
    open.onerror = () => reject(open.error);
    open.onsuccess = () => {
      const db = open.result; const tx = db.transaction('notes', 'readwrite');
      tx.objectStore('notes').put({ id: 'legacy-note', questionId: 'cn408-2009-q01', body: '匿名历史全部原文', createdAt: '2026-11-20T00:00:00.000Z', updatedAt: '2026-11-20T00:00:00.000Z' });
      tx.oncomplete = () => { db.close(); resolve(); }; tx.onerror = () => reject(tx.error);
    };
  }));
  await login(page, info.project.name === 'server-mobile' ? 'member11' : 'member10');
  expect(await accountRows(page, 'notes')).toHaveLength(0);
  await page.goto('/settings');
  await page.getByText('导入原来浏览器里的学习记录', { exact: true }).click();
  await page.getByRole('button', { name: '预览旧记录' }).click();
  await expect(page.getByText(/0 条作答，1 条笔记/)).toBeVisible();
  await expect(page.getByRole('button', { name: '将这些记录归入当前账号' })).toBeDisabled();
  const downloading = page.waitForEvent('download');
  await page.getByRole('button', { name: '保存迁移前备份' }).click();
  expect(await (await downloading).path()).toBeTruthy();
  await page.getByRole('button', { name: '将这些记录归入当前账号' }).click();
  await expect(page.getByText(/旧记录已归入当前账号/)).toBeVisible();
  expect((await accountRows(page, 'notes'))[0]?.body).toBe('匿名历史全部原文');
  await page.getByRole('button', { name: '同步并查看状态' }).click();
  await expect(page.getByText(/待同步 0 条/)).toBeVisible();
  expect(await page.evaluate(() => new Promise<number>((resolve) => { const open = indexedDB.open('408-user'); open.onsuccess = () => {
    const db = open.result; const read = db.transaction('notes').objectStore('notes').count();
    read.onsuccess = () => { resolve(read.result); db.close(); };
  }; }))).toBe(1);
});
test('uses an invitation once and caches source-page images for offline inspection', async ({ page, browser }, info) => {
  await login(page, 'testadmin'); await page.goto('/settings');
  await page.getByText('管理员：邀请与题包发布', { exact: true }).click();
  await page.getByRole('button', { name: '生成 7 天成员邀请码' }).click();
  const invitation = await page.getByLabel('邀请码（仅使用一次）').inputValue();
  const member = await browser.newContext({ baseURL: 'http://127.0.0.1:4323' });
  try {
    const joined = await member.newPage(); await joined.goto('/');
    await joined.getByRole('button', { name: '使用邀请码注册' }).click();
    await joined.getByLabel('用户名', { exact: true }).fill(`joined-${info.project.name}`);
    await joined.getByLabel('密码', { exact: true }).fill(TEST_PASSWORD);
    await joined.getByLabel('邀请码', { exact: true }).fill(invitation);
    await joined.getByRole('button', { name: '创建账号' }).click();
    await expect(joined.getByRole('heading', { name: '今日学习', exact: true })).toBeVisible();
    await expect(joined.getByRole('button', { name: /开始剩余 [1-9]/ })).toBeEnabled({ timeout: 30_000 });
    const repeated = await joined.request.post('/api/v1/auth/register', { headers: { Origin: 'http://127.0.0.1:4323' }, data: { username: 'another-member', password: TEST_PASSWORD, invite: invitation } });
    expect(repeated.status()).toBe(400);
    await startNote(joined);
    await joined.locator('.source-button').click();
    const image = joined.locator('.source-pages img').first();
    await expect.poll(() => image.evaluate((node) => (node as HTMLImageElement).naturalWidth)).toBeGreaterThan(100);
    await joined.getByRole('button', { name: '关闭', exact: true }).click();
    await waitForOfflineShell(joined);
    await member.setOffline(true); await joined.reload();
    await joined.locator('.source-button').click();
    await expect.poll(() => joined.locator('.source-pages img').first().evaluate((node) => (node as HTMLImageElement).naturalWidth)).toBeGreaterThan(100);
    await member.setOffline(false);
    await page.getByRole('button', { name: '查看成员', exact: true }).click();
    await page.getByRole('button', { name: `停用 joined-${info.project.name} 并撤销会话`, exact: true }).click();
    await joined.reload();
    await expect(joined.getByRole('button', { name: '登录', exact: true })).toBeVisible();
    await member.setOffline(true); await joined.reload();
    await expect(joined.getByRole('button', { name: '登录', exact: true })).toBeVisible();
  } finally { await member.close(); }
});
test('locks other tabs on account switching and reopens the original account safely', async ({ page, context }, info) => {
  const index = info.project.name === 'server-mobile' ? 16 : 14;
  await login(page, `member${index}`); await startNote(page);
  await saveNote(page, '跨标签切换前的原文');
  const tab = await context.newPage(); await tab.goto('/settings');
  await tab.getByRole('button', { name: '退出并锁定本地记录' }).click();
  await expect(page.getByRole('button', { name: '登录', exact: true })).toBeVisible();
  await login(tab, `member${index + 1}`);
  expect(await accountRows(tab, 'notes')).toHaveLength(0);
  await page.getByLabel('用户名', { exact: true }).fill(`member${index}`);
  await page.getByLabel('密码', { exact: true }).fill(TEST_PASSWORD);
  await page.getByRole('button', { name: '登录', exact: true }).click();
  await expect(page.getByPlaceholder('记录易错点')).toHaveValue('跨标签切换前的原文');
  await expect(tab.getByRole('button', { name: '登录', exact: true })).toBeVisible();
  await saveNote(page, '原账号重新登录后仍能保存');
});
test('shared PDF is private, reads by range, saves offline explicitly and survives logout safely', async ({ page, context, request }, testInfo) => {
  const account = testInfo.project.name === 'server-mobile' ? 'member3' : 'member2';
  expect((await request.get('/content/2009.json')).status()).toBe(404);
  expect((await request.get('/api/v1/files')).status()).toBe(401);
  await login(page, account);
  await page.goto('/documents');
  await expect(page.getByRole('heading', { name: '共享资料库' })).toBeVisible();
  await page.getByRole('link', { name: '阅读', exact: true }).click();
  await expectRenderedPdf(page);
  await page.goto('/documents');
  await page.getByRole('button', { name: '保存供离线阅读' }).click();
  await expect(page.getByText(/已保存离线副本/)).toBeVisible();
  await page.getByRole('link', { name: '阅读', exact: true }).click();
  await waitForOfflineShell(page);
  await context.setOffline(true);
  await page.reload();
  await expectRenderedPdf(page);
  await context.setOffline(false);
  await page.goto('/settings');
  await page.getByRole('button', { name: '退出并锁定本地记录' }).click();
  await expect(page.getByRole('button', { name: '登录', exact: true })).toBeVisible();
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole('button', { name: '登录', exact: true })).toBeVisible();
  await expect(page.locator('canvas')).toHaveCount(0);
});
