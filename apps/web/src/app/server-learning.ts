import { parseLearningPack } from '@408os/content-schema';
import { activeAccount } from './account';
import { api } from './api';
import { storage } from './storage';

export async function loadServerLearningContent() {
  const session = activeAccount;
  if (!session) throw new Error('账号尚未解锁。');
  const target = storage;
  const current = () => activeAccount === session && storage === target;
  const saved = await target.learningContentRepository.get();
  const installed = saved ? parseLearningPack(saved) : undefined;
  if (!current()) return;
  let catalog: Array<{ id: string; kind: string; version: string; digest: string }>;
  try {
    catalog = await api('/content', undefined, 'GET', session.account.id);
  } catch (error) {
    if (!current()) return;
    if (error instanceof TypeError && installed) return installed;
    throw error;
  }
  if (!current()) return;
  const entry = catalog.find((item) => item.id === 'bitatlas-learning' && item.kind === 'learning');
  if (!entry) throw new Error('学习内容包尚未发布。');
  if (installed?.sha256 === entry.digest && installed.version === entry.version) return installed;
  const candidate = await api(`/content/${encodeURIComponent(entry.id)}`, undefined, 'GET', session.account.id);
  if (!current()) return;
  const pack = parseLearningPack(candidate);
  if (pack.sha256 !== entry.digest || pack.version !== entry.version || pack.id !== entry.id) {
    throw new Error('学习内容与目录版本不一致，请刷新后重试。');
  }
  const { accountCache } = await import('./account-cache');
  return accountCache.installPack(pack.id, new TextEncoder().encode(JSON.stringify(pack)).byteLength, () => {
    if (!current()) throw new Error('账号已切换，旧学习包安装已停止。');
    return target.learningContentRepository.install(pack);
  });
}
