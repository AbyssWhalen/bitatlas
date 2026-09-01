import { describe, expect, it } from 'vitest';

import {
  IO_OVERHEAD_Q43_PRESET,
  analyzeIoOverhead,
  type IoOverheadConfig,
  type IoOverheadCoreResult,
  type IoOverheadTrace,
} from './io-overhead';

function unwrap<T>(result: IoOverheadCoreResult<T>): T {
  expect(result.ok).toBe(true);
  if (!result.ok) throw new Error(result.error.message);
  return result.value;
}

function errorCode(result: IoOverheadCoreResult<IoOverheadTrace>): string {
  expect(result.ok).toBe(false);
  if (result.ok) throw new Error('Expected an I/O overhead validation error.');
  return result.error.code;
}

describe('Q43 interrupt and DMA CPU overhead', () => {
  it('replays the seven rubric calculations with decimal MB units', () => {
    const trace = unwrap(analyzeIoOverhead(IO_OVERHEAD_Q43_PRESET.config));

    expect(IO_OVERHEAD_Q43_PRESET).toMatchObject({
      id: 'cn408-2009-q43',
      sourceQuestionId: 'cn408-2009-q43',
      reviewStatus: 'needs-review',
    });
    expect(trace.steps).toHaveLength(7);
    expect(trace.steps.map((step) => step.kind)).toEqual([
      'cpu-budget',
      'interrupt-cycles-per-transfer',
      'interrupt-transfers-per-second',
      'interrupt-utilization',
      'dma-transfers-per-second',
      'dma-cycles-per-second',
      'dma-utilization',
    ]);
    expect(trace.result).toEqual({
      bytesPerMegabyte: 1_000_000,
      cpuCyclesPerSecond: 500_000_000,
      interrupt: {
        transferBytes: 4,
        cyclesPerTransfer: 100,
        transfersPerSecond: 125_000,
        cpuCyclesPerSecond: 12_500_000,
        utilizationPercent: 2.5,
        sustainable: true,
      },
      dma: {
        transfersPerSecond: 1_000,
        cpuCyclesPerSecond: 500_000,
        utilizationPercent: 0.1,
        sustainable: true,
      },
      absoluteUtilizationReductionPoints: 2.4,
      relativeCpuReductionPercent: 96,
    });
  });

  it('keeps overloads as inspectable results instead of rejecting valid arithmetic', () => {
    const trace = unwrap(analyzeIoOverhead({
      ...IO_OVERHEAD_Q43_PRESET.config,
      cpuFrequencyMHz: 1,
      interruptDataRateMBps: 1,
      dmaDataRateMBps: 20,
    }));

    expect(trace.result.interrupt.utilizationPercent).toBe(2_500);
    expect(trace.result.interrupt.sustainable).toBe(false);
    expect(trace.result.dma.utilizationPercent).toBe(200);
    expect(trace.result.dma.sustainable).toBe(false);
  });

  it('handles idle rates and zero CPU work without dividing by zero', () => {
    const trace = unwrap(analyzeIoOverhead({
      ...IO_OVERHEAD_Q43_PRESET.config,
      interruptDataRateMBps: 0,
      interruptServiceInstructions: 0,
      interruptOtherInstructions: 0,
      dmaDataRateMBps: 0,
      dmaCpuOverheadCyclesPerBlock: 0,
    }));

    expect(trace.result.interrupt.utilizationPercent).toBe(0);
    expect(trace.result.dma.utilizationPercent).toBe(0);
    expect(trace.result.relativeCpuReductionPercent).toBeNull();
  });

  it('treats mathematically exact 100% utilization as sustainable despite rounding noise', () => {
    const interruptTrace = unwrap(analyzeIoOverhead({
      ...IO_OVERHEAD_Q43_PRESET.config,
      cpuFrequencyMHz: 1.1,
      cpi: 1.1,
      interruptDataRateMBps: 1,
      interruptTransferBits: 88,
      interruptServiceInstructions: 11,
      interruptOtherInstructions: 0,
      dmaDataRateMBps: 0,
      dmaCpuOverheadCyclesPerBlock: 0,
    }));
    const dmaTrace = unwrap(analyzeIoOverhead({
      ...IO_OVERHEAD_Q43_PRESET.config,
      cpuFrequencyMHz: 1.3,
      dmaDataRateMBps: 1.3000000000000003,
      dmaBlockBytes: 13,
      dmaCpuOverheadCyclesPerBlock: 13,
      interruptDataRateMBps: 0,
      interruptServiceInstructions: 0,
      interruptOtherInstructions: 0,
    }));

    expect(interruptTrace.result.interrupt.utilizationPercent).toBeCloseTo(100, 12);
    expect(interruptTrace.result.interrupt.sustainable).toBe(true);
    expect(dmaTrace.result.dma.utilizationPercent).toBeCloseTo(100, 12);
    expect(dmaTrace.result.dma.sustainable).toBe(true);
  });

  it('is deterministic and does not mutate frozen input', () => {
    const config: IoOverheadConfig = Object.freeze({ ...IO_OVERHEAD_Q43_PRESET.config });
    const snapshot = structuredClone(config);
    const first = unwrap(analyzeIoOverhead(config));
    const second = unwrap(analyzeIoOverhead(config));

    expect(second).toEqual(first);
    expect(config).toEqual(snapshot);
  });
});

describe('I/O overhead validation', () => {
  it.each([
    ['CPU frequency', { cpuFrequencyMHz: 0 }, 'invalid-cpu-frequency'],
    ['CPI', { cpi: Number.NaN }, 'invalid-cpi'],
    ['interrupt rate', { interruptDataRateMBps: -1 }, 'invalid-interrupt-rate'],
    ['interrupt transfer bits', { interruptTransferBits: 7 }, 'invalid-interrupt-transfer-size'],
    ['interrupt service instructions', { interruptServiceInstructions: 1.5 }, 'invalid-interrupt-instructions'],
    ['interrupt other instructions', { interruptOtherInstructions: -1 }, 'invalid-interrupt-instructions'],
    ['DMA rate', { dmaDataRateMBps: Number.POSITIVE_INFINITY }, 'invalid-dma-rate'],
    ['DMA block size', { dmaBlockBytes: 0 }, 'invalid-dma-block-size'],
    ['DMA overhead', { dmaCpuOverheadCyclesPerBlock: -1 }, 'invalid-dma-overhead'],
  ])('rejects invalid %s', (_label, override, code) => {
    expect(errorCode(analyzeIoOverhead({
      ...IO_OVERHEAD_Q43_PRESET.config,
      ...override,
    }))).toBe(code);
  });

  it('rejects finite inputs whose derived arithmetic overflows', () => {
    expect(errorCode(analyzeIoOverhead({
      ...IO_OVERHEAD_Q43_PRESET.config,
      interruptDataRateMBps: Number.MAX_VALUE,
    }))).toBe('arithmetic-overflow');
  });
});
