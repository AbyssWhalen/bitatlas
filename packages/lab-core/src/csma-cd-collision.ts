export interface CsmaCdConfig {
  readonly dataRateBitsPerSecond: number;
  readonly propagationSpeedMetersPerSecond: number;
  readonly frameReductionBits: number;
}

export interface CsmaCdStep {
  readonly id: 'initial' | 'frame-time' | 'round-trip' | 'distance' | 'complete';
  readonly label: string;
  readonly operation: string;
  readonly result: string;
  readonly value: number;
  readonly unit: 'bits/s' | 'm/s' | 'bit' | 's' | 'm';
}

export interface CsmaCdTrace {
  readonly config: CsmaCdConfig;
  readonly frameReductionTimeSeconds: number;
  readonly roundTripPropagationTimeSeconds: number;
  readonly distanceReductionMeters: number;
  readonly steps: readonly CsmaCdStep[];
}

export const CSMA_CD_Q37_PRESET = {
  sourceQuestionId: 'cn408-2009-q37',
  reviewStatus: 'needs-review',
  config: {
    dataRateBitsPerSecond: 1_000_000_000,
    propagationSpeedMetersPerSecond: 200_000_000,
    frameReductionBits: 800,
  },
} as const satisfies {
  readonly sourceQuestionId: 'cn408-2009-q37';
  readonly reviewStatus: 'needs-review';
  readonly config: CsmaCdConfig;
};

function assertPositiveFinite(value: number, label: string): void {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
    throw new RangeError(`${label} must be a positive finite number`);
  }
}

function validateConfig(config: CsmaCdConfig): CsmaCdConfig {
  if (typeof config !== 'object' || config === null) {
    throw new TypeError('CSMA/CD configuration must be an object');
  }
  assertPositiveFinite(config.dataRateBitsPerSecond, 'data rate');
  assertPositiveFinite(config.propagationSpeedMetersPerSecond, 'propagation speed');
  if (!Number.isSafeInteger(config.frameReductionBits) || config.frameReductionBits <= 0) {
    throw new RangeError('frame reduction must be a positive safe integer');
  }
  return { ...config };
}

function fixed(value: number): string {
  return value.toLocaleString('en-US', { maximumFractionDigits: 12, useGrouping: false });
}

export function traceCsmaCdDistanceReduction(config: CsmaCdConfig): CsmaCdTrace {
  const normalizedConfig = validateConfig(config);
  const frameReductionTimeSeconds = normalizedConfig.frameReductionBits
    / normalizedConfig.dataRateBitsPerSecond;
  const roundTripPropagationTimeSeconds = frameReductionTimeSeconds;
  const distanceReductionMeters = roundTripPropagationTimeSeconds
    * normalizedConfig.propagationSpeedMetersPerSecond / 2;
  if (!Number.isFinite(distanceReductionMeters)) {
    throw new RangeError('distance reduction is outside the finite number range');
  }

  const steps: readonly CsmaCdStep[] = [
    {
      id: 'initial',
      label: '读取题设参数',
      operation: `${normalizedConfig.frameReductionBits} bit @ ${normalizedConfig.dataRateBitsPerSecond} bit/s`,
      result: '计算减少的帧发送时间',
      value: normalizedConfig.frameReductionBits,
      unit: 'bit',
    },
    {
      id: 'frame-time',
      label: '计算发送时间差',
      operation: `Δt = ${normalizedConfig.frameReductionBits} / ${normalizedConfig.dataRateBitsPerSecond}`,
      result: `${fixed(frameReductionTimeSeconds)} s`,
      value: frameReductionTimeSeconds,
      unit: 's',
    },
    {
      id: 'round-trip',
      label: '匹配往返传播时延',
      operation: '2 × Δd / v = Δt',
      result: `Δt = ${fixed(roundTripPropagationTimeSeconds)} s`,
      value: roundTripPropagationTimeSeconds,
      unit: 's',
    },
    {
      id: 'distance',
      label: '求距离变化',
      operation: `Δd = ${fixed(roundTripPropagationTimeSeconds)} × ${normalizedConfig.propagationSpeedMetersPerSecond} / 2`,
      result: `${fixed(distanceReductionMeters)} m`,
      value: distanceReductionMeters,
      unit: 'm',
    },
    {
      id: 'complete',
      label: '得到最小距离变化',
      operation: '最远站点距离必须至少缩短上述距离',
      result: `${fixed(distanceReductionMeters)} m`,
      value: distanceReductionMeters,
      unit: 'm',
    },
  ];

  return {
    config: normalizedConfig,
    frameReductionTimeSeconds,
    roundTripPropagationTimeSeconds,
    distanceReductionMeters,
    steps,
  };
}
