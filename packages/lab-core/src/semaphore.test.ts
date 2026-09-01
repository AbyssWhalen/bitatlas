import { describe, expect, it } from 'vitest';

import {
  createSemaphoreState,
  SEMAPHORE_Q45_PRESET,
  SEMAPHORE_VALUE_MEANING,
  simulateSemaphore,
  stepSemaphore,
  type SemaphoreAction,
  type SemaphoreConfig,
} from './semaphore';

const config: SemaphoreConfig = {
  processes: [
    { id: 'producer', label: 'Producer' },
    { id: 'consumer-a', label: 'Consumer A' },
    { id: 'consumer-b', label: 'Consumer B' },
  ],
  semaphores: [
    { id: 'empty', initialValue: 2, maxValue: 2, meaning: 'free slots' },
    { id: 'ready', initialValue: 0, maxValue: 2, meaning: 'ready items' },
  ],
};

describe('semaphore state machine', () => {
  it('creates a deterministic state whose value is the available permit count', () => {
    expect(SEMAPHORE_VALUE_MEANING).toBe('available-permits');
    expect(createSemaphoreState(config)).toEqual({
      semaphores: {
        empty: { value: 2, blockedQueue: [] },
        ready: { value: 0, blockedQueue: [] },
      },
      processes: {
        producer: { status: 'ready', blockedOn: null },
        'consumer-a': { status: 'ready', blockedOn: null },
        'consumer-b': { status: 'ready', blockedOn: null },
      },
    });
  });

  it('decrements a positive permit and blocks at zero in FIFO order', () => {
    const trace = simulateSemaphore(config, [
      { type: 'wait', processId: 'producer', semaphoreId: 'empty' },
      { type: 'wait', processId: 'consumer-a', semaphoreId: 'ready' },
      { type: 'wait', processId: 'consumer-b', semaphoreId: 'ready' },
    ]);

    expect(trace.steps.map((step) => step.event.outcome)).toEqual([
      'acquired',
      'blocked',
      'blocked',
    ]);
    expect(trace.finalState.semaphores).toEqual({
      empty: { value: 1, blockedQueue: [] },
      ready: { value: 0, blockedQueue: ['consumer-a', 'consumer-b'] },
    });
    expect(trace.finalState.processes).toMatchObject({
      'consumer-a': { status: 'blocked', blockedOn: 'ready' },
      'consumer-b': { status: 'blocked', blockedOn: 'ready' },
    });
  });

  it('transfers a signaled permit directly to the FIFO waiter without incrementing the value', () => {
    const trace = simulateSemaphore(config, [
      { type: 'wait', processId: 'consumer-a', semaphoreId: 'ready' },
      { type: 'wait', processId: 'consumer-b', semaphoreId: 'ready' },
      { type: 'signal', processId: 'producer', semaphoreId: 'ready' },
      { type: 'signal', processId: 'producer', semaphoreId: 'ready' },
      { type: 'signal', processId: 'producer', semaphoreId: 'ready' },
    ]);

    expect(trace.steps.slice(2).map((step) => ({
      outcome: step.event.outcome,
      woken: step.event.wokenProcessId,
      value: step.state.semaphores.ready?.value,
      queue: step.state.semaphores.ready?.blockedQueue,
    }))).toEqual([
      { outcome: 'woken', woken: 'consumer-a', value: 0, queue: ['consumer-b'] },
      { outcome: 'woken', woken: 'consumer-b', value: 0, queue: [] },
      { outcome: 'incremented', woken: null, value: 1, queue: [] },
    ]);
    expect(trace.finalState.processes).toMatchObject({
      'consumer-a': { status: 'ready', blockedOn: null },
      'consumer-b': { status: 'ready', blockedOn: null },
    });
  });

  it('records before/after values and queues in replayable trace events', () => {
    const actions: readonly SemaphoreAction[] = [
      { type: 'wait', processId: 'consumer-a', semaphoreId: 'ready' },
      { type: 'signal', processId: 'producer', semaphoreId: 'ready' },
    ];
    const first = simulateSemaphore(config, actions);
    const second = simulateSemaphore(config, actions);

    expect(first).toEqual(second);
    expect(first.steps[0]?.event).toEqual({
      outcome: 'blocked',
      processId: 'consumer-a',
      semaphoreId: 'ready',
      valueBefore: 0,
      valueAfter: 0,
      queueBefore: [],
      queueAfter: ['consumer-a'],
      wokenProcessId: null,
    });
    expect(first.steps[1]?.event).toEqual({
      outcome: 'woken',
      processId: 'producer',
      semaphoreId: 'ready',
      valueBefore: 0,
      valueAfter: 0,
      queueBefore: ['consumer-a'],
      queueAfter: [],
      wokenProcessId: 'consumer-a',
    });
    expect(first.initialState).not.toBe(first.steps[0]?.state);
    expect(first.steps[0]?.state).not.toBe(first.steps[1]?.state);
  });

  it('replays the Q45 odd/even producer-consumer preset to a balanced final state', () => {
    const trace = simulateSemaphore(
      SEMAPHORE_Q45_PRESET.config,
      SEMAPHORE_Q45_PRESET.actions,
    );

    expect(SEMAPHORE_Q45_PRESET).toMatchObject({
      sourceQuestionId: 'cn408-2009-q45',
      reviewStatus: 'needs-review',
      capacity: 2,
    });
    expect(SEMAPHORE_Q45_PRESET.config.semaphores).toEqual([
      { id: 'mutex', initialValue: 1, maxValue: 1, meaning: 'buffer mutual exclusion' },
      { id: 'empty', initialValue: 2, maxValue: 2, meaning: 'empty buffer units' },
      { id: 'odd', initialValue: 0, maxValue: 2, meaning: 'odd values available to P2' },
      { id: 'even', initialValue: 0, maxValue: 2, meaning: 'even values available to P3' },
    ]);
    expect(trace.steps.filter((step) => step.event.outcome === 'woken').map(
      (step) => step.event.wokenProcessId,
    )).toEqual(['P2', 'P3']);
    expect(trace.finalState).toEqual(trace.initialState);
  });

  it('rejects actions by a blocked process and leaves the input state unchanged', () => {
    const initial = createSemaphoreState(config);
    const blocked = stepSemaphore(config, initial, {
      type: 'wait',
      processId: 'consumer-a',
      semaphoreId: 'ready',
    }).state;

    expect(() => stepSemaphore(config, blocked, {
      type: 'signal',
      processId: 'consumer-a',
      semaphoreId: 'empty',
    })).toThrow(/blocked process/iu);
    expect(initial.semaphores.ready).toEqual({ value: 0, blockedQueue: [] });
    expect(initial.processes['consumer-a']).toEqual({ status: 'ready', blockedOn: null });
  });

  it('rejects unknown ids, invalid definitions, bounded overflow, and corrupted state', () => {
    const initial = createSemaphoreState(config);
    expect(() => stepSemaphore(config, initial, {
      type: 'wait',
      processId: 'missing',
      semaphoreId: 'empty',
    })).toThrow(/unknown process/iu);
    expect(() => stepSemaphore(config, initial, {
      type: 'wait',
      processId: 'producer',
      semaphoreId: 'missing',
    })).toThrow(/unknown semaphore/iu);
    expect(() => createSemaphoreState({
      ...config,
      processes: [{ id: 'same' }, { id: 'same' }],
    })).toThrow(/duplicate process/iu);
    expect(() => createSemaphoreState({
      ...config,
      semaphores: [{ id: 'bad', initialValue: -1 }],
    })).toThrow(/initialValue/iu);
    expect(() => createSemaphoreState({
      ...config,
      semaphores: [{ id: 'bad', initialValue: 2, maxValue: 1 }],
    })).toThrow(/maxValue/iu);
    expect(() => stepSemaphore(config, createSemaphoreState(config), {
      type: 'signal',
      processId: 'producer',
      semaphoreId: 'empty',
    })).toThrow(/maximum/iu);
    expect(() => stepSemaphore(config, {
      ...initial,
      semaphores: {
        ...initial.semaphores,
        ready: { value: 1, blockedQueue: ['consumer-a'] },
      },
      processes: {
        ...initial.processes,
        'consumer-a': { status: 'blocked', blockedOn: 'ready' },
      },
    }, {
      type: 'signal',
      processId: 'producer',
      semaphoreId: 'ready',
    })).toThrow(/queued semaphore.*zero/iu);
  });
});
