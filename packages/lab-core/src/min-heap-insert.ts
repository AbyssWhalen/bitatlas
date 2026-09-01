export interface MinHeapInsertConfig {
  readonly initialHeap: readonly number[];
  readonly insertedValue: number;
}

export type MinHeapInsertStepKind = 'initial' | 'append' | 'swap' | 'compare' | 'complete';

export interface MinHeapInsertStep {
  readonly id: string;
  readonly sequence: number;
  readonly kind: MinHeapInsertStepKind;
  readonly description: string;
  readonly heap: readonly number[];
  /** Current array position of the inserted value after this step. */
  readonly focusIndex: number | null;
  /** Child position used by this comparison, before any swap. */
  readonly childIndex: number | null;
  /** Parent position used by this comparison, before any swap. */
  readonly parentIndex: number | null;
  readonly comparedValue: number | null;
  readonly swapped: boolean;
}

export interface MinHeapInsertResult {
  readonly finalHeap: readonly number[];
  readonly insertedValue: number;
  readonly swapCount: number;
  readonly finalIndex: number;
}

export interface MinHeapInsertTrace {
  readonly initialHeap: readonly number[];
  readonly steps: readonly MinHeapInsertStep[];
  readonly finalHeap: readonly number[];
  readonly result: MinHeapInsertResult;
}

export const MIN_HEAP_MAX_ITEMS = 64;

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function assertSafeInteger(value: unknown, label: string): asserts value is number {
  if (!Number.isSafeInteger(value)) {
    throw new RangeError(`${label} must be a safe integer`);
  }
}

function validateConfig(config: unknown): asserts config is MinHeapInsertConfig {
  if (!isRecord(config)) {
    throw new TypeError('min-heap insertion config must be an object');
  }
  if (!Array.isArray(config.initialHeap)) {
    throw new TypeError('initialHeap must be an array');
  }
  if (config.initialHeap.length >= MIN_HEAP_MAX_ITEMS) {
    throw new RangeError(`the resulting heap must contain at most ${MIN_HEAP_MAX_ITEMS} items`);
  }

  for (let index = 0; index < config.initialHeap.length; index += 1) {
    assertSafeInteger(config.initialHeap[index], `initialHeap[${index}]`);
  }
  assertSafeInteger(config.insertedValue, 'insertedValue');

  for (let childIndex = 1; childIndex < config.initialHeap.length; childIndex += 1) {
    const parentIndex = Math.floor((childIndex - 1) / 2);
    if (config.initialHeap[parentIndex]! > config.initialHeap[childIndex]!) {
      throw new RangeError(
        `initialHeap must be a min-heap: parent at index ${parentIndex} exceeds child at index ${childIndex}`,
      );
    }
  }
}

function createStep(
  sequence: number,
  kind: MinHeapInsertStepKind,
  description: string,
  heap: readonly number[],
  focusIndex: number | null,
  childIndex: number | null,
  parentIndex: number | null,
  comparedValue: number | null,
  swapped: boolean,
): MinHeapInsertStep {
  return {
    id: `min-heap-insert-${sequence}-${kind}`,
    sequence,
    kind,
    description,
    heap: [...heap],
    focusIndex,
    childIndex,
    parentIndex,
    comparedValue,
    swapped,
  };
}

/** Inserts one key into an existing array-form min-heap and records each sift-up decision. */
export function traceMinHeapInsert(config: MinHeapInsertConfig): MinHeapInsertTrace {
  validateConfig(config);
  const initialHeap = [...config.initialHeap];
  const heap = [...initialHeap];
  const steps: MinHeapInsertStep[] = [createStep(
    0,
    'initial',
    'Validate the original array-form min-heap.',
    heap,
    null,
    null,
    null,
    null,
    false,
  )];

  heap.push(config.insertedValue);
  let focusIndex = heap.length - 1;
  let swapCount = 0;
  const appendedParentIndex = focusIndex === 0 ? null : Math.floor((focusIndex - 1) / 2);
  steps.push(createStep(
    steps.length,
    'append',
    `Append ${config.insertedValue} at index ${focusIndex}.`,
    heap,
    focusIndex,
    focusIndex,
    appendedParentIndex,
    appendedParentIndex === null ? null : heap[appendedParentIndex]!,
    false,
  ));

  while (focusIndex > 0) {
    const childIndex = focusIndex;
    const parentIndex = Math.floor((childIndex - 1) / 2);
    const parentValue = heap[parentIndex]!;
    if (heap[childIndex]! >= parentValue) {
      steps.push(createStep(
        steps.length,
        'compare',
        `${heap[childIndex]} at index ${childIndex} is not smaller than parent ${parentValue}; stop.`,
        heap,
        focusIndex,
        childIndex,
        parentIndex,
        parentValue,
        false,
      ));
      break;
    }

    [heap[parentIndex], heap[childIndex]] = [heap[childIndex]!, heap[parentIndex]!];
    focusIndex = parentIndex;
    swapCount += 1;
    steps.push(createStep(
      steps.length,
      'swap',
      `Swap the inserted value with parent ${parentValue} at index ${parentIndex}.`,
      heap,
      focusIndex,
      childIndex,
      parentIndex,
      parentValue,
      true,
    ));
  }

  steps.push(createStep(
    steps.length,
    'complete',
    focusIndex === 0
      ? 'The inserted value reached the root; insertion is complete.'
      : 'The min-heap property holds; insertion is complete.',
    heap,
    focusIndex,
    null,
    null,
    null,
    false,
  ));

  const finalHeap = [...heap];
  return {
    initialHeap: [...initialHeap],
    steps,
    finalHeap,
    result: {
      finalHeap: [...finalHeap],
      insertedValue: config.insertedValue,
      swapCount,
      finalIndex: focusIndex,
    },
  };
}

export const MIN_HEAP_INSERT_Q9_PRESET = {
  sourceQuestionId: 'cn408-2009-q09',
  reviewStatus: 'needs-review',
  config: {
    initialHeap: [5, 8, 12, 19, 28, 20, 15, 22],
    insertedValue: 3,
  },
  expectedFinalHeap: [3, 5, 12, 8, 28, 20, 15, 22, 19],
} as const satisfies {
  readonly sourceQuestionId: 'cn408-2009-q09';
  readonly reviewStatus: 'needs-review';
  readonly config: MinHeapInsertConfig;
  readonly expectedFinalHeap: readonly number[];
};
