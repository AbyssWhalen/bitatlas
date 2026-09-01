import { describe, expect, it } from 'vitest';

import {
  MEMORY_EXPANSION_Q15_PRESET,
  analyzeMemoryExpansion,
  type MemoryExpansionConfig,
  type MemoryExpansionCoreResult,
  type MemoryExpansionTrace,
} from './memory-expansion';

function unwrap<T>(result: MemoryExpansionCoreResult<T>): T {
  expect(result.ok).toBe(true);
  if (!result.ok) throw new Error(result.error.message);
  return result.value;
}

function errorCode(result: MemoryExpansionCoreResult<MemoryExpansionTrace>): string {
  expect(result.ok).toBe(false);
  if (result.ok) throw new Error('Expected a memory-expansion validation error.');
  return result.error.code;
}

describe('Q15 memory chip expansion', () => {
  it('derives the exact ROM and RAM expansion matrix from the source parameters', () => {
    const trace = unwrap(analyzeMemoryExpansion(MEMORY_EXPANSION_Q15_PRESET.config));

    expect(MEMORY_EXPANSION_Q15_PRESET).toMatchObject({
      id: 'cn408-2009-q15',
      sourceQuestionId: 'cn408-2009-q15',
      reviewStatus: 'needs-review',
    });
    expect(trace.steps.map((step) => step.kind)).toEqual([
      'partition',
      'rom-width',
      'rom-depth',
      'ram-width',
      'ram-depth',
      'complete',
    ]);
    expect(trace.result).toEqual({
      byteWidthBits: 8,
      totalMemoryBytes: 64 * 1_024,
      romBytes: 4 * 1_024,
      ramBytes: 60 * 1_024,
      totalChipCount: 32,
      capacityConserved: true,
      rom: {
        kind: 'rom',
        requiredBytes: 4 * 1_024,
        chipWordCount: 2 * 1_024,
        chipWordBits: 8,
        widthExpansionFactor: 1,
        depthExpansionFactor: 2,
        chipCount: 2,
        realizedBytes: 4 * 1_024,
      },
      ram: {
        kind: 'ram',
        requiredBytes: 60 * 1_024,
        chipWordCount: 4 * 1_024,
        chipWordBits: 4,
        widthExpansionFactor: 2,
        depthExpansionFactor: 15,
        chipCount: 30,
        realizedBytes: 60 * 1_024,
      },
    });
  });

  it('keeps width and depth expansion independent for a custom valid layout', () => {
    const trace = unwrap(analyzeMemoryExpansion({
      totalMemoryBytes: 24 * 1_024,
      romBytes: 8 * 1_024,
      romChipWords: 1 * 1_024,
      romChipBits: 4,
      ramChipWords: 2 * 1_024,
      ramChipBits: 8,
    }));

    expect(trace.result.rom).toMatchObject({
      widthExpansionFactor: 2,
      depthExpansionFactor: 8,
      chipCount: 16,
      realizedBytes: 8 * 1_024,
    });
    expect(trace.result.ram).toMatchObject({
      widthExpansionFactor: 1,
      depthExpansionFactor: 8,
      chipCount: 8,
      realizedBytes: 16 * 1_024,
    });
    expect(trace.result.capacityConserved).toBe(true);
  });

  it('is deterministic, does not mutate frozen input, and isolates returned snapshots', () => {
    const config: MemoryExpansionConfig = Object.freeze({ ...MEMORY_EXPANSION_Q15_PRESET.config });
    const snapshot = structuredClone(config);
    const first = unwrap(analyzeMemoryExpansion(config));
    const firstSnapshot = structuredClone(first);
    const second = unwrap(analyzeMemoryExpansion(config));

    expect(second).toEqual(firstSnapshot);
    expect(config).toEqual(snapshot);
    expect(first.config).not.toBe(config);
    expect(first.steps).not.toBe(second.steps);
    expect(first.result).not.toBe(second.result);
    expect(first.result.rom).not.toBe(second.result.rom);
    expect(first.result.ram).not.toBe(second.result.ram);
  });
});

describe('memory chip expansion validation', () => {
  it('fails closed for a missing runtime config', () => {
    expect(errorCode(analyzeMemoryExpansion(
      null as unknown as MemoryExpansionConfig,
    ))).toBe('invalid-config');
  });

  it.each([
    ['total capacity', { totalMemoryBytes: 0 }, 'invalid-total-capacity'],
    ['ROM capacity', { romBytes: 0 }, 'invalid-rom-capacity'],
    ['ROM consumes all memory', { romBytes: 64 * 1_024 }, 'invalid-rom-capacity'],
    ['ROM chip words', { romChipWords: 1.5 }, 'invalid-rom-chip-words'],
    ['ROM chip width', { romChipBits: 0 }, 'invalid-rom-chip-width'],
    ['RAM chip words', { ramChipWords: Number.MAX_SAFE_INTEGER + 1 }, 'invalid-ram-chip-words'],
    ['RAM chip width', { ramChipBits: Number.NaN }, 'invalid-ram-chip-width'],
  ])('rejects invalid %s', (_label, override, code) => {
    expect(errorCode(analyzeMemoryExpansion({
      ...MEMORY_EXPANSION_Q15_PRESET.config,
      ...override,
    }))).toBe(code);
  });

  it.each([
    ['ROM width', { romChipBits: 3 }, 'incompatible-rom-chip-width'],
    ['RAM width', { ramChipBits: 16 }, 'incompatible-ram-chip-width'],
    ['ROM depth', { romChipWords: 3 * 1_024 }, 'incompatible-rom-chip-depth'],
    ['RAM depth', { ramChipWords: 7 * 1_024 }, 'incompatible-ram-chip-depth'],
  ])('rejects an incompatible %s expansion', (_label, override, code) => {
    expect(errorCode(analyzeMemoryExpansion({
      ...MEMORY_EXPANSION_Q15_PRESET.config,
      ...override,
    }))).toBe(code);
  });

  it('rejects safe inputs whose derived chip count exceeds safe integer bounds', () => {
    expect(errorCode(analyzeMemoryExpansion({
      totalMemoryBytes: Number.MAX_SAFE_INTEGER,
      romBytes: Number.MAX_SAFE_INTEGER - 1,
      romChipWords: 1,
      romChipBits: 1,
      ramChipWords: 1,
      ramChipBits: 1,
    }))).toBe('arithmetic-overflow');
  });
});
