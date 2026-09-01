export interface BusBandwidthConfig {
  readonly bytesPerBusCycle: number;
  readonly clockCyclesPerBusCycle: number;
  readonly busFrequencyMHz: number;
}

export type BusBandwidthStepKind =
  | 'frequency-hz'
  | 'clock-period'
  | 'bus-cycle-duration'
  | 'bus-cycles-per-second'
  | 'bandwidth-bytes'
  | 'bandwidth-megabytes'
  | 'bandwidth-bits';

export interface BusBandwidthStep {
  readonly id: string;
  readonly kind: BusBandwidthStepKind;
  readonly label: string;
  readonly formula: string;
  readonly value: number;
  readonly unit: string;
}

export interface BusBandwidthAnalysis {
  readonly bytesPerMegabyte: 1_000_000;
  readonly bitsPerByte: 8;
  readonly clockFrequencyHz: number;
  readonly clockPeriodSeconds: number;
  readonly busCycleDurationSeconds: number;
  readonly busCyclesPerSecond: number;
  readonly bandwidthBytesPerSecond: number;
  readonly bandwidthMegabytesPerSecond: number;
  readonly bandwidthBitsPerSecond: number;
  readonly bandwidthMegabitsPerSecond: number;
}

export interface BusBandwidthTrace {
  readonly config: BusBandwidthConfig;
  readonly steps: readonly BusBandwidthStep[];
  readonly result: BusBandwidthAnalysis;
}

export type BusBandwidthErrorCode =
  | 'invalid-config'
  | 'invalid-bytes-per-cycle'
  | 'invalid-clock-cycles'
  | 'invalid-frequency'
  | 'arithmetic-overflow';

export interface BusBandwidthError {
  readonly code: BusBandwidthErrorCode;
  readonly message: string;
}

export type BusBandwidthCoreResult<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: BusBandwidthError };

const BYTES_PER_MEGABYTE = 1_000_000 as const;
const BITS_PER_BYTE = 8 as const;

function failure<T>(code: BusBandwidthErrorCode, message: string): BusBandwidthCoreResult<T> {
  return { ok: false, error: { code, message } };
}

function isSafePositiveInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value > 0;
}

function isFinitePositive(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0;
}

function compactNumber(value: number): string {
  return Number.isInteger(value) ? String(value) : String(Number(value.toPrecision(12)));
}

export function analyzeBusBandwidth(
  config: BusBandwidthConfig,
): BusBandwidthCoreResult<BusBandwidthTrace> {
  if (config === null || typeof config !== 'object' || Array.isArray(config)) {
    return failure('invalid-config', 'Bus bandwidth config must be an object.');
  }
  if (!isSafePositiveInteger(config.bytesPerBusCycle)) {
    return failure('invalid-bytes-per-cycle', 'Bytes per bus cycle must be a positive safe integer.');
  }
  if (!isSafePositiveInteger(config.clockCyclesPerBusCycle)) {
    return failure('invalid-clock-cycles', 'Clock cycles per bus cycle must be a positive safe integer.');
  }
  if (!isFinitePositive(config.busFrequencyMHz)) {
    return failure('invalid-frequency', 'Bus frequency must be a positive finite MHz value.');
  }

  const clockFrequencyHz = config.busFrequencyMHz * BYTES_PER_MEGABYTE;
  const clockPeriodSeconds = 1 / clockFrequencyHz;
  const busCycleDurationSeconds = config.clockCyclesPerBusCycle * clockPeriodSeconds;
  const busCyclesPerSecond = clockFrequencyHz / config.clockCyclesPerBusCycle;
  const bandwidthBytesPerSecond = config.bytesPerBusCycle * busCyclesPerSecond;
  const bandwidthMegabytesPerSecond = bandwidthBytesPerSecond / BYTES_PER_MEGABYTE;
  const bandwidthBitsPerSecond = bandwidthBytesPerSecond * BITS_PER_BYTE;
  const bandwidthMegabitsPerSecond = bandwidthBitsPerSecond / BYTES_PER_MEGABYTE;
  const derivedValues = [
    clockFrequencyHz,
    clockPeriodSeconds,
    busCycleDurationSeconds,
    busCyclesPerSecond,
    bandwidthBytesPerSecond,
    bandwidthMegabytesPerSecond,
    bandwidthBitsPerSecond,
    bandwidthMegabitsPerSecond,
  ];
  if (derivedValues.some((value) => !Number.isFinite(value) || value <= 0)) {
    return failure('arithmetic-overflow', 'The derived bus bandwidth exceeds finite numeric bounds.');
  }

  const result: BusBandwidthAnalysis = {
    bytesPerMegabyte: BYTES_PER_MEGABYTE,
    bitsPerByte: BITS_PER_BYTE,
    clockFrequencyHz,
    clockPeriodSeconds,
    busCycleDurationSeconds,
    busCyclesPerSecond,
    bandwidthBytesPerSecond,
    bandwidthMegabytesPerSecond,
    bandwidthBitsPerSecond,
    bandwidthMegabitsPerSecond,
  };
  const steps: BusBandwidthStep[] = [
    {
      id: 'bus-bandwidth-1',
      kind: 'frequency-hz',
      label: '把总线频率换算为 Hz',
      formula: `${compactNumber(config.busFrequencyMHz)} MHz x 1,000,000`,
      value: clockFrequencyHz,
      unit: 'Hz',
    },
    {
      id: 'bus-bandwidth-2',
      kind: 'clock-period',
      label: '计算一个时钟周期',
      formula: `1 / ${compactNumber(clockFrequencyHz)} Hz`,
      value: clockPeriodSeconds,
      unit: 's',
    },
    {
      id: 'bus-bandwidth-3',
      kind: 'bus-cycle-duration',
      label: '计算一个总线周期',
      formula: `${config.clockCyclesPerBusCycle} clocks x ${compactNumber(clockPeriodSeconds)} s`,
      value: busCycleDurationSeconds,
      unit: 's',
    },
    {
      id: 'bus-bandwidth-4',
      kind: 'bus-cycles-per-second',
      label: '计算每秒总线周期数',
      formula: `${compactNumber(clockFrequencyHz)} Hz / ${config.clockCyclesPerBusCycle} clocks`,
      value: busCyclesPerSecond,
      unit: 'bus cycles/s',
    },
    {
      id: 'bus-bandwidth-5',
      kind: 'bandwidth-bytes',
      label: '计算每秒传输字节数',
      formula: `${config.bytesPerBusCycle} B x ${compactNumber(busCyclesPerSecond)} cycles/s`,
      value: bandwidthBytesPerSecond,
      unit: 'B/s',
    },
    {
      id: 'bus-bandwidth-6',
      kind: 'bandwidth-megabytes',
      label: '换算十进制 MB/s',
      formula: `${compactNumber(bandwidthBytesPerSecond)} B/s / 1,000,000`,
      value: bandwidthMegabytesPerSecond,
      unit: 'MB/s',
    },
    {
      id: 'bus-bandwidth-7',
      kind: 'bandwidth-bits',
      label: '换算 bit/s 与 Mbit/s',
      formula: `${compactNumber(bandwidthBytesPerSecond)} B/s x 8`,
      value: bandwidthBitsPerSecond,
      unit: 'bit/s',
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

export const BUS_BANDWIDTH_Q20_PRESET = {
  id: 'cn408-2009-q20',
  sourceQuestionId: 'cn408-2009-q20',
  reviewStatus: 'needs-review',
  config: {
    bytesPerBusCycle: 4,
    clockCyclesPerBusCycle: 2,
    busFrequencyMHz: 10,
  },
} as const satisfies {
  readonly id: string;
  readonly sourceQuestionId: string;
  readonly reviewStatus: 'needs-review';
  readonly config: BusBandwidthConfig;
};
