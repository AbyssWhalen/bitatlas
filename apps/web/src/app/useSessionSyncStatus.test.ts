import 'fake-indexeddb/auto';
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getAccountSnapshot, lockAccount, loginAccount, synchronize } from './account';
import { storage } from './storage';
import { useSessionSyncStatus } from './useSessionSyncStatus';

const fixture = vi.hoisted(() => ({ server: true, api: vi.fn() }));
vi.mock('./server-mode', () => ({ get SERVER_MODE() { return fixture.server; } }));
vi.mock('./api', () => ({ api: fixture.api, setApiAccount: vi.fn() }));

const makeSession = () => ({
  account: { id: crypto.randomUUID(), username: 'member', role: 'member' as const },
  authenticatedAt: Date.now() - 1_000, offlineUntil: Date.now() + 60_000,
});
async function login(session = makeSession()) {
  fixture.api.mockResolvedValueOnce(session);
  await act(async () => { await loginAccount('testmember', 'test-only-password'); });
  return session;
}
const pull = { cursor: { epoch: 'fixture', sequence: 0 }, reconcile: false, entities: [], more: false };
beforeEach(() => { fixture.server = true; fixture.api.mockReset(); });
afterEach(() => { cleanup(); lockAccount(); vi.restoreAllMocks(); });

describe('read-only session indicators', () => {
  it('reads no account database or network in local mode, and distinguishes a locked server', () => {
    const watch = vi.spyOn(storage.syncRepository, 'subscribePendingCount');
    fixture.server = false;
    const { result, unmount } = renderHook(useSessionSyncStatus);
    expect(result.current).toEqual({ mode: 'local', loggedIn: null, pendingCount: null, offlineUntil: null, lastSuccessfulSyncAt: null });
    unmount();
    fixture.server = true;
    expect(renderHook(useSessionSyncStatus).result.current).toEqual({
      mode: 'server', loggedIn: false, pendingCount: null, offlineUntil: null, lastSuccessfulSyncAt: null,
    });
    expect(watch).not.toHaveBeenCalled();
    expect(fixture.api).not.toHaveBeenCalled();
  });
  it('observes committed outbox writes; zero or a failed pull does not imply successful synchronization', async () => {
    const session = await login();
    const { result } = renderHook(useSessionSyncStatus);
    expect(result.current).toMatchObject({ loggedIn: true, offlineUntil: new Date(session.offlineUntil).toISOString(), pendingCount: null });
    await waitFor(() => expect(result.current.pendingCount).toBe(0));
    expect(result.current.lastSuccessfulSyncAt).toBeNull();
    const ts = new Date().toISOString();
    await act(() => storage.annotationRepository.saveNote({ id: 'note', questionId: 'q', body: 'fixture', createdAt: ts, updatedAt: ts }, null));
    await waitFor(() => expect(result.current.pendingCount).toBe(1));
    fixture.api.mockRejectedValueOnce(new Error('network unavailable'));
    await expect(synchronize()).rejects.toThrow('network unavailable');
    expect(result.current.lastSuccessfulSyncAt).toBeNull();
    fixture.api.mockResolvedValueOnce(pull).mockResolvedValueOnce({ status: 'accepted', entities: [] });
    const start = Date.now();
    await act(() => synchronize());
    await waitFor(() => expect(result.current.pendingCount).toBe(0));
    const success = Date.parse(result.current.lastSuccessfulSyncAt!);
    expect(success).toBeGreaterThanOrEqual(start);
    expect(success).toBeLessThanOrEqual(Date.now());
    fixture.api.mockRejectedValueOnce(new Error('next pull failed'));
    await expect(synchronize()).rejects.toThrow('next pull failed');
    expect(Date.parse(result.current.lastSuccessfulSyncAt!)).toBe(success);
  });
  it('does not carry pending or success across lock, including another login to the same account', async () => {
    const session = await login();
    fixture.api.mockResolvedValueOnce(pull);
    await synchronize(); // No consumer was mounted during success.
    const { result } = renderHook(useSessionSyncStatus);
    await waitFor(() => expect(result.current.pendingCount).toBe(0));
    expect(result.current.lastSuccessfulSyncAt).not.toBeNull();
    act(lockAccount);
    expect(result.current).toMatchObject({ loggedIn: false, pendingCount: null, lastSuccessfulSyncAt: null });
    await login(session);
    expect(result.current.lastSuccessfulSyncAt).toBeNull();
    await waitFor(() => expect(result.current.pendingCount).toBe(0));
    const other = await login();
    expect(result.current.offlineUntil).toBe(new Date(other.offlineUntil).toISOString());
    expect(result.current.lastSuccessfulSyncAt).toBeNull();
  });
  it('hides the account projection at offline expiry without treating the expiry as a synchronization event', async () => {
    const session = await login();
    const { result } = renderHook(useSessionSyncStatus);
    await waitFor(() => expect(result.current.pendingCount).toBe(0));
    vi.spyOn(Date, 'now').mockReturnValue(session.offlineUntil);
    act(() => { window.dispatchEvent(new Event('focus')); });
    expect(getAccountSnapshot().session).toBeNull();
    expect(result.current).toMatchObject({ loggedIn: false, pendingCount: null, offlineUntil: null, lastSuccessfulSyncAt: null });
  });
});
