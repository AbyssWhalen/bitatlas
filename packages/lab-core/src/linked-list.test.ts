import { describe, expect, it } from 'vitest';

import { traceKthFromEnd } from './linked-list';

describe('Q42 kth-from-end linked-list trace', () => {
  it('keeps the fast pointer exactly k nodes ahead after the initial advance', () => {
    const trace = traceKthFromEnd({ values: [10, 20, 30, 40, 50], k: 2 });

    expect(trace.result).toEqual({ index: 3, value: 40 });
    expect(trace.complexity).toEqual({ passes: 1, extraSpace: 'O(1)' });
    expect(trace.steps.map((step) => ({
      phase: step.phase,
      fastIndex: step.fastIndex,
      slowIndex: step.slowIndex,
      lead: step.lead,
      visitedCount: step.visitedCount,
      invariant: step.invariant.holds,
    }))).toEqual([
      { phase: 'initialize', fastIndex: 0, slowIndex: 0, lead: 0, visitedCount: 0, invariant: true },
      { phase: 'advance-fast', fastIndex: 1, slowIndex: 0, lead: 1, visitedCount: 1, invariant: true },
      { phase: 'advance-fast', fastIndex: 2, slowIndex: 0, lead: 2, visitedCount: 2, invariant: true },
      { phase: 'advance-together', fastIndex: 3, slowIndex: 1, lead: 2, visitedCount: 3, invariant: true },
      { phase: 'advance-together', fastIndex: 4, slowIndex: 2, lead: 2, visitedCount: 4, invariant: true },
      { phase: 'advance-together', fastIndex: null, slowIndex: 3, lead: 2, visitedCount: 5, invariant: true },
      { phase: 'found', fastIndex: null, slowIndex: 3, lead: 2, visitedCount: 5, invariant: true },
    ]);
    expect(trace.steps.at(-1)?.invariant).toMatchObject({
      name: 'k-node-gap',
      expectedLead: 2,
      actualLead: 2,
      holds: true,
    });
  });

  it('handles k=1 by returning the tail and k=n by returning the first data node', () => {
    const values = [4, 8, 15, 16, 23, 42];

    const tail = traceKthFromEnd({ values, k: 1 });
    const first = traceKthFromEnd({ values, k: values.length });

    expect(tail.result).toEqual({ index: 5, value: 42 });
    expect(tail.steps.at(-1)).toMatchObject({
      phase: 'found',
      fastIndex: null,
      slowIndex: 5,
      lead: 1,
      visitedCount: 6,
    });
    expect(first.result).toEqual({ index: 0, value: 4 });
    expect(first.steps.filter((step) => step.phase === 'advance-together')).toHaveLength(0);
    expect(first.steps.at(-1)).toMatchObject({
      phase: 'found',
      fastIndex: null,
      slowIndex: 0,
      lead: 6,
      visitedCount: 6,
    });
  });

  it('returns an explicit not-found trace for an empty list or k greater than the length', () => {
    const empty = traceKthFromEnd({ values: [], k: 1 });
    const tooShort = traceKthFromEnd({ values: [7, 7], k: 3 });

    expect(empty.result).toBeNull();
    expect(empty.steps).toEqual([
      expect.objectContaining({
        phase: 'initialize',
        fastIndex: null,
        slowIndex: null,
        lead: 0,
        visitedCount: 0,
      }),
      expect.objectContaining({
        phase: 'not-found',
        fastIndex: null,
        slowIndex: null,
        lead: 0,
        visitedCount: 0,
      }),
    ]);
    expect(tooShort.result).toBeNull();
    expect(tooShort.steps.map((step) => step.phase)).toEqual([
      'initialize',
      'advance-fast',
      'advance-fast',
      'not-found',
    ]);
    expect(tooShort.steps.at(-1)).toMatchObject({
      fastIndex: null,
      slowIndex: 0,
      lead: 2,
      visitedCount: 2,
      invariant: {
        name: 'list-too-short',
        expectedLead: 3,
        actualLead: 2,
        holds: true,
      },
    });
  });

  it('is deterministic and never mutates caller-owned values', () => {
    const values = [5, 5, 8, 13];
    const snapshot = [...values];

    const first = traceKthFromEnd({ values, k: 3 });
    const second = traceKthFromEnd({ values, k: 3 });

    expect(second).toEqual(first);
    expect(values).toEqual(snapshot);
    expect(first.result).toEqual({ index: 1, value: 5 });
  });
});

describe('linked-list input validation', () => {
  it.each([0, -1, 1.5, Number.NaN, Number.POSITIVE_INFINITY, Number.MAX_SAFE_INTEGER + 1])(
    'rejects invalid k=%s',
    (k) => {
      expect(() => traceKthFromEnd({ values: [1, 2, 3], k })).toThrow(/k/u);
    },
  );

  it('rejects non-safe-integer node values before producing a partial trace', () => {
    expect(() => traceKthFromEnd({ values: [1, Number.NaN], k: 1 })).toThrow(/values\[1\]/u);
    expect(() => traceKthFromEnd({ values: [Number.MAX_SAFE_INTEGER + 1], k: 1 })).toThrow(/values\[0\]/u);
  });

  it('rejects sparse arrays instead of returning an undefined node value', () => {
    const values = Array<number>(2);
    values[0] = 1;

    expect(() => traceKthFromEnd({ values, k: 1 })).toThrow(/values\[1\]/u);
  });
});
