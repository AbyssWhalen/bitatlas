import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const pdfjs = vi.hoisted(() => ({
  getDocument: vi.fn((options: unknown) => options),
  workerOptions: { workerSrc: '' },
}));

vi.mock('pdfjs-dist', () => ({
  getDocument: pdfjs.getDocument,
  GlobalWorkerOptions: pdfjs.workerOptions,
}));

import {
  PDF_CANVAS_LIMITS,
  PDF_RESOURCE_URLS,
  constrainCanvasOutputScale,
} from './pdf-runtime';
import { PDF_JS_CACHE_NAME } from './pdf-cache';

beforeEach(() => {
  vi.clearAllMocks();
  vi.unstubAllGlobals();
  vi.resetModules();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('PDF runtime', () => {
  it('configures PDF.js and keeps online loading available without Cache Storage', async () => {
    vi.stubGlobal('caches', undefined);
    const { getDocument } = await import('./pdf-runtime');
    const data = new Uint8Array([1, 2, 3]);
    await getDocument({ data });

    expect(pdfjs.workerOptions.workerSrc).toMatch(/pdf\.worker\.min\.mjs/u);
    expect(pdfjs.getDocument).toHaveBeenCalledWith(expect.objectContaining({
      data,
      cMapPacked: true,
      cMapUrl: PDF_RESOURCE_URLS.cMapUrl,
      standardFontDataUrl: PDF_RESOURCE_URLS.standardFontDataUrl,
      wasmUrl: PDF_RESOURCE_URLS.wasmUrl,
      canvasMaxAreaInBytes: PDF_CANVAS_LIMITS.maxPixels * 4,
    }));
    expect(PDF_RESOURCE_URLS.cMapUrl).toMatch(/\/pdfjs\/cmaps\/$/u);
    expect(PDF_RESOURCE_URLS.standardFontDataUrl).toMatch(/\/pdfjs\/standard_fonts\/$/u);
    expect(PDF_RESOURCE_URLS.wasmUrl).toMatch(/\/pdfjs\/wasm\/$/u);
  });

  it('preserves explicit caller overrides', async () => {
    const { getDocument } = await import('./pdf-runtime');
    await getDocument({
      data: new Uint8Array([1]),
      cMapUrl: '/custom/cmaps/',
      useWasm: false,
    });

    expect(pdfjs.getDocument).toHaveBeenLastCalledWith(expect.objectContaining({
      cMapUrl: '/custom/cmaps/',
      useWasm: false,
    }));
  });

  it('writes a missing worker to the shared cache once across concurrent loads', async () => {
    let finishAdd: (() => void) | undefined;
    const cache = {
      match: vi.fn(async () => undefined),
      add: vi.fn(() => new Promise<void>((resolve) => { finishAdd = resolve; })),
    };
    const open = vi.fn(async () => cache);
    vi.stubGlobal('caches', { open });
    const { getDocument } = await import('./pdf-runtime');

    const first = getDocument({ data: new Uint8Array([1]) });
    const second = getDocument({ data: new Uint8Array([2]) });
    await vi.waitFor(() => expect(cache.add).toHaveBeenCalledTimes(1));
    finishAdd?.();
    await Promise.all([first, second]);

    expect(open).toHaveBeenCalledOnce();
    expect(open).toHaveBeenCalledWith(PDF_JS_CACHE_NAME);
    expect(cache.match).toHaveBeenCalledWith(expect.stringMatching(/pdf\.worker\.min\.mjs/u));
    expect(cache.add).toHaveBeenCalledWith(expect.stringMatching(/pdf\.worker\.min\.mjs/u));
    expect(pdfjs.getDocument).toHaveBeenCalledTimes(2);
  });

  it('reuses an existing worker cache entry without fetching it again', async () => {
    const cache = {
      match: vi.fn(async () => new Response('cached worker')),
      add: vi.fn(),
    };
    vi.stubGlobal('caches', { open: vi.fn(async () => cache) });
    const { getDocument } = await import('./pdf-runtime');

    await getDocument({ data: new Uint8Array([1]) });

    expect(cache.match).toHaveBeenCalledOnce();
    expect(cache.add).not.toHaveBeenCalled();
    expect(pdfjs.getDocument).toHaveBeenCalledOnce();
  });

  it('keeps online loading available after a cache failure and retries later', async () => {
    const cache = {
      match: vi.fn(async () => undefined),
      add: vi.fn(async () => undefined),
    };
    const open = vi.fn()
      .mockRejectedValueOnce(new Error('Cache Storage unavailable'))
      .mockResolvedValue(cache);
    vi.stubGlobal('caches', { open });
    const { getDocument } = await import('./pdf-runtime');

    await expect(getDocument({ data: new Uint8Array([1]) })).resolves.toBeDefined();
    await expect(getDocument({ data: new Uint8Array([2]) })).resolves.toBeDefined();

    expect(open).toHaveBeenCalledTimes(2);
    expect(cache.add).toHaveBeenCalledOnce();
    expect(pdfjs.getDocument).toHaveBeenCalledTimes(2);
  });

  it('keeps normal pages at the requested DPR', () => {
    expect(constrainCanvasOutputScale(595, 842, 2)).toBe(2);
  });

  it('caps both the longest backing-store edge and total pixels', () => {
    const outputScale = constrainCanvasOutputScale(20_000, 10_000, 2);
    const width = Math.floor(20_000 * outputScale);
    const height = Math.floor(10_000 * outputScale);

    expect(width).toBeLessThanOrEqual(PDF_CANVAS_LIMITS.maxEdge);
    expect(height).toBeLessThanOrEqual(PDF_CANVAS_LIMITS.maxEdge);
    expect(width * height).toBeLessThanOrEqual(PDF_CANVAS_LIMITS.maxPixels);
  });

  it('rejects invalid viewport dimensions before allocating a canvas', () => {
    expect(() => constrainCanvasOutputScale(Number.POSITIVE_INFINITY, 100, 2)).toThrow(RangeError);
    expect(() => constrainCanvasOutputScale(100, 0, 2)).toThrow(RangeError);
  });
});
