import { writeFile } from 'node:fs/promises';
import { expect, test, type Page } from '@playwright/test';

test.use({ serviceWorkers: 'allow' });

async function startQuestion(page: Page, number: number) {
  await page.goto('/questions');
  await expect(page.getByRole('heading', { name: '真题浏览' })).toBeVisible();
  await page.getByRole('button', { name: `开始第 ${number} 题`, exact: true }).click();
  await expect(page).toHaveURL(/\/practice\//);
  await expect(page.getByText(`第 ${number} 题`, { exact: false }).first()).toBeVisible();
}

async function answerFirstOption(page: Page) {
  const option = page.locator('.option-list > button').first();
  await option.click();
  await expect(option).toHaveClass(/selected/);
  await expect(page.getByRole('button', { name: /提交答案/ })).toBeEnabled();
  await page.getByRole('button', { name: /提交答案/ }).click();
  await expect(page.locator('.answer-panel')).toBeVisible();
}

async function storeCount(page: Page, storeName: string) {
  return page.evaluate((name) => new Promise<number>((resolve, reject) => {
    const request = indexedDB.open('408-user');
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const database = request.result;
      const transaction = database.transaction(name, 'readonly');
      const count = transaction.objectStore(name).count();
      count.onerror = () => reject(count.error);
      count.onsuccess = () => resolve(count.result);
      transaction.oncomplete = () => database.close();
    };
  }), storeName);
}

test('loads all 47 questions and filters the local content pack', async ({ page }) => {
  await page.goto('/questions');

  await expect(page.getByRole('heading', { name: '真题浏览' })).toBeVisible();
  await expect(page.locator('.question-row')).toHaveCount(47);
  await expect(page.getByRole('button', { name: '开始第 1 题', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: '开始第 47 题', exact: true })).toBeVisible();

  await page.getByPlaceholder('搜索题干、公式或题号').fill('打印机');
  await expect(page.locator('.question-row')).toHaveCount(2);
  await expect(page.locator('.question-row').first()).toContainText('缓冲区');
});

test('recovers from an expired practice link without hanging on the loading screen', async ({ page }) => {
  await page.goto('/practice/session-that-does-not-exist');

  await expect(page.getByRole('heading', { name: '无法恢复练习' })).toBeVisible();
  await expect(page.getByRole('alert')).toContainText('未找到练习会话');
  await page.getByRole('button', { name: '返回真题' }).click();
  await expect(page).toHaveURL(/\/questions$/);
  await expect(page.getByRole('heading', { name: '真题浏览' })).toBeVisible();
});

test('persists a draft across refresh and closes the wrong-question review loop', async ({ page }) => {
  await startQuestion(page, 1);

  const wrongOption = page.locator('.option-list > button').first();
  await wrongOption.click();
  await expect(wrongOption).toHaveClass(/selected/);
  await expect(page.locator('.option-list')).toHaveAttribute('aria-busy', 'false');

  await page.reload();
  await expect(page.locator('.option-list > button').first()).toHaveClass(/selected/);
  await page.getByRole('button', { name: /提交答案/ }).click();
  await expect(page.getByText('回答错误', { exact: true })).toBeVisible();
  await expect(page.getByText('正确选项 B', { exact: true })).toBeVisible();

  await page.getByRole('button', { name: '收藏' }).click();
  await expect(page.getByRole('button', { name: '取消收藏' })).toBeVisible();
  const note = page.getByPlaceholder('记录易错点');
  await note.fill('队列先进先出，打印缓冲区不能使用栈。');
  await note.blur();
  await expect.poll(() => storeCount(page, 'notes')).toBe(1);
  await page.getByRole('button', { name: '熟悉' }).click();

  await page.getByRole('link', { name: '错题' }).click();
  await expect(page.getByRole('heading', { name: '错题重练' })).toBeVisible();
  await expect(page.locator('.wrong-list .question-row')).toHaveCount(1);
  await page.getByRole('button', { name: '开始重练' }).click();
  await expect(page.getByPlaceholder('记录易错点')).toHaveValue('队列先进先出，打印缓冲区不能使用栈。');
  await expect(page.getByRole('button', { name: '取消收藏' })).toBeVisible();

  await page.getByRole('link', { name: '统计' }).click();
  await expect(page.getByRole('heading', { name: '学习统计' })).toBeVisible();
  await expect(page.locator('.metric-grid article').filter({ hasText: '有效作答' }).locator('strong')).toHaveText('1');
});

test('exports, rejects a damaged import, and restores a valid backup', async ({ page }, testInfo) => {
  await startQuestion(page, 1);
  await answerFirstOption(page);

  await page.getByRole('link', { name: '数据' }).click();
  const attemptCount = page.locator('.data-summary article').filter({ hasText: '作答记录' }).locator('strong');
  await expect(attemptCount).toHaveText('1');
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: '导出备份' }).click();
  const download = await downloadPromise;
  const backupPath = testInfo.outputPath('bitatlas-backup.json');
  await download.saveAs(backupPath);

  await startQuestion(page, 2);
  await answerFirstOption(page);
  await page.getByRole('link', { name: '数据' }).click();
  await expect(attemptCount).toHaveText('2');

  const invalidPath = testInfo.outputPath('invalid-backup.json');
  await writeFile(invalidPath, JSON.stringify({ schemaVersion: 1, data: {} }), 'utf8');
  const backupInput = page.locator('.backup-band').filter({ hasText: 'BACKUP V3' }).locator('input[type="file"]');
  const invalidDialogPromise = page.waitForEvent('dialog');
  const invalidInputPromise = backupInput.setInputFiles(invalidPath);
  const invalidDialog = await invalidDialogPromise;
  expect(invalidDialog.type()).toBe('confirm');
  expect(invalidDialog.message()).toContain('替换当前浏览器');
  await invalidDialog.accept();
  await invalidInputPromise;
  await expect(page.getByRole('status')).toContainText('Backup data is invalid');
  await expect(attemptCount).toHaveText('2');

  const validDialogPromise = page.waitForEvent('dialog');
  const validInputPromise = backupInput.setInputFiles(backupPath);
  const validDialog = await validDialogPromise;
  expect(validDialog.type()).toBe('confirm');
  expect(validDialog.message()).toContain('替换当前浏览器');
  await validDialog.accept();
  await validInputPromise;
  await expect(page.getByRole('status')).toHaveText('备份已恢复');
  await expect(attemptCount).toHaveText('1');
});

test('installs the PWA and reloads the question bank offline', async ({ page, context }) => {
  await page.goto('/questions');
  await expect(page.locator('.question-row')).toHaveCount(47);
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });

  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole('heading', { name: '真题浏览' })).toBeVisible();
  await expect(page.locator('.question-row')).toHaveCount(47);
});
