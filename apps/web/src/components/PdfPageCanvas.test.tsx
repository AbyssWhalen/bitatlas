import '@testing-library/jest-dom/vitest';
import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { PDFDocumentProxy } from '../app/pdf-runtime';
import { PDF_CANVAS_LIMITS } from '../app/pdf-runtime';
import { PdfPageCanvas } from './PdfPageCanvas';

vi.mock('pdfjs-dist', () => ({
  getDocument: vi.fn(),
  GlobalWorkerOptions: { workerSrc: '' },
}));

class ResizeObserverStub {
  observe() {}
  disconnect() {}
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, reject, resolve };
}

describe('PdfPageCanvas', () => {
  beforeEach(() => {
    vi.stubGlobal('ResizeObserver', ResizeObserverStub);
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({} as CanvasRenderingContext2D);
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('limits a pathological page to the backing-store pixel budget', async () => {
    const page = {
      cleanup: vi.fn(),
      getViewport: vi.fn(({ scale }: { scale: number }) => ({
        width: 20_000 * scale,
        height: 10_000 * scale,
      })),
      render: vi.fn(() => ({ cancel: vi.fn(), promise: Promise.resolve() })),
    };
    const document = { getPage: vi.fn(async () => page) } as unknown as PDFDocumentProxy;

    render(<PdfPageCanvas document={document} pageNumber={1} fitWidth={false} zoom={200} />);

    await waitFor(() => expect(screen.queryByRole('status')).not.toBeInTheDocument());
    const canvas = screen.getByRole('img', { name: 'PDF 第 1 页' }) as HTMLCanvasElement;
    expect(canvas.width).toBeLessThanOrEqual(PDF_CANVAS_LIMITS.maxEdge);
    expect(canvas.height).toBeLessThanOrEqual(PDF_CANVAS_LIMITS.maxEdge);
    expect(canvas.width * canvas.height).toBeLessThanOrEqual(PDF_CANVAS_LIMITS.maxPixels);
  });

  it('cancels an active render and cleans the page after cancellation settles', async () => {
    const renderResult = deferred<void>();
    const cancel = vi.fn(() => renderResult.reject(Object.assign(new Error('cancelled'), {
      name: 'RenderingCancelledException',
    })));
    const page = {
      cleanup: vi.fn(),
      getViewport: vi.fn(({ scale }: { scale: number }) => ({ width: 600 * scale, height: 800 * scale })),
      render: vi.fn(() => ({ cancel, promise: renderResult.promise })),
    };
    const document = { getPage: vi.fn(async () => page) } as unknown as PDFDocumentProxy;
    const view = render(<PdfPageCanvas document={document} pageNumber={1} fitWidth={false} zoom={100} />);
    await waitFor(() => expect(page.render).toHaveBeenCalledOnce());

    await act(async () => {
      view.unmount();
      await renderResult.promise.catch(() => undefined);
    });

    expect(cancel).toHaveBeenCalledOnce();
    expect(page.cleanup).toHaveBeenCalledOnce();
  });

  it('cleans a completed page when navigating to another page', async () => {
    const firstPage = {
      cleanup: vi.fn(),
      getViewport: vi.fn(({ scale }: { scale: number }) => ({ width: 600 * scale, height: 800 * scale })),
      render: vi.fn(() => ({ cancel: vi.fn(), promise: Promise.resolve() })),
    };
    const secondPage = {
      ...firstPage,
      cleanup: vi.fn(),
      render: vi.fn(() => ({ cancel: vi.fn(), promise: Promise.resolve() })),
    };
    const document = {
      getPage: vi.fn(async (pageNumber: number) => pageNumber === 1 ? firstPage : secondPage),
    } as unknown as PDFDocumentProxy;
    const view = render(<PdfPageCanvas document={document} pageNumber={1} fitWidth={false} zoom={100} />);
    await waitFor(() => expect(screen.queryByRole('status')).not.toBeInTheDocument());

    view.rerender(<PdfPageCanvas document={document} pageNumber={2} fitWidth={false} zoom={100} />);

    await waitFor(() => expect(firstPage.cleanup).toHaveBeenCalledOnce());
    view.unmount();
    await waitFor(() => expect(secondPage.cleanup).toHaveBeenCalledOnce());
  });
});
