import { describe, expect, it } from 'vitest';
import {
  CACHE_Q14_PRESET,
  mapCacheAddress,
  simulateCacheTrace,
  validateCacheConfig,
  type CacheCoreResult,
} from './cache';

function unwrap<T>(result: CacheCoreResult<T>): T {
  expect(result.ok).toBe(true);
  if (!result.ok) throw new Error(result.error.message);
  return result.value;
}

function errorCode<T>(result: CacheCoreResult<T>): string {
  expect(result.ok).toBe(false);
  if (result.ok) throw new Error('Expected an error result.');
  return result.error.code;
}

describe('cache configuration and address mapping', () => {
  it('reproduces the 2009 Q14 two-way set mapping', () => {
    const config = unwrap(validateCacheConfig(CACHE_Q14_PRESET.config));
    expect(config).toMatchObject({
      addressBits: 16,
      lineSizeBytes: 32,
      setCount: 8,
      associativity: 2,
      totalLineCount: 16,
      offsetBits: 5,
      setBits: 3,
      tagBits: 8,
    });

    expect(unwrap(mapCacheAddress(config, CACHE_Q14_PRESET.address))).toEqual({
      address: 129,
      blockNumber: 4,
      tag: 0,
      setIndex: 4,
      blockOffset: 1,
    });
  });

  it.each([
    [{ addressBits: 0, lineSizeBytes: 4, setCount: 2, associativity: 1 }, 'invalid-address-bits'],
    [{ addressBits: 8, lineSizeBytes: 3, setCount: 2, associativity: 1 }, 'invalid-line-size'],
    [{ addressBits: 8, lineSizeBytes: 4, setCount: 3, associativity: 1 }, 'invalid-set-count'],
    [{ addressBits: 8, lineSizeBytes: 4, setCount: 2, associativity: 0 }, 'invalid-associativity'],
    [{ addressBits: 4, lineSizeBytes: 8, setCount: 4, associativity: 1 }, 'address-layout-overflow'],
  ])('rejects an invalid configuration %#', (config, code) => {
    expect(errorCode(validateCacheConfig(config))).toBe(code);
  });

  it('rejects non-integer and out-of-range addresses', () => {
    const config = unwrap(validateCacheConfig({
      addressBits: 8,
      lineSizeBytes: 4,
      setCount: 2,
      associativity: 1,
    }));
    expect(errorCode(mapCacheAddress(config, Number.NaN))).toBe('invalid-address');
    expect(errorCode(mapCacheAddress(config, 256))).toBe('address-out-of-range');
  });

  it('rejects configurations that would allocate an unsafe visualization state', () => {
    expect(errorCode(validateCacheConfig({
      addressBits: 16,
      lineSizeBytes: 1,
      setCount: 1024,
      associativity: 1,
    }))).toBe('cache-too-large');
  });
});

describe('write-back, write-allocate LRU trace', () => {
  const config = {
    addressBits: 8,
    lineSizeBytes: 4,
    setCount: 2,
    associativity: 2,
  } as const;

  it('uses invalid ways first, updates LRU on hits, and writes dirty victims back', () => {
    const trace = unwrap(simulateCacheTrace(config, [
      { operation: 'read', address: 0 },
      { operation: 'read', address: 8 },
      { operation: 'read', address: 0 },
      { operation: 'write', address: 16 },
      { operation: 'read', address: 8 },
      { operation: 'read', address: 0 },
    ]));

    expect(trace.events.map((event) => event.outcome)).toEqual([
      'compulsory-miss',
      'compulsory-miss',
      'hit',
      'replacement-miss',
      'replacement-miss',
      'replacement-miss',
    ]);
    expect(trace.events[2]).toMatchObject({ hit: true, wayIndex: 0, memoryRead: false, memoryWrite: false });
    expect(trace.events[3]).toMatchObject({
      hit: false,
      wayIndex: 1,
      evicted: { blockNumber: 2, dirty: false },
      memoryRead: true,
      memoryWrite: false,
    });
    expect(trace.events[5]).toMatchObject({
      hit: false,
      wayIndex: 1,
      evicted: { blockNumber: 4, dirty: true },
      memoryRead: true,
      memoryWrite: true,
    });
    expect(trace.summary).toEqual({ accesses: 6, hits: 1, misses: 5, hitRate: 1 / 6, memoryReads: 5, memoryWrites: 1 });
  });

  it('keeps earlier snapshots immutable when later accesses replace a line', () => {
    const trace = unwrap(simulateCacheTrace(config, [
      { operation: 'write', address: 0 },
      { operation: 'read', address: 8 },
      { operation: 'read', address: 16 },
    ]));
    const firstAfter = trace.events[0]!.after.find((line) => line.setIndex === 0 && line.wayIndex === 0);
    const lastAfter = trace.events[2]!.after.find((line) => line.setIndex === 0 && line.wayIndex === 0);
    expect(firstAfter).toMatchObject({ blockNumber: 0, dirty: true });
    expect(lastAfter).toMatchObject({ blockNumber: 4, dirty: false });
  });

  it('returns a deterministic configuration fingerprint and phase trace', () => {
    const left = unwrap(simulateCacheTrace(config, [{ operation: 'read', address: 12 }]));
    const right = unwrap(simulateCacheTrace(config, [{ operation: 'read', address: 12 }]));
    expect(left.config.fingerprint).toBe('8:4:2:2:write-back:write-allocate:lru');
    expect(left).toEqual(right);
    expect(left.events[0]!.phases.map((phase) => phase.id)).toEqual(['decode', 'lookup', 'fill']);
  });

  it('rejects traces that would retain too many full-cache snapshots', () => {
    const accesses = Array.from({ length: 257 }, (_, address) => ({
      operation: 'read' as const,
      address: address % 256,
    }));
    expect(errorCode(simulateCacheTrace(config, accesses))).toBe('trace-too-large');
  });
});
