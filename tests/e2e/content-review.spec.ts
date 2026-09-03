import path from 'node:path';
import { mkdir } from 'node:fs/promises';
import { expect, test, type Download, type Page, type TestInfo } from '@playwright/test';

const screenshotRoot = path.resolve('output', 'playwright', 'screenshots');

const reviewChecks = ['题干', '选项', '答案', '解析', '评分点', '资源', '来源', '知识点'] as const;

interface ReviewLedger {
  schemaVersion: number;
  pack: {
    id: string;
    contentVersion: string;
    sha256: string;
  };
  summary: {
    total: number;
    approved: number;
    rejected: number;
    pending: number;
    stale: number;
  };
  records: Array<{
    packId: string;
    packHash: string;
    questionId: string;
    questionContentVersion: string;
    decision: string;
    reviewer: string;
    issueNote: string;
  }>;
}

interface StoredSetting {
  key: string;
  value: {
    questionId?: string;
    decision?: string;
    reviewer?: string;
    issueNote?: string;
    updatedAt?: string;
  };
}

interface StoredChangeLog {
  entityType: string;
  entityId: string;
  operation: string;
  changedAt: string;
}

async function openReview(page: Page, question = 1) {
  await page.goto(`/review/2009?question=${question}`);
  await expect(page.getByRole('heading', { name: '2009 内容复核' })).toBeVisible();
  await expect(page).toHaveURL(new RegExp(`/review/2009\\?question=${question}$`));
}

async function showReviewView(page: Page, name: '来源' | '结构化' | '核对') {
  const tab = page.getByRole('tab', { name, includeHidden: true });
  await tab.waitFor({ state: 'attached' });
  if (await tab.isVisible()) {
    await tab.click();
    await expect(tab).toHaveAttribute('aria-selected', 'true');
  }
}

// 双页复核用例的保存事务曾与后台扩展题包安装（解析+写库）争用主线程，高负载下
// 5s 内到不了「已通过复核」。404 会被 installExtraContent 静默跳过（storage.ts），
// 2009 旗舰包不受影响，断言面不变。
async function skipExtraPackInstalls(page: Page) {
  const extraYears = [
    '2010', '2011', '2012', '2013', '2014', '2015', '2016', '2017',
    '2018', '2019', '2020', '2021', '2022', '2023', '2024', '2025',
  ];
  await Promise.all(extraYears.map((year) => (
    page.context().route(`**/content/${year}.json*`, (route) => route.fulfill({ status: 404 }))
  )));
}

async function downloadJson<T>(download: Download): Promise<T> {
  const stream = await download.createReadStream();
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8')) as T;
}

async function captureReviewWorkbench(page: Page, projectName: string) {
  await mkdir(screenshotRoot, { recursive: true });
  await page.screenshot({
    path: path.join(screenshotRoot, `${projectName}-content-review-filters.png`),
    animations: 'disabled',
  });
}

async function captureReviewState(page: Page, testInfo: TestInfo, name: string) {
  await mkdir(screenshotRoot, { recursive: true });
  await page.screenshot({
    path: path.join(screenshotRoot, `${testInfo.project.name}-${name}.png`),
    animations: 'disabled',
  });
}

async function readStore(page: Page, storeName: string): Promise<unknown[]> {
  return page.evaluate(
    ({ databaseName, targetStore }) => new Promise<unknown[]>((resolve, reject) => {
      const request = indexedDB.open(databaseName);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const database = request.result;
        const transaction = database.transaction(targetStore, 'readonly');
        const getAll = transaction.objectStore(targetStore).getAll();
        getAll.onerror = () => reject(getAll.error);
        getAll.onsuccess = () => resolve(getAll.result);
        transaction.oncomplete = () => database.close();
      };
    }),
    { databaseName: '408-user', targetStore: storeName },
  );
}

async function selectReviewQuestion(page: Page, number: number) {
  const button = page.getByRole('button', { name: new RegExp(`^第 ${number} 题`) });
  await button.scrollIntoViewIfNeeded();
  await expect(button).toBeVisible();
  await button.click();
}

test('exposes all 47 questions and restores Q41 from the URL and browser history', async ({ page }) => {
  await openReview(page);

  const questionButtons = page.getByRole('button', { name: /^第 \d+ 题/ });
  await expect(questionButtons).toHaveCount(47);
  await expect(page.getByRole('button', { name: /^第 1 题/ })).toHaveAttribute('aria-current', 'step');

  await selectReviewQuestion(page, 41);
  await expect(page).toHaveURL(/\/review\/2009\?question=41$/);
  await expect(page.getByRole('button', { name: /^第 41 题/ })).toHaveAttribute('aria-current', 'step');
  await showReviewView(page, '结构化');
  await expect(page.getByText('综合题', { exact: true })).toBeVisible();

  await selectReviewQuestion(page, 47);
  await expect(page).toHaveURL(/\/review\/2009\?question=47$/);
  await page.goBack();
  await expect(page).toHaveURL(/\/review\/2009\?question=41$/);
  await expect(page.getByRole('button', { name: /^第 41 题/ })).toHaveAttribute('aria-current', 'step');

  await page.reload();
  await expect(page).toHaveURL(/\/review\/2009\?question=41$/);
  await showReviewView(page, '结构化');
  await expect(page.getByText('综合题', { exact: true })).toBeVisible();
});

test('switches between the source, structured content and checklist on mobile', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openReview(page, 41);

  const sourceTab = page.getByRole('tab', { name: '来源' });
  const contentTab = page.getByRole('tab', { name: '结构化' });
  const checksTab = page.getByRole('tab', { name: '核对' });
  await expect(sourceTab).toBeVisible();
  await expect(contentTab).toBeVisible();
  await expect(checksTab).toBeVisible();

  for (const tab of [sourceTab, contentTab, checksTab]) {
    await tab.click();
    await expect(tab).toHaveAttribute('aria-selected', 'true');
  }
});

test('filters pending questions, preserves the filter in history and jumps to the next pending question', async ({ page }, testInfo) => {
  await openReview(page);

  const allFilter = page.getByRole('button', { name: '全部 47' });
  const pendingFilter = page.getByRole('button', { name: '待复核 47' });
  await expect(allFilter).toHaveAttribute('aria-pressed', 'true');
  await pendingFilter.click();
  await expect(page).toHaveURL(/\/review\/2009\?question=1&status=pending$/u);
  await expect(pendingFilter).toHaveAttribute('aria-pressed', 'true');

  await page.getByRole('button', { name: '下一道待复核' }).click();
  await expect(page).toHaveURL(/\/review\/2009\?question=2&status=pending$/u);
  await page.reload();
  await expect(pendingFilter).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('button', { name: '第 2 题', exact: true })).toHaveAttribute('aria-current', 'step');

  await page.goBack();
  await expect(page).toHaveURL(/\/review\/2009\?question=1&status=pending$/u);
  await page.goForward();
  await expect(page).toHaveURL(/\/review\/2009\?question=2&status=pending$/u);
  await expect.poll(() => page.evaluate(() => (
    document.documentElement.scrollWidth <= document.documentElement.clientWidth
  ))).toBe(true);
  await captureReviewWorkbench(page, testInfo.project.name);

  await page.goto('/review/2009?question=2&status=unknown');
  await expect(allFilter).toHaveAttribute('aria-pressed', 'true');
});

test('persists a draft through refresh and enforces the approval gate', async ({ page }) => {
  await openReview(page);
  await showReviewView(page, '核对');

  const approveButton = page.getByRole('button', { name: '通过复核' });
  await expect(approveButton).toBeDisabled();

  await page.getByRole('checkbox', { name: reviewChecks[0], exact: true }).check();
  await page.getByRole('checkbox', { name: reviewChecks[1], exact: true }).check();
  await page.getByLabel('复核人', { exact: true }).fill('个人复核');
  await expect(approveButton).toBeDisabled();

  await page.getByRole('button', { name: '保存草稿' }).click();
  await expect(page.getByRole('status')).toContainText('草稿已保存');

  await page.reload();
  await expect(page).toHaveURL(/\/review\/2009\?question=1$/);
  await showReviewView(page, '核对');
  await expect(page.getByRole('checkbox', { name: reviewChecks[0], exact: true })).toBeChecked();
  await expect(page.getByRole('checkbox', { name: reviewChecks[1], exact: true })).toBeChecked();
  await expect(page.getByRole('checkbox', { name: reviewChecks[2], exact: true })).not.toBeChecked();
  await expect(page.getByLabel('复核人', { exact: true })).toHaveValue('个人复核');
  await expect(approveButton).toBeDisabled();

  for (const label of reviewChecks.slice(2)) {
    await page.getByRole('checkbox', { name: label, exact: true }).check();
  }
  await expect(approveButton).toBeEnabled();
  await approveButton.click();
  await expect(page.getByRole('status')).toContainText('已通过复核');
  await expect(page.getByText(/已通过\s*1\s*\/\s*47/).first()).toBeVisible();

  await page.reload();
  await showReviewView(page, '核对');
  await expect(page.getByText(/已通过\s*1\s*\/\s*47/).first()).toBeVisible();
  for (const label of reviewChecks) {
    await expect(page.getByRole('checkbox', { name: label, exact: true })).toBeChecked();
  }
});

test('enforces the rejection gate and exports a hash-bound ledger', async ({ page }) => {
  const packResponse = await page.request.get('/content/2009.json');
  expect(packResponse.ok()).toBe(true);
  const installedPack = await packResponse.json() as {
    manifest: { id: string; contentVersion: string; sha256: string };
  };
  const { id: packId, contentVersion, sha256: packHash } = installedPack.manifest;

  await openReview(page, 2);
  await showReviewView(page, '核对');

  const rejectButton = page.getByRole('button', { name: '标记问题' });
  await expect(rejectButton).toBeDisabled();
  await page.getByLabel('复核人', { exact: true }).fill('个人复核');
  await expect(rejectButton).toBeDisabled();
  await page.getByLabel('问题记录', { exact: true }).fill('选项 B 与来源页的文字不一致。');
  await expect(rejectButton).toBeEnabled();

  await rejectButton.click();
  await expect(page.getByRole('status')).toContainText('已标记问题');
  await expect(page.getByRole('button', { name: '第 2 题', exact: true })).toHaveAttribute('title', '第 2 题 · 有问题');

  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: '导出审核记录' }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/\.json$/);

  const ledger = await downloadJson<ReviewLedger>(download);
  expect(ledger.schemaVersion).toBe(1);
  expect(ledger.pack).toEqual({
    id: packId,
    contentVersion,
    sha256: packHash,
  });
  expect(ledger.summary).toEqual({ total: 47, approved: 0, rejected: 1, pending: 46, stale: 0 });
  expect(ledger.records).toHaveLength(1);
  expect(ledger.records[0]).toMatchObject({
    packId,
    packHash,
    questionId: 'cn408-2009-q02',
    questionContentVersion: contentVersion,
    decision: 'rejected',
    reviewer: '个人复核',
    issueNote: '选项 B 与来源页的文字不一致。',
  });
});

test('prevents a stale review tab from downgrading an approved record', async ({ page }, testInfo) => {
  await skipExtraPackInstalls(page);
  await openReview(page);
  await showReviewView(page, '核对');
  const peer = await page.context().newPage();

  try {
    await openReview(peer);
    await showReviewView(peer, '核对');

    for (const label of reviewChecks) {
      await page.getByRole('checkbox', { name: label, exact: true }).check();
    }
    await page.getByLabel('复核人', { exact: true }).fill('tab-a-reviewer');
    await page.getByRole('button', { name: '通过复核' }).click();
    await expect(page.getByRole('status', { name: '复核记录保存状态' })).toContainText('已通过复核');

    const reviewLogBeforeConflict = (await readStore(page, 'changeLog') as StoredChangeLog[])
      .filter((entry) => entry.entityType === 'setting' && entry.entityId.startsWith('content-review:v1:'));

    await peer.getByLabel('复核人', { exact: true }).fill('tab-b-stale');
    await peer.getByLabel('问题记录', { exact: true }).fill('must-not-downgrade-approved');
    await peer.getByRole('button', { name: '保存草稿' }).click();

    const conflict = peer.getByRole('alert', { name: '复核记录冲突' });
    await expect(conflict).toContainText('不会覆盖权威复核记录');
    await expect(peer.locator('.review-decision')).toContainText('待重新读取');
    await expect(peer.getByLabel('复核人', { exact: true })).toHaveValue('tab-b-stale');
    await expect(peer.getByLabel('复核人', { exact: true })).toBeDisabled();
    await expect(peer.getByRole('button', { name: '保存草稿' })).toBeDisabled();
    await expect(peer.getByRole('button', { name: '通过复核' })).toBeDisabled();
    await expect(peer.getByRole('button', { name: '下一题', includeHidden: true })).toBeDisabled();
    await expect(peer.getByRole('button', { name: '重新读取最新复核记录' })).toBeEnabled();
    expect((await readStore(peer, 'changeLog') as StoredChangeLog[])
      .filter((entry) => entry.entityType === 'setting' && entry.entityId.startsWith('content-review:v1:')))
      .toEqual(reviewLogBeforeConflict);

    await conflict.scrollIntoViewIfNeeded();
    await captureReviewState(peer, testInfo, 'content-review-cross-tab-conflict');

    await peer.getByRole('button', { name: '重新读取最新复核记录' }).click();
    await expect(conflict).toHaveCount(0);
    await expect(peer.locator('.review-decision')).toContainText('已通过');
    await expect(peer.getByLabel('复核人', { exact: true })).toHaveValue('tab-a-reviewer');
    await expect(peer.getByLabel('问题记录', { exact: true })).toHaveValue('');
    for (const label of reviewChecks) {
      await expect(peer.getByRole('checkbox', { name: label, exact: true })).toBeChecked();
    }
    await expect(peer.locator('.review-decision')).toContainText('已通过');
    await expect(peer.getByRole('status', { name: '复核记录保存状态' })).toContainText('已重新读取最新复核记录');
    await expect.poll(() => peer.evaluate(() => {
      const checklist = document.querySelector<HTMLElement>('#review-panel-checklist');
      return document.documentElement.scrollWidth <= document.documentElement.clientWidth
        && (!checklist || checklist.scrollWidth <= checklist.clientWidth);
    })).toBe(true);

    await peer.getByRole('status', { name: '复核记录保存状态' }).scrollIntoViewIfNeeded();
    await captureReviewState(peer, testInfo, 'content-review-cross-tab-recovered');

    const reviewSettings = (await readStore(peer, 'settings') as StoredSetting[])
      .filter((entry) => entry.key.startsWith('content-review:v1:'));
    expect(reviewSettings).toHaveLength(1);
    expect(reviewSettings[0]).toMatchObject({
      value: {
        questionId: 'cn408-2009-q01',
        decision: 'approved',
        reviewer: 'tab-a-reviewer',
        issueNote: '',
      },
    });
    expect((await readStore(peer, 'changeLog') as StoredChangeLog[])
      .filter((entry) => entry.entityType === 'setting' && entry.entityId.startsWith('content-review:v1:')))
      .toEqual(reviewLogBeforeConflict);
  } finally {
    await peer.close();
  }
});
