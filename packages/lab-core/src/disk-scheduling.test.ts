import { describe, expect, it } from 'vitest';

import {
  DISK_Q29_PRESET,
  simulateDiskSchedule,
  type DiskRequest,
  type DiskScheduleConfig,
} from './disk-scheduling';

function requests(tracks: readonly number[]): readonly DiskRequest[] {
  return tracks.map((track, arrivalOrder) => ({
    id: `request-${arrivalOrder}`,
    track,
    arrivalOrder,
  }));
}

function config(overrides: Partial<DiskScheduleConfig> = {}): DiskScheduleConfig {
  return {
    policy: 'fcfs',
    requests: requests([35, 45, 12, 68, 110, 180, 170, 195]),
    initialTrack: 105,
    direction: 'increasing',
    ...overrides,
  };
}

describe('Q29 SCAN preset', () => {
  it('returns the exact service order without inventing an unknown disk boundary', () => {
    const trace = simulateDiskSchedule(DISK_Q29_PRESET.config);

    expect(DISK_Q29_PRESET).toMatchObject({
      sourceQuestionId: 'cn408-2009-q29',
      reviewStatus: 'needs-review',
      expectedServiceOrder: [110, 170, 180, 195, 68, 45, 35, 12],
    });
    expect(trace.serviceOrder).toEqual(DISK_Q29_PRESET.expectedServiceOrder);
    expect(trace.totalHeadMovement).toBeNull();
    expect(trace.events.filter((event) => event.kind === 'service').every(
      (event) => event.distance === null && event.fromTrack === null,
    )).toBe(true);
    expect(trace.events.map((event) => event.kind)).toEqual([
      'service', 'service', 'service', 'service',
      'reach-boundary', 'reverse',
      'service', 'service', 'service', 'service',
    ]);
    expect(trace.events[4]).toMatchObject({
      kind: 'reach-boundary',
      boundary: 'max',
      track: null,
      fromTrack: null,
      distance: null,
    });
    expect(trace.events[5]).toMatchObject({
      kind: 'reverse',
      atTrack: null,
      fromDirection: 'increasing',
      toDirection: 'decreasing',
    });
  });

  it('computes physical movement only when SCAN bounds are explicit', () => {
    const trace = simulateDiskSchedule({
      ...DISK_Q29_PRESET.config,
      bounds: { minTrack: 0, maxTrack: 199 },
    });

    expect(trace.serviceOrder).toEqual([110, 170, 180, 195, 68, 45, 35, 12]);
    expect(trace.totalHeadMovement).toBe(281);
    expect(trace.events[4]).toMatchObject({
      kind: 'reach-boundary',
      boundary: 'max',
      track: 199,
      fromTrack: 195,
      distance: 4,
    });
    expect(trace.events[5]).toMatchObject({ kind: 'reverse', atTrack: 199 });
  });
});

describe('deterministic disk policies', () => {
  it('keeps FCFS in arrival order even when the input array is shuffled', () => {
    const trace = simulateDiskSchedule(config({
      requests: [
        { id: 'third', track: 30, arrivalOrder: 2 },
        { id: 'first', track: 10, arrivalOrder: 0 },
        { id: 'second', track: 20, arrivalOrder: 1 },
      ],
      initialTrack: 0,
    }));

    expect(trace.servicedRequestIds).toEqual(['first', 'second', 'third']);
    expect(trace.serviceOrder).toEqual([10, 20, 30]);
    expect(trace.totalHeadMovement).toBe(30);
    expect(trace.events.map((event) => event.kind)).toEqual(['service', 'service', 'service']);
  });

  it('uses arrival order then request id for SSTF ties and services duplicate tracks', () => {
    const trace = simulateDiskSchedule(config({
      policy: 'sstf',
      initialTrack: 50,
      requests: [
        { id: 'right', track: 60, arrivalOrder: 1 },
        { id: 'left-b', track: 40, arrivalOrder: 2 },
        { id: 'same', track: 50, arrivalOrder: 9 },
        { id: 'left-a', track: 40, arrivalOrder: 0 },
        { id: 'left-c', track: 40, arrivalOrder: 2 },
      ],
    }));

    expect(trace.servicedRequestIds).toEqual(['same', 'left-a', 'left-b', 'left-c', 'right']);
    expect(trace.serviceOrder).toEqual([50, 40, 40, 40, 60]);
    expect(trace.totalHeadMovement).toBe(30);
    expect(trace.events.filter((event) => event.kind === 'service').map(
      (event) => event.distance,
    )).toEqual([0, 10, 0, 0, 20]);
  });

  it('implements LOOK by reversing at the last request rather than a physical boundary', () => {
    const trace = simulateDiskSchedule(config({ policy: 'look' }));

    expect(trace.serviceOrder).toEqual([110, 170, 180, 195, 68, 45, 35, 12]);
    expect(trace.totalHeadMovement).toBe(273);
    expect(trace.events.some((event) => event.kind === 'reach-boundary')).toBe(false);
    expect(trace.events.find((event) => event.kind === 'reverse')).toMatchObject({
      kind: 'reverse',
      atTrack: 195,
      fromDirection: 'increasing',
      toDirection: 'decreasing',
    });
  });

  it('implements increasing C-SCAN with a physical boundary and wrap', () => {
    const trace = simulateDiskSchedule(config({
      policy: 'c-scan',
      bounds: { minTrack: 0, maxTrack: 199 },
    }));

    expect(trace.serviceOrder).toEqual([110, 170, 180, 195, 12, 35, 45, 68]);
    expect(trace.totalHeadMovement).toBe(361);
    expect(trace.events.filter((event) => event.kind === 'reverse')).toHaveLength(0);
    expect(trace.events.find((event) => event.kind === 'reach-boundary')).toMatchObject({
      kind: 'reach-boundary',
      boundary: 'max',
      track: 199,
      distance: 4,
    });
    expect(trace.events.find((event) => event.kind === 'wrap')).toMatchObject({
      kind: 'wrap',
      fromTrack: 199,
      toTrack: 0,
      distance: 199,
    });
  });

  it.each([
    ['scan', [40, 20, 60, 80], 130, ['reach-boundary', 'reverse']],
    ['look', [40, 20, 60, 80], 90, ['reverse']],
    ['c-scan', [40, 20, 80, 60], 188, ['reach-boundary', 'wrap']],
  ] as const)(
    'honors decreasing direction for %s',
    (policy, expectedOrder, expectedMovement, structuralEvents) => {
      const trace = simulateDiskSchedule({
        policy,
        requests: requests([20, 40, 60, 80]),
        initialTrack: 50,
        direction: 'decreasing',
        bounds: { minTrack: 0, maxTrack: 99 },
      });

      expect(trace.serviceOrder).toEqual(expectedOrder);
      expect(trace.totalHeadMovement).toBe(expectedMovement);
      expect(trace.events.filter((event) => event.kind !== 'service').map(
        (event) => event.kind,
      )).toEqual(structuralEvents);
    },
  );
});

describe('disk scheduling validation', () => {
  it.each([
    ['negative minimum', { bounds: { minTrack: -1, maxTrack: 100 } }],
    ['reversed bounds', { bounds: { minTrack: 100, maxTrack: 10 } }],
    ['initial track outside bounds', { initialTrack: 101, bounds: { minTrack: 0, maxTrack: 100 } }],
    ['request outside bounds', {
      requests: [{ id: 'outside', track: 101, arrivalOrder: 0 }],
      bounds: { minTrack: 0, maxTrack: 100 },
    }],
  ] satisfies ReadonlyArray<readonly [string, Partial<DiskScheduleConfig>]>) (
    'rejects %s',
    (_label, overrides) => {
      expect(() => simulateDiskSchedule(config(overrides))).toThrow(/bound|track/u);
    },
  );

  it('requires physical bounds for C-SCAN', () => {
    expect(() => simulateDiskSchedule(config({ policy: 'c-scan' }))).toThrow(/bounds/u);
  });

  it('rejects duplicate ids and invalid request metadata', () => {
    expect(() => simulateDiskSchedule(config({
      requests: [
        { id: 'same', track: 1, arrivalOrder: 0 },
        { id: 'same', track: 2, arrivalOrder: 1 },
      ],
    }))).toThrow(/id/u);
    expect(() => simulateDiskSchedule(config({
      requests: [{ id: 'bad-track', track: 1.5, arrivalOrder: 0 }],
    }))).toThrow(/track/u);
    expect(() => simulateDiskSchedule(config({
      requests: [{ id: 'bad-arrival', track: 1, arrivalOrder: -1 }],
    }))).toThrow(/arrivalOrder/u);
  });
});
