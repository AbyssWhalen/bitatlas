import { chooseCacheEvictions, REPLACEABLE_CACHE_BYTES } from '@408os/domain';
import { accountRegistry, activeAccount } from './account';
import { binaryHash } from './binary-hash';

const cacheName = 'bitatlas-account-bytes-v1';
function owner() {
  if (!activeAccount || Date.now() >= activeAccount.offlineUntil) throw new Error('当前账号本地资料已锁定。');
  return activeAccount.account.id;
}
function cacheKey(id: string, key: string) { return `/__bitatlas_private_cache/${id}/${encodeURIComponent(key)}`; }
let queue: Promise<unknown> = Promise.resolve();
async function locked<T>(job: () => Promise<T>): Promise<T> {
  if (navigator.locks) return await navigator.locks.request('bitatlas-cache-budget', job);
  const result = queue.then(job, job); queue = result.catch(() => undefined); return result;
}
async function reserve(key: string, bytes: number, pinned: boolean, kind: 'response' | 'pack') {
  const accountId = owner();
  const entries = await accountRegistry.cache.toArray();
  const remove = chooseCacheEvictions(entries.filter((entry) => entry.key !== key).map((entry) => ({ ...entry, removable: entry.kind === 'response' })),
    pinned ? 0 : bytes);
  const cache = await caches.open(cacheName);
  for (const evicted of remove) { await cache.delete(evicted); await accountRegistry.cache.delete(evicted); }
  await accountRegistry.cache.put({ key, accountId, bytes, pinned, kind, lastUsed: Date.now(), unique: false });
}
export const accountCache = {
  async read(key: string): Promise<Response | undefined> {
    const full = cacheKey(owner(), key);
    const cached = await (await caches.open(cacheName)).match(full);
    if (cached) await accountRegistry.cache.update(full, { lastUsed: Date.now() });
    return cached;
  },
  async store(key: string, response: Response, bytes: number, pinned = false) {
    const full = cacheKey(owner(), key);
    await locked(async () => {
      const old = await accountRegistry.cache.get(full);
      await reserve(full, bytes, pinned, 'response');
      try { await (await caches.open(cacheName)).put(full, response); }
      catch (error) {
        if (old) await accountRegistry.cache.put(old); else await accountRegistry.cache.delete(full);
        throw error;
      }
    });
  },
  async installPack<T>(key: string, bytes: number, install: () => Promise<T>): Promise<T> {
    const full = cacheKey(owner(), `pack:${key}`);
    return locked(async () => {
      const old = await accountRegistry.cache.get(full);
      await reserve(full, bytes, false, 'pack');
      try { return await install(); }
      catch (error) {
        if (old) await accountRegistry.cache.put(old); else await accountRegistry.cache.delete(full);
        throw error;
      }
    });
  },
  async remove(key: string) {
    const full = cacheKey(owner(), key);
    await locked(async () => { await (await caches.open(cacheName)).delete(full); await accountRegistry.cache.delete(full); });
  },
  async stats() {
    owner();
    const entries = await accountRegistry.cache.toArray();
    return {
      replaceable: entries.filter((entry) => !entry.pinned && !entry.unique).reduce((sum, entry) => sum + entry.bytes, 0),
      protected: entries.filter((entry) => entry.pinned || entry.unique).reduce((sum, entry) => sum + entry.bytes, 0),
      budget: REPLACEABLE_CACHE_BYTES,
    };
  },
  async asset(url: string, expectedHash: string): Promise<Blob> {
    const key = `asset:${expectedHash}`;
    const previous = await this.read(key);
    if (previous) {
      const bytes = new Uint8Array(await previous.arrayBuffer());
      if (await binaryHash(bytes) === expectedHash) return new Blob([bytes], { type: previous.headers.get('content-type') ?? 'application/octet-stream' });
      await this.remove(key);
    }
    const response = await fetch(url, { credentials: 'same-origin', cache: 'no-store' });
    if (!response.ok) throw new Error(`题图暂时无法读取（${response.status}），请联网重试。`);
    const bytes = new Uint8Array(await response.clone().arrayBuffer());
    if (await binaryHash(bytes) !== expectedHash) throw new Error('题图摘要不匹配，已拒绝缓存。');
    await this.store(key, response.clone(), bytes.byteLength);
    return response.blob();
  },
};
