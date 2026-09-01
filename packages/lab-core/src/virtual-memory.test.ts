import { describe, expect, it } from 'vitest';

import {
  Q46_LOCAL_PRACTICE_PRESET,
  createVirtualMemoryState,
  simulateVirtualMemory,
  stepVirtualMemory,
  type VirtualMemoryConfig,
} from './virtual-memory';

function baseConfig(overrides: Partial<VirtualMemoryConfig> = {}): VirtualMemoryConfig {
  return {
    pageSizeBytes: 0x1000,
    virtualPageCount: 4,
    residentSetLimit: 2,
    tlbCapacity: 4,
    tlbLookupTimeNs: 10,
    memoryAccessTimeNs: 100,
    pageFaultServiceTimeNs: 100_000_000,
    initialResidentPages: [
      { pageNumber: 0, frameNumber: 0x101 },
      { pageNumber: 2, frameNumber: 0x254 },
    ],
    initialTlbEntries: [],
    freeFrameNumbers: [],
    ...overrides,
  };
}

describe('Q46 local practice preset', () => {
  it('reproduces the needs-review pack values as a deterministic golden trace', () => {
    expect(Q46_LOCAL_PRACTICE_PRESET.reviewStatus).toBe('needs-review');

    const trace = simulateVirtualMemory(
      Q46_LOCAL_PRACTICE_PRESET.config,
      Q46_LOCAL_PRACTICE_PRESET.virtualAddresses,
    );

    expect(trace.events.map((event) => event.totalTimeNs)).toEqual([
      210,
      100_000_220,
      110,
    ]);
    expect(trace.events.map((event) => ({
      page: event.pageNumber,
      offset: event.offset,
      tlbHit: event.tlbHit,
      fault: event.pageFault,
    }))).toEqual([
      { page: 2, offset: 0x362, tlbHit: false, fault: false },
      { page: 1, offset: 0x565, tlbHit: false, fault: true },
      { page: 2, offset: 0x5a5, tlbHit: true, fault: false },
    ]);

    const fault = trace.events[1];
    expect(fault?.evictedPageNumber).toBe(0);
    expect(fault?.loadedFrameNumber).toBe(0x101);
    expect(fault?.retryPerformed).toBe(true);
    expect(fault?.physicalAddress).toBe(0x101565);

    expect(trace.finalState.pages).toContainEqual({
      pageNumber: 1,
      frameNumber: 0x101,
      present: true,
      lastAccessTick: 4,
    });
  });
});

describe('virtual-memory stepping', () => {
  it('invalidates a victim page TLB entry during local LRU replacement', () => {
    const config = baseConfig({
      initialTlbEntries: [{ pageNumber: 0, frameNumber: 0x101 }],
    });
    const initial = createVirtualMemoryState(config);
    const result = stepVirtualMemory(config, initial, 0x1565);

    expect(result.event.pageFault).toBe(true);
    expect(result.event.evictedPageNumber).toBe(0);
    expect(result.event.invalidatedTlbPageNumber).toBe(0);
    expect(result.state.tlbEntries.some((entry) => entry.pageNumber === 0)).toBe(false);
    expect(result.state.tlbEntries).toContainEqual({
      pageNumber: 1,
      frameNumber: 0x101,
      lastAccessTick: 3,
    });
  });

  it('turns a repeated access into a TLB hit without another fault', () => {
    const config = baseConfig();
    const first = stepVirtualMemory(config, createVirtualMemoryState(config), 0x1565);
    const second = stepVirtualMemory(config, first.state, 0x1565);

    expect(first.event.pageFault).toBe(true);
    expect(second.event).toMatchObject({
      tlbHit: true,
      pageTableAccessed: false,
      pageFault: false,
      retryPerformed: false,
      totalTimeNs: 110,
      physicalAddress: 0x101565,
    });
  });

  it('uses the lowest free frame before any local replacement is needed', () => {
    const config = baseConfig({
      residentSetLimit: 3,
      freeFrameNumbers: [0x400],
    });
    const result = stepVirtualMemory(config, createVirtualMemoryState(config), 0x1565);

    expect(result.event.evictedPageNumber).toBeNull();
    expect(result.event.loadedFrameNumber).toBe(0x400);
    expect(result.event.physicalAddress).toBe(0x400565);
  });

  it('replaces the least recently used TLB entry deterministically', () => {
    const config = baseConfig({ tlbCapacity: 1 });
    const trace = simulateVirtualMemory(config, [0x2362, 0x0100]);

    expect(trace.events[1]?.tlbReplacementPageNumber).toBe(2);
    expect(trace.finalState.tlbEntries.map((entry) => entry.pageNumber)).toEqual([0]);
  });

  it('returns identical traces for identical input without mutating caller data', () => {
    const config = baseConfig();
    const addresses = [0x2362, 0x1565, 0x25a5];
    const configSnapshot = structuredClone(config);
    const first = simulateVirtualMemory(config, addresses);
    const second = simulateVirtualMemory(config, addresses);

    expect(second).toEqual(first);
    expect(config).toEqual(configSnapshot);
    expect(addresses).toEqual([0x2362, 0x1565, 0x25a5]);
  });
});

describe('virtual-memory validation', () => {
  it.each([
    ['non-power-of-two page size', { pageSizeBytes: 3000 }],
    ['empty virtual address space', { virtualPageCount: 0 }],
    ['resident set overflow', { residentSetLimit: 1 }],
    ['zero-capacity TLB', { tlbCapacity: 0 }],
    ['duplicate virtual page', {
      initialResidentPages: [
        { pageNumber: 0, frameNumber: 0x101 },
        { pageNumber: 0, frameNumber: 0x102 },
      ],
    }],
    ['duplicate resident frame', {
      initialResidentPages: [
        { pageNumber: 0, frameNumber: 0x101 },
        { pageNumber: 2, frameNumber: 0x101 },
      ],
    }],
    ['stale initial TLB entry', {
      initialTlbEntries: [{ pageNumber: 1, frameNumber: 0x101 }],
    }],
    ['resident frame reused as free', { freeFrameNumbers: [0x101] }],
  ] satisfies ReadonlyArray<readonly [string, Partial<VirtualMemoryConfig>]>) (
    'rejects %s',
    (_label, overrides) => {
      expect(() => createVirtualMemoryState(baseConfig(overrides))).toThrow();
    },
  );

  it('rejects an invalid or out-of-range address and leaves state untouched', () => {
    const config = baseConfig();
    const state = createVirtualMemoryState(config);
    const snapshot = structuredClone(state);

    expect(() => stepVirtualMemory(config, state, -1)).toThrow(/virtual address/i);
    expect(() => stepVirtualMemory(config, state, 0x4000)).toThrow(/virtual address/i);
    expect(state).toEqual(snapshot);
  });
});
