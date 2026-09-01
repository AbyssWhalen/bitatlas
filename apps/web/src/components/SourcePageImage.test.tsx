import type { AssetRef } from '@408os/domain';
import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SourcePageImage } from './SourcePageImage';

const study = vi.hoisted(() => ({ assets: new Map<string, AssetRef>() }));

vi.mock('../app/StudyContext', () => ({
  useStudy: () => study,
}));

const pageAsset: AssetRef = {
  id: 'cn408-2010-source-questions-page-2',
  path: '/content/cn408-2010/source/scanned-question-page.png',
  mimeType: 'image/png',
  sha256: 'a'.repeat(64),
  sourcePage: 2,
};

describe('SourcePageImage', () => {
  afterEach(cleanup);

  beforeEach(() => {
    study.assets.clear();
  });

  it('renders the registered path and preserves the supplied alt text', () => {
    study.assets.set(pageAsset.id, pageAsset);
    render(<SourcePageImage packId="cn408-2010" document="questions" page={2} alt="2010 原卷第 2 页" />);

    expect(screen.getByRole('img', { name: '2010 原卷第 2 页' })).toHaveAttribute('src', pageAsset.path);
  });

  it('reports a missing source page without constructing a fallback URL', () => {
    render(<SourcePageImage packId="cn408-2011" document="answers" page={3} alt="2011 解析第 3 页" />);

    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('来源图片未登记：2011 解析第 3 页');
  });

  it('rejects registered assets that are not images', () => {
    study.assets.set(pageAsset.id, { ...pageAsset, mimeType: 'application/pdf' });
    render(<SourcePageImage packId="cn408-2010" document="questions" page={2} alt="2010 原卷第 2 页" />);

    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('来源资源不是图片：2010 原卷第 2 页');
  });

  it('replaces an image with an accessible error after loading fails', () => {
    study.assets.set(pageAsset.id, pageAsset);
    render(<SourcePageImage packId="cn408-2010" document="questions" page={2} alt="2010 原卷第 2 页" />);

    fireEvent.error(screen.getByRole('img', { name: '2010 原卷第 2 页' }));
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('来源图片加载失败：2010 原卷第 2 页');
  });
});
