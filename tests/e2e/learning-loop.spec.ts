import { test, expect, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import type { DailyPlan, CardReviewEvent, PracticeEvidence, StudySession } from '@408os/domain';

async function rows<T>(page: Page, store: string): Promise<T[]> {
  return page.evaluate((name) => new Promise((resolve, reject) => {
    const request = indexedDB.open('408-user');
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const db = request.result;
      const transaction = db.transaction(name, 'readonly');
      const all = transaction.objectStore(name).getAll();
      all.onsuccess = () => resolve(all.result);
      all.onerror = () => reject(all.error);
      transaction.oncomplete = () => db.close();
    };
  }), store);
}
async function ready(page: Page) {
  await page.goto('/');
  await expect(page.getByRole('button', { name: '开始剩余 8 题' })).toBeEnabled();
  await expect(page.getByRole('button', { name: '复习 3 张卡片' })).toBeEnabled();
}
test('connects daily practice, mistake notes, related cards, bounded retries and original-session recap', async ({ page }, info) => {
  await ready(page);
  const plan = await rows<DailyPlan>(page, 'dailyPlans');
  await page.getByRole('button', { name: '开始剩余 8 题' }).click();
  await expect(page).toHaveURL(/\/practice\/[^/]+$/);
  const originalPath = new URL(page.url()).pathname;
  await page.locator('.option-list > button').first().click();
  await page.getByRole('button', { name: '提交答案' }).click();
  await expect(page.locator('.answer-status')).toContainText('回答错误');
  await page.getByRole('button', { name: '结束', exact: true }).click();
  await expect(page.getByRole('heading', { name: '本轮总结' })).toBeVisible();
  await expect(page.getByRole('region', { name: '本轮证据' })).toContainText('1 次有效客观首答');
  await page.getByLabel('错因 cn408-2009-q01', { exact: true }).selectOption('concept');
  await page.getByLabel('错因笔记 cn408-2009-q01').fill('混淆了队列和栈的操作顺序');
  await page.getByRole('button', { name: '保存错因' }).first().click();
  await expect(page.getByRole('status')).toContainText('已保存');
  await page.getByRole('link', { name: '相关卡片', exact: true }).first().click();
  await expect(page.locator('.memory-preview')).toHaveCount(1);
  await page.getByRole('button', { name: '加练本组 1 张' }).click();
  await expect(page).toHaveURL(/\/review\/cards\/[^/]+$/);
  const cardPath = new URL(page.url()).pathname;
  await page.getByRole('button', { name: '查看解释' }).click();
  await page.getByRole('button', { name: '忘记', exact: true }).click();
  await expect.poll(async () => (await rows<CardReviewEvent>(page, 'cardReviewEvents')).length).toBe(1);
  await page.reload();
  await expect(page.getByRole('button', { name: '查看解释' })).toBeVisible();
  for (let i = 0; i < 2; i++) {
    await page.getByRole('button', { name: '查看解释' }).click();
    await page.getByRole('button', { name: '忘记', exact: true }).click();
  }
  await expect(page.getByRole('heading', { name: '本轮复习总结' })).toBeVisible();
  await expect(page.locator('.study-panel')).toContainText('1 张出现过');
  expect(await rows<CardReviewEvent>(page, 'cardReviewEvents')).toHaveLength(3);
  await page.screenshot({ path: info.outputPath('card-summary.png'), fullPage: true });
  await page.goto(`${originalPath}/summary`);
  await page.getByRole('button', { name: '重练本轮错题（1）' }).click();
  await expect(page).toHaveURL(/\/practice\/[^/]+$/);
  expect(new URL(page.url()).pathname).not.toBe(originalPath);
  const sessions = await rows<StudySession>(page, 'sessions');
  expect(sessions).toHaveLength(2);
  expect(sessions.find((entry) => originalPath.endsWith(entry.id))?.submittedQuestionIds).toHaveLength(1);
  expect((await rows<PracticeEvidence>(page, 'practiceEvidence')).find((entry) => entry.mistakeReason === 'concept')?.mistakeNote).toContain('队列');
  await page.goto('/');
  expect(await rows<DailyPlan>(page, 'dailyPlans')).toEqual(plan);
  await page.goto(cardPath);
  await expect(page.getByRole('heading', { name: '本轮复习总结' })).toBeVisible();
});

test('persists quota changes for tomorrow and personal edits survive pause, reload and content installation', async ({ page }) => {
  await ready(page);
  const plan = await rows<DailyPlan>(page, 'dailyPlans');
  await page.goto('/review?concept=ds.foundations.queue');
  await expect(page.locator('.memory-preview')).toHaveCount(1);
  await page.getByRole('button', { name: '暂停复习' }).click();
  await expect(page.getByRole('button', { name: '恢复复习' })).toBeVisible();
  await page.getByRole('button', { name: '恢复复习' }).click();
  await page.getByRole('button', { name: '编辑副本' }).click();
  await page.getByLabel('正面问题').fill('我自己的循环队列判满问题');
  await page.getByRole('button', { name: '保存个人卡片' }).click();
  await expect(page.locator('.memory-preview')).toContainText('我自己的循环队列');
  await page.getByLabel('每日题目').fill('12');
  await page.getByRole('button', { name: '保存明日额度' }).click();
  await expect(page.getByRole('status')).toContainText('明天生效');
  await page.reload();
  await expect(page.locator('.memory-preview')).toContainText('我自己的循环队列');
  expect(await rows<DailyPlan>(page, 'dailyPlans')).toEqual(plan);
  await page.getByRole('button', { name: '加练本组 1 张' }).click();
  await expect(page.locator('.flashcard')).toContainText('我自己的循环队列');
});

test('keeps stale note drafts after another tab saves and reports a storage failure without revealing hints', async ({ page, context }) => {
  await page.goto('/questions?question=cn408-2009-q02');
  await page.getByRole('button', { name: '开始第 2 题', exact: true }).click();
  await expect(page).toHaveURL(/\/practice\/[^/]+$/);
  const peer = await context.newPage();
  await peer.goto(new URL(page.url()).pathname);
  await expect(peer.getByPlaceholder('记录易错点')).toBeVisible();
  await page.getByPlaceholder('记录易错点').fill('第一份笔记');
  await peer.getByPlaceholder('记录易错点').fill('另一标签页的草稿');
  await page.getByRole('heading', { name: '笔记' }).click();
  await expect.poll(async () => (await rows<{ body: string }>(page, 'notes'))[0]?.body).toBe('第一份笔记');
  await peer.getByRole('heading', { name: '笔记' }).click();
  await expect(peer.getByRole('alert')).toContainText('另一页面更新');
  await expect(peer.getByPlaceholder('记录易错点')).toHaveValue('另一标签页的草稿');
  expect((await rows<{ body: string }>(page, 'notes'))[0]?.body).toBe('第一份笔记');
  await peer.close();
  await page.evaluate(() => {
    const original = IDBObjectStore.prototype.put;
    IDBObjectStore.prototype.put = function (...args) {
      // Fail the hint mutation; foreground-time checkpoints use the same store.
      // Rejecting every put would inject a second, unrelated background failure.
      if (this.name === 'practiceEvidence' && (args[0] as PracticeEvidence).hintsUsed > 0) {
        throw new DOMException('injected quota', 'QuotaExceededError');
      }
      return original.apply(this, args);
    };
  });
  await page.getByRole('button', { name: '提示 0/1' }).click();
  await expect(page.getByRole('alert')).toContainText('保存提示使用记录失败');
  await expect(page.locator('.hint-panel')).toHaveCount(0);
  expect(await rows<PracticeEvidence>(page, 'practiceEvidence')).toEqual([expect.objectContaining({ hintsUsed: 0 })]);
});

test('migrates a real v3 database after recovery download, waits for a blocking old tab and keeps every duplicate original', async ({ page, context }, info) => {
  await page.route('**/*', async (route) => route.request().isNavigationRequest()
    ? route.fulfill({ contentType: 'text/html', body: '<html><title>migration fixture</title></html>' }) : route.continue());
  await page.goto('/');
  await page.evaluate(() => new Promise<void>((resolve, reject) => {
    const request = indexedDB.open('408-user', 30);
    request.onupgradeneeded = () => {
      const db = request.result;
      const schemas: Record<string, string> = { attempts: 'id', sessions: 'id', progresses: 'questionId', notes: 'id', collections: 'questionId', settings: 'key', changeLog: 'id', mockExams: 'id' };
      for (const [name, keyPath] of Object.entries(schemas)) db.createObjectStore(name, { keyPath });
      db.createObjectStore('versionedProgresses', { keyPath: ['questionId', 'questionContentVersion'] });
    };
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const db = request.result;
      const tx = db.transaction('notes', 'readwrite');
      for (const [id, body] of [['one', '保留第一份原文'], ['two', '保留第二份原文']]) tx.objectStore('notes').put({ id, body, questionId: 'cn408-2009-q01', createdAt: '2026-11-19T00:00:00.000Z', updatedAt: '2026-11-19T00:00:00.000Z' });
      tx.oncomplete = () => { db.close(); resolve(); };
    };
  }));
  const blocker = await context.newPage();
  await blocker.route('**/*', (route) => route.fulfill({ contentType: 'text/html; charset=utf-8', body: '<textarea aria-label="旧页面草稿">保留尚未提交的输入</textarea>' }));
  await blocker.goto('/');
  await blocker.evaluate(() => new Promise<void>((resolve, reject) => {
    const request = indexedDB.open('408-user');
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      // Simulate an old client that does not yet close on versionchange.
      (window as unknown as { oldConnection: IDBDatabase }).oldConnection = request.result;
      resolve();
    };
  }));
  await page.unroute('**/*');
  await page.goto('/');
  await expect(page.getByRole('heading', { name: '保存数据，开始新的学习循环' })).toBeVisible();
  await expect(page.getByRole('button', { name: '开始兼容升级' })).toBeDisabled();
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: '下载升级前快照' }).click();
  await (await download).saveAs(info.outputPath('before-v4-recovery.json'));
  const recovery = JSON.parse(readFileSync(info.outputPath('before-v4-recovery.json'), 'utf8'));
  expect(recovery.tables.notes).toHaveLength(2);
  await page.getByRole('checkbox').check();
  await page.getByRole('button', { name: '开始兼容升级' }).click();
  await expect(page.getByRole('alert')).toContainText('等待其他 BitAtlas 标签页');
  await expect(blocker.getByLabel('旧页面草稿')).toHaveValue('保留尚未提交的输入');
  await blocker.close();
  await expect(page.getByRole('heading', { name: '今日学习' })).toBeVisible();
  expect((await rows<{ originals: unknown[] }>(page, 'noteConflicts'))[0]?.originals).toHaveLength(2);
  await page.goto('/settings');
  await expect(page.getByRole('heading', { name: /历史笔记冲突/ })).toBeVisible();
  await page.getByRole('button', { name: '保存合并结果' }).click();
  await expect(page.getByText(/原文档案仍保留/)).toBeVisible();
});

test('closes stale database connections on version change while keeping the current unsaved draft visible', async ({ page }) => {
  await page.goto('/questions?question=cn408-2009-q41');
  await page.getByRole('button', { name: '开始第 41 题', exact: true }).click();
  await page.getByPlaceholder('记录易错点').fill('尚未保存的升级前输入');
  await page.evaluate(() => new Promise<void>((resolve, reject) => {
    const request = indexedDB.open('408-user', 50);
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error('The old app connection did not close'));
    request.onsuccess = () => { request.result.close(); resolve(); };
  }));
  await expect(page.getByRole('alert')).toContainText('数据库已在另一页面更新');
  await expect(page.getByPlaceholder('记录易错点')).toHaveValue('尚未保存的升级前输入');
});

test('keeps readable typography, keyboard access and five mobile destinations at enlarged font size', async ({ page }, info) => {
  await ready(page);
  await expect(page.locator('.mobile-nav a')).toHaveCount(5);
  await page.getByLabel('正文字号').selectOption('24');
  await page.goto('/review?concept=co.representation.float');
  await expect(page.locator('.memory-preview')).toHaveCount(2);
  await expect(page.locator('.memory-preview .content-blocks').first()).toHaveCSS('font-size', '24px');
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
  await page.getByRole('button', { name: '加练本组 2 张' }).focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('button', { name: '查看解释' })).toBeVisible();
  await page.getByRole('button', { name: '查看解释' }).focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('button', { name: '记得', exact: true })).toBeVisible();
  await page.screenshot({ path: info.outputPath('reading-24px.png'), fullPage: true });
});
