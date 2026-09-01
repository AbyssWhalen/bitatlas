import { describe, expect, it } from 'vitest';
import {
  CSMA_CD_Q37_PRESET,
  traceCsmaCdDistanceReduction,
  type CsmaCdConfig,
} from './csma-cd-collision';

describe('Q37 CSMA/CD collision-domain distance trace', () => {
  it('derives the 80 m distance reduction from the 800-bit frame reduction', () => {
    const trace = traceCsmaCdDistanceReduction(CSMA_CD_Q37_PRESET.config);

    expect(trace.frameReductionTimeSeconds).toBe(0.0000008);
    expect(trace.roundTripPropagationTimeSeconds).toBe(0.0000008);
    expect(trace.distanceReductionMeters).toBe(80);
    expect(trace.steps.map((step) => step.id)).toEqual([
      'initial',
      'frame-time',
      'round-trip',
      'distance',
      'complete',
    ]);
    expect(trace.steps.at(-1)).toMatchObject({
      id: 'complete',
      value: 80,
      unit: 'm',
    });
  });

  it('keeps the round-trip factor explicit and supports other positive parameters', () => {
    const config: CsmaCdConfig = {
      dataRateBitsPerSecond: 100_000_000,
      propagationSpeedMetersPerSecond: 200_000_000,
      frameReductionBits: 100,
    };
    const trace = traceCsmaCdDistanceReduction(config);

    expect(trace.distanceReductionMeters).toBe(100);
    expect(trace.steps.find((step) => step.id === 'round-trip')).toMatchObject({
      operation: '2 × Δd / v = Δt',
      value: 0.000001,
      unit: 's',
    });
  });

  it('is deterministic, does not mutate input, and rejects invalid parameters', () => {
    const config: CsmaCdConfig = { ...CSMA_CD_Q37_PRESET.config };
    const first = traceCsmaCdDistanceReduction(config);
    const second = traceCsmaCdDistanceReduction(config);

    expect(first).toEqual(second);
    expect(config).toEqual(CSMA_CD_Q37_PRESET.config);
    expect(first.steps).not.toBe(second.steps);
    expect(() => traceCsmaCdDistanceReduction({ ...config, dataRateBitsPerSecond: 0 })).toThrow(/data rate/iu);
    expect(() => traceCsmaCdDistanceReduction({ ...config, propagationSpeedMetersPerSecond: Number.NaN })).toThrow(/propagation speed/iu);
    expect(() => traceCsmaCdDistanceReduction({ ...config, frameReductionBits: 0 })).toThrow(/frame reduction/iu);
    expect(() => traceCsmaCdDistanceReduction({ ...config, frameReductionBits: 1.5 })).toThrow(/frame reduction/iu);
  });
});
