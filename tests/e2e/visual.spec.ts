import path from 'node:path';
import { mkdir } from 'node:fs/promises';
import { expect, test, type Page, type TestInfo } from '@playwright/test';
import { createTwoPagePdf } from './pdf-fixture';

const screenshotRoot = path.resolve('output', 'playwright', 'screenshots');

async function capture(page: Page, testInfo: TestInfo, name: string, fullPage = true) {
  await mkdir(screenshotRoot, { recursive: true });
  await page.screenshot({
    path: path.join(screenshotRoot, `${testInfo.project.name}-${name}.png`),
    fullPage,
    animations: 'disabled',
  });
}

async function expectNoPageOverflow(page: Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(1);
}

async function openQuestions(page: Page) {
  await page.goto('/questions');
  await expect(page.locator('.question-row')).toHaveCount(47);
  await expectNoPageOverflow(page);
}

async function startQuestion(page: Page, number: number) {
  await openQuestions(page);
  await page.getByRole('button', { name: `开始第 ${number} 题`, exact: true }).click();
  await expect(page.locator('.practice-topbar strong')).toContainText(`第 ${number} 题`);
}

test.describe('visual acceptance', () => {
  test.describe.configure({ mode: 'serial' });

  test('captures dashboard, question browsing, and statistics without overflow', async ({ page }, testInfo) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: '学习总览' })).toBeVisible();
    await expectNoPageOverflow(page);
    await capture(page, testInfo, 'dashboard');

    await openQuestions(page);
    await capture(page, testInfo, 'questions', false);

    await page.goto('/stats');
    await expect(page.getByRole('heading', { name: '学习统计' })).toBeVisible();
    await expect(page.locator('.heatmap span')).toHaveCount(84);
    await expectNoPageOverflow(page);
    await capture(page, testInfo, 'stats', false);
  });

  test('renders a nonblank knowledge graph and accessible topic index', async ({ page }, testInfo) => {
    await page.goto('/knowledge');
    await expect(page.getByRole('heading', { name: '知识证据图' })).toBeVisible();
    await expect(page.locator('.knowledge-topic-list button')).toHaveCount(12);
    await expect(page.getByRole('button', {
      name: '数据结构科目总览',
      exact: true,
    })).toHaveAttribute('aria-pressed', 'true');
    const canvases = page.locator('.knowledge-graph-canvas canvas');
    await expect.poll(async () => canvases.count()).toBeGreaterThan(0);
    await expect.poll(() => canvases.evaluateAll((elements) => elements.some((element) => {
      const canvas = element as HTMLCanvasElement;
      const context = canvas.getContext('2d');
      if (!context || canvas.width === 0 || canvas.height === 0) return false;
      const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
      for (let index = 3; index < pixels.length; index += 16) {
        if (pixels[index] !== 0) return true;
      }
      return false;
    }))).toBe(true);
    await expectNoPageOverflow(page);
    await capture(page, testInfo, 'knowledge', false);

    await page.getByRole('region', { name: '科目选择' }).getByRole('button', { name: '操作系统', exact: true }).click();
    await page.locator('.knowledge-topic-list').getByRole('button', { name: /考查磁盘的调度算法/u }).click();
    await expect(page.locator('.knowledge-detail-panel').getByRole('heading', { name: '考查磁盘的调度算法' })).toBeVisible();
    await expect(page).toHaveURL((url) => (
      url.pathname === '/knowledge'
      && url.search === '?subject=operating-systems&node=topic-2009-q29'
    ));
    const overview = page.getByRole('button', {
      name: '操作系统科目总览',
      exact: true,
    });
    await expect(overview).toHaveAttribute('aria-pressed', 'false');
    await overview.focus();
    await expect(overview).toBeFocused();
    await expectNoPageOverflow(page);
    await capture(page, testInfo, 'knowledge-selected');
  });

  test('keeps all number-lab modes readable and inspectable', async ({ page }, testInfo) => {
    await page.goto('/lab');
    await expect(page.getByRole('heading', { name: 'CPU 可视化实验室' })).toBeVisible();
    await expect(page.locator('.radix-output-list')).toContainText('0xFF');
    await expectNoPageOverflow(page);
    await capture(page, testInfo, 'lab-radix', false);

    await page.getByRole('button', { name: '原码 / 反码 / 补码' }).click();
    await page.getByLabel('十进制真值').fill('-128');
    await expect(page.getByRole('img', { name: '补码: 10000000' })).toBeVisible();
    await expectNoPageOverflow(page);
    await capture(page, testInfo, 'lab-signed', false);

    await page.getByRole('button', { name: 'IEEE 754' }).click();
    await expect(page.locator('.ieee-field-strip')).toContainText('10000000000000000000000');
    await expectNoPageOverflow(page);
    await capture(page, testInfo, 'lab-float32', false);
  });

  test('keeps the RV32I bit ruler readable without page overflow', async ({ page }, testInfo) => {
    await page.goto('/lab');
    await page.getByRole('button', { name: 'RV32I 指令' }).click();
    await expect(page.getByRole('heading', { name: 'RV32I 指令编码' })).toBeVisible();
    await expect(page.locator('.riscv-result-code')).toContainText('0x003100b3');
    await expect(page.locator('.riscv-field-ruler [data-field]')).toHaveCount(6);
    await expectNoPageOverflow(page);
    await capture(page, testInfo, 'lab-rv32i', false);
  });

  test('renders the local PDF library and a nonblank reader canvas', async ({ page }, testInfo) => {
    await page.goto('/documents');
    await expect(page.getByRole('button', { name: '导入 PDF' })).toBeEnabled();
    await page.locator('input[type="file"]').setInputFiles({
      name: 'visual-check.pdf',
      mimeType: 'application/pdf',
      buffer: createTwoPagePdf(),
    });
    await expect(page.locator('.document-row')).toHaveCount(1);
    await expectNoPageOverflow(page);
    await capture(page, testInfo, 'document-library', false);

    await page.getByRole('button', { name: '阅读 visual-check.pdf' }).click();
    const canvas = page.locator('.pdf-page-canvas canvas');
    await expect(canvas).toBeVisible();
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
    await expectNoPageOverflow(page);
    await capture(page, testInfo, 'pdf-reader', false);
  });

  test('keeps the practice workspace and mobile navigation in separate layout regions', async ({ page }, testInfo) => {
    await startQuestion(page, 1);
    await expectNoPageOverflow(page);
    if (testInfo.project.name === 'chromium-390') {
      await expect(page.locator('.mobile-nav')).toHaveCSS('position', 'static');
      const [mainAreaBox, mobileNavBox] = await Promise.all([
        page.locator('.main-area').boundingBox(),
        page.locator('.mobile-nav').boundingBox(),
      ]);
      expect(mainAreaBox).not.toBeNull();
      expect(mobileNavBox).not.toBeNull();
      expect(mainAreaBox!.y + mainAreaBox!.height).toBeLessThanOrEqual(mobileNavBox!.y + 1);
    }
    await capture(page, testInfo, 'practice', false);
  });

  test('renders the schema v3 backup surface without overflow', async ({ page }, testInfo) => {
    await page.goto('/settings');
    await expect(page.getByRole('heading', { name: '数据管理' })).toBeVisible();
    const backupBand = page.locator('.backup-band').filter({ hasText: 'BACKUP V3' });
    await expect(backupBand).toBeVisible();
    await expectNoPageOverflow(page);
    await backupBand.scrollIntoViewIfNeeded();
    await capture(page, testInfo, 'settings-backup-v3', false);
  });

  test('renders nonblank source pages in the practice modal', async ({ page }, testInfo) => {
    await startQuestion(page, 1);
    await page.getByRole('button', { name: /原卷第/ }).click();
    const sourceImages = page.locator('.source-pages img');
    await expect(sourceImages).toHaveCount(2);
    await expect.poll(() => sourceImages.evaluateAll((images) => images.every((image) => {
      const source = image as HTMLImageElement;
      return source.complete && source.naturalWidth > 0 && source.naturalHeight > 0;
    }))).toBe(true);
    await expectNoPageOverflow(page);
    await capture(page, testInfo, 'source-modal', false);
  });

  test('renders all four Q4 source crops at inspectable dimensions', async ({ page }, testInfo) => {
    await startQuestion(page, 4);
    const croppedOptions = page.locator('.option-list .source-inline-crop');
    await expect(croppedOptions).toHaveCount(4);
    const croppedImages = croppedOptions.locator('img');
    for (let index = 0; index < await croppedImages.count(); index += 1) {
      const image = croppedImages.nth(index);
      await image.scrollIntoViewIfNeeded();
      await expect.poll(() => image.evaluate((element) => {
        const source = element as HTMLImageElement;
        return source.complete && source.naturalWidth > 0 && source.naturalHeight > 0;
      })).toBe(true);
    }
    const cropBoxes = await croppedOptions.evaluateAll((elements) => elements.map((element) => {
      const bounds = element.getBoundingClientRect();
      return { width: bounds.width, height: bounds.height };
    }));
    expect(cropBoxes.every(({ width, height }) => width >= 80 && height >= 60)).toBe(true);
    await expectNoPageOverflow(page);
    await capture(page, testInfo, 'q04-source-crops');
  });

  test('captures source, structured, and checklist review views', async ({ page }, testInfo) => {
    await page.goto('/review/2009?question=41');
    await expect(page.getByRole('heading', { name: '2009 内容复核' })).toBeVisible();
    await expect(page.getByRole('button', { name: /^第 \d+ 题/ })).toHaveCount(47);
    const reviewSourceImages = page.locator('.review-source-page img');
    expect(await reviewSourceImages.count()).toBeGreaterThan(0);
    await expect.poll(() => reviewSourceImages.evaluateAll((images) => images.every((image) => {
      const source = image as HTMLImageElement;
      return source.complete && source.naturalWidth > 0 && source.naturalHeight > 0;
    }))).toBe(true);
    await expectNoPageOverflow(page);
    await capture(page, testInfo, 'content-review-source', false);

    const structuredTab = page.getByRole('tab', { name: '结构化', includeHidden: true });
    if (await structuredTab.isVisible()) {
      await structuredTab.click();
      await expect(page.getByText('综合题', { exact: true }).first()).toBeVisible();
      await expectNoPageOverflow(page);
      await capture(page, testInfo, 'content-review-structured', false);

      await page.getByRole('tab', { name: '核对' }).click();
      await expect(page.getByRole('group', { name: '逐项核对' })).toBeVisible();
      await expectNoPageOverflow(page);
      await capture(page, testInfo, 'content-review-checklist', false);
    }
  });
});
