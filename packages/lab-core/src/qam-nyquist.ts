export interface QamNyquistConfig {
  readonly bandwidthHz: number;
  readonly phaseCount: number;
  readonly amplitudeCount: number;
}

export interface QamNyquistStep {
  readonly id: 'initial' | 'states' | 'bits-per-symbol' | 'nyquist' | 'complete';
  readonly label: string;
  readonly operation: string;
  readonly result: string;
  readonly value: number;
  readonly unit: 'Hz' | 'states' | 'bits/symbol' | 'bits/s';
}

export interface QamNyquistTrace {
  readonly config: QamNyquistConfig;
  readonly symbolStates: number;
  readonly bitsPerSymbol: number;
  readonly maxDataRateBitsPerSecond: number;
  readonly steps: readonly QamNyquistStep[];
}

export const QAM_NYQUIST_Q34_PRESET = {
  sourceQuestionId: 'cn408-2009-q34',
  reviewStatus: 'needs-review',
  config: {
    bandwidthHz: 3_000,
    phaseCount: 4,
    amplitudeCount: 4,
  },
} as const satisfies {
  readonly sourceQuestionId: 'cn408-2009-q34';
  readonly reviewStatus: 'needs-review';
  readonly config: QamNyquistConfig;
};

function assertPositiveFinite(value: number, label: string): void {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
    throw new RangeError(`${label} must be a positive finite number`);
  }
}

function assertModulationDimension(value: number, label: string): void {
  if (!Number.isSafeInteger(value) || value < 2) {
    throw new RangeError(`${label} must be an integer of at least 2`);
  }
}

function validateConfig(config: QamNyquistConfig): QamNyquistConfig {
  if (typeof config !== 'object' || config === null) {
    throw new TypeError('QAM configuration must be an object');
  }
  assertPositiveFinite(config.bandwidthHz, 'bandwidth');
  assertModulationDimension(config.phaseCount, 'phase count');
  assertModulationDimension(config.amplitudeCount, 'amplitude count');
  const symbolStates = config.phaseCount * config.amplitudeCount;
  if (!Number.isSafeInteger(symbolStates)) {
    throw new RangeError('symbol state count is outside the safe integer range');
  }
  return { ...config };
}

function fixed(value: number): string {
  return value.toLocaleString('en-US', { maximumFractionDigits: 12, useGrouping: false });
}

export function traceQamNyquist(config: QamNyquistConfig): QamNyquistTrace {
  const normalizedConfig = validateConfig(config);
  const symbolStates = normalizedConfig.phaseCount * normalizedConfig.amplitudeCount;
  const bitsPerSymbol = Math.log2(symbolStates);
  const maxDataRateBitsPerSecond = 2 * normalizedConfig.bandwidthHz * bitsPerSymbol;
  if (!Number.isFinite(bitsPerSymbol) || !Number.isFinite(maxDataRateBitsPerSecond)) {
    throw new RangeError('QAM rate is outside the finite number range');
  }

  const steps: readonly QamNyquistStep[] = [
    {
      id: 'initial',
      label: '读取题设参数',
      operation: `${normalizedConfig.bandwidthHz} Hz · ${normalizedConfig.phaseCount} 相位 · ${normalizedConfig.amplitudeCount} 种振幅`,
      result: '无噪声，使用奈氏准则',
      value: normalizedConfig.bandwidthHz,
      unit: 'Hz',
    },
    {
      id: 'states',
      label: '组合符号状态',
      operation: `M = ${normalizedConfig.phaseCount} × ${normalizedConfig.amplitudeCount}`,
      result: `${symbolStates} 个符号状态`,
      value: symbolStates,
      unit: 'states',
    },
    {
      id: 'bits-per-symbol',
      label: '换算每符号比特数',
      operation: `log₂(${symbolStates})`,
      result: `${fixed(bitsPerSymbol)} bit/符号`,
      value: bitsPerSymbol,
      unit: 'bits/symbol',
    },
    {
      id: 'nyquist',
      label: '应用奈氏准则',
      operation: `R = 2 × ${normalizedConfig.bandwidthHz} × ${fixed(bitsPerSymbol)}`,
      result: `${fixed(maxDataRateBitsPerSecond)} bit/s`,
      value: maxDataRateBitsPerSecond,
      unit: 'bits/s',
    },
    {
      id: 'complete',
      label: '得到最大数据传输速率',
      operation: '无噪声链路的奈氏上限',
      result: `${fixed(maxDataRateBitsPerSecond)} bit/s`,
      value: maxDataRateBitsPerSecond,
      unit: 'bits/s',
    },
  ];

  return {
    config: normalizedConfig,
    symbolStates,
    bitsPerSymbol,
    maxDataRateBitsPerSecond,
    steps,
  };
}
