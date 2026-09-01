import path from 'node:path';
import { mkdir } from 'node:fs/promises';
import { expect, test, type Download, type Locator, type Page, type TestInfo } from '@playwright/test';

const firstQuestionId = 'cn408-2009-q01';
const userDatabase = '408-user';
const screenshotRoot = path.resolve('output', 'playwright', 'screenshots');

async function capture(page: Page, testInfo: TestInfo, name: string) {
  await mkdir(screenshotRoot, { recursive: true });
  await page.screenshot({
    path: path.join(screenshotRoot, `${testInfo.project.name}-${name}.png`),
    fullPage: true,
    animations: 'disabled',
  });
}

async function expectPressedPartition(group: Locator, activeName?: string | RegExp) {
  const total = await group.getByRole('button').count();
  const activeCount = activeName ? 1 : 0;

  expect(total).toBeGreaterThan(0);
  await expect(group.getByRole('button', { pressed: true })).toHaveCount(activeCount);
  await expect(group.getByRole('button', { pressed: false })).toHaveCount(total - activeCount);
  if (activeName) {
    await expect(group.getByRole('button', { name: activeName, pressed: true })).toHaveCount(1);
  }
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
    { databaseName: userDatabase, targetStore: storeName },
  );
}

async function putStore(page: Page, storeName: string, value: unknown): Promise<void> {
  await page.evaluate(
    ({ databaseName, targetStore, entry }) => new Promise<void>((resolve, reject) => {
      const request = indexedDB.open(databaseName);
      request.onerror = () => reject(request.error);
      request.onblocked = () => reject(new Error(`IndexedDB open blocked for ${databaseName}.`));
      request.onsuccess = () => {
        const database = request.result;
        try {
          const transaction = database.transaction(targetStore, 'readwrite');
          transaction.onerror = () => reject(transaction.error);
          transaction.onabort = () => reject(transaction.error ?? new Error('IndexedDB transaction aborted.'));
          transaction.oncomplete = () => {
            database.close();
            resolve();
          };
          transaction.objectStore(targetStore).put(entry);
        } catch (error) {
          database.close();
          reject(error);
        }
      };
    }),
    { databaseName: userDatabase, targetStore: storeName, entry: value },
  );
}

async function downloadBuffer(download: Download): Promise<Buffer> {
  const stream = await download.createReadStream();
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

function visibleNavLink(page: Page, href: string) {
  return page.locator(`a[href="${href}"]:visible`).first();
}

test('loads all 47 questions and exposes both ends of the 2009 paper', async ({ page }) => {
  await page.goto('/questions');

  await expect(page.getByRole('heading', { name: '真题浏览' })).toBeVisible();
  await expect(page.locator('.result-summary strong')).toHaveText('47');
  await expect(page.locator('.question-list .question-row')).toHaveCount(47);
  await expect(page.locator('.question-row').first()).toContainText('01');
  await expect(page.locator('.question-row').last()).toContainText('47');

  await page.getByRole('button', { name: '开始第 47 题', exact: true }).click();
  await expect(page.locator('.practice-topbar strong')).toContainText('第 47 题');
  await expect(page.locator('.palette-heading strong')).toHaveText('0/1');
  await expect(page.getByLabel('作答草稿')).toBeVisible();
});

test('traps focus inside the practice source dialog and restores it on Escape', async ({ page }) => {
  await page.goto('/questions');
  await page.getByRole('button', { name: '开始第 1 题', exact: true }).click();
  await expect(page.locator('.practice-topbar strong')).toContainText('第 1 题');

  const trigger = page.getByRole('button', { name: /原卷第/ });
  await trigger.click();
  const dialog = page.getByRole('dialog', { name: '来源页' });
  const close = page.getByRole('button', { name: '关闭' });
  await expect(dialog).toBeVisible();
  await expect(close).toBeFocused();
  await expect(page.locator('.practice-topbar')).toHaveAttribute('inert', '');
  await expect(page.locator('.question-workspace')).toHaveAttribute('inert', '');

  await page.keyboard.press('Tab');
  await expect(close).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(close).toBeFocused();
  await page.keyboard.press('Escape');

  await expect(dialog).not.toBeAttached();
  await expect(trigger).toBeFocused();
  await expect(page.locator('.question-workspace')).not.toHaveAttribute('inert', '');
});

test('builds a stable eight-question daily plan from current content', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: '今日复习计划' })).toBeVisible();
  await expect(page.locator('.daily-plan-list article')).toHaveCount(8);
  await expect(page.locator('.daily-plan-list article').first()).toContainText('Q01');
  await expect(page.getByRole('button', { name: '开始剩余 8 题' })).toBeVisible();
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);

  await page.getByRole('button', { name: '开始剩余 8 题' }).click();
  await expect(page.locator('.practice-topbar strong')).toContainText('第 1 题');
  await expect(page.locator('.palette-grid button')).toHaveCount(8);
});

test('opens the 2009 knowledge evidence map and starts a focused practice session', async ({ page }) => {
  await page.goto('/knowledge');

  await expect(page.getByRole('heading', { name: '知识证据图' })).toBeVisible();
  await expect(page.locator('.knowledge-graph-canvas')).toBeVisible();
  await expect(page.locator('.knowledge-topic-list button')).toHaveCount(12);
  await expect(page.locator('.knowledge-coverage')).toContainText('已检测 0 / 12');
  await expect(page.locator('.mobile-nav a')).toHaveCount(8);

  await page.locator('.knowledge-topic-list button').first().click();
  await expect(page.locator('.knowledge-detail-panel h2')).toContainText('栈和队列');
  await page.getByRole('button', { name: '专项练习 1 题' }).click();
  await expect(page.locator('.practice-topbar strong')).toContainText('第 1 题');
  await expect(page.locator('.palette-heading strong')).toHaveText('0/1');
});

test('restores canonical knowledge selections across reload and history navigation', async ({ page }) => {
  const detail = page.locator('.knowledge-detail-panel');
  const subjectGroup = page.getByRole('region', { name: '科目选择' });
  const topics = page.locator('.knowledge-topic-list');

  await page.goto('/knowledge?subject=computer-organization&node=topic-2009-q15');
  await expect(page.getByRole('heading', { name: '知识证据图' })).toBeVisible();
  await expect(detail.getByRole('heading', { name: '考查存储器的扩展' })).toBeVisible();
  await expect(page).toHaveURL((url) => (
    url.pathname === '/knowledge'
    && url.search === '?subject=computer-organization&node=topic-2009-q15'
  ));
  await expectPressedPartition(subjectGroup, '组成原理');
  await expectPressedPartition(topics, /考查存储器的扩展/u);

  await subjectGroup.getByRole('button', { name: '操作系统', exact: true }).click();
  await expect(detail.getByRole('heading', { name: '操作系统' })).toBeVisible();
  await expect(page).toHaveURL((url) => (
    url.pathname === '/knowledge' && url.search === '?subject=operating-systems'
  ));
  await expectPressedPartition(subjectGroup, '操作系统');
  await expectPressedPartition(topics);

  await topics.getByRole('button', { name: /考查磁盘的调度算法/u }).click();
  await expect(detail.getByRole('heading', { name: '考查磁盘的调度算法' })).toBeVisible();
  await expect(page).toHaveURL((url) => (
    url.pathname === '/knowledge'
    && url.search === '?subject=operating-systems&node=topic-2009-q29'
  ));
  await expectPressedPartition(topics, /考查磁盘的调度算法/u);

  await page.reload();
  await expect(detail.getByRole('heading', { name: '考查磁盘的调度算法' })).toBeVisible();
  await expect(page).toHaveURL((url) => (
    url.pathname === '/knowledge'
    && url.search === '?subject=operating-systems&node=topic-2009-q29'
  ));
  await expectPressedPartition(subjectGroup, '操作系统');
  await expectPressedPartition(topics, /考查磁盘的调度算法/u);

  await page.goBack();
  await expect(detail.getByRole('heading', { name: '操作系统' })).toBeVisible();
  await expect(page).toHaveURL((url) => (
    url.pathname === '/knowledge' && url.search === '?subject=operating-systems'
  ));
  await expectPressedPartition(subjectGroup, '操作系统');
  await expectPressedPartition(topics);

  await page.goForward();
  await expect(detail.getByRole('heading', { name: '考查磁盘的调度算法' })).toBeVisible();
  await expect(page).toHaveURL((url) => (
    url.pathname === '/knowledge'
    && url.search === '?subject=operating-systems&node=topic-2009-q29'
  ));
  await expectPressedPartition(subjectGroup, '操作系统');
  await expectPressedPartition(topics, /考查磁盘的调度算法/u);
});

test('returns to the current knowledge subject overview from the keyboard', async ({ page }) => {
  const detail = page.locator('.knowledge-detail-panel');
  const subjectGroup = page.getByRole('region', { name: '科目选择' });
  const topics = page.locator('.knowledge-topic-list');

  await page.goto('/knowledge?subject=operating-systems&node=topic-2009-q29');
  await expect(detail.getByRole('heading', { name: '考查磁盘的调度算法' })).toBeVisible();

  const overview = page.getByRole('button', {
    name: '操作系统科目总览',
    exact: true,
  });
  await expect(overview).toHaveAttribute('aria-pressed', 'false');
  await expectPressedPartition(subjectGroup, '操作系统');
  await expectPressedPartition(topics, /考查磁盘的调度算法/u);

  await overview.focus();
  await expect(overview).toBeFocused();
  await page.keyboard.press('Space');

  await expect(page).toHaveURL((url) => (
    url.pathname === '/knowledge' && url.search === '?subject=operating-systems'
  ));
  await expect(detail.getByRole('heading', { name: '操作系统' })).toBeVisible();
  await expect(overview).toBeFocused();
  await expect(overview).toHaveAttribute('aria-pressed', 'true');
  await expectPressedPartition(subjectGroup, '操作系统');
  await expectPressedPartition(topics);

  await page.goBack();
  await expect(page).toHaveURL((url) => (
    url.pathname === '/knowledge'
    && url.search === '?subject=operating-systems&node=topic-2009-q29'
  ));
  await expect(detail.getByRole('heading', { name: '考查磁盘的调度算法' })).toBeVisible();
  await expect(overview).toHaveAttribute('aria-pressed', 'false');
  await expectPressedPartition(topics, /考查磁盘的调度算法/u);

  await page.goForward();
  await expect(page).toHaveURL((url) => (
    url.pathname === '/knowledge' && url.search === '?subject=operating-systems'
  ));
  await expect(detail.getByRole('heading', { name: '操作系统' })).toBeVisible();
  await expect(overview).toHaveAttribute('aria-pressed', 'true');
  await expectPressedPartition(topics);
});

test('uses the strict CPU number lab and links its related questions', async ({ page }) => {
  await page.goto('/lab');

  await expect(page.getByRole('heading', { name: 'CPU 可视化实验室' })).toBeVisible();
  await expect(page.locator('.radix-output-list')).toContainText('0b11111111');
  await expect(page.locator('.radix-output-list')).toContainText('0xFF');
  await expect(page.locator('.step-list li')).toHaveCount(1);
  await page.getByRole('button', { name: '下一步' }).click();
  await expect(page.locator('.step-list li')).toHaveCount(2);

  await page.getByRole('button', { name: '原码 / 反码 / 补码' }).click();
  await page.getByLabel('十进制真值').fill('-128');
  await expect(page.locator('.machine-code-list article').nth(0)).toContainText('不可表示');
  await expect(page.locator('.machine-code-list article').nth(1)).toContainText('不可表示');
  await expect(page.getByRole('img', { name: '补码: 10000000' })).toBeVisible();

  await page.getByRole('button', { name: 'IEEE 754' }).click();
  await expect(page.locator('.ieee-field-strip')).toContainText('01111111');
  await expect(page.locator('.ieee-facts')).toContainText('0X3FC00000');

  await page.getByRole('button', { name: '相关真题 1 题' }).click();
  await expect(page.locator('.practice-topbar strong')).toContainText('第 13 题');
  await expect(page.locator('.palette-heading strong')).toHaveText('0/1');
});

test('encodes and decodes RV32I instructions with strict field evidence', async ({ page }) => {
  await page.goto('/lab');
  await page.getByRole('button', { name: 'RV32I 指令' }).click();

  await expect(page.getByRole('heading', { name: 'RV32I 指令编码' })).toBeVisible();
  await expect(page.getByLabel('汇编指令')).toHaveValue('add x1, x2, x3');
  await expect(page.locator('.riscv-result-code')).toContainText('0x003100b3');
  await expect(page.locator('.riscv-field-ruler [data-field]')).toHaveCount(6);
  await expect(page.locator('.riscv-field-ruler')).toContainText('funct7');
  await expect(page.locator('.riscv-field-ruler')).toContainText('opcode');

  await page.getByLabel('汇编指令').fill('beq x1, x2, 3');
  await expect(page.getByRole('alert')).toContainText('2 字节对齐');

  await page.getByRole('button', { name: '机器码 → 汇编' }).click();
  await page.getByLabel('32 位机器码').fill('0xffc32283');
  await expect(page.locator('.riscv-result-code')).toContainText('lw x5, -4(x6)');

  await page.getByRole('button', { name: '相关真题 1 题' }).click();
  await expect(page.locator('.practice-topbar strong')).toContainText('第 17 题');
  await expect(page.locator('.palette-heading strong')).toHaveText('0/1');
});

test('persists a response, note and bookmark through review, stats and backup restore', async ({ page }) => {
  await page.goto('/questions');
  await page.getByRole('button', { name: '开始第 1 题', exact: true }).click();
  await expect(page.locator('.practice-topbar strong')).toContainText('第 1 题');

  const options = page.locator('.option-list button');
  await expect(options).toHaveCount(4);
  for (const option of await options.all()) await expect(option).toHaveAttribute('aria-pressed', 'false');
  await expect(options.nth(0)).toContainText('栈');
  await expect(options.nth(1)).toContainText('队列');
  await options.nth(0).click();
  await expect(options.nth(0)).toHaveAttribute('aria-pressed', 'true');
  await expect(options.nth(1)).toHaveAttribute('aria-pressed', 'false');

  const note = page.locator('.study-tools textarea');
  await note.fill('打印缓冲区应使用 FIFO 队列。');
  await page.getByRole('button', { name: '收藏' }).click();
  await expect(page.getByRole('button', { name: '取消收藏' })).toBeVisible();

  await expect.poll(async () => {
    const sessions = await readStore(page, 'sessions');
    return sessions.some((value) => {
      const session = value as { responses?: Record<string, { optionId?: string }> };
      return session.responses?.[firstQuestionId]?.optionId === 'A';
    });
  }).toBe(true);
  await expect.poll(async () => {
    const notes = await readStore(page, 'notes');
    return notes.some((value) => (value as { questionId?: string; body?: string }).questionId === firstQuestionId
      && (value as { body?: string }).body === '打印缓冲区应使用 FIFO 队列。');
  }).toBe(true);
  await expect.poll(async () => {
    const collections = await readStore(page, 'collections');
    return collections.some((value) => (value as { questionId?: string }).questionId === firstQuestionId);
  }).toBe(true);

  await page.reload();
  await expect(page.locator('.practice-topbar strong')).toContainText('第 1 题');
  await expect(options.nth(0)).toHaveClass(/selected/);
  await expect(options.nth(0)).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('button', { name: '取消收藏' })).toBeVisible();
  await expect(note).toHaveValue('打印缓冲区应使用 FIFO 队列。');

  await page.getByRole('button', { name: '提交答案' }).click();
  const answerStatus = page.getByRole('status');
  await expect(answerStatus).toContainText('回答错误');
  await expect(answerStatus).toContainText('正确选项 B');
  await expect(answerStatus).toBeFocused();
  await expect(page.locator('.palette-heading strong')).toHaveText('1/1');

  await visibleNavLink(page, '/wrong').click();
  await expect(page.getByRole('heading', { name: '错题重练' })).toBeVisible();
  await expect(page.locator('.wrong-list .question-row')).toHaveCount(1);
  await expect(page.locator('.wrong-list .question-row')).toContainText('错误 1 次');
  await expect(page.locator('.wrong-list .question-row')).toContainText('打印机');

  await visibleNavLink(page, '/stats').click();
  await expect(page.getByRole('heading', { name: '学习统计' })).toBeVisible();
  await expect(page.locator('.metric-grid article').nth(0)).toContainText('有效作答1');
  await expect(page.locator('.metric-grid article').nth(1)).toContainText('答对题次0');
  await expect(page.locator('.accuracy-row').first()).toContainText('0 / 1');
  await expect(page.locator('.heatmap span[data-level="1"]')).toHaveCount(1);

  await visibleNavLink(page, '/settings').click();
  await expect(page.getByRole('heading', { name: '数据管理' })).toBeVisible();
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: '导出备份' }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/^bitatlas-backup-\d{4}-\d{2}-\d{2}\.json$/);

  const backupBuffer = await downloadBuffer(download);
  const backup = JSON.parse(backupBuffer.toString('utf8')) as {
    schemaVersion: number;
    data: Record<'attempts' | 'sessions' | 'progresses' | 'legacyProgresses' | 'notes' | 'collections' | 'settings' | 'mockExams', unknown[]>;
  };
  expect(backup.schemaVersion).toBe(3);
  expect(backup.data.attempts).toHaveLength(1);
  expect(backup.data.sessions).toHaveLength(1);
  expect(backup.data.progresses).toHaveLength(1);
  expect(backup.data.legacyProgresses).toHaveLength(0);
  expect(backup.data.notes).toHaveLength(1);
  expect(backup.data.collections).toHaveLength(1);
  expect(backup.data.mockExams).toHaveLength(0);

  const restoreDialogPromise = page.waitForEvent('dialog');
  const restoreInputPromise = page.locator('input[type="file"]').nth(1).setInputFiles({
    name: download.suggestedFilename(),
    mimeType: 'application/json',
    buffer: backupBuffer,
  });
  const restoreDialog = await restoreDialogPromise;
  expect(restoreDialog.type()).toBe('confirm');
  expect(restoreDialog.message()).toContain('替换当前浏览器');
  await restoreDialog.accept();
  await restoreInputPromise;
  await expect(page.getByRole('status')).toHaveText('备份已恢复');
  await expect(page.locator('.data-summary article').nth(1)).toContainText('作答记录1');
  await expect(page.locator('.data-summary article').nth(2)).toContainText('个人笔记1');
});

test('validates and persists a comprehensive practice self score', async ({ page }, testInfo) => {
  const questionId = 'cn408-2009-q41';
  await page.goto('/questions');
  await page.getByRole('button', { name: '开始第 41 题', exact: true }).click();
  await expect(page.locator('.practice-topbar strong')).toContainText('第 41 题');

  await page.getByLabel('作答草稿').fill('Dijkstra 反例分析草稿');
  await page.getByRole('button', { name: '查看参考答案' }).click();
  const selfScore = page.getByRole('spinbutton', { name: '自评分' });
  const submit = page.getByRole('button', { name: '完成自评' });
  await expect(selfScore).toBeVisible();
  await expect(submit).toBeDisabled();

  for (const invalidScore of ['-1', '11']) {
    await selfScore.fill(invalidScore);
    await expect(selfScore).toHaveAttribute('aria-invalid', 'true');
    await expect(page.getByRole('alert')).toContainText('请输入 0 到 10 之间的分数');
    await expect(submit).toBeDisabled();
    await expect.poll(async () => {
      const sessions = await readStore(page, 'sessions');
      const session = sessions.find((entry) => (
        entry as { questionIds?: string[] }
      ).questionIds?.includes(questionId)) as { responses?: Record<string, { selfScore?: number }> } | undefined;
      return session?.responses?.[questionId]?.selfScore;
    }).toBeUndefined();
  }
  if (testInfo.project.name === 'chromium-390') {
    const mobileViewportContract = await page.locator('.app-shell').evaluate((shell) => {
      const practiceShell = shell.querySelector('.practice-shell');
      return {
        appMinHeight: getComputedStyle(shell).minHeight,
        practiceMinHeight: practiceShell ? getComputedStyle(practiceShell).minHeight : null,
      };
    });
    expect(mobileViewportContract).toEqual({ appMinHeight: '0px', practiceMinHeight: '100%' });
    const [scoreBox, errorBox, actionsBox, mobileNavBox] = await Promise.all([
      selfScore.boundingBox(),
      page.getByRole('alert').boundingBox(),
      page.locator('.answer-actions').boundingBox(),
      page.locator('.mobile-nav').boundingBox(),
    ]);
    expect(scoreBox).not.toBeNull();
    expect(errorBox).not.toBeNull();
    expect(actionsBox).not.toBeNull();
    expect(mobileNavBox).not.toBeNull();
    expect(Math.max(
      scoreBox!.y + scoreBox!.height,
      errorBox!.y + errorBox!.height,
    )).toBeLessThanOrEqual(actionsBox!.y);
    expect(actionsBox!.y + actionsBox!.height).toBeLessThanOrEqual(mobileNavBox!.y);
  }
  await capture(page, testInfo, 'practice-comprehensive-invalid-score');

  await selfScore.fill('');
  await expect(selfScore).toHaveAttribute('aria-invalid', 'false');
  await expect(page.getByText('请输入 0 到 10 之间的分数')).toHaveCount(0);
  await expect(submit).toBeDisabled();

  await selfScore.fill('10');
  await expect(selfScore).toHaveAttribute('aria-invalid', 'false');
  await expect.poll(async () => {
    const sessions = await readStore(page, 'sessions');
    const session = sessions.find((entry) => (
      entry as { questionIds?: string[] }
    ).questionIds?.includes(questionId)) as { responses?: Record<string, { selfScore?: number }> } | undefined;
    return session?.responses?.[questionId]?.selfScore;
  }).toBe(10);
  await expect(submit).toBeEnabled();
  await submit.click();

  await expect(page.locator('.answer-status')).toContainText('自评 10 分');
  await expect(page.locator('.palette-heading strong')).toHaveText('1/1');
  const [sessions, attempts] = await Promise.all([
    readStore(page, 'sessions'),
    readStore(page, 'attempts'),
  ]);
  expect(sessions).toContainEqual(expect.objectContaining({
    questionIds: [questionId],
    submittedQuestionIds: [questionId],
    responses: { [questionId]: expect.objectContaining({ selfScore: 10 }) },
  }));
  expect(attempts).toContainEqual(expect.objectContaining({
    questionId,
    correct: null,
    score: 10,
    response: expect.objectContaining({ selfScore: 10 }),
  }));
  await capture(page, testInfo, 'practice-comprehensive-submitted');
});

test('protects a practice session across tabs and keeps a remotely completed session read-only', async ({ page }, testInfo) => {
  await page.goto('/questions');
  await page.getByRole('button', { name: '开始第 1 题', exact: true }).click();
  await expect(page.locator('.practice-topbar strong')).toContainText('第 1 题');
  const sessionPath = new URL(page.url()).pathname;
  const sessionId = sessionPath.split('/').at(-1)!;
  const peer = await page.context().newPage();

  try {
    await peer.goto(sessionPath);
    await expect(peer.locator('.practice-topbar strong')).toContainText('第 1 题');

    await page.locator('.option-list button').nth(0).click();
    await page.getByRole('button', { name: '提交答案' }).click();
    await expect(page.locator('.answer-status')).toContainText('回答错误');

    await peer.locator('.option-list button').nth(1).click();
    await expect(peer.getByRole('alert')).toContainText('另一标签页已更新此练习');
    await expect(peer.locator('.option-list button').nth(1)).toHaveClass(/selected/);
    await expect(peer.locator('.option-list button').nth(1)).toBeDisabled();
    await capture(peer, testInfo, 'practice-cross-tab-conflict');

    await peer.getByRole('button', { name: '重新读取最新进度' }).click();
    await expect(peer.getByRole('button', { name: '重新读取最新进度' })).toHaveCount(0);
    await expect(peer.locator('.option-list button').nth(0)).toHaveClass(/selected/);
    await expect(peer.locator('.answer-status')).toContainText('回答错误');

    await page.getByRole('button', { name: '结束', exact: true }).click();
    await expect(page.getByRole('heading', { name: '学习统计' })).toBeVisible();

    await peer.getByRole('button', { name: '结束', exact: true }).click();
    await expect(peer.getByRole('alert')).toContainText('另一标签页已更新此练习');
    await peer.getByRole('button', { name: '重新读取最新进度' }).click();
    await expect(peer.getByRole('alert')).toContainText('练习已结束');
    await expect(peer.getByRole('button', { name: '结束', exact: true })).toBeDisabled();
    await expect(peer.locator('.palette-grid button')).toBeDisabled();
    await expect(peer.getByRole('button', { name: '练习已结束' })).toBeDisabled();
    await capture(peer, testInfo, 'practice-completed-readonly');

    const [sessions, attempts] = await Promise.all([
      readStore(peer, 'sessions'),
      readStore(peer, 'attempts'),
    ]);
    expect(sessions).toContainEqual(expect.objectContaining({
      id: sessionId,
      responses: { [firstQuestionId]: { type: 'choice', optionId: 'A' } },
      submittedQuestionIds: [firstQuestionId],
      completedAt: expect.any(String),
    }));
    expect(attempts.filter((entry) => (entry as { sessionId?: string }).sessionId === sessionId)).toEqual([
      expect.objectContaining({
        questionId: firstQuestionId,
        response: { type: 'choice', optionId: 'A' },
      }),
    ]);
  } finally {
    await peer.close();
  }
});

test('imports a v1 backup into versioned stores without guessing legacy progress', async ({ page }) => {
  await page.goto('/settings');
  const timestamp = '2026-08-16T00:00:00.000Z';
  const questionId = 'cn408-2009-q01';
  const v1Backup = {
    schemaVersion: 1,
    exportedAt: timestamp,
    appVersion: '0.1.0',
    data: {
      attempts: [{
        id: 'e2e-v1-attempt',
        questionId,
        questionContentVersion: '2009.1',
        sessionId: 'e2e-v1-session',
        mode: 'practice',
        response: { type: 'choice', optionId: 'A' },
        correct: true,
        score: 1,
        startedAt: timestamp,
        submittedAt: timestamp,
        durationMs: 1000,
      }],
      sessions: [{
        id: 'e2e-v1-session',
        mode: 'practice',
        questionIds: [questionId],
        currentIndex: 0,
        responses: { [questionId]: { type: 'choice', optionId: 'A' } },
        submittedQuestionIds: [questionId],
        startedAt: timestamp,
        updatedAt: timestamp,
      }],
      progresses: [{
        questionId,
        mastery: 'mastered',
        attemptCount: 1,
        correctCount: 1,
        wrongCount: 0,
        consecutiveCorrect: 1,
        lastCorrect: true,
        lastAttemptAt: timestamp,
      }],
      notes: [],
      collections: [],
      settings: [],
    },
  };
  const restoreDialogPromise = page.waitForEvent('dialog');
  const restoreInputPromise = page.locator('input[type="file"]').nth(1).setInputFiles({
    name: 'legacy-v1.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(v1Backup)),
  });
  const restoreDialog = await restoreDialogPromise;
  expect(restoreDialog.type()).toBe('confirm');
  expect(restoreDialog.message()).toContain('替换当前浏览器');
  await restoreDialog.accept();
  await restoreInputPromise;
  await expect(page.getByRole('status')).toHaveText('备份已恢复');

  const sessions = await readStore(page, 'sessions');
  expect(sessions).toContainEqual(expect.objectContaining({
    id: 'e2e-v1-session',
    questionContentVersions: { [questionId]: '2009.1' },
  }));
  const activeProgress = await readStore(page, 'versionedProgresses');
  expect(activeProgress).toContainEqual(expect.objectContaining({
    questionId,
    questionContentVersion: '2009.1',
    attemptCount: 1,
  }));
  const legacyProgress = await readStore(page, 'progresses');
  expect(legacyProgress).toContainEqual(expect.objectContaining({ questionId, mastery: 'mastered' }));
});

test('blocks recovery of legacy or mismatched session snapshots', async ({ page }) => {
  await page.goto('/questions');
  await expect(page.getByRole('heading', { name: '真题浏览' })).toBeVisible();
  const baseSession = {
    mode: 'practice',
    questionIds: [firstQuestionId],
    currentIndex: 0,
    responses: {},
    submittedQuestionIds: [],
    startedAt: '2026-08-16T00:00:00.000Z',
    updatedAt: '2026-08-16T00:00:01.000Z',
  };
  await putStore(page, 'sessions', {
    ...baseSession,
    id: 'e2e-legacy-session',
    questionContentVersions: { [firstQuestionId]: '__legacy_unversioned__' },
  });
  await page.goto('/practice/e2e-legacy-session');
  await expect(page.getByRole('heading', { name: '无法恢复练习' })).toBeVisible();
  await expect(page.getByRole('alert')).toContainText(/题面版本未知|legacy version/iu);
  await expect(page.getByText('栈和队列')).not.toBeVisible();

  await putStore(page, 'sessions', {
    ...baseSession,
    id: 'e2e-mismatch-session',
    questionContentVersions: { [firstQuestionId]: '2009.0-stale' },
  });
  await page.goto('/practice/e2e-mismatch-session');
  await expect(page.getByRole('heading', { name: '无法恢复练习' })).toBeVisible();
  await expect(page.getByRole('alert')).toContainText(/题面版本不一致|mismatch/iu);
  await expect(page.getByText('栈和队列')).not.toBeVisible();
});
