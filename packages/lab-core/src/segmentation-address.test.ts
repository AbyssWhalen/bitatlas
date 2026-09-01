import { describe, expect, it } from 'vitest';
import {
  SEGMENTATION_Q27_PRESET,
  traceSegmentationAddress,
  type SegmentationAddressConfig,
} from './segmentation-address';

describe('Q27 segmentation address fields', () => {
  it('derives a 24-bit offset and 2^24-byte maximum segment', () => {
    const trace = traceSegmentationAddress(SEGMENTATION_Q27_PRESET.config);

    expect(trace.result).toMatchObject({
      addressBits: 32,
      segmentBits: 8,
      offsetBits: 24,
      maxSegmentLengthBytes: 2 ** 24,
    });
    expect(trace.steps.map((step) => step.kind)).toEqual([
      'initial',
      'segment-field',
      'offset-field',
      'capacity',
      'complete',
    ]);
    expect(trace.steps[0]?.state.offsetBits).toBeNull();
    expect(trace.steps.at(-1)?.state.maxSegmentLengthBytes).toBe(2 ** 24);
  });

  it('supports deterministic custom widths without mutating input', () => {
    const config: SegmentationAddressConfig = { addressBits: 16, segmentBits: 4 };
    const first = traceSegmentationAddress(config);
    const second = traceSegmentationAddress(config);

    expect(first).toEqual(second);
    expect(first.result.offsetBits).toBe(12);
    expect(first.result.maxSegmentLengthBytes).toBe(4096);
    expect(config).toEqual({ addressBits: 16, segmentBits: 4 });
    expect(first.steps).not.toBe(second.steps);
  });

  it('rejects widths that cannot describe a safe byte capacity', () => {
    const config = SEGMENTATION_Q27_PRESET.config;

    expect(() => traceSegmentationAddress({ ...config, addressBits: 1 })).toThrow(/addressBits/iu);
    expect(() => traceSegmentationAddress({ ...config, segmentBits: 32 })).toThrow(/segmentBits/iu);
    expect(() => traceSegmentationAddress({ ...config, addressBits: 54 })).toThrow(/addressBits/iu);
    expect(() => traceSegmentationAddress({ ...config, segmentBits: 1.5 })).toThrow(/segmentBits/iu);
  });
});
