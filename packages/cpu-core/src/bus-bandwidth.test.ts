import { describe, expect, it } from 'vitest';

import {
  BUS_BANDWIDTH_Q20_PRESET,
  analyzeBusBandwidth,
  type BusBandwidthConfig,
  type BusBandwidthCoreResult,
  type BusBandwidthTrace,
} from './bus-bandwidth';

function unwrap<T>(result: BusBandwidthCoreResult<T>): T {
  expect(result.ok).toBe(true);
  if (!result.ok) throw new Error(result.error.message);
  return result.value;
}

function errorCode(result: BusBandwidthCoreResult<BusBandwidthTrace>): string {
  expect(result.ok).toBe(false);
  if (result.ok) throw new Error('Expected a bus-bandwidth validation error.');
  return result.error.code;
}

describe('Q20 bus bandwidth', () => {
  it('replays the source parameters with decimal MB units', () => {
    const trace = unwrap(analyzeBusBandwidth(BUS_BANDWIDTH_Q20_PRESET.config));

    expect(BUS_BANDWIDTH_Q20_PRESET).toMatchObject({
      id: 'cn408-2009-q20',
      sourceQuestionId: 'cn408-2009-q20',
      reviewStatus: 'needs-review',
    });
    expect(trace.steps.map((step) => step.kind)).toEqual([
      'frequency-hz',
      'clock-period',
      'bus-cycle-duration',
      'bus-cycles-per-second',
      'bandwidth-bytes',
      'bandwidth-megabytes',
      'bandwidth-bits',
    ]);
    expect(trace.result).toEqual({
      bytesPerMegabyte: 1_000_000,
      bitsPerByte: 8,
      clockFrequencyHz: 10_000_000,
      clockPeriodSeconds: 0.0000001,
      busCycleDurationSeconds: 0.0000002,
      busCyclesPerSecond: 5_000_000,
      bandwidthBytesPerSecond: 20_000_000,
      bandwidthMegabytesPerSecond: 20,
      bandwidthBitsPerSecond: 160_000_000,
      bandwidthMegabitsPerSecond: 160,
    });
  });

  it('keeps the formula deterministic for editable parameters', () => {
    const trace = unwrap(analyzeBusBandwidth({
      bytesPerBusCycle: 8,
      clockCyclesPerBusCycle: 4,
      busFrequencyMHz: 25,
    }));

    expect(trace.result.busCycleDurationSeconds).toBeCloseTo(0.00000016, 15);
    expect(trace.result.busCyclesPerSecond).toBe(6_250_000);
    expect(trace.result.bandwidthBytesPerSecond).toBe(50_000_000);
    expect(trace.result.bandwidthMegabytesPerSecond).toBe(50);
    expect(trace.result.bandwidthMegabitsPerSecond).toBe(400);
  });

  it('is deterministic, does not mutate frozen input, and returns isolated snapshots', () => {
    const config: BusBandwidthConfig = Object.freeze({ ...BUS_BANDWIDTH_Q20_PRESET.config });
    const snapshot = structuredClone(config);
    const first = unwrap(analyzeBusBandwidth(config));
    const firstSnapshot = structuredClone(first);
    const second = unwrap(analyzeBusBandwidth(config));

    expect(second).toEqual(firstSnapshot);
    expect(config).toEqual(snapshot);
    expect(first.config).not.toBe(config);
    expect(first.steps).not.toBe(second.steps);
    expect(first.result).not.toBe(second.result);
  });
});

describe('bus bandwidth validation', () => {
  it('fails closed for malformed inputs', () => {
    expect(errorCode(analyzeBusBandwidth(null as unknown as BusBandwidthConfig))).toBe('invalid-config');
    expect(errorCode(analyzeBusBandwidth({ ...BUS_BANDWIDTH_Q20_PRESET.config, bytesPerBusCycle: 0 }))).toBe('invalid-bytes-per-cycle');
    expect(errorCode(analyzeBusBandwidth({ ...BUS_BANDWIDTH_Q20_PRESET.config, clockCyclesPerBusCycle: 1.5 }))).toBe('invalid-clock-cycles');
    expect(errorCode(analyzeBusBandwidth({ ...BUS_BANDWIDTH_Q20_PRESET.config, busFrequencyMHz: Number.NaN }))).toBe('invalid-frequency');
  });

  it('rejects finite inputs whose derived arithmetic overflows', () => {
    expect(errorCode(analyzeBusBandwidth({
      bytesPerBusCycle: Number.MAX_SAFE_INTEGER,
      clockCyclesPerBusCycle: 1,
      busFrequencyMHz: Number.MAX_VALUE,
    }))).toBe('arithmetic-overflow');
  });
});
