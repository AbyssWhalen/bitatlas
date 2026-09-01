export interface MemoryExpansionConfig {
  readonly totalMemoryBytes: number;
  readonly romBytes: number;
  readonly romChipWords: number;
  readonly romChipBits: number;
  readonly ramChipWords: number;
  readonly ramChipBits: number;
}

export type MemoryRegionKind = 'rom' | 'ram';

export interface MemoryRegionExpansion {
  readonly kind: MemoryRegionKind;
  readonly requiredBytes: number;
  readonly chipWordCount: number;
  readonly chipWordBits: number;
  readonly widthExpansionFactor: number;
  readonly depthExpansionFactor: number;
  readonly chipCount: number;
  readonly realizedBytes: number;
}

export type MemoryExpansionStepKind =
  | 'partition'
  | 'rom-width'
  | 'rom-depth'
  | 'ram-width'
  | 'ram-depth'
  | 'complete';

export interface MemoryExpansionStep {
  readonly id: string;
  readonly kind: MemoryExpansionStepKind;
  readonly region: 'shared' | MemoryRegionKind;
  readonly label: string;
  readonly formula: string;
  readonly value: number;
  readonly unit: 'bytes' | 'chips-wide' | 'banks-deep' | 'chips';
}

export interface MemoryExpansionAnalysis {
  readonly byteWidthBits: 8;
  readonly totalMemoryBytes: number;
  readonly romBytes: number;
  readonly ramBytes: number;
  readonly totalChipCount: number;
  readonly capacityConserved: boolean;
  readonly rom: MemoryRegionExpansion;
  readonly ram: MemoryRegionExpansion;
}

export interface MemoryExpansionTrace {
  readonly config: MemoryExpansionConfig;
  readonly steps: readonly MemoryExpansionStep[];
  readonly result: MemoryExpansionAnalysis;
}

export type MemoryExpansionErrorCode =
  | 'invalid-config'
  | 'invalid-total-capacity'
  | 'invalid-rom-capacity'
  | 'invalid-rom-chip-words'
  | 'invalid-rom-chip-width'
  | 'invalid-ram-chip-words'
  | 'invalid-ram-chip-width'
  | 'incompatible-rom-chip-width'
  | 'incompatible-ram-chip-width'
  | 'incompatible-rom-chip-depth'
  | 'incompatible-ram-chip-depth'
  | 'arithmetic-overflow';

export interface MemoryExpansionError {
  readonly code: MemoryExpansionErrorCode;
  readonly message: string;
}

export type MemoryExpansionCoreResult<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: MemoryExpansionError };

const BYTE_WIDTH_BITS = 8 as const;

function failure<T>(code: MemoryExpansionErrorCode, message: string): MemoryExpansionCoreResult<T> {
  return { ok: false, error: { code, message } };
}

function isSafePositiveInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value > 0;
}

function buildRegion(
  kind: MemoryRegionKind,
  requiredBytes: number,
  chipWordCount: number,
  chipWordBits: number,
): MemoryExpansionCoreResult<MemoryRegionExpansion> {
  const incompatibleWidthCode = kind === 'rom'
    ? 'incompatible-rom-chip-width'
    : 'incompatible-ram-chip-width';
  const incompatibleDepthCode = kind === 'rom'
    ? 'incompatible-rom-chip-depth'
    : 'incompatible-ram-chip-depth';

  if (BYTE_WIDTH_BITS % chipWordBits !== 0) {
    return failure(incompatibleWidthCode, `${kind.toUpperCase()} chip width must divide one 8-bit addressable unit.`);
  }
  if (requiredBytes % chipWordCount !== 0) {
    return failure(incompatibleDepthCode, `${kind.toUpperCase()} capacity must be divisible by the chip word count.`);
  }

  const widthExpansionFactor = BYTE_WIDTH_BITS / chipWordBits;
  const depthExpansionFactor = requiredBytes / chipWordCount;
  const chipCount = widthExpansionFactor * depthExpansionFactor;
  const realizedBytes = chipWordCount * depthExpansionFactor;
  if (!Number.isSafeInteger(chipCount) || !Number.isSafeInteger(realizedBytes)) {
    return failure('arithmetic-overflow', `${kind.toUpperCase()} expansion exceeds safe integer bounds.`);
  }

  return {
    ok: true,
    value: {
      kind,
      requiredBytes,
      chipWordCount,
      chipWordBits,
      widthExpansionFactor,
      depthExpansionFactor,
      chipCount,
      realizedBytes,
    },
  };
}

export function analyzeMemoryExpansion(
  config: MemoryExpansionConfig,
): MemoryExpansionCoreResult<MemoryExpansionTrace> {
  if (config === null || typeof config !== 'object' || Array.isArray(config)) {
    return failure('invalid-config', 'Memory expansion config must be an object.');
  }
  if (!isSafePositiveInteger(config.totalMemoryBytes)) {
    return failure('invalid-total-capacity', 'Total memory capacity must be a positive safe integer byte count.');
  }
  if (!isSafePositiveInteger(config.romBytes) || config.romBytes >= config.totalMemoryBytes) {
    return failure('invalid-rom-capacity', 'ROM capacity must be a positive safe integer smaller than total memory.');
  }
  if (!isSafePositiveInteger(config.romChipWords)) {
    return failure('invalid-rom-chip-words', 'ROM chip word count must be a positive safe integer.');
  }
  if (!isSafePositiveInteger(config.romChipBits)) {
    return failure('invalid-rom-chip-width', 'ROM chip width must be a positive safe integer bit count.');
  }
  if (!isSafePositiveInteger(config.ramChipWords)) {
    return failure('invalid-ram-chip-words', 'RAM chip word count must be a positive safe integer.');
  }
  if (!isSafePositiveInteger(config.ramChipBits)) {
    return failure('invalid-ram-chip-width', 'RAM chip width must be a positive safe integer bit count.');
  }

  const ramBytes = config.totalMemoryBytes - config.romBytes;
  const romResult = buildRegion('rom', config.romBytes, config.romChipWords, config.romChipBits);
  if (!romResult.ok) return romResult;
  const ramResult = buildRegion('ram', ramBytes, config.ramChipWords, config.ramChipBits);
  if (!ramResult.ok) return ramResult;

  const rom = romResult.value;
  const ram = ramResult.value;
  const totalChipCount = rom.chipCount + ram.chipCount;
  const realizedTotalBytes = rom.realizedBytes + ram.realizedBytes;
  if (!Number.isSafeInteger(totalChipCount) || !Number.isSafeInteger(realizedTotalBytes)) {
    return failure('arithmetic-overflow', 'Combined memory expansion exceeds safe integer bounds.');
  }

  const result: MemoryExpansionAnalysis = {
    byteWidthBits: BYTE_WIDTH_BITS,
    totalMemoryBytes: config.totalMemoryBytes,
    romBytes: config.romBytes,
    ramBytes,
    totalChipCount,
    capacityConserved: realizedTotalBytes === config.totalMemoryBytes,
    rom,
    ram,
  };
  const steps: MemoryExpansionStep[] = [
    {
      id: 'memory-expansion-1',
      kind: 'partition',
      region: 'shared',
      label: '划分 ROM 与 RAM 容量',
      formula: `${config.totalMemoryBytes} B - ${config.romBytes} B`,
      value: ramBytes,
      unit: 'bytes',
    },
    {
      id: 'memory-expansion-2',
      kind: 'rom-width',
      region: 'rom',
      label: '计算 ROM 位扩展',
      formula: `${BYTE_WIDTH_BITS} bit / ${config.romChipBits} bit`,
      value: rom.widthExpansionFactor,
      unit: 'chips-wide',
    },
    {
      id: 'memory-expansion-3',
      kind: 'rom-depth',
      region: 'rom',
      label: '计算 ROM 字扩展',
      formula: `${config.romBytes} B / ${config.romChipWords} words`,
      value: rom.depthExpansionFactor,
      unit: 'banks-deep',
    },
    {
      id: 'memory-expansion-4',
      kind: 'ram-width',
      region: 'ram',
      label: '计算 RAM 位扩展',
      formula: `${BYTE_WIDTH_BITS} bit / ${config.ramChipBits} bit`,
      value: ram.widthExpansionFactor,
      unit: 'chips-wide',
    },
    {
      id: 'memory-expansion-5',
      kind: 'ram-depth',
      region: 'ram',
      label: '计算 RAM 字扩展',
      formula: `${ramBytes} B / ${config.ramChipWords} words`,
      value: ram.depthExpansionFactor,
      unit: 'banks-deep',
    },
    {
      id: 'memory-expansion-6',
      kind: 'complete',
      region: 'shared',
      label: '合计所需芯片',
      formula: `${rom.chipCount} ROM + ${ram.chipCount} RAM`,
      value: totalChipCount,
      unit: 'chips',
    },
  ];

  return {
    ok: true,
    value: {
      config: { ...config },
      steps,
      result,
    },
  };
}

export const MEMORY_EXPANSION_Q15_PRESET = {
  id: 'cn408-2009-q15',
  sourceQuestionId: 'cn408-2009-q15',
  reviewStatus: 'needs-review',
  config: {
    totalMemoryBytes: 64 * 1_024,
    romBytes: 4 * 1_024,
    romChipWords: 2 * 1_024,
    romChipBits: 8,
    ramChipWords: 4 * 1_024,
    ramChipBits: 4,
  },
} as const satisfies {
  readonly id: string;
  readonly sourceQuestionId: string;
  readonly reviewStatus: 'needs-review';
  readonly config: MemoryExpansionConfig;
};
