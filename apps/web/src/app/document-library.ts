export const DOCUMENT_LIBRARY_CACHE_NAME = '408os-document-library-v1';
export const DEFAULT_MAX_PDF_BYTE_LENGTH = 128 * 1024 * 1024;

const INTERNAL_DOCUMENT_PATH = '/__408os_private__/document-library/v1/documents/';
const PDF_ID_PATTERN = /^pdf-([a-f0-9]{64})$/;
const PDF_HEADER = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d]);
const MAX_NAME_LENGTH = 240;
const localDocumentLocks = new Map<string, Promise<void>>();

type CacheStorageLike = Pick<CacheStorage, 'open'>;
type CryptoLike = Pick<Crypto, 'subtle'>;
type DocumentEntryKind = 'bytes' | 'metadata';

export type DocumentLibraryErrorCode =
  | 'unsupported'
  | 'invalid-mime'
  | 'empty-file'
  | 'file-too-large'
  | 'invalid-header'
  | 'invalid-name'
  | 'invalid-page'
  | 'invalid-id'
  | 'not-found'
  | 'missing-bytes'
  | 'corrupt-metadata'
  | 'corrupt-bytes'
  | 'storage-failure';

export class DocumentLibraryError extends Error {
  constructor(
    public readonly code: DocumentLibraryErrorCode,
    message: string,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = 'DocumentLibraryError';
  }
}

export interface LibraryDocument {
  schemaVersion: 1;
  id: string;
  sha256: string;
  name: string;
  originalName: string;
  mimeType: 'application/pdf';
  byteLength: number;
  importedAt: string;
  updatedAt: string;
  lastPage: number;
}

export type DocumentLibraryCapability =
  | { supported: true }
  | {
      supported: false;
      reason: 'cache-storage-unavailable' | 'web-crypto-unavailable';
    };

export interface DocumentLibraryDependencies {
  cacheStorage?: CacheStorageLike | undefined;
  crypto?: CryptoLike | undefined;
}

export interface CacheDocumentLibraryOptions extends DocumentLibraryDependencies {
  maxByteLength?: number;
  now?: () => string;
  origin?: string;
}

function browserCacheStorage(): CacheStorageLike | undefined {
  return typeof globalThis.caches === 'undefined' ? undefined : globalThis.caches;
}

function browserCrypto(): CryptoLike | undefined {
  return globalThis.crypto?.subtle ? globalThis.crypto : undefined;
}

function dependency<T extends object, K extends keyof T>(
  options: T,
  key: K,
  fallback: () => T[K],
): T[K] {
  return Object.prototype.hasOwnProperty.call(options, key) ? options[key] : fallback();
}

async function withLocalDocumentLock<T>(name: string, task: () => Promise<T>): Promise<T> {
  const previous = localDocumentLocks.get(name) ?? Promise.resolve();
  let release: () => void = () => undefined;
  const held = new Promise<void>((resolve) => { release = resolve; });
  const queued = previous.catch(() => undefined).then(() => held);
  localDocumentLocks.set(name, queued);
  await previous.catch(() => undefined);
  try {
    return await task();
  } finally {
    release();
    if (localDocumentLocks.get(name) === queued) localDocumentLocks.delete(name);
  }
}

export function detectDocumentLibraryCapability(
  dependencies: DocumentLibraryDependencies = {},
): DocumentLibraryCapability {
  const cacheStorage = dependency(dependencies, 'cacheStorage', browserCacheStorage);
  if (!cacheStorage || typeof cacheStorage.open !== 'function') {
    return { supported: false, reason: 'cache-storage-unavailable' };
  }
  const crypto = dependency(dependencies, 'crypto', browserCrypto);
  if (!crypto?.subtle || typeof crypto.subtle.digest !== 'function') {
    return { supported: false, reason: 'web-crypto-unavailable' };
  }
  return { supported: true };
}

function defaultOrigin(): string {
  const origin = globalThis.location?.origin;
  return origin && origin !== 'null' ? origin : 'https://408os.local';
}

function canonicalOrigin(origin: string): string {
  const parsed = new URL(origin);
  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new DocumentLibraryError('unsupported', '文档库需要 HTTP 或 HTTPS 源。');
  }
  return parsed.origin;
}

function assertDocumentId(id: string): RegExpMatchArray {
  const match = id.match(PDF_ID_PATTERN);
  if (!match) {
    throw new DocumentLibraryError('invalid-id', '文档 ID 不是内部 SHA-256 标识。');
  }
  return match;
}

function hasControlCharacters(value: string): boolean {
  return [...value].some((character) => {
    const codePoint = character.codePointAt(0)!;
    return codePoint <= 0x1f || codePoint === 0x7f;
  });
}

function normalizedName(name: string): string {
  const normalized = name.trim();
  if (
    !normalized
    || normalized.length > MAX_NAME_LENGTH
    || hasControlCharacters(normalized)
  ) {
    throw new DocumentLibraryError('invalid-name', `文档名称必须为 1-${MAX_NAME_LENGTH} 个可显示字符。`);
  }
  return normalized;
}

function hasPdfHeader(bytes: Uint8Array): boolean {
  return PDF_HEADER.every((byte, index) => bytes[index] === byte);
}

async function readFileBuffer(file: File): Promise<ArrayBuffer> {
  if (typeof file.arrayBuffer === 'function') return file.arrayBuffer();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener('load', () => {
      if (reader.result instanceof ArrayBuffer) resolve(reader.result);
      else reject(new Error('FileReader did not return an ArrayBuffer.'));
    });
    reader.addEventListener('error', () => reject(reader.error ?? new Error('FileReader failed.')));
    reader.addEventListener('abort', () => reject(new Error('FileReader was aborted.')));
    reader.readAsArrayBuffer(file);
  });
}

function bytesToHex(bytes: Uint8Array): string {
  return [...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

function jsonResponse(document: LibraryDocument): Response {
  return new Response(JSON.stringify(document), {
    status: 200,
    headers: {
      'cache-control': 'no-store',
      'content-type': 'application/json; charset=utf-8',
    },
  });
}

function pdfResponse(file: File, fallbackBuffer: ArrayBuffer): Response {
  const body = typeof file.stream === 'function' ? file.stream() : fallbackBuffer;
  return new Response(body, {
    status: 200,
    headers: { 'content-type': 'application/pdf' },
  });
}

function isIsoTimestamp(value: unknown): value is string {
  return typeof value === 'string'
    && Number.isFinite(Date.parse(value))
    && new Date(value).toISOString() === value;
}

function isStoredName(value: unknown): value is string {
  return typeof value === 'string'
    && value === value.trim()
    && value.length > 0
    && value.length <= MAX_NAME_LENGTH
    && !hasControlCharacters(value);
}

function isLibraryDocument(value: unknown, expectedId: string): value is LibraryDocument {
  if (!value || typeof value !== 'object') return false;
  const document = value as Partial<LibraryDocument>;
  const idMatch = expectedId.match(PDF_ID_PATTERN);
  return document.schemaVersion === 1
    && document.id === expectedId
    && document.sha256 === idMatch?.[1]
    && isStoredName(document.name)
    && isStoredName(document.originalName)
    && document.mimeType === 'application/pdf'
    && Number.isSafeInteger(document.byteLength)
    && (document.byteLength ?? 0) > 0
    && isIsoTimestamp(document.importedAt)
    && isIsoTimestamp(document.updatedAt)
    && Number.isSafeInteger(document.lastPage)
    && (document.lastPage ?? 0) > 0;
}

export class CacheDocumentLibrary {
  private readonly cacheStorage: CacheStorageLike | undefined;
  private readonly crypto: CryptoLike | undefined;
  private readonly maxByteLength: number;
  private readonly now: () => string;
  private readonly origin: string;

  constructor(options: CacheDocumentLibraryOptions = {}) {
    this.cacheStorage = dependency(options, 'cacheStorage', browserCacheStorage);
    this.crypto = dependency(options, 'crypto', browserCrypto);
    this.maxByteLength = options.maxByteLength ?? DEFAULT_MAX_PDF_BYTE_LENGTH;
    if (!Number.isSafeInteger(this.maxByteLength) || this.maxByteLength < 1) {
      throw new RangeError('maxByteLength must be a positive safe integer.');
    }
    this.now = options.now ?? (() => new Date().toISOString());
    this.origin = canonicalOrigin(options.origin ?? defaultOrigin());
  }

  capability(): DocumentLibraryCapability {
    return detectDocumentLibraryCapability({
      cacheStorage: this.cacheStorage,
      crypto: this.crypto,
    });
  }

  private async withDocumentLock<T>(id: string, task: () => Promise<T>): Promise<T> {
    const name = `408os-document-library:${id}`;
    const lockManager = globalThis.navigator?.locks;
    if (lockManager && typeof lockManager.request === 'function') {
      return lockManager.request(name, { mode: 'exclusive' }, task);
    }
    return withLocalDocumentLock(name, task);
  }

  private request(id: string, kind: DocumentEntryKind): Request {
    assertDocumentId(id);
    return new Request(`${this.origin}${INTERNAL_DOCUMENT_PATH}${id}/${kind}`, { method: 'GET' });
  }

  private metadataId(request: Request): string | undefined {
    const url = new URL(request.url);
    if (url.origin !== this.origin || url.search || url.hash) return undefined;
    const match = url.pathname.match(
      /^\/__408os_private__\/document-library\/v1\/documents\/(pdf-[a-f0-9]{64})\/metadata$/,
    );
    return match?.[1];
  }

  private async openCache(): Promise<Cache> {
    const capability = this.capability();
    if (!capability.supported) {
      const reason = capability.reason === 'cache-storage-unavailable'
        ? '浏览器不支持 Cache Storage。'
        : '浏览器不支持 SHA-256 Web Crypto。';
      throw new DocumentLibraryError('unsupported', `本地 PDF 文档库不可用：${reason}`);
    }
    try {
      return await this.cacheStorage!.open(DOCUMENT_LIBRARY_CACHE_NAME);
    } catch (cause) {
      throw new DocumentLibraryError('storage-failure', '无法打开本地 PDF 文档库。', { cause });
    }
  }

  private async metadata(cache: Cache, id: string): Promise<LibraryDocument | undefined> {
    let response: Response | undefined;
    try {
      response = await cache.match(this.request(id, 'metadata'));
    } catch (cause) {
      throw new DocumentLibraryError('storage-failure', '读取 PDF 元数据失败。', { cause });
    }
    if (!response) return undefined;
    try {
      const value: unknown = await response.json();
      if (!isLibraryDocument(value, id)) throw new Error('Metadata shape mismatch.');
      return value;
    } catch (cause) {
      throw new DocumentLibraryError('corrupt-metadata', `PDF 文档 ${id} 的元数据已损坏。`, { cause });
    }
  }

  private async digest(buffer: ArrayBuffer): Promise<string> {
    if (!this.crypto?.subtle) {
      throw new DocumentLibraryError('unsupported', '本地 PDF 文档库缺少 SHA-256 能力。');
    }
    try {
      return bytesToHex(new Uint8Array(await this.crypto.subtle.digest('SHA-256', buffer)));
    } catch (cause) {
      throw new DocumentLibraryError('storage-failure', '计算 PDF SHA-256 失败。', { cause });
    }
  }

  private async restore(
    cache: Cache,
    request: Request,
    previous: Response | undefined,
  ): Promise<void> {
    if (previous) await cache.put(request, previous);
    else await cache.delete(request);
  }

  async importPdf(file: File): Promise<LibraryDocument> {
    if (file.type !== 'application/pdf') {
      throw new DocumentLibraryError('invalid-mime', '只能导入 MIME 类型为 application/pdf 的文件。');
    }
    if (file.size === 0) {
      throw new DocumentLibraryError('empty-file', '不能导入空 PDF 文件。');
    }
    if (file.size > this.maxByteLength) {
      throw new DocumentLibraryError(
        'file-too-large',
        `PDF 大小不能超过 ${this.maxByteLength} 字节。`,
      );
    }
    const name = normalizedName(file.name);
    let buffer: ArrayBuffer;
    try {
      buffer = await readFileBuffer(file);
    } catch (cause) {
      throw new DocumentLibraryError('storage-failure', '读取待导入 PDF 文件失败。', { cause });
    }
    if (buffer.byteLength === 0) {
      throw new DocumentLibraryError('empty-file', '不能导入空 PDF 文件。');
    }
    if (buffer.byteLength > this.maxByteLength) {
      throw new DocumentLibraryError(
        'file-too-large',
        `PDF 大小不能超过 ${this.maxByteLength} 字节。`,
      );
    }
    if (!hasPdfHeader(new Uint8Array(buffer, 0, Math.min(PDF_HEADER.length, buffer.byteLength)))) {
      throw new DocumentLibraryError('invalid-header', '文件不以 %PDF- 魔数开头。');
    }

    const sha256 = await this.digest(buffer);
    const id = `pdf-${sha256}`;
    return this.withDocumentLock(id, async () => {
      const cache = await this.openCache();
      const existing = await this.metadata(cache, id);
      if (existing) {
        await this.getBytes(id);
        return existing;
      }

      const timestamp = this.now();
      if (!isIsoTimestamp(timestamp)) {
        throw new DocumentLibraryError('storage-failure', '文档库时钟没有返回 ISO 时间。');
      }
      const document: LibraryDocument = {
        schemaVersion: 1,
        id,
        sha256,
        name,
        originalName: name,
        mimeType: 'application/pdf',
        byteLength: buffer.byteLength,
        importedAt: timestamp,
        updatedAt: timestamp,
        lastPage: 1,
      };
      const bytesRequest = this.request(id, 'bytes');
      const metadataRequest = this.request(id, 'metadata');
      let previousBytes: Response | undefined;
      let previousMetadata: Response | undefined;
      try {
        [previousBytes, previousMetadata] = await Promise.all([
          cache.match(bytesRequest),
          cache.match(metadataRequest),
        ]);
        await cache.put(bytesRequest, pdfResponse(file, buffer));
        await cache.put(metadataRequest, jsonResponse(document));
        return document;
      } catch (cause) {
        try {
          await this.restore(cache, metadataRequest, previousMetadata?.clone());
          await this.restore(cache, bytesRequest, previousBytes?.clone());
        } catch (rollbackCause) {
          throw new DocumentLibraryError(
            'storage-failure',
            '导入 PDF 失败，且恢复原文档库状态失败。',
            { cause: rollbackCause },
          );
        }
        throw new DocumentLibraryError('storage-failure', '导入 PDF 时写入本地文档库失败。', { cause });
      }
    });
  }

  async list(): Promise<LibraryDocument[]> {
    const cache = await this.openCache();
    let requests: readonly Request[];
    try {
      requests = await cache.keys();
    } catch (cause) {
      throw new DocumentLibraryError('storage-failure', '列出本地 PDF 失败。', { cause });
    }
    const ids = requests.flatMap((request) => {
      const id = this.metadataId(request);
      return id ? [id] : [];
    });
    const documents = await Promise.all([...new Set(ids)].map((id) => this.metadata(cache, id)));
    return documents
      .filter((document): document is LibraryDocument => document !== undefined)
      .sort((left, right) => left.id.localeCompare(right.id));
  }

  async get(id: string): Promise<LibraryDocument | undefined> {
    assertDocumentId(id);
    return this.metadata(await this.openCache(), id);
  }

  async getBytes(id: string): Promise<Uint8Array<ArrayBuffer>> {
    assertDocumentId(id);
    const cache = await this.openCache();
    const document = await this.metadata(cache, id);
    if (!document) throw new DocumentLibraryError('not-found', `本地 PDF 文档 ${id} 不存在。`);
    let response: Response | undefined;
    try {
      response = await cache.match(this.request(id, 'bytes'));
    } catch (cause) {
      throw new DocumentLibraryError('storage-failure', '读取 PDF 字节失败。', { cause });
    }
    if (!response) {
      throw new DocumentLibraryError('missing-bytes', `本地 PDF 文档 ${id} 缺少文件字节。`);
    }
    try {
      const buffer = await response.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      if (
        buffer.byteLength !== document.byteLength
        || !hasPdfHeader(bytes.subarray(0, PDF_HEADER.length))
        || await this.digest(buffer) !== document.sha256
      ) {
        throw new Error('Stored bytes do not match metadata.');
      }
      return new Uint8Array(buffer);
    } catch (cause) {
      if (cause instanceof DocumentLibraryError) throw cause;
      throw new DocumentLibraryError('corrupt-bytes', `本地 PDF 文档 ${id} 的字节已损坏。`, { cause });
    }
  }

  async getBlob(id: string): Promise<Blob> {
    return new Blob([await this.getBytes(id)], { type: 'application/pdf' });
  }

  private async update(
    id: string,
    transform: (document: LibraryDocument) => LibraryDocument,
  ): Promise<LibraryDocument> {
    assertDocumentId(id);
    return this.withDocumentLock(id, async () => {
      const cache = await this.openCache();
      const current = await this.metadata(cache, id);
      if (!current) throw new DocumentLibraryError('not-found', `本地 PDF 文档 ${id} 不存在。`);
      const updated = transform(current);
      try {
        await cache.put(this.request(id, 'metadata'), jsonResponse(updated));
        return updated;
      } catch (cause) {
        throw new DocumentLibraryError('storage-failure', '更新 PDF 元数据失败，原记录保持不变。', { cause });
      }
    });
  }

  async rename(id: string, name: string): Promise<LibraryDocument> {
    const normalized = normalizedName(name);
    return this.update(id, (document) => ({
      ...document,
      name: normalized,
      updatedAt: this.now(),
    }));
  }

  async updateLastPage(id: string, lastPage: number): Promise<LibraryDocument> {
    if (!Number.isSafeInteger(lastPage) || lastPage < 1) {
      throw new DocumentLibraryError('invalid-page', '最后阅读页码必须是大于 0 的整数。');
    }
    return this.update(id, (document) => ({
      ...document,
      lastPage,
      updatedAt: this.now(),
    }));
  }

  async remove(id: string): Promise<boolean> {
    assertDocumentId(id);
    return this.withDocumentLock(id, async () => {
      const cache = await this.openCache();
      const metadataRequest = this.request(id, 'metadata');
      const bytesRequest = this.request(id, 'bytes');
      let metadata: Response | undefined;
      let bytes: Response | undefined;
      try {
        [metadata, bytes] = await Promise.all([
          cache.match(metadataRequest),
          cache.match(bytesRequest),
        ]);
        if (!metadata && !bytes) return false;
        if (metadata && !await cache.delete(metadataRequest)) throw new Error('Metadata delete returned false.');
        if (bytes && !await cache.delete(bytesRequest)) throw new Error('Bytes delete returned false.');
        return true;
      } catch (cause) {
        try {
          if (metadata) await cache.put(metadataRequest, metadata.clone());
          if (bytes) await cache.put(bytesRequest, bytes.clone());
        } catch (rollbackCause) {
          throw new DocumentLibraryError(
            'storage-failure',
            '删除 PDF 失败，且恢复原文档库状态失败。',
            { cause: rollbackCause },
          );
        }
        throw new DocumentLibraryError('storage-failure', '删除 PDF 失败，原记录已恢复。', { cause });
      }
    });
  }
}
