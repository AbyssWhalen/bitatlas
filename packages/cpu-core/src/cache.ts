export type CacheOperation = 'read' | 'write';
export type CacheOutcome = 'hit' | 'compulsory-miss' | 'replacement-miss';

export type CacheErrorCode =
  | 'invalid-input'
  | 'invalid-address-bits'
  | 'invalid-line-size'
  | 'invalid-set-count'
  | 'invalid-associativity'
  | 'address-layout-overflow'
  | 'cache-too-large'
  | 'invalid-address'
  | 'address-out-of-range'
  | 'empty-trace'
  | 'trace-too-large'
  | 'invalid-operation';

export interface CacheCoreError {
  code: CacheErrorCode;
  message: string;
  details?: Readonly<Record<string, string | number>>;
}

export type CacheCoreResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: CacheCoreError };

export interface CacheConfigInput {
  addressBits: number;
  lineSizeBytes: number;
  setCount: number;
  associativity: number;
}

export interface CacheConfig extends CacheConfigInput {
  totalLineCount: number;
  offsetBits: number;
  setBits: number;
  tagBits: number;
  addressSpaceBytes: number;
  writePolicy: 'write-back';
  allocationPolicy: 'write-allocate';
  replacementPolicy: 'lru';
  fingerprint: string;
}

export interface CacheAccess {
  operation: CacheOperation;
  address: number;
}

export interface CacheAddressMapping {
  address: number;
  blockNumber: number;
  tag: number;
  setIndex: number;
  blockOffset: number;
}

export interface CacheLineSnapshot {
  setIndex: number;
  wayIndex: number;
  valid: boolean;
  tag: number | null;
  blockNumber: number | null;
  dirty: boolean;
  lastUsed: number;
}

export interface CachePhase {
  id: 'decode' | 'lookup' | 'hit' | 'fill' | 'replace';
  label: string;
  detail: string;
}

export interface CacheTraceEvent extends CacheAddressMapping {
  index: number;
  operation: CacheOperation;
  outcome: CacheOutcome;
  hit: boolean;
  wayIndex: number;
  evicted: CacheLineSnapshot | null;
  memoryRead: boolean;
  memoryWrite: boolean;
  before: readonly CacheLineSnapshot[];
  after: readonly CacheLineSnapshot[];
  phases: readonly CachePhase[];
}

export interface CacheTraceSummary {
  accesses: number;
  hits: number;
  misses: number;
  hitRate: number;
  memoryReads: number;
  memoryWrites: number;
}

export interface CacheTrace {
  config: CacheConfig;
  events: readonly CacheTraceEvent[];
  finalLines: readonly CacheLineSnapshot[];
  summary: CacheTraceSummary;
}

export const CACHE_Q14_PRESET = {
  id: 'cn408-2009-q14',
  config: {
    addressBits: 16,
    lineSizeBytes: 32,
    setCount: 8,
    associativity: 2,
  },
  address: 129,
} as const;

const MAX_CACHE_LINES = 512;
const MAX_TRACE_ACCESSES = 256;

function success<T>(value: T): CacheCoreResult<T> {
  return { ok: true, value };
}

function failure(
  code: CacheErrorCode,
  message: string,
  details?: Readonly<Record<string, string | number>>,
): CacheCoreResult<never> {
  return details ? { ok: false, error: { code, message, details } } : { ok: false, error: { code, message } };
}

function isPowerOfTwo(value: number): boolean {
  return Number.isSafeInteger(value) && value > 0 && Math.log2(value) % 1 === 0;
}

export function validateCacheConfig(input: CacheConfigInput): CacheCoreResult<CacheConfig> {
  if (typeof input !== 'object' || input === null) {
    return failure('invalid-input', 'Cache configuration must be an object.');
  }
  if (!Number.isInteger(input.addressBits) || input.addressBits < 1 || input.addressBits > 32) {
    return failure('invalid-address-bits', 'Address width must be an integer from 1 to 32 bits.', {
      addressBits: input.addressBits,
    });
  }
  if (!isPowerOfTwo(input.lineSizeBytes)) {
    return failure('invalid-line-size', 'Cache line size must be a positive power of two.', {
      lineSizeBytes: input.lineSizeBytes,
    });
  }
  if (!isPowerOfTwo(input.setCount)) {
    return failure('invalid-set-count', 'Cache set count must be a positive power of two.', {
      setCount: input.setCount,
    });
  }
  if (!Number.isSafeInteger(input.associativity) || input.associativity < 1 || input.associativity > 64) {
    return failure('invalid-associativity', 'Associativity must be an integer from 1 to 64.', {
      associativity: input.associativity,
    });
  }

  const offsetBits = Math.log2(input.lineSizeBytes);
  const setBits = Math.log2(input.setCount);
  if (offsetBits + setBits > input.addressBits) {
    return failure('address-layout-overflow', 'Offset and set fields exceed the address width.', {
      addressBits: input.addressBits,
      offsetBits,
      setBits,
    });
  }
  if (input.setCount * input.associativity > MAX_CACHE_LINES) {
    return failure('cache-too-large', `Visualization is limited to ${MAX_CACHE_LINES} cache lines.`, {
      totalLineCount: input.setCount * input.associativity,
      maximum: MAX_CACHE_LINES,
    });
  }

  return success({
    ...input,
    totalLineCount: input.setCount * input.associativity,
    offsetBits,
    setBits,
    tagBits: input.addressBits - offsetBits - setBits,
    addressSpaceBytes: 2 ** input.addressBits,
    writePolicy: 'write-back',
    allocationPolicy: 'write-allocate',
    replacementPolicy: 'lru',
    fingerprint: `${input.addressBits}:${input.lineSizeBytes}:${input.setCount}:${input.associativity}:write-back:write-allocate:lru`,
  });
}

export function mapCacheAddress(config: CacheConfig, address: number): CacheCoreResult<CacheAddressMapping> {
  if (!Number.isSafeInteger(address) || address < 0) {
    return failure('invalid-address', 'Cache address must be a non-negative safe integer.', { address });
  }
  if (address >= config.addressSpaceBytes) {
    return failure('address-out-of-range', `Address ${address} does not fit in ${config.addressBits} bits.`, {
      address,
      maximum: config.addressSpaceBytes - 1,
    });
  }
  const blockNumber = Math.floor(address / config.lineSizeBytes);
  const setIndex = blockNumber % config.setCount;
  return success({
    address,
    blockNumber,
    tag: Math.floor(blockNumber / config.setCount),
    setIndex,
    blockOffset: address % config.lineSizeBytes,
  });
}

function initialLines(config: CacheConfig): CacheLineSnapshot[] {
  return Array.from({ length: config.setCount }, (_, setIndex) => (
    Array.from({ length: config.associativity }, (__, wayIndex) => ({
      setIndex,
      wayIndex,
      valid: false,
      tag: null,
      blockNumber: null,
      dirty: false,
      lastUsed: 0,
    }))
  )).flat();
}

function cloneLines(lines: readonly CacheLineSnapshot[]): CacheLineSnapshot[] {
  return lines.map((line) => ({ ...line }));
}

function replacementLine(lines: readonly CacheLineSnapshot[]): CacheLineSnapshot {
  return lines.find((line) => !line.valid)
    ?? [...lines].sort((left, right) => left.lastUsed - right.lastUsed || left.wayIndex - right.wayIndex)[0]!;
}

function phase(
  id: CachePhase['id'],
  label: string,
  detail: string,
): CachePhase {
  return { id, label, detail };
}

function validateAccess(access: CacheAccess): CacheCoreResult<CacheAccess> {
  if (typeof access !== 'object' || access === null) {
    return failure('invalid-input', 'Every cache access must be an object.');
  }
  if (access.operation !== 'read' && access.operation !== 'write') {
    return failure('invalid-operation', 'Cache operation must be read or write.');
  }
  if (!Number.isSafeInteger(access.address) || access.address < 0) {
    return failure('invalid-address', 'Cache address must be a non-negative safe integer.', {
      address: access.address,
    });
  }
  return success(access);
}

export function simulateCacheTrace(
  configInput: CacheConfigInput,
  accesses: readonly CacheAccess[],
): CacheCoreResult<CacheTrace> {
  const validatedConfig = validateCacheConfig(configInput);
  if (!validatedConfig.ok) return validatedConfig;
  if (!Array.isArray(accesses) || accesses.length === 0) {
    return failure('empty-trace', 'Cache trace must contain at least one access.');
  }
  if (accesses.length > MAX_TRACE_ACCESSES) {
    return failure('trace-too-large', `Cache trace is limited to ${MAX_TRACE_ACCESSES} accesses.`, {
      accesses: accesses.length,
      maximum: MAX_TRACE_ACCESSES,
    });
  }
  const config = validatedConfig.value;
  let lines = initialLines(config);
  const events: CacheTraceEvent[] = [];
  let hits = 0;
  let memoryReads = 0;
  let memoryWrites = 0;

  for (const [index, rawAccess] of accesses.entries()) {
    const accessResult = validateAccess(rawAccess);
    if (!accessResult.ok) return accessResult;
    const access = accessResult.value;
    const mappingResult = mapCacheAddress(config, access.address);
    if (!mappingResult.ok) return mappingResult;
    const mapping = mappingResult.value;
    const before = cloneLines(lines);
    const setLines = lines.filter((line) => line.setIndex === mapping.setIndex);
    const matched = setLines.find((line) => line.valid && line.tag === mapping.tag);
    const tick = index + 1;
    let selected: CacheLineSnapshot;
    let evicted: CacheLineSnapshot | null = null;
    let outcome: CacheOutcome;
    let memoryRead = false;
    let memoryWrite = false;
    const phases: CachePhase[] = [
      phase('decode', '分解地址字段', `块 ${mapping.blockNumber} · 组 ${mapping.setIndex} · 标记 ${mapping.tag} · 块内偏移 ${mapping.blockOffset}`),
      phase('lookup', `并行比较第 ${mapping.setIndex} 组`, `${config.associativity} 路标记同时参与比较`),
    ];

    if (matched) {
      hits += 1;
      outcome = 'hit';
      selected = matched;
      lines = lines.map((line) => line === matched ? {
        ...line,
        dirty: line.dirty || access.operation === 'write',
        lastUsed: tick,
      } : line);
      phases.push(phase('hit', 'Cache 命中', `更新第 ${matched.wayIndex} 路 LRU${access.operation === 'write' ? '，并置脏位' : ''}`));
    } else {
      memoryRead = true;
      memoryReads += 1;
      selected = replacementLine(setLines);
      if (selected.valid) {
        outcome = 'replacement-miss';
        evicted = { ...selected };
        memoryWrite = selected.dirty;
        if (memoryWrite) memoryWrites += 1;
        phases.push(phase(
          'replace',
          'LRU 替换',
          `淘汰第 ${selected.wayIndex} 路块 ${selected.blockNumber}${selected.dirty ? '，脏块先写回主存' : ''}`,
        ));
      } else {
        outcome = 'compulsory-miss';
        phases.push(phase('fill', '装入空闲路', `从主存读取块 ${mapping.blockNumber} 到第 ${selected.wayIndex} 路`));
      }
      lines = lines.map((line) => line === selected ? {
        setIndex: mapping.setIndex,
        wayIndex: selected.wayIndex,
        valid: true,
        tag: mapping.tag,
        blockNumber: mapping.blockNumber,
        dirty: access.operation === 'write',
        lastUsed: tick,
      } : line);
    }

    events.push({
      ...mapping,
      index,
      operation: access.operation,
      outcome,
      hit: outcome === 'hit',
      wayIndex: selected.wayIndex,
      evicted,
      memoryRead,
      memoryWrite,
      before,
      after: cloneLines(lines),
      phases,
    });
  }

  const misses = accesses.length - hits;
  return success({
    config,
    events,
    finalLines: cloneLines(lines),
    summary: {
      accesses: accesses.length,
      hits,
      misses,
      hitRate: hits / accesses.length,
      memoryReads,
      memoryWrites,
    },
  });
}
