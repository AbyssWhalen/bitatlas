import {
  createQ45SemaphorePreset,
  createSemaphoreState,
  stepSemaphore,
  validateSemaphoreState,
  type SemaphoreEvent,
  type SemaphoreState,
} from './semaphore';

export type Q45ProcessId = 'P1' | 'P2' | 'P3';
export type Q45SemaphoreId = 'mutex' | 'empty' | 'odd' | 'even';

export type Q45Action =
  | { readonly type: 'wait'; readonly processId: Q45ProcessId; readonly semaphoreId: Q45SemaphoreId }
  | { readonly type: 'signal'; readonly processId: Q45ProcessId; readonly semaphoreId: Q45SemaphoreId }
  | { readonly type: 'produce'; readonly processId: 'P1'; readonly value: number }
  | { readonly type: 'put'; readonly processId: 'P1' }
  | { readonly type: 'get-odd'; readonly processId: 'P2' }
  | { readonly type: 'get-even'; readonly processId: 'P3' }
  | { readonly type: 'count-odd'; readonly processId: 'P2' }
  | { readonly type: 'count-even'; readonly processId: 'P3' };

export type Q45ProducerStage =
  | 'idle'
  | 'produced'
  | 'waiting-empty'
  | 'has-empty'
  | 'waiting-mutex'
  | 'critical'
  | 'put'
  | 'put-released';

export type Q45ConsumerStage =
  | 'idle'
  | 'waiting-category'
  | 'has-category'
  | 'waiting-mutex'
  | 'critical'
  | 'got'
  | 'released-mutex'
  | 'released-empty';

export interface Q45ProducerLocal {
  readonly stage: Q45ProducerStage;
  readonly pendingValue: number | null;
  readonly pendingSlotIndex: number | null;
}

export interface Q45ConsumerLocal {
  readonly stage: Q45ConsumerStage;
  readonly extractedValue: number | null;
  readonly count: number;
}

export interface Q45State {
  readonly capacity: number;
  readonly buffer: readonly (number | null)[];
  readonly semaphore: SemaphoreState;
  readonly locals: {
    readonly P1: Q45ProducerLocal;
    readonly P2: Q45ConsumerLocal;
    readonly P3: Q45ConsumerLocal;
  };
  readonly counts: { readonly odd: number; readonly even: number };
}

export type Q45EventOutcome =
  | SemaphoreEvent['outcome']
  | 'produced'
  | 'put'
  | 'got-odd'
  | 'got-even'
  | 'counted-odd'
  | 'counted-even';

export interface Q45Event {
  readonly outcome: Q45EventOutcome;
  readonly processId: Q45ProcessId;
  readonly semaphoreId: Q45SemaphoreId | null;
  readonly value: number | null;
  readonly slotIndex: number | null;
  readonly wokenProcessId: Q45ProcessId | null;
  readonly semaphoreEvent: SemaphoreEvent | null;
}

export interface Q45StepResult {
  readonly state: Q45State;
  readonly event: Q45Event;
}

export interface Q45TraceStep extends Q45StepResult {
  readonly index: number;
  readonly action: Q45Action;
}

export interface Q45Trace {
  readonly capacity: number;
  readonly initialState: Q45State;
  readonly steps: readonly Q45TraceStep[];
  readonly finalState: Q45State;
}

const producerStages = new Set<Q45ProducerStage>([
  'idle',
  'produced',
  'waiting-empty',
  'has-empty',
  'waiting-mutex',
  'critical',
  'put',
  'put-released',
]);

const consumerStages = new Set<Q45ConsumerStage>([
  'idle',
  'waiting-category',
  'has-category',
  'waiting-mutex',
  'critical',
  'got',
  'released-mutex',
  'released-empty',
]);

export const Q45_MAX_CAPACITY = 1024;

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function assertPositiveInteger(value: unknown, label: string): asserts value is number {
  if (!Number.isSafeInteger(value) || (value as number) <= 0) {
    throw new RangeError(`${label} must be a positive safe integer`);
  }
}

function assertCapacity(value: unknown, label: string): asserts value is number {
  assertPositiveInteger(value, label);
  if (value > Q45_MAX_CAPACITY) {
    throw new RangeError(`${label} must not exceed ${Q45_MAX_CAPACITY}`);
  }
}

function assertNonNegativeInteger(value: unknown, label: string): asserts value is number {
  if (!Number.isSafeInteger(value) || (value as number) < 0) {
    throw new RangeError(`${label} must be a non-negative safe integer`);
  }
}

function configFor(capacity: number) {
  return createQ45SemaphorePreset(capacity).config;
}

function cloneState(state: Q45State): Q45State {
  return {
    capacity: state.capacity,
    buffer: [...state.buffer],
    semaphore: {
      semaphores: Object.fromEntries(Object.entries(state.semaphore.semaphores).map(
        ([id, semaphore]) => [id, { value: semaphore.value, blockedQueue: [...semaphore.blockedQueue] }],
      )),
      processes: Object.fromEntries(Object.entries(state.semaphore.processes).map(
        ([id, process]) => [id, { status: process.status, blockedOn: process.blockedOn }],
      )),
    },
    locals: {
      P1: { ...state.locals.P1 },
      P2: { ...state.locals.P2 },
      P3: { ...state.locals.P3 },
    },
    counts: { ...state.counts },
  };
}

function expectedBlockedOn(state: Q45State, processId: Q45ProcessId): Q45SemaphoreId | null {
  if (processId === 'P1') {
    if (state.locals.P1.stage === 'waiting-empty') return 'empty';
    if (state.locals.P1.stage === 'waiting-mutex') return 'mutex';
    return null;
  }
  const local = state.locals[processId];
  if (local.stage === 'waiting-category') return processId === 'P2' ? 'odd' : 'even';
  if (local.stage === 'waiting-mutex') return 'mutex';
  return null;
}

function validateQ45State(state: Q45State): void {
  if (!isRecord(state)) throw new TypeError('Q45 state must be an object');
  assertCapacity(state.capacity, 'Q45 capacity');
  if (!Array.isArray(state.buffer) || state.buffer.length !== state.capacity) {
    throw new RangeError('Q45 buffer length must equal its capacity');
  }
  for (const [index, value] of state.buffer.entries()) {
    if (value !== null) assertPositiveInteger(value, `Q45 buffer slot ${index} value`);
  }
  if (!isRecord(state.locals) || !isRecord(state.locals.P1)
    || !isRecord(state.locals.P2) || !isRecord(state.locals.P3)) {
    throw new TypeError('Q45 locals must contain P1, P2, and P3');
  }
  if (!producerStages.has(state.locals.P1.stage as Q45ProducerStage)) {
    throw new RangeError('Q45 P1 stage is invalid');
  }
  if (!consumerStages.has(state.locals.P2.stage as Q45ConsumerStage)
    || !consumerStages.has(state.locals.P3.stage as Q45ConsumerStage)) {
    throw new RangeError('Q45 consumer stage is invalid');
  }
  const producerIdle = state.locals.P1.stage === 'idle';
  if (producerIdle ? state.locals.P1.pendingValue !== null : state.locals.P1.pendingValue === null) {
    throw new RangeError('Q45 P1 pending value must agree with its stage');
  }
  if (state.locals.P1.pendingValue !== null) {
    assertPositiveInteger(state.locals.P1.pendingValue, 'Q45 P1 pending value');
  }
  const producerHasPendingSlot = ['put', 'put-released'].includes(state.locals.P1.stage);
  if (producerHasPendingSlot ? state.locals.P1.pendingSlotIndex === null : state.locals.P1.pendingSlotIndex !== null) {
    throw new RangeError('Q45 P1 pending slot must agree with its stage');
  }
  if (state.locals.P1.pendingSlotIndex !== null) {
    assertNonNegativeInteger(state.locals.P1.pendingSlotIndex, 'Q45 P1 pending slot index');
    if (state.locals.P1.pendingSlotIndex >= state.capacity
      || state.buffer[state.locals.P1.pendingSlotIndex] !== state.locals.P1.pendingValue) {
      throw new RangeError('Q45 P1 pending value must match its pending slot');
    }
  }
  for (const processId of ['P2', 'P3'] as const) {
    const local = state.locals[processId];
    assertNonNegativeInteger(local.count, `Q45 ${processId} count`);
    const hasExtracted = ['got', 'released-mutex', 'released-empty'].includes(local.stage);
    if (hasExtracted ? local.extractedValue === null : local.extractedValue !== null) {
      throw new RangeError(`Q45 ${processId} extracted value must agree with its stage`);
    }
    if (local.extractedValue !== null) {
      assertPositiveInteger(local.extractedValue, `Q45 ${processId} extracted value`);
      if ((processId === 'P2') !== (local.extractedValue % 2 === 1)) {
        throw new RangeError(`Q45 ${processId} extracted a value from the wrong category`);
      }
    }
  }
  if (!isRecord(state.counts)) throw new TypeError('Q45 counts must be an object');
  assertNonNegativeInteger(state.counts.odd, 'Q45 odd count');
  assertNonNegativeInteger(state.counts.even, 'Q45 even count');
  if (state.counts.odd !== state.locals.P2.count || state.counts.even !== state.locals.P3.count) {
    throw new RangeError('Q45 public counts must match consumer locals');
  }

  const config = configFor(state.capacity);
  validateSemaphoreState(config, state.semaphore);
  for (const processId of ['P1', 'P2', 'P3'] as const) {
    const expected = expectedBlockedOn(state, processId);
    const process = state.semaphore.processes[processId];
    if (!process) throw new RangeError(`Q45 semaphore state is missing ${processId}`);
    if (expected === null) {
      if (process.status !== 'ready' || process.blockedOn !== null) {
        throw new RangeError(`Q45 ${processId} stage must agree with its ready semaphore state`);
      }
    } else if (process.status !== 'blocked' || process.blockedOn !== expected) {
      throw new RangeError(`Q45 ${processId} stage must agree with its blocked semaphore state`);
    }
  }

  const occupied = state.buffer.filter((value) => value !== null).length;
  const producerHoldsEmpty = ['has-empty', 'waiting-mutex', 'critical'].includes(state.locals.P1.stage) ? 1 : 0;
  const consumerOwesEmpty = (['got', 'released-mutex'].includes(state.locals.P2.stage) ? 1 : 0)
    + (['got', 'released-mutex'].includes(state.locals.P3.stage) ? 1 : 0);
  const empty = state.semaphore.semaphores.empty?.value;
  if (empty === undefined || empty + producerHoldsEmpty + occupied + consumerOwesEmpty !== state.capacity) {
    throw new RangeError('Q45 empty permits and occupied buffer slots must conserve capacity');
  }

  const producerUnpublished = ['put', 'put-released'].includes(state.locals.P1.stage)
    ? state.locals.P1.pendingValue
    : null;
  const oddSlots = state.buffer.filter((value) => value !== null && value % 2 === 1).length;
  const evenSlots = occupied - oddSlots;
  const p2HoldsOdd = ['has-category', 'waiting-mutex', 'critical'].includes(state.locals.P2.stage) ? 1 : 0;
  const p3HoldsEven = ['has-category', 'waiting-mutex', 'critical'].includes(state.locals.P3.stage) ? 1 : 0;
  const odd = state.semaphore.semaphores.odd?.value;
  const even = state.semaphore.semaphores.even?.value;
  if (odd === undefined || odd + p2HoldsOdd + (producerUnpublished !== null && producerUnpublished % 2 === 1 ? 1 : 0) !== oddSlots) {
    throw new RangeError('Q45 odd permits must match odd buffer slots');
  }
  if (even === undefined || even + p3HoldsEven + (producerUnpublished !== null && producerUnpublished % 2 === 0 ? 1 : 0) !== evenSlots) {
    throw new RangeError('Q45 even permits must match even buffer slots');
  }

  const mutexHolders = [
    ['critical', 'put'].includes(state.locals.P1.stage),
    ['critical', 'got'].includes(state.locals.P2.stage),
    ['critical', 'got'].includes(state.locals.P3.stage),
  ].filter(Boolean).length;
  const mutex = state.semaphore.semaphores.mutex?.value;
  if (mutex === undefined || mutex + mutexHolders !== 1) {
    throw new RangeError('Q45 mutex permit must have exactly one available or held owner');
  }

}

function event(
  outcome: Q45EventOutcome,
  processId: Q45ProcessId,
  options: Partial<Pick<Q45Event, 'semaphoreId' | 'value' | 'slotIndex' | 'wokenProcessId' | 'semaphoreEvent'>> = {},
): Q45Event {
  return {
    outcome,
    processId,
    semaphoreId: options.semaphoreId ?? null,
    value: options.value ?? null,
    slotIndex: options.slotIndex ?? null,
    wokenProcessId: options.wokenProcessId ?? null,
    semaphoreEvent: options.semaphoreEvent ?? null,
  };
}

function assertActionRecord(action: Q45Action): void {
  if (!isRecord(action) || typeof action.type !== 'string' || typeof action.processId !== 'string') {
    throw new TypeError('Q45 action must contain a type and process id');
  }
  if (action.processId !== 'P1' && action.processId !== 'P2' && action.processId !== 'P3') {
    throw new RangeError(`unknown process id: ${action.processId}`);
  }
}

function wakeTransferredPermit(state: Q45State, wokenProcessId: string | null): Q45State {
  if (wokenProcessId === null) return state;
  if (wokenProcessId === 'P1') {
    if (state.locals.P1.stage === 'waiting-empty') {
      return { ...state, locals: { ...state.locals, P1: { ...state.locals.P1, stage: 'has-empty' } } };
    }
    if (state.locals.P1.stage === 'waiting-mutex') {
      return { ...state, locals: { ...state.locals, P1: { ...state.locals.P1, stage: 'critical' } } };
    }
  }
  if (wokenProcessId === 'P2' || wokenProcessId === 'P3') {
    const local = state.locals[wokenProcessId];
    const stage = local.stage === 'waiting-category'
      ? 'has-category'
      : local.stage === 'waiting-mutex'
        ? 'critical'
        : null;
    if (stage !== null) {
      return {
        ...state,
        locals: { ...state.locals, [wokenProcessId]: { ...local, stage } },
      };
    }
  }
  throw new RangeError(`woken process ${wokenProcessId} was not waiting for a Q45 permit`);
}

function stepWait(state: Q45State, action: Extract<Q45Action, { type: 'wait' }>): Q45StepResult {
  let readyStage: Q45ProducerStage | Q45ConsumerStage;
  let blockedStage: Q45ProducerStage | Q45ConsumerStage;
  if (action.processId === 'P1' && action.semaphoreId === 'empty' && state.locals.P1.stage === 'produced') {
    readyStage = 'has-empty';
    blockedStage = 'waiting-empty';
  } else if (action.processId === 'P1' && action.semaphoreId === 'mutex' && state.locals.P1.stage === 'has-empty') {
    readyStage = 'critical';
    blockedStage = 'waiting-mutex';
  } else if (action.processId === 'P2' && action.semaphoreId === 'odd' && state.locals.P2.stage === 'idle') {
    readyStage = 'has-category';
    blockedStage = 'waiting-category';
  } else if (action.processId === 'P3' && action.semaphoreId === 'even' && state.locals.P3.stage === 'idle') {
    readyStage = 'has-category';
    blockedStage = 'waiting-category';
  } else if ((action.processId === 'P2' || action.processId === 'P3')
    && action.semaphoreId === 'mutex'
    && state.locals[action.processId].stage === 'has-category') {
    readyStage = 'critical';
    blockedStage = 'waiting-mutex';
  } else {
    throw new RangeError(`${action.processId} cannot P(${action.semaphoreId}) in its current Q45 stage`);
  }

  const result = stepSemaphore(configFor(state.capacity), state.semaphore, action);
  const stage = result.event.outcome === 'blocked' ? blockedStage : readyStage;
  const next: Q45State = action.processId === 'P1'
    ? { ...state, semaphore: result.state, locals: { ...state.locals, P1: { ...state.locals.P1, stage: stage as Q45ProducerStage } } }
    : { ...state, semaphore: result.state, locals: { ...state.locals, [action.processId]: { ...state.locals[action.processId], stage: stage as Q45ConsumerStage } } };
  return {
    state: next,
    event: event(result.event.outcome, action.processId, {
      semaphoreId: action.semaphoreId,
      wokenProcessId: result.event.wokenProcessId as Q45ProcessId | null,
      semaphoreEvent: result.event,
    }),
  };
}

function stepSignal(state: Q45State, action: Extract<Q45Action, { type: 'signal' }>): Q45StepResult {
  if (action.processId === 'P1') {
    if (action.semaphoreId === 'mutex') {
      if (state.locals.P1.stage !== 'put') throw new RangeError('P1 must put before V(mutex)');
    } else if (action.semaphoreId === 'odd' || action.semaphoreId === 'even') {
      if (state.locals.P1.stage !== 'put-released' || state.locals.P1.pendingValue === null) {
        throw new RangeError(`${action.semaphoreId} can be signaled only after put and V(mutex)`);
      }
      const category = state.locals.P1.pendingValue % 2 === 1 ? 'odd' : 'even';
      if (action.semaphoreId !== category) {
        throw new RangeError(`${action.semaphoreId} cannot publish an ${category} value after put`);
      }
    } else {
      throw new RangeError(`P1 cannot V(${action.semaphoreId}) in Q45`);
    }
  } else {
    const local = state.locals[action.processId];
    if (action.semaphoreId === 'mutex') {
      if (local.stage !== 'got') throw new RangeError(`${action.processId} must get its value before V(mutex)`);
    } else if (action.semaphoreId === 'empty') {
      if (local.stage !== 'released-mutex') {
        throw new RangeError(`${action.processId} must V(mutex) before V(empty)`);
      }
    } else {
      throw new RangeError(`${action.processId} cannot V(${action.semaphoreId}) in Q45`);
    }
  }

  const result = stepSemaphore(configFor(state.capacity), state.semaphore, action);
  let next: Q45State;
  if (action.processId === 'P1') {
    next = action.semaphoreId === 'mutex'
      ? { ...state, semaphore: result.state, locals: { ...state.locals, P1: { ...state.locals.P1, stage: 'put-released' } } }
      : { ...state, semaphore: result.state, locals: { ...state.locals, P1: { stage: 'idle', pendingValue: null, pendingSlotIndex: null } } };
  } else {
    const stage: Q45ConsumerStage = action.semaphoreId === 'mutex' ? 'released-mutex' : 'released-empty';
    next = {
      ...state,
      semaphore: result.state,
      locals: { ...state.locals, [action.processId]: { ...state.locals[action.processId], stage } },
    };
  }
  next = wakeTransferredPermit(next, result.event.wokenProcessId);
  return {
    state: next,
    event: event(result.event.outcome, action.processId, {
      semaphoreId: action.semaphoreId,
      wokenProcessId: result.event.wokenProcessId as Q45ProcessId | null,
      semaphoreEvent: result.event,
    }),
  };
}

export function createQ45State(capacity: number): Q45State {
  assertCapacity(capacity, 'Q45 buffer capacity');
  const state: Q45State = {
    capacity,
    buffer: Array.from({ length: capacity }, () => null),
    semaphore: createSemaphoreState(configFor(capacity)),
    locals: {
      P1: { stage: 'idle', pendingValue: null, pendingSlotIndex: null },
      P2: { stage: 'idle', extractedValue: null, count: 0 },
      P3: { stage: 'idle', extractedValue: null, count: 0 },
    },
    counts: { odd: 0, even: 0 },
  };
  validateQ45State(state);
  return state;
}

export function stepQ45(inputState: Q45State, action: Q45Action): Q45StepResult {
  validateQ45State(inputState);
  assertActionRecord(action);
  const state = cloneState(inputState);
  let result: Q45StepResult;

  if (action.type === 'wait') {
    result = stepWait(state, action);
  } else if (action.type === 'signal') {
    result = stepSignal(state, action);
  } else if (action.type === 'produce') {
    if (action.processId !== 'P1' || state.locals.P1.stage !== 'idle') {
      throw new RangeError('P1 can produce only when its previous value is complete');
    }
    assertPositiveInteger(action.value, 'produced value');
    result = {
      state: { ...state, locals: { ...state.locals, P1: { stage: 'produced', pendingValue: action.value, pendingSlotIndex: null } } },
      event: event('produced', 'P1', { value: action.value }),
    };
  } else if (action.type === 'put') {
    if (action.processId !== 'P1' || state.locals.P1.stage === 'idle' || state.locals.P1.pendingValue === null) {
      throw new RangeError('P1 must produce a positive value before put');
    }
    if (state.locals.P1.stage !== 'critical') throw new RangeError('P1 must hold mutex before put');
    const slotIndex = state.buffer.findIndex((value) => value === null);
    if (slotIndex < 0) throw new RangeError('Q45 buffer has no empty slot for put');
    const buffer = [...state.buffer];
    buffer[slotIndex] = state.locals.P1.pendingValue;
    result = {
      state: {
        ...state,
        buffer,
        locals: {
          ...state.locals,
          P1: { ...state.locals.P1, stage: 'put', pendingSlotIndex: slotIndex },
        },
      },
      event: event('put', 'P1', { value: state.locals.P1.pendingValue, slotIndex }),
    };
  } else if (action.type === 'get-odd' || action.type === 'get-even') {
    const processId = action.type === 'get-odd' ? 'P2' : 'P3';
    const parity = action.type === 'get-odd' ? 1 : 0;
    if (action.processId !== processId) throw new RangeError(`${action.type} belongs to ${processId}`);
    if (state.locals[processId].stage === 'idle') {
      throw new RangeError(`${processId} must acquire its ${parity === 1 ? 'odd' : 'even'} permit before get`);
    }
    if (state.locals[processId].stage !== 'critical') throw new RangeError(`${processId} must hold mutex before get`);
    const pendingSlotIndex = ['put', 'put-released'].includes(state.locals.P1.stage)
      ? state.locals.P1.pendingSlotIndex
      : null;
    const slotIndex = state.buffer.findIndex(
      (value, index) => index !== pendingSlotIndex && value !== null && value % 2 === parity,
    );
    if (slotIndex < 0) throw new RangeError(`Q45 buffer has no ${parity === 1 ? 'odd' : 'even'} value to get`);
    const value = state.buffer[slotIndex]!;
    const buffer = [...state.buffer];
    buffer[slotIndex] = null;
    result = {
      state: {
        ...state,
        buffer,
        locals: { ...state.locals, [processId]: { ...state.locals[processId], stage: 'got', extractedValue: value } },
      },
      event: event(action.type === 'get-odd' ? 'got-odd' : 'got-even', processId, { value, slotIndex }),
    };
  } else if (action.type === 'count-odd' || action.type === 'count-even') {
    const processId = action.type === 'count-odd' ? 'P2' : 'P3';
    if (action.processId !== processId) throw new RangeError(`${action.type} belongs to ${processId}`);
    const local = state.locals[processId];
    if (local.stage !== 'released-empty' || local.extractedValue === null) {
      throw new RangeError(`${processId} must get and release mutex/empty before count`);
    }
    const count = local.count + 1;
    result = {
      state: {
        ...state,
        locals: { ...state.locals, [processId]: { stage: 'idle', extractedValue: null, count } },
        counts: processId === 'P2' ? { ...state.counts, odd: count } : { ...state.counts, even: count },
      },
      event: event(action.type === 'count-odd' ? 'counted-odd' : 'counted-even', processId, {
        value: local.extractedValue,
      }),
    };
  } else {
    throw new RangeError(`unsupported Q45 action: ${String((action as { readonly type?: unknown }).type)}`);
  }

  validateQ45State(result.state);
  return result;
}

export function simulateQ45(capacity: number, actions: readonly Q45Action[]): Q45Trace {
  if (!Array.isArray(actions)) throw new TypeError('Q45 actions must be an array');
  const initialState = createQ45State(capacity);
  const steps: Q45TraceStep[] = [];
  let state = initialState;
  for (const [index, action] of actions.entries()) {
    const result = stepQ45(state, action);
    steps.push({ index, action: { ...action }, ...result });
    state = result.state;
  }
  return { capacity, initialState, steps, finalState: state };
}

function parseScriptLine(line: string): Q45Action {
  const tokens = line.trim().split(/\s+/u);
  const processId = tokens[0]?.toUpperCase();
  if (processId !== 'P1' && processId !== 'P2' && processId !== 'P3') {
    throw new Error('进程必须是 P1、P2 或 P3');
  }
  const semaphoreOperation = /^(P[123])\s+([PV])(?:\s+([A-Z]+)|\(([A-Z]+)\))$/iu.exec(line);
  if (semaphoreOperation !== null) {
    const operation = semaphoreOperation[2]!.toLowerCase();
    const semaphoreId = (semaphoreOperation[3] ?? semaphoreOperation[4])!.toLowerCase();
    if (semaphoreId !== 'mutex' && semaphoreId !== 'empty'
      && semaphoreId !== 'odd' && semaphoreId !== 'even') {
      throw new Error('信号量必须是 mutex、empty、odd 或 even');
    }
    return { type: operation === 'p' ? 'wait' : 'signal', processId, semaphoreId };
  }
  const operation = tokens[1]?.toLowerCase();
  if (operation === 'produce' && processId === 'P1' && tokens.length === 3) {
    if (!/^[1-9][0-9]*$/u.test(tokens[2] ?? '')) throw new Error('produce 需要一个正整数');
    const value = Number(tokens[2]);
    assertPositiveInteger(value, 'produce value');
    return { type: 'produce', processId, value };
  }
  if (operation === 'put' && processId === 'P1' && tokens.length === 2) {
    return { type: 'put', processId };
  }
  if (operation === 'getodd' && processId === 'P2' && tokens.length === 2) {
    return { type: 'get-odd', processId };
  }
  if (operation === 'geteven' && processId === 'P3' && tokens.length === 2) {
    return { type: 'get-even', processId };
  }
  if (operation === 'countodd' && processId === 'P2' && tokens.length === 2) {
    return { type: 'count-odd', processId };
  }
  if (operation === 'counteven' && processId === 'P3' && tokens.length === 2) {
    return { type: 'count-even', processId };
  }
  throw new Error('操作不符合 Q45 受控脚本语法或进程角色');
}

export function parseQ45Script(script: string): readonly Q45Action[] {
  if (typeof script !== 'string') throw new TypeError('Q45 script must be a string');
  const lines = script.split(/\r?\n/u);
  const actions: Q45Action[] = [];
  for (const [index, rawLine] of lines.entries()) {
    const line = rawLine.replace(/#.*$/u, '').trim();
    if (!line) continue;
    try {
      actions.push(parseScriptLine(line));
    } catch (reason) {
      const message = reason instanceof Error ? reason.message : '无法解析操作';
      throw new Error(`第 ${index + 1} 行：${message}`);
    }
  }
  if (actions.length === 0) throw new Error('脚本需要至少一个操作');
  if (actions.length > 200) throw new RangeError('脚本最多允许 200 个操作');
  return actions;
}

export function formatQ45Action(action: Q45Action): string {
  switch (action.type) {
    case 'wait': return `${action.processId} P(${action.semaphoreId})`;
    case 'signal': return `${action.processId} V(${action.semaphoreId})`;
    case 'produce': return `${action.processId} produce ${action.value}`;
    case 'put': return 'P1 put';
    case 'get-odd': return 'P2 getodd';
    case 'get-even': return 'P3 geteven';
    case 'count-odd': return 'P2 countodd';
    case 'count-even': return 'P3 counteven';
    default:
      throw new RangeError(`unsupported Q45 action: ${String((action as { readonly type?: unknown }).type)}`);
  }
}

const presetActions = [
  { type: 'wait', processId: 'P2', semaphoreId: 'odd' },
  { type: 'wait', processId: 'P3', semaphoreId: 'even' },
  { type: 'produce', processId: 'P1', value: 3 },
  { type: 'wait', processId: 'P1', semaphoreId: 'empty' },
  { type: 'wait', processId: 'P1', semaphoreId: 'mutex' },
  { type: 'put', processId: 'P1' },
  { type: 'signal', processId: 'P1', semaphoreId: 'mutex' },
  { type: 'signal', processId: 'P1', semaphoreId: 'odd' },
  { type: 'wait', processId: 'P2', semaphoreId: 'mutex' },
  { type: 'get-odd', processId: 'P2' },
  { type: 'signal', processId: 'P2', semaphoreId: 'mutex' },
  { type: 'signal', processId: 'P2', semaphoreId: 'empty' },
  { type: 'count-odd', processId: 'P2' },
  { type: 'produce', processId: 'P1', value: 8 },
  { type: 'wait', processId: 'P1', semaphoreId: 'empty' },
  { type: 'wait', processId: 'P1', semaphoreId: 'mutex' },
  { type: 'put', processId: 'P1' },
  { type: 'signal', processId: 'P1', semaphoreId: 'mutex' },
  { type: 'signal', processId: 'P1', semaphoreId: 'even' },
  { type: 'wait', processId: 'P3', semaphoreId: 'mutex' },
  { type: 'get-even', processId: 'P3' },
  { type: 'signal', processId: 'P3', semaphoreId: 'mutex' },
  { type: 'signal', processId: 'P3', semaphoreId: 'empty' },
  { type: 'count-even', processId: 'P3' },
] as const satisfies readonly Q45Action[];

/** Local practice trace derived from the 2009 Q45 needs-review content pack. */
export const Q45_BUFFER_PRESET = {
  sourceQuestionId: 'cn408-2009-q45',
  reviewStatus: 'needs-review',
  capacity: 2,
  actions: presetActions,
  script: presetActions.map(formatQ45Action).join('\n'),
} as const;
