import {
  getDocument as loadDocument,
  GlobalWorkerOptions,
} from 'pdfjs-dist';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { PDF_JS_CACHE_NAME } from './pdf-cache';

type DocumentInitOptions = NonNullable<Parameters<typeof loadDocument>[0]>;

GlobalWorkerOptions.workerSrc = workerUrl;

let workerCachePromise: Promise<void> | undefined;

const baseUrl = import.meta.env.BASE_URL.endsWith('/')
  ? import.meta.env.BASE_URL
  : `${import.meta.env.BASE_URL}/`;

export const PDF_CANVAS_LIMITS = Object.freeze({
  maxEdge: 8_192,
  maxPixels: 16_777_216,
});

export const PDF_RESOURCE_URLS = Object.freeze({
  cMapUrl: `${baseUrl}pdfjs/cmaps/`,
  standardFontDataUrl: `${baseUrl}pdfjs/standard_fonts/`,
  wasmUrl: `${baseUrl}pdfjs/wasm/`,
});

async function cacheWorkerForOfflineReuse(): Promise<void> {
  if (typeof globalThis.caches === 'undefined') return;
  const cache = await globalThis.caches.open(PDF_JS_CACHE_NAME);
  if (await cache.match(workerUrl)) return;
  await cache.add(workerUrl);
}

async function prepareWorkerCache(): Promise<void> {
  workerCachePromise ??= cacheWorkerForOfflineReuse();
  const pending = workerCachePromise;
  try {
    await pending;
  } catch {
    if (workerCachePromise === pending) workerCachePromise = undefined;
  }
}

export async function getDocument(options: DocumentInitOptions = {}) {
  await prepareWorkerCache();
  return loadDocument({
    cMapPacked: true,
    cMapUrl: PDF_RESOURCE_URLS.cMapUrl,
    standardFontDataUrl: PDF_RESOURCE_URLS.standardFontDataUrl,
    wasmUrl: PDF_RESOURCE_URLS.wasmUrl,
    canvasMaxAreaInBytes: PDF_CANVAS_LIMITS.maxPixels * 4,
    ...options,
  });
}

export function constrainCanvasOutputScale(
  viewportWidth: number,
  viewportHeight: number,
  desiredScale: number,
): number {
  if (
    !Number.isFinite(viewportWidth) || viewportWidth <= 0 ||
    !Number.isFinite(viewportHeight) || viewportHeight <= 0 ||
    !Number.isFinite(desiredScale) || desiredScale <= 0
  ) {
    throw new RangeError('PDF viewport dimensions and output scale must be finite positive numbers.');
  }

  const edgeScale = Math.min(
    PDF_CANVAS_LIMITS.maxEdge / viewportWidth,
    PDF_CANVAS_LIMITS.maxEdge / viewportHeight,
  );
  const pixelScale = Math.sqrt(
    PDF_CANVAS_LIMITS.maxPixels / (viewportWidth * viewportHeight),
  );
  return Math.min(desiredScale, edgeScale, pixelScale);
}

export type { PDFDocumentLoadingTask, PDFDocumentProxy } from 'pdfjs-dist';
