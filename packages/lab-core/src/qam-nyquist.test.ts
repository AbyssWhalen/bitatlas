import { describe, expect, it } from 'vitest';
import {
  QAM_NYQUIST_Q34_PRESET,
  traceQamNyquist,
  type QamNyquistConfig,
} from './qam-nyquist';

describe('Q34 QAM and Nyquist trace', () => {
  it('derives 24 kbps from 3 kHz and 16 QAM states', () => {
    const trace = traceQamNyquist(QAM_NYQUIST_Q34_PRESET.config);

    expect(trace.symbolStates).toBe(16);
    expect(trace.bitsPerSymbol).toBe(4);
    expect(trace.maxDataRateBitsPerSecond).toBe(24_000);
    expect(trace.steps.map((step) => step.id)).toEqual([
      'initial',
      'states',
      'bits-per-symbol',
      'nyquist',
      'complete',
    ]);
    expect(trace.steps.at(-1)).toMatchObject({
      id: 'complete',
      value: 24_000,
      unit: 'bits/s',
    });
  });

  it('supports deterministic custom states without mutating the input', () => {
    const config: QamNyquistConfig = {
      bandwidthHz: 8_000,
      phaseCount: 8,
      amplitudeCount: 2,
    };
    const first = traceQamNyquist(config);
    const second = traceQamNyquist(config);

    expect(first).toEqual(second);
    expect(config).toEqual({ bandwidthHz: 8_000, phaseCount: 8, amplitudeCount: 2 });
    expect(first.maxDataRateBitsPerSecond).toBe(64_000);
    expect(first.steps).not.toBe(second.steps);
  });

  it('rejects invalid bandwidth and modulation dimensions', () => {
    const config = QAM_NYQUIST_Q34_PRESET.config;

    expect(() => traceQamNyquist({ ...config, bandwidthHz: 0 })).toThrow(/bandwidth/iu);
    expect(() => traceQamNyquist({ ...config, phaseCount: 1 })).toThrow(/phase/iu);
    expect(() => traceQamNyquist({ ...config, amplitudeCount: 1.5 })).toThrow(/amplitude/iu);
  });
});
