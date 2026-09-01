export interface ResidentPageConfig {
  readonly pageNumber: number;
  readonly frameNumber: number;
}

export interface TlbEntryConfig {
  readonly pageNumber: number;
  readonly frameNumber: number;
}

export interface VirtualMemoryConfig {
  readonly pageSizeBytes: number;
  readonly virtualPageCount: number;
  readonly residentSetLimit: number;
  readonly tlbCapacity: number;
  readonly tlbLookupTimeNs: number;
  readonly memoryAccessTimeNs: number;
  readonly pageFaultServiceTimeNs: number;
  /** Least recently used to most recently used. */
  readonly initialResidentPages: readonly ResidentPageConfig[];
  /** Least recently used to most recently used. */
  readonly initialTlbEntries: readonly TlbEntryConfig[];
  readonly freeFrameNumbers: readonly number[];
}

export interface VirtualMemoryPageState {
  readonly pageNumber: number;
  readonly frameNumber: number | null;
  readonly present: boolean;
  readonly lastAccessTick: number | null;
}

export interface VirtualMemoryTlbEntry {
  readonly pageNumber: number;
  readonly frameNumber: number;
  readonly lastAccessTick: number;
}

export interface VirtualMemoryState {
  readonly configFingerprint: string;
  readonly step: number;
  readonly clock: number;
  readonly pages: readonly VirtualMemoryPageState[];
  readonly tlbEntries: readonly VirtualMemoryTlbEntry[];
  readonly freeFrameNumbers: readonly number[];
}

export type VirtualMemoryPhaseKind =
  | 'tlb-lookup'
  | 'page-table-lookup'
  | 'page-fault-service'
  | 'retry-tlb-lookup'
  | 'memory-access';

export interface VirtualMemoryPhase {
  readonly kind: VirtualMemoryPhaseKind;
  readonly durationNs: number;
  readonly detail: string;
}

export interface VirtualMemoryAccessEvent {
  readonly step: number;
  readonly virtualAddress: number;
  readonly pageNumber: number;
  readonly offset: number;
  readonly tlbHit: boolean;
  readonly pageTableAccessed: boolean;
  readonly pageFault: boolean;
  readonly retryPerformed: boolean;
  readonly evictedPageNumber: number | null;
  readonly loadedFrameNumber: number | null;
  readonly invalidatedTlbPageNumber: number | null;
  readonly tlbReplacementPageNumber: number | null;
  readonly physicalAddress: number;
  readonly tlbLookupTimeNs: number;
  readonly pageTableLookupTimeNs: number;
  readonly pageFaultServiceTimeNs: number;
  readonly memoryAccessTimeNs: number;
  readonly totalTimeNs: number;
  readonly phases: readonly VirtualMemoryPhase[];
}

export interface VirtualMemoryStepResult {
  readonly state: VirtualMemoryState;
  readonly event: VirtualMemoryAccessEvent;
}

export interface VirtualMemoryTrace {
  readonly initialState: VirtualMemoryState;
  readonly steps: readonly VirtualMemoryStepResult[];
  readonly events: readonly VirtualMemoryAccessEvent[];
  readonly finalState: VirtualMemoryState;
  readonly totalTimeNs: number;
}

function assertSafeInteger(value: number, label: string, minimum = 0): void {
  if (!Number.isSafeInteger(value) || value < minimum) {
    throw new RangeError(`${label} must be a safe integer greater than or equal to ${minimum}`);
  }
}

function hasDuplicates(values: readonly number[]): boolean {
  return new Set(values).size !== values.length;
}

function assertAddressableFrame(frameNumber: number, pageSizeBytes: number, label: string): void {
  assertSafeInteger(frameNumber, label);
  const finalByte = (frameNumber + 1) * pageSizeBytes - 1;
  if (!Number.isSafeInteger(finalByte)) {
    throw new RangeError(`${label} cannot be represented as a safe physical address`);
  }
}

function configFingerprint(config: VirtualMemoryConfig): string {
  return JSON.stringify({
    pageSizeBytes: config.pageSizeBytes,
    virtualPageCount: config.virtualPageCount,
    residentSetLimit: config.residentSetLimit,
    tlbCapacity: config.tlbCapacity,
    tlbLookupTimeNs: config.tlbLookupTimeNs,
    memoryAccessTimeNs: config.memoryAccessTimeNs,
    pageFaultServiceTimeNs: config.pageFaultServiceTimeNs,
    initialResidentPages: config.initialResidentPages.map((entry) => [entry.pageNumber, entry.frameNumber]),
    initialTlbEntries: config.initialTlbEntries.map((entry) => [entry.pageNumber, entry.frameNumber]),
    freeFrameNumbers: [...config.freeFrameNumbers].sort((left, right) => left - right),
  });
}

function validateConfig(config: VirtualMemoryConfig): void {
  assertSafeInteger(config.pageSizeBytes, 'pageSizeBytes', 1);
  if (!Number.isInteger(Math.log2(config.pageSizeBytes))) {
    throw new RangeError('pageSizeBytes must be a power of two');
  }
  assertSafeInteger(config.virtualPageCount, 'virtualPageCount', 1);
  assertSafeInteger(config.residentSetLimit, 'residentSetLimit', 1);
  if (config.residentSetLimit > config.virtualPageCount) {
    throw new RangeError('residentSetLimit cannot exceed virtualPageCount');
  }
  assertSafeInteger(config.tlbCapacity, 'tlbCapacity', 1);
  assertSafeInteger(config.tlbLookupTimeNs, 'tlbLookupTimeNs');
  assertSafeInteger(config.memoryAccessTimeNs, 'memoryAccessTimeNs');
  assertSafeInteger(config.pageFaultServiceTimeNs, 'pageFaultServiceTimeNs');

  const largestVirtualAddress = config.pageSizeBytes * config.virtualPageCount - 1;
  if (!Number.isSafeInteger(largestVirtualAddress)) {
    throw new RangeError('the configured virtual address space exceeds safe integer precision');
  }

  if (config.initialResidentPages.length > config.residentSetLimit) {
    throw new RangeError('initialResidentPages exceeds residentSetLimit');
  }

  const residentPages = config.initialResidentPages.map((entry) => entry.pageNumber);
  const residentFrames = config.initialResidentPages.map((entry) => entry.frameNumber);
  if (hasDuplicates(residentPages)) {
    throw new RangeError('initialResidentPages contains a duplicate virtual page');
  }
  if (hasDuplicates(residentFrames)) {
    throw new RangeError('initialResidentPages contains a duplicate frame');
  }
  for (const entry of config.initialResidentPages) {
    assertSafeInteger(entry.pageNumber, 'initial resident page number');
    if (entry.pageNumber >= config.virtualPageCount) {
      throw new RangeError('initial resident page is outside the virtual address space');
    }
    assertAddressableFrame(entry.frameNumber, config.pageSizeBytes, 'initial resident frame number');
  }

  if (config.freeFrameNumbers.length < config.residentSetLimit - config.initialResidentPages.length) {
    throw new RangeError('freeFrameNumbers cannot fill the configured resident set');
  }
  if (hasDuplicates(config.freeFrameNumbers)) {
    throw new RangeError('freeFrameNumbers contains a duplicate frame');
  }
  const residentFrameSet = new Set(residentFrames);
  for (const frameNumber of config.freeFrameNumbers) {
    assertAddressableFrame(frameNumber, config.pageSizeBytes, 'free frame number');
    if (residentFrameSet.has(frameNumber)) {
      throw new RangeError('a resident frame cannot also be free');
    }
  }

  if (config.initialTlbEntries.length > config.tlbCapacity) {
    throw new RangeError('initialTlbEntries exceeds tlbCapacity');
  }
  const tlbPages = config.initialTlbEntries.map((entry) => entry.pageNumber);
  if (hasDuplicates(tlbPages)) {
    throw new RangeError('initialTlbEntries contains a duplicate virtual page');
  }
  const residentByPage = new Map(
    config.initialResidentPages.map((entry) => [entry.pageNumber, entry.frameNumber]),
  );
  for (const entry of config.initialTlbEntries) {
    assertSafeInteger(entry.pageNumber, 'initial TLB page number');
    assertAddressableFrame(entry.frameNumber, config.pageSizeBytes, 'initial TLB frame number');
    if (residentByPage.get(entry.pageNumber) !== entry.frameNumber) {
      throw new RangeError('initial TLB entry does not match a resident page');
    }
  }

  const worstAccessTime = config.tlbLookupTimeNs * 2
    + config.memoryAccessTimeNs * 2
    + config.pageFaultServiceTimeNs;
  if (!Number.isSafeInteger(worstAccessTime)) {
    throw new RangeError('configured access timing exceeds safe integer precision');
  }
}

function validateState(config: VirtualMemoryConfig, state: VirtualMemoryState): void {
  if (state.configFingerprint !== configFingerprint(config)) {
    throw new Error('state was created for a different virtual-memory configuration');
  }
  assertSafeInteger(state.step, 'state.step');
  assertSafeInteger(state.clock, 'state.clock');
  if (state.pages.length !== config.virtualPageCount) {
    throw new Error('state page table length does not match virtualPageCount');
  }

  const residentFrames: number[] = [];
  let residentCount = 0;
  for (let index = 0; index < state.pages.length; index += 1) {
    const page = state.pages[index];
    if (page === undefined || page.pageNumber !== index) {
      throw new Error('state page table must contain every virtual page in page-number order');
    }
    if (page.present) {
      if (page.frameNumber === null || page.lastAccessTick === null) {
        throw new Error('a present page requires a frame and an LRU tick');
      }
      assertAddressableFrame(page.frameNumber, config.pageSizeBytes, 'state resident frame number');
      assertSafeInteger(page.lastAccessTick, 'state page LRU tick', 1);
      if (page.lastAccessTick > state.clock) {
        throw new Error('state page LRU tick cannot exceed the state clock');
      }
      residentFrames.push(page.frameNumber);
      residentCount += 1;
    } else if (page.frameNumber !== null || page.lastAccessTick !== null) {
      throw new Error('a non-resident page cannot retain a frame or LRU tick');
    }
  }
  if (residentCount > config.residentSetLimit || hasDuplicates(residentFrames)) {
    throw new Error('state contains an invalid resident set');
  }

  if (hasDuplicates(state.freeFrameNumbers)) {
    throw new Error('state contains duplicate free frames');
  }
  const residentFrameSet = new Set(residentFrames);
  for (const frameNumber of state.freeFrameNumbers) {
    assertAddressableFrame(frameNumber, config.pageSizeBytes, 'state free frame number');
    if (residentFrameSet.has(frameNumber)) {
      throw new Error('state frame cannot be both resident and free');
    }
  }
  if (residentCount + state.freeFrameNumbers.length < config.residentSetLimit) {
    throw new Error('state does not contain enough frames for the resident set');
  }

  if (state.tlbEntries.length > config.tlbCapacity) {
    throw new Error('state TLB exceeds tlbCapacity');
  }
  const tlbPages = state.tlbEntries.map((entry) => entry.pageNumber);
  if (hasDuplicates(tlbPages)) {
    throw new Error('state TLB contains a duplicate page');
  }
  for (const entry of state.tlbEntries) {
    const page = state.pages[entry.pageNumber];
    if (page?.present !== true || page.frameNumber !== entry.frameNumber) {
      throw new Error('state TLB contains a stale translation');
    }
    assertSafeInteger(entry.lastAccessTick, 'state TLB LRU tick', 1);
    if (entry.lastAccessTick > state.clock) {
      throw new Error('state TLB LRU tick cannot exceed the state clock');
    }
  }
}

export function createVirtualMemoryState(config: VirtualMemoryConfig): VirtualMemoryState {
  validateConfig(config);

  const residentByPage = new Map(
    config.initialResidentPages.map((entry, index) => [
      entry.pageNumber,
      { frameNumber: entry.frameNumber, tick: index + 1 },
    ]),
  );
  const pages = Array.from({ length: config.virtualPageCount }, (_, pageNumber) => {
    const resident = residentByPage.get(pageNumber);
    return resident === undefined
      ? { pageNumber, frameNumber: null, present: false, lastAccessTick: null }
      : {
          pageNumber,
          frameNumber: resident.frameNumber,
          present: true,
          lastAccessTick: resident.tick,
        };
  });
  const tlbEntries = config.initialTlbEntries
    .map((entry, index) => ({ ...entry, lastAccessTick: index + 1 }))
    .sort((left, right) => left.pageNumber - right.pageNumber);

  return {
    configFingerprint: configFingerprint(config),
    step: 0,
    clock: Math.max(config.initialResidentPages.length, config.initialTlbEntries.length),
    pages,
    tlbEntries,
    freeFrameNumbers: [...config.freeFrameNumbers].sort((left, right) => left - right),
  };
}

function leastRecentlyUsed<T extends { readonly pageNumber: number; readonly lastAccessTick: number | null }>(
  entries: readonly T[],
): T {
  const sorted = [...entries].sort((left, right) => {
    const leftTick = left.lastAccessTick ?? -1;
    const rightTick = right.lastAccessTick ?? -1;
    return leftTick - rightTick || left.pageNumber - right.pageNumber;
  });
  const first = sorted[0];
  if (first === undefined) {
    throw new Error('cannot choose an LRU entry from an empty collection');
  }
  return first;
}

interface TlbUpdate {
  readonly entries: readonly VirtualMemoryTlbEntry[];
  readonly replacementPageNumber: number | null;
}

function updateTlb(
  entries: readonly VirtualMemoryTlbEntry[],
  pageNumber: number,
  frameNumber: number,
  tick: number,
  capacity: number,
): TlbUpdate {
  const withoutPage = entries.filter((entry) => entry.pageNumber !== pageNumber);
  let replacementPageNumber: number | null = null;
  if (withoutPage.length >= capacity) {
    const victim = leastRecentlyUsed(withoutPage);
    replacementPageNumber = victim.pageNumber;
    const victimIndex = withoutPage.findIndex((entry) => entry.pageNumber === victim.pageNumber);
    withoutPage.splice(victimIndex, 1);
  }
  withoutPage.push({ pageNumber, frameNumber, lastAccessTick: tick });
  withoutPage.sort((left, right) => left.pageNumber - right.pageNumber);
  return { entries: withoutPage, replacementPageNumber };
}

function safeTimingSum(parts: readonly number[]): number {
  const total = parts.reduce((sum, value) => sum + value, 0);
  if (!Number.isSafeInteger(total)) {
    throw new RangeError('access timing exceeds safe integer precision');
  }
  return total;
}

export function stepVirtualMemory(
  config: VirtualMemoryConfig,
  state: VirtualMemoryState,
  virtualAddress: number,
): VirtualMemoryStepResult {
  validateConfig(config);
  validateState(config, state);
  assertSafeInteger(virtualAddress, 'virtual address');
  const maximumVirtualAddress = config.pageSizeBytes * config.virtualPageCount - 1;
  if (virtualAddress > maximumVirtualAddress) {
    throw new RangeError(`virtual address must be at most ${maximumVirtualAddress}`);
  }

  const pageNumber = Math.floor(virtualAddress / config.pageSizeBytes);
  const offset = virtualAddress % config.pageSizeBytes;
  const tick = state.clock + 1;
  const phases: VirtualMemoryPhase[] = [];
  const initialTlbEntry = state.tlbEntries.find((entry) => entry.pageNumber === pageNumber);
  const tlbHit = initialTlbEntry !== undefined;
  phases.push({
    kind: 'tlb-lookup',
    durationNs: config.tlbLookupTimeNs,
    detail: tlbHit ? `page ${pageNumber} hit` : `page ${pageNumber} miss`,
  });

  const pages = state.pages.map((page) => ({ ...page }));
  let tlbEntries = state.tlbEntries.map((entry) => ({ ...entry }));
  const freeFrameNumbers = [...state.freeFrameNumbers];
  let pageTableAccessed = false;
  let pageFault = false;
  let retryPerformed = false;
  let evictedPageNumber: number | null = null;
  let loadedFrameNumber: number | null = null;
  let invalidatedTlbPageNumber: number | null = null;
  let tlbReplacementPageNumber: number | null = null;
  let frameNumber: number;

  if (initialTlbEntry !== undefined) {
    frameNumber = initialTlbEntry.frameNumber;
    tlbEntries = tlbEntries.map((entry) => (
      entry.pageNumber === pageNumber ? { ...entry, lastAccessTick: tick } : entry
    ));
  } else {
    pageTableAccessed = true;
    phases.push({
      kind: 'page-table-lookup',
      durationNs: config.memoryAccessTimeNs,
      detail: `read page-table entry ${pageNumber}`,
    });
    const requestedPage = pages[pageNumber];
    if (requestedPage === undefined) {
      throw new Error('page table is missing the requested virtual page');
    }

    if (requestedPage.present) {
      if (requestedPage.frameNumber === null) {
        throw new Error('resident page is missing its frame number');
      }
      frameNumber = requestedPage.frameNumber;
      const tlbUpdate = updateTlb(
        tlbEntries,
        pageNumber,
        frameNumber,
        tick,
        config.tlbCapacity,
      );
      tlbEntries = [...tlbUpdate.entries];
      tlbReplacementPageNumber = tlbUpdate.replacementPageNumber;
    } else {
      pageFault = true;
      retryPerformed = true;
      phases.push({
        kind: 'page-fault-service',
        durationNs: config.pageFaultServiceTimeNs,
        detail: `load page ${pageNumber}`,
      });

      const residents = pages.filter((page): page is VirtualMemoryPageState & {
        frameNumber: number;
        lastAccessTick: number;
      } => page.present && page.frameNumber !== null && page.lastAccessTick !== null);
      if (residents.length >= config.residentSetLimit) {
        const victim = leastRecentlyUsed(residents);
        evictedPageNumber = victim.pageNumber;
        frameNumber = victim.frameNumber;
        pages[victim.pageNumber] = {
          pageNumber: victim.pageNumber,
          frameNumber: null,
          present: false,
          lastAccessTick: null,
        };
        if (tlbEntries.some((entry) => entry.pageNumber === victim.pageNumber)) {
          invalidatedTlbPageNumber = victim.pageNumber;
          tlbEntries = tlbEntries.filter((entry) => entry.pageNumber !== victim.pageNumber);
        }
      } else {
        const freeFrame = freeFrameNumbers.shift();
        if (freeFrame === undefined) {
          throw new Error('no free frame is available for the page fault');
        }
        frameNumber = freeFrame;
      }
      loadedFrameNumber = frameNumber;
      pages[pageNumber] = {
        pageNumber,
        frameNumber,
        present: true,
        lastAccessTick: tick,
      };

      const tlbUpdate = updateTlb(
        tlbEntries,
        pageNumber,
        frameNumber,
        tick,
        config.tlbCapacity,
      );
      tlbEntries = [...tlbUpdate.entries];
      tlbReplacementPageNumber = tlbUpdate.replacementPageNumber;
      phases.push({
        kind: 'retry-tlb-lookup',
        durationNs: config.tlbLookupTimeNs,
        detail: `page ${pageNumber} hit after fault service`,
      });
    }
  }

  pages[pageNumber] = {
    pageNumber,
    frameNumber,
    present: true,
    lastAccessTick: tick,
  };
  phases.push({
    kind: 'memory-access',
    durationNs: config.memoryAccessTimeNs,
    detail: `read frame ${frameNumber}`,
  });

  const tlbLookupTimeNs = config.tlbLookupTimeNs * (retryPerformed ? 2 : 1);
  const pageTableLookupTimeNs = pageTableAccessed ? config.memoryAccessTimeNs : 0;
  const pageFaultServiceTimeNs = pageFault ? config.pageFaultServiceTimeNs : 0;
  const memoryAccessTimeNs = config.memoryAccessTimeNs;
  const totalTimeNs = safeTimingSum([
    tlbLookupTimeNs,
    pageTableLookupTimeNs,
    pageFaultServiceTimeNs,
    memoryAccessTimeNs,
  ]);
  const physicalAddress = frameNumber * config.pageSizeBytes + offset;
  if (!Number.isSafeInteger(physicalAddress)) {
    throw new RangeError('physical address exceeds safe integer precision');
  }

  const nextState: VirtualMemoryState = {
    configFingerprint: state.configFingerprint,
    step: state.step + 1,
    clock: tick,
    pages,
    tlbEntries,
    freeFrameNumbers,
  };
  const event: VirtualMemoryAccessEvent = {
    step: nextState.step,
    virtualAddress,
    pageNumber,
    offset,
    tlbHit,
    pageTableAccessed,
    pageFault,
    retryPerformed,
    evictedPageNumber,
    loadedFrameNumber,
    invalidatedTlbPageNumber,
    tlbReplacementPageNumber,
    physicalAddress,
    tlbLookupTimeNs,
    pageTableLookupTimeNs,
    pageFaultServiceTimeNs,
    memoryAccessTimeNs,
    totalTimeNs,
    phases,
  };
  return { state: nextState, event };
}

export function simulateVirtualMemory(
  config: VirtualMemoryConfig,
  virtualAddresses: readonly number[],
): VirtualMemoryTrace {
  const initialState = createVirtualMemoryState(config);
  const steps: VirtualMemoryStepResult[] = [];
  let state = initialState;
  let totalTimeNs = 0;

  for (const virtualAddress of virtualAddresses) {
    const result = stepVirtualMemory(config, state, virtualAddress);
    totalTimeNs = safeTimingSum([totalTimeNs, result.event.totalTimeNs]);
    steps.push(result);
    state = result.state;
  }

  return {
    initialState,
    steps,
    events: steps.map((step) => step.event),
    finalState: state,
    totalTimeNs,
  };
}

/** Local practice data derived from the 2009 Q46 needs-review content pack. */
export const Q46_LOCAL_PRACTICE_PRESET = {
  sourceQuestionId: 'cn408-2009-q46',
  reviewStatus: 'needs-review',
  config: {
    pageSizeBytes: 0x1000,
    virtualPageCount: 3,
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
  },
  virtualAddresses: [0x2362, 0x1565, 0x25a5],
} as const satisfies {
  readonly sourceQuestionId: string;
  readonly reviewStatus: 'needs-review';
  readonly config: VirtualMemoryConfig;
  readonly virtualAddresses: readonly number[];
};
