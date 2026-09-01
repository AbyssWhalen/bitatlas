import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { LazyContentRenderer } from './LazyContentRenderer';

vi.mock('./ContentRenderer', () => new Promise(() => {}));

describe('LazyContentRenderer', () => {
  afterEach(cleanup);

  it('keeps structured content readable while the heavy renderer is loading', () => {
    render(<LazyContentRenderer blocks={[{ type: 'text', text: '可立即阅读的题干' }]} compact />);

    expect(screen.getByText('可立即阅读的题干')).toBeVisible();
    expect(screen.getByText('可立即阅读的题干').parentElement).toHaveAttribute('aria-busy', 'true');
    expect(screen.getByText('可立即阅读的题干').parentElement).toHaveClass('compact');
  });
});
