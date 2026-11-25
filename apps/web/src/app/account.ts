import Dexie, { type EntityTable } from 'dexie';
import { api, ApiFailure, setApiAccount } from './api';
import { activateAccountStorage, storage } from './storage';
import type { SyncCursor, SyncEntity, SyncResult } from '@408os/domain';
import { z } from 'zod';

export interface AccountSession {
  account: { id: string; username: string; role: 'admin' | 'member' };
  authenticatedAt: number; offlineUntil: number;
}
const sessionSchema = z.object({
  account: z.object({ id: z.uuid(), username: z.string().min(3).max(32), role: z.enum(['admin', 'member']) }),
  authenticatedAt: z.number().int().positive(), offlineUntil: z.number().int().positive(),
}).refine((value) => value.offlineUntil > value.authenticatedAt && value.offlineUntil - value.authenticatedAt <= 7 * 86_400_000);
class AccountRegistry extends Dexie {
  state!: EntityTable<{ key: string; value: unknown }, 'key'>;
  cache!: EntityTable<{ key: string; accountId: string; bytes: number; lastUsed: number; pinned: boolean; unique: boolean; kind: 'response' | 'pack' }, 'key'>;
  constructor() {
    super('bitatlas-account-registry');
    this.version(1).stores({ state: 'key', cache: 'key, accountId, lastUsed' });
  }
}
export const accountRegistry = new AccountRegistry();
export let activeAccount: AccountSession | null = null;
interface AccountSnapshot { session: AccountSession | null; lastSuccessfulSyncAt: string | null }
const signedOut: AccountSnapshot = { session: null, lastSuccessfulSyncAt: null };
let accountSnapshot = signedOut;
const accountListeners = new Set<() => void>();
function publishAccountStatus(lastSuccessfulSyncAt: string | null = null) {
  accountSnapshot = activeAccount ? { session: activeAccount, lastSuccessfulSyncAt } : signedOut;
  for (const notify of accountListeners) notify();
}
export function getAccountSnapshot(): AccountSnapshot {
  return accountSnapshot.session && accountSnapshot.session.offlineUntil > Date.now() ? accountSnapshot : signedOut;
}
export function subscribeAccountStatus(notify: () => void) {
  let timer: number | undefined;
  const schedule = () => {
    window.clearTimeout(timer);
    const session = getAccountSnapshot().session;
    if (session) timer = window.setTimeout(refresh, Math.max(1, session.offlineUntil - Date.now()));
  };
  const refresh = () => { schedule(); notify(); };
  accountListeners.add(refresh);
  window.addEventListener('pageshow', refresh);
  window.addEventListener('focus', refresh);
  schedule();
  return () => {
    accountListeners.delete(refresh);
    window.clearTimeout(timer);
    window.removeEventListener('pageshow', refresh);
    window.removeEventListener('focus', refresh);
  };
}
let syncInFlight: { session: AccountSession; controller: AbortController; promise: Promise<void> } | null = null;
function cancelSynchronization() {
  syncInFlight?.controller.abort();
  syncInFlight = null;
}
// This contains only a logout intent, never learning data or authentication tokens.
// Synchronous persistence closes the navigation window before the IndexedDB task starts.
const LOGOUT_INTENT_KEY = 'bitatlas-logout-pending';
const channel = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('bitatlas-accounts') : null;
export function lockAccount() {
  cancelSynchronization();
  storage.syncRepository.lock();
  storage.userDatabase.close(); storage.contentDatabase.close();
  activeAccount = null; setApiAccount(null);
  publishAccountStatus();
}
function notifyAccountChanged() {
  window.dispatchEvent(new CustomEvent('bitatlas-account-changed'));
}
function lockCurrentSession() {
  const hadSession = activeAccount !== null;
  lockAccount();
  if (hadSession) notifyAccountChanged();
}
channel?.addEventListener('message', lockCurrentSession);
if (typeof window !== 'undefined') window.addEventListener('bitatlas-auth-required', () => {
  lockCurrentSession();
  void accountRegistry.state.delete('last-session').catch(() => undefined);
});

async function activate(session: AccountSession, persist: boolean) {
  session = sessionSchema.parse(session);
  if (persist) await accountRegistry.state.put({ key: 'last-session', value: session });
  cancelSynchronization();
  activeAccount = session;
  setApiAccount(session.account.id);
  activateAccountStorage(session.account.id);
  publishAccountStatus();
  return session;
}
export async function restoreAccount(): Promise<AccountSession | null> {
  if (localStorage.getItem(LOGOUT_INTENT_KEY) || (await accountRegistry.state.get('logout-pending'))?.value) {
    try {
      await api('/auth/logout', {});
      await accountRegistry.state.bulkDelete(['last-session', 'logout-pending']);
      localStorage.removeItem(LOGOUT_INTENT_KEY);
    } catch { /* Remain locked until revocation can be sent. */ }
    return null;
  }
  const previous = sessionSchema.safeParse((await accountRegistry.state.get('last-session'))?.value);
  const saved = previous.success ? previous.data : undefined;
  try { return await activate(await api<AccountSession>('/auth/me'), true); }
  catch (error) {
    // HTTP errors (including server failure) never prove that offline authentication is valid.
    if (!(error instanceof TypeError) || !saved || saved.offlineUntil <= Date.now() || saved.authenticatedAt > Date.now()) {
      await accountRegistry.state.delete('last-session');
      // A cold start has no activeAccount yet; only a validated saved session can have expired.
      if (saved && !activeAccount && (saved.offlineUntil <= Date.now() || (error instanceof ApiFailure && error.status === 401))) {
        notifyAccountChanged();
      }
      return null;
    }
    return activate(saved, false);
  }
}
export async function loginAccount(username: string, password: string, invite?: string) {
  if (localStorage.getItem(LOGOUT_INTENT_KEY) || (await accountRegistry.state.get('logout-pending'))?.value) {
    await api('/auth/logout', {});
    await accountRegistry.state.bulkDelete(['last-session', 'logout-pending']);
    localStorage.removeItem(LOGOUT_INTENT_KEY);
  }
  const session = await api<AccountSession>(invite ? '/auth/register' : '/auth/login', { username, password, ...(invite ? { invite } : {}) });
  channel?.postMessage({ type: 'account-changed' });
  return activate(session, true);
}
export async function logoutAccount() {
  // Local locking is always possible. The existing HttpOnly session must also be revoked before switching accounts.
  localStorage.setItem(LOGOUT_INTENT_KEY, '1');
  lockCurrentSession();
  channel?.postMessage({ type: 'logout' });
  await accountRegistry.transaction('rw', accountRegistry.state, async () => {
    await accountRegistry.state.put({ key: 'logout-pending', value: true });
    await accountRegistry.state.delete('last-session');
  });
  try {
    await api('/auth/logout', {});
    await accountRegistry.state.delete('logout-pending');
    localStorage.removeItem(LOGOUT_INTENT_KEY);
  } catch { /* Local logout already locked all access. */ }
}
export function synchronize() {
  if (!activeAccount) return Promise.resolve();
  if (syncInFlight?.session === activeAccount) return syncInFlight.promise;
  cancelSynchronization();
  const session = activeAccount;
  const accountId = session.account.id;
  const target = storage;
  const controller = new AbortController();
  const current = () => !controller.signal.aborted && activeAccount === session && storage === target;
  const sync = async () => {
    if (!current()) return;
    let cursor = await target.syncRepository.cursor();
    // Reconcile the epoch before replaying pending operations.
    let more = true;
    while (more && current()) {
      const result = await api<{ reconcile: boolean; cursor: SyncCursor; entities: SyncEntity[]; more: boolean }>(`/sync/pull?epoch=${encodeURIComponent(cursor?.epoch ?? '')}&sequence=${cursor?.sequence ?? 0}`, undefined, 'GET', accountId, { signal: controller.signal });
      if (!current()) return;
      await target.syncRepository.pull(result); cursor = result.cursor; more = result.more;
    }
    if (!current()) return;
    for (const queued of await target.syncRepository.pending()) {
      if (!current()) return;
      const operation = await target.syncRepository.getPending(queued.operationId);
      if (!current()) return;
      if (!operation) continue;
      const result = await api<SyncResult>('/sync/push', operation.mutation, 'POST', accountId, { signal: controller.signal });
      if (!current()) return;
      await target.syncRepository.acknowledge(operation.operationId, result);
    }
    if (current()) {
      publishAccountStatus(new Date().toISOString());
      window.dispatchEvent(new CustomEvent('bitatlas-synced'));
    }
  };
  const promise = (async () => {
    if (navigator.locks) await navigator.locks.request(`bitatlas-sync:${accountId}`, { signal: controller.signal }, sync);
    else await sync();
  })().catch((error: unknown) => {
    // Cancellation belongs to a session that no longer owns this UI; genuine
    // current-session failures remain visible and leave the outbox intact.
    if (current()) throw error;
  }).finally(() => { if (syncInFlight?.promise === promise) syncInFlight = null; });
  syncInFlight = { session, controller, promise };
  return promise;
}
