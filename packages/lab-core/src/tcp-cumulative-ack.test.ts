import { describe, expect, it } from 'vitest';
import {
  TCP_CUMULATIVE_ACK_Q38_PRESET,
  TCP_CUMULATIVE_ACK_MEANING,
  traceTcpCumulativeAck,
  type TcpCumulativeAckConfig,
} from './tcp-cumulative-ack';

describe('TCP cumulative ACK derivation', () => {
  it('replays Q38 as two contiguous byte ranges ending at ACK 1000', () => {
    const trace = traceTcpCumulativeAck(TCP_CUMULATIVE_ACK_Q38_PRESET.config);

    expect(trace.ackMeaning).toBe(TCP_CUMULATIVE_ACK_MEANING);
    expect(trace.segments).toEqual([
      {
        ordinal: 1,
        sequenceStart: 200,
        sequenceEndExclusive: 500,
        payloadLength: 300,
      },
      {
        ordinal: 2,
        sequenceStart: 500,
        sequenceEndExclusive: 1000,
        payloadLength: 500,
      },
    ]);
    expect(trace.nextExpectedSequenceNumber).toBe(1000);
    expect(trace.totalPayloadBytes).toBe(800);
    expect(trace.steps.map((step) => step.id)).toEqual([
      'initial',
      'segment-1',
      'segment-2',
      'cumulative-ack',
      'complete',
    ]);
    expect(trace.steps.at(-1)?.result).toContain('ACK 1000');
  });

  it('keeps custom two-segment inputs deterministic and isolated', () => {
    const payloadLengths: [number, number] = [4, 6];
    const config: TcpCumulativeAckConfig = {
      firstSequenceNumber: 10,
      payloadLengths,
    };
    const trace = traceTcpCumulativeAck(config);
    payloadLengths[0] = 999;

    expect(trace.nextExpectedSequenceNumber).toBe(20);
    expect(trace.segments[0]?.payloadLength).toBe(4);
    expect(trace.steps[2]?.operation).toContain('10 + 4');
  });

  it('rejects malformed or wrapping ranges instead of inventing a TCP state', () => {
    expect(() => traceTcpCumulativeAck({ firstSequenceNumber: -1, payloadLengths: [300, 500] })).toThrow(/sequence/i);
    expect(() => traceTcpCumulativeAck({ firstSequenceNumber: 200, payloadLengths: [300] as unknown as [number, number] })).toThrow(/two/i);
    expect(() => traceTcpCumulativeAck({ firstSequenceNumber: Number.MAX_SAFE_INTEGER, payloadLengths: [1, 1] })).toThrow(/range/i);
    expect(() => traceTcpCumulativeAck({ firstSequenceNumber: 200, payloadLengths: [0, 500] })).toThrow(/payload/i);
  });
});
