import { expect, type Page } from '@playwright/test';

export async function openModule(page: Page, module: string, question: number, tab: string) {
  const url = `/lab/network?module=${module}&preset=cn408-2009-q${question}`;
  await page.goto(url);
  const navigation = page.getByRole('navigation', { name: '计算机网络实验模块' });
  await expect(navigation.getByRole('link')).toHaveCount(8);
  await expect(navigation.getByRole('link', { name: tab, exact: true })).toHaveAttribute('aria-current', 'page');
  await expect(page.locator('.lab-exhibit-canvas')).toHaveAttribute('data-exhibit-canvas', 'dark');
  return url;
}

export async function checkTraceAndLinks(page: Page, question: number, url: string) {
  const count = page.locator('.lab-exhibit-steps .step-transport > span');
  await expect(count).toHaveText(/^1 \/ \d+$/);
  await page.getByRole('button', { name: '下一步' }).click();
  await expect(count).toHaveText(/^2 \/ \d+$/);
  await page.getByRole('button', { name: '复位步骤' }).click();
  await expect(count).toHaveText(/^1 \/ \d+$/);
  if (page.viewportSize()?.width === 390) {
    const [event, steps, canvas] = await Promise.all(['status', 'steps', 'canvas'].map(slot => page.locator(`.lab-exhibit-${slot}`).boundingBox()));
    expect(event!.y + event!.height).toBeLessThanOrEqual(steps!.y + 1);
    expect(steps!.y + steps!.height).toBeLessThanOrEqual(canvas!.y + 1);
    expect(steps!.height).toBeLessThan(430);
  }
  await page.getByRole('button', { name: '查看知识节点' }).click();
  await expect(page).toHaveURL(new RegExp(`subject=computer-networks&node=topic-2009-q${question}$`));
  await page.getByRole('button', { name: '打开对应实验' }).click();
  await expect(page).toHaveURL(url);
  await page.getByRole('button', { name: `练习 2009 · Q${question}` }).click();
  await expect(page.locator('.practice-topbar strong')).toContainText(`第 ${question} 题`);
}
