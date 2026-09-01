import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  BACKUP_DOWNLOAD_PREFIX,
  CONTENT_REVIEW_DOWNLOAD_PREFIX,
  PRODUCT_DESCRIPTION,
  PRODUCT_NAME,
  PRODUCT_SHORT_NAME,
} from './brand';

describe('public release brand', () => {
  it('uses a durable display name without an exam number', () => {
    expect(PRODUCT_NAME).toBe('BitAtlas');
    expect(PRODUCT_SHORT_NAME).toBe('BitAtlas');
    expect(PRODUCT_NAME).not.toContain('408');
    expect(PRODUCT_DESCRIPTION).toContain('local-first');
    expect(BACKUP_DOWNLOAD_PREFIX).toBe('bitatlas-backup');
    expect(CONTENT_REVIEW_DOWNLOAD_PREFIX).toBe('bitatlas-content-review');
  });

  it('keeps the static document and PWA metadata on the public brand', () => {
    const webRoot = path.join(process.cwd(), 'apps', 'web');
    const html = readFileSync(path.join(webRoot, 'index.html'), 'utf8');
    const viteConfig = readFileSync(path.join(webRoot, 'vite.config.ts'), 'utf8');
    const favicon = readFileSync(path.join(webRoot, 'public', 'favicon.svg'), 'utf8');

    expect(html).toContain(`<title>${PRODUCT_NAME}</title>`);
    expect(html).toContain(`content="${PRODUCT_DESCRIPTION}"`);
    expect(html).not.toContain('<title>408OS</title>');
    expect(html).not.toContain('研径 408');
    expect(viteConfig).toContain('name: PRODUCT_NAME');
    expect(viteConfig).toContain('short_name: PRODUCT_SHORT_NAME');
    expect(favicon).toContain('aria-label="BitAtlas logo"');
    expect(favicon).toContain('data-mark="atlas-route"');
    expect(favicon).not.toContain('<text');
  });
});
