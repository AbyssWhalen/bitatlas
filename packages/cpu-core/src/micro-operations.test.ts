import { describe, expect, it } from 'vitest';

import {
  MICRO_OPERATIONS_Q44_PRESET,
  simulateMicroOperations,
  type MicroOperationConfig,
  type MicroOperationCoreResult,
  type MicroOperationTrace,
} from './micro-operations';

function unwrap<T>(result: MicroOperationCoreResult<T>): T {
  expect(result.ok).toBe(true);
  if (!result.ok) throw new Error(result.error.message);
  return result.value;
}

function errorCode(result: MicroOperationCoreResult<MicroOperationTrace>): string {
  expect(result.ok).toBe(false);
  if (result.ok) throw new Error('Expected a micro-operation validation error.');
  return result.error.code;
}

function stepAt(trace: MicroOperationTrace, index: number) {
  const step = trace.steps[index];
  expect(step).toBeDefined();
  if (!step) throw new Error(`Expected micro-operation step at index ${index}.`);
  return step;
}

describe('Q44 micro-operation schedules', () => {
  it('keeps the source-backed preset in needs-review', () => {
    expect(MICRO_OPERATIONS_Q44_PRESET).toMatchObject({
      id: 'cn408-2009-q44',
      sourceQuestionId: 'cn408-2009-q44',
      reviewStatus: 'needs-review',
      config: {
        schedule: 'parallel-5',
      },
    });
  });

  it('replays the five-cycle schedule with legal DB and internal-bus parallelism in C6', () => {
    const trace = unwrap(simulateMicroOperations({
      schedule: 'parallel-5',
      r0: 0x1234,
      r1: 0x0100,
      memoryWord: 0x00ff,
    }));

    expect(trace.initialState).toEqual({
      r0: 0x1234,
      r1: 0x0100,
      a: null,
      ac: null,
      mar: null,
      mdr: null,
      memoryWord: 0x00ff,
    });
    expect(trace.steps.map((step) => ({
      cycle: step.cycle,
      microOperations: step.microOperations,
      controlSignals: step.controlSignals,
    }))).toEqual([
      { cycle: 5, microOperations: ['MAR <- R1'], controlSignals: ['R1out', 'MARin'] },
      {
        cycle: 6,
        microOperations: ['MDR <- M(MAR)', 'A <- R0'],
        controlSignals: ['MemR', 'MDRinE', 'R0out', 'Ain'],
      },
      { cycle: 7, microOperations: ['AC <- MDR + A'], controlSignals: ['MDRout', 'Add', 'ACin'] },
      { cycle: 8, microOperations: ['MDR <- AC'], controlSignals: ['ACout', 'MDRin'] },
      { cycle: 9, microOperations: ['M(MAR) <- MDR'], controlSignals: ['MDRoutE', 'MemW'] },
    ]);

    const c6 = stepAt(trace, 1);
    expect(c6.buses).toEqual({
      internal: { driver: 'R0', value: 0x1234 },
      address: { driver: 'MAR', value: 0x0100 },
      data: { driver: 'memory', value: 0x00ff },
    });
    expect(c6.after).toMatchObject({ a: 0x1234, mdr: 0x00ff, mar: 0x0100 });
    expect(c6.invariants).toEqual({
      singleInternalBusDriver: true,
      addressStable: true,
    });
    expect(trace.finalState).toEqual({
      r0: 0x1234,
      r1: 0x0100,
      a: 0x1234,
      ac: 0x1333,
      mar: 0x0100,
      mdr: 0x1333,
      memoryWord: 0x1333,
    });
  });

  it('replays the six-cycle schedule without inventing parallel internal-bus work', () => {
    const trace = unwrap(simulateMicroOperations({
      schedule: 'split-6',
      r0: 0x1234,
      r1: 0x0100,
      memoryWord: 0x00ff,
    }));

    expect(trace.steps.map((step) => ({
      cycle: step.cycle,
      microOperations: step.microOperations,
      controlSignals: step.controlSignals,
    }))).toEqual([
      { cycle: 5, microOperations: ['MAR <- R1'], controlSignals: ['R1out', 'MARin'] },
      { cycle: 6, microOperations: ['MDR <- M(MAR)'], controlSignals: ['MemR', 'MDRinE'] },
      { cycle: 7, microOperations: ['A <- MDR'], controlSignals: ['MDRout', 'Ain'] },
      { cycle: 8, microOperations: ['AC <- A + R0'], controlSignals: ['R0out', 'Add', 'ACin'] },
      { cycle: 9, microOperations: ['MDR <- AC'], controlSignals: ['ACout', 'MDRin'] },
      { cycle: 10, microOperations: ['M(MAR) <- MDR'], controlSignals: ['MDRoutE', 'MemW'] },
    ]);
    expect(stepAt(trace, 1).buses.internal.driver).toBeNull();
    expect(stepAt(trace, 2).after.a).toBe(0x00ff);
    expect(trace.finalState).toEqual({
      r0: 0x1234,
      r1: 0x0100,
      a: 0x00ff,
      ac: 0x1333,
      mar: 0x0100,
      mdr: 0x1333,
      memoryWord: 0x1333,
    });
  });

  it('keeps both source-backed schedules terminally equivalent while preserving R0 and R1', () => {
    const config = { r0: 0xabcd, r1: 0x2000, memoryWord: 0x4321 } as const;
    const parallel = unwrap(simulateMicroOperations({ schedule: 'parallel-5', ...config }));
    const split = unwrap(simulateMicroOperations({ schedule: 'split-6', ...config }));

    expect(parallel.result).toEqual(split.result);
    expect(parallel.result).toEqual({
      address: 0x2000,
      valueRead: 0x4321,
      valueWritten: 0xee_ee,
      r0Unchanged: true,
      r1Unchanged: true,
    });
    expect(parallel.finalState.memoryWord).toBe(split.finalState.memoryWord);
  });

  it('uses unsigned 16-bit modular addition', () => {
    const trace = unwrap(simulateMicroOperations({
      schedule: 'parallel-5',
      r0: 0xffff,
      r1: 0xffff,
      memoryWord: 2,
    }));

    expect(trace.finalState).toMatchObject({ ac: 1, mdr: 1, memoryWord: 1 });
    expect(trace.result.valueWritten).toBe(1);
  });

  it.each(['parallel-5', 'split-6'] as const)(
    'keeps one internal-bus driver, a stable address, and writeback last for %s',
    (schedule) => {
      const trace = unwrap(simulateMicroOperations({
        schedule,
        r0: 7,
        r1: 9,
        memoryWord: 11,
      }));

      expect(trace.steps.every((step) => step.invariants.singleInternalBusDriver)).toBe(true);
      expect(trace.steps.every((step) => step.invariants.addressStable)).toBe(true);
      expect(stepAt(trace, 0).buses.address).toEqual({ driver: 'MAR', value: null });
      expect(trace.steps.slice(1).every((step) => (
        step.buses.address.driver === 'MAR' && step.buses.address.value === 9
      ))).toBe(true);
      expect(trace.steps.filter((step) => step.buses.data.driver === 'memory'))
        .toHaveLength(1);
      expect(trace.steps.filter((step) => step.buses.data.driver === 'MDR'))
        .toHaveLength(1);
      expect(trace.steps.at(-1)?.microOperations).toEqual(['M(MAR) <- MDR']);
      expect(trace.steps.slice(0, -1).every((step) => step.after.memoryWord === 11)).toBe(true);
    },
  );

  it('is deterministic, does not mutate frozen input, and isolates snapshots', () => {
    const config: MicroOperationConfig = Object.freeze({
      schedule: 'parallel-5',
      r0: 13,
      r1: 17,
      memoryWord: 19,
    });
    const configSnapshot = structuredClone(config);
    const first = unwrap(simulateMicroOperations(config));
    const firstSnapshot = structuredClone(first);
    const second = unwrap(simulateMicroOperations(config));

    expect(second).toEqual(firstSnapshot);
    expect(config).toEqual(configSnapshot);
    expect(first.config).not.toBe(config);
    expect(first.initialState).not.toBe(stepAt(first, 0).before);
    expect(first.steps).not.toBe(second.steps);
    expect(stepAt(first, 0).before).not.toBe(stepAt(first, 0).after);
    expect(stepAt(first, 0).after).not.toBe(stepAt(first, 1).before);
    expect(stepAt(first, 1).microOperations).not.toBe(stepAt(second, 1).microOperations);
    expect(stepAt(first, 1).controlSignals).not.toBe(stepAt(second, 1).controlSignals);
    expect(stepAt(first, 1).buses).not.toBe(stepAt(second, 1).buses);
    expect(first.finalState).not.toBe(first.steps.at(-1)?.after);
  });
});

describe('micro-operation validation', () => {
  it('fails closed for a missing runtime config', () => {
    expect(errorCode(simulateMicroOperations(
      null as unknown as MicroOperationConfig,
    ))).toBe('invalid-config');
  });

  it.each([
    ['schedule', { schedule: 'other' }, 'invalid-schedule'],
    ['R0 below range', { r0: -1 }, 'invalid-r0'],
    ['R0 above range', { r0: 0x1_0000 }, 'invalid-r0'],
    ['R1 fraction', { r1: 1.5 }, 'invalid-r1'],
    ['memory NaN', { memoryWord: Number.NaN }, 'invalid-memory-word'],
  ])('rejects invalid %s', (_label, override, code) => {
    expect(errorCode(simulateMicroOperations({
      ...MICRO_OPERATIONS_Q44_PRESET.config,
      ...override,
    } as MicroOperationConfig))).toBe(code);
  });
});
