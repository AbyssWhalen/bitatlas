import { describe, expect, it } from 'vitest';
import {
  createGbnState,
  GBN_ACK_MEANING,
  GBN_Q35_PRESET,
  simulateGbn,
  stepGbn,
  type GbnAction,
  type GbnConfig,
} from './gbn';

const config: GbnConfig = { sequenceSpace: 8, windowSize: 4, initialSequenceNumber: 0 };

function run(actions: readonly GbnAction[], inputConfig: GbnConfig = config) {
  return simulateGbn(inputConfig, actions);
}

describe('Go-Back-N state machine', () => {
  it('defines ACK as the last correctly received frame number', () => {
    expect(GBN_ACK_MEANING).toBe('last-correctly-received-frame');

    const trace = run([
      { type: 'frame-arrive', sequenceNumber: 0 },
      { type: 'frame-arrive', sequenceNumber: 2 },
      { type: 'frame-arrive', sequenceNumber: 1 },
    ]);

    expect(trace.steps.map((step) => ({
      outcome: step.event.outcome,
      ack: step.event.generatedAckNumber,
      expected: step.state.receiverExpected,
    }))).toEqual([
      { outcome: 'frame-accepted', ack: 0, expected: 1 },
      { outcome: 'frame-discarded', ack: 0, expected: 1 },
      { outcome: 'frame-accepted', ack: 1, expected: 2 },
    ]);
  });

  it('enforces the sender window and gives the oldest unacknowledged frame the timer', () => {
    const trace = run([
      { type: 'send' },
      { type: 'send' },
      { type: 'send' },
      { type: 'send' },
      { type: 'send' },
    ]);

    expect(trace.steps.at(-1)?.event.outcome).toBe('window-full');
    expect(trace.finalState).toEqual({
      base: 0,
      nextSeq: 4,
      receiverExpected: 0,
      inFlight: [0, 1, 2, 3],
      timerOwner: 0,
    });
  });

  it('advances cumulatively through the ACK number and moves the single timer', () => {
    const trace = run([
      { type: 'send' },
      { type: 'send' },
      { type: 'send' },
      { type: 'send' },
      { type: 'ack-arrive', ackNumber: 1 },
      { type: 'ack-arrive', ackNumber: 3 },
    ]);
    const firstAck = trace.steps[4]!;
    const secondAck = trace.steps[5]!;

    expect(firstAck.event).toMatchObject({
      outcome: 'ack-advanced',
      acknowledgedSequenceNumbers: [0, 1],
    });
    expect(firstAck.state).toMatchObject({ base: 2, nextSeq: 4, inFlight: [2, 3], timerOwner: 2 });
    expect(secondAck.event).toMatchObject({
      outcome: 'ack-advanced',
      acknowledgedSequenceNumbers: [2, 3],
    });
    expect(secondAck.state).toMatchObject({ base: 4, nextSeq: 4, inFlight: [], timerOwner: null });
  });

  it('keeps sender and receiver state unchanged when a frame or ACK is dropped', () => {
    const trace = run([
      { type: 'send' },
      { type: 'drop-frame', sequenceNumber: 0 },
      { type: 'drop-ack', ackNumber: 7 },
    ]);

    expect(trace.steps[1]!.event.outcome).toBe('frame-dropped');
    expect(trace.steps[2]!.event.outcome).toBe('ack-dropped');
    expect(trace.finalState).toEqual(trace.steps[0]!.state);
  });

  it('retransmits every outstanding frame from base on timeout', () => {
    const trace = run([
      { type: 'send' },
      { type: 'send' },
      { type: 'send' },
      { type: 'ack-arrive', ackNumber: 0 },
      { type: 'timeout' },
    ]);
    const timeout = trace.steps.at(-1)!;

    expect(timeout.event).toMatchObject({
      outcome: 'retransmitted',
      transmittedSequenceNumbers: [1, 2],
    });
    expect(timeout.state).toMatchObject({ base: 1, inFlight: [1, 2], timerOwner: 1 });
  });

  it('handles sequence-number wrap while preserving cumulative ACK order', () => {
    const wrapConfig: GbnConfig = { sequenceSpace: 8, windowSize: 4, initialSequenceNumber: 6 };
    const trace = run([
      { type: 'send' },
      { type: 'send' },
      { type: 'send' },
      { type: 'send' },
      { type: 'ack-arrive', ackNumber: 7 },
      { type: 'send' },
      { type: 'send' },
      { type: 'ack-arrive', ackNumber: 1 },
      { type: 'frame-arrive', sequenceNumber: 6 },
      { type: 'frame-arrive', sequenceNumber: 7 },
      { type: 'frame-arrive', sequenceNumber: 0 },
    ], wrapConfig);

    expect(trace.steps[3]!.state).toMatchObject({
      base: 6,
      nextSeq: 2,
      inFlight: [6, 7, 0, 1],
      timerOwner: 6,
    });
    expect(trace.steps[4]!.event.acknowledgedSequenceNumbers).toEqual([6, 7]);
    expect(trace.steps[4]!.state).toMatchObject({ base: 0, inFlight: [0, 1], timerOwner: 0 });
    expect(trace.steps.slice(-3).map((step) => step.event.generatedAckNumber)).toEqual([6, 7, 0]);
    expect(trace.finalState).toMatchObject({
      base: 2,
      nextSeq: 4,
      receiverExpected: 1,
      inFlight: [2, 3],
      timerOwner: 2,
    });
  });

  it('replays the Q35 ACK3 timeout scenario as retransmission of 4, 5, 6, 7', () => {
    const first = simulateGbn(GBN_Q35_PRESET.config, GBN_Q35_PRESET.actions);
    const second = simulateGbn(GBN_Q35_PRESET.config, GBN_Q35_PRESET.actions);
    const ack3 = first.steps.find((step) => step.action.type === 'ack-arrive' && step.action.ackNumber === 3)!;
    const timeout = first.steps.at(-1)!;

    expect(first).toEqual(second);
    expect(ack3.event.acknowledgedSequenceNumbers).toEqual([0, 1, 2, 3]);
    expect(timeout.action).toEqual({ type: 'timeout' });
    expect(timeout.event.transmittedSequenceNumbers).toEqual([4, 5, 6, 7]);
    expect(timeout.state).toMatchObject({ base: 4, nextSeq: 0, inFlight: [4, 5, 6, 7], timerOwner: 4 });
    expect(timeout.event.transmittedSequenceNumbers).toEqual(GBN_Q35_PRESET.expectedTimeoutRetransmission);
  });

  it('rejects invalid configurations, actions, and corrupted state invariants', () => {
    expect(() => createGbnState({ sequenceSpace: 1, windowSize: 1 })).toThrow(/sequence space/iu);
    expect(() => createGbnState({ sequenceSpace: 8, windowSize: 8 })).toThrow(/window size/iu);
    expect(() => stepGbn(config, createGbnState(config), {
      type: 'ack-arrive',
      ackNumber: 8,
    })).toThrow(/ack number/iu);
    expect(() => stepGbn(config, {
      base: 0,
      nextSeq: 3,
      receiverExpected: 0,
      inFlight: [0, 2],
      timerOwner: 0,
    }, { type: 'timeout' })).toThrow(/consecutive/iu);
  });
});
