import 'fake-indexeddb/auto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { computeContentPackHash } from '@408os/content-schema';
import type { ContentPack } from '@408os/domain';
import { ContentDatabase, ContentPackDowngradeError, DexieContentRepository } from '@408os/storage';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { installExtraContent, installVerifiedContentPack } from './storage';

const publicDir = path.resolve('apps', 'web', 'public');
const databases: ContentDatabase[] = [];

function connection(name: string) {
  const database = new ContentDatabase(name);
  databases.push(database);
  return new DexieContentRepository(database);
}

async function fixture() {
  const draft = JSON.parse(await readFile(path.join(publicDir, 'content', '2010.json'), 'utf8')) as ContentPack;
  const verified = structuredClone(draft);
  verified.manifest.reviewStatus = 'verified';
  verified.manifest.contentVersion = '2010.test-verified';
  for (const question of verified.questions) {
    question.reviewStatus = 'verified';
    question.contentVersion = verified.manifest.contentVersion;
  }
  verified.manifest.sha256 = computeContentPackHash(verified);
  const assetFetcher = async (input: RequestInfo | URL) => {
    const url = new URL(String(input), 'http://test.local');
    return new Response(new Uint8Array(await readFile(path.join(publicDir, ...url.pathname.split('/').filter(Boolean)))));
  };
  return { draft, verified, assetFetcher };
}

afterEach(() => { databases.splice(0).forEach((database) => database.close()); });

describe('verified content installation races', () => {
  it.each([false, true])('keeps a verified import completed during draft download (draft previously installed: %s)', async (alreadyInstalled) => {
    const { draft, verified, assetFetcher } = await fixture();
    const name = `verified-download-race-${crypto.randomUUID()}`;
    const repository = connection(name);
    const importingTab = connection(name);
    if (alreadyInstalled) await repository.installPack(draft, false);
    let release!: () => void;
    let started!: () => void;
    const held = new Promise<void>((resolve) => { release = resolve; });
    const downloading = new Promise<void>((resolve) => { started = resolve; });
    const put = vi.fn();
    const cacheStorage = { open: async () => ({ put }) as unknown as Cache };
    const schedule = vi.fn();
    const background = installExtraContent({
      repository, cacheStorage, schedule,
      fetcher: async (input) => {
        if (!String(input).startsWith('/content/2010.json')) return new Response('', { status: 404 });
        started();
        await held;
        return new Response(JSON.stringify(draft));
      },
    });
    await downloading;
    try {
      await installVerifiedContentPack(JSON.stringify(verified), { repository: importingTab, fetcher: assetFetcher, cacheStorage });
    } finally {
      release();
    }
    const cacheWritesAfterImport = put.mock.calls.length;
    expect(await background).toEqual({ issues: [], installedYears: [] });
    expect((await repository.listPacks())[0]).toEqual(verified.manifest);
    expect((await repository.listQuestions())[0]?.contentVersion).toBe(verified.manifest.contentVersion);
    expect(put).toHaveBeenCalledTimes(cacheWritesAfterImport);
    expect(schedule).not.toHaveBeenCalled();
  });

  it('checks again in the write transaction after another connection imports beyond the last manifest read', async () => {
    const { draft, verified, assetFetcher } = await fixture();
    const name = `verified-write-race-${crypto.randomUUID()}`;
    const repository = connection(name);
    const importingTab = connection(name);
    const put = vi.fn();
    const cacheStorage = { open: async () => ({ put }) as unknown as Cache };
    const schedule = vi.fn();
    const result = await installExtraContent({
      repository: {
        listPacks: () => repository.listPacks(),
        installPack: async (input, requireVerified) => {
          // The background installer has already decided this draft can install.
          await installVerifiedContentPack(JSON.stringify(verified), { repository: importingTab, fetcher: assetFetcher, cacheStorage });
          return repository.installPack(input, requireVerified);
        },
      },
      cacheStorage, schedule,
      fetcher: async (input) => String(input).startsWith('/content/2010.json')
        ? new Response(JSON.stringify(draft)) : new Response('', { status: 404 }),
    });
    expect(result).toEqual({ issues: [], installedYears: [] });
    expect(await repository.listPacks()).toEqual([verified.manifest]);
    expect(put.mock.calls.map(([assetPath]) => assetPath)).not.toContain('/content/2010.json');
    expect(schedule).not.toHaveBeenCalled();
  });

  it('serializes simultaneous installs from separate connections and still permits verified upgrades', async () => {
    const { draft, verified } = await fixture();
    const name = `verified-connections-${crypto.randomUUID()}`;
    const firstTab = connection(name);
    const secondTab = connection(name);
    const [verifiedResult, draftResult] = await Promise.allSettled([
      firstTab.installPack(verified, true),
      secondTab.installPack(draft, false),
    ]);
    expect(verifiedResult.status).toBe('fulfilled');
    // Either order is safe: draft first then verified, or a rejected downgrade.
    if (draftResult.status === 'rejected') expect(draftResult.reason).toBeInstanceOf(ContentPackDowngradeError);
    expect(await secondTab.listPacks()).toEqual([verified.manifest]);
    await expect(secondTab.installPack(draft, false)).rejects.toBeInstanceOf(ContentPackDowngradeError);

    const newer = structuredClone(verified);
    newer.manifest.contentVersion = '2010.test-verified-2';
    for (const question of newer.questions) question.contentVersion = newer.manifest.contentVersion;
    newer.manifest.sha256 = computeContentPackHash(newer);
    await expect(secondTab.installPack(newer, false)).resolves.toEqual(newer.manifest);
    expect(await firstTab.listPacks()).toEqual([newer.manifest]);
  });
});
