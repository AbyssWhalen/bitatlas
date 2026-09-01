export type TraversalOrder = 'NLR' | 'NRL' | 'LNR' | 'LRN' | 'RNL' | 'RLN';

export interface BinaryTreeNode {
  readonly id: string;
  readonly label: string;
  readonly leftId: string | null;
  readonly rightId: string | null;
}

export interface BinaryTreeTraversalConfig {
  readonly nodes: readonly BinaryTreeNode[];
  readonly rootId: string;
  readonly order: TraversalOrder;
}

export interface BinaryTreeTraversalState {
  readonly callStack: readonly string[];
  readonly activeNodeId: string | null;
  readonly visitedNodeIds: readonly string[];
}

export type BinaryTreeTraversalStepKind = 'initial' | 'enter' | 'visit' | 'leave';

export interface BinaryTreeTraversalStep {
  readonly id: string;
  readonly sequence: number;
  readonly kind: BinaryTreeTraversalStepKind;
  readonly nodeId: string | null;
  readonly state: BinaryTreeTraversalState;
}

export interface BinaryTreeTraversalResult {
  readonly visitedNodeIds: readonly string[];
  readonly visitedLabels: readonly string[];
}

export interface BinaryTreeTraversalTrace {
  readonly order: TraversalOrder;
  readonly rootId: string;
  readonly nodes: readonly BinaryTreeNode[];
  readonly initialState: BinaryTreeTraversalState;
  readonly steps: readonly BinaryTreeTraversalStep[];
  readonly finalState: BinaryTreeTraversalState;
  readonly result: BinaryTreeTraversalResult;
}

export const BINARY_TREE_MAX_NODES = 63;
export const BINARY_TREE_MAX_ID_LENGTH = 32;
export const BINARY_TREE_MAX_LABEL_LENGTH = 64;

const TRAVERSAL_ORDERS: ReadonlySet<string> = new Set([
  'NLR',
  'NRL',
  'LNR',
  'LRN',
  'RNL',
  'RLN',
]);

type TraversalToken = 'N' | 'L' | 'R';

interface TreeContext {
  readonly nodes: readonly BinaryTreeNode[];
  readonly nodeById: ReadonlyMap<string, BinaryTreeNode>;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function assertBoundedText(value: unknown, label: string, maximumLength: number): asserts value is string {
  if (typeof value !== 'string' || value.trim().length === 0 || value.length > maximumLength) {
    throw new RangeError(`${label} must be non-empty and at most ${maximumLength} characters`);
  }
  const hasControlCharacter = [...value].some((character) => {
    const codePoint = character.codePointAt(0)!;
    return codePoint < 32 || codePoint === 127;
  });
  if (hasControlCharacter) {
    throw new RangeError(`${label} must not contain control characters`);
  }
}

function assertNodeId(value: unknown, label: string): asserts value is string {
  assertBoundedText(value, label, BINARY_TREE_MAX_ID_LENGTH);
}

function assertOrder(value: unknown): asserts value is TraversalOrder {
  if (typeof value !== 'string' || !TRAVERSAL_ORDERS.has(value)) {
    throw new RangeError(`order must be one of ${[...TRAVERSAL_ORDERS].join(', ')}`);
  }
}

function validateConfig(config: unknown): TreeContext {
  if (!isRecord(config)) {
    throw new TypeError('binary-tree traversal config must be an object');
  }
  if (!Array.isArray(config.nodes)) {
    throw new TypeError('nodes must be an array');
  }
  if (config.nodes.length === 0 || config.nodes.length > BINARY_TREE_MAX_NODES) {
    throw new RangeError(`nodes must contain from 1 through ${BINARY_TREE_MAX_NODES} entries`);
  }
  assertNodeId(config.rootId, 'rootId');
  assertOrder(config.order);

  const nodes: BinaryTreeNode[] = [];
  const nodeById = new Map<string, BinaryTreeNode>();
  for (let index = 0; index < config.nodes.length; index += 1) {
    const candidate = config.nodes[index];
    if (!isRecord(candidate)) {
      throw new TypeError(`nodes[${index}] must be a binary-tree node`);
    }
    assertNodeId(candidate.id, `nodes[${index}].id`);
    assertBoundedText(candidate.label, `nodes[${index}].label`, BINARY_TREE_MAX_LABEL_LENGTH);
    if (candidate.leftId !== null) assertNodeId(candidate.leftId, `nodes[${index}].leftId`);
    if (candidate.rightId !== null) assertNodeId(candidate.rightId, `nodes[${index}].rightId`);
    if (nodeById.has(candidate.id)) {
      throw new RangeError(`nodes contains duplicate id ${candidate.id}`);
    }
    const node: BinaryTreeNode = {
      id: candidate.id,
      label: candidate.label,
      leftId: candidate.leftId,
      rightId: candidate.rightId,
    };
    nodes.push(node);
    nodeById.set(node.id, node);
  }

  if (!nodeById.has(config.rootId)) {
    throw new RangeError(`rootId ${config.rootId} does not identify a node`);
  }

  const parentByChild = new Map<string, string>();
  for (const node of nodes) {
    for (const childId of [node.leftId, node.rightId]) {
      if (childId === null) continue;
      if (!nodeById.has(childId)) {
        throw new RangeError(`node ${node.id} references unknown child ${childId}`);
      }
      const existingParent = parentByChild.get(childId);
      if (existingParent !== undefined) {
        throw new RangeError(`node ${childId} has multiple parents: ${existingParent} and ${node.id}`);
      }
      parentByChild.set(childId, node.id);
    }
  }

  const colors = new Map<string, 'visiting' | 'visited'>();
  const detectCycle = (nodeId: string): void => {
    const color = colors.get(nodeId);
    if (color === 'visiting') throw new RangeError(`binary tree contains a cycle at ${nodeId}`);
    if (color === 'visited') return;
    colors.set(nodeId, 'visiting');
    const node = nodeById.get(nodeId)!;
    if (node.leftId !== null) detectCycle(node.leftId);
    if (node.rightId !== null) detectCycle(node.rightId);
    colors.set(nodeId, 'visited');
  };
  for (const node of nodes) detectCycle(node.id);

  if (parentByChild.has(config.rootId)) {
    throw new RangeError(`root node ${config.rootId} must not have a parent`);
  }

  const reachable = new Set<string>();
  const markReachable = (nodeId: string): void => {
    if (reachable.has(nodeId)) return;
    reachable.add(nodeId);
    const node = nodeById.get(nodeId)!;
    if (node.leftId !== null) markReachable(node.leftId);
    if (node.rightId !== null) markReachable(node.rightId);
  };
  markReachable(config.rootId);
  if (reachable.size !== nodes.length) {
    const unreachable = nodes.find((node) => !reachable.has(node.id))!;
    throw new RangeError(`node ${unreachable.id} is unreachable from root ${config.rootId}`);
  }

  return { nodes, nodeById };
}

function snapshotState(
  callStack: readonly string[],
  activeNodeId: string | null,
  visitedNodeIds: readonly string[],
): BinaryTreeTraversalState {
  return {
    callStack: [...callStack],
    activeNodeId,
    visitedNodeIds: [...visitedNodeIds],
  };
}

export function traceBinaryTreeTraversal(config: BinaryTreeTraversalConfig): BinaryTreeTraversalTrace {
  const context = validateConfig(config);
  const callStack: string[] = [];
  const visitedNodeIds: string[] = [];
  const steps: BinaryTreeTraversalStep[] = [];

  const pushStep = (kind: BinaryTreeTraversalStepKind, nodeId: string | null): void => {
    const sequence = steps.length;
    steps.push({
      id: `binary-tree-traversal-${sequence}-${kind}`,
      sequence,
      kind,
      nodeId,
      state: snapshotState(callStack, callStack.at(-1) ?? null, visitedNodeIds),
    });
  };

  pushStep('initial', null);

  const visit = (nodeId: string): void => {
    const node = context.nodeById.get(nodeId)!;
    callStack.push(nodeId);
    pushStep('enter', nodeId);

    for (const token of config.order as Iterable<TraversalToken>) {
      if (token === 'N') {
        visitedNodeIds.push(nodeId);
        pushStep('visit', nodeId);
      } else {
        const childId = token === 'L' ? node.leftId : node.rightId;
        if (childId !== null) visit(childId);
      }
    }

    const removed = callStack.pop();
    if (removed !== nodeId) throw new Error('binary-tree traversal call stack became inconsistent');
    pushStep('leave', nodeId);
  };

  visit(config.rootId);
  const initialState = snapshotState([], null, []);
  const finalState = snapshotState(callStack, callStack.at(-1) ?? null, visitedNodeIds);
  return {
    order: config.order,
    rootId: config.rootId,
    nodes: context.nodes.map((node) => ({ ...node })),
    initialState,
    steps,
    finalState,
    result: {
      visitedNodeIds: [...visitedNodeIds],
      visitedLabels: visitedNodeIds.map((nodeId) => context.nodeById.get(nodeId)!.label),
    },
  };
}

export const BINARY_TREE_TRAVERSAL_Q3_PRESET = {
  sourceQuestionId: 'cn408-2009-q03',
  reviewStatus: 'needs-review',
  config: {
    nodes: [
      { id: '1', label: '1', leftId: '2', rightId: '3' },
      { id: '2', label: '2', leftId: '4', rightId: '5' },
      { id: '3', label: '3', leftId: null, rightId: null },
      { id: '4', label: '4', leftId: null, rightId: null },
      { id: '5', label: '5', leftId: '6', rightId: '7' },
      { id: '6', label: '6', leftId: null, rightId: null },
      { id: '7', label: '7', leftId: null, rightId: null },
    ],
    rootId: '1',
    order: 'RNL',
  },
  expectedVisitedLabels: ['3', '1', '7', '5', '6', '2', '4'],
} as const satisfies {
  readonly sourceQuestionId: 'cn408-2009-q03';
  readonly reviewStatus: 'needs-review';
  readonly config: BinaryTreeTraversalConfig;
  readonly expectedVisitedLabels: readonly string[];
};
