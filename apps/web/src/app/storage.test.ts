import { createHash } from 'node:crypto';
import { computeContentPackHash } from '@408os/content-schema';
import type { ContentPack } from '@408os/domain';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  cacheInstalledPackAssets,
  cacheInstalledPackDocument,
  CONTENT_ASSET_CACHE_NAME,
  CONTENT_ASSET_WARM_DELAY_MS,
  CONTENT_PACK_CACHE_NAME,
  installLocalContent,
  installVerifiedContentPack,
  listPackAssetPaths,
  scheduleInstalledPackAssetCaching,
} from './storage';

const sha256 = (value: string) => createHash('sha256').update(value).digest('hex');

const pack = {
  manifest: { id: 'cn408-2010', sha256: 'a'.repeat(64), year: 2010 },
  assets: [
    { path: '/content/cn408-2010/source/page-1.png', sha256: sha256('page-1') },
    { path: '/content/cn408-2010/source/page-2.png', sha256: sha256('page-2') },
    { path: '/content/cn408-2010/source/page-2.png', sha256: sha256('page-2') },
    { path: '/content/another-pack/source/page-3.png', sha256: sha256('page-3') },
    { path: 'https://example.com/untrusted.png', sha256: sha256('untrusted') },
  ],
};

const installed2009 = {
  id: 'cn408-2009',
  year: 2009,
  sha256: 'b'.repeat(64),
};

function verifiedPack(): ContentPack {
  const questionAsset = {
    id: 'cn408-2010-source-questions-page-1',
    path: '/content/cn408-2010/source/questions-page-1.png',
    mimeType: 'image/png' as const,
    sha256: sha256('questions-page'),
    sourcePage: 1,
  };
  const answerAsset = {
    id: 'cn408-2010-source-answers-page-1',
    path: '/content/cn408-2010/source/answers-page-1.png',
    mimeType: 'image/png' as const,
    sha256: sha256('answers-page'),
    sourcePage: 1,
  };
  const sourceDocument = (title: string, fileName: string, digest: string) => ({
    publisher: 'Test source',
    title,
    url: `https://example.com/${fileName}`,
    fileName,
    sha256: digest,
    pages: [1],
    locator: 'page 1',
  });
  const result: ContentPack = {
    manifest: {
      id: 'cn408-2010',
      schemaVersion: 1,
      contentVersion: '2010.1',
      title: '2010 verified test pack',
      year: 2010,
      questionCount: 1,
      createdAt: '2026-08-07T00:00:00.000Z',
      sha256: '0'.repeat(64),
      reviewStatus: 'verified',
    },
    questions: [{
      id: 'cn408-2010-q01',
      year: 2010,
      number: 1,
      subject: 'data-structures',
      kind: 'single-choice',
      stem: [{ type: 'text', text: 'Verified question' }],
      options: ['A', 'B', 'C', 'D'].map((id) => ({
        id: id as 'A' | 'B' | 'C' | 'D',
        content: [{ type: 'text' as const, text: `Option ${id}` }],
      })),
      answer: { type: 'choice', optionId: 'A' },
      explanation: [],
      hints: [],
      knowledgePointIds: ['ds-root'],
      assetIds: [],
      source: {
        question: sourceDocument('Questions', 'questions.pdf', '1'.repeat(64)),
        answer: sourceDocument('Answers', 'answers.pdf', '2'.repeat(64)),
        crosschecks: [],
        redistribution: 'unknown',
      },
      contentVersion: '2010.1',
      reviewStatus: 'verified',
    }],
    knowledgePoints: [{ id: 'ds-root', subject: 'data-structures', name: 'Data structures' }],
    assets: [questionAsset, answerAsset],
  };
  result.manifest.sha256 = computeContentPackHash(result);
  return result;
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('installed content caching', () => {
  it('selects unique asset paths inside the pack namespace', () => {
    expect(listPackAssetPaths(pack)).toEqual([
      '/content/cn408-2010/source/page-1.png',
      '/content/cn408-2010/source/page-2.png',
    ]);
  });

  it('caches only missing assets whose bytes match the installed manifest hash', async () => {
    const match = vi.fn(async (path: string) => (
      path.endsWith('page-1.png') ? new Response('page-1') : undefined
    ));
    const put = vi.fn(async (path: string, response: Response) => { void path; void response; });
    const deleteEntry = vi.fn(async () => true);
    const open = vi.fn(async () => ({ match, put, delete: deleteEntry }) as unknown as Cache);
    const fetcher = vi.fn(async (path: string | URL | Request) => {
      expect(String(path)).toContain('__408os_validate=');
      return new Response('page-2', { status: 200 });
    });

    await expect(cacheInstalledPackAssets(pack, false, { open }, fetcher)).resolves.toBe(true);
    expect(open).toHaveBeenCalledWith(CONTENT_ASSET_CACHE_NAME);
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(put).toHaveBeenCalledTimes(1);
    expect(put.mock.calls[0]?.[0]).toBe('/content/cn408-2010/source/page-2.png');
    expect(deleteEntry).not.toHaveBeenCalled();
  });

  it('does not replace a cached asset when downloaded bytes fail the manifest hash', async () => {
    const match = vi.fn(async () => undefined);
    const put = vi.fn(async (path: string, response: Response) => { void path; void response; });
    const deleteEntry = vi.fn(async () => true);
    const open = vi.fn(async () => ({ match, put, delete: deleteEntry }) as unknown as Cache);
    const fetcher = vi.fn(async () => new Response('corrupt', { status: 200 }));

    await expect(cacheInstalledPackAssets(pack, true, { open }, fetcher)).resolves.toBe(false);
    expect(put).not.toHaveBeenCalled();
  });

  it('replaces same-path assets only after the new bytes pass hash verification', async () => {
    const match = vi.fn(async () => new Response('stale'));
    const put = vi.fn(async (path: string, response: Response) => { void path; void response; });
    const deleteEntry = vi.fn(async () => true);
    const open = vi.fn(async () => ({ match, put, delete: deleteEntry }) as unknown as Cache);
    const fetcher = vi.fn(async (path: string | URL | Request) => (
      new Response(String(path).includes('page-1') ? 'page-1' : 'page-2', { status: 200 })
    ));

    await expect(cacheInstalledPackAssets(pack, true, { open }, fetcher)).resolves.toBe(true);
    expect(put.mock.calls.map(([path]) => path)).toEqual(listPackAssetPaths(pack));
  });

  it('degrades without throwing when Cache Storage is unavailable or rejects', async () => {
    await expect(cacheInstalledPackAssets(pack, false, undefined)).resolves.toBe(false);
    const open = vi.fn(async () => Promise.reject(new Error('quota exceeded')));
    await expect(cacheInstalledPackAssets(pack, false, { open })).resolves.toBe(false);
  });

  it('stores the pack document in the dedicated validated cache', async () => {
    const put = vi.fn(async (path: string, response: Response) => { void path; void response; });
    const open = vi.fn(async () => ({ put }) as unknown as Cache);
    const response = new Response('{"manifest":{}}', { headers: { 'content-type': 'application/json' } });

    await expect(cacheInstalledPackDocument('/content/2009.json', response, { open })).resolves.toBe(true);
    expect(open).toHaveBeenCalledWith(CONTENT_PACK_CACHE_NAME);
    expect(put).toHaveBeenCalledWith('/content/2009.json', response);
  });

  it('defers large asset warming until after the first usable screen', () => {
    const schedule = vi.fn((callback: () => void, delayMs: number) => { void callback; void delayMs; });

    scheduleInstalledPackAssetCaching(pack, true, schedule);

    expect(schedule).toHaveBeenCalledTimes(1);
    expect(schedule.mock.calls[0]?.[1]).toBe(CONTENT_ASSET_WARM_DELAY_MS);
  });
});

describe('local content installation', () => {
  it('marks a missing network and cache document as an expected unavailable-content state', async () => {
    const repository = {
      listPacks: vi.fn(async () => []),
      installPack: vi.fn(),
    };
    const fetcher = vi.fn(async () => new Response('', { status: 404 }));

    await expect(installLocalContent({ repository, fetcher })).rejects.toMatchObject({
      name: 'LocalContentUnavailableError',
    });
    expect(repository.installPack).not.toHaveBeenCalled();
  });

  it('keeps an unexpected network failure fail-closed when no local pack exists', async () => {
    const repository = {
      listPacks: vi.fn(async () => []),
      installPack: vi.fn(),
    };
    const networkFailure = new TypeError('network unavailable');
    const fetcher = vi.fn(async () => Promise.reject(networkFailure));

    await expect(installLocalContent({ repository, fetcher })).rejects.toBe(networkFailure);
  });

  it('writes the network document to Cache Storage only after repository validation and install succeed', async () => {
    const order: string[] = [];
    const repository = {
      listPacks: vi.fn(async () => []),
      installPack: vi.fn(async () => {
        order.push('install');
        return installed2009;
      }),
    };
    const put = vi.fn(async () => { order.push('cache'); });
    const open = vi.fn(async () => ({ put }) as unknown as Cache);
    const fetcher = vi.fn(async () => new Response(JSON.stringify({
      manifest: installed2009,
      assets: [],
    }), { status: 200 }));
    const schedule = vi.fn();

    await expect(installLocalContent({ repository, fetcher, cacheStorage: { open }, schedule })).resolves.toBeUndefined();
    expect(order).toEqual(['install', 'cache']);
    expect(repository.installPack).toHaveBeenCalledWith(expect.any(Object), false);
    expect(schedule).toHaveBeenCalledTimes(1);
  });

  it('does not cache an HTTP 200 document when hash validation or install fails', async () => {
    const repository = {
      listPacks: vi.fn(async () => []),
      installPack: vi.fn(async () => Promise.reject(new Error('Content pack hash mismatch.'))),
    };
    const put = vi.fn();
    const match = vi.fn(async () => undefined);
    const open = vi.fn(async () => ({ put, match }) as unknown as Cache);
    const fetcher = vi.fn(async () => new Response(JSON.stringify({
      manifest: { id: 'cn408-2009', year: 2009, sha256: '0'.repeat(64) },
      assets: [],
    }), { status: 200 }));

    await expect(installLocalContent({ repository, fetcher, cacheStorage: { open } })).rejects.toThrow('hash mismatch');
    expect(put).not.toHaveBeenCalled();
  });

  it('keeps the installed IndexedDB pack when an HTTP 200 document fails hash validation', async () => {
    const repository = {
      listPacks: vi.fn(async () => [installed2009]),
      installPack: vi.fn(async () => Promise.reject(new Error('Content pack hash mismatch.'))),
    };
    const put = vi.fn();
    const open = vi.fn(async () => ({ put }) as unknown as Cache);
    const fetcher = vi.fn(async () => new Response(JSON.stringify({
      manifest: { id: 'cn408-2009', year: 2009, sha256: '0'.repeat(64) },
      assets: [],
    }), { status: 200 }));

    await expect(installLocalContent({ repository, fetcher, cacheStorage: { open } })).resolves.toBeUndefined();
    expect(repository.installPack).toHaveBeenCalledTimes(1);
    expect(put).not.toHaveBeenCalled();
  });

  it('keeps the installed IndexedDB pack when an HTTP 200 response is not JSON', async () => {
    const repository = {
      listPacks: vi.fn(async () => [installed2009]),
      installPack: vi.fn(),
    };
    const put = vi.fn();
    const open = vi.fn(async () => ({ put }) as unknown as Cache);
    const fetcher = vi.fn(async () => new Response('<html>broken</html>', { status: 200 }));

    await expect(installLocalContent({ repository, fetcher, cacheStorage: { open } })).resolves.toBeUndefined();
    expect(repository.installPack).not.toHaveBeenCalled();
    expect(put).not.toHaveBeenCalled();
  });

  it('keeps the installed IndexedDB pack when the network request fails', async () => {
    const repository = {
      listPacks: vi.fn(async () => [installed2009]),
      installPack: vi.fn(),
    };
    const fetcher = vi.fn(async () => Promise.reject(new TypeError('offline')));

    await expect(installLocalContent({ repository, fetcher })).resolves.toBeUndefined();
    expect(repository.installPack).not.toHaveBeenCalled();
  });

  it('restores a validated cached pack when both IndexedDB and the network are unavailable', async () => {
    const repository = {
      listPacks: vi.fn(async () => []),
      installPack: vi.fn(async () => installed2009),
    };
    const cached = new Response(JSON.stringify({ manifest: installed2009, assets: [] }), { status: 200 });
    const match = vi.fn(async () => cached);
    const open = vi.fn(async () => ({ match }) as unknown as Cache);
    const fetcher = vi.fn(async () => Promise.reject(new TypeError('offline')));

    await expect(installLocalContent({ repository, fetcher, cacheStorage: { open } })).resolves.toBeUndefined();
    expect(repository.installPack).toHaveBeenCalledWith(expect.any(Object), false);
  });

  it('does not downgrade an installed verified pack with the startup draft document', async () => {
    const installedVerified = { ...installed2009, reviewStatus: 'verified' as const };
    const repository = {
      listPacks: vi.fn(async () => [installedVerified]),
      installPack: vi.fn(),
    };
    const put = vi.fn();
    const open = vi.fn(async () => ({ put }) as unknown as Cache);
    const schedule = vi.fn();
    const fetcher = vi.fn(async () => new Response(JSON.stringify({
      manifest: { ...installedVerified, sha256: 'c'.repeat(64), reviewStatus: 'needs-review' },
      assets: [],
    }), { status: 200 }));

    await expect(installLocalContent({ repository, fetcher, cacheStorage: { open }, schedule })).resolves.toBeUndefined();
    expect(repository.installPack).not.toHaveBeenCalled();
    expect(open).not.toHaveBeenCalled();
    expect(schedule).not.toHaveBeenCalled();
  });
});

describe('verified content activation', () => {
  it('validates every asset before installing a canonical verified local pack', async () => {
    const candidate = verifiedPack();
    const order: string[] = [];
    const repository = {
      listPacks: vi.fn(async () => []),
      installPack: vi.fn(async () => {
        order.push('install');
        return candidate.manifest;
      }),
    };
    const match = vi.fn(async () => undefined);
    const put = vi.fn(async () => { order.push('cache'); });
    const open = vi.fn(async () => ({ match, put }) as unknown as Cache);
    const fetcher = vi.fn(async (input: RequestInfo | URL) => new Response(
      String(input).includes('questions-page-1') ? 'questions-page' : 'answers-page',
      { status: 200 },
    ));

    await expect(installVerifiedContentPack(JSON.stringify(candidate), {
      repository,
      cacheStorage: { open },
      fetcher,
    })).resolves.toEqual(candidate.manifest);

    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(put).toHaveBeenCalledTimes(2);
    expect(order).toEqual(['install', 'cache', 'cache']);
    expect(repository.installPack).toHaveBeenCalledWith(candidate, true);
  });

  it('does not replace shared cached assets when the content transaction fails', async () => {
    const candidate = verifiedPack();
    const repository = {
      listPacks: vi.fn(async () => []),
      installPack: vi.fn(async () => Promise.reject(new Error('IndexedDB transaction failed'))),
    };
    const match = vi.fn(async () => undefined);
    const put = vi.fn();
    const open = vi.fn(async () => ({ match, put }) as unknown as Cache);
    const fetcher = vi.fn(async (input: RequestInfo | URL) => new Response(
      String(input).includes('questions-page-1') ? 'questions-page' : 'answers-page',
      { status: 200 },
    ));

    await expect(installVerifiedContentPack(JSON.stringify(candidate), {
      repository,
      cacheStorage: { open },
      fetcher,
    })).rejects.toThrow('IndexedDB transaction failed');

    expect(open).not.toHaveBeenCalled();
    expect(put).not.toHaveBeenCalled();
  });

  it('validates and installs when Cache Storage is unavailable', async () => {
    const candidate = verifiedPack();
    const repository = {
      listPacks: vi.fn(async () => []),
      installPack: vi.fn(async () => candidate.manifest),
    };
    const fetcher = vi.fn(async (input: RequestInfo | URL) => new Response(
      String(input).includes('questions-page-1') ? 'questions-page' : 'answers-page',
      { status: 200 },
    ));

    await expect(installVerifiedContentPack(JSON.stringify(candidate), {
      repository,
      fetcher,
    })).resolves.toEqual(candidate.manifest);

    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(repository.installPack).toHaveBeenCalledWith(candidate, true);
  });

  it('rejects non-verified and non-canonical local packs before reading assets', async () => {
    const candidate = verifiedPack();
    const repository = { listPacks: vi.fn(async () => []), installPack: vi.fn() };
    const fetcher = vi.fn();
    const open = vi.fn();
    const unverified = structuredClone(candidate);
    unverified.manifest.reviewStatus = 'needs-review';
    unverified.questions[0]!.reviewStatus = 'needs-review';
    unverified.manifest.sha256 = computeContentPackHash(unverified);

    await expect(installVerifiedContentPack(JSON.stringify(unverified), {
      repository,
      cacheStorage: { open },
      fetcher,
    })).rejects.toThrow(/verified|manually verified/i);

    const tampered = structuredClone(candidate);
    tampered.questions[0]!.stem = [{ type: 'text', text: 'Tampered after release' }];
    await expect(installVerifiedContentPack(JSON.stringify(tampered), {
      repository,
      cacheStorage: { open },
      fetcher,
    })).rejects.toThrow(/hash/i);

    expect(fetcher).not.toHaveBeenCalled();
    expect(open).not.toHaveBeenCalled();
    expect(repository.installPack).not.toHaveBeenCalled();
  });

  it('does not install when any declared asset fails its digest', async () => {
    const candidate = verifiedPack();
    const repository = { listPacks: vi.fn(async () => []), installPack: vi.fn() };
    const match = vi.fn(async () => undefined);
    const put = vi.fn();
    const open = vi.fn(async () => ({ match, put }) as unknown as Cache);
    const fetcher = vi.fn(async () => new Response('corrupt', { status: 200 }));

    await expect(installVerifiedContentPack(JSON.stringify(candidate), {
      repository,
      cacheStorage: { open },
      fetcher,
    })).rejects.toThrow(/asset/i);

    expect(open).not.toHaveBeenCalled();
    expect(put).not.toHaveBeenCalled();
    expect(repository.installPack).not.toHaveBeenCalled();
  });

  it('rejects malformed JSON without touching storage', async () => {
    const repository = { listPacks: vi.fn(async () => []), installPack: vi.fn() };

    await expect(installVerifiedContentPack('{broken', { repository })).rejects.toThrow(/JSON/i);
    expect(repository.installPack).not.toHaveBeenCalled();
  });
});
