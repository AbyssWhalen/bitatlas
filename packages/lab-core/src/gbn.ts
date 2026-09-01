/** An ACK carries the sequence number of the last frame accepted in order. */
export const GBN_ACK_MEANING = 'last-correctly-received-frame' as const;

export interface GbnConfig {
  readonly sequenceSpace: number;
  readonly windowSize: number;
  readonly initialSequenceNumber?: number;
}

export interface GbnState {
  readonly base: number;
  readonly nextSeq: number;
  readonly receiverExpected: number;
  readonly inFlight: readonly number[];
  readonly timerOwner: number | null;
}

export type GbnAction =
  | { readonly type: 'send' }
  | { readonly type: 'frame-arrive'; readonly sequenceNumber: number }
  | { readonly type: 'ack-arrive'; readonly ackNumber: number }
  | { readonly type: 'drop-frame'; readonly sequenceNumber: number }
  | { readonly type: 'drop-ack'; readonly ackNumber: number }
  | { readonly type: 'timeout' };

export type GbnEventOutcome =
  | 'sent'
  | 'window-full'
  | 'frame-accepted'
  | 'frame-discarded'
  | 'ack-advanced'
  | 'ack-ignored'
  | 'frame-dropped'
  | 'ack-dropped'
  | 'retransmitted'
  | 'timeout-idle';

export interface GbnEvent {
  readonly outcome: GbnEventOutcome;
  readonly transmittedSequenceNumbers: readonly number[];
  readonly acknowledgedSequenceNumbers: readonly number[];
  readonly generatedAckNumber: number | null;
}

export interface GbnStepResult {
  readonly state: GbnState;
  readonly event: GbnEvent;
}

export interface GbnTraceStep extends GbnStepResult {
  readonly index: number;
  readonly action: GbnAction;
}

export interface GbnTrace {
  readonly ackMeaning: typeof GBN_ACK_MEANING;
  readonly config: GbnConfig;
  readonly initialState: GbnState;
  readonly steps: readonly GbnTraceStep[];
  readonly finalState: GbnState;
}

function validateConfig(config: GbnConfig): Required<GbnConfig> {
  if (!Number.isSafeInteger(config.sequenceSpace) || config.sequenceSpace < 2) {
    throw new RangeError('sequence space must be a safe integer of at least 2');
  }
  if (!Number.isSafeInteger(config.windowSize)
    || config.windowSize < 1
    || config.windowSize >= config.sequenceSpace) {
    throw new RangeError('window size must be from 1 through sequence space - 1');
  }
  const initialSequenceNumber = config.initialSequenceNumber ?? 0;
  if (!isSequenceNumber(initialSequenceNumber, config.sequenceSpace)) {
    throw new RangeError('initial sequence number must belong to the configured sequence space');
  }
  return { ...config, initialSequenceNumber };
}

function isSequenceNumber(value: number, sequenceSpace: number): boolean {
  return Number.isSafeInteger(value) && value >= 0 && value < sequenceSpace;
}

function advance(sequenceNumber: number, sequenceSpace: number, distance = 1): number {
  return (sequenceNumber + distance) % sequenceSpace;
}

function previous(sequenceNumber: number, sequenceSpace: number): number {
  return (sequenceNumber + sequenceSpace - 1) % sequenceSpace;
}

function cloneState(state: GbnState): GbnState {
  return { ...state, inFlight: [...state.inFlight] };
}

function validateState(config: Required<GbnConfig>, state: GbnState): void {
  for (const [field, value] of [
    ['base', state.base],
    ['nextSeq', state.nextSeq],
    ['receiverExpected', state.receiverExpected],
  ] as const) {
    if (!isSequenceNumber(value, config.sequenceSpace)) {
      throw new RangeError(`${field} must belong to the configured sequence space`);
    }
  }
  if (!Array.isArray(state.inFlight) || state.inFlight.length > config.windowSize) {
    throw new RangeError('in-flight frames must fit inside the sender window');
  }
  for (const [index, sequenceNumber] of state.inFlight.entries()) {
    if (!isSequenceNumber(sequenceNumber, config.sequenceSpace)) {
      throw new RangeError(`in-flight frame ${index} has an invalid sequence number`);
    }
    const expected = advance(state.base, config.sequenceSpace, index);
    if (sequenceNumber !== expected) {
      throw new RangeError('in-flight sequence numbers must be consecutive from base');
    }
  }
  const expectedNext = advance(state.base, config.sequenceSpace, state.inFlight.length);
  if (state.nextSeq !== expectedNext) {
    throw new RangeError('nextSeq must immediately follow the in-flight sender window');
  }
  if (state.inFlight.length === 0) {
    if (state.timerOwner !== null) throw new RangeError('an empty sender window cannot own a timer');
  } else if (state.timerOwner !== state.base) {
    throw new RangeError('the oldest unacknowledged frame at base must own the timer');
  }
}

function validateActionSequenceNumber(
  label: 'frame sequence number' | 'ACK number',
  value: number,
  sequenceSpace: number,
): void {
  if (!isSequenceNumber(value, sequenceSpace)) {
    throw new RangeError(`${label} must belong to the configured sequence space`);
  }
}

function event(
  outcome: GbnEventOutcome,
  options: Partial<Pick<GbnEvent,
    'transmittedSequenceNumbers' | 'acknowledgedSequenceNumbers' | 'generatedAckNumber'>> = {},
): GbnEvent {
  return {
    outcome,
    transmittedSequenceNumbers: options.transmittedSequenceNumbers ?? [],
    acknowledgedSequenceNumbers: options.acknowledgedSequenceNumbers ?? [],
    generatedAckNumber: options.generatedAckNumber ?? null,
  };
}

export function createGbnState(config: GbnConfig): GbnState {
  const validConfig = validateConfig(config);
  return {
    base: validConfig.initialSequenceNumber,
    nextSeq: validConfig.initialSequenceNumber,
    receiverExpected: validConfig.initialSequenceNumber,
    inFlight: [],
    timerOwner: null,
  };
}

export function stepGbn(config: GbnConfig, inputState: GbnState, action: GbnAction): GbnStepResult {
  const validConfig = validateConfig(config);
  validateState(validConfig, inputState);
  const state = cloneState(inputState);

  switch (action.type) {
    case 'send': {
      if (state.inFlight.length >= validConfig.windowSize) {
        return { state, event: event('window-full') };
      }
      const sequenceNumber = state.nextSeq;
      const inFlight = [...state.inFlight, sequenceNumber];
      const nextState: GbnState = {
        ...state,
        nextSeq: advance(sequenceNumber, validConfig.sequenceSpace),
        inFlight,
        timerOwner: state.timerOwner ?? sequenceNumber,
      };
      return {
        state: nextState,
        event: event('sent', { transmittedSequenceNumbers: [sequenceNumber] }),
      };
    }

    case 'frame-arrive': {
      validateActionSequenceNumber('frame sequence number', action.sequenceNumber, validConfig.sequenceSpace);
      if (action.sequenceNumber === state.receiverExpected) {
        return {
          state: {
            ...state,
            receiverExpected: advance(state.receiverExpected, validConfig.sequenceSpace),
          },
          event: event('frame-accepted', { generatedAckNumber: action.sequenceNumber }),
        };
      }
      return {
        state,
        event: event('frame-discarded', {
          generatedAckNumber: previous(state.receiverExpected, validConfig.sequenceSpace),
        }),
      };
    }

    case 'ack-arrive': {
      validateActionSequenceNumber('ACK number', action.ackNumber, validConfig.sequenceSpace);
      const acknowledgedIndex = state.inFlight.indexOf(action.ackNumber);
      if (acknowledgedIndex < 0) return { state, event: event('ack-ignored') };

      const acknowledgedSequenceNumbers = state.inFlight.slice(0, acknowledgedIndex + 1);
      const inFlight = state.inFlight.slice(acknowledgedIndex + 1);
      const base = inFlight[0] ?? state.nextSeq;
      return {
        state: {
          ...state,
          base,
          inFlight,
          timerOwner: inFlight.length > 0 ? base : null,
        },
        event: event('ack-advanced', { acknowledgedSequenceNumbers }),
      };
    }

    case 'drop-frame':
      validateActionSequenceNumber('frame sequence number', action.sequenceNumber, validConfig.sequenceSpace);
      return { state, event: event('frame-dropped') };

    case 'drop-ack':
      validateActionSequenceNumber('ACK number', action.ackNumber, validConfig.sequenceSpace);
      return { state, event: event('ack-dropped') };

    case 'timeout':
      return state.inFlight.length === 0
        ? { state, event: event('timeout-idle') }
        : {
            state,
            event: event('retransmitted', { transmittedSequenceNumbers: [...state.inFlight] }),
          };
  }
}

export function simulateGbn(config: GbnConfig, actions: readonly GbnAction[]): GbnTrace {
  const validConfig = validateConfig(config);
  const normalizedConfig: GbnConfig = { ...validConfig };
  const initialState = createGbnState(normalizedConfig);
  const steps: GbnTraceStep[] = [];
  let state = initialState;

  for (const [index, action] of actions.entries()) {
    const result = stepGbn(normalizedConfig, state, action);
    steps.push({ index, action: { ...action }, ...result });
    state = result.state;
  }
  return {
    ackMeaning: GBN_ACK_MEANING,
    config: normalizedConfig,
    initialState,
    steps,
    finalState: state,
  };
}

/** Local practice script derived from the 2009 Q35 needs-review content pack. */
export const GBN_Q35_PRESET = {
  sourceQuestionId: 'cn408-2009-q35',
  reviewStatus: 'needs-review',
  config: { sequenceSpace: 8, windowSize: 4, initialSequenceNumber: 0 },
  actions: [
    { type: 'send' },
    { type: 'send' },
    { type: 'send' },
    { type: 'send' },
    { type: 'frame-arrive', sequenceNumber: 0 },
    { type: 'frame-arrive', sequenceNumber: 1 },
    { type: 'frame-arrive', sequenceNumber: 2 },
    { type: 'frame-arrive', sequenceNumber: 3 },
    { type: 'ack-arrive', ackNumber: 3 },
    { type: 'send' },
    { type: 'send' },
    { type: 'send' },
    { type: 'send' },
    { type: 'drop-frame', sequenceNumber: 4 },
    { type: 'frame-arrive', sequenceNumber: 5 },
    { type: 'drop-ack', ackNumber: 3 },
    { type: 'frame-arrive', sequenceNumber: 6 },
    { type: 'drop-ack', ackNumber: 3 },
    { type: 'frame-arrive', sequenceNumber: 7 },
    { type: 'drop-ack', ackNumber: 3 },
    { type: 'timeout' },
  ],
  expectedTimeoutRetransmission: [4, 5, 6, 7],
} as const satisfies {
  readonly sourceQuestionId: 'cn408-2009-q35';
  readonly reviewStatus: 'needs-review';
  readonly config: GbnConfig;
  readonly actions: readonly GbnAction[];
  readonly expectedTimeoutRetransmission: readonly number[];
};
