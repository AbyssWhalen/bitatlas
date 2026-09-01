export interface CompleteBinaryTreeConfig {
  readonly leafLevel: number;
  readonly leafCountAtLevel: number;
}

export type CompleteBinaryTreeStepKind =
  | 'initial'
  | 'bound-height'
  | 'fill-upper-levels'
  | 'partition-leaf-level'
  | 'fill-last-level'
  | 'complete';

export interface CompleteBinaryTreeStepState {
  readonly leafLevel: number;
  readonly maximumHeight: number | null;
  readonly leafLevelCapacity: number | null;
  readonly leafCountAtLevel: number;
  readonly internalNodesAtLeafLevel: number | null;
  readonly nodesThroughLeafLevel: number | null;
  readonly nodesAtLastLevel: number | null;
  readonly maximumNodeCount: number | null;
}

export interface CompleteBinaryTreeStep {
  readonly id: string;
  readonly sequence: number;
  readonly kind: CompleteBinaryTreeStepKind;
  readonly state: CompleteBinaryTreeStepState;
}

export interface CompleteBinaryTreeResult {
  readonly leafLevel: number;
  readonly maximumHeight: number;
  readonly leafLevelCapacity: number;
  readonly leafCountAtLevel: number;
  readonly internalNodesAtLeafLevel: number;
  readonly nodesThroughLeafLevel: number;
  readonly nodesAtLastLevel: number;
  readonly maximumNodeCount: number;
}

export interface CompleteBinaryTreeTrace {
  readonly steps: readonly CompleteBinaryTreeStep[];
  readonly result: CompleteBinaryTreeResult;
}

export const COMPLETE_BINARY_TREE_MAX_LEAF_LEVEL = 52;
const CONFIG_FIELDS = new Set(['leafLevel', 'leafCountAtLevel']);

function assertPositiveSafeInteger(value: unknown, label: string): asserts value is number {
  if (!Number.isSafeInteger(value) || (value as number) <= 0) {
    throw new RangeError(`${label} must be a positive safe integer`);
  }
}

function validateConfig(config: CompleteBinaryTreeConfig): void {
  if (typeof config !== 'object' || config === null || Array.isArray(config)) {
    throw new TypeError('complete binary-tree config must be an object');
  }
  const keys = Object.keys(config);
  if (keys.some((key) => !CONFIG_FIELDS.has(key)) || keys.length !== CONFIG_FIELDS.size) {
    throw new TypeError('config must contain only leafLevel and leafCountAtLevel');
  }

  assertPositiveSafeInteger(config.leafLevel, 'leafLevel');
  assertPositiveSafeInteger(config.leafCountAtLevel, 'leafCountAtLevel');
  if (config.leafLevel > COMPLETE_BINARY_TREE_MAX_LEAF_LEVEL) {
    throw new RangeError(`leafLevel must be at most ${COMPLETE_BINARY_TREE_MAX_LEAF_LEVEL}`);
  }

  const capacity = 2 ** (config.leafLevel - 1);
  if (config.leafCountAtLevel > capacity) {
    throw new RangeError(`leafCountAtLevel must not exceed level capacity ${capacity}`);
  }
}

function snapshotState(
  leafLevel: number,
  leafCountAtLevel: number,
  values: Partial<Omit<CompleteBinaryTreeStepState, 'leafLevel' | 'leafCountAtLevel'>> = {},
): CompleteBinaryTreeStepState {
  return {
    leafLevel,
    maximumHeight: values.maximumHeight ?? null,
    leafLevelCapacity: values.leafLevelCapacity ?? null,
    leafCountAtLevel,
    internalNodesAtLeafLevel: values.internalNodesAtLeafLevel ?? null,
    nodesThroughLeafLevel: values.nodesThroughLeafLevel ?? null,
    nodesAtLastLevel: values.nodesAtLastLevel ?? null,
    maximumNodeCount: values.maximumNodeCount ?? null,
  };
}

function makeStep(
  sequence: number,
  kind: CompleteBinaryTreeStepKind,
  state: CompleteBinaryTreeStepState,
): CompleteBinaryTreeStep {
  return {
    id: `complete-binary-tree-${sequence}`,
    sequence,
    kind,
    state: { ...state },
  };
}

export function traceCompleteBinaryTreeMaximum(config: CompleteBinaryTreeConfig): CompleteBinaryTreeTrace {
  validateConfig(config);

  const { leafLevel, leafCountAtLevel } = config;
  const leafLevelCapacity = 2 ** (leafLevel - 1);
  const internalNodesAtLeafLevel = leafLevelCapacity - leafCountAtLevel;
  const maximumHeight = internalNodesAtLeafLevel === 0 ? leafLevel : leafLevel + 1;
  const nodesThroughLeafLevel = 2 ** leafLevel - 1;
  const nodesAtLastLevel = internalNodesAtLeafLevel * 2;
  const maximumNodeCount = nodesThroughLeafLevel + nodesAtLastLevel;

  if (![nodesThroughLeafLevel, nodesAtLastLevel, maximumNodeCount].every(Number.isSafeInteger)) {
    throw new RangeError('derived node counts must remain safe integers');
  }

  const filled = { leafLevelCapacity, nodesThroughLeafLevel };
  const partitioned = { ...filled, internalNodesAtLeafLevel };
  const bounded = { ...partitioned, maximumHeight };
  const lastLevelFilled = { ...bounded, nodesAtLastLevel };
  const completed = { ...lastLevelFilled, maximumNodeCount };
  const steps = [
    makeStep(0, 'initial', snapshotState(leafLevel, leafCountAtLevel)),
    makeStep(1, 'fill-upper-levels', snapshotState(leafLevel, leafCountAtLevel, filled)),
    makeStep(2, 'partition-leaf-level', snapshotState(leafLevel, leafCountAtLevel, partitioned)),
    makeStep(3, 'bound-height', snapshotState(leafLevel, leafCountAtLevel, bounded)),
    makeStep(4, 'fill-last-level', snapshotState(leafLevel, leafCountAtLevel, lastLevelFilled)),
    makeStep(5, 'complete', snapshotState(leafLevel, leafCountAtLevel, completed)),
  ];

  return {
    steps,
    result: {
      leafLevel,
      maximumHeight,
      leafLevelCapacity,
      leafCountAtLevel,
      internalNodesAtLeafLevel,
      nodesThroughLeafLevel,
      nodesAtLastLevel,
      maximumNodeCount,
    },
  };
}

export const COMPLETE_BINARY_TREE_Q5_PRESET = {
  sourceQuestionId: 'cn408-2009-q05',
  reviewStatus: 'needs-review',
  expectedAnswerOptionId: 'C',
  config: {
    leafLevel: 6,
    leafCountAtLevel: 8,
  },
} as const satisfies {
  readonly sourceQuestionId: string;
  readonly reviewStatus: 'needs-review';
  readonly expectedAnswerOptionId: 'C';
  readonly config: CompleteBinaryTreeConfig;
};
