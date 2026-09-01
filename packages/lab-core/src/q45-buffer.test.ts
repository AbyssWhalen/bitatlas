import { describe, expect, it } from 'vitest';

import {
  createQ45State,
  parseQ45Script,
  Q45_BUFFER_PRESET,
  simulateQ45,
  stepQ45,
  type Q45Action,
} from './q45-buffer';

describe('Q45 bounded odd/even buffer', () => {
  it('starts with N empty slots and the four textbook semaphore values', () => {
    const state = createQ45State(3);

    expect(state.buffer).toEqual([null, null, null]);
    expect(state.semaphore.semaphores).toEqual({
      mutex: { value: 1, blockedQueue: [] },
      empty: { value: 3, blockedQueue: [] },
      odd: { value: 0, blockedQueue: [] },
      even: { value: 0, blockedQueue: [] },
    });
    expect(state.counts).toEqual({ odd: 0, even: 0 });
  });

  it('replays blocked consumers, direct wake-up, typed removal, and counting', () => {
    const trace = simulateQ45(Q45_BUFFER_PRESET.capacity, Q45_BUFFER_PRESET.actions);

    expect(trace.steps.filter((step) => step.event.outcome === 'blocked').map(
      (step) => step.action.processId,
    )).toEqual(['P2', 'P3']);
    expect(trace.steps.filter((step) => step.event.wokenProcessId !== null).map(
      (step) => step.event.wokenProcessId,
    )).toEqual(['P2', 'P3']);
    expect(trace.steps.some((step) => step.state.buffer.includes(3))).toBe(true);
    expect(trace.steps.some((step) => step.state.buffer.includes(8))).toBe(true);
    expect(trace.finalState.buffer).toEqual([null, null]);
    expect(trace.finalState.counts).toEqual({ odd: 1, even: 1 });
    expect(trace.finalState.semaphore.semaphores).toEqual(
      trace.initialState.semaphore.semaphores,
    );
  });

  it('keeps a value in its slot until the matching consumer removes it', () => {
    const actions: readonly Q45Action[] = [
      { type: 'produce', processId: 'P1', value: 5 },
      { type: 'wait', processId: 'P1', semaphoreId: 'empty' },
      { type: 'wait', processId: 'P1', semaphoreId: 'mutex' },
      { type: 'put', processId: 'P1' },
      { type: 'signal', processId: 'P1', semaphoreId: 'mutex' },
      { type: 'signal', processId: 'P1', semaphoreId: 'odd' },
      { type: 'wait', processId: 'P2', semaphoreId: 'odd' },
      { type: 'wait', processId: 'P2', semaphoreId: 'mutex' },
      { type: 'get-odd', processId: 'P2' },
    ];
    const trace = simulateQ45(1, actions);

    expect(trace.steps[3]?.state.buffer).toEqual([5]);
    expect(trace.steps[7]?.state.buffer).toEqual([5]);
    expect(trace.finalState.buffer).toEqual([null]);
    expect(trace.finalState.locals.P2.extractedValue).toBe(5);
  });

  it('rejects operations that violate the Q45 process roles or resource order', () => {
    const initial = createQ45State(2);

    expect(() => stepQ45(initial, { type: 'put', processId: 'P1' })).toThrow(/produce/iu);
    expect(() => stepQ45(initial, {
      type: 'wait',
      processId: 'P2',
      semaphoreId: 'empty',
    })).toThrow(/P2.*empty/iu);
    expect(() => stepQ45(initial, {
      type: 'signal',
      processId: 'P1',
      semaphoreId: 'odd',
    })).toThrow(/odd.*put/iu);
    expect(() => stepQ45(initial, { type: 'get-even', processId: 'P3' })).toThrow(/even.*permit/iu);
  });

  it('rejects the wrong category and requires the mutex around buffer access', () => {
    const beforePut = simulateQ45(1, [
      { type: 'produce', processId: 'P1', value: 4 },
      { type: 'wait', processId: 'P1', semaphoreId: 'empty' },
    ]).finalState;
    expect(() => stepQ45(beforePut, { type: 'put', processId: 'P1' })).toThrow(/mutex/iu);

    const publishedEven = simulateQ45(1, [
      { type: 'produce', processId: 'P1', value: 4 },
      { type: 'wait', processId: 'P1', semaphoreId: 'empty' },
      { type: 'wait', processId: 'P1', semaphoreId: 'mutex' },
      { type: 'put', processId: 'P1' },
      { type: 'signal', processId: 'P1', semaphoreId: 'mutex' },
    ]).finalState;
    expect(() => stepQ45(publishedEven, {
      type: 'signal',
      processId: 'P1',
      semaphoreId: 'odd',
    })).toThrow(/odd.*even/iu);
  });

  it('parses only the controlled teaching script grammar with line diagnostics', () => {
    expect(parseQ45Script(`
P2 P(odd)
P1 produce 7
P1 P empty
P1 put
P1 V(odd)
P2 getodd
P2 countodd
    `)).toEqual([
      { type: 'wait', processId: 'P2', semaphoreId: 'odd' },
      { type: 'produce', processId: 'P1', value: 7 },
      { type: 'wait', processId: 'P1', semaphoreId: 'empty' },
      { type: 'put', processId: 'P1' },
      { type: 'signal', processId: 'P1', semaphoreId: 'odd' },
      { type: 'get-odd', processId: 'P2' },
      { type: 'count-odd', processId: 'P2' },
    ]);

    expect(() => parseQ45Script('P1 eval alert(1)')).toThrow(/第 1 行/iu);
    expect(() => parseQ45Script('P1 produce -1')).toThrow(/第 1 行/iu);
    expect(() => parseQ45Script('P2 P(odd')).toThrow(/第 1 行/iu);
    expect(() => parseQ45Script('P2 P)odd(')).toThrow(/第 1 行/iu);
    expect(() => parseQ45Script('')).toThrow(/至少一个操作/iu);
  });

  it('rejects a blocked process missing from its semaphore queue before local buffer actions', () => {
    const valid = simulateQ45(1, [
      { type: 'produce', processId: 'P1', value: 3 },
      { type: 'wait', processId: 'P1', semaphoreId: 'empty' },
      { type: 'wait', processId: 'P1', semaphoreId: 'mutex' },
      { type: 'put', processId: 'P1' },
      { type: 'signal', processId: 'P1', semaphoreId: 'mutex' },
      { type: 'signal', processId: 'P1', semaphoreId: 'odd' },
      { type: 'wait', processId: 'P2', semaphoreId: 'odd' },
      { type: 'wait', processId: 'P2', semaphoreId: 'mutex' },
      { type: 'produce', processId: 'P1', value: 4 },
      { type: 'wait', processId: 'P1', semaphoreId: 'empty' },
    ]).finalState;
    const corrupted = {
      ...valid,
      semaphore: {
        ...valid.semaphore,
        semaphores: {
          ...valid.semaphore.semaphores,
          empty: { value: 0, blockedQueue: [] },
        },
      },
    };

    expect(() => stepQ45(corrupted, { type: 'get-odd', processId: 'P2' }))
      .toThrow(/blocked process.*queue/iu);
  });

  it('rejects unsupported runtime actions instead of treating them as even counting', () => {
    const releasedEmpty = simulateQ45(1, [
      { type: 'produce', processId: 'P1', value: 4 },
      { type: 'wait', processId: 'P1', semaphoreId: 'empty' },
      { type: 'wait', processId: 'P1', semaphoreId: 'mutex' },
      { type: 'put', processId: 'P1' },
      { type: 'signal', processId: 'P1', semaphoreId: 'mutex' },
      { type: 'signal', processId: 'P1', semaphoreId: 'even' },
      { type: 'wait', processId: 'P3', semaphoreId: 'even' },
      { type: 'wait', processId: 'P3', semaphoreId: 'mutex' },
      { type: 'get-even', processId: 'P3' },
      { type: 'signal', processId: 'P3', semaphoreId: 'mutex' },
      { type: 'signal', processId: 'P3', semaphoreId: 'empty' },
    ]).finalState;
    const unsupported = { type: 'bogus', processId: 'P3' } as unknown as Q45Action;
    const unknownProcess = {
      type: 'signal',
      processId: 'P4',
      semaphoreId: 'mutex',
    } as unknown as Q45Action;

    expect(() => stepQ45(releasedEmpty, unsupported)).toThrow(/unsupported.*bogus/iu);
    expect(() => stepQ45(releasedEmpty, unknownProcess)).toThrow(/unknown process.*P4/iu);
    expect(releasedEmpty.counts.even).toBe(0);
  });

  it('never lets a consumer take a producer slot before its category signal', () => {
    const beforeOldOddGet = simulateQ45(2, [
      { type: 'produce', processId: 'P1', value: 2 },
      { type: 'wait', processId: 'P1', semaphoreId: 'empty' },
      { type: 'wait', processId: 'P1', semaphoreId: 'mutex' },
      { type: 'put', processId: 'P1' },
      { type: 'signal', processId: 'P1', semaphoreId: 'mutex' },
      { type: 'signal', processId: 'P1', semaphoreId: 'even' },
      { type: 'produce', processId: 'P1', value: 3 },
      { type: 'wait', processId: 'P1', semaphoreId: 'empty' },
      { type: 'wait', processId: 'P1', semaphoreId: 'mutex' },
      { type: 'put', processId: 'P1' },
      { type: 'signal', processId: 'P1', semaphoreId: 'mutex' },
      { type: 'signal', processId: 'P1', semaphoreId: 'odd' },
      { type: 'wait', processId: 'P3', semaphoreId: 'even' },
      { type: 'wait', processId: 'P3', semaphoreId: 'mutex' },
      { type: 'get-even', processId: 'P3' },
      { type: 'signal', processId: 'P3', semaphoreId: 'mutex' },
      { type: 'signal', processId: 'P3', semaphoreId: 'empty' },
      { type: 'wait', processId: 'P2', semaphoreId: 'odd' },
      { type: 'produce', processId: 'P1', value: 5 },
      { type: 'wait', processId: 'P1', semaphoreId: 'empty' },
      { type: 'wait', processId: 'P1', semaphoreId: 'mutex' },
      { type: 'put', processId: 'P1' },
      { type: 'wait', processId: 'P2', semaphoreId: 'mutex' },
      { type: 'signal', processId: 'P1', semaphoreId: 'mutex' },
    ]).finalState;

    expect(beforeOldOddGet.buffer).toEqual([5, 3]);
    expect(beforeOldOddGet.locals.P1.pendingSlotIndex).toBe(0);
    expect(beforeOldOddGet.locals.P2.stage).toBe('critical');

    const result = stepQ45(beforeOldOddGet, { type: 'get-odd', processId: 'P2' });
    expect(result.event).toMatchObject({ outcome: 'got-odd', value: 3, slotIndex: 1 });
    expect(result.state.buffer).toEqual([5, null]);
  });

  it('bounds simulation capacity and binds an unpublished value to its actual slot', () => {
    expect(() => createQ45State(1025)).toThrow(/capacity.*1024/iu);

    const afterPut = simulateQ45(1, [
      { type: 'produce', processId: 'P1', value: 5 },
      { type: 'wait', processId: 'P1', semaphoreId: 'empty' },
      { type: 'wait', processId: 'P1', semaphoreId: 'mutex' },
      { type: 'put', processId: 'P1' },
    ]).finalState;
    const corrupted = { ...afterPut, buffer: [3] };

    expect(() => stepQ45(corrupted, {
      type: 'signal',
      processId: 'P1',
      semaphoreId: 'mutex',
    })).toThrow(/pending.*slot/iu);
  });

  it('transfers empty and mutex permits directly while preserving FIFO ownership', () => {
    const emptyTrace = simulateQ45(1, [
      { type: 'produce', processId: 'P1', value: 3 },
      { type: 'wait', processId: 'P1', semaphoreId: 'empty' },
      { type: 'wait', processId: 'P1', semaphoreId: 'mutex' },
      { type: 'put', processId: 'P1' },
      { type: 'signal', processId: 'P1', semaphoreId: 'mutex' },
      { type: 'signal', processId: 'P1', semaphoreId: 'odd' },
      { type: 'wait', processId: 'P2', semaphoreId: 'odd' },
      { type: 'wait', processId: 'P2', semaphoreId: 'mutex' },
      { type: 'get-odd', processId: 'P2' },
      { type: 'signal', processId: 'P2', semaphoreId: 'mutex' },
      { type: 'produce', processId: 'P1', value: 4 },
      { type: 'wait', processId: 'P1', semaphoreId: 'empty' },
      { type: 'signal', processId: 'P2', semaphoreId: 'empty' },
    ]);
    expect(emptyTrace.steps.at(-1)?.event).toMatchObject({ outcome: 'woken', wokenProcessId: 'P1' });
    expect(emptyTrace.finalState.locals.P1.stage).toBe('has-empty');
    expect(emptyTrace.finalState.semaphore.semaphores.empty?.value).toBe(0);

    const mutexTrace = simulateQ45(3, [
      { type: 'produce', processId: 'P1', value: 3 },
      { type: 'wait', processId: 'P1', semaphoreId: 'empty' },
      { type: 'wait', processId: 'P1', semaphoreId: 'mutex' },
      { type: 'put', processId: 'P1' },
      { type: 'signal', processId: 'P1', semaphoreId: 'mutex' },
      { type: 'signal', processId: 'P1', semaphoreId: 'odd' },
      { type: 'produce', processId: 'P1', value: 4 },
      { type: 'wait', processId: 'P1', semaphoreId: 'empty' },
      { type: 'wait', processId: 'P1', semaphoreId: 'mutex' },
      { type: 'put', processId: 'P1' },
      { type: 'signal', processId: 'P1', semaphoreId: 'mutex' },
      { type: 'signal', processId: 'P1', semaphoreId: 'even' },
      { type: 'produce', processId: 'P1', value: 5 },
      { type: 'wait', processId: 'P1', semaphoreId: 'empty' },
      { type: 'wait', processId: 'P1', semaphoreId: 'mutex' },
      { type: 'wait', processId: 'P2', semaphoreId: 'odd' },
      { type: 'wait', processId: 'P2', semaphoreId: 'mutex' },
      { type: 'wait', processId: 'P3', semaphoreId: 'even' },
      { type: 'wait', processId: 'P3', semaphoreId: 'mutex' },
      { type: 'put', processId: 'P1' },
      { type: 'signal', processId: 'P1', semaphoreId: 'mutex' },
    ]);
    expect(mutexTrace.steps.at(-1)?.event).toMatchObject({ outcome: 'woken', wokenProcessId: 'P2' });
    expect(mutexTrace.finalState.locals.P2.stage).toBe('critical');
    expect(mutexTrace.finalState.semaphore.semaphores.mutex).toEqual({ value: 0, blockedQueue: ['P3'] });
  });
});
