import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const fixture = vi.hoisted(() => ({
  rows: new Map<string, { key: string; accountId: string; bytes: number; lastUsed: number; pinned: boolean; unique: boolean; kind: 'response' | 'pack' }>(),
  account: { account: { id: 'account-a' }, offlineUntil: Number.MAX_SAFE_INTEGER },
}));
vi.mock('./account', () => ({
  get activeAccount() { return fixture.account; },
  accountRegistry: { cache: {
    toArray: async () => [...fixture.rows.values()],
    get: async (key: string) => fixture.rows.get(key),
    put: async (value: typeof fixture.rows extends Map<string, infer T> ? T : never) => { fixture.rows.set(value.key, value); },
    delete: async (key: string) => { fixture.rows.delete(key); },
    update: async (key: string, patch: object) => { const row = fixture.rows.get(key); if (row) fixture.rows.set(key, { ...row, ...patch }); },
  } },
}));
import { accountCache } from './account-cache';
const responses = new Map<string, Response>();
beforeEach(() => {
  fixture.rows.clear(); responses.clear(); fixture.account.account.id = 'account-a'; fixture.account.offlineUntil = Number.MAX_SAFE_INTEGER;
  vi.stubGlobal('caches', { open: async () => ({
    match: async (key: string) => responses.get(key)?.clone(),
    put: async (key: string, response: Response) => { responses.set(key, response.clone()); },
    delete: async (key: string) => responses.delete(key),
  }) });
});
afterEach(() => vi.unstubAllGlobals());
describe('account cache budget and rollback', () => {
  it('evicts replaceable bytes across accounts without making another accounts PDF readable', async () => {
    await accountCache.store('asset', new Response('a'), 180_000_000);
    await accountCache.store('pdf:only-a', new Response('private a'), 120_000_000, true);
    fixture.account.account.id = 'account-b';
    expect(await accountCache.read('pdf:only-a')).toBeUndefined();
    await accountCache.store('asset', new Response('b'), 180_000_000);
    expect(await accountCache.stats()).toMatchObject({ replaceable: 180_000_000, protected: 120_000_000 });
    fixture.account.account.id = 'account-a';
    expect(await accountCache.read('asset')).toBeUndefined();
    expect(await (await accountCache.read('pdf:only-a'))?.text()).toBe('private a');
  });
  it('rolls back pack reservations on install failure, preserving the old byte accounting', async () => {
    await accountCache.installPack('questions', 5000, async () => 'installed');
    await expect(accountCache.installPack('questions', 7000, async () => { throw new Error('quota'); })).rejects.toThrow('quota');
    await expect(accountCache.installPack('new', 2000, async () => { throw new Error('quota'); })).rejects.toThrow('quota');
    expect((await accountCache.stats()).replaceable).toBe(5000);
    expect(fixture.rows.size).toBe(1);
  });
  it('refuses budget overflow when only installed packs remain and does not start the install', async () => {
    await accountCache.installPack('questions', 240_000_000, async () => true);
    const install = vi.fn(async () => true);
    await expect(accountCache.installPack('more', 20_000_000, install)).rejects.toThrow('额度不足');
    expect(install).not.toHaveBeenCalled();
    expect((await accountCache.stats()).replaceable).toBe(240_000_000);
  });
  it('locks cached content when offline eligibility expires', async () => {
    await accountCache.store('private', new Response('private'), 100);
    fixture.account.offlineUntil = 1;
    await expect(accountCache.read('private')).rejects.toThrow('已锁定');
    await expect(accountCache.stats()).rejects.toThrow('已锁定');
  });
});
