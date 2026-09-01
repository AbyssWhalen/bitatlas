import { describe, expect, it } from 'vitest';

import {
  analyzeSingleResourceDeadlock,
  SINGLE_RESOURCE_Q25_PRESET,
  type SingleResourceDeadlockConfig,
} from './single-resource-deadlock';

function config(
  overrides: Partial<SingleResourceDeadlockConfig> = {},
): SingleResourceDeadlockConfig {
  return {
    totalResources: 8,
    processCount: 4,
    maxDemandPerProcess: 3,
    ...overrides,
  };
}

describe('Q25 single-resource deadlock preset', () => {
  it('replays the exact extreme allocation behind K = 4', () => {
    const analysis = analyzeSingleResourceDeadlock(SINGLE_RESOURCE_Q25_PRESET.config);

    expect(SINGLE_RESOURCE_Q25_PRESET).toMatchObject({
      id: 'cn408-2009-q25',
      sourceQuestionId: 'cn408-2009-q25',
      reviewStatus: 'needs-review',
      expectedMinimumProcessCount: 4,
    });
    expect(analysis.minimumProcessCountForDeadlock).toBe(4);
    expect(analysis.guaranteedSafeResourceCount).toBe(9);
    expect(analysis.deadlockPossible).toBe(true);
    expect(analysis.trace.initialState.availableResources).toBe(0);
    expect(analysis.trace.initialState.processes.map((process) => ({
      allocated: process.allocatedResources,
      remaining: process.remainingNeed,
      status: process.status,
    }))).toEqual([
      { allocated: 2, remaining: 1, status: 'waiting' },
      { allocated: 2, remaining: 1, status: 'waiting' },
      { allocated: 2, remaining: 1, status: 'waiting' },
      { allocated: 2, remaining: 1, status: 'waiting' },
    ]);
    expect(analysis.trace.steps.map((step) => step.kind)).toEqual(['deadlock-detected']);
    expect(analysis.trace.finalState).toEqual(analysis.trace.initialState);
  });

  it('shows why three processes are safe with the same eight printers', () => {
    const analysis = analyzeSingleResourceDeadlock(config({ processCount: 3 }));

    expect(analysis.minimumProcessCountForDeadlock).toBe(4);
    expect(analysis.guaranteedSafeResourceCount).toBe(7);
    expect(analysis.deadlockPossible).toBe(false);
    expect(analysis.trace.initialState.availableResources).toBe(2);
    expect(analysis.trace.initialState.processes.map((process) => process.allocatedResources))
      .toEqual([2, 2, 2]);
    expect(analysis.trace.initialState.processes.every((process) => process.status === 'ready'))
      .toBe(true);
    expect(analysis.trace.steps.map((step) => `${step.kind}:${step.processId ?? '-'}`)).toEqual([
      'grant:P1',
      'complete:P1',
      'grant:P2',
      'complete:P2',
      'grant:P3',
      'complete:P3',
    ]);
    expect(analysis.trace.finalState.availableResources).toBe(8);
    expect(analysis.trace.finalState.processes.every(
      (process) => process.status === 'completed' && process.allocatedResources === 0,
    )).toBe(true);
  });
});

describe('single-resource deadlock analysis', () => {
  it('builds a deterministic deadlock subset when the resources do not divide evenly', () => {
    const analysis = analyzeSingleResourceDeadlock(config({
      totalResources: 5,
      processCount: 3,
      maxDemandPerProcess: 3,
    }));

    expect(analysis.minimumProcessCountForDeadlock).toBe(3);
    expect(analysis.deadlockParticipantCount).toBe(3);
    expect(analysis.trace.initialState.processes.map((process) => process.allocatedResources))
      .toEqual([2, 2, 1]);
    expect(analysis.trace.initialState.processes.map((process) => process.remainingNeed))
      .toEqual([1, 1, 2]);
    expect(analysis.trace.initialState.availableResources).toBe(0);
  });

  it('does not pull extra processes into the minimal deadlocked subset', () => {
    const analysis = analyzeSingleResourceDeadlock(config({ processCount: 5 }));

    expect(analysis.deadlockParticipantCount).toBe(4);
    expect(analysis.trace.initialState.processes.at(-1)).toMatchObject({
      id: 'P5',
      allocatedResources: 0,
      remainingNeed: 3,
      status: 'not-participating',
    });
  });

  it('treats a maximum demand of one as incapable of hold-and-wait deadlock', () => {
    const analysis = analyzeSingleResourceDeadlock(config({
      totalResources: 4,
      processCount: 8,
      maxDemandPerProcess: 1,
    }));

    expect(analysis.minimumProcessCountForDeadlock).toBeNull();
    expect(analysis.deadlockParticipantCount).toBe(0);
    expect(analysis.guaranteedSafeResourceCount).toBe(1);
    expect(analysis.deadlockPossible).toBe(false);
    expect(analysis.trace.finalState.availableResources).toBe(4);
    expect(analysis.trace.finalState.processes.every((process) => process.status === 'completed'))
      .toBe(true);
  });

  it('is deterministic and never mutates a frozen config', () => {
    const frozen = Object.freeze(config({ totalResources: 17, processCount: 6, maxDemandPerProcess: 4 }));

    const first = analyzeSingleResourceDeadlock(frozen);
    const second = analyzeSingleResourceDeadlock(frozen);

    expect(second).toEqual(first);
    expect(frozen).toEqual({ totalResources: 17, processCount: 6, maxDemandPerProcess: 4 });
  });

  it.each([
    [2, 2, 2],
    [5, 3, 3],
    [8, 3, 4],
    [17, 4, 6],
    [4096, 4096, 2],
  ] as const)(
    'changes from safe to deadlock exactly at Kmin for R=%i and M=%i',
    (totalResources, maxDemandPerProcess, expectedMinimum) => {
      const below = analyzeSingleResourceDeadlock({
        totalResources,
        processCount: expectedMinimum - 1,
        maxDemandPerProcess,
      });
      const atBoundary = analyzeSingleResourceDeadlock({
        totalResources,
        processCount: expectedMinimum,
        maxDemandPerProcess,
      });

      expect(below.minimumProcessCountForDeadlock).toBe(expectedMinimum);
      expect(below.deadlockPossible).toBe(false);
      expect(atBoundary.minimumProcessCountForDeadlock).toBe(expectedMinimum);
      expect(atBoundary.deadlockPossible).toBe(true);
    },
  );

  it('preserves resource conservation and process bounds in every replay state', () => {
    const analyses = [
      analyzeSingleResourceDeadlock(config({ processCount: 3 })),
      analyzeSingleResourceDeadlock(config()),
      analyzeSingleResourceDeadlock(config({
        totalResources: 1,
        processCount: 1,
        maxDemandPerProcess: 1,
      })),
    ];

    for (const analysis of analyses) {
      const states = [
        analysis.trace.initialState,
        ...analysis.trace.steps.map((step) => step.state),
        analysis.trace.finalState,
      ];
      expect(analysis.trace.steps.map((step) => step.sequence)).toEqual(
        analysis.trace.steps.map((_step, index) => index),
      );
      for (const state of states) {
        expect(state.availableResources).toBeGreaterThanOrEqual(0);
        expect(state.availableResources + state.processes.reduce(
          (total, process) => total + process.allocatedResources,
          0,
        )).toBe(analysis.config.totalResources);
        for (const process of state.processes) {
          expect(Number.isInteger(process.allocatedResources)).toBe(true);
          expect(process.allocatedResources).toBeGreaterThanOrEqual(0);
          expect(process.allocatedResources).toBeLessThanOrEqual(
            analysis.config.maxDemandPerProcess,
          );
          expect(process.remainingNeed).toBeGreaterThanOrEqual(0);
          expect(process.remainingNeed).toBeLessThanOrEqual(
            analysis.config.maxDemandPerProcess,
          );
        }
      }
    }
  });

  it.each([
    ['zero resources', { totalResources: 0 }],
    ['fractional resources', { totalResources: 8.5 }],
    ['too many resources', { totalResources: 4097 }],
    ['zero processes', { processCount: 0 }],
    ['too many processes', { processCount: 257 }],
    ['zero maximum demand', { maxDemandPerProcess: 0 }],
    ['claim beyond system capacity', { maxDemandPerProcess: 9 }],
  ] satisfies ReadonlyArray<readonly [string, Partial<SingleResourceDeadlockConfig>]>) (
    'rejects %s',
    (_label, overrides) => {
      expect(() => analyzeSingleResourceDeadlock(config(overrides))).toThrow(
        /totalResources|processCount|maxDemandPerProcess/u,
      );
    },
  );
});
