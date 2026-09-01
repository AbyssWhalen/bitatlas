export interface WeightedGraphNode {
  readonly id: string;
  readonly label: string;
}

export interface WeightedGraphEdge {
  readonly id: string;
  readonly from: string;
  readonly to: string;
  readonly weight: number;
}

export interface WeightedGraph {
  readonly nodes: readonly WeightedGraphNode[];
  readonly edges: readonly WeightedGraphEdge[];
}

export interface ShortestPathDistance {
  readonly nodeId: string;
  readonly distance: number | null;
  readonly predecessorNodeId: string | null;
  readonly predecessorEdgeId: string | null;
}

export type ShortestPathStepKind =
  | 'initialize'
  | 'move'
  | 'settle'
  | 'relax'
  | 'complete'
  | 'stuck'
  | 'unreachable';

export interface ShortestPathStep {
  readonly id: string;
  readonly kind: ShortestPathStepKind;
  readonly label: string;
  readonly detail: string;
  readonly currentNodeId: string | null;
  readonly activeEdgeId: string | null;
  readonly settledNodeIds: readonly string[];
  readonly focusPathNodeIds: readonly string[];
  readonly focusPathEdgeIds: readonly string[];
  readonly distances: readonly ShortestPathDistance[];
}

export interface ShortestPathResult {
  readonly reached: boolean;
  readonly distance: number | null;
  readonly nodeIds: readonly string[];
  readonly edgeIds: readonly string[];
}

export interface ShortestPathTrace {
  readonly algorithm: 'local-nearest' | 'dijkstra';
  readonly startNodeId: string;
  readonly targetNodeId: string;
  readonly steps: readonly ShortestPathStep[];
  readonly result: ShortestPathResult;
}

export interface ShortestPathPreset {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly graph: WeightedGraph;
  readonly startNodeId: string;
  readonly targetNodeId: string;
  readonly sourceQuestionId: 'cn408-2009-q41';
  readonly reviewStatus: 'needs-review';
}

export const SHORTEST_PATH_PRESETS: readonly ShortestPathPreset[] = [
  {
    id: 'q41-longer-route',
    name: 'Q41 · 局部近路陷阱',
    description: '当前最短边先走 S-A，但真正的最短路是 S-B-T。',
    startNodeId: 'S',
    targetNodeId: 'T',
    sourceQuestionId: 'cn408-2009-q41',
    reviewStatus: 'needs-review',
    graph: {
      nodes: [
        { id: 'S', label: '起点 S' },
        { id: 'A', label: '顶点 A' },
        { id: 'B', label: '顶点 B' },
        { id: 'T', label: '目标 T' },
      ],
      edges: [
        { id: 'sa', from: 'S', to: 'A', weight: 1 },
        { id: 'sb', from: 'S', to: 'B', weight: 2 },
        { id: 'at', from: 'A', to: 'T', weight: 10 },
        { id: 'bt', from: 'B', to: 'T', weight: 2 },
      ],
    },
  },
  {
    id: 'dead-end',
    name: 'Q41 · 死路陷阱',
    description: '局部最近边走向叶结点 A，随后无法继续；S-B-T 仍然存在。',
    startNodeId: 'S',
    targetNodeId: 'T',
    sourceQuestionId: 'cn408-2009-q41',
    reviewStatus: 'needs-review',
    graph: {
      nodes: [
        { id: 'S', label: '起点 S' },
        { id: 'A', label: '死路 A' },
        { id: 'B', label: '顶点 B' },
        { id: 'T', label: '目标 T' },
      ],
      edges: [
        { id: 'sa', from: 'S', to: 'A', weight: 1 },
        { id: 'sb', from: 'S', to: 'B', weight: 2 },
        { id: 'bt', from: 'B', to: 'T', weight: 2 },
      ],
    },
  },
  {
    id: 'same-result',
    name: '对照 · 结果一致',
    description: '局部最近边恰好落在全局最短路上，但这不能证明算法总是正确。',
    startNodeId: 'S',
    targetNodeId: 'T',
    sourceQuestionId: 'cn408-2009-q41',
    reviewStatus: 'needs-review',
    graph: {
      nodes: [
        { id: 'S', label: '起点 S' },
        { id: 'A', label: '顶点 A' },
        { id: 'B', label: '顶点 B' },
        { id: 'T', label: '目标 T' },
      ],
      edges: [
        { id: 'sa', from: 'S', to: 'A', weight: 2 },
        { id: 'sb', from: 'S', to: 'B', weight: 5 },
        { id: 'at', from: 'A', to: 'T', weight: 2 },
        { id: 'bt', from: 'B', to: 'T', weight: 2 },
      ],
    },
  },
] as const;

interface AdjacentEdge {
  readonly edge: WeightedGraphEdge;
  readonly nodeId: string;
}

interface GraphContext {
  readonly graph: WeightedGraph;
  readonly nodeById: ReadonlyMap<string, WeightedGraphNode>;
  readonly adjacency: ReadonlyMap<string, readonly AdjacentEdge[]>;
}

interface MutableDistance {
  distance: number | null;
  predecessorNodeId: string | null;
  predecessorEdgeId: string | null;
}

function buildGraphContext(graph: WeightedGraph, startNodeId: string, targetNodeId: string): GraphContext {
  if (!graph.nodes.length) throw new RangeError('graph must contain at least one node');
  const nodeById = new Map<string, WeightedGraphNode>();
  const adjacency = new Map<string, AdjacentEdge[]>();
  for (const node of graph.nodes) {
    if (!node.id.trim() || !node.label.trim()) throw new RangeError('node id and label must not be empty');
    if (nodeById.has(node.id)) throw new RangeError(`graph contains duplicate node ${node.id}`);
    nodeById.set(node.id, node);
    adjacency.set(node.id, []);
  }
  if (!nodeById.has(startNodeId)) throw new RangeError(`start node ${startNodeId} does not exist`);
  if (!nodeById.has(targetNodeId)) throw new RangeError(`target node ${targetNodeId} does not exist`);

  const edgeIds = new Set<string>();
  for (const edge of graph.edges) {
    if (!edge.id.trim()) throw new RangeError('edge id must not be empty');
    if (edgeIds.has(edge.id)) throw new RangeError(`graph contains duplicate edge ${edge.id}`);
    edgeIds.add(edge.id);
    if (!nodeById.has(edge.from) || !nodeById.has(edge.to)) {
      throw new RangeError(`edge ${edge.id} references an unknown endpoint`);
    }
    if (!Number.isSafeInteger(edge.weight) || edge.weight < 0) {
      throw new RangeError(`edge ${edge.id} weight must be a nonnegative safe integer`);
    }
    adjacency.get(edge.from)!.push({ edge, nodeId: edge.to });
    if (edge.from !== edge.to) adjacency.get(edge.to)!.push({ edge, nodeId: edge.from });
  }

  for (const adjacent of adjacency.values()) {
    adjacent.sort((left, right) => (
      left.edge.weight - right.edge.weight
      || left.nodeId.localeCompare(right.nodeId)
      || left.edge.id.localeCompare(right.edge.id)
    ));
  }
  return { graph, nodeById, adjacency };
}

function safeAddDistance(left: number, right: number): number {
  const total = left + right;
  if (!Number.isSafeInteger(total)) throw new RangeError('path distance exceeds safe integer precision');
  return total;
}

function distanceSnapshot(
  graph: WeightedGraph,
  distances: ReadonlyMap<string, MutableDistance>,
): readonly ShortestPathDistance[] {
  return graph.nodes.map((node) => {
    const entry = distances.get(node.id)!;
    return { nodeId: node.id, ...entry };
  });
}

function createStep(
  graph: WeightedGraph,
  distances: ReadonlyMap<string, MutableDistance>,
  step: Omit<ShortestPathStep, 'id' | 'distances'>,
  index: number,
): ShortestPathStep {
  return { id: `${String(index).padStart(2, '0')}-${step.kind}`, ...step, distances: distanceSnapshot(graph, distances) };
}

function emptyDistances(graph: WeightedGraph): Map<string, MutableDistance> {
  return new Map(graph.nodes.map((node) => [node.id, {
    distance: null,
    predecessorNodeId: null,
    predecessorEdgeId: null,
  }]));
}

function pathFromPredecessors(
  startNodeId: string,
  targetNodeId: string,
  distances: ReadonlyMap<string, MutableDistance>,
): { nodeIds: string[]; edgeIds: string[] } | null {
  const nodeIds = [targetNodeId];
  const edgeIds: string[] = [];
  const seen = new Set(nodeIds);
  let current = targetNodeId;
  while (current !== startNodeId) {
    const entry = distances.get(current);
    if (!entry?.predecessorNodeId || !entry.predecessorEdgeId) return null;
    current = entry.predecessorNodeId;
    if (seen.has(current)) throw new Error('predecessor chain contains a cycle');
    seen.add(current);
    nodeIds.push(current);
    edgeIds.push(entry.predecessorEdgeId);
  }
  return { nodeIds: nodeIds.reverse(), edgeIds: edgeIds.reverse() };
}

export function simulateLocalNearest(
  graph: WeightedGraph,
  startNodeId: string,
  targetNodeId: string,
): ShortestPathTrace {
  const context = buildGraphContext(graph, startNodeId, targetNodeId);
  const distances = emptyDistances(graph);
  distances.get(startNodeId)!.distance = 0;
  const visited = new Set([startNodeId]);
  const nodeIds = [startNodeId];
  const edgeIds: string[] = [];
  const steps: ShortestPathStep[] = [];
  let currentNodeId = startNodeId;
  let totalDistance = 0;

  steps.push(createStep(graph, distances, {
    kind: 'initialize',
    label: '从起点出发',
    detail: `路径初始只包含 ${context.nodeById.get(startNodeId)!.label}。`,
    currentNodeId,
    activeEdgeId: null,
    settledNodeIds: [...visited],
    focusPathNodeIds: [...nodeIds],
    focusPathEdgeIds: [...edgeIds],
  }, steps.length));

  while (currentNodeId !== targetNodeId) {
    const candidate = context.adjacency.get(currentNodeId)!
      .find((entry) => !visited.has(entry.nodeId));
    if (!candidate) {
      steps.push(createStep(graph, distances, {
        kind: 'stuck',
        label: '局部选择走入死路',
        detail: `${context.nodeById.get(currentNodeId)!.label} 没有尚未经过的相邻顶点，但目标仍未到达。`,
        currentNodeId,
        activeEdgeId: null,
        settledNodeIds: [...visited],
        focusPathNodeIds: [...nodeIds],
        focusPathEdgeIds: [...edgeIds],
      }, steps.length));
      return {
        algorithm: 'local-nearest',
        startNodeId,
        targetNodeId,
        steps,
        result: { reached: false, distance: null, nodeIds, edgeIds },
      };
    }

    const fromNodeId = currentNodeId;
    currentNodeId = candidate.nodeId;
    totalDistance = safeAddDistance(totalDistance, candidate.edge.weight);
    visited.add(currentNodeId);
    nodeIds.push(currentNodeId);
    edgeIds.push(candidate.edge.id);
    const distance = distances.get(currentNodeId)!;
    distance.distance = totalDistance;
    distance.predecessorNodeId = fromNodeId;
    distance.predecessorEdgeId = candidate.edge.id;
    steps.push(createStep(graph, distances, {
      kind: 'move',
      label: `选择当前最近边 ${candidate.edge.id}`,
      detail: `${context.nodeById.get(fromNodeId)!.label} → ${context.nodeById.get(currentNodeId)!.label}，边权 ${candidate.edge.weight}，累计 ${totalDistance}。`,
      currentNodeId,
      activeEdgeId: candidate.edge.id,
      settledNodeIds: [...visited],
      focusPathNodeIds: [...nodeIds],
      focusPathEdgeIds: [...edgeIds],
    }, steps.length));
  }

  steps.push(createStep(graph, distances, {
    kind: 'complete',
    label: '到达目标顶点',
    detail: `题设方法停止，所得路径长度为 ${totalDistance}；该结果仍需与全局最短路比较。`,
    currentNodeId,
    activeEdgeId: null,
    settledNodeIds: [...visited],
    focusPathNodeIds: [...nodeIds],
    focusPathEdgeIds: [...edgeIds],
  }, steps.length));
  return {
    algorithm: 'local-nearest',
    startNodeId,
    targetNodeId,
    steps,
    result: { reached: true, distance: totalDistance, nodeIds, edgeIds },
  };
}

export function simulateDijkstra(
  graph: WeightedGraph,
  startNodeId: string,
  targetNodeId: string,
): ShortestPathTrace {
  const context = buildGraphContext(graph, startNodeId, targetNodeId);
  const distances = emptyDistances(graph);
  distances.get(startNodeId)!.distance = 0;
  const settled = new Set<string>();
  const steps: ShortestPathStep[] = [];

  steps.push(createStep(graph, distances, {
    kind: 'initialize',
    label: '初始化全局距离',
    detail: `令 d(${startNodeId}) = 0，其余顶点距离为 ∞。`,
    currentNodeId: startNodeId,
    activeEdgeId: null,
    settledNodeIds: [],
    focusPathNodeIds: [startNodeId],
    focusPathEdgeIds: [],
  }, steps.length));

  while (!settled.has(targetNodeId)) {
    const currentNodeId = graph.nodes
      .filter((node) => !settled.has(node.id) && distances.get(node.id)!.distance !== null)
      .sort((left, right) => (
        distances.get(left.id)!.distance! - distances.get(right.id)!.distance!
        || left.id.localeCompare(right.id)
      ))[0]?.id;

    if (!currentNodeId) {
      steps.push(createStep(graph, distances, {
        kind: 'unreachable',
        label: '目标不可达',
        detail: '所有可达顶点均已确定，目标距离仍为 ∞。',
        currentNodeId: null,
        activeEdgeId: null,
        settledNodeIds: [...settled],
        focusPathNodeIds: [],
        focusPathEdgeIds: [],
      }, steps.length));
      return {
        algorithm: 'dijkstra',
        startNodeId,
        targetNodeId,
        steps,
        result: { reached: false, distance: null, nodeIds: [], edgeIds: [] },
      };
    }

    settled.add(currentNodeId);
    const currentPath = pathFromPredecessors(startNodeId, currentNodeId, distances)!;
    steps.push(createStep(graph, distances, {
      kind: 'settle',
      label: `确定 ${currentNodeId} 的最短距离`,
      detail: `未确定顶点中 d(${currentNodeId}) 最小，将其标记为已确定。`,
      currentNodeId,
      activeEdgeId: null,
      settledNodeIds: [...settled],
      focusPathNodeIds: currentPath.nodeIds,
      focusPathEdgeIds: currentPath.edgeIds,
    }, steps.length));
    if (currentNodeId === targetNodeId) break;

    const currentDistance = distances.get(currentNodeId)!.distance!;
    for (const adjacent of context.adjacency.get(currentNodeId)!) {
      if (settled.has(adjacent.nodeId)) continue;
      const candidateDistance = safeAddDistance(currentDistance, adjacent.edge.weight);
      const previous = distances.get(adjacent.nodeId)!;
      const shouldUpdate = previous.distance === null || candidateDistance < previous.distance;
      if (!shouldUpdate) continue;
      previous.distance = candidateDistance;
      previous.predecessorNodeId = currentNodeId;
      previous.predecessorEdgeId = adjacent.edge.id;
      const focusPath = pathFromPredecessors(startNodeId, adjacent.nodeId, distances)!;
      steps.push(createStep(graph, distances, {
        kind: 'relax',
        label: `松弛边 ${adjacent.edge.id}`,
        detail: `d(${adjacent.nodeId}) 更新为 ${currentDistance} + ${adjacent.edge.weight} = ${candidateDistance}。`,
        currentNodeId: adjacent.nodeId,
        activeEdgeId: adjacent.edge.id,
        settledNodeIds: [...settled],
        focusPathNodeIds: focusPath.nodeIds,
        focusPathEdgeIds: focusPath.edgeIds,
      }, steps.length));
    }
  }

  const path = pathFromPredecessors(startNodeId, targetNodeId, distances)!;
  const distance = distances.get(targetNodeId)!.distance!;
  steps.push(createStep(graph, distances, {
    kind: 'complete',
    label: '得到全局最短路径',
    detail: `${path.nodeIds.join(' → ')}，总长度 ${distance}。`,
    currentNodeId: targetNodeId,
    activeEdgeId: null,
    settledNodeIds: [...settled],
    focusPathNodeIds: path.nodeIds,
    focusPathEdgeIds: path.edgeIds,
  }, steps.length));
  return {
    algorithm: 'dijkstra',
    startNodeId,
    targetNodeId,
    steps,
    result: { reached: true, distance, nodeIds: path.nodeIds, edgeIds: path.edgeIds },
  };
}
