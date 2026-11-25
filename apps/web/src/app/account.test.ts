import 'fake-indexeddb/auto';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
const fixture = vi.hoisted(() => ({
  api: vi.fn(), setApiAccount: vi.fn(), activate: vi.fn(), lock: vi.fn(), close: vi.fn(),
  cursor: vi.fn(), pull: vi.fn(), pending: vi.fn(), getPending: vi.fn(), acknowledge: vi.fn(),
}));
vi.mock('./api', () => ({ api: fixture.api, setApiAccount: fixture.setApiAccount }));
vi.mock('./storage', () => ({
  activateAccountStorage: fixture.activate,
  storage: { syncRepository: {
    lock: fixture.lock, cursor: fixture.cursor, pull: fixture.pull,
    pending: fixture.pending, getPending: fixture.getPending, acknowledge: fixture.acknowledge,
  }, userDatabase: { close: fixture.close }, contentDatabase: { close: fixture.close } },
}));
import { accountRegistry, activeAccount, lockAccount, loginAccount, logoutAccount, restoreAccount, synchronize } from './account';
const session = {
  account: { id: '5bc20cd6-64d1-4418-9d78-19ad504a4cd6', username: 'member1', role: 'member' as const },
  authenticatedAt: Date.now(), offlineUntil: Date.now() + 86_400_000,
};
beforeEach(async () => {
  lockAccount(); vi.clearAllMocks(); localStorage.clear(); await accountRegistry.state.clear();
  fixture.cursor.mockResolvedValue(undefined); fixture.pull.mockResolvedValue(undefined);
  fixture.pending.mockResolvedValue([]); fixture.acknowledge.mockResolvedValue(undefined);
  fixture.api.mockImplementation(async (route: string) => route === '/auth/logout' ? { ok: true } : session);
});
afterEach(() => { lockAccount(); vi.restoreAllMocks(); vi.unstubAllGlobals(); localStorage.clear(); });
describe('durable logout intent', () => {
  it('locks the account and persists logout synchronously before IndexedDB can yield to navigation', async () => {
    await loginAccount('member1', 'test-only-password');
    const logout = logoutAccount();
    expect(localStorage.getItem('bitatlas-logout-pending')).toBe('1');
    expect(activeAccount).toBeNull();
    expect(fixture.lock).toHaveBeenCalled();
    await logout;
    expect(localStorage.getItem('bitatlas-logout-pending')).toBeNull();
  });
  it('keeps a failed persistent logout locked and does not restore an otherwise valid offline account', async () => {
    await loginAccount('member1', 'test-only-password');
    const put = vi.spyOn(accountRegistry.state, 'put').mockRejectedValueOnce(new Error('storage unavailable'));
    await expect(logoutAccount()).rejects.toThrow('storage unavailable');
    put.mockRestore();
    fixture.api.mockRejectedValue(new TypeError('offline'));
    expect(await restoreAccount()).toBeNull();
    expect(localStorage.getItem('bitatlas-logout-pending')).toBe('1');
    expect(activeAccount).toBeNull();
  });
  it('retries revocation after an immediate navigation and never requests the previous session', async () => {
    localStorage.setItem('bitatlas-logout-pending', '1');
    await accountRegistry.state.put({ key: 'last-session', value: session });
    expect(await restoreAccount()).toBeNull();
    expect(fixture.api).toHaveBeenCalledExactlyOnceWith('/auth/logout', {});
    expect(await accountRegistry.state.get('last-session')).toBeUndefined();
    expect(localStorage.getItem('bitatlas-logout-pending')).toBeNull();
  });
  it('refuses account switching until pending online revocation succeeds', async () => {
    localStorage.setItem('bitatlas-logout-pending', '1');
    fixture.api.mockRejectedValueOnce(new TypeError('offline'));
    await expect(loginAccount('other', 'test-only-password')).rejects.toThrow('offline');
    expect(fixture.api).toHaveBeenCalledExactlyOnceWith('/auth/logout', {});
    expect(localStorage.getItem('bitatlas-logout-pending')).toBe('1');
    fixture.api.mockClear();
    await loginAccount('member1', 'test-only-password');
    expect(fixture.api.mock.calls.map(([route]) => route)).toEqual(['/auth/logout', '/auth/login']);
  });
});

describe('synchronization session boundaries', () => {
  const pullResult = { reconcile: false, cursor: { epoch: 'test-epoch', sequence: 1 }, entities: [], more: false };

  it('starts a new account sync without reusing the previous account request', async () => {
    await loginAccount('member1', 'test-only-password');
    const requests: Array<{ resolve: (value: unknown) => void; accountId: string; signal: AbortSignal | undefined }> = [];
    fixture.api.mockImplementation((_route: string, _body: unknown, _method: string, accountId: string, options?: { signal?: AbortSignal }) =>
      new Promise((resolve) => requests.push({ resolve, accountId, signal: options?.signal })));
    const old = synchronize();
    await vi.waitFor(() => expect(requests).toHaveLength(1));
    fixture.api.mockResolvedValueOnce({ ...session, account: { ...session.account, id: '5d19f493-d553-4ce5-af79-d048187e5657' } });
    await loginAccount('member2', 'test-only-password');
    const current = synchronize();
    expect(current).not.toBe(old);
    await vi.waitFor(() => expect(requests).toHaveLength(2));
    expect(requests[0]!.signal?.aborted).toBe(true);
    requests[0]!.resolve(pullResult);
    await old;
    expect(fixture.pull).not.toHaveBeenCalled();
    expect(synchronize()).toBe(current);
    requests[1]!.resolve(pullResult);
    await current;
    expect(fixture.pull).toHaveBeenCalledExactlyOnceWith(pullResult);
  });

  it('ignores a previous login response even when the account id is unchanged', async () => {
    await loginAccount('member1', 'test-only-password');
    let complete!: (value: unknown) => void;
    fixture.api.mockImplementation(() => new Promise((resolve) => { complete = resolve; }));
    const old = synchronize();
    await vi.waitFor(() => expect(complete).toBeTypeOf('function'));
    lockAccount();
    fixture.api.mockResolvedValueOnce(session);
    await loginAccount('member1', 'test-only-password');
    complete(pullResult);
    await old;
    expect(fixture.pull).not.toHaveBeenCalled();
    expect(fixture.pending).not.toHaveBeenCalled();
  });

  it('releases a failed sync and retains its operation id for an explicit retry', async () => {
    await loginAccount('member1', 'test-only-password');
    const mutation = { operationId: 'same-operation', entityId: 'note-1' };
    fixture.pending.mockResolvedValue([{ operationId: 'same-operation' }]);
    fixture.getPending.mockResolvedValue({ operationId: 'same-operation', mutation });
    fixture.api.mockImplementation(async (route: string) => {
      if (route.startsWith('/sync/pull')) return pullResult;
      throw new Error('deadline exceeded');
    });
    await expect(synchronize()).rejects.toThrow('deadline exceeded');
    expect(fixture.acknowledge).not.toHaveBeenCalled();
    fixture.api.mockImplementation(async (route: string) => route.startsWith('/sync/pull') ? pullResult : { accepted: true });
    await synchronize();
    expect(fixture.api.mock.calls.filter(([route]) => route === '/sync/push').map(([, body]) => body))
      .toEqual([mutation, mutation]);
    expect(fixture.acknowledge).toHaveBeenCalledExactlyOnceWith('same-operation', { accepted: true });
  });

  it('cancels a queued cross-tab lock when the owning session is locked', async () => {
    await loginAccount('member1', 'test-only-password');
    let waitingSignal!: AbortSignal;
    const request = vi.fn((_name: string, options: { signal: AbortSignal }) =>
      new Promise<void>((_resolve, reject) => {
        waitingSignal = options.signal;
        options.signal.addEventListener('abort', () => reject(options.signal.reason), { once: true });
      }));
    vi.stubGlobal('navigator', { locks: { request } });
    const pending = synchronize();
    expect(request).toHaveBeenCalledTimes(1);
    lockAccount();
    await expect(pending).resolves.toBeUndefined();
    expect(waitingSignal.aborted).toBe(true);
    expect(fixture.cursor).not.toHaveBeenCalled();
  });
});
