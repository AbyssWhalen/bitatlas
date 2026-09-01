import { describe, expect, it } from 'vitest';
import {
  SHORTEST_PATH_PRESETS,
  simulateDijkstra,
  simulateLocalNearest,
  type WeightedGraph,
} from './shortest-path';

const q41 = SHORTEST_PATH_PRESETS[0]!;

describe('Q41 local-nearest counterexample', () => {
  it('reproduces a deterministic longer local path while Dijkstra finds the optimum', () => {
    const local = simulateLocalNearest(q41.graph, q41.startNodeId, q41.targetNodeId);
    const dijkstra = simulateDijkstra(q41.graph, q41.startNodeId, q41.targetNodeId);

    expect(local.result).toEqual({
      reached: true,
      distance: 11,
      nodeIds: ['S', 'A', 'T'],
      edgeIds: ['sa', 'at'],
    });
    expect(dijkstra.result).toEqual({
      reached: true,
      distance: 4,
      nodeIds: ['S', 'B', 'T'],
      edgeIds: ['sb', 'bt'],
    });
    expect(local.steps.map((step) => step.kind)).toEqual([
      'initialize', 'move', 'move', 'complete',
    ]);
    expect(dijkstra.steps.map((step) => [step.kind, step.currentNodeId, step.activeEdgeId])).toEqual([
      ['initialize', 'S', null],
      ['settle', 'S', null],
      ['relax', 'A', 'sa'],
      ['relax', 'B', 'sb'],
      ['settle', 'A', null],
      ['relax', 'T', 'at'],
      ['settle', 'B', null],
      ['relax', 'T', 'bt'],
      ['settle', 'T', null],
      ['complete', 'T', null],
    ]);
    expect(dijkstra.steps.at(-1)?.distances).toEqual([
      { nodeId: 'S', distance: 0, predecessorNodeId: null, predecessorEdgeId: null },
      { nodeId: 'A', distance: 1, predecessorNodeId: 'S', predecessorEdgeId: 'sa' },
      { nodeId: 'B', distance: 2, predecessorNodeId: 'S', predecessorEdgeId: 'sb' },
      { nodeId: 'T', distance: 4, predecessorNodeId: 'B', predecessorEdgeId: 'bt' },
    ]);
  });

  it('shows that local-nearest can become stuck even when a path exists', () => {
    const preset = SHORTEST_PATH_PRESETS.find((candidate) => candidate.id === 'dead-end')!;
    const local = simulateLocalNearest(preset.graph, preset.startNodeId, preset.targetNodeId);
    const dijkstra = simulateDijkstra(preset.graph, preset.startNodeId, preset.targetNodeId);

    expect(local.result).toEqual({ reached: false, distance: null, nodeIds: ['S', 'A'], edgeIds: ['sa'] });
    expect(local.steps.at(-1)?.kind).toBe('stuck');
    expect(dijkstra.result).toEqual({
      reached: true,
      distance: 4,
      nodeIds: ['S', 'B', 'T'],
      edgeIds: ['sb', 'bt'],
    });
  });
});

describe('deterministic shortest-path traces', () => {
  it('uses node and edge ids as stable tie breakers', () => {
    const graph: WeightedGraph = {
      nodes: [
        { id: 'S', label: '起点' },
        { id: 'B', label: '乙' },
        { id: 'A', label: '甲' },
        { id: 'T', label: '终点' },
      ],
      edges: [
        { id: 'sb', from: 'S', to: 'B', weight: 1 },
        { id: 'sa-z', from: 'S', to: 'A', weight: 1 },
        { id: 'sa-a', from: 'S', to: 'A', weight: 1 },
        { id: 'bt', from: 'B', to: 'T', weight: 2 },
        { id: 'at', from: 'A', to: 'T', weight: 2 },
      ],
    };

    expect(simulateLocalNearest(graph, 'S', 'T').result.edgeIds).toEqual(['sa-a', 'at']);
    expect(simulateDijkstra(graph, 'S', 'T').result.edgeIds).toEqual(['sa-a', 'at']);
  });

  it('supports zero-weight edges and the start-equals-target boundary', () => {
    const graph: WeightedGraph = {
      nodes: [{ id: 'S', label: 'S' }, { id: 'T', label: 'T' }],
      edges: [{ id: 'st', from: 'S', to: 'T', weight: 0 }],
    };

    expect(simulateDijkstra(graph, 'S', 'T').result.distance).toBe(0);
    expect(simulateLocalNearest(graph, 'S', 'T').result.distance).toBe(0);
    expect(simulateDijkstra(graph, 'S', 'S').result).toEqual({
      reached: true,
      distance: 0,
      nodeIds: ['S'],
      edgeIds: [],
    });
  });

  it('returns an explicit unreachable trace instead of inventing a route', () => {
    const graph: WeightedGraph = {
      nodes: [{ id: 'S', label: 'S' }, { id: 'T', label: 'T' }],
      edges: [],
    };

    const trace = simulateDijkstra(graph, 'S', 'T');
    expect(trace.result).toEqual({ reached: false, distance: null, nodeIds: [], edgeIds: [] });
    expect(trace.steps.at(-1)?.kind).toBe('unreachable');
  });
});

describe('strict graph validation', () => {
  const base: WeightedGraph = {
    nodes: [{ id: 'S', label: 'S' }, { id: 'T', label: 'T' }],
    edges: [{ id: 'st', from: 'S', to: 'T', weight: 1 }],
  };

  it.each([
    { ...base, nodes: [...base.nodes, { id: 'S', label: 'duplicate' }] },
    { ...base, edges: [...base.edges, { ...base.edges[0]! }] },
    { ...base, edges: [{ id: 'st', from: 'S', to: 'X', weight: 1 }] },
    { ...base, edges: [{ id: 'st', from: 'S', to: 'T', weight: -1 }] },
    { ...base, edges: [{ id: 'st', from: 'S', to: 'T', weight: 1.5 }] },
  ])('rejects an invalid graph', (graph) => {
    expect(() => simulateDijkstra(graph, 'S', 'T')).toThrow();
  });

  it('rejects unknown endpoints and unsafe accumulated distances', () => {
    expect(() => simulateDijkstra(base, 'missing', 'T')).toThrow(/start/u);
    expect(() => simulateLocalNearest(base, 'S', 'missing')).toThrow(/target/u);
    expect(() => simulateDijkstra({
      nodes: [{ id: 'S', label: 'S' }, { id: 'A', label: 'A' }, { id: 'T', label: 'T' }],
      edges: [
        { id: 'sa', from: 'S', to: 'A', weight: Number.MAX_SAFE_INTEGER },
        { id: 'at', from: 'A', to: 'T', weight: 1 },
      ],
    }, 'S', 'T')).toThrow(/safe integer/u);
  });
});
