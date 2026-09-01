import { describe, expect, it } from 'vitest';

import {
  FOREST_BINARY_RELATION_Q6_PRESET,
  analyzeQ6ForestBinaryRelations,
  traceForestBinaryRelation,
  type BinaryViewNode,
  type ForestBinaryNodeId,
  type ForestBinaryPath,
  type ForestView,
} from './forest-binary-relation';

const paths: readonly ForestBinaryPath[] = ['LL', 'LR', 'RL', 'RR'];

const expectedByPath = {
  LL: {
    relation: 'u-is-grandparent-of-v',
    statements: [],
    binary: [
      { id: 'p', leftId: 'u', rightId: null },
      { id: 'u', leftId: 'k', rightId: null },
      { id: 'k', leftId: 'v', rightId: null },
      { id: 'v', leftId: null, rightId: null },
    ],
    forest: [
      { id: 'p', childIds: ['u'] },
      { id: 'u', childIds: ['k'] },
      { id: 'k', childIds: ['v'] },
      { id: 'v', childIds: [] },
    ],
  },
  LR: {
    relation: 'u-is-parent-of-v',
    statements: ['I'],
    binary: [
      { id: 'p', leftId: 'u', rightId: null },
      { id: 'u', leftId: 'k', rightId: null },
      { id: 'k', leftId: null, rightId: 'v' },
      { id: 'v', leftId: null, rightId: null },
    ],
    forest: [
      { id: 'p', childIds: ['u'] },
      { id: 'u', childIds: ['k', 'v'] },
      { id: 'k', childIds: [] },
      { id: 'v', childIds: [] },
    ],
  },
  RL: {
    relation: 'u-is-sibling-of-v-parent',
    statements: [],
    binary: [
      { id: 'p', leftId: 'u', rightId: null },
      { id: 'u', leftId: null, rightId: 'k' },
      { id: 'k', leftId: 'v', rightId: null },
      { id: 'v', leftId: null, rightId: null },
    ],
    forest: [
      { id: 'p', childIds: ['u', 'k'] },
      { id: 'u', childIds: [] },
      { id: 'k', childIds: ['v'] },
      { id: 'v', childIds: [] },
    ],
  },
  RR: {
    relation: 'u-and-v-are-siblings',
    statements: ['II'],
    binary: [
      { id: 'p', leftId: 'u', rightId: null },
      { id: 'u', leftId: null, rightId: 'k' },
      { id: 'k', leftId: null, rightId: 'v' },
      { id: 'v', leftId: null, rightId: null },
    ],
    forest: [
      { id: 'p', childIds: ['u', 'k', 'v'] },
      { id: 'u', childIds: [] },
      { id: 'k', childIds: [] },
      { id: 'v', childIds: [] },
    ],
  },
} as const;

function encodeForestAsBinary(forest: ForestView): readonly BinaryViewNode[] {
  const nodes = new Map<ForestBinaryNodeId, BinaryViewNode>();
  for (const node of forest.nodes) {
    nodes.set(node.id, { id: node.id, leftId: node.childIds[0] ?? null, rightId: null });
  }
  for (const node of forest.nodes) {
    node.childIds.forEach((childId, index) => {
      const child = nodes.get(childId)!;
      nodes.set(childId, { ...child, rightId: node.childIds[index + 1] ?? null });
    });
  }
  return forest.nodes.map((node) => nodes.get(node.id)!);
}

describe('Q6 forest and binary-tree relationship proof', () => {
  it('keeps the preset in needs-review and derives I plus II, answer B', () => {
    const analysis = analyzeQ6ForestBinaryRelations();

    expect(FOREST_BINARY_RELATION_Q6_PRESET).toEqual({
      sourceQuestionId: 'cn408-2009-q06',
      reviewStatus: 'needs-review',
      paths,
      expectedAnswerOptionId: 'B',
    });
    expect(analysis.cases.map((entry) => entry.path)).toEqual(paths);
    expect(analysis.result).toEqual({
      possibleStatementIds: ['I', 'II'],
      impossibleStatementIds: ['III'],
      answerOptionId: 'B',
    });
  });

  it.each(paths)('decodes the %s path into the exact forest relation', (path) => {
    const trace = traceForestBinaryRelation(path);
    const expected = expectedByPath[path];

    expect(trace.path).toBe(path);
    expect(trace.binaryView).toEqual({ rootId: 'p', nodes: expected.binary });
    expect(trace.forestView).toEqual({ rootIds: ['p'], nodes: expected.forest });
    expect(trace.result).toEqual({
      relation: expected.relation,
      matchingStatementIds: expected.statements,
    });
  });

  it.each(paths)('round-trips the %s forest through left-child right-sibling encoding', (path) => {
    const trace = traceForestBinaryRelation(path);

    expect(encodeForestAsBinary(trace.forestView)).toEqual(trace.binaryView.nodes);
    const childIds = trace.forestView.nodes.flatMap((node) => node.childIds);
    expect(new Set([...trace.forestView.rootIds, ...childIds])).toEqual(new Set(['p', 'u', 'k', 'v']));
    expect(childIds).toHaveLength(3);
    expect(new Set(childIds).size).toBe(childIds.length);
  });

  it.each(paths)('reveals the %s proof one binary edge at a time', (path) => {
    const trace = traceForestBinaryRelation(path);

    expect(trace.steps.map((step) => step.kind)).toEqual([
      'initial',
      'decode-edge',
      'decode-edge',
      'classify',
      'complete',
    ]);
    expect(trace.steps.map((step) => step.activeEdgeIndex)).toEqual([null, 0, 1, null, null]);
    expect(trace.steps.map((step) => step.state.decodedLinks.length)).toEqual([0, 1, 2, 2, 2]);
    expect(trace.steps.map((step) => step.sequence)).toEqual([0, 1, 2, 3, 4]);
    expect(new Set(trace.steps.map((step) => step.id)).size).toBe(5);

    for (const [index, step] of trace.steps.entries()) {
      expect(step.state.decodedLinks.map((link) => link.edgeIndex)).toEqual(
        index === 0 ? [] : index === 1 ? [0] : [0, 1],
      );
      for (const link of step.state.decodedLinks) {
        expect(link.forestMeaning).toBe(link.binarySide === 'L' ? 'first-child' : 'next-sibling');
      }
      if (index < 3) {
        expect(step.state.relation).toBeNull();
        expect(step.state.matchingStatementIds).toEqual([]);
      } else {
        expect(step.state).toMatchObject(trace.result);
      }
    }
  });

  it('does not confuse RL with statement III and exhausts all four relations', () => {
    const analysis = analyzeQ6ForestBinaryRelations();

    expect(analysis.cases.find((entry) => entry.path === 'RL')?.result).toEqual({
      relation: 'u-is-sibling-of-v-parent',
      matchingStatementIds: [],
    });
    expect(analysis.cases.map((entry) => entry.result.relation)).toEqual([
      'u-is-grandparent-of-v',
      'u-is-parent-of-v',
      'u-is-sibling-of-v-parent',
      'u-and-v-are-siblings',
    ]);
    expect(analysis.cases.flatMap((entry) => entry.result.matchingStatementIds)).toEqual(['I', 'II']);
  });

  it('is deterministic and keeps result arrays isolated from step snapshots', () => {
    const first = analyzeQ6ForestBinaryRelations();
    const second = analyzeQ6ForestBinaryRelations();

    expect(second).toEqual(first);
    for (const trace of first.cases) {
      expect(trace.steps[1]?.state.decodedLinks).not.toBe(trace.steps[2]?.state.decodedLinks);
      expect(trace.steps[3]?.state.decodedLinks).not.toBe(trace.steps[4]?.state.decodedLinks);
      expect(trace.steps[4]?.state.matchingStatementIds).not.toBe(trace.result.matchingStatementIds);
      expect(trace.binaryView.nodes).not.toBe(trace.forestView.nodes);
    }
    expect(first.result.possibleStatementIds).not.toBe(first.cases[1]?.result.matchingStatementIds);
  });
});

describe('forest and binary-tree relationship validation', () => {
  it.each([null, undefined, 1, 'L', 'LLL', 'lr', 'left-left'])('rejects invalid path %j', (path) => {
    expect(() => traceForestBinaryRelation(path as ForestBinaryPath)).toThrow(/path|LL|LR|RL|RR/u);
  });
});
