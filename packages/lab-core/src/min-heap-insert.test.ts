import { describe, expect, it } from 'vitest';

import {
  MIN_HEAP_INSERT_Q9_PRESET,
  traceMinHeapInsert,
  type MinHeapInsertConfig,
} from './min-heap-insert';

describe('Q9 min-heap insertion trace', () => {
  it('replays append plus three sift-up swaps to the expected heap', () => {
    const trace = traceMinHeapInsert(MIN_HEAP_INSERT_Q9_PRESET.config);

    expect(MIN_HEAP_INSERT_Q9_PRESET).toMatchObject({
      sourceQuestionId: 'cn408-2009-q09',
      reviewStatus: 'needs-review',
    });
    expect(trace.steps.map((step) => step.kind)).toEqual([
      'initial',
      'append',
      'swap',
      'swap',
      'swap',
      'complete',
    ]);
    expect(trace.steps[1]).toMatchObject({
      kind: 'append',
      heap: [5, 8, 12, 19, 28, 20, 15, 22, 3],
      focusIndex: 8,
      parentIndex: 3,
      comparedValue: 19,
      swapped: false,
    });
    expect(trace.steps.slice(2, 5).map((step) => step.heap)).toEqual([
      [5, 8, 12, 3, 28, 20, 15, 22, 19],
      [5, 3, 12, 8, 28, 20, 15, 22, 19],
      [3, 5, 12, 8, 28, 20, 15, 22, 19],
    ]);
    expect(trace.steps.at(-1)).toMatchObject({
      kind: 'complete',
      heap: [3, 5, 12, 8, 28, 20, 15, 22, 19],
      focusIndex: 0,
      parentIndex: null,
      comparedValue: null,
      swapped: false,
    });
    expect(trace.finalHeap).toEqual([3, 5, 12, 8, 28, 20, 15, 22, 19]);
    expect(trace.result).toEqual({
      finalHeap: [3, 5, 12, 8, 28, 20, 15, 22, 19],
      insertedValue: 3,
      swapCount: 3,
      finalIndex: 0,
    });
  });

  it.each([
    { initialHeap: [], insertedValue: 4, finalHeap: [4], swapCount: 0 },
    { initialHeap: [1, 2, 3], insertedValue: 0, finalHeap: [0, 1, 3, 2], swapCount: 2 },
    { initialHeap: [1, 2, 3], insertedValue: 3, finalHeap: [1, 2, 3, 3], swapCount: 0 },
  ])('handles boundary insertion %#', ({ initialHeap, insertedValue, finalHeap, swapCount }) => {
    const trace = traceMinHeapInsert({ initialHeap, insertedValue });
    expect(trace.finalHeap).toEqual(finalHeap);
    expect(trace.result.swapCount).toBe(swapCount);
  });

  it('records the comparison that stops without a swap', () => {
    const trace = traceMinHeapInsert({ initialHeap: [1, 2, 3], insertedValue: 3 });

    expect(trace.steps.map((step) => step.kind)).toEqual([
      'initial',
      'append',
      'compare',
      'complete',
    ]);
    expect(trace.steps[2]).toMatchObject({
      heap: [1, 2, 3, 3],
      focusIndex: 3,
      childIndex: 3,
      parentIndex: 1,
      comparedValue: 2,
      swapped: false,
    });
  });

  it('confines any intermediate heap-order violation to the inserted value path', () => {
    const trace = traceMinHeapInsert(MIN_HEAP_INSERT_Q9_PRESET.config);

    for (const step of trace.steps.slice(1, -1)) {
      for (let index = 1; index < step.heap.length; index += 1) {
        if (index === step.focusIndex) continue;
        expect(step.heap[Math.floor((index - 1) / 2)]).toBeLessThanOrEqual(step.heap[index]!);
      }
    }
    for (let index = 1; index < trace.finalHeap.length; index += 1) {
      expect(trace.finalHeap[Math.floor((index - 1) / 2)]).toBeLessThanOrEqual(
        trace.finalHeap[index]!,
      );
    }
  });

  it('is deterministic, preserves frozen input, and isolates snapshots', () => {
    const config: MinHeapInsertConfig = Object.freeze({
      initialHeap: Object.freeze([...MIN_HEAP_INSERT_Q9_PRESET.config.initialHeap]),
      insertedValue: MIN_HEAP_INSERT_Q9_PRESET.config.insertedValue,
    });
    const snapshot = structuredClone(config);
    const first = traceMinHeapInsert(config);
    const second = traceMinHeapInsert(config);

    expect(second).toEqual(first);
    expect(config).toEqual(snapshot);
    expect(first.steps[0]?.heap).not.toBe(first.steps[1]?.heap);
    expect(first.steps[1]?.heap).not.toBe(first.steps[2]?.heap);
    expect(first.finalHeap).not.toBe(first.result.finalHeap);
  });
});

describe('min-heap insertion input validation', () => {
  const sparseHeap = Array(3) as number[];
  sparseHeap[0] = 1;
  sparseHeap[2] = 2;

  it.each([
    ['missing heap', { insertedValue: 3 }],
    ['non-array heap', { initialHeap: '5,8,12', insertedValue: 3 }],
    ['missing inserted value', { initialHeap: [1, 2] }],
    ['non-integer heap value', { initialHeap: [1, 2.5], insertedValue: 3 }],
    ['non-integer inserted value', { initialHeap: [1, 2], insertedValue: Number.NaN }],
    ['sparse heap', { initialHeap: sparseHeap, insertedValue: 3 }],
    ['too many items', { initialHeap: Array.from({ length: 64 }, () => 1), insertedValue: 3 }],
  ] as const)('rejects %s', (_label, input) => {
    expect(() => traceMinHeapInsert(input as unknown as MinHeapInsertConfig)).toThrow();
  });

  it('rejects an initial array that is not a min-heap', () => {
    expect(() => traceMinHeapInsert({ initialHeap: [2, 1], insertedValue: 3 })).toThrow(/min-heap/u);
  });

  it('allows a resulting heap of exactly 64 items', () => {
    const trace = traceMinHeapInsert({
      initialHeap: Array.from({ length: 63 }, () => 1),
      insertedValue: 1,
    });

    expect(trace.finalHeap).toHaveLength(64);
  });
});
