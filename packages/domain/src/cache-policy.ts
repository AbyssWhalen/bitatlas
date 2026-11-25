export const REPLACEABLE_CACHE_BYTES = 250_000_000;
export interface CacheCandidate { key: string; bytes: number; lastUsed: number; pinned: boolean; unique: boolean; pending?: boolean; removable?: boolean }
export function chooseCacheEvictions(entries: readonly CacheCandidate[], incoming: number, budget = REPLACEABLE_CACHE_BYTES): string[] {
  if (!Number.isSafeInteger(incoming) || incoming < 0 || !Number.isSafeInteger(budget) || budget < 0) throw new Error('缓存额度无效。');
  // Pinned or unique copies have a separate, explicit storage total and are never auto-evicted.
  const replaceable = entries.filter((entry) => !entry.pinned && !entry.unique);
  let total = replaceable.reduce((sum, entry) => sum + entry.bytes, 0) + incoming;
  const evicted: string[] = [];
  for (const entry of [...replaceable].filter((item) => !item.pending && item.removable !== false).sort((a, b) => a.lastUsed - b.lastUsed || a.key.localeCompare(b.key))) {
    if (total <= budget) break;
    evicted.push(entry.key); total -= entry.bytes;
  }
  if (total > budget) throw new Error('可替换缓存额度不足；受保护资料和未同步记录已保留。请先释放可重新下载的缓存。');
  return evicted;
}
