import { useEffect, useState, useSyncExternalStore } from 'react';
import { getAccountSnapshot, subscribeAccountStatus, type AccountSession } from './account';
import { SERVER_MODE } from './server-mode';
import { storage } from './storage';

export interface SessionSyncStatus {
  mode: 'local' | 'server';
  loggedIn: boolean | null;
  pendingCount: number | null;
  offlineUntil: string | null;
  lastSuccessfulSyncAt: string | null;
}
const local: SessionSyncStatus = { mode: 'local', loggedIn: null, pendingCount: null, offlineUntil: null, lastSuccessfulSyncAt: null };
const localSnapshot = () => null;
const localSubscribe = () => () => {};

export function useSessionSyncStatus(): SessionSyncStatus {
  const snapshot = useSyncExternalStore(SERVER_MODE ? subscribeAccountStatus : localSubscribe, SERVER_MODE ? getAccountSnapshot : localSnapshot);
  const session = snapshot?.session ?? null;
  const [pending, setPending] = useState<{ owner: AccountSession; count: number | null } | null>(null);
  useEffect(() => {
    if (!session || storage.userDatabase.accountId !== session.account.id) return;
    return storage.syncRepository.subscribePendingCount((count) => {
      if (getAccountSnapshot().session === session) setPending({ owner: session, count });
    });
  }, [session]);
  if (!SERVER_MODE) return local;
  return {
    mode: 'server', loggedIn: session !== null, pendingCount: session && pending?.owner === session ? pending.count : null,
    offlineUntil: session ? new Date(session.offlineUntil).toISOString() : null,
    lastSuccessfulSyncAt: snapshot?.lastSuccessfulSyncAt ?? null,
  };
}
