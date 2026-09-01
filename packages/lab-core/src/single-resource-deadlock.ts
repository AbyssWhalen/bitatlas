export interface SingleResourceDeadlockConfig {
  readonly totalResources: number;
  readonly processCount: number;
  readonly maxDemandPerProcess: number;
}

export type SingleResourceProcessStatus =
  | 'waiting'
  | 'ready'
  | 'running'
  | 'completed'
  | 'not-participating';

export interface SingleResourceProcessState {
  readonly id: string;
  readonly allocatedResources: number;
  readonly remainingNeed: number;
  readonly status: SingleResourceProcessStatus;
}

export interface SingleResourceDeadlockState {
  readonly availableResources: number;
  readonly processes: readonly SingleResourceProcessState[];
}

export type SingleResourceDeadlockStepKind = 'grant' | 'complete' | 'deadlock-detected';

export interface SingleResourceDeadlockTraceStep {
  readonly sequence: number;
  readonly kind: SingleResourceDeadlockStepKind;
  readonly processId?: string;
  readonly resourceCount: number;
  readonly state: SingleResourceDeadlockState;
}

export interface SingleResourceDeadlockTrace {
  readonly initialState: SingleResourceDeadlockState;
  readonly steps: readonly SingleResourceDeadlockTraceStep[];
  readonly finalState: SingleResourceDeadlockState;
}

export interface SingleResourceDeadlockAnalysis {
  readonly config: SingleResourceDeadlockConfig;
  readonly minimumProcessCountForDeadlock: number | null;
  readonly guaranteedSafeResourceCount: number;
  readonly deadlockPossible: boolean;
  readonly deadlockParticipantCount: number;
  readonly trace: SingleResourceDeadlockTrace;
}

const MAX_TOTAL_RESOURCES = 4096;
const MAX_PROCESS_COUNT = 256;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function assertIntegerInRange(
  value: unknown,
  label: string,
  maximum: number,
): asserts value is number {
  if (!Number.isSafeInteger(value) || (value as number) < 1 || (value as number) > maximum) {
    throw new RangeError(`${label} must be a safe integer between 1 and ${maximum}`);
  }
}

function validateConfig(config: SingleResourceDeadlockConfig): void {
  if (!isRecord(config)) {
    throw new TypeError('single-resource deadlock config must be an object');
  }
  assertIntegerInRange(config.totalResources, 'totalResources', MAX_TOTAL_RESOURCES);
  assertIntegerInRange(config.processCount, 'processCount', MAX_PROCESS_COUNT);
  assertIntegerInRange(
    config.maxDemandPerProcess,
    'maxDemandPerProcess',
    config.totalResources,
  );
}

function cloneState(state: SingleResourceDeadlockState): SingleResourceDeadlockState {
  return {
    availableResources: state.availableResources,
    processes: state.processes.map((process) => ({ ...process })),
  };
}

function minimumDeadlockProcessCount(
  totalResources: number,
  maxDemandPerProcess: number,
): number | null {
  if (maxDemandPerProcess === 1) return null;
  return Math.ceil(totalResources / (maxDemandPerProcess - 1));
}

function buildInitialState(
  config: SingleResourceDeadlockConfig,
  deadlockParticipantCount: number,
): SingleResourceDeadlockState {
  const allocations = Array.from({ length: config.processCount }, () => 0);

  if (deadlockParticipantCount > 0) {
    let resourcesToAllocate = config.totalResources;
    for (let index = 0; index < deadlockParticipantCount; index += 1) {
      const participantsAfterThis = deadlockParticipantCount - index - 1;
      const allocation = Math.min(
        config.maxDemandPerProcess - 1,
        resourcesToAllocate - participantsAfterThis,
      );
      allocations[index] = allocation;
      resourcesToAllocate -= allocation;
    }
  } else {
    allocations.fill(config.maxDemandPerProcess - 1);
  }

  const allocatedTotal = allocations.reduce((sum, allocation) => sum + allocation, 0);
  return {
    availableResources: config.totalResources - allocatedTotal,
    processes: allocations.map((allocatedResources, index) => {
      const participates = deadlockParticipantCount === 0 || index < deadlockParticipantCount;
      return {
        id: `P${index + 1}`,
        allocatedResources,
        remainingNeed: config.maxDemandPerProcess - allocatedResources,
        status: participates
          ? deadlockParticipantCount === 0 ? 'ready' : 'waiting'
          : 'not-participating',
      };
    }),
  };
}

function replaySafeCompletion(
  initialState: SingleResourceDeadlockState,
): SingleResourceDeadlockTrace {
  const steps: SingleResourceDeadlockTraceStep[] = [];
  let state = cloneState(initialState);

  for (let index = 0; index < state.processes.length; index += 1) {
    const process = state.processes[index]!;
    const granted = process.remainingNeed;
    if (granted > state.availableResources) {
      throw new Error(`safe trace cannot satisfy ${process.id}`);
    }

    state = {
      availableResources: state.availableResources - granted,
      processes: state.processes.map((candidate, candidateIndex) => (
        candidateIndex === index
          ? {
              ...candidate,
              allocatedResources: candidate.allocatedResources + granted,
              remainingNeed: 0,
              status: 'running' as const,
            }
          : { ...candidate }
      )),
    };
    steps.push({
      sequence: steps.length,
      kind: 'grant',
      processId: process.id,
      resourceCount: granted,
      state: cloneState(state),
    });

    const completed = state.processes[index]!;
    const released = completed.allocatedResources;
    state = {
      availableResources: state.availableResources + released,
      processes: state.processes.map((candidate, candidateIndex) => (
        candidateIndex === index
          ? {
              ...candidate,
              allocatedResources: 0,
              remainingNeed: 0,
              status: 'completed' as const,
            }
          : { ...candidate }
      )),
    };
    steps.push({
      sequence: steps.length,
      kind: 'complete',
      processId: process.id,
      resourceCount: released,
      state: cloneState(state),
    });
  }

  return { initialState, steps, finalState: state };
}

export function analyzeSingleResourceDeadlock(
  config: SingleResourceDeadlockConfig,
): SingleResourceDeadlockAnalysis {
  validateConfig(config);

  const normalizedConfig: SingleResourceDeadlockConfig = {
    totalResources: config.totalResources,
    processCount: config.processCount,
    maxDemandPerProcess: config.maxDemandPerProcess,
  };
  const minimumProcessCountForDeadlock = minimumDeadlockProcessCount(
    normalizedConfig.totalResources,
    normalizedConfig.maxDemandPerProcess,
  );
  const guaranteedSafeResourceCount = normalizedConfig.processCount
    * (normalizedConfig.maxDemandPerProcess - 1) + 1;
  const deadlockPossible = minimumProcessCountForDeadlock !== null
    && normalizedConfig.processCount >= minimumProcessCountForDeadlock;
  const deadlockParticipantCount = deadlockPossible
    ? minimumProcessCountForDeadlock
    : 0;
  const initialState = buildInitialState(normalizedConfig, deadlockParticipantCount);
  const trace: SingleResourceDeadlockTrace = deadlockPossible
    ? {
        initialState,
        steps: [{
          sequence: 0,
          kind: 'deadlock-detected',
          resourceCount: 0,
          state: cloneState(initialState),
        }],
        finalState: cloneState(initialState),
      }
    : replaySafeCompletion(initialState);

  return {
    config: normalizedConfig,
    minimumProcessCountForDeadlock,
    guaranteedSafeResourceCount,
    deadlockPossible,
    deadlockParticipantCount,
    trace,
  };
}

export const SINGLE_RESOURCE_Q25_PRESET = {
  id: 'cn408-2009-q25',
  sourceQuestionId: 'cn408-2009-q25',
  reviewStatus: 'needs-review',
  config: {
    totalResources: 8,
    processCount: 4,
    maxDemandPerProcess: 3,
  },
  expectedMinimumProcessCount: 4,
} as const satisfies {
  readonly id: string;
  readonly sourceQuestionId: string;
  readonly reviewStatus: 'needs-review';
  readonly config: SingleResourceDeadlockConfig;
  readonly expectedMinimumProcessCount: number;
};
