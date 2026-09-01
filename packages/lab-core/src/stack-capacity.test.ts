import { describe, expect, it } from 'vitest';

import {
  STACK_CAPACITY_Q2_PRESET,
  traceStackCapacity,
  type StackCapacityConfig,
} from './stack-capacity';

describe('Q2 minimum stack capacity trace', () => {
  it('replays the exact 14 operations and finds a minimum capacity of three', () => {
    const trace = traceStackCapacity(STACK_CAPACITY_Q2_PRESET.config);

    expect(trace.steps).toHaveLength(15);
    expect(trace.steps.slice(1).map((step) => `${step.action}:${step.value}`)).toEqual([
      'push:a',
      'push:b',
      'pop:b',
      'push:c',
      'push:d',
      'pop:d',
      'pop:c',
      'push:e',
      'push:f',
      'pop:f',
      'pop:e',
      'pop:a',
      'push:g',
      'pop:g',
    ]);
    expect(trace.steps[5]).toMatchObject({
      action: 'push',
      value: 'd',
      stack: ['a', 'c', 'd'],
      depth: 3,
      peakDepth: 3,
      produced: ['b'],
    });
    expect(trace.steps[9]).toMatchObject({
      action: 'push',
      value: 'f',
      stack: ['a', 'e', 'f'],
      depth: 3,
      peakDepth: 3,
      produced: ['b', 'd', 'c'],
    });
    expect(trace.steps.at(-1)).toMatchObject({
      action: 'pop',
      value: 'g',
      inputIndex: 7,
      stack: [],
      produced: ['b', 'd', 'c', 'f', 'e', 'a', 'g'],
      depth: 0,
      peakDepth: 3,
    });
    expect(trace.result).toEqual({
      minimumCapacity: 3,
      operationCount: 14,
      outputOrder: ['b', 'd', 'c', 'f', 'e', 'a', 'g'],
    });
  });

  it.each([
    { outputOrder: ['a', 'b', 'c'], capacity: 1 },
    { outputOrder: ['c', 'b', 'a'], capacity: 3 },
  ])('handles the boundary permutation $outputOrder', ({ outputOrder, capacity }) => {
    const trace = traceStackCapacity({ inputOrder: ['a', 'b', 'c'], outputOrder });
    expect(trace.result.minimumCapacity).toBe(capacity);
  });

  it('keeps every state internally consistent with the target output prefix', () => {
    const config = STACK_CAPACITY_Q2_PRESET.config;
    const trace = traceStackCapacity(config);

    for (const step of trace.steps) {
      expect(step.depth).toBe(step.stack.length);
      expect(step.peakDepth).toBeGreaterThanOrEqual(step.depth);
      expect(step.produced).toEqual(config.outputOrder.slice(0, step.produced.length));
      expect(step.inputIndex).toBeGreaterThanOrEqual(0);
      expect(step.inputIndex).toBeLessThanOrEqual(config.inputOrder.length);
    }
  });

  it('rejects a valid element set that is not a stack permutation', () => {
    expect(() => traceStackCapacity({
      inputOrder: ['a', 'b', 'c'],
      outputOrder: ['c', 'a', 'b'],
    })).toThrow(/expected a.*top is b/u);
  });

  it('is deterministic, does not mutate frozen input, and does not share step snapshots', () => {
    const config: StackCapacityConfig = Object.freeze({
      inputOrder: Object.freeze([...STACK_CAPACITY_Q2_PRESET.config.inputOrder]),
      outputOrder: Object.freeze([...STACK_CAPACITY_Q2_PRESET.config.outputOrder]),
    });
    const snapshot = structuredClone(config);
    const first = traceStackCapacity(config);
    const second = traceStackCapacity(config);

    expect(second).toEqual(first);
    expect(config).toEqual(snapshot);
    expect(first.steps[1]?.stack).not.toBe(first.steps[2]?.stack);
    expect(first.steps[2]?.produced).not.toBe(first.steps[3]?.produced);
  });
});

describe('stack capacity input validation', () => {
  it.each([
    ['empty input', { inputOrder: [], outputOrder: [] }],
    ['different lengths', { inputOrder: ['a'], outputOrder: ['a', 'b'] }],
    ['different sets', { inputOrder: ['a', 'b'], outputOrder: ['a', 'c'] }],
    ['duplicate input', { inputOrder: ['a', 'a'], outputOrder: ['a', 'a'] }],
    ['duplicate output', { inputOrder: ['a', 'b'], outputOrder: ['a', 'a'] }],
    ['blank token', { inputOrder: ['a', ' '], outputOrder: ['a', ' '] }],
    ['whitespace token', { inputOrder: ['a b'], outputOrder: ['a b'] }],
    ['comma token', { inputOrder: ['a,b'], outputOrder: ['a,b'] }],
    ['control token', { inputOrder: ['a\0'], outputOrder: ['a\0'] }],
    ['overlong token', { inputOrder: ['a'.repeat(33)], outputOrder: ['a'.repeat(33)] }],
  ])('rejects %s', (_label, config) => {
    expect(() => traceStackCapacity(config)).toThrow();
  });

  it('rejects more than 64 elements', () => {
    const values = Array.from({ length: 65 }, (_, index) => `v${index}`);
    expect(() => traceStackCapacity({ inputOrder: values, outputOrder: values })).toThrow(/64/u);
  });

  it.each(['inputOrder', 'outputOrder'] as const)('rejects a sparse %s array', (field) => {
    const config = { inputOrder: ['a'], outputOrder: ['a'] };
    config[field] = Array(1) as string[];
    expect(() => traceStackCapacity(config)).toThrow(/token/u);
  });
});
