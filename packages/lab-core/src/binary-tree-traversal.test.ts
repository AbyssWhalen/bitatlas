import { describe, expect, it } from 'vitest';

import {
  BINARY_TREE_TRAVERSAL_Q3_PRESET,
  traceBinaryTreeTraversal,
  type BinaryTreeTraversalConfig,
  type TraversalOrder,
} from './binary-tree-traversal';

const expectedByOrder: Readonly<Record<TraversalOrder, readonly string[]>> = {
  NLR: ['1', '2', '4', '5', '6', '7', '3'],
  NRL: ['1', '3', '2', '5', '7', '6', '4'],
  LNR: ['4', '2', '6', '5', '7', '1', '3'],
  LRN: ['4', '6', '7', '5', '2', '3', '1'],
  RNL: ['3', '1', '7', '5', '6', '2', '4'],
  RLN: ['3', '7', '6', '5', '4', '2', '1'],
};

describe('Q3 binary-tree traversal trace', () => {
  it('replays RNL and produces the exact source-question sequence', () => {
    const trace = traceBinaryTreeTraversal(BINARY_TREE_TRAVERSAL_Q3_PRESET.config);

    expect(BINARY_TREE_TRAVERSAL_Q3_PRESET).toMatchObject({
      sourceQuestionId: 'cn408-2009-q03',
      reviewStatus: 'needs-review',
      expectedVisitedLabels: ['3', '1', '7', '5', '6', '2', '4'],
    });
    expect(trace.order).toBe('RNL');
    expect(trace.result).toEqual({
      visitedNodeIds: ['3', '1', '7', '5', '6', '2', '4'],
      visitedLabels: ['3', '1', '7', '5', '6', '2', '4'],
    });
    expect(trace.steps.filter((step) => step.kind === 'visit').map((step) => step.nodeId))
      .toEqual(['3', '1', '7', '5', '6', '2', '4']);
    expect(trace.steps).toHaveLength(22);
    expect(trace.steps.at(-1)).toMatchObject({
      kind: 'leave',
      nodeId: '1',
      state: { callStack: [], activeNodeId: null, visitedNodeIds: ['3', '1', '7', '5', '6', '2', '4'] },
    });
  });

  it.each(Object.entries(expectedByOrder) as Array<[TraversalOrder, readonly string[]]>) (
    'supports the %s permutation of N, L, and R',
    (order, expected) => {
      const trace = traceBinaryTreeTraversal({
        ...BINARY_TREE_TRAVERSAL_Q3_PRESET.config,
        order,
      });

      expect(trace.result.visitedNodeIds).toEqual(expected);
    },
  );

  it('records immutable call-stack transitions and visit prefixes', () => {
    const trace = traceBinaryTreeTraversal(BINARY_TREE_TRAVERSAL_Q3_PRESET.config);

    expect(trace.initialState).toEqual({
      callStack: [],
      activeNodeId: null,
      visitedNodeIds: [],
    });
    expect(trace.steps.slice(0, 6)).toMatchObject([
      { kind: 'initial', nodeId: null, state: { callStack: [], activeNodeId: null, visitedNodeIds: [] } },
      { kind: 'enter', nodeId: '1', state: { callStack: ['1'], activeNodeId: '1', visitedNodeIds: [] } },
      { kind: 'enter', nodeId: '3', state: { callStack: ['1', '3'], activeNodeId: '3', visitedNodeIds: [] } },
      { kind: 'visit', nodeId: '3', state: { callStack: ['1', '3'], activeNodeId: '3', visitedNodeIds: ['3'] } },
      { kind: 'leave', nodeId: '3', state: { callStack: ['1'], activeNodeId: '1', visitedNodeIds: ['3'] } },
      { kind: 'visit', nodeId: '1', state: { callStack: ['1'], activeNodeId: '1', visitedNodeIds: ['3', '1'] } },
    ]);

    for (const [index, step] of trace.steps.entries()) {
      expect(step.sequence).toBe(index);
      expect(step.state.activeNodeId).toBe(step.state.callStack.at(-1) ?? null);
      expect(step.state.visitedNodeIds).toEqual(
        trace.result.visitedNodeIds.slice(0, step.state.visitedNodeIds.length),
      );
      if (index > 0) {
        const previousCount = trace.steps[index - 1]!.state.visitedNodeIds.length;
        expect(step.state.visitedNodeIds.length - previousCount).toBe(step.kind === 'visit' ? 1 : 0);
      }
    }
    expect(trace.finalState).toEqual(trace.steps.at(-1)?.state);
  });

  it('is deterministic, preserves frozen input, and isolates snapshots', () => {
    const config: BinaryTreeTraversalConfig = Object.freeze({
      nodes: Object.freeze(BINARY_TREE_TRAVERSAL_Q3_PRESET.config.nodes.map(
        (node) => Object.freeze({ ...node }),
      )),
      rootId: BINARY_TREE_TRAVERSAL_Q3_PRESET.config.rootId,
      order: BINARY_TREE_TRAVERSAL_Q3_PRESET.config.order,
    });
    const snapshot = structuredClone(config);
    const first = traceBinaryTreeTraversal(config);
    const second = traceBinaryTreeTraversal(config);

    expect(second).toEqual(first);
    expect(config).toEqual(snapshot);
    expect(first.nodes[0]).not.toBe(config.nodes[0]);
    expect(first.steps[1]?.state.callStack).not.toBe(first.steps[2]?.state.callStack);
    expect(first.steps[2]?.state.visitedNodeIds).not.toBe(first.steps[3]?.state.visitedNodeIds);
    expect(first.result.visitedNodeIds).not.toBe(first.finalState.visitedNodeIds);
  });
});

describe('binary-tree traversal input validation', () => {
  const baseNodes = BINARY_TREE_TRAVERSAL_Q3_PRESET.config.nodes;
  const sparseNodes = Array(1) as unknown as BinaryTreeTraversalConfig['nodes'];

  it.each([
    ['non-object config', null],
    ['non-array nodes', { nodes: 'tree', rootId: '1', order: 'RNL' }],
    ['empty nodes', { nodes: [], rootId: '1', order: 'RNL' }],
    ['sparse nodes', { nodes: sparseNodes, rootId: '1', order: 'RNL' }],
    ['duplicate id', { nodes: [...baseNodes, { id: '1', label: 'again', leftId: null, rightId: null }], rootId: '1', order: 'RNL' }],
    ['unknown left child', { nodes: [{ id: '1', label: '1', leftId: 'missing', rightId: null }], rootId: '1', order: 'RNL' }],
    ['unknown right child', { nodes: [{ id: '1', label: '1', leftId: null, rightId: 'missing' }], rootId: '1', order: 'RNL' }],
    ['unknown root', { nodes: baseNodes, rootId: 'missing', order: 'RNL' }],
    ['multiple parents', {
      nodes: [
        { id: '1', label: '1', leftId: '3', rightId: '2' },
        { id: '2', label: '2', leftId: '3', rightId: null },
        { id: '3', label: '3', leftId: null, rightId: null },
      ],
      rootId: '1',
      order: 'RNL',
    }],
    ['cycle', {
      nodes: [
        { id: '1', label: '1', leftId: '2', rightId: null },
        { id: '2', label: '2', leftId: '1', rightId: null },
      ],
      rootId: '1',
      order: 'RNL',
    }],
    ['unreachable node', {
      nodes: [
        { id: '1', label: '1', leftId: null, rightId: null },
        { id: '2', label: '2', leftId: null, rightId: null },
      ],
      rootId: '1',
      order: 'RNL',
    }],
    ['invalid order', { nodes: baseNodes, rootId: '1', order: 'NNL' }],
    ['empty id', { nodes: [{ id: '', label: '1', leftId: null, rightId: null }], rootId: '', order: 'RNL' }],
    ['overlong id', { nodes: [{ id: 'x'.repeat(33), label: '1', leftId: null, rightId: null }], rootId: 'x'.repeat(33), order: 'RNL' }],
    ['empty label', { nodes: [{ id: '1', label: '', leftId: null, rightId: null }], rootId: '1', order: 'RNL' }],
    ['overlong label', { nodes: [{ id: '1', label: 'x'.repeat(65), leftId: null, rightId: null }], rootId: '1', order: 'RNL' }],
  ] as const)('rejects %s', (_label, config) => {
    expect(() => traceBinaryTreeTraversal(config as unknown as BinaryTreeTraversalConfig)).toThrow();
  });

  it('rejects more than 63 nodes', () => {
    const nodes = Array.from({ length: 64 }, (_, index) => ({
      id: String(index),
      label: String(index),
      leftId: index * 2 + 1 < 64 ? String(index * 2 + 1) : null,
      rightId: index * 2 + 2 < 64 ? String(index * 2 + 2) : null,
    }));

    expect(() => traceBinaryTreeTraversal({ nodes, rootId: '0', order: 'NLR' })).toThrow(/63/u);
  });
});
