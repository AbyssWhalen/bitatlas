export interface HrrnProcess {
  readonly id: string;
  readonly arrivalTime: number;
  readonly serviceTime: number;
}

export interface HrrnSchedulingConfig {
  readonly processes: readonly HrrnProcess[];
}

export interface HrrnCandidate {
  readonly processId: string;
  readonly arrivalTime: number;
  readonly serviceTime: number;
  readonly waitingTime: number;
  readonly responseRatio: number;
}

export type HrrnStepKind = 'initial' | 'idle' | 'evaluate' | 'dispatch' | 'complete';

export interface HrrnStep {
  readonly id: string;
  readonly sequence: number;
  readonly kind: HrrnStepKind;
  readonly time: number;
  readonly fromTime: number | null;
  readonly toTime: number | null;
  readonly processId: string | null;
  readonly candidates: readonly HrrnCandidate[];
  readonly readyProcessIds: readonly string[];
  readonly completedProcessIds: readonly string[];
}

export interface HrrnScheduleEntry {
  readonly processId: string;
  readonly arrivalTime: number;
  readonly serviceTime: number;
  readonly startTime: number;
  readonly endTime: number;
  readonly waitingTime: number;
  readonly turnaroundTime: number;
  readonly responseRatio: number;
}

export interface HrrnSchedulingTrace {
  readonly processes: readonly HrrnProcess[];
  readonly steps: readonly HrrnStep[];
  readonly schedule: readonly HrrnScheduleEntry[];
  readonly totalIdleTime: number;
  readonly finalTime: number;
  readonly averageWaitingTime: number;
  readonly averageTurnaroundTime: number;
}

export const HRRN_MAX_PROCESSES = 12;
export const HRRN_MAX_TIME = 100_000;
export const HRRN_MAX_TOTAL_TIME = 1_000_000;

const q24TeachingProcesses = [
  { id: 'P1', arrivalTime: 0, serviceTime: 3 },
  { id: 'P2', arrivalTime: 1, serviceTime: 5 },
  { id: 'P3', arrivalTime: 2, serviceTime: 2 },
  { id: 'P4', arrivalTime: 4, serviceTime: 1 },
] as const;

export const HRRN_Q24_PRESET = {
  sourceQuestionId: 'cn408-2009-q24',
  reviewStatus: 'needs-review',
  expectedAnswerOptionId: 'D',
  config: { processes: q24TeachingProcesses },
} as const satisfies {
  readonly sourceQuestionId: 'cn408-2009-q24';
  readonly reviewStatus: 'needs-review';
  readonly expectedAnswerOptionId: 'D';
  readonly config: HrrnSchedulingConfig;
};

interface NormalizedProcess extends HrrnProcess {
  readonly order: number;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function assertExactKeys(value: Record<string, unknown>, keys: readonly string[], label: string): void {
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  if (actual.length !== expected.length || actual.some((key, index) => key !== expected[index])) {
    throw new TypeError(`${label} must contain only ${keys.join(', ')}`);
  }
}

function assertTime(value: unknown, label: string, allowZero: boolean): asserts value is number {
  if (!Number.isSafeInteger(value) || (value as number) < (allowZero ? 0 : 1) || (value as number) > HRRN_MAX_TIME) {
    throw new RangeError(`${label} must be a safe integer between ${allowZero ? 0 : 1} and ${HRRN_MAX_TIME}`);
  }
}

function normalizeConfig(config: HrrnSchedulingConfig): readonly NormalizedProcess[] {
  if (!isRecord(config)) throw new TypeError('hrrn scheduling config must be an object');
  assertExactKeys(config, ['processes'], 'config');
  if (!Array.isArray(config.processes) || config.processes.length === 0) {
    throw new RangeError(`processes must contain 1 to ${HRRN_MAX_PROCESSES} items`);
  }
  if (config.processes.length > HRRN_MAX_PROCESSES) {
    throw new RangeError(`processes must contain at most ${HRRN_MAX_PROCESSES} items`);
  }

  const ids = new Set<string>();
  let serviceTotal = 0;
  let latestArrival = 0;
  const normalized = config.processes.map((process, order) => {
    if (!isRecord(process)) throw new TypeError(`processes[${order}] must be an object`);
    assertExactKeys(process, ['id', 'arrivalTime', 'serviceTime'], `processes[${order}]`);
    if (typeof process.id !== 'string' || process.id.trim().length === 0 || process.id.trim().length > 16) {
      throw new TypeError(`processes[${order}].id must be a non-empty string of at most 16 characters`);
    }
    const id = process.id.trim();
    if (ids.has(id)) throw new RangeError(`duplicate process id: ${id}`);
    ids.add(id);
    assertTime(process.arrivalTime, `processes[${order}].arrivalTime`, true);
    assertTime(process.serviceTime, `processes[${order}].serviceTime`, false);
    serviceTotal += process.serviceTime;
    latestArrival = Math.max(latestArrival, process.arrivalTime);
    return { id, arrivalTime: process.arrivalTime, serviceTime: process.serviceTime, order };
  });
  if (!Number.isSafeInteger(serviceTotal) || latestArrival + serviceTotal > HRRN_MAX_TOTAL_TIME) {
    throw new RangeError(`total schedule time must not exceed ${HRRN_MAX_TOTAL_TIME}`);
  }
  return normalized;
}

function compareCandidates(left: HrrnCandidate & { readonly order: number }, right: HrrnCandidate & { readonly order: number }): number {
  const leftNumerator = BigInt(left.waitingTime + left.serviceTime);
  const rightNumerator = BigInt(right.waitingTime + right.serviceTime);
  const leftProduct = leftNumerator * BigInt(right.serviceTime);
  const rightProduct = rightNumerator * BigInt(left.serviceTime);
  if (leftProduct !== rightProduct) return leftProduct > rightProduct ? -1 : 1;
  if (left.arrivalTime !== right.arrivalTime) return left.arrivalTime - right.arrivalTime;
  if (left.order !== right.order) return left.order - right.order;
  return left.processId < right.processId ? -1 : left.processId > right.processId ? 1 : 0;
}

function ratio(waitingTime: number, serviceTime: number): number {
  return (waitingTime + serviceTime) / serviceTime;
}

export function traceHrrnScheduling(config: HrrnSchedulingConfig): HrrnSchedulingTrace {
  const processes = normalizeConfig(config);
  const pending = new Map(processes.map((process) => [process.id, process]));
  const completed: string[] = [];
  const steps: HrrnStep[] = [];
  const schedule: HrrnScheduleEntry[] = [];
  let currentTime = 0;
  let totalIdleTime = 0;

  const readyCandidates = (time: number): readonly (HrrnCandidate & { readonly order: number })[] => (
    [...pending.values()]
      .filter((process) => process.arrivalTime <= time)
      .map((process) => ({
        processId: process.id,
        arrivalTime: process.arrivalTime,
        serviceTime: process.serviceTime,
        waitingTime: time - process.arrivalTime,
        responseRatio: ratio(time - process.arrivalTime, process.serviceTime),
        order: process.order,
      }))
      .sort(compareCandidates)
  );

  const addStep = ({
    kind,
    time,
    fromTime = null,
    toTime = null,
    processId = null,
    candidates = [],
  }: {
    readonly kind: HrrnStepKind;
    readonly time: number;
    readonly fromTime?: number | null;
    readonly toTime?: number | null;
    readonly processId?: string | null;
    readonly candidates?: readonly HrrnCandidate[];
  }): void => {
    steps.push({
      id: `hrrn-${steps.length}-${kind}`,
      sequence: steps.length,
      kind,
      time,
      fromTime,
      toTime,
      processId,
      candidates: candidates.map((candidate) => ({ ...candidate })),
      readyProcessIds: candidates.map((candidate) => candidate.processId),
      completedProcessIds: [...completed],
    });
  };

  addStep({ kind: 'initial', time: 0, candidates: readyCandidates(0) });

  while (pending.size > 0) {
    let candidates = readyCandidates(currentTime);
    if (candidates.length === 0) {
      const nextArrival = Math.min(...[...pending.values()].map((process) => process.arrivalTime));
      if (!Number.isSafeInteger(nextArrival) || nextArrival < currentTime) {
        throw new RangeError('next process arrival time is invalid');
      }
      totalIdleTime += nextArrival - currentTime;
      addStep({ kind: 'idle', time: currentTime, fromTime: currentTime, toTime: nextArrival });
      currentTime = nextArrival;
      candidates = readyCandidates(currentTime);
      addStep({ kind: 'evaluate', time: currentTime, candidates });
    } else if (steps.at(-1)?.kind !== 'initial') {
      addStep({ kind: 'evaluate', time: currentTime, candidates });
    }

    const selected = candidates[0];
    if (selected === undefined) throw new RangeError('no schedulable process is available');
    const process = pending.get(selected.processId);
    if (process === undefined) throw new RangeError(`missing process: ${selected.processId}`);
    const startTime = currentTime;
    const endTime = startTime + process.serviceTime;
    if (!Number.isSafeInteger(endTime) || endTime > HRRN_MAX_TOTAL_TIME) {
      throw new RangeError('process completion time exceeds safe schedule range');
    }
    addStep({ kind: 'dispatch', time: startTime, toTime: endTime, processId: process.id, candidates });
    const entry: HrrnScheduleEntry = {
      processId: process.id,
      arrivalTime: process.arrivalTime,
      serviceTime: process.serviceTime,
      startTime,
      endTime,
      waitingTime: selected.waitingTime,
      turnaroundTime: endTime - process.arrivalTime,
      responseRatio: selected.responseRatio,
    };
    schedule.push(entry);
    currentTime = endTime;
    pending.delete(process.id);
    completed.push(process.id);
    addStep({ kind: 'complete', time: endTime, fromTime: startTime, processId: process.id, candidates });
  }

  const totalWaiting = schedule.reduce((sum, entry) => sum + entry.waitingTime, 0);
  const totalTurnaround = schedule.reduce((sum, entry) => sum + entry.turnaroundTime, 0);
  return {
    processes: processes.map(({ id, arrivalTime, serviceTime }) => ({ id, arrivalTime, serviceTime })),
    steps,
    schedule: schedule.map((entry) => ({ ...entry })),
    totalIdleTime,
    finalTime: currentTime,
    averageWaitingTime: totalWaiting / schedule.length,
    averageTurnaroundTime: totalTurnaround / schedule.length,
  };
}
