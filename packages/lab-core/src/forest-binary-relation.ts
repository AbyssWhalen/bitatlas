export type ForestBinaryPath = 'LL' | 'LR' | 'RL' | 'RR';
export type ForestBinaryNodeId = 'p' | 'u' | 'k' | 'v';
export type ForestBinaryPathNodeId = 'u' | 'k' | 'v';
export type ForestLinkKind = 'first-child' | 'next-sibling';
export type Q6StatementId = 'I' | 'II' | 'III';

export type ForestRelation =
  | 'u-is-grandparent-of-v'
  | 'u-is-parent-of-v'
  | 'u-is-sibling-of-v-parent'
  | 'u-and-v-are-siblings';

export interface BinaryViewNode {
  readonly id: ForestBinaryNodeId;
  readonly leftId: ForestBinaryNodeId | null;
  readonly rightId: ForestBinaryNodeId | null;
}

export interface BinaryView {
  readonly rootId: 'p';
  readonly nodes: readonly BinaryViewNode[];
}

export interface ForestViewNode {
  readonly id: ForestBinaryNodeId;
  readonly childIds: readonly ForestBinaryNodeId[];
}

export interface ForestView {
  readonly rootIds: readonly ['p'];
  readonly nodes: readonly ForestViewNode[];
}

export interface DecodedLink {
  readonly edgeIndex: 0 | 1;
  readonly fromId: 'u' | 'k';
  readonly toId: 'k' | 'v';
  readonly binarySide: 'L' | 'R';
  readonly forestMeaning: ForestLinkKind;
}

export type ForestBinaryStepKind = 'initial' | 'decode-edge' | 'classify' | 'complete';

export interface ForestBinaryStepState {
  readonly decodedLinks: readonly DecodedLink[];
  readonly relation: ForestRelation | null;
  readonly matchingStatementIds: readonly Q6StatementId[];
}

export interface ForestBinaryStep {
  readonly id: string;
  readonly sequence: number;
  readonly kind: ForestBinaryStepKind;
  readonly activeEdgeIndex: 0 | 1 | null;
  readonly state: ForestBinaryStepState;
}

export interface ForestBinaryCaseResult {
  readonly relation: ForestRelation;
  readonly matchingStatementIds: readonly Q6StatementId[];
}

export interface ForestBinaryCaseTrace {
  readonly path: ForestBinaryPath;
  readonly binaryView: BinaryView;
  readonly forestView: ForestView;
  readonly steps: readonly ForestBinaryStep[];
  readonly result: ForestBinaryCaseResult;
}

export interface ForestBinaryRelationTrace {
  readonly cases: readonly ForestBinaryCaseTrace[];
  readonly result: {
    readonly possibleStatementIds: readonly Q6StatementId[];
    readonly impossibleStatementIds: readonly Q6StatementId[];
    readonly answerOptionId: 'B';
  };
}

const CANONICAL_PATHS = ['LL', 'LR', 'RL', 'RR'] as const satisfies readonly ForestBinaryPath[];
const NODE_IDS = ['p', 'u', 'k', 'v'] as const satisfies readonly ForestBinaryNodeId[];
const VALID_PATHS: ReadonlySet<string> = new Set(CANONICAL_PATHS);

function assertPath(value: unknown): asserts value is ForestBinaryPath {
  if (typeof value !== 'string' || !VALID_PATHS.has(value)) {
    throw new RangeError('path must be one of LL, LR, RL, RR');
  }
}

function buildForest(path: ForestBinaryPath): ForestView {
  const children = new Map<ForestBinaryNodeId, ForestBinaryNodeId[]>(
    NODE_IDS.map((id) => [id, []]),
  );
  children.get('p')!.push('u');

  const firstParent: ForestBinaryNodeId = path[0] === 'L' ? 'u' : 'p';
  children.get(firstParent)!.push('k');
  const secondParent: ForestBinaryNodeId = path[1] === 'L' ? 'k' : firstParent;
  children.get(secondParent)!.push('v');

  return {
    rootIds: ['p'],
    nodes: NODE_IDS.map((id) => ({ id, childIds: [...children.get(id)!] })),
  };
}

function encodeForest(forest: ForestView): BinaryView {
  const binaryById = new Map<ForestBinaryNodeId, BinaryViewNode>();
  for (const node of forest.nodes) {
    binaryById.set(node.id, {
      id: node.id,
      leftId: node.childIds[0] ?? null,
      rightId: null,
    });
  }
  for (const node of forest.nodes) {
    node.childIds.forEach((childId, index) => {
      binaryById.set(childId, {
        ...binaryById.get(childId)!,
        rightId: node.childIds[index + 1] ?? null,
      });
    });
  }
  return {
    rootId: 'p',
    nodes: forest.nodes.map((node) => ({ ...binaryById.get(node.id)! })),
  };
}

function parentMap(forest: ForestView): ReadonlyMap<ForestBinaryNodeId, ForestBinaryNodeId | null> {
  const parentById = new Map<ForestBinaryNodeId, ForestBinaryNodeId | null>(
    forest.rootIds.map((id) => [id, null]),
  );
  for (const node of forest.nodes) {
    for (const childId of node.childIds) parentById.set(childId, node.id);
  }
  return parentById;
}

function classifyRelation(forest: ForestView): ForestBinaryCaseResult {
  const parentById = parentMap(forest);
  const parentOfU = parentById.get('u') ?? null;
  const parentOfV = parentById.get('v') ?? null;
  const grandparentOfV = parentOfV === null ? null : parentById.get(parentOfV) ?? null;

  let relation: ForestRelation;
  if (parentOfV === 'u') {
    relation = 'u-is-parent-of-v';
  } else if (parentOfU !== null && parentOfU === parentOfV) {
    relation = 'u-and-v-are-siblings';
  } else if (grandparentOfV === 'u') {
    relation = 'u-is-grandparent-of-v';
  } else if (parentOfV !== null && parentById.get(parentOfV) === parentOfU) {
    relation = 'u-is-sibling-of-v-parent';
  } else {
    throw new Error('forest relationship is outside the Q6 four-case proof');
  }

  const matchingStatementIds: Q6StatementId[] = [];
  if (relation === 'u-is-parent-of-v') matchingStatementIds.push('I');
  if (relation === 'u-and-v-are-siblings') matchingStatementIds.push('II');

  const parentOfParentU = parentOfU === null ? null : parentById.get(parentOfU) ?? null;
  const parentOfParentV = parentOfV === null ? null : parentById.get(parentOfV) ?? null;
  if (
    parentOfU !== null
    && parentOfV !== null
    && parentOfU !== parentOfV
    && parentOfParentU !== null
    && parentOfParentU === parentOfParentV
  ) {
    matchingStatementIds.push('III');
  }

  return { relation, matchingStatementIds: [...matchingStatementIds] };
}

function decodedLink(path: ForestBinaryPath, edgeIndex: 0 | 1): DecodedLink {
  const binarySide: 'L' | 'R' = path[edgeIndex] === 'L' ? 'L' : 'R';
  return {
    edgeIndex,
    fromId: edgeIndex === 0 ? 'u' : 'k',
    toId: edgeIndex === 0 ? 'k' : 'v',
    binarySide,
    forestMeaning: binarySide === 'L' ? 'first-child' : 'next-sibling',
  };
}

function snapshotState(
  decodedLinks: readonly DecodedLink[],
  result: ForestBinaryCaseResult | null,
): ForestBinaryStepState {
  return {
    decodedLinks: decodedLinks.map((link) => ({ ...link })),
    relation: result?.relation ?? null,
    matchingStatementIds: result ? [...result.matchingStatementIds] : [],
  };
}

export function traceForestBinaryRelation(path: ForestBinaryPath): ForestBinaryCaseTrace {
  assertPath(path);
  const forestView = buildForest(path);
  const binaryView = encodeForest(forestView);
  const result = classifyRelation(forestView);
  const firstLink = decodedLink(path, 0);
  const secondLink = decodedLink(path, 1);
  const stepInputs = [
    ['initial', null, [], null],
    ['decode-edge', 0, [firstLink], null],
    ['decode-edge', 1, [firstLink, secondLink], null],
    ['classify', null, [firstLink, secondLink], result],
    ['complete', null, [firstLink, secondLink], result],
  ] as const satisfies readonly (readonly [
    ForestBinaryStepKind,
    0 | 1 | null,
    readonly DecodedLink[],
    ForestBinaryCaseResult | null,
  ])[];

  const steps = stepInputs.map(([kind, activeEdgeIndex, decodedLinks, stepResult], sequence) => ({
    id: `forest-binary-${path.toLowerCase()}-${sequence}-${kind}`,
    sequence,
    kind,
    activeEdgeIndex,
    state: snapshotState(decodedLinks, stepResult),
  }));

  return {
    path,
    binaryView: {
      rootId: binaryView.rootId,
      nodes: binaryView.nodes.map((node) => ({ ...node })),
    },
    forestView: {
      rootIds: ['p'],
      nodes: forestView.nodes.map((node) => ({ id: node.id, childIds: [...node.childIds] })),
    },
    steps,
    result: {
      relation: result.relation,
      matchingStatementIds: [...result.matchingStatementIds],
    },
  };
}

export function analyzeQ6ForestBinaryRelations(): ForestBinaryRelationTrace {
  const cases = CANONICAL_PATHS.map((path) => traceForestBinaryRelation(path));
  const possible = new Set(cases.flatMap((entry) => entry.result.matchingStatementIds));
  const possibleStatementIds = (['I', 'II', 'III'] as const).filter((id) => possible.has(id));
  const impossibleStatementIds = (['I', 'II', 'III'] as const).filter((id) => !possible.has(id));
  if (
    possibleStatementIds.join(',') !== 'I,II'
    || impossibleStatementIds.join(',') !== 'III'
  ) {
    throw new Error('Q6 four-case proof did not derive the canonical conclusion');
  }
  return {
    cases,
    result: {
      possibleStatementIds: [...possibleStatementIds],
      impossibleStatementIds: [...impossibleStatementIds],
      answerOptionId: 'B',
    },
  };
}

export const FOREST_BINARY_RELATION_Q6_PRESET = {
  sourceQuestionId: 'cn408-2009-q06',
  reviewStatus: 'needs-review',
  paths: CANONICAL_PATHS,
  expectedAnswerOptionId: 'B',
} as const;
