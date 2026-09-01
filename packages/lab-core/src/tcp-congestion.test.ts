import { describe, expect, it } from 'vitest';

import {
  CN408_CLASSIC_TCP_MODEL,
  TCP_Q39_PRESET,
  createTcpCongestionState,
  simulateTcpCongestion,
  stepTcpCongestion,
  type TcpCongestionConfig,
  type TcpCongestionEvent,
} from './tcp-congestion';

const classicConfig: TcpCongestionConfig = {
  model: 'cn408-classic',
  initialCwndMss: 1,
  initialSsthreshMss: 8,
};

describe('Q39 classic congestion-control preset', () => {
  it('halves 16 KB to an 8 MSS threshold, resets to one MSS, then grows 2, 4, 8, 9', () => {
    const simulation = simulateTcpCongestion(TCP_Q39_PRESET.config, TCP_Q39_PRESET.events);

    expect(TCP_Q39_PRESET.mssKilobytes).toBe(1);
    expect(simulation.trace.map((step) => ({
      event: step.event.type,
      phase: step.after.phase,
      cwndMss: step.after.cwndMss,
      ssthreshMss: step.after.ssthreshMss,
    }))).toEqual([
      { event: 'timeout', phase: 'slow-start', cwndMss: 1, ssthreshMss: 8 },
      { event: 'rtt-acked', phase: 'slow-start', cwndMss: 2, ssthreshMss: 8 },
      { event: 'rtt-acked', phase: 'slow-start', cwndMss: 4, ssthreshMss: 8 },
      { event: 'rtt-acked', phase: 'congestion-avoidance', cwndMss: 8, ssthreshMss: 8 },
      { event: 'rtt-acked', phase: 'congestion-avoidance', cwndMss: 9, ssthreshMss: 8 },
    ]);
    expect(simulation).toMatchObject({
      phase: 'congestion-avoidance',
      cwndMss: 9,
      ssthreshMss: 8,
    });
    expect(TCP_Q39_PRESET.expected).toEqual({
      timeout: { cwndMss: 1, ssthreshMss: 8 },
      ackedRttCwndMss: [2, 4, 8, 9],
    });
  });
});

describe('cn408-classic TCP congestion state machine', () => {
  it('switches from exponential slow start to additive congestion avoidance at ssthresh', () => {
    const result = simulateTcpCongestion(classicConfig, [
      { type: 'rtt-acked' },
      { type: 'rtt-acked' },
      { type: 'rtt-acked' },
      { type: 'rtt-acked' },
    ]);

    expect(result.trace.map((step) => step.rule)).toEqual([
      'slow-start-double',
      'slow-start-double',
      'slow-start-reach-threshold',
      'congestion-avoidance-add-one',
    ]);
    expect(result.trace.map((step) => step.after.cwndMss)).toEqual([2, 4, 8, 9]);
  });

  it('uses integer floor-halving on timeout and records before/after snapshots', () => {
    const initial = createTcpCongestionState({
      model: 'cn408-classic',
      initialCwndMss: 15,
      initialSsthreshMss: 20,
    });
    const step = stepTcpCongestion(initial, { type: 'timeout' });

    expect(step).toMatchObject({
      id: '0-timeout',
      rule: 'timeout-reset',
      before: { phase: 'slow-start', cwndMss: 15, ssthreshMss: 20, step: 0 },
      after: { phase: 'slow-start', cwndMss: 1, ssthreshMss: 7, step: 1 },
    });
    expect(initial).toEqual({
      model: 'cn408-classic',
      phase: 'slow-start',
      cwndMss: 15,
      ssthreshMss: 20,
      step: 0,
    });
  });

  it('models triple duplicate ACK separately from timeout without transient Reno inflation', () => {
    const state = createTcpCongestionState({
      model: 'cn408-classic',
      initialCwndMss: 16,
      initialSsthreshMss: 8,
    });

    const duplicateAck = stepTcpCongestion(state, { type: 'triple-duplicate-ack' });
    const timeout = stepTcpCongestion(state, { type: 'timeout' });

    expect(duplicateAck).toMatchObject({
      rule: 'triple-duplicate-fast-recovery',
      after: { phase: 'congestion-avoidance', cwndMss: 8, ssthreshMss: 8 },
    });
    expect(timeout.after).toMatchObject({ phase: 'slow-start', cwndMss: 1, ssthreshMss: 8 });
    expect(CN408_CLASSIC_TCP_MODEL.tripleDuplicateAck).toContain('no temporary +3 MSS');
    expect(CN408_CLASSIC_TCP_MODEL.scope).toContain('not a claim about every modern TCP');
  });

  it('caps a slow-start RTT at a non-power-of-two threshold before additive growth', () => {
    const result = simulateTcpCongestion({
      model: 'cn408-classic',
      initialCwndMss: 6,
      initialSsthreshMss: 10,
    }, [{ type: 'rtt-acked' }, { type: 'rtt-acked' }]);

    expect(result.trace.map((step) => step.after.cwndMss)).toEqual([10, 11]);
    expect(result.trace.map((step) => step.after.phase)).toEqual([
      'congestion-avoidance',
      'congestion-avoidance',
    ]);
  });

  it('is deterministic and does not mutate caller-owned events', () => {
    const events: TcpCongestionEvent[] = [
      { type: 'rtt-acked' },
      { type: 'timeout' },
      { type: 'rtt-acked' },
      { type: 'triple-duplicate-ack' },
    ];
    const snapshot = structuredClone(events);

    const first = simulateTcpCongestion(classicConfig, events);
    const second = simulateTcpCongestion(classicConfig, events);

    expect(second).toEqual(first);
    expect(events).toEqual(snapshot);
    expect(first.initialState).toEqual(createTcpCongestionState(classicConfig));
    expect(first.finalState).toEqual(first.trace.at(-1)?.after);
  });
});

describe('TCP congestion input validation', () => {
  it.each([0, -1, 1.5, Number.NaN, Number.POSITIVE_INFINITY, Number.MAX_SAFE_INTEGER + 1])(
    'rejects invalid MSS window value %s',
    (value) => {
      expect(() => createTcpCongestionState({
        model: 'cn408-classic',
        initialCwndMss: value,
        initialSsthreshMss: 8,
      })).toThrow(/initialCwndMss/u);
      expect(() => createTcpCongestionState({
        model: 'cn408-classic',
        initialCwndMss: 1,
        initialSsthreshMss: value,
      })).toThrow(/initialSsthreshMss/u);
    },
  );

  it('rejects unknown models and events before returning a partial trace', () => {
    expect(() => createTcpCongestionState({
      model: 'reno' as 'cn408-classic',
      initialCwndMss: 1,
      initialSsthreshMss: 8,
    })).toThrow(/model/u);
    expect(() => simulateTcpCongestion(classicConfig, [
      { type: 'cubic-update' } as unknown as TcpCongestionEvent,
    ])).toThrow(/event/u);
  });

  it('rejects arithmetic overflow instead of returning a non-integer window', () => {
    const state = createTcpCongestionState({
      model: 'cn408-classic',
      initialCwndMss: Number.MAX_SAFE_INTEGER,
      initialSsthreshMss: 1,
    });

    expect(() => stepTcpCongestion(state, { type: 'rtt-acked' })).toThrow(/safe integer|overflow/iu);
  });
});
