export interface SegmentationAddressConfig {
  readonly addressBits: number;
  readonly segmentBits: number;
}

export type SegmentationAddressStepKind =
  | 'initial'
  | 'segment-field'
  | 'offset-field'
  | 'capacity'
  | 'complete';

export interface SegmentationAddressStepState {
  readonly addressBits: number;
  readonly segmentBits: number;
  readonly offsetBits: number | null;
  readonly maxSegmentLengthBytes: number | null;
}

export interface SegmentationAddressStep {
  readonly id: string;
  readonly sequence: number;
  readonly kind: SegmentationAddressStepKind;
  readonly state: SegmentationAddressStepState;
  readonly label: string;
}

export interface SegmentationAddressResult {
  readonly addressBits: number;
  readonly segmentBits: number;
  readonly offsetBits: number;
  readonly maxSegmentLengthBytes: number;
}

export interface SegmentationAddressTrace {
  readonly steps: readonly SegmentationAddressStep[];
  readonly result: SegmentationAddressResult;
}

export const SEGMENTATION_MAX_ADDRESS_BITS = 53;

export const SEGMENTATION_Q27_PRESET = {
  sourceQuestionId: 'cn408-2009-q27',
  reviewStatus: 'needs-review',
  expectedAnswerOptionId: 'C',
  config: {
    addressBits: 32,
    segmentBits: 8,
  },
} as const satisfies {
  readonly sourceQuestionId: 'cn408-2009-q27';
  readonly reviewStatus: 'needs-review';
  readonly expectedAnswerOptionId: 'C';
  readonly config: SegmentationAddressConfig;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function assertAddressBits(value: unknown): asserts value is number {
  if (!Number.isSafeInteger(value) || (value as number) < 2 || (value as number) > SEGMENTATION_MAX_ADDRESS_BITS) {
    throw new RangeError(`addressBits must be a safe integer between 2 and ${SEGMENTATION_MAX_ADDRESS_BITS}`);
  }
}

function validateConfig(config: SegmentationAddressConfig): SegmentationAddressConfig {
  if (!isRecord(config)) throw new TypeError('segmentation address config must be an object');
  const keys = Object.keys(config);
  if (keys.length !== 2 || !keys.includes('addressBits') || !keys.includes('segmentBits')) {
    throw new TypeError('config must contain only addressBits and segmentBits');
  }
  assertAddressBits(config.addressBits);
  if (!Number.isSafeInteger(config.segmentBits) || config.segmentBits < 1 || config.segmentBits >= config.addressBits) {
    throw new RangeError(`segmentBits must be a safe integer between 1 and ${config.addressBits - 1}`);
  }
  return { addressBits: config.addressBits, segmentBits: config.segmentBits };
}

function snapshot(
  config: SegmentationAddressConfig,
  offsetBits: number | null = null,
  maxSegmentLengthBytes: number | null = null,
): SegmentationAddressStepState {
  return {
    addressBits: config.addressBits,
    segmentBits: config.segmentBits,
    offsetBits,
    maxSegmentLengthBytes,
  };
}

function step(
  sequence: number,
  kind: SegmentationAddressStepKind,
  label: string,
  state: SegmentationAddressStepState,
): SegmentationAddressStep {
  return { id: `segmentation-address-${sequence}`, sequence, kind, label, state: { ...state } };
}

export function traceSegmentationAddress(config: SegmentationAddressConfig): SegmentationAddressTrace {
  const normalized = validateConfig(config);
  const offsetBits = normalized.addressBits - normalized.segmentBits;
  const maxSegmentLengthBytes = 2 ** offsetBits;
  if (!Number.isSafeInteger(maxSegmentLengthBytes)) {
    throw new RangeError('maximum segment length must remain a safe integer');
  }

  const steps = [
    step(0, 'initial', '读取地址格式', snapshot(normalized)),
    step(1, 'segment-field', '划分段号字段', snapshot(normalized)),
    step(2, 'offset-field', '计算段内位移位数', snapshot(normalized, offsetBits)),
    step(3, 'capacity', '计算最大段长', snapshot(normalized, offsetBits, maxSegmentLengthBytes)),
    step(4, 'complete', '得到最大段长', snapshot(normalized, offsetBits, maxSegmentLengthBytes)),
  ];

  return {
    steps,
    result: {
      addressBits: normalized.addressBits,
      segmentBits: normalized.segmentBits,
      offsetBits,
      maxSegmentLengthBytes,
    },
  };
}
