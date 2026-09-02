import { parseContentPack, validateContentPack } from '@408os/content-schema';
import { createStorage } from '@408os/storage';

export const CONTENT_ASSET_CACHE_NAME = '408os-content-assets-v2';
export const CONTENT_PACK_CACHE_NAME = '408os-content-packs-v2';
export const CONTENT_ASSET_WARM_DELAY_MS = 5_000;

const LOCAL_PACK_PATH = '/content/2009.json';
const LOCAL_PACK_YEAR = 2009;
// 旗舰年份（2009）走 installLocalContent 的空内容模式合同；
// 扩展年份按“可选内容”安装：显式 404 = 未安装（正常），解析/校验失败记录为问题但不阻塞其他年份。
export const EXTRA_PACK_YEARS = [2010, 2011, 2012, 2013, 2014, 2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025];
const VALIDATION_QUERY = '__408os_validate';
const SHA256_PATTERN = /^[a-f0-9]{64}$/i;

export const LOCAL_CONTENT_UNAVAILABLE_MESSAGE = '本地 2009 题包不可用，请先运行内容生成命令。';

export class LocalContentUnavailableError extends Error {
  constructor() {
    super(LOCAL_CONTENT_UNAVAILABLE_MESSAGE);
    this.name = 'LocalContentUnavailableError';
  }
}

export function isLocalContentUnavailableError(reason: unknown): reason is LocalContentUnavailableError {
  return reason instanceof LocalContentUnavailableError
    || (reason instanceof Error && reason.name === 'LocalContentUnavailableError');
}

export const storage = createStorage();

interface LocalContentPack {
  manifest?: {
    id?: string;
    sha256?: string;
    year?: number;
    reviewStatus?: 'draft' | 'needs-review' | 'verified';
  };
  assets?: Array<{ path?: unknown; sha256?: unknown }>;
}

interface InstallManifest {
  id: string;
  sha256: string;
  year: number;
  reviewStatus?: 'draft' | 'needs-review' | 'verified';
}

interface InstallRepository {
  listPacks(): Promise<InstallManifest[]>;
  installPack(input: unknown, requireVerified?: boolean): Promise<InstallManifest>;
}

type ContentFetcher = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
type CacheStorageLike = Pick<CacheStorage, 'open'>;
type Scheduler = (callback: () => void, delayMs: number) => unknown;

interface InstallLocalContentOptions {
  repository?: InstallRepository;
  fetcher?: ContentFetcher;
  cacheStorage?: CacheStorageLike;
  schedule?: Scheduler;
}

export interface InstallVerifiedContentPackOptions {
  repository?: InstallRepository;
  fetcher?: ContentFetcher;
  cacheStorage?: CacheStorageLike;
}

interface CacheableAsset {
  path: string;
  sha256: string;
}

const defaultCacheStorage = (): CacheStorageLike | undefined => (
  typeof globalThis.caches === 'undefined' ? undefined : globalThis.caches
);

const defaultFetcher: ContentFetcher = (input, init) => globalThis.fetch(input, init);
const defaultScheduler: Scheduler = (callback, delayMs) => globalThis.setTimeout(callback, delayMs);

function validationRequestPath(path: string, revision: string): string {
  const separator = path.includes('?') ? '&' : '?';
  return `${path}${separator}${VALIDATION_QUERY}=${encodeURIComponent(revision)}`;
}

function cacheableAssets(pack: LocalContentPack): CacheableAsset[] | undefined {
  const packId = pack.manifest?.id;
  if (!packId || !Array.isArray(pack.assets)) return [];
  const prefix = `/content/${packId}/`;
  const assets = new Map<string, string>();

  for (const asset of pack.assets) {
    if (typeof asset.path !== 'string' || !asset.path.startsWith(prefix)) continue;
    if (typeof asset.sha256 !== 'string' || !SHA256_PATTERN.test(asset.sha256)) return undefined;
    const previous = assets.get(asset.path);
    if (previous && previous !== asset.sha256.toLowerCase()) return undefined;
    assets.set(asset.path, asset.sha256.toLowerCase());
  }

  return [...assets].map(([path, sha256]) => ({ path, sha256 }));
}

async function responseMatchesSha256(response: Response, expected: string): Promise<boolean> {
  const subtle = globalThis.crypto?.subtle;
  if (!subtle) return false;
  try {
    const digest = await subtle.digest('SHA-256', await response.clone().arrayBuffer());
    const actual = [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
    return actual === expected.toLowerCase();
  } catch {
    return false;
  }
}

export function listPackAssetPaths(pack: LocalContentPack): string[] {
  const packId = pack.manifest?.id;
  if (!packId || !Array.isArray(pack.assets)) return [];
  const prefix = `/content/${packId}/`;
  return [...new Set(pack.assets.flatMap((asset) => (
    typeof asset.path === 'string' && asset.path.startsWith(prefix) ? [asset.path] : []
  )))];
}

export async function cacheInstalledPackAssets(
  pack: LocalContentPack,
  refresh = false,
  cacheStorage: CacheStorageLike | undefined = defaultCacheStorage(),
  fetcher: ContentFetcher = defaultFetcher,
): Promise<boolean> {
  if (!cacheStorage) return false;
  const paths = listPackAssetPaths(pack);
  const assets = cacheableAssets(pack);
  if (!assets || assets.length !== paths.length) return false;
  if (!assets.length) return true;

  try {
    const cache = await cacheStorage.open(CONTENT_ASSET_CACHE_NAME);
    const replacements: Array<{ asset: CacheableAsset; response: Response }> = [];

    for (const asset of assets) {
      const cached = await cache.match(asset.path);
      if (cached && (!refresh || await responseMatchesSha256(cached, asset.sha256))) continue;

      const response = await fetcher(validationRequestPath(asset.path, asset.sha256), { cache: 'no-store' });
      if (!response.ok || !await responseMatchesSha256(response, asset.sha256)) return false;
      replacements.push({ asset, response });
    }

    for (const { asset, response } of replacements) await cache.put(asset.path, response);
    return true;
  } catch {
    return false;
  }
}

export async function cacheInstalledPackDocument(
  path: string,
  response: Response,
  cacheStorage: CacheStorageLike | undefined = defaultCacheStorage(),
): Promise<boolean> {
  if (!cacheStorage) return false;
  try {
    const cache = await cacheStorage.open(CONTENT_PACK_CACHE_NAME);
    await cache.put(path, response);
    return true;
  } catch {
    return false;
  }
}

export function scheduleInstalledPackAssetCaching(
  pack: LocalContentPack,
  refresh: boolean,
  schedule: Scheduler = defaultScheduler,
  cacheStorage: CacheStorageLike | undefined = defaultCacheStorage(),
  fetcher: ContentFetcher = defaultFetcher,
): void {
  schedule(() => {
    void cacheInstalledPackAssets(pack, refresh, cacheStorage, fetcher);
  }, CONTENT_ASSET_WARM_DELAY_MS);
}

async function cachedPackResponse(
  path: string,
  cacheStorage: CacheStorageLike | undefined,
): Promise<Response | undefined> {
  if (!cacheStorage) return undefined;
  try {
    return await (await cacheStorage.open(CONTENT_PACK_CACHE_NAME)).match(path);
  } catch {
    return undefined;
  }
}

async function installResponse(
  response: Response,
  repository: InstallRepository,
  installed: readonly InstallManifest[] = [],
): Promise<
  | { status: 'installed'; manifest: InstallManifest; pack: LocalContentPack }
  | { status: 'kept-verified' }
> {
  if (!response.ok) throw new LocalContentUnavailableError();
  const pack = (await response.json()) as LocalContentPack;
  if (pack.manifest?.year !== LOCAL_PACK_YEAR) throw new Error('本地题包年份不是 2009，拒绝安装。');
  const protectedManifest = installed.find((entry) => (
    entry.reviewStatus === 'verified'
    && (entry.year === pack.manifest?.year || entry.id === pack.manifest?.id)
  ));
  if (protectedManifest) {
    const incomingVerified = validateContentPack(pack, {
      requireVerified: true,
      enforceExamShape: true,
    }).success;
    if (!incomingVerified) return { status: 'kept-verified' };
  }
  const manifest = await repository.installPack(pack, false);
  if (manifest.year !== LOCAL_PACK_YEAR) throw new Error('题包安装结果年份不是 2009。');
  return { status: 'installed', manifest, pack };
}

function verifiedPackValidationError(issues: Array<{ path: string; message: string }>): Error {
  const details = issues.map((issue) => `${issue.path || 'root'}: ${issue.message}`).join('\n');
  return new Error(`Verified content pack validation failed:\n${details}`);
}

interface StagedAsset {
  path: string;
  response: Response;
}

async function stageVerifiedPackAssets(
  pack: LocalContentPack,
  fetcher: ContentFetcher,
): Promise<StagedAsset[] | undefined> {
  const staged = new Map<string, Response>();
  const stagingCache = {
    match: async () => undefined,
    put: async (path: string, response: Response) => {
      staged.set(path, response.clone());
    },
  } as unknown as Cache;
  const stagingStorage: CacheStorageLike = { open: async () => stagingCache };
  const valid = await cacheInstalledPackAssets(pack, true, stagingStorage, fetcher);
  if (!valid) return undefined;
  return [...staged].map(([path, response]) => ({ path, response }));
}

async function commitStagedAssets(
  assets: readonly StagedAsset[],
  cacheStorage: CacheStorageLike | undefined,
): Promise<void> {
  if (!cacheStorage || assets.length === 0) return;
  try {
    const cache = await cacheStorage.open(CONTENT_ASSET_CACHE_NAME);
    for (const asset of assets) await cache.put(asset.path, asset.response);
  } catch {
    // The verified pack remains usable online; a later warm pass can restore offline assets.
  }
}

export async function installVerifiedContentPack(
  json: string,
  options: InstallVerifiedContentPackOptions = {},
): Promise<InstallManifest> {
  let input: unknown;
  try {
    input = JSON.parse(json);
  } catch {
    throw new Error('Verified content pack is not valid JSON.');
  }

  const validation = validateContentPack(input, {
    requireVerified: true,
    enforceExamShape: true,
  });
  if (!validation.success) throw verifiedPackValidationError(validation.issues);

  const pack = parseContentPack(input);
  const stagedAssets = await stageVerifiedPackAssets(pack, options.fetcher ?? defaultFetcher);
  if (!stagedAssets) {
    throw new Error('Verified content pack asset validation failed; existing content was not replaced.');
  }

  const manifest = await (options.repository ?? storage.contentRepository).installPack(pack, true);
  await commitStagedAssets(stagedAssets, options.cacheStorage ?? defaultCacheStorage());
  return manifest;
}

export async function installLocalContent(options: InstallLocalContentOptions = {}): Promise<void> {
  const repository = options.repository ?? storage.contentRepository;
  const fetcher = options.fetcher ?? defaultFetcher;
  const cacheStorage = options.cacheStorage ?? defaultCacheStorage();
  const schedule = options.schedule ?? defaultScheduler;
  const installed = await repository.listPacks();
  const installed2009 = installed.find((entry) => entry.year === LOCAL_PACK_YEAR);
  let networkFailure: unknown;

  try {
    const response = await fetcher(
      validationRequestPath(LOCAL_PACK_PATH, String(Date.now())),
      { cache: 'no-store' },
    );
    const cacheResponse = response.clone();
    const result = await installResponse(response, repository, installed);
    if (result.status === 'kept-verified') return;
    const { manifest, pack } = result;
    await cacheInstalledPackDocument(LOCAL_PACK_PATH, cacheResponse, cacheStorage);
    scheduleInstalledPackAssetCaching(
      pack,
      installed.find((entry) => entry.id === manifest.id)?.sha256 !== manifest.sha256,
      schedule,
      cacheStorage,
      fetcher,
    );
    return;
  } catch (reason) {
    networkFailure = reason;
    if (installed2009) return;
  }

  const cached = await cachedPackResponse(LOCAL_PACK_PATH, cacheStorage);
  if (cached) {
    try {
      const result = await installResponse(cached, repository, installed);
      if (result.status === 'kept-verified') return;
      const { pack } = result;
      scheduleInstalledPackAssetCaching(pack, false, schedule, cacheStorage, fetcher);
      return;
    } catch {
      // The validated-cache namespace should contain only installable packs.
    }
  }

  if (networkFailure instanceof Error) throw networkFailure;
  throw new LocalContentUnavailableError();
}

export interface InstallExtraContentOptions {
  repository?: InstallRepository;
  fetcher?: ContentFetcher;
  cacheStorage?: CacheStorageLike;
  schedule?: Scheduler;
}

export async function installExtraContent(options: InstallExtraContentOptions = {}): Promise<string[]> {
  const repository = options.repository ?? storage.contentRepository;
  const fetcher = options.fetcher ?? defaultFetcher;
  const cacheStorage = options.cacheStorage ?? defaultCacheStorage();
  const schedule = options.schedule ?? defaultScheduler;
  const issues: string[] = [];
  for (const year of EXTRA_PACK_YEARS) {
    const packPath = `/content/${year}.json`;
    let response: Response;
    try {
      response = await fetcher(validationRequestPath(packPath, String(Date.now())), { cache: 'no-store' });
    } catch (reason) {
      issues.push(`${year}: ${reason instanceof Error ? reason.message : '网络错误'}`);
      continue;
    }
    if (!response.ok) continue;
    try {
      const pack = (await response.json()) as LocalContentPack;
      if (pack.manifest?.year !== year) throw new Error(`题包年份不是 ${year}，拒绝安装。`);
      const manifest = await repository.installPack(pack, false);
      if (manifest.year !== year) throw new Error(`题包安装结果年份不是 ${year}。`);
      await cacheInstalledPackDocument(packPath, response.clone(), cacheStorage);
      scheduleInstalledPackAssetCaching(pack, true, schedule, cacheStorage, fetcher);
    } catch (reason) {
      issues.push(`${year}: ${reason instanceof Error ? reason.message : '安装失败'}`);
    }
  }
  return issues;
}
