export type TcpCongestionModel = 'cn408-classic';

export type TcpCongestionPhase = 'slow-start' | 'congestion-avoidance';

export type TcpCongestionEvent =
  | { readonly type: 'rtt-acked' }
  | { readonly type: 'timeout' }
  | { readonly type: 'triple-duplicate-ack' };

export type TcpCongestionRule =
  | 'slow-start-double'
  | 'slow-start-reach-threshold'
  | 'congestion-avoidance-add-one'
  | 'timeout-reset'
  | 'triple-duplicate-fast-recovery';

export interface TcpCongestionConfig {
  readonly model: TcpCongestionModel;
  readonly initialCwndMss: number;
  readonly initialSsthreshMss: number;
}

export interface TcpCongestionState {
  readonly model: TcpCongestionModel;
  readonly phase: TcpCongestionPhase;
  readonly cwndMss: number;
  readonly ssthreshMss: number;
  readonly step: number;
}

export interface TcpCongestionTraceStep {
  readonly id: string;
  readonly event: TcpCongestionEvent;
  readonly rule: TcpCongestionRule;
  readonly before: TcpCongestionState;
  readonly after: TcpCongestionState;
}

export interface TcpCongestionSimulation {
  readonly model: TcpCongestionModel;
  readonly phase: TcpCongestionPhase;
  readonly cwndMss: number;
  readonly ssthreshMss: number;
  readonly initialState: TcpCongestionState;
  readonly finalState: TcpCongestionState;
  readonly trace: readonly TcpCongestionTraceStep[];
}

export interface TcpCongestionModelDescription {
  readonly id: TcpCongestionModel;
  readonly unit: 'integer MSS';
  readonly rttAcked: string;
  readonly timeout: string;
  readonly tripleDuplicateAck: string;
  readonly scope: string;
}

export const CN408_CLASSIC_TCP_MODEL: TcpCongestionModelDescription = {
  id: 'cn408-classic',
  unit: 'integer MSS',
  rttAcked: 'Slow start doubles cwnd up to ssthresh; congestion avoidance adds one MSS per fully acknowledged RTT.',
  timeout: 'Set ssthresh=max(1,floor(cwnd/2)), set cwnd=1 MSS, and enter slow start.',
  tripleDuplicateAck: 'Set ssthresh=max(1,floor(cwnd/2)), set cwnd=ssthresh, and enter congestion avoidance; no temporary +3 MSS inflation is modeled.',
  scope: 'Pedagogical cn408-classic abstraction; not a claim about every modern TCP implementation.',
};

const EVENT_TYPES = new Set<TcpCongestionEvent['type']>([
  'rtt-acked',
  'timeout',
  'triple-duplicate-ack',
]);

function assertModel(model: unknown): asserts model is TcpCongestionModel {
  if (model !== 'cn408-classic') {
    throw new RangeError(`Unsupported TCP congestion model: ${String(model)}.`);
  }
}

function assertPositiveSafeInteger(value: unknown, name: string): asserts value is number {
  if (!Number.isSafeInteger(value) || (value as number) < 1) {
    throw new RangeError(`${name} must be a positive safe integer measured in MSS.`);
  }
}

function assertState(state: TcpCongestionState): void {
  assertModel(state.model);
  assertPositiveSafeInteger(state.cwndMss, 'state.cwndMss');
  assertPositiveSafeInteger(state.ssthreshMss, 'state.ssthreshMss');
  if (state.phase !== 'slow-start' && state.phase !== 'congestion-avoidance') {
    throw new RangeError(`Unsupported TCP congestion phase: ${String(state.phase)}.`);
  }
  if (!Number.isSafeInteger(state.step) || state.step < 0) {
    throw new RangeError('state.step must be a non-negative safe integer.');
  }
}

function assertEvent(event: TcpCongestionEvent): void {
  if (!event || typeof event !== 'object' || !EVENT_TYPES.has(event.type)) {
    throw new RangeError(`Unsupported TCP congestion event: ${String((event as { type?: unknown } | null)?.type)}.`);
  }
}

function checkedDouble(value: number): number {
  const result = value * 2;
  if (!Number.isSafeInteger(result)) throw new RangeError('TCP congestion window overflowed the safe integer range.');
  return result;
}

function checkedIncrement(value: number): number {
  const result = value + 1;
  if (!Number.isSafeInteger(result)) throw new RangeError('TCP congestion window overflowed the safe integer range.');
  return result;
}

function lossThreshold(cwndMss: number): number {
  return Math.max(1, Math.floor(cwndMss / 2));
}

function snapshot(state: TcpCongestionState): TcpCongestionState {
  return { ...state };
}

export function createTcpCongestionState(config: TcpCongestionConfig): TcpCongestionState {
  assertModel(config.model);
  assertPositiveSafeInteger(config.initialCwndMss, 'initialCwndMss');
  assertPositiveSafeInteger(config.initialSsthreshMss, 'initialSsthreshMss');
  return {
    model: config.model,
    phase: config.initialCwndMss < config.initialSsthreshMss
      ? 'slow-start'
      : 'congestion-avoidance',
    cwndMss: config.initialCwndMss,
    ssthreshMss: config.initialSsthreshMss,
    step: 0,
  };
}

export function stepTcpCongestion(
  state: TcpCongestionState,
  event: TcpCongestionEvent,
): TcpCongestionTraceStep {
  assertState(state);
  assertEvent(event);

  const before = snapshot(state);
  let phase: TcpCongestionPhase;
  let cwndMss: number;
  let ssthreshMss = state.ssthreshMss;
  let rule: TcpCongestionRule;

  if (event.type === 'timeout') {
    ssthreshMss = lossThreshold(state.cwndMss);
    cwndMss = 1;
    phase = 'slow-start';
    rule = 'timeout-reset';
  } else if (event.type === 'triple-duplicate-ack') {
    ssthreshMss = lossThreshold(state.cwndMss);
    cwndMss = ssthreshMss;
    phase = 'congestion-avoidance';
    rule = 'triple-duplicate-fast-recovery';
  } else if (state.phase === 'slow-start' && state.cwndMss < state.ssthreshMss) {
    cwndMss = Math.min(checkedDouble(state.cwndMss), state.ssthreshMss);
    const reachedThreshold = cwndMss >= state.ssthreshMss;
    phase = reachedThreshold ? 'congestion-avoidance' : 'slow-start';
    rule = reachedThreshold ? 'slow-start-reach-threshold' : 'slow-start-double';
  } else {
    cwndMss = checkedIncrement(state.cwndMss);
    phase = 'congestion-avoidance';
    rule = 'congestion-avoidance-add-one';
  }

  const after: TcpCongestionState = {
    model: state.model,
    phase,
    cwndMss,
    ssthreshMss,
    step: state.step + 1,
  };
  assertState(after);

  return {
    id: `${state.step}-${event.type}`,
    event: { ...event },
    rule,
    before,
    after,
  };
}

export function simulateTcpCongestion(
  config: TcpCongestionConfig,
  events: readonly TcpCongestionEvent[],
): TcpCongestionSimulation {
  if (!Array.isArray(events)) throw new TypeError('TCP congestion events must be an array.');
  const initialState = createTcpCongestionState(config);
  const trace: TcpCongestionTraceStep[] = [];
  let state = initialState;

  for (const event of events) {
    const step = stepTcpCongestion(state, event);
    trace.push(step);
    state = step.after;
  }

  return {
    model: state.model,
    phase: state.phase,
    cwndMss: state.cwndMss,
    ssthreshMss: state.ssthreshMss,
    initialState,
    finalState: state,
    trace,
  };
}

export const TCP_Q39_PRESET = {
  id: 'cn408-2009-q39-timeout',
  reviewStatus: 'needs-review',
  mssKilobytes: 1,
  config: {
    model: 'cn408-classic',
    initialCwndMss: 16,
    initialSsthreshMss: 32,
  },
  events: [
    { type: 'timeout' },
    { type: 'rtt-acked' },
    { type: 'rtt-acked' },
    { type: 'rtt-acked' },
    { type: 'rtt-acked' },
  ],
  expected: {
    timeout: { cwndMss: 1, ssthreshMss: 8 },
    ackedRttCwndMss: [2, 4, 8, 9],
  },
} as const satisfies {
  readonly id: string;
  readonly reviewStatus: 'needs-review';
  readonly mssKilobytes: number;
  readonly config: TcpCongestionConfig;
  readonly events: readonly TcpCongestionEvent[];
  readonly expected: {
    readonly timeout: { readonly cwndMss: number; readonly ssthreshMss: number };
    readonly ackedRttCwndMss: readonly number[];
  };
};
