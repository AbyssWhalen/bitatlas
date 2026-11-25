import { binaryHash } from './binary-hash';
import { CacheDocumentLibrary, type LibraryDocument } from './document-library';
import { api } from './api';
import { accountRegistry, activeAccount } from './account';
import { accountCache } from './account-cache';
import { storage } from './storage';
import { SERVER_MODE } from './server-mode';

interface ServerFile { id: string; title: string; sha256: string; bytes: number; mime: string; created_at: string }
const local = new CacheDocumentLibrary();
const CHUNK = 4 * 1024 * 1024;
function accountId() { if (!activeAccount) throw new Error('请先登录。'); return activeAccount.account.id; }
export const documents = {
  async list(): Promise<LibraryDocument[]> {
    if (!SERVER_MODE) return local.list();
    const key = `documents:${accountId()}`;
    let files: ServerFile[];
    try { files = await api<ServerFile[]>('/files'); await accountRegistry.state.put({ key, value: files }); }
    catch (error) {
      if (!(error instanceof TypeError)) throw error;
      files = (await accountRegistry.state.get(key))?.value as ServerFile[] ?? [];
    }
    return Promise.all(files.map(async (file) => ({
      schemaVersion: 1 as const, id: file.id, name: file.title, originalName: file.title, mimeType: 'application/pdf' as const, byteLength: file.bytes, sha256: file.sha256,
      importedAt: file.created_at, updatedAt: file.created_at,
      lastPage: Number((await storage.reviewRepository.getSetting(`document.page:${file.id}`))?.value ?? 1),
    })));
  },
  async get(id: string) { return SERVER_MODE ? (await this.list()).find((entry) => entry.id === id) ?? null : local.get(id); },
  async updateLastPage(id: string, page: number) {
    if (!SERVER_MODE) return local.updateLastPage(id, page);
    if (!Number.isSafeInteger(page) || page < 1) throw new Error('页码无效。');
    await storage.reviewRepository.saveSetting(`document.page:${id}`, page);
  },
  async loadSource(id: string): Promise<{ data: Uint8Array } | { url: string; withCredentials: boolean; disableAutoFetch: boolean; disableStream: boolean; rangeChunkSize: number }> {
    if (!SERVER_MODE) return { data: await local.getBytes(id) };
    const saved = await accountCache.read(`pdf:${id}`);
    if (saved) return { data: new Uint8Array(await saved.arrayBuffer()) };
    if (!navigator.onLine) throw new Error('这份 PDF 尚未下载到离线资料。联网后可按需阅读，或在资料库选择离线保存。');
    return { url: `/api/v1/files/${encodeURIComponent(id)}`, withCredentials: true, disableAutoFetch: true, disableStream: true, rangeChunkSize: 256 * 1024 };
  },
  async isOffline(id: string) { return Boolean(await accountCache.read(`pdf:${id}`)); },
  async download(id: string) {
    const item = await this.get(id);
    if (!item) throw new Error('资料不存在。');
    const response = await fetch(`/api/v1/files/${encodeURIComponent(id)}`, { credentials: 'same-origin', cache: 'no-store' });
    if (!response.ok) throw new Error(`PDF 下载失败（${response.status}）。`);
    const bytes = new Uint8Array(await response.clone().arrayBuffer());
    if (bytes.byteLength !== item.byteLength || await binaryHash(bytes) !== item.sha256) throw new Error('PDF 长度或摘要不符，未保存离线副本。');
    await accountCache.store(`pdf:${id}`, response, bytes.byteLength, true);
  },
  async removeOffline(id: string) { await accountCache.remove(`pdf:${id}`); },
  async upload(file: File, onProgress: (percent: number) => void) {
    if (activeAccount?.account.role !== 'admin') throw new Error('上传资料仅限管理员。');
    if (!file.size || file.size > 128 * 1024 * 1024) throw new Error('单份资料不得超过 128MiB。');
    const mime = file.type || (file.name.toLowerCase().endsWith('.pdf') ? 'application/pdf' : '');
    if (!['application/pdf', 'image/png', 'image/jpeg'].includes(mime)) throw new Error('支持 PDF、PNG 和 JPEG。');
    const hash = await binaryHash(new Uint8Array(await file.arrayBuffer()));
    const key = `upload:${accountId()}:${hash}`;
    const previous = (await accountRegistry.state.get(key))?.value as { id: string } | undefined;
    const upload = previous ?? await api<{ id: string }>('/admin/uploads', { title: file.name, bytes: file.size, mime, sha256: hash });
    await accountRegistry.state.put({ key, value: upload });
    const status = await api<{ chunks: Array<{ ordinal: number }>; state: string; file_id: string | null }>(`/admin/uploads/${upload.id}`);
    const done = new Set(status.chunks.map((chunk) => chunk.ordinal));
    for (let ordinal = 0; ordinal * CHUNK < file.size; ordinal++) {
      if (!done.has(ordinal)) {
        const bytes = new Uint8Array(await file.slice(ordinal * CHUNK, (ordinal + 1) * CHUNK).arrayBuffer());
        const response = await fetch(`/api/v1/admin/uploads/${upload.id}/chunks/${ordinal}`, { method: 'PUT', credentials: 'same-origin',
          headers: { 'Content-Type': 'application/octet-stream', 'X-Chunk-Sha256': await binaryHash(bytes) }, body: bytes });
        if (!response.ok) throw new Error(`分块上传失败（${response.status}）。重新选择同一文件可继续。`);
      }
      onProgress(Math.min(100, Math.round((ordinal + 1) * CHUNK / file.size * 100)));
    }
    const complete = status.state === 'complete' ? { fileId: status.file_id! } : await api<{ fileId: string }>(`/admin/uploads/${upload.id}/complete`, {});
    return complete.fileId;
  },
};
