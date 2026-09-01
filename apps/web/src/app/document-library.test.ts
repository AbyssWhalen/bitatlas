import { createHash, webcrypto } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import {
  CacheDocumentLibrary,
  detectDocumentLibraryCapability,
  DocumentLibraryError,
} from './document-library';

function requestUrl(input: RequestInfo | URL): string {
  if (input instanceof Request) return input.url;
  if (input instanceof URL) return input.href;
  return new Request(input).url;
}

class MemoryCache {
  private readonly entries = new Map<string, Response>();
  failPut: ((url: string) => boolean) | undefined;
  failDelete: ((url: string) => boolean) | undefined;

  async match(input: RequestInfo | URL): Promise<Response | undefined> {
    return this.entries.get(requestUrl(input))?.clone();
  }

  async put(input: RequestInfo | URL, response: Response): Promise<void> {
    const url = requestUrl(input);
    if (this.failPut?.(url)) throw new Error('simulated put failure');
    this.entries.set(url, response.clone());
  }

  async delete(input: RequestInfo | URL): Promise<boolean> {
    const url = requestUrl(input);
    if (this.failDelete?.(url)) throw new Error('simulated delete failure');
    return this.entries.delete(url);
  }

  async keys(): Promise<readonly Request[]> {
    return [...this.entries.keys()].map((url) => new Request(url));
  }

  urls(): string[] {
    return [...this.entries.keys()].sort();
  }
}

function setup(now = '2026-08-07T00:00:00.000Z') {
  const cache = new MemoryCache();
  const cacheStorage = { open: async () => cache as unknown as Cache };
  const library = new CacheDocumentLibrary({
    cacheStorage,
    crypto: webcrypto as unknown as Crypto,
    now: () => now,
    origin: 'https://408os.test',
  });
  return { cache, cacheStorage, library };
}

const pdfBytes = (body = 'test') => new TextEncoder().encode(`%PDF-1.7\n${body}\n%%EOF`);
const pdfFile = (name = 'notes.pdf', body = 'test') => (
  new File([pdfBytes(body)], name, { type: 'application/pdf' })
);
const expectedId = (body = 'test') => `pdf-${createHash('sha256').update(pdfBytes(body)).digest('hex')}`;

function blobBuffer(blob: Blob): Promise<ArrayBuffer> {
  if (typeof blob.arrayBuffer === 'function') return blob.arrayBuffer();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener('load', () => {
      if (reader.result instanceof ArrayBuffer) resolve(reader.result);
      else reject(new Error('FileReader did not return an ArrayBuffer.'));
    });
    reader.addEventListener('error', () => reject(reader.error ?? new Error('FileReader failed.')));
    reader.readAsArrayBuffer(blob);
  });
}

describe('document library capability', () => {
  it('reports missing browser primitives without opening storage', () => {
    const { cacheStorage } = setup();
    expect(detectDocumentLibraryCapability({ cacheStorage, crypto: webcrypto as unknown as Crypto })).toEqual({
      supported: true,
    });
    expect(detectDocumentLibraryCapability({ cacheStorage: undefined, crypto: webcrypto as unknown as Crypto })).toEqual({
      supported: false,
      reason: 'cache-storage-unavailable',
    });
    expect(detectDocumentLibraryCapability({ cacheStorage, crypto: undefined })).toEqual({
      supported: false,
      reason: 'web-crypto-unavailable',
    });
  });
});

describe('CacheDocumentLibrary', () => {
  it('strictly rejects empty, non-PDF and invalid-header files before opening storage', async () => {
    const { cache, library } = setup();
    await expect(library.importPdf(new File([], 'empty.pdf', { type: 'application/pdf' })))
      .rejects.toMatchObject({ code: 'empty-file' });
    await expect(library.importPdf(new File([pdfBytes()], 'wrong.txt', { type: 'text/plain' })))
      .rejects.toMatchObject({ code: 'invalid-mime' });
    await expect(library.importPdf(new File([pdfBytes()], 'parameterized.pdf', { type: 'application/pdf;charset=utf-8' })))
      .rejects.toMatchObject({ code: 'invalid-mime' });
    await expect(library.importPdf(new File(['not a pdf'], 'fake.pdf', { type: 'application/pdf' })))
      .rejects.toMatchObject({ code: 'invalid-header' });
    expect(cache.urls()).toEqual([]);
  });

  it('rejects an oversized PDF before reading or opening storage', async () => {
    const { cache, cacheStorage } = setup();
    const library = new CacheDocumentLibrary({
      cacheStorage,
      crypto: webcrypto as unknown as Crypto,
      maxByteLength: 8,
      origin: 'https://408os.test',
    });
    const file = pdfFile();
    let read = false;
    Object.defineProperty(file, 'arrayBuffer', {
      value: async () => {
        read = true;
        return new ArrayBuffer(0);
      },
    });

    await expect(library.importPdf(file)).rejects.toMatchObject({ code: 'file-too-large' });
    expect(read).toBe(false);
    expect(cache.urls()).toEqual([]);
  });

  it('imports under a stable SHA-256 id and treats the same bytes as idempotent', async () => {
    const { cache, library } = setup();
    const first = await library.importPdf(pdfFile('first.pdf'));
    const second = await library.importPdf(pdfFile('renamed-before-import.pdf'));

    expect(first.id).toBe(expectedId());
    expect(second).toEqual(first);
    expect(await library.list()).toEqual([first]);
    expect(cache.urls()).toHaveLength(2);
    expect(cache.urls().every((url) => (
      url.startsWith(`https://408os.test/__408os_private__/document-library/v1/documents/${first.id}/`)
      && !url.includes('first.pdf')
    ))).toBe(true);

    const stored = await library.getBlob(first.id);
    expect(stored.type).toBe('application/pdf');
    expect(Array.from(new Uint8Array(await blobBuffer(stored)))).toEqual(Array.from(pdfBytes()));
    expect(Array.from(await library.getBytes(first.id))).toEqual(Array.from(pdfBytes()));
  });

  it('lists documents deterministically and persists rename and last-page updates', async () => {
    const { library } = setup();
    const first = await library.importPdf(pdfFile('Alpha.pdf', 'alpha'));
    const second = await library.importPdf(pdfFile('Beta.pdf', 'beta'));

    expect((await library.list()).map((document) => document.id)).toEqual([first.id, second.id].sort());
    await expect(library.rename(first.id, '  数据结构.pdf  ')).resolves.toMatchObject({
      id: first.id,
      name: '数据结构.pdf',
    });
    await expect(library.updateLastPage(first.id, 42)).resolves.toMatchObject({
      id: first.id,
      lastPage: 42,
    });
    expect(await library.get(first.id)).toMatchObject({ name: '数据结构.pdf', lastPage: 42 });
  });

  it('rejects non-canonical ids and invalid updates without touching cache entries', async () => {
    const { cache, library } = setup();
    const document = await library.importPdf(pdfFile());
    const before = cache.urls();

    await expect(library.getBlob('https://evil.example/document.pdf'))
      .rejects.toMatchObject({ code: 'invalid-id' });
    await expect(library.rename(document.id, '   ')).rejects.toMatchObject({ code: 'invalid-name' });
    await expect(library.updateLastPage(document.id, 0)).rejects.toMatchObject({ code: 'invalid-page' });
    await expect(library.updateLastPage(document.id, 1.5)).rejects.toMatchObject({ code: 'invalid-page' });
    expect(cache.urls()).toEqual(before);
  });

  it('removes both entries and reports an absent document clearly', async () => {
    const { cache, library } = setup();
    const document = await library.importPdf(pdfFile());

    await expect(library.remove(document.id)).resolves.toBe(true);
    expect(cache.urls()).toEqual([]);
    await expect(library.remove(document.id)).resolves.toBe(false);
    await expect(library.getBlob(document.id)).rejects.toMatchObject({ code: 'not-found' });
  });

  it('rolls back a new import when the metadata commit fails', async () => {
    const { cache, library } = setup();
    cache.failPut = (url) => url.endsWith('/metadata');

    await expect(library.importPdf(pdfFile())).rejects.toMatchObject({ code: 'storage-failure' });
    expect(cache.urls()).toEqual([]);
    expect(await library.list()).toEqual([]);
  });

  it('does not rewrite an existing idempotent import', async () => {
    const { cache, library } = setup();
    const document = await library.importPdf(pdfFile());
    cache.failPut = () => true;

    await expect(library.importPdf(pdfFile('same-bytes.pdf'))).resolves.toEqual(document);
    expect(await library.list()).toEqual([document]);
  });

  it('keeps previous metadata when rename or position persistence fails', async () => {
    const { cache, library } = setup();
    const document = await library.importPdf(pdfFile());
    cache.failPut = (url) => url.endsWith('/metadata');

    await expect(library.rename(document.id, 'changed.pdf')).rejects.toMatchObject({ code: 'storage-failure' });
    await expect(library.updateLastPage(document.id, 9)).rejects.toMatchObject({ code: 'storage-failure' });
    expect(await library.get(document.id)).toEqual(document);
  });

  it('preserves concurrent rename and page updates for the same document', async () => {
    const { library } = setup();
    const document = await library.importPdf(pdfFile());

    await Promise.all([
      library.rename(document.id, '并发更新.pdf'),
      library.updateLastPage(document.id, 37),
    ]);

    expect(await library.get(document.id)).toMatchObject({
      name: '并发更新.pdf',
      lastPage: 37,
    });
  });

  it('restores an existing entry when remove cannot delete all parts', async () => {
    const { cache, library } = setup();
    const document = await library.importPdf(pdfFile());
    cache.failDelete = (url) => url.endsWith('/bytes');

    await expect(library.remove(document.id)).rejects.toMatchObject({ code: 'storage-failure' });
    expect(await library.get(document.id)).toEqual(document);
    expect(Array.from(new Uint8Array(await blobBuffer(await library.getBlob(document.id)))))
      .toEqual(Array.from(pdfBytes()));
  });

  it('uses typed errors when capability or stored bytes are unavailable', async () => {
    const { cache, library } = setup();
    const unsupported = new CacheDocumentLibrary({ cacheStorage: undefined, crypto: undefined });
    await expect(unsupported.list()).rejects.toBeInstanceOf(DocumentLibraryError);
    await expect(unsupported.list()).rejects.toMatchObject({ code: 'unsupported' });

    const document = await library.importPdf(pdfFile());
    const bytesUrl = cache.urls().find((url) => url.endsWith('/bytes'))!;
    await cache.delete(bytesUrl);
    await expect(library.getBlob(document.id)).rejects.toMatchObject({ code: 'missing-bytes' });
  });
});
