import { beforeEach, describe, expect, it, vi } from 'vitest';
import pack from '../../public/content/learning.json';
import { ApiFailure } from './api';
import { loadServerLearningContent } from './server-learning';

const fixture = vi.hoisted(() => ({
  api: vi.fn(), get: vi.fn(), install: vi.fn(), cache: vi.fn(),
  account: { value: { account: { id: 'learning-account' } } as { account: { id: string } } | null },
}));
vi.mock('./api', async (original) => ({ ...await original<typeof import('./api')>(), api: fixture.api }));
vi.mock('./account', () => ({ get activeAccount() { return fixture.account.value; } }));
vi.mock('./storage', () => ({ storage: { learningContentRepository: { get: fixture.get, install: fixture.install } } }));
vi.mock('./account-cache', () => ({ accountCache: { installPack: fixture.cache } }));
const catalog = [{ id: pack.id, kind: 'learning', version: pack.version, digest: pack.sha256 }];
beforeEach(() => {
  vi.resetAllMocks();
  fixture.account.value = { account: { id: 'learning-account' } };
  fixture.get.mockResolvedValue(undefined);
  fixture.api.mockImplementation(async (route: string) => route === '/content' ? catalog : pack);
  fixture.cache.mockImplementation((_id: string, _bytes: number, install: () => unknown) => install());
  fixture.install.mockResolvedValue(pack);
});

describe('server learning pack startup', () => {
  it('reuses an integrity-checked unchanged pack without downloading or installing its body', async () => {
    fixture.get.mockResolvedValue(pack);
    await expect(loadServerLearningContent()).resolves.toEqual(pack);
    expect(fixture.api).toHaveBeenCalledExactlyOnceWith('/content', undefined, 'GET', 'learning-account');
    expect(fixture.install).not.toHaveBeenCalled();
    expect(fixture.cache).not.toHaveBeenCalled();
  });

  it('installs a new pack with the initiating account and catalog digest', async () => {
    await expect(loadServerLearningContent()).resolves.toEqual(pack);
    expect(fixture.api).toHaveBeenLastCalledWith(`/content/${pack.id}`, undefined, 'GET', 'learning-account');
    expect(fixture.install).toHaveBeenCalledExactlyOnceWith(pack);
  });

  it('refuses a changed catalog rather than silently using the wrong content version', async () => {
    fixture.api.mockImplementation(async (route: string) => route === '/content' ? [{ ...catalog[0], digest: 'a'.repeat(64) }] : pack);
    await expect(loadServerLearningContent()).rejects.toThrow(/目录/);
    expect(fixture.install).not.toHaveBeenCalled();
  });

  it('uses a verified installed pack on transport failure only', async () => {
    fixture.get.mockResolvedValue(pack);
    fixture.api.mockRejectedValue(new TypeError('offline'));
    await expect(loadServerLearningContent()).resolves.toEqual(pack);
    fixture.api.mockRejectedValue(new ApiFailure(503, 'UNAVAILABLE', 'server unavailable'));
    await expect(loadServerLearningContent()).rejects.toThrow('server unavailable');
    fixture.api.mockResolvedValue([]);
    await expect(loadServerLearningContent()).rejects.toThrow(/未发布/);
  });

  it('rejects corrupt cached content even offline', async () => {
    fixture.get.mockResolvedValue({ ...pack, sha256: '0'.repeat(64) });
    fixture.api.mockRejectedValue(new TypeError('offline'));
    await expect(loadServerLearningContent()).rejects.toThrow();
    expect(fixture.install).not.toHaveBeenCalled();
  });

  it('does not install a late response after logout or a new login to the same account', async () => {
    let complete!: (value: unknown) => void;
    fixture.api.mockImplementation((route: string) => route === '/content' ? Promise.resolve(catalog)
      : new Promise((resolve) => { complete = resolve; }));
    const installing = loadServerLearningContent();
    await vi.waitFor(() => expect(complete).toBeTypeOf('function'));
    fixture.account.value = { account: { id: 'learning-account' } };
    complete(pack);
    await expect(installing).resolves.toBeUndefined();
    expect(fixture.cache).not.toHaveBeenCalled();
    expect(fixture.install).not.toHaveBeenCalled();
  });

  it('checks the session again after waiting for the cache budget lock', async () => {
    fixture.cache.mockImplementation(async (_id: string, _bytes: number, install: () => unknown) => {
      fixture.account.value = null;
      return install();
    });
    await expect(loadServerLearningContent()).rejects.toThrow(/账号/);
    expect(fixture.install).not.toHaveBeenCalled();
  });
});
