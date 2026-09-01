import { describe, expect, it } from 'vitest';

import {
  COMPLETE_BINARY_TREE_Q5_PRESET,
  traceCompleteBinaryTreeMaximum,
  type CompleteBinaryTreeConfig,
} from './complete-binary-tree';

describe('Q5 complete binary-tree maximum trace', () => {
  it('derives the source-supported maximum of 111 nodes', () => {
    const trace = traceCompleteBinaryTreeMaximum(COMPLETE_BINARY_TREE_Q5_PRESET.config);

    expect(COMPLETE_BINARY_TREE_Q5_PRESET).toEqual({
      sourceQuestionId: 'cn408-2009-q05',
      reviewStatus: 'needs-review',
      expectedAnswerOptionId: 'C',
      config: { leafLevel: 6, leafCountAtLevel: 8 },
    });
    expect(trace.steps.map((step) => step.kind)).toEqual([
      'initial',
      'fill-upper-levels',
      'partition-leaf-level',
      'bound-height',
      'fill-last-level',
      'complete',
    ]);
    expect(trace.result).toEqual({
      leafLevel: 6,
      maximumHeight: 7,
      leafLevelCapacity: 32,
      leafCountAtLevel: 8,
      internalNodesAtLeafLevel: 24,
      nodesThroughLeafLevel: 63,
      nodesAtLastLevel: 48,
      maximumNodeCount: 111,
    });
  });

  it('reveals only the quantities justified by each deterministic step', () => {
    const trace = traceCompleteBinaryTreeMaximum(COMPLETE_BINARY_TREE_Q5_PRESET.config);

    expect(trace.steps.map((step) => step.sequence)).toEqual([0, 1, 2, 3, 4, 5]);
    expect(new Set(trace.steps.map((step) => step.id)).size).toBe(6);
    expect(trace.steps[0]?.state).toEqual({
      leafLevel: 6,
      maximumHeight: null,
      leafLevelCapacity: null,
      leafCountAtLevel: 8,
      internalNodesAtLeafLevel: null,
      nodesThroughLeafLevel: null,
      nodesAtLastLevel: null,
      maximumNodeCount: null,
    });
    expect(trace.steps[1]?.state).toMatchObject({
      leafLevelCapacity: 32,
      nodesThroughLeafLevel: 63,
    });
    expect(trace.steps[1]?.state.maximumHeight).toBeNull();
    expect(trace.steps[1]?.state.internalNodesAtLeafLevel).toBeNull();
    expect(trace.steps[2]?.state).toMatchObject({ internalNodesAtLeafLevel: 24 });
    expect(trace.steps[2]?.state.maximumHeight).toBeNull();
    expect(trace.steps[3]?.state).toMatchObject({ maximumHeight: 7 });
    expect(trace.steps[3]?.state.nodesAtLastLevel).toBeNull();
    expect(trace.steps[4]?.state).toMatchObject({ nodesAtLastLevel: 48 });
    expect(trace.steps[4]?.state.maximumNodeCount).toBeNull();
    expect(trace.steps[5]?.state).toEqual({
      leafLevel: 6,
      maximumHeight: 7,
      leafLevelCapacity: 32,
      leafCountAtLevel: 8,
      internalNodesAtLeafLevel: 24,
      nodesThroughLeafLevel: 63,
      nodesAtLastLevel: 48,
      maximumNodeCount: 111,
    });
    expect(trace.steps.every((step) => step.state.leafLevel === 6)).toBe(true);
  });

  it('derives a full leaf level height only after revealing there are no internal nodes', () => {
    const trace = traceCompleteBinaryTreeMaximum({ leafLevel: 3, leafCountAtLevel: 4 });

    expect(trace.steps[1]?.state).toMatchObject({ leafLevelCapacity: 4, maximumHeight: null });
    expect(trace.steps[2]?.state).toMatchObject({ internalNodesAtLeafLevel: 0, maximumHeight: null });
    expect(trace.steps[3]?.state).toMatchObject({ internalNodesAtLeafLevel: 0, maximumHeight: 3 });
  });

  it.each([
    { config: { leafLevel: 1, leafCountAtLevel: 1 }, maximumNodeCount: 1, maximumHeight: 1 },
    { config: { leafLevel: 3, leafCountAtLevel: 4 }, maximumNodeCount: 7, maximumHeight: 3 },
    { config: { leafLevel: 3, leafCountAtLevel: 1 }, maximumNodeCount: 13, maximumHeight: 4 },
  ])('handles the realizable boundary $config', ({ config, maximumNodeCount, maximumHeight }) => {
    const result = traceCompleteBinaryTreeMaximum(config).result;

    expect(result.maximumNodeCount).toBe(maximumNodeCount);
    expect(result.maximumHeight).toBe(maximumHeight);
  });

  it('is deterministic, preserves frozen input, and isolates step snapshots', () => {
    const config: CompleteBinaryTreeConfig = Object.freeze({ leafLevel: 6, leafCountAtLevel: 8 });
    const snapshot = structuredClone(config);
    const first = traceCompleteBinaryTreeMaximum(config);
    const second = traceCompleteBinaryTreeMaximum(config);

    expect(second).toEqual(first);
    expect(config).toEqual(snapshot);
    expect(first.steps[0]?.state).not.toBe(first.steps[1]?.state);
    expect(first.steps[4]?.state).not.toBe(first.steps[5]?.state);
    expect(first.steps[5]?.state).not.toBe(first.result);
  });
});

describe('complete binary-tree input validation', () => {
  it.each([
    ['null config', null],
    ['missing leaf level', { leafCountAtLevel: 1 }],
    ['fractional leaf level', { leafLevel: 2.5, leafCountAtLevel: 1 }],
    ['zero leaf level', { leafLevel: 0, leafCountAtLevel: 1 }],
    ['unsafe leaf level', { leafLevel: Number.MAX_SAFE_INTEGER + 1, leafCountAtLevel: 1 }],
    ['level above safe arithmetic limit', { leafLevel: 53, leafCountAtLevel: 1 }],
    ['missing leaf count', { leafLevel: 3 }],
    ['fractional leaf count', { leafLevel: 3, leafCountAtLevel: 1.5 }],
    ['zero leaf count', { leafLevel: 3, leafCountAtLevel: 0 }],
    ['too many leaves for the level', { leafLevel: 3, leafCountAtLevel: 5 }],
    ['unknown field', { leafLevel: 3, leafCountAtLevel: 1, height: 4 }],
  ])('rejects %s', (_label, config) => {
    expect(() => traceCompleteBinaryTreeMaximum(config as CompleteBinaryTreeConfig)).toThrow();
  });

  it('keeps the maximum supported level within safe integer arithmetic', () => {
    const trace = traceCompleteBinaryTreeMaximum({ leafLevel: 52, leafCountAtLevel: 1 });

    expect(trace.result.maximumNodeCount).toBe(Number.MAX_SAFE_INTEGER - 2);
    expect(Number.isSafeInteger(trace.result.maximumNodeCount)).toBe(true);
  });
});
