import { expect, test, type Page } from '@playwright/test';
import { createCjkStandardFontPdf, createTwoPagePdf } from './pdf-fixture';

test.use({ serviceWorkers: 'allow' });

async function expectCanvasNotBlank(page: Page) {
  const canvas = page.locator('.pdf-page-canvas canvas');
  await expect(canvas).toBeVisible({ timeout: 15_000 });
  await expect.poll(() => canvas.evaluate((element) => {
    const target = element as HTMLCanvasElement;
    const context = target.getContext('2d');
    if (!context || target.width === 0 || target.height === 0) return false;
    const pixels = context.getImageData(0, 0, target.width, target.height).data;
    for (let index = 0; index < pixels.length; index += 64) {
      if (pixels[index] < 245 || pixels[index + 1] < 245 || pixels[index + 2] < 245) return true;
    }
    return false;
  }), { timeout: 15_000 }).toBe(true);
}

test('imports, reads, resumes, renames and removes a local PDF', async ({ page }) => {
  await page.goto('/settings');
  await page.getByRole('button', { name: '打开本地资料库' }).click();
  await expect(page.getByRole('heading', { name: '本地资料库' })).toBeVisible();
  await expect(page.getByRole('button', { name: '导入 PDF' })).toBeEnabled();

  const pdf = createTwoPagePdf();
  await page.locator('input[type="file"]').setInputFiles({
    name: 'computer-architecture.pdf',
    mimeType: 'application/pdf',
    buffer: pdf,
  });
  await expect(page.locator('.document-row')).toHaveCount(1);
  await expect(page.locator('.document-row')).toContainText('computer-architecture.pdf');

  await page.getByRole('button', { name: '阅读 computer-architecture.pdf' }).click();
  await expect(page.getByRole('heading', { name: 'computer-architecture.pdf' })).toBeVisible();
  await expect(page.getByText('1 / 2', { exact: true })).toBeVisible({ timeout: 15_000 });
  await expectCanvasNotBlank(page);

  await page.getByRole('button', { name: '下一页' }).click();
  await expect(page.getByText('2 / 2', { exact: true })).toBeVisible();
  await expect(page).toHaveURL(/page=2/);
  await expectCanvasNotBlank(page);

  await page.getByRole('button', { name: '上一页' }).click();
  await expect(page.getByText('1 / 2', { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByText('1 / 2', { exact: true })).toBeVisible();
  await expectCanvasNotBlank(page);

  await page.getByRole('button', { name: '下一页' }).click();
  await expect(page.getByText('2 / 2', { exact: true })).toBeVisible();

  await page.getByRole('link', { name: '返回资料库' }).click();
  await page.getByRole('button', { name: '重命名 computer-architecture.pdf' }).click();
  await page.getByLabel('文档名称').fill('408 组成原理.pdf');
  await page.getByRole('button', { name: '保存名称' }).click();
  await expect(page.locator('.document-row')).toContainText('408 组成原理.pdf');

  await page.getByRole('button', { name: '阅读 408 组成原理.pdf' }).click();
  await expect(page.getByText('2 / 2', { exact: true })).toBeVisible();
  await expectCanvasNotBlank(page);
  await page.getByRole('link', { name: '返回资料库' }).click();

  page.on('dialog', (dialog) => dialog.accept());
  await page.getByRole('button', { name: '移除 408 组成原理.pdf' }).click();
  await expect(page.locator('.document-row')).toHaveCount(0);
  await expect(page.getByText('还没有本地 PDF')).toBeVisible();
});

test('reopens a stored PDF while offline and rejects fake PDF bytes', async ({ page, context }) => {
  await page.goto('/documents');
  await expect(page.getByRole('button', { name: '导入 PDF' })).toBeEnabled();
  await page.locator('input[type="file"]').setInputFiles({
    name: 'offline.pdf',
    mimeType: 'application/pdf',
    buffer: createTwoPagePdf(),
  });
  await page.getByRole('button', { name: '阅读 offline.pdf' }).click();
  await expectCanvasNotBlank(page);
  await page.evaluate(async () => navigator.serviceWorker.ready);

  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'offline.pdf' })).toBeVisible();
  await expectCanvasNotBlank(page);
  await context.setOffline(false);

  await page.getByRole('link', { name: '返回资料库' }).click();
  await expect(page.getByRole('button', { name: '导入 PDF' })).toBeEnabled();
  await page.locator('input[type="file"]').setInputFiles({
    name: 'fake.pdf',
    mimeType: 'application/pdf',
    buffer: Buffer.from('not a real PDF'),
  });
  await expect(page.getByRole('alert')).toContainText('PDF');
  await expect(page.locator('.document-row')).toHaveCount(1);
});

test('renders a non-embedded Chinese CID font and reopens it offline', async ({ page, context }, testInfo) => {
  const pdfResourceResponses: Array<{ status: number; url: string }> = [];
  page.on('response', (response) => {
    if (response.url().includes('/pdfjs/')) {
      pdfResourceResponses.push({ status: response.status(), url: response.url() });
    }
  });

  await page.goto('/documents');
  await page.locator('input[type="file"]').setInputFiles({
    name: 'cjk-standard-font.pdf',
    mimeType: 'application/pdf',
    buffer: createCjkStandardFontPdf(),
  });
  await page.getByRole('button', { name: '阅读 cjk-standard-font.pdf' }).click();
  await expectCanvasNotBlank(page);
  await expect.poll(() => pdfResourceResponses.some(({ url }) => (
    /\/pdfjs\/cmaps\/UniGB-UCS2-H\.bcmap$/u.test(url)
  ))).toBe(true);
  expect(pdfResourceResponses.every(({ status }) => status >= 200 && status < 400)).toBe(true);
  await page.screenshot({
    path: `output/playwright/screenshots/pdf-cjk-${testInfo.project.name}.png`,
    fullPage: true,
  });
  await page.evaluate(async () => navigator.serviceWorker.ready);

  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'cjk-standard-font.pdf' })).toBeVisible();
  await expectCanvasNotBlank(page);
  await context.setOffline(false);
});
