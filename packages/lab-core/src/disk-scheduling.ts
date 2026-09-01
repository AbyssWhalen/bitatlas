export type DiskSchedulingPolicy = 'fcfs' | 'sstf' | 'scan' | 'look' | 'c-scan';

export type DiskDirection = 'increasing' | 'decreasing';

export interface DiskRequest {
  readonly id: string;
  readonly track: number;
  readonly arrivalOrder: number;
}

export interface DiskBounds {
  readonly minTrack: number;
  readonly maxTrack: number;
}

export interface DiskScheduleConfig {
  readonly policy: DiskSchedulingPolicy;
  readonly requests: readonly DiskRequest[];
  readonly initialTrack: number;
  readonly direction: DiskDirection;
  readonly bounds?: DiskBounds;
}

interface DiskScheduleEventBase {
  readonly id: string;
  readonly sequence: number;
}

export interface DiskServiceEvent extends DiskScheduleEventBase {
  readonly kind: 'service';
  readonly requestId: string;
  readonly arrivalOrder: number;
  readonly track: number;
  readonly direction: DiskDirection;
  readonly fromTrack: number | null;
  readonly distance: number | null;
}

export interface DiskReachBoundaryEvent extends DiskScheduleEventBase {
  readonly kind: 'reach-boundary';
  readonly boundary: 'min' | 'max';
  readonly direction: DiskDirection;
  readonly fromTrack: number | null;
  readonly track: number | null;
  readonly distance: number | null;
}

export interface DiskReverseEvent extends DiskScheduleEventBase {
  readonly kind: 'reverse';
  readonly atTrack: number | null;
  readonly fromDirection: DiskDirection;
  readonly toDirection: DiskDirection;
}

export interface DiskWrapEvent extends DiskScheduleEventBase {
  readonly kind: 'wrap';
  readonly direction: DiskDirection;
  readonly fromTrack: number;
  readonly toTrack: number;
  readonly distance: number;
}

export type DiskScheduleEvent =
  | DiskServiceEvent
  | DiskReachBoundaryEvent
  | DiskReverseEvent
  | DiskWrapEvent;

export interface DiskScheduleTrace {
  readonly policy: DiskSchedulingPolicy;
  readonly initialTrack: number;
  readonly initialDirection: DiskDirection;
  readonly bounds: DiskBounds | null;
  readonly events: readonly DiskScheduleEvent[];
  readonly servicedRequestIds: readonly string[];
  readonly serviceOrder: readonly number[];
  readonly totalHeadMovement: number | null;
  readonly finalTrack: number;
  readonly finalDirection: DiskDirection;
}

const policies: ReadonlySet<string> = new Set(['fcfs', 'sstf', 'scan', 'look', 'c-scan']);
const directions: ReadonlySet<string> = new Set(['increasing', 'decreasing']);

function assertNonNegativeSafeInteger(value: number, label: string): void {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new RangeError(`${label} must be a non-negative safe integer`);
  }
}

function compareStrings(left: string, right: string): number {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}

function compareStable(left: DiskRequest, right: DiskRequest): number {
  return left.arrivalOrder - right.arrivalOrder || compareStrings(left.id, right.id);
}

function orderByTrack(
  requests: readonly DiskRequest[],
  direction: DiskDirection,
): readonly DiskRequest[] {
  return [...requests].sort((left, right) => {
    const trackOrder = direction === 'increasing'
      ? left.track - right.track
      : right.track - left.track;
    return trackOrder || compareStable(left, right);
  });
}

function validateConfig(config: DiskScheduleConfig): void {
  if (!policies.has(config.policy)) {
    throw new RangeError(`unsupported disk scheduling policy: ${String(config.policy)}`);
  }
  if (!directions.has(config.direction)) {
    throw new RangeError(`unsupported disk direction: ${String(config.direction)}`);
  }
  assertNonNegativeSafeInteger(config.initialTrack, 'initialTrack');
  if (!Array.isArray(config.requests)) {
    throw new TypeError('requests must be an array');
  }

  let bounds: DiskBounds | undefined;
  if (config.bounds !== undefined) {
    assertNonNegativeSafeInteger(config.bounds.minTrack, 'bounds.minTrack');
    assertNonNegativeSafeInteger(config.bounds.maxTrack, 'bounds.maxTrack');
    if (config.bounds.minTrack > config.bounds.maxTrack) {
      throw new RangeError('bounds.minTrack cannot exceed bounds.maxTrack');
    }
    if (config.initialTrack < config.bounds.minTrack || config.initialTrack > config.bounds.maxTrack) {
      throw new RangeError('initialTrack must be within bounds');
    }
    bounds = config.bounds;
  }
  if (config.policy === 'c-scan' && bounds === undefined) {
    throw new RangeError('C-SCAN requires physical disk bounds');
  }

  const ids = new Set<string>();
  for (let index = 0; index < config.requests.length; index += 1) {
    const request = config.requests[index];
    if (request === undefined || typeof request !== 'object') {
      throw new TypeError(`requests[${index}] must be a request`);
    }
    if (typeof request.id !== 'string' || request.id.trim().length === 0) {
      throw new TypeError(`requests[${index}].id must be a non-empty string`);
    }
    if (ids.has(request.id)) {
      throw new RangeError(`duplicate request id: ${request.id}`);
    }
    ids.add(request.id);
    assertNonNegativeSafeInteger(request.track, `requests[${index}].track`);
    assertNonNegativeSafeInteger(request.arrivalOrder, `requests[${index}].arrivalOrder`);
    if (bounds !== undefined && (request.track < bounds.minTrack || request.track > bounds.maxTrack)) {
      throw new RangeError(`requests[${index}].track must be within bounds`);
    }
  }
}

function oppositeDirection(direction: DiskDirection): DiskDirection {
  return direction === 'increasing' ? 'decreasing' : 'increasing';
}

function directionBetween(
  fromTrack: number,
  toTrack: number,
  fallback: DiskDirection,
): DiskDirection {
  if (toTrack > fromTrack) return 'increasing';
  if (toTrack < fromTrack) return 'decreasing';
  return fallback;
}

function safeDistance(fromTrack: number, toTrack: number): number {
  const distance = Math.abs(toTrack - fromTrack);
  if (!Number.isSafeInteger(distance)) {
    throw new RangeError('disk head movement exceeds safe integer precision');
  }
  return distance;
}

function safeAddMovement(total: number, distance: number): number {
  const next = total + distance;
  if (!Number.isSafeInteger(next)) {
    throw new RangeError('total disk head movement exceeds safe integer precision');
  }
  return next;
}

export function simulateDiskSchedule(config: DiskScheduleConfig): DiskScheduleTrace {
  validateConfig(config);

  const events: DiskScheduleEvent[] = [];
  const servicedRequestIds: string[] = [];
  const serviceOrder: number[] = [];
  let currentTrack = config.initialTrack;
  let currentDirection = config.direction;
  let totalMovement = 0;

  const nextEventId = (kind: DiskScheduleEvent['kind']): string => `${events.length}-${kind}`;

  const pushKnownService = (request: DiskRequest): void => {
    const fromTrack = currentTrack;
    const distance = safeDistance(fromTrack, request.track);
    currentDirection = directionBetween(fromTrack, request.track, currentDirection);
    totalMovement = safeAddMovement(totalMovement, distance);
    events.push({
      id: nextEventId('service'),
      sequence: events.length,
      kind: 'service',
      requestId: request.id,
      arrivalOrder: request.arrivalOrder,
      track: request.track,
      direction: currentDirection,
      fromTrack,
      distance,
    });
    currentTrack = request.track;
    servicedRequestIds.push(request.id);
    serviceOrder.push(request.track);
  };

  const pushOrderOnlyService = (request: DiskRequest, direction: DiskDirection): void => {
    currentDirection = direction;
    events.push({
      id: nextEventId('service'),
      sequence: events.length,
      kind: 'service',
      requestId: request.id,
      arrivalOrder: request.arrivalOrder,
      track: request.track,
      direction,
      fromTrack: null,
      distance: null,
    });
    currentTrack = request.track;
    servicedRequestIds.push(request.id);
    serviceOrder.push(request.track);
  };

  const pushKnownBoundary = (boundary: 'min' | 'max', bounds: DiskBounds): void => {
    const targetTrack = boundary === 'min' ? bounds.minTrack : bounds.maxTrack;
    const fromTrack = currentTrack;
    const distance = safeDistance(fromTrack, targetTrack);
    totalMovement = safeAddMovement(totalMovement, distance);
    events.push({
      id: nextEventId('reach-boundary'),
      sequence: events.length,
      kind: 'reach-boundary',
      boundary,
      direction: currentDirection,
      fromTrack,
      track: targetTrack,
      distance,
    });
    currentTrack = targetTrack;
  };

  const pushUnknownBoundary = (boundary: 'min' | 'max'): void => {
    events.push({
      id: nextEventId('reach-boundary'),
      sequence: events.length,
      kind: 'reach-boundary',
      boundary,
      direction: currentDirection,
      fromTrack: null,
      track: null,
      distance: null,
    });
  };

  const pushReverse = (atTrack: number | null): void => {
    const fromDirection = currentDirection;
    currentDirection = oppositeDirection(currentDirection);
    events.push({
      id: nextEventId('reverse'),
      sequence: events.length,
      kind: 'reverse',
      atTrack,
      fromDirection,
      toDirection: currentDirection,
    });
  };

  const pushWrap = (bounds: DiskBounds): void => {
    const fromTrack = currentTrack;
    const toTrack = currentDirection === 'increasing' ? bounds.minTrack : bounds.maxTrack;
    const distance = safeDistance(fromTrack, toTrack);
    totalMovement = safeAddMovement(totalMovement, distance);
    events.push({
      id: nextEventId('wrap'),
      sequence: events.length,
      kind: 'wrap',
      direction: currentDirection,
      fromTrack,
      toTrack,
      distance,
    });
    currentTrack = toTrack;
  };

  const stableRequests = [...config.requests].sort(compareStable);

  if (config.policy === 'fcfs') {
    stableRequests.forEach(pushKnownService);
  } else if (config.policy === 'sstf') {
    const pending = [...stableRequests];
    while (pending.length > 0) {
      pending.sort((left, right) => (
        safeDistance(currentTrack, left.track) - safeDistance(currentTrack, right.track)
        || compareStable(left, right)
      ));
      pushKnownService(pending.shift()!);
    }
  } else {
    const atCurrent = stableRequests.filter((request) => request.track === config.initialTrack);
    const lower = stableRequests.filter((request) => request.track < config.initialTrack);
    const higher = stableRequests.filter((request) => request.track > config.initialTrack);
    const primary = config.direction === 'increasing'
      ? orderByTrack(higher, 'increasing')
      : orderByTrack(lower, 'decreasing');
    const reverseSecondary = config.direction === 'increasing'
      ? orderByTrack(lower, 'decreasing')
      : orderByTrack(higher, 'increasing');
    const circularSecondary = config.direction === 'increasing'
      ? orderByTrack(lower, 'increasing')
      : orderByTrack(higher, 'decreasing');

    if (config.policy === 'scan' && config.bounds === undefined) {
      atCurrent.forEach((request) => pushOrderOnlyService(request, config.direction));
      primary.forEach((request) => pushOrderOnlyService(request, config.direction));
      if (reverseSecondary.length > 0) {
        pushUnknownBoundary(config.direction === 'increasing' ? 'max' : 'min');
        pushReverse(null);
        reverseSecondary.forEach((request) => pushOrderOnlyService(request, currentDirection));
      }
    } else {
      atCurrent.forEach(pushKnownService);
      primary.forEach(pushKnownService);

      if (config.policy === 'look' && reverseSecondary.length > 0) {
        pushReverse(currentTrack);
        reverseSecondary.forEach(pushKnownService);
      } else if (config.policy === 'scan' && reverseSecondary.length > 0) {
        pushKnownBoundary(config.direction === 'increasing' ? 'max' : 'min', config.bounds!);
        pushReverse(currentTrack);
        reverseSecondary.forEach(pushKnownService);
      } else if (config.policy === 'c-scan' && circularSecondary.length > 0) {
        pushKnownBoundary(config.direction === 'increasing' ? 'max' : 'min', config.bounds!);
        pushWrap(config.bounds!);
        circularSecondary.forEach(pushKnownService);
      }
    }
  }

  return {
    policy: config.policy,
    initialTrack: config.initialTrack,
    initialDirection: config.direction,
    bounds: config.bounds === undefined ? null : { ...config.bounds },
    events,
    servicedRequestIds,
    serviceOrder,
    totalHeadMovement: config.policy === 'scan' && config.bounds === undefined
      ? null
      : totalMovement,
    finalTrack: currentTrack,
    finalDirection: currentDirection,
  };
}

const q29Tracks = [35, 45, 12, 68, 110, 180, 170, 195] as const;

export const DISK_Q29_PRESET = {
  sourceQuestionId: 'cn408-2009-q29',
  reviewStatus: 'needs-review',
  config: {
    policy: 'scan',
    requests: q29Tracks.map((track, arrivalOrder) => ({
      id: `cn408-2009-q29-request-${arrivalOrder + 1}`,
      track,
      arrivalOrder,
    })),
    initialTrack: 105,
    direction: 'increasing',
  },
  expectedServiceOrder: [110, 170, 180, 195, 68, 45, 35, 12],
} as const satisfies {
  readonly sourceQuestionId: string;
  readonly reviewStatus: 'needs-review';
  readonly config: DiskScheduleConfig;
  readonly expectedServiceOrder: readonly number[];
};
