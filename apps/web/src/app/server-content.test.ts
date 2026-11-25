import { beforeEach, describe, expect, it, vi } from 'vitest';

const fixture = vi.hoisted(() => ({
  api: vi.fn(),
  cacheInstall: vi.fn(),
  createStorage: (options?: { accountId?: string }) => ({
    userDatabase: { accountId: options?.accountId, close: vi.fn(), isOpen: () => true },
    contentDatabase: { close: vi.fn() },
    contentRepository: {
      listPacks: vi.fn(async (): Promise<Array<{ id: string; sha256: string }>> => []),
      installPack: vi.fn(async (input: unknown) => input),
    },
  }),
}));
vi.mock('./api', () => ({ api: fixture.api }));
vi.mock('./account-cache', () => ({ accountCache: { installPack: fixture.cacheInstall } }));
vi.mock('@408os/storage', async (original) => ({
  ...await original<typeof import('@408os/storage')>(), createStorage: fixture.createStorage,
}));
import { activateAccountStorage, installServerContent, storage } from './storage';

const accountId = '419ebfd1-4b11-4a7b-9e00-019b384fd511';
const secondId = '16d518fb-47d1-45c7-b902-14c592649a36';
const entries = Array.from({ length: 5 }, (_, index) => ({ id: `pack-${index}`, digest: String(index), kind: 'questions' }));
beforeEach(() => {
  vi.clearAllMocks();
  activateAccountStorage(storage.userDatabase.accountId === accountId ? secondId : accountId);
  fixture.cacheInstall.mockImplementation((_id: string, _bytes: number, install: () => Promise<unknown>) => install());
});

describe('server content initialization', () => {
  it('overlaps at most three downloads and waits for all installations', async () => {
    const gates = new Map<string, (value: unknown) => void>();
    fixture.api.mockImplementation((route: string) => route === '/content' ? Promise.resolve(entries)
      : new Promise((resolve) => gates.set(route, resolve)));
    const installing = installServerContent();
    await vi.waitFor(() => expect(gates.size).toBe(3));
    expect(storage.contentRepository.installPack).not.toHaveBeenCalled();
    gates.get('/content/pack-0')!({ id: 'pack-0' });
    await vi.waitFor(() => expect(gates.size).toBe(4));
    gates.get('/content/pack-1')!({ id: 'pack-1' });
    await vi.waitFor(() => expect(gates.size).toBe(5));
    for (const index of [2, 3, 4]) gates.get(`/content/pack-${index}`)!({ id: `pack-${index}` });
    await installing;
    expect(storage.contentRepository.installPack).toHaveBeenCalledTimes(5);
    expect(storage.contentRepository.listPacks).toHaveBeenCalledTimes(1);
  });

  it('does not redownload unchanged packs or the independently loaded learning pack', async () => {
    vi.mocked(storage.contentRepository.listPacks).mockResolvedValue([{ id: 'pack-0', sha256: '0' }] as never);
    fixture.api.mockResolvedValue([entries[0], { id: 'learning', kind: 'learning', digest: '1' }]);
    await installServerContent();
    expect(fixture.api).toHaveBeenCalledTimes(1);
    expect(storage.contentRepository.installPack).not.toHaveBeenCalled();
  });

  it('binds requests and installs to the account that started them', async () => {
    const previous = storage;
    const owner = previous.userDatabase.accountId;
    let complete!: (input: unknown) => void;
    fixture.api.mockImplementation((route: string) => route === '/content' ? Promise.resolve([entries[0]])
      : new Promise((resolve) => { complete = resolve; }));
    const installing = installServerContent();
    await vi.waitFor(() => expect(fixture.api).toHaveBeenCalledTimes(2));
    expect(fixture.api).toHaveBeenLastCalledWith('/content/pack-0', undefined, 'GET', owner);
    activateAccountStorage(owner === accountId ? secondId : accountId);
    complete({ id: 'old-account-download' });
    await installing;
    expect(previous.contentRepository.installPack).not.toHaveBeenCalled();
    expect(storage.contentRepository.installPack).not.toHaveBeenCalled();
    expect(fixture.cacheInstall).not.toHaveBeenCalled();
  });

  it('checks the account again after a queued cache reservation', async () => {
    fixture.api.mockImplementation((route: string) => Promise.resolve(route === '/content' ? [entries[0]] : { id: 'pack-0' }));
    const previous = storage;
    fixture.cacheInstall.mockImplementation(async (_id: string, _bytes: number, install: () => Promise<unknown>) => {
      activateAccountStorage(previous.userDatabase.accountId === accountId ? secondId : accountId);
      return install();
    });
    await installServerContent();
    expect(previous.contentRepository.installPack).not.toHaveBeenCalled();
    expect(storage.contentRepository.installPack).not.toHaveBeenCalled();
  });

  it('uses an installed pack offline, but rejects an empty offline installation', async () => {
    fixture.api.mockRejectedValue(new TypeError('offline'));
    await expect(installServerContent()).rejects.toThrow('offline');
    vi.mocked(storage.contentRepository.listPacks).mockResolvedValue([{ id: 'pack-0', sha256: '0' }] as never);
    await expect(installServerContent()).resolves.toBeUndefined();
  });

  it('does not treat validation or storage failures as offline success', async () => {
    fixture.api.mockImplementation((route: string) => Promise.resolve(route === '/content' ? [entries[0]] : { id: 'pack-0' }));
    vi.mocked(storage.contentRepository.listPacks).mockResolvedValue([{ id: 'other-pack', sha256: '1' }] as never);
    vi.mocked(storage.contentRepository.installPack).mockRejectedValue(new Error('invalid digest'));
    await expect(installServerContent()).rejects.toThrow('invalid digest');
  });
});
