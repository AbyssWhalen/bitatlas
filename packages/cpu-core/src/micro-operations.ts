export type MicroOperationSchedule = 'parallel-5' | 'split-6';

export interface MicroOperationConfig {
  readonly schedule: MicroOperationSchedule;
  readonly r0: number;
  readonly r1: number;
  readonly memoryWord: number;
}

export interface MicroOperationState {
  readonly r0: number;
  readonly r1: number;
  readonly a: number | null;
  readonly ac: number | null;
  readonly mar: number | null;
  readonly mdr: number | null;
  readonly memoryWord: number;
}

export type InternalBusDriver = 'R0' | 'R1' | 'MDR' | 'AC';
export type DataBusDriver = 'memory' | 'MDR';

export interface MicroOperationBuses {
  readonly internal: {
    readonly driver: InternalBusDriver | null;
    readonly value: number | null;
  };
  readonly address: {
    readonly driver: 'MAR' | null;
    readonly value: number | null;
  };
  readonly data: {
    readonly driver: DataBusDriver | null;
    readonly value: number | null;
  };
}

export type MicroOperationControlSignal =
  | 'R0out'
  | 'R1out'
  | 'MDRout'
  | 'MDRoutE'
  | 'ACout'
  | 'MARin'
  | 'MDRin'
  | 'MDRinE'
  | 'Ain'
  | 'ACin'
  | 'Add'
  | 'MemR'
  | 'MemW';

export interface MicroOperationStep {
  readonly id: string;
  readonly cycle: number;
  readonly microOperations: readonly string[];
  readonly controlSignals: readonly MicroOperationControlSignal[];
  readonly buses: MicroOperationBuses;
  readonly before: MicroOperationState;
  readonly after: MicroOperationState;
  readonly invariants: {
    readonly singleInternalBusDriver: boolean;
    readonly addressStable: boolean;
  };
}

export interface MicroOperationResult {
  readonly address: number;
  readonly valueRead: number;
  readonly valueWritten: number;
  readonly r0Unchanged: boolean;
  readonly r1Unchanged: boolean;
}

export interface MicroOperationTrace {
  readonly schedule: MicroOperationSchedule;
  readonly config: MicroOperationConfig;
  readonly initialState: MicroOperationState;
  readonly steps: readonly MicroOperationStep[];
  readonly finalState: MicroOperationState;
  readonly result: MicroOperationResult;
}

export type MicroOperationErrorCode =
  | 'invalid-config'
  | 'invalid-schedule'
  | 'invalid-r0'
  | 'invalid-r1'
  | 'invalid-memory-word'
  | 'schedule-invariant';

export interface MicroOperationError {
  readonly code: MicroOperationErrorCode;
  readonly message: string;
}

export type MicroOperationCoreResult<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: MicroOperationError };

type CycleAction =
  | 'load-mar'
  | 'read-memory'
  | 'read-memory-and-load-a'
  | 'load-a-from-mdr'
  | 'add-a-r0'
  | 'add-mdr-a'
  | 'load-mdr-from-ac'
  | 'write-memory';

interface CycleSpec {
  readonly cycle: number;
  readonly action: CycleAction;
  readonly microOperations: readonly string[];
  readonly controlSignals: readonly MicroOperationControlSignal[];
  readonly internalDrivers: readonly InternalBusDriver[];
  readonly dataDriver: DataBusDriver | null;
}

const SCHEDULES: Readonly<Record<MicroOperationSchedule, readonly CycleSpec[]>> = {
  'parallel-5': [
    {
      cycle: 5,
      action: 'load-mar',
      microOperations: ['MAR <- R1'],
      controlSignals: ['R1out', 'MARin'],
      internalDrivers: ['R1'],
      dataDriver: null,
    },
    {
      cycle: 6,
      action: 'read-memory-and-load-a',
      microOperations: ['MDR <- M(MAR)', 'A <- R0'],
      controlSignals: ['MemR', 'MDRinE', 'R0out', 'Ain'],
      internalDrivers: ['R0'],
      dataDriver: 'memory',
    },
    {
      cycle: 7,
      action: 'add-mdr-a',
      microOperations: ['AC <- MDR + A'],
      controlSignals: ['MDRout', 'Add', 'ACin'],
      internalDrivers: ['MDR'],
      dataDriver: null,
    },
    {
      cycle: 8,
      action: 'load-mdr-from-ac',
      microOperations: ['MDR <- AC'],
      controlSignals: ['ACout', 'MDRin'],
      internalDrivers: ['AC'],
      dataDriver: null,
    },
    {
      cycle: 9,
      action: 'write-memory',
      microOperations: ['M(MAR) <- MDR'],
      controlSignals: ['MDRoutE', 'MemW'],
      internalDrivers: [],
      dataDriver: 'MDR',
    },
  ],
  'split-6': [
    {
      cycle: 5,
      action: 'load-mar',
      microOperations: ['MAR <- R1'],
      controlSignals: ['R1out', 'MARin'],
      internalDrivers: ['R1'],
      dataDriver: null,
    },
    {
      cycle: 6,
      action: 'read-memory',
      microOperations: ['MDR <- M(MAR)'],
      controlSignals: ['MemR', 'MDRinE'],
      internalDrivers: [],
      dataDriver: 'memory',
    },
    {
      cycle: 7,
      action: 'load-a-from-mdr',
      microOperations: ['A <- MDR'],
      controlSignals: ['MDRout', 'Ain'],
      internalDrivers: ['MDR'],
      dataDriver: null,
    },
    {
      cycle: 8,
      action: 'add-a-r0',
      microOperations: ['AC <- A + R0'],
      controlSignals: ['R0out', 'Add', 'ACin'],
      internalDrivers: ['R0'],
      dataDriver: null,
    },
    {
      cycle: 9,
      action: 'load-mdr-from-ac',
      microOperations: ['MDR <- AC'],
      controlSignals: ['ACout', 'MDRin'],
      internalDrivers: ['AC'],
      dataDriver: null,
    },
    {
      cycle: 10,
      action: 'write-memory',
      microOperations: ['M(MAR) <- MDR'],
      controlSignals: ['MDRoutE', 'MemW'],
      internalDrivers: [],
      dataDriver: 'MDR',
    },
  ],
};

function failure<T>(code: MicroOperationErrorCode, message: string): MicroOperationCoreResult<T> {
  return { ok: false, error: { code, message } };
}

function isUint16(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 && value <= 0xffff;
}

function cloneState(state: MicroOperationState): MicroOperationState {
  return { ...state };
}

function valueOnInternalBus(
  driver: InternalBusDriver | null,
  state: MicroOperationState,
): number | null {
  if (driver === 'R0') return state.r0;
  if (driver === 'R1') return state.r1;
  if (driver === 'MDR') return state.mdr;
  if (driver === 'AC') return state.ac;
  return null;
}

function requireKnown(value: number | null, label: string): MicroOperationCoreResult<number> {
  return value === null
    ? failure('schedule-invariant', `${label} must be known before this micro-operation.`)
    : { ok: true, value };
}

function executeAction(
  action: CycleAction,
  before: MicroOperationState,
): MicroOperationCoreResult<MicroOperationState> {
  if (action === 'load-mar') return { ok: true, value: { ...before, mar: before.r1 } };
  if (action === 'read-memory') {
    const mar = requireKnown(before.mar, 'MAR');
    if (!mar.ok) return mar;
    return { ok: true, value: { ...before, mdr: before.memoryWord } };
  }
  if (action === 'read-memory-and-load-a') {
    const mar = requireKnown(before.mar, 'MAR');
    if (!mar.ok) return mar;
    return { ok: true, value: { ...before, a: before.r0, mdr: before.memoryWord } };
  }
  if (action === 'load-a-from-mdr') {
    const mdr = requireKnown(before.mdr, 'MDR');
    if (!mdr.ok) return mdr;
    return { ok: true, value: { ...before, a: mdr.value } };
  }
  if (action === 'add-a-r0') {
    const a = requireKnown(before.a, 'A');
    if (!a.ok) return a;
    return { ok: true, value: { ...before, ac: (a.value + before.r0) & 0xffff } };
  }
  if (action === 'add-mdr-a') {
    const a = requireKnown(before.a, 'A');
    if (!a.ok) return a;
    const mdr = requireKnown(before.mdr, 'MDR');
    if (!mdr.ok) return mdr;
    return { ok: true, value: { ...before, ac: (mdr.value + a.value) & 0xffff } };
  }
  if (action === 'load-mdr-from-ac') {
    const ac = requireKnown(before.ac, 'AC');
    if (!ac.ok) return ac;
    return { ok: true, value: { ...before, mdr: ac.value } };
  }

  const mar = requireKnown(before.mar, 'MAR');
  if (!mar.ok) return mar;
  const mdr = requireKnown(before.mdr, 'MDR');
  if (!mdr.ok) return mdr;
  return { ok: true, value: { ...before, memoryWord: mdr.value } };
}

function busesFor(spec: CycleSpec, before: MicroOperationState): MicroOperationCoreResult<MicroOperationBuses> {
  if (spec.internalDrivers.length > 1) {
    return failure('schedule-invariant', `C${spec.cycle} drives the internal bus from more than one source.`);
  }
  const internalDriver = spec.internalDrivers[0] ?? null;
  const internalValue = valueOnInternalBus(internalDriver, before);
  if (internalDriver !== null && internalValue === null) {
    return failure('schedule-invariant', `C${spec.cycle} drives an unknown value on the internal bus.`);
  }

  const addressValue = before.mar;
  const dataValue = spec.dataDriver === 'memory'
    ? before.memoryWord
    : spec.dataDriver === 'MDR'
      ? before.mdr
      : null;
  if (spec.dataDriver !== null && dataValue === null) {
    return failure('schedule-invariant', `C${spec.cycle} drives an unknown value on the data bus.`);
  }

  return {
    ok: true,
    value: {
      internal: { driver: internalDriver, value: internalValue },
      address: { driver: 'MAR', value: addressValue },
      data: { driver: spec.dataDriver, value: dataValue },
    },
  };
}

export function simulateMicroOperations(
  config: MicroOperationConfig,
): MicroOperationCoreResult<MicroOperationTrace> {
  if (config === null || typeof config !== 'object' || Array.isArray(config)) {
    return failure('invalid-config', 'Micro-operation config must be an object.');
  }
  if (config.schedule !== 'parallel-5' && config.schedule !== 'split-6') {
    return failure('invalid-schedule', 'Schedule must be parallel-5 or split-6.');
  }
  if (!isUint16(config.r0)) {
    return failure('invalid-r0', 'R0 must be an unsigned 16-bit integer.');
  }
  if (!isUint16(config.r1)) {
    return failure('invalid-r1', 'R1 must be an unsigned 16-bit integer.');
  }
  if (!isUint16(config.memoryWord)) {
    return failure('invalid-memory-word', 'The target memory word must be an unsigned 16-bit integer.');
  }

  const initialState: MicroOperationState = {
    r0: config.r0,
    r1: config.r1,
    a: null,
    ac: null,
    mar: null,
    mdr: null,
    memoryWord: config.memoryWord,
  };
  let state = cloneState(initialState);
  const steps: MicroOperationStep[] = [];

  for (const spec of SCHEDULES[config.schedule]) {
    const before = cloneState(state);
    const buses = busesFor(spec, before);
    if (!buses.ok) return buses;
    const execution = executeAction(spec.action, before);
    if (!execution.ok) return execution;
    const after = cloneState(execution.value);
    const addressStable = after.mar === config.r1;
    if (!addressStable || (before.mar !== null && buses.value.address.value !== config.r1)) {
      return failure('schedule-invariant', `C${spec.cycle} does not preserve the target address in MAR.`);
    }

    steps.push({
      id: `micro-operations-c${spec.cycle}`,
      cycle: spec.cycle,
      microOperations: [...spec.microOperations],
      controlSignals: [...spec.controlSignals],
      buses: {
        internal: { ...buses.value.internal },
        address: { ...buses.value.address },
        data: { ...buses.value.data },
      },
      before,
      after,
      invariants: {
        singleInternalBusDriver: spec.internalDrivers.length <= 1,
        addressStable,
      },
    });
    state = cloneState(after);
  }

  const finalState = cloneState(state);
  return {
    ok: true,
    value: {
      schedule: config.schedule,
      config: { ...config },
      initialState: cloneState(initialState),
      steps,
      finalState,
      result: {
        address: config.r1,
        valueRead: config.memoryWord,
        valueWritten: finalState.memoryWord,
        r0Unchanged: finalState.r0 === config.r0,
        r1Unchanged: finalState.r1 === config.r1,
      },
    },
  };
}

export const MICRO_OPERATIONS_Q44_PRESET = {
  id: 'cn408-2009-q44',
  sourceQuestionId: 'cn408-2009-q44',
  reviewStatus: 'needs-review',
  config: {
    schedule: 'parallel-5',
    r0: 0x1234,
    r1: 0x0100,
    memoryWord: 0x00ff,
  },
} as const satisfies {
  readonly id: string;
  readonly sourceQuestionId: string;
  readonly reviewStatus: 'needs-review';
  readonly config: MicroOperationConfig;
};
