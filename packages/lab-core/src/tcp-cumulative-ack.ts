/**
 * Q38 only needs the byte ranges of two consecutive, in-order TCP segments.
 * It deliberately does not model loss, retransmission, SACK blocks, windows,
 * or sequence-number wraparound.
 */
export const TCP_CUMULATIVE_ACK_MEANING = 'next-sequence-number' as const;

const TCP_SEQUENCE_SPACE = 2 ** 32;
const MAX_PAYLOAD_BYTES = 1_000_000;

export interface TcpCumulativeAckConfig {
  readonly firstSequenceNumber: number;
  readonly payloadLengths: readonly [number, number];
}

export interface TcpCumulativeAckSegment {
  readonly ordinal: 1 | 2;
  readonly sequenceStart: number;
  readonly sequenceEndExclusive: number;
  readonly payloadLength: number;
}

export type TcpCumulativeAckStepId =
  | 'initial'
  | 'segment-1'
  | 'segment-2'
  | 'cumulative-ack'
  | 'complete';

export interface TcpCumulativeAckStep {
  readonly id: TcpCumulativeAckStepId;
  readonly label: string;
  readonly operation: string;
  readonly result: string;
  readonly segment?: TcpCumulativeAckSegment;
  readonly ackNumber?: number;
}

export interface TcpCumulativeAckTrace {
  readonly ackMeaning: typeof TCP_CUMULATIVE_ACK_MEANING;
  readonly config: TcpCumulativeAckConfig;
  readonly segments: readonly [TcpCumulativeAckSegment, TcpCumulativeAckSegment];
  readonly totalPayloadBytes: number;
  readonly nextExpectedSequenceNumber: number;
  readonly steps: readonly TcpCumulativeAckStep[];
}

export const TCP_CUMULATIVE_ACK_Q38_PRESET = {
  sourceQuestionId: 'cn408-2009-q38',
  reviewStatus: 'needs-review',
  config: {
    firstSequenceNumber: 200,
    payloadLengths: [300, 500],
  },
} as const satisfies {
  readonly sourceQuestionId: 'cn408-2009-q38';
  readonly reviewStatus: 'needs-review';
  readonly config: TcpCumulativeAckConfig;
};

function validateConfig(config: TcpCumulativeAckConfig): TcpCumulativeAckConfig {
  if (typeof config !== 'object' || config === null || Array.isArray(config)) {
    throw new TypeError('TCP configuration must be an object');
  }
  if (!Number.isSafeInteger(config.firstSequenceNumber)
    || config.firstSequenceNumber < 0
    || config.firstSequenceNumber >= TCP_SEQUENCE_SPACE) {
    throw new RangeError('first sequence number must be within the non-wrapping TCP range');
  }
  if (!Array.isArray(config.payloadLengths) || config.payloadLengths.length !== 2) {
    throw new RangeError('TCP Q38 requires exactly two payload lengths');
  }
  for (const [index, payloadLength] of config.payloadLengths.entries()) {
    if (!Number.isSafeInteger(payloadLength)
      || payloadLength < 1
      || payloadLength > MAX_PAYLOAD_BYTES) {
      throw new RangeError(`payload ${index + 1} must be a positive safe integer within the visual range`);
    }
  }
  const totalPayloadBytes = config.payloadLengths[0] + config.payloadLengths[1];
  if (config.firstSequenceNumber + totalPayloadBytes > TCP_SEQUENCE_SPACE) {
    throw new RangeError('the two payloads exceed the non-wrapping TCP sequence range');
  }
  return {
    firstSequenceNumber: config.firstSequenceNumber,
    payloadLengths: [config.payloadLengths[0], config.payloadLengths[1]],
  };
}

function segment(
  ordinal: 1 | 2,
  sequenceStart: number,
  payloadLength: number,
): TcpCumulativeAckSegment {
  return {
    ordinal,
    sequenceStart,
    sequenceEndExclusive: sequenceStart + payloadLength,
    payloadLength,
  };
}

export function traceTcpCumulativeAck(config: TcpCumulativeAckConfig): TcpCumulativeAckTrace {
  const normalizedConfig = validateConfig(config);
  const first = segment(1, normalizedConfig.firstSequenceNumber, normalizedConfig.payloadLengths[0]);
  const second = segment(2, first.sequenceEndExclusive, normalizedConfig.payloadLengths[1]);
  const segments: readonly [TcpCumulativeAckSegment, TcpCumulativeAckSegment] = [first, second];
  const totalPayloadBytes = normalizedConfig.payloadLengths[0] + normalizedConfig.payloadLengths[1];
  const nextExpectedSequenceNumber = second.sequenceEndExclusive;

  const steps: readonly TcpCumulativeAckStep[] = [
    {
      id: 'initial',
      label: '读取连接与首段序号',
      operation: `SEQ₁=${normalizedConfig.firstSequenceNumber} · payloads=${normalizedConfig.payloadLengths.join(' + ')} B`,
      result: '等待两个按序到达的 TCP 段',
    },
    {
      id: 'segment-1',
      label: '展开第一个 TCP 段',
      operation: `SEQ ${first.sequenceStart} + ${first.payloadLength} B`,
      result: `覆盖 [${first.sequenceStart}, ${first.sequenceEndExclusive})，下一个期望序号 ${first.sequenceEndExclusive}`,
      segment: first,
    },
    {
      id: 'segment-2',
      label: '拼接第二个 TCP 段',
      operation: `SEQ ${second.sequenceStart} (= ${first.sequenceStart} + ${first.payloadLength}) + ${second.payloadLength} B`,
      result: `覆盖 [${second.sequenceStart}, ${second.sequenceEndExclusive})，保持连续按序到达`,
      segment: second,
    },
    {
      id: 'cumulative-ack',
      label: '计算累计确认号',
      operation: `ACK = ${normalizedConfig.firstSequenceNumber} + ${totalPayloadBytes}`,
      result: `ACK ${nextExpectedSequenceNumber} 表示下一个期望字节序号`,
      ackNumber: nextExpectedSequenceNumber,
    },
    {
      id: 'complete',
      label: '得到 Q38 确认结果',
      operation: '两个连续段均已按序接收',
      result: `发送累计 ACK ${nextExpectedSequenceNumber}；本题不产生 SACK 块`,
      ackNumber: nextExpectedSequenceNumber,
    },
  ];

  return {
    ackMeaning: TCP_CUMULATIVE_ACK_MEANING,
    config: normalizedConfig,
    segments,
    totalPayloadBytes,
    nextExpectedSequenceNumber,
    steps,
  };
}
