import path from 'node:path';
import { mkdir } from 'node:fs/promises';
import { expect, test, type Page, type TestInfo } from '@playwright/test';

const screenshotRoot = path.resolve('output', 'playwright', 'screenshots');

async function openStore(page: Page, databaseName: string, storeName: string): Promise<unknown[]> {
  return page.evaluate(({ databaseName: name, storeName: store }) => new Promise<unknown[]>((resolve, reject) => {
    const request = indexedDB.open(name);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const database = request.result;
      const transaction = database.transaction(store, 'readonly');
      const getAll = transaction.objectStore(store).getAll();
      getAll.onerror = () => reject(getAll.error);
      getAll.onsuccess = () => resolve(getAll.result);
      transaction.oncomplete = () => database.close();
    };
  }), { databaseName, storeName });
}

async function seedInProgressExam(page: Page, examId: string): Promise<void> {
  const questions = await openStore(page, '408-content', 'questions') as Array<{
    id: string;
    year: number;
    number: number;
    kind: 'single-choice' | 'comprehensive';
    contentVersion: string;
    answer: { type: 'choice'; optionId: string } | { type: 'comprehensive'; maxScore: number };
  }>;
  const packs = await openStore(page, '408-content', 'packs') as Array<{
    year: number;
    id: string;
    sha256: string;
    contentVersion: string;
  }>;
  const paper = questions.filter((question) => question.year === 2009).sort((left, right) => left.number - right.number);
  const manifest = packs.find((pack) => pack.year === 2009);
  if (paper.length !== 47 || !manifest) throw new Error('The installed content fixture is not the fixed 2009 paper.');
  const startedAt = new Date(Date.now() - 30_000).toISOString();
  const snapshots = paper.map((question) => ({
    id: question.id,
    number: question.number,
    kind: question.kind,
    contentVersion: question.contentVersion,
    maxScore: question.answer.type === 'comprehensive' ? question.answer.maxScore : 2,
  }));
  const questionContentVersions = Object.fromEntries(paper.map((question) => [question.id, question.contentVersion]));
  await page.evaluate(({ examId: id, startedAt: start, manifest: pack, snapshots: blueprintQuestions, questionContentVersions: versions }) => new Promise<void>((resolve, reject) => {
    const request = indexedDB.open('408-user');
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const database = request.result;
      const transaction = database.transaction(['sessions', 'mockExams'], 'readwrite');
      const session = {
        id: `${id}-session`,
        mode: 'mock',
        questionIds: blueprintQuestions.map((question) => question.id),
        questionContentVersions: versions,
        currentIndex: 0,
        responses: {},
        submittedQuestionIds: [],
        startedAt: start,
        updatedAt: start,
      };
      const exam = {
        id,
        sessionId: session.id,
        blueprint: {
          packId: pack.id,
          packHash: pack.sha256,
          contentVersion: pack.contentVersion,
          year: 2009,
          durationMinutes: 180,
          objectiveMaxScore: 80,
          comprehensiveMaxScore: 70,
          totalMaxScore: 150,
          questions: blueprintQuestions,
        },
        status: 'in-progress',
        questionDurationsMs: Object.fromEntries(blueprintQuestions.map((question) => [question.id, 0])),
        startedAt: start,
        updatedAt: start,
      };
      transaction.objectStore('sessions').put(session);
      transaction.objectStore('mockExams').put(exam);
      transaction.oncomplete = () => { database.close(); resolve(); };
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error);
    };
  }), { examId, startedAt, manifest, snapshots, questionContentVersions });
}

async function capture(page: Page, testInfo: TestInfo, name: string): Promise<void> {
  await mkdir(screenshotRoot, { recursive: true });
  const project = testInfo.project.name;
  if (project === 'chromium-390') {
    const main = page.locator('.main-area');
    await main.evaluate((element) => { element.scrollTop = 0; });
    await page.screenshot({ path: path.join(screenshotRoot, `${project}-${name}-top.png`), animations: 'disabled' });
    if (await page.locator('.mock-exam-tools').count()) {
      await page.locator('.mock-exam-tools').scrollIntoViewIfNeeded();
      await page.screenshot({ path: path.join(screenshotRoot, `${project}-${name}-state.png`), animations: 'disabled' });
    }
    await main.evaluate((element) => { element.scrollTop = element.scrollHeight; });
    await page.screenshot({ path: path.join(screenshotRoot, `${project}-${name}-bottom.png`), animations: 'disabled' });
    return;
  }
  await page.screenshot({ path: path.join(screenshotRoot, `${project}-${name}.png`), fullPage: true, animations: 'disabled' });
}

test('keeps the official paper closed until human review and persists a verified fixture session', async ({ page }, testInfo) => {
  await page.goto('/mock');
  await expect(page.getByRole('heading', { name: '整卷模考' })).toBeVisible();
  await expect(page.getByRole('alert')).toContainText('尚未完成 47 题人工复核');
  await expect(page.getByRole('button', { name: /开始.*模考/ })).toHaveCount(0);
  await expect(page.locator('.mobile-nav a')).toHaveCount(8);
  await capture(page, testInfo, 'mock-landing');

  const examId = `mock-e2e-${testInfo.project.name}`;
  await seedInProgressExam(page, examId);
  await page.goto(`/mock/${examId}`);
  await expect(page.getByRole('heading', { name: '2009 整卷模考' })).toBeVisible();
  const firstOption = page.getByRole('button', { name: '选择 A' });
  await firstOption.click();
  await page.getByRole('button', { name: '保存当前草稿' }).click();
  await expect(page.getByRole('status')).toContainText('当前草稿已保存');
  await page.reload();
  await expect(page.getByRole('button', { name: '选择 A' })).toHaveClass(/selected/u);
  await capture(page, testInfo, 'mock-session-draft');

  await page.getByRole('button', { name: '提交整卷' }).click();
  await expect(page.getByText('交卷完成，等待综合题自评')).toBeVisible();
  await expect(page.getByRole('button', { name: '选择 A' })).toBeDisabled();
  const selfScore = page.getByLabel('综合题自评分');
  await expect(selfScore).toBeEnabled();
  await selfScore.fill('0');
  await page.getByRole('button', { name: '保存本题自评' }).click();
  await expect(page.getByRole('heading', { name: '第 42 题自评' })).toBeVisible();
  await capture(page, testInfo, 'mock-session-submitted');
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
});

test('syncs a clean tab and protects an unsaved tab from cross-tab overwrite', async ({ page }, testInfo) => {
  const examId = `mock-e2e-sync-${testInfo.project.name}`;
  await page.goto('/mock');
  await expect(page.getByRole('alert')).toContainText('尚未完成 47 题人工复核');
  await seedInProgressExam(page, examId);

  const peer = await page.context().newPage();
  try {
    await page.goto(`/mock/${examId}`);
    await peer.goto(`/mock/${examId}`);
    await Promise.all([
      expect(page.getByRole('heading', { name: '2009 整卷模考' })).toBeVisible({ timeout: 15_000 }),
      expect(peer.getByRole('heading', { name: '2009 整卷模考' })).toBeVisible({ timeout: 15_000 }),
    ]);

    await page.getByRole('button', { name: '选择 A' }).click();
    await peer.getByRole('button', { name: '选择 B' }).click();
    await peer.getByRole('button', { name: '保存当前草稿' }).click();
    await expect(peer.getByRole('status')).toContainText('当前草稿已保存');

    await expect(page.getByRole('alert')).toContainText('另一标签页已更新此模考');
    await expect(page.getByRole('button', { name: '选择 A' })).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByRole('button', { name: '保存当前草稿' })).toBeDisabled();
    await capture(page, testInfo, 'mock-cross-tab-conflict');

    await page.getByRole('button', { name: '加载最新记录' }).click();
    await expect(page.getByRole('button', { name: '选择 B' })).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByRole('alert')).toHaveCount(0);

    await page.getByRole('button', { name: '选择 C' }).click();
    await page.getByRole('button', { name: '保存当前草稿' }).click();
    await expect(page.getByRole('status')).toContainText('当前草稿已保存');
    await expect(peer.getByRole('button', { name: '选择 C' })).toHaveAttribute('aria-pressed', 'true');
  } finally {
    await peer.close();
  }
});
