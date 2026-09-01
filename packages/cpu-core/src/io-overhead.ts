export interface IoOverheadConfig {
  readonly cpuFrequencyMHz: number;
  readonly cpi: number;
  readonly interruptDataRateMBps: number;
  readonly interruptTransferBits: number;
  readonly interruptServiceInstructions: number;
  readonly interruptOtherInstructions: number;
  readonly dmaDataRateMBps: number;
  readonly dmaBlockBytes: number;
  readonly dmaCpuOverheadCyclesPerBlock: number;
}

export type IoOverheadStepKind =
  | 'cpu-budget'
  | 'interrupt-cycles-per-transfer'
  | 'interrupt-transfers-per-second'
  | 'interrupt-utilization'
  | 'dma-transfers-per-second'
  | 'dma-cycles-per-second'
  | 'dma-utilization';

export interface IoOverheadStep {
  readonly id: string;
  readonly kind: IoOverheadStepKind;
  readonly mode: 'shared' | 'interrupt' | 'dma';
  readonly label: string;
  readonly formula: string;
  readonly value: number;
  readonly unit: string;
}

export interface IoOverheadMethodResult {
  readonly cpuCyclesPerSecond: number;
  readonly utilizationPercent: number;
  readonly sustainable: boolean;
}

export interface InterruptOverheadResult extends IoOverheadMethodResult {
  readonly transferBytes: number;
  readonly cyclesPerTransfer: number;
  readonly transfersPerSecond: number;
}

export interface DmaOverheadResult extends IoOverheadMethodResult {
  readonly transfersPerSecond: number;
}

export interface IoOverheadAnalysis {
  readonly bytesPerMegabyte: 1_000_000;
  readonly cpuCyclesPerSecond: number;
  readonly interrupt: InterruptOverheadResult;
  readonly dma: DmaOverheadResult;
  readonly absoluteUtilizationReductionPoints: number;
  readonly relativeCpuReductionPercent: number | null;
}

export interface IoOverheadTrace {
  readonly config: IoOverheadConfig;
  readonly steps: readonly IoOverheadStep[];
  readonly result: IoOverheadAnalysis;
}

export type IoOverheadErrorCode =
  | 'invalid-cpu-frequency'
  | 'invalid-cpi'
  | 'invalid-interrupt-rate'
  | 'invalid-interrupt-transfer-size'
  | 'invalid-interrupt-instructions'
  | 'invalid-dma-rate'
  | 'invalid-dma-block-size'
  | 'invalid-dma-overhead'
  | 'arithmetic-overflow';

export interface IoOverheadError {
  readonly code: IoOverheadErrorCode;
  readonly message: string;
}

export type IoOverheadCoreResult<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: IoOverheadError };

const BYTES_PER_MEGABYTE = 1_000_000 as const;
const CAPACITY_EPSILON_PERCENT = Number.EPSILON * 1_024;

function failure<T>(code: IoOverheadErrorCode, message: string): IoOverheadCoreResult<T> {
  return { ok: false, error: { code, message } };
}

function isFinitePositive(value: number): boolean {
  return Number.isFinite(value) && value > 0;
}

function isFiniteNonNegative(value: number): boolean {
  return Number.isFinite(value) && value >= 0;
}

function isSafePositiveInteger(value: number): boolean {
  return Number.isSafeInteger(value) && value > 0;
}

function isSafeNonNegativeInteger(value: number): boolean {
  return Number.isSafeInteger(value) && value >= 0;
}

function compactNumber(value: number): string {
  return Number.isInteger(value) ? String(value) : String(Number(value.toPrecision(12)));
}

function isSustainable(utilizationPercent: number): boolean {
  return utilizationPercent <= 100 + CAPACITY_EPSILON_PERCENT;
}

export function analyzeIoOverhead(config: IoOverheadConfig): IoOverheadCoreResult<IoOverheadTrace> {
  if (!isFinitePositive(config.cpuFrequencyMHz)) {
    return failure('invalid-cpu-frequency', 'CPU frequency must be a positive finite MHz value.');
  }
  if (!isFinitePositive(config.cpi)) {
    return failure('invalid-cpi', 'CPI must be a positive finite value.');
  }
  if (!isFiniteNonNegative(config.interruptDataRateMBps)) {
    return failure('invalid-interrupt-rate', 'Interrupt data rate must be a non-negative finite MB/s value.');
  }
  if (!isSafePositiveInteger(config.interruptTransferBits) || config.interruptTransferBits % 8 !== 0) {
    return failure('invalid-interrupt-transfer-size', 'Interrupt transfer size must be a positive byte-aligned bit count.');
  }
  if (
    !isSafeNonNegativeInteger(config.interruptServiceInstructions)
    || !isSafeNonNegativeInteger(config.interruptOtherInstructions)
    || !Number.isSafeInteger(config.interruptServiceInstructions + config.interruptOtherInstructions)
  ) {
    return failure('invalid-interrupt-instructions', 'Interrupt instruction counts must be non-negative safe integers.');
  }
  if (!isFiniteNonNegative(config.dmaDataRateMBps)) {
    return failure('invalid-dma-rate', 'DMA data rate must be a non-negative finite MB/s value.');
  }
  if (!isSafePositiveInteger(config.dmaBlockBytes)) {
    return failure('invalid-dma-block-size', 'DMA block size must be a positive safe integer byte count.');
  }
  if (!isSafeNonNegativeInteger(config.dmaCpuOverheadCyclesPerBlock)) {
    return failure('invalid-dma-overhead', 'DMA CPU overhead must be a non-negative safe integer cycle count.');
  }

  const cpuCyclesPerSecond = config.cpuFrequencyMHz * 1_000_000;
  const interruptTransferBytes = config.interruptTransferBits / 8;
  const interruptInstructions = config.interruptServiceInstructions + config.interruptOtherInstructions;
  const interruptCyclesPerTransfer = interruptInstructions * config.cpi;
  const interruptTransfersPerSecond = config.interruptDataRateMBps * BYTES_PER_MEGABYTE / interruptTransferBytes;
  const interruptCpuCyclesPerSecond = interruptTransfersPerSecond * interruptCyclesPerTransfer;
  const interruptUtilizationPercent = interruptCpuCyclesPerSecond / cpuCyclesPerSecond * 100;
  const dmaTransfersPerSecond = config.dmaDataRateMBps * BYTES_PER_MEGABYTE / config.dmaBlockBytes;
  const dmaCpuCyclesPerSecond = dmaTransfersPerSecond * config.dmaCpuOverheadCyclesPerBlock;
  const dmaUtilizationPercent = dmaCpuCyclesPerSecond / cpuCyclesPerSecond * 100;
  const absoluteUtilizationReductionPoints = interruptUtilizationPercent - dmaUtilizationPercent;
  const relativeCpuReductionPercent = interruptUtilizationPercent === 0
    ? null
    : absoluteUtilizationReductionPoints / interruptUtilizationPercent * 100;
  const derivedValues = [
    cpuCyclesPerSecond,
    interruptTransferBytes,
    interruptCyclesPerTransfer,
    interruptTransfersPerSecond,
    interruptCpuCyclesPerSecond,
    interruptUtilizationPercent,
    dmaTransfersPerSecond,
    dmaCpuCyclesPerSecond,
    dmaUtilizationPercent,
    absoluteUtilizationReductionPoints,
    relativeCpuReductionPercent ?? 0,
  ];
  if (derivedValues.some((value) => !Number.isFinite(value))) {
    return failure('arithmetic-overflow', 'The derived I/O overhead exceeds finite numeric bounds.');
  }

  const result: IoOverheadAnalysis = {
    bytesPerMegabyte: BYTES_PER_MEGABYTE,
    cpuCyclesPerSecond,
    interrupt: {
      transferBytes: interruptTransferBytes,
      cyclesPerTransfer: interruptCyclesPerTransfer,
      transfersPerSecond: interruptTransfersPerSecond,
      cpuCyclesPerSecond: interruptCpuCyclesPerSecond,
      utilizationPercent: interruptUtilizationPercent,
      sustainable: isSustainable(interruptUtilizationPercent),
    },
    dma: {
      transfersPerSecond: dmaTransfersPerSecond,
      cpuCyclesPerSecond: dmaCpuCyclesPerSecond,
      utilizationPercent: dmaUtilizationPercent,
      sustainable: isSustainable(dmaUtilizationPercent),
    },
    absoluteUtilizationReductionPoints,
    relativeCpuReductionPercent,
  };
  const steps: IoOverheadStep[] = [
    {
      id: 'io-overhead-1',
      kind: 'cpu-budget',
      mode: 'shared',
      label: '换算每秒 CPU 时钟预算',
      formula: `${compactNumber(config.cpuFrequencyMHz)} MHz x 1,000,000`,
      value: cpuCyclesPerSecond,
      unit: 'cycles/s',
    },
    {
      id: 'io-overhead-2',
      kind: 'interrupt-cycles-per-transfer',
      mode: 'interrupt',
      label: '计算每次中断的 CPU 开销',
      formula: `(${config.interruptServiceInstructions} + ${config.interruptOtherInstructions}) instructions x ${compactNumber(config.cpi)} CPI`,
      value: interruptCyclesPerTransfer,
      unit: 'cycles/interrupt',
    },
    {
      id: 'io-overhead-3',
      kind: 'interrupt-transfers-per-second',
      mode: 'interrupt',
      label: '计算每秒中断次数',
      formula: `${compactNumber(config.interruptDataRateMBps)} MB/s x 1,000,000 / ${compactNumber(interruptTransferBytes)} B`,
      value: interruptTransfersPerSecond,
      unit: 'interrupts/s',
    },
    {
      id: 'io-overhead-4',
      kind: 'interrupt-utilization',
      mode: 'interrupt',
      label: '计算中断方式 CPU 占用',
      formula: `${compactNumber(interruptTransfersPerSecond)} x ${compactNumber(interruptCyclesPerTransfer)} / ${compactNumber(cpuCyclesPerSecond)} x 100%`,
      value: interruptUtilizationPercent,
      unit: '%',
    },
    {
      id: 'io-overhead-5',
      kind: 'dma-transfers-per-second',
      mode: 'dma',
      label: '计算每秒 DMA 块数',
      formula: `${compactNumber(config.dmaDataRateMBps)} MB/s x 1,000,000 / ${config.dmaBlockBytes} B`,
      value: dmaTransfersPerSecond,
      unit: 'blocks/s',
    },
    {
      id: 'io-overhead-6',
      kind: 'dma-cycles-per-second',
      mode: 'dma',
      label: '计算 DMA 每秒 CPU 开销',
      formula: `${compactNumber(dmaTransfersPerSecond)} x ${config.dmaCpuOverheadCyclesPerBlock} cycles`,
      value: dmaCpuCyclesPerSecond,
      unit: 'cycles/s',
    },
    {
      id: 'io-overhead-7',
      kind: 'dma-utilization',
      mode: 'dma',
      label: '计算 DMA 方式 CPU 占用',
      formula: `${compactNumber(dmaCpuCyclesPerSecond)} / ${compactNumber(cpuCyclesPerSecond)} x 100%`,
      value: dmaUtilizationPercent,
      unit: '%',
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

export const IO_OVERHEAD_Q43_PRESET = {
  id: 'cn408-2009-q43',
  sourceQuestionId: 'cn408-2009-q43',
  reviewStatus: 'needs-review',
  config: {
    cpuFrequencyMHz: 500,
    cpi: 5,
    interruptDataRateMBps: 0.5,
    interruptTransferBits: 32,
    interruptServiceInstructions: 18,
    interruptOtherInstructions: 2,
    dmaDataRateMBps: 5,
    dmaBlockBytes: 5_000,
    dmaCpuOverheadCyclesPerBlock: 500,
  },
} as const satisfies {
  readonly id: string;
  readonly sourceQuestionId: string;
  readonly reviewStatus: 'needs-review';
  readonly config: IoOverheadConfig;
};
