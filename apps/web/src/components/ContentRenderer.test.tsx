import type { AssetRef, ContentBlock } from '@408os/domain';
import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ContentRenderer } from './ContentRenderer';

const study = vi.hoisted(() => ({ assets: new Map<string, AssetRef>() }));

vi.mock('../app/StudyContext', () => ({
  useStudy: () => study,
}));

const asset: AssetRef = {
  id: 'cn408-2010/source-questions-page-2',
  path: '/content/2010/source/questions-2.png',
  mimeType: 'image/png',
  sha256: 'a'.repeat(64),
  sourcePage: 2,
  width: 1_000,
  height: 2_000,
};

describe('ContentRenderer assets', () => {
  afterEach(cleanup);

  beforeEach(() => {
    study.assets.clear();
  });

  it('uses the registered asset path without assuming a year', () => {
    study.assets.set(asset.id, asset);
    render(<ContentRenderer blocks={[{ type: 'image', assetId: asset.id, alt: '2010 年原卷' }]} />);

    const image = screen.getByRole('img', { name: '2010 年原卷' });
    expect(image).toHaveAttribute('src', asset.path);
    fireEvent.error(image);
    expect(screen.getByRole('alert')).toHaveTextContent('图片资源不可用：2010 年原卷');
  });

  it('shows an accessible error when an image asset is missing', () => {
    render(<ContentRenderer blocks={[{ type: 'image', assetId: 'missing', alt: '缺失图示' }]} />);

    expect(screen.getByRole('alert')).toHaveTextContent('图片资源不可用：缺失图示');
  });

  it('renders a normalized crop when source dimensions are available', () => {
    study.assets.set(asset.id, asset);
    const blocks: ContentBlock[] = [{
      type: 'image',
      assetId: asset.id,
      alt: '裁切图示',
      crop: { x: 0.1, y: 0.2, width: 0.4, height: 0.25 },
    }];
    const { container } = render(<ContentRenderer blocks={blocks} compact />);

    const crop = container.querySelector('.source-inline-crop');
    const image = screen.getByRole('img', { name: '裁切图示' });
    expect(crop).toHaveStyle({ overflow: 'hidden' });
    expect(crop).toHaveStyle({ width: 'min(100%, 240px)', margin: '8px auto' });
    expect(image).toHaveAttribute('loading', 'eager');
    expect(image).toHaveAttribute('src', asset.path);
    expect(image).toHaveStyle({ left: '-25%', top: '-80%', width: '250%' });
  });
});
