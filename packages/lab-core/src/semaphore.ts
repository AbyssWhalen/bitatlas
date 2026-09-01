/** Semaphore values are non-negative counts of permits available immediately. */
export const SEMAPHORE_VALUE_MEANING = 'available-permits' as const;

export interface SemaphoreProcessDefinition {
  readonly id: string;
  readonly label?: string;
}

export interface SemaphoreDefinition {
  readonly id: string;
  readonly initialValue: number;
  readonly maxValue?: number;
  readonly label?: string;
  readonly meaning?: string;
}

export interface SemaphoreConfig {
  readonly processes: readonly SemaphoreProcessDefinition[];
  readonly semaphores: readonly SemaphoreDefinition[];
}

export type SemaphoreProcessStatus = 'ready' | 'blocked';

export interface SemaphoreProcessState {
  readonly status: SemaphoreProcessStatus;
  readonly blockedOn: string | null;
}

export interface SemaphoreValueState {
  readonly value: number;
  readonly blockedQueue: readonly string[];
}

export interface SemaphoreState {
  readonly semaphores: Readonly<Record<string, SemaphoreValueState>>;
  readonly processes: Readonly<Record<string, SemaphoreProcessState>>;
}

export type SemaphoreAction =
  | {
      readonly type: 'wait';
      readonly processId: string;
      readonly semaphoreId: string;
    }
  | {
      readonly type: 'signal';
      readonly processId: string;
      readonly semaphoreId: string;
    };

export type SemaphoreEventOutcome = 'acquired' | 'blocked' | 'woken' | 'incremented';

export interface SemaphoreEvent {
  readonly outcome: SemaphoreEventOutcome;
  readonly processId: string;
  readonly semaphoreId: string;
  readonly valueBefore: number;
  readonly valueAfter: number;
  readonly queueBefore: readonly string[];
  readonly queueAfter: readonly string[];
  readonly wokenProcessId: string | null;
}

export interface SemaphoreStepResult {
  readonly state: SemaphoreState;
  readonly event: SemaphoreEvent;
}

export interface SemaphoreTraceStep extends SemaphoreStepResult {
  readonly index: number;
  readonly action: SemaphoreAction;
}

export interface SemaphoreTrace {
  readonly valueMeaning: typeof SEMAPHORE_VALUE_MEANING;
  readonly config: SemaphoreConfig;
  readonly initialState: SemaphoreState;
  readonly steps: readonly SemaphoreTraceStep[];
  readonly finalState: SemaphoreState;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function validateId(value: unknown, label: string): asserts value is string {
  if (typeof value !== 'string' || value.trim().length === 0 || value !== value.trim()) {
    throw new TypeError(`${label} must be a non-empty trimmed string`);
  }
}

function validateOptionalText(value: unknown, label: string): void {
  if (value !== undefined && (typeof value !== 'string' || value.trim().length === 0)) {
    throw new TypeError(`${label} must be a non-empty string when provided`);
  }
}

function validateNonNegativeSafeInteger(value: unknown, label: string): asserts value is number {
  if (!Number.isSafeInteger(value) || (value as number) < 0) {
    throw new RangeError(`${label} must be a non-negative safe integer`);
  }
}

function validateConfig(config: SemaphoreConfig): void {
  if (!Array.isArray(config.processes) || config.processes.length === 0) {
    throw new TypeError('processes must be a non-empty array');
  }
  if (!Array.isArray(config.semaphores) || config.semaphores.length === 0) {
    throw new TypeError('semaphores must be a non-empty array');
  }

  const processIds = new Set<string>();
  for (const [index, process] of config.processes.entries()) {
    if (!isRecord(process)) throw new TypeError(`processes[${index}] must be a process definition`);
    validateId(process.id, `processes[${index}].id`);
    if (processIds.has(process.id)) throw new RangeError(`duplicate process id: ${process.id}`);
    processIds.add(process.id);
    validateOptionalText(process.label, `processes[${index}].label`);
  }

  const semaphoreIds = new Set<string>();
  for (const [index, semaphore] of config.semaphores.entries()) {
    if (!isRecord(semaphore)) {
      throw new TypeError(`semaphores[${index}] must be a semaphore definition`);
    }
    validateId(semaphore.id, `semaphores[${index}].id`);
    if (semaphoreIds.has(semaphore.id)) {
      throw new RangeError(`duplicate semaphore id: ${semaphore.id}`);
    }
    semaphoreIds.add(semaphore.id);
    validateNonNegativeSafeInteger(semaphore.initialValue, `semaphores[${index}].initialValue`);
    if (semaphore.maxValue !== undefined) {
      validateNonNegativeSafeInteger(semaphore.maxValue, `semaphores[${index}].maxValue`);
      if (semaphore.maxValue < semaphore.initialValue) {
        throw new RangeError(`semaphores[${index}].maxValue cannot be less than initialValue`);
      }
    }
    validateOptionalText(semaphore.label, `semaphores[${index}].label`);
    validateOptionalText(semaphore.meaning, `semaphores[${index}].meaning`);
  }
}

function cloneConfig(config: SemaphoreConfig): SemaphoreConfig {
  return {
    processes: config.processes.map((process) => ({ ...process })),
    semaphores: config.semaphores.map((semaphore) => ({ ...semaphore })),
  };
}

function cloneState(config: SemaphoreConfig, state: SemaphoreState): SemaphoreState {
  return {
    semaphores: Object.fromEntries(config.semaphores.map(({ id }) => {
      const semaphore = state.semaphores[id]!;
      return [id, { value: semaphore.value, blockedQueue: [...semaphore.blockedQueue] }];
    })),
    processes: Object.fromEntries(config.processes.map(({ id }) => {
      const process = state.processes[id]!;
      return [id, { status: process.status, blockedOn: process.blockedOn }];
    })),
  };
}

function assertExactKeys(
  record: Record<string, unknown>,
  expectedIds: ReadonlySet<string>,
  label: string,
): void {
  const keys = Object.keys(record);
  if (keys.length !== expectedIds.size || keys.some((key) => !expectedIds.has(key))) {
    throw new RangeError(`${label} keys must exactly match the configured ids`);
  }
}

function validateState(config: SemaphoreConfig, state: SemaphoreState): void {
  if (!isRecord(state)) throw new TypeError('state must be an object');
  if (!isRecord(state.semaphores)) throw new TypeError('state.semaphores must be an object');
  if (!isRecord(state.processes)) throw new TypeError('state.processes must be an object');

  const processIds = new Set(config.processes.map(({ id }) => id));
  const semaphoreIds = new Set(config.semaphores.map(({ id }) => id));
  assertExactKeys(state.semaphores, semaphoreIds, 'state.semaphores');
  assertExactKeys(state.processes, processIds, 'state.processes');

  const queuedProcesses = new Set<string>();
  for (const definition of config.semaphores) {
    const semaphore = state.semaphores[definition.id];
    if (!isRecord(semaphore)) {
      throw new TypeError(`state semaphore ${definition.id} must be an object`);
    }
    validateNonNegativeSafeInteger(semaphore.value, `state semaphore ${definition.id} value`);
    if (definition.maxValue !== undefined && semaphore.value > definition.maxValue) {
      throw new RangeError(`state semaphore ${definition.id} value exceeds its maximum`);
    }
    if (!Array.isArray(semaphore.blockedQueue)) {
      throw new TypeError(`state semaphore ${definition.id} blockedQueue must be an array`);
    }
    if (semaphore.blockedQueue.length > 0 && semaphore.value !== 0) {
      throw new RangeError(`queued semaphore ${definition.id} value must stay zero`);
    }
    for (const queuedProcessId of semaphore.blockedQueue) {
      if (typeof queuedProcessId !== 'string' || !processIds.has(queuedProcessId)) {
        throw new RangeError(`state semaphore ${definition.id} queue contains an unknown process`);
      }
      if (queuedProcesses.has(queuedProcessId)) {
        throw new RangeError(`process ${queuedProcessId} cannot appear in more than one blocked queue`);
      }
      queuedProcesses.add(queuedProcessId);
      const process = state.processes[queuedProcessId];
      if (!isRecord(process)
        || process.status !== 'blocked'
        || process.blockedOn !== definition.id) {
        throw new RangeError(`queued process ${queuedProcessId} must be blocked on ${definition.id}`);
      }
    }
  }

  for (const definition of config.processes) {
    const process = state.processes[definition.id];
    if (!isRecord(process)) throw new TypeError(`state process ${definition.id} must be an object`);
    if (process.status !== 'ready' && process.status !== 'blocked') {
      throw new RangeError(`state process ${definition.id} has an invalid status`);
    }
    if (process.status === 'ready') {
      if (process.blockedOn !== null || queuedProcesses.has(definition.id)) {
        throw new RangeError(`ready process ${definition.id} cannot belong to a blocked queue`);
      }
    } else {
      if (typeof process.blockedOn !== 'string' || !semaphoreIds.has(process.blockedOn)) {
        throw new RangeError(`blocked process ${definition.id} must name a configured semaphore`);
      }
      if (!queuedProcesses.has(definition.id)) {
        throw new RangeError(`blocked process ${definition.id} must appear in its semaphore queue`);
      }
    }
  }
}

export function validateSemaphoreState(
  config: SemaphoreConfig,
  state: SemaphoreState,
): void {
  validateConfig(config);
  validateState(config, state);
}

function validateAction(config: SemaphoreConfig, action: SemaphoreAction): void {
  if (!isRecord(action)) throw new TypeError('action must be an object');
  const runtimeType = (action as { readonly type?: unknown }).type;
  if (runtimeType !== 'wait' && runtimeType !== 'signal') {
    throw new RangeError(`unsupported semaphore action: ${String(runtimeType)}`);
  }
  if (typeof action.processId !== 'string'
    || !config.processes.some(({ id }) => id === action.processId)) {
    throw new RangeError(`unknown process id: ${String(action.processId)}`);
  }
  if (typeof action.semaphoreId !== 'string'
    || !config.semaphores.some(({ id }) => id === action.semaphoreId)) {
    throw new RangeError(`unknown semaphore id: ${String(action.semaphoreId)}`);
  }
}

function replaceSemaphore(
  state: SemaphoreState,
  semaphoreId: string,
  semaphore: SemaphoreValueState,
): SemaphoreState {
  return {
    ...state,
    semaphores: { ...state.semaphores, [semaphoreId]: semaphore },
  };
}

function semaphoreEvent(
  outcome: SemaphoreEventOutcome,
  action: SemaphoreAction,
  valueBefore: number,
  valueAfter: number,
  queueBefore: readonly string[],
  queueAfter: readonly string[],
  wokenProcessId: string | null = null,
): SemaphoreEvent {
  return {
    outcome,
    processId: action.processId,
    semaphoreId: action.semaphoreId,
    valueBefore,
    valueAfter,
    queueBefore: [...queueBefore],
    queueAfter: [...queueAfter],
    wokenProcessId,
  };
}

export function createSemaphoreState(config: SemaphoreConfig): SemaphoreState {
  validateConfig(config);
  return {
    semaphores: Object.fromEntries(config.semaphores.map((semaphore) => [
      semaphore.id,
      { value: semaphore.initialValue, blockedQueue: [] },
    ])),
    processes: Object.fromEntries(config.processes.map((process) => [
      process.id,
      { status: 'ready', blockedOn: null },
    ])),
  };
}

export function stepSemaphore(
  config: SemaphoreConfig,
  inputState: SemaphoreState,
  action: SemaphoreAction,
): SemaphoreStepResult {
  validateSemaphoreState(config, inputState);
  validateAction(config, action);

  const actor = inputState.processes[action.processId]!;
  if (actor.status === 'blocked') {
    throw new RangeError(`blocked process ${action.processId} cannot execute another operation`);
  }

  const state = cloneState(config, inputState);
  const semaphore = state.semaphores[action.semaphoreId]!;
  const valueBefore = semaphore.value;
  const queueBefore = [...semaphore.blockedQueue];

  if (action.type === 'wait') {
    if (valueBefore > 0) {
      const nextSemaphore = { value: valueBefore - 1, blockedQueue: queueBefore };
      return {
        state: replaceSemaphore(state, action.semaphoreId, nextSemaphore),
        event: semaphoreEvent(
          'acquired',
          action,
          valueBefore,
          nextSemaphore.value,
          queueBefore,
          nextSemaphore.blockedQueue,
        ),
      };
    }

    const queueAfter = [...queueBefore, action.processId];
    return {
      state: {
        semaphores: {
          ...state.semaphores,
          [action.semaphoreId]: { value: 0, blockedQueue: queueAfter },
        },
        processes: {
          ...state.processes,
          [action.processId]: { status: 'blocked', blockedOn: action.semaphoreId },
        },
      },
      event: semaphoreEvent(
        'blocked',
        action,
        valueBefore,
        0,
        queueBefore,
        queueAfter,
      ),
    };
  }

  if (queueBefore.length > 0) {
    const wokenProcessId = queueBefore[0]!;
    const queueAfter = queueBefore.slice(1);
    return {
      state: {
        semaphores: {
          ...state.semaphores,
          [action.semaphoreId]: { value: 0, blockedQueue: queueAfter },
        },
        processes: {
          ...state.processes,
          [wokenProcessId]: { status: 'ready', blockedOn: null },
        },
      },
      event: semaphoreEvent(
        'woken',
        action,
        valueBefore,
        0,
        queueBefore,
        queueAfter,
        wokenProcessId,
      ),
    };
  }

  const definition = config.semaphores.find(({ id }) => id === action.semaphoreId)!;
  if (definition.maxValue !== undefined && valueBefore >= definition.maxValue) {
    throw new RangeError(`semaphore ${action.semaphoreId} is already at its maximum value`);
  }
  const valueAfter = valueBefore + 1;
  if (!Number.isSafeInteger(valueAfter)) {
    throw new RangeError(`semaphore ${action.semaphoreId} value exceeds safe integer precision`);
  }
  const nextSemaphore = { value: valueAfter, blockedQueue: queueBefore };
  return {
    state: replaceSemaphore(state, action.semaphoreId, nextSemaphore),
    event: semaphoreEvent(
      'incremented',
      action,
      valueBefore,
      valueAfter,
      queueBefore,
      nextSemaphore.blockedQueue,
    ),
  };
}

export function simulateSemaphore(
  config: SemaphoreConfig,
  actions: readonly SemaphoreAction[],
): SemaphoreTrace {
  validateConfig(config);
  if (!Array.isArray(actions)) throw new TypeError('actions must be an array');

  const normalizedConfig = cloneConfig(config);
  const initialState = createSemaphoreState(normalizedConfig);
  const steps: SemaphoreTraceStep[] = [];
  let state = initialState;

  for (const [index, action] of actions.entries()) {
    const result = stepSemaphore(normalizedConfig, state, action);
    steps.push({ index, action: { ...action }, ...result });
    state = result.state;
  }

  return {
    valueMeaning: SEMAPHORE_VALUE_MEANING,
    config: normalizedConfig,
    initialState,
    steps,
    finalState: state,
  };
}

export interface Q45SemaphorePreset {
  readonly sourceQuestionId: 'cn408-2009-q45';
  readonly reviewStatus: 'needs-review';
  readonly capacity: number;
  readonly config: SemaphoreConfig;
  readonly actions: readonly SemaphoreAction[];
}

export function createQ45SemaphorePreset(capacity = 2): Q45SemaphorePreset {
  if (!Number.isSafeInteger(capacity) || capacity <= 0) {
    throw new RangeError('Q45 buffer capacity must be a positive safe integer');
  }

  return {
    sourceQuestionId: 'cn408-2009-q45',
    reviewStatus: 'needs-review',
    capacity,
    config: {
      processes: [
        { id: 'P1', label: 'producer' },
        { id: 'P2', label: 'odd consumer' },
        { id: 'P3', label: 'even consumer' },
      ],
      semaphores: [
        { id: 'mutex', initialValue: 1, maxValue: 1, meaning: 'buffer mutual exclusion' },
        { id: 'empty', initialValue: capacity, maxValue: capacity, meaning: 'empty buffer units' },
        { id: 'odd', initialValue: 0, maxValue: capacity, meaning: 'odd values available to P2' },
        { id: 'even', initialValue: 0, maxValue: capacity, meaning: 'even values available to P3' },
      ],
    },
    actions: [
      { type: 'wait', processId: 'P2', semaphoreId: 'odd' },
      { type: 'wait', processId: 'P3', semaphoreId: 'even' },
      { type: 'wait', processId: 'P1', semaphoreId: 'empty' },
      { type: 'wait', processId: 'P1', semaphoreId: 'mutex' },
      { type: 'signal', processId: 'P1', semaphoreId: 'mutex' },
      { type: 'signal', processId: 'P1', semaphoreId: 'odd' },
      { type: 'wait', processId: 'P2', semaphoreId: 'mutex' },
      { type: 'signal', processId: 'P2', semaphoreId: 'mutex' },
      { type: 'signal', processId: 'P2', semaphoreId: 'empty' },
      { type: 'wait', processId: 'P1', semaphoreId: 'empty' },
      { type: 'wait', processId: 'P1', semaphoreId: 'mutex' },
      { type: 'signal', processId: 'P1', semaphoreId: 'mutex' },
      { type: 'signal', processId: 'P1', semaphoreId: 'even' },
      { type: 'wait', processId: 'P3', semaphoreId: 'mutex' },
      { type: 'signal', processId: 'P3', semaphoreId: 'mutex' },
      { type: 'signal', processId: 'P3', semaphoreId: 'empty' },
    ],
  };
}

/** Local practice interleaving derived from the 2009 Q45 needs-review content pack. */
export const SEMAPHORE_Q45_PRESET = createQ45SemaphorePreset();
