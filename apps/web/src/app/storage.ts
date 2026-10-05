import { parseContentPack, validateContentPack } from '@408os/content-schema';
import { ContentPackDowngradeError, createStorage } from '@408os/storage';

export const CONTENT_ASSET_CACHE_NAME = '408os-content-assets-v2';
export const CONTENT_PACK_CACHE_NAME = '408os-content-packs-v2';
export const CONTENT_ASSET_WARM_DELAY_MS = 5_000;

const LOCAL_PACK_PATH = '/content/2009.json';
const LOCAL_PACK_YEAR = 2009;
// 旗舰年份（2009）走 installLocalContent 的空内容模式合同；
// 扩展年份按“可选内容”安装：显式 404 = 未安装（正常），解析/校验失败记录为问题但不阻塞其他年份。
export const EXTRA_PACK_YEARS = [2010, 2011, 2012, 2013, 2014, 2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025];
// Keep background downloads below the browser's per-origin connection limit so
// route chunks and a second tab's foreground requests can start immediately.
const EXTRA_PACK_DOWNLOAD_CONCURRENCY = 2;
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

// 全局串行预热队列：17 套题包各自并行预热会以 17 路 fetch + SHA-256 + Cache put 冲击
// 共享渲染进程主线程与网络，阻塞同页面/同进程其他页面的交互。
let assetWarmChain: Promise<void> = Promise.resolve();

export function scheduleInstalledPackAssetCaching(
  pack: LocalContentPack,
  refresh: boolean,
  schedule: Scheduler = defaultScheduler,
  cacheStorage: CacheStorageLike | undefined = defaultCacheStorage(),
  fetcher: ContentFetcher = defaultFetcher,
): void {
  schedule(() => {
    assetWarmChain = assetWarmChain
      .then(async () => { await cacheInstalledPackAssets(pack, refresh, cacheStorage, fetcher); })
      .catch(() => undefined);
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

// 已安装 verified 题包不接受低审核状态覆盖：与 2009 installResponse 共用的防降级合同。
// 返回 true 表示本次安装应被跳过（keep-verified），不得写入仓库或缓存。
function verifiedDowngradeBlocked(installed: readonly InstallManifest[], pack: LocalContentPack): boolean {
  const protectedManifest = installed.find((entry) => (
    entry.reviewStatus === 'verified'
    && (entry.year === pack.manifest?.year || entry.id === pack.manifest?.id)
  ));
  if (!protectedManifest) return false;
  return !validateContentPack(pack, {
    requireVerified: true,
    enforceExamShape: true,
  }).success;
}

async function installResponse(
  response: Response,
  repository: InstallRepository,
): Promise<
  | { status: 'installed'; manifest: InstallManifest; pack: LocalContentPack }
  | { status: 'kept-verified' }
> {
  // 仅 404 是合同内的“显式缺失”（进入 code-only 模式）；503 等服务故障必须 fail closed，
  // 不得伪装成“没有题包”。解析/校验失败由后续 json/校验路径抛出。
  if (response.status === 404) throw new LocalContentUnavailableError();
  if (!response.ok) throw new Error(`本地题包请求失败（HTTP ${response.status}），已阻止安装。`);
  const pack = (await response.json()) as LocalContentPack;
  if (pack.manifest?.year !== LOCAL_PACK_YEAR) throw new Error('本地题包年份不是 2009，拒绝安装。');
  const installed = await repository.listPacks();
  const installedManifest = installed.find((entry) => entry.year === pack.manifest?.year);
  const unchanged = installedManifest != null
    && installedManifest.id === pack.manifest?.id
    && installedManifest.sha256 === pack.manifest?.sha256;
  if (unchanged && installedManifest) {
    // 字节一致（sha256 相同）且首次安装已通过校验：跳过重复重写，避免每次启动都全量重装 2009。
    return { status: 'installed', manifest: installedManifest, pack };
  }
  if (verifiedDowngradeBlocked(installed, pack)) return { status: 'kept-verified' };
  let manifest: InstallManifest;
  try {
    manifest = await repository.installPack(pack, false);
  } catch (reason) {
    if (reason instanceof ContentPackDowngradeError) return { status: 'kept-verified' };
    throw reason;
  }
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
    const result = await installResponse(response, repository);
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
      const result = await installResponse(cached, repository);
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

export interface ExtraContentInstallResult {
  issues: string[];
  installedYears: number[];
}

interface FetchedExtraPack {
  year: number;
  response?: Response;
  body?: string;
  fetchError?: unknown;
}

export async function installExtraContent(
  options: InstallExtraContentOptions = {},
): Promise<ExtraContentInstallResult> {
  const repository = options.repository ?? storage.contentRepository;
  const fetcher = options.fetcher ?? defaultFetcher;
  const cacheStorage = options.cacheStorage ?? defaultCacheStorage();
  const schedule = options.schedule ?? defaultScheduler;
  // Drain each body while fetching: waiting for all response headers before
  // reading bodies can exhaust the origin's connections and stall route chunks.
  // Parsing, validation and writes still run serially with an event-loop yield.
  const download = async (year: number): Promise<FetchedExtraPack> => {
    try {
      const response = await fetcher(validationRequestPath(`/content/${year}.json`, String(Date.now())), { cache: 'no-store' });
      if (!response.ok) {
        await response.body?.cancel().catch(() => undefined);
        return { year, response };
      }
      const cacheResponse = response.clone();
      return {
        year,
        response: cacheResponse,
        body: await response.text(),
      };
    } catch (reason) {
      return { year, fetchError: reason };
    }
  };
  const fetched: FetchedExtraPack[] = new Array(EXTRA_PACK_YEARS.length);
  let nextDownload = 0;
  await Promise.all(Array.from({ length: EXTRA_PACK_DOWNLOAD_CONCURRENCY }, async () => {
    while (nextDownload < EXTRA_PACK_YEARS.length) {
      const index = nextDownload++;
      fetched[index] = await download(EXTRA_PACK_YEARS[index]!);
    }
  }));
  const issues: string[] = [];
  const installedYears: number[] = [];
  for (const entry of fetched) {
    const packPath = `/content/${entry.year}.json`;
    if (entry.response === undefined) {
      const reason = entry.fetchError;
      issues.push(`${entry.year}: ${reason instanceof Error ? reason.message : '网络错误'}`);
      continue;
    }
    try {
      // 404 = 合同内的“未安装”（正常，静默跳过）；其他非 2xx 是服务故障，
      // 必须留下诊断信息而不是伪装成缺失（fail closed，已有数据不受影响）。
      if (entry.response.status === 404) continue;
      if (!entry.response.ok) {
        issues.push(`${entry.year}: HTTP ${entry.response.status}`);
        continue;
      }
      const cacheResponse = entry.response;
      const pack = JSON.parse(entry.body ?? '') as LocalContentPack;
      if (pack.manifest?.year !== entry.year) throw new Error(`题包年份不是 ${entry.year}，拒绝安装。`);
      // This fresh read only optimizes unchanged packs; installPack performs the
      // authoritative verified guard in its transaction, across connections.
      const installed = await repository.listPacks();
      const installedManifest = installed.find((manifest) => manifest.year === entry.year);
      const unchanged = installedManifest != null
        && installedManifest.id === pack.manifest?.id
        && installedManifest.sha256 === pack.manifest?.sha256;
      if (!unchanged) {
        // sha256 相同即字节相同（reviewStatus 是 manifest 的一部分），降级只可能发生在内容变化路径。
        if (verifiedDowngradeBlocked(installed, pack)) continue;
        const manifest = await repository.installPack(pack, false);
        if (manifest.year !== entry.year) throw new Error(`题包安装结果年份不是 ${entry.year}。`);
        installedYears.push(entry.year);
      }
      await cacheInstalledPackDocument(packPath, cacheResponse, cacheStorage);
      // 未变化的题包不重复预热资产：refresh 会重新下载并校验全部来源页图（17 套约 78MB）。
      if (!unchanged) scheduleInstalledPackAssetCaching(pack, true, schedule, cacheStorage, fetcher);
    } catch (reason) {
      if (reason instanceof ContentPackDowngradeError) continue;
      issues.push(`${entry.year}: ${reason instanceof Error ? reason.message : '安装失败'}`);
    }
    await new Promise<void>((resolve) => { defaultScheduler(resolve, 0); });
  }
  return { issues, installedYears };
}
