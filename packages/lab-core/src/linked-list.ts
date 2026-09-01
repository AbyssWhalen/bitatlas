export interface KthFromEndInput {
  readonly values: readonly number[];
  readonly k: number;
}

export type LinkedListPointerPhase =
  | 'initialize'
  | 'advance-fast'
  | 'advance-together'
  | 'found'
  | 'not-found';

export type LinkedListPointerInvariantName =
  | 'gap-building'
  | 'k-node-gap'
  | 'list-too-short';

export interface LinkedListPointerInvariant {
  readonly name: LinkedListPointerInvariantName;
  readonly expectedLead: number;
  readonly actualLead: number;
  readonly holds: boolean;
}

export interface LinkedListPointerStep {
  readonly id: string;
  readonly phase: LinkedListPointerPhase;
  /** Zero-based data-node index. Null represents the link after the tail. */
  readonly fastIndex: number | null;
  /** Zero-based data-node index. Null is used only when the list is empty. */
  readonly slowIndex: number | null;
  /** Distance between pointers when the after-tail link is treated as position n. */
  readonly lead: number;
  /** Number of data nodes already passed by the fast pointer. */
  readonly visitedCount: number;
  readonly invariant: LinkedListPointerInvariant;
}

export interface KthFromEndResult {
  readonly index: number;
  readonly value: number;
}

export interface LinkedListSearchComplexity {
  readonly passes: 1;
  readonly extraSpace: 'O(1)';
}

export interface KthFromEndTrace {
  readonly length: number;
  readonly k: number;
  readonly steps: readonly LinkedListPointerStep[];
  readonly result: KthFromEndResult | null;
  readonly complexity: LinkedListSearchComplexity;
}

function validateInput(input: KthFromEndInput): void {
  if (!Array.isArray(input.values)) {
    throw new TypeError('values must be an array');
  }
  if (!Number.isSafeInteger(input.k) || input.k < 1) {
    throw new RangeError('k must be a positive safe integer');
  }
  for (let index = 0; index < input.values.length; index += 1) {
    const value = input.values[index];
    if (!Number.isSafeInteger(value)) {
      throw new RangeError(`values[${index}] must be a safe integer`);
    }
  }
}

function pointerIndex(position: number, length: number): number | null {
  return position < length ? position : null;
}

function createInvariant(
  name: LinkedListPointerInvariantName,
  expectedLead: number,
  actualLead: number,
  holds: boolean,
): LinkedListPointerInvariant {
  if (!holds) {
    throw new Error(`linked-list pointer invariant failed: ${name}`);
  }
  return { name, expectedLead, actualLead, holds };
}

function createStep(
  sequence: number,
  phase: LinkedListPointerPhase,
  fastPosition: number,
  slowPosition: number,
  length: number,
  invariant: LinkedListPointerInvariant,
): LinkedListPointerStep {
  return {
    id: `${sequence}-${phase}`,
    phase,
    fastIndex: pointerIndex(fastPosition, length),
    slowIndex: pointerIndex(slowPosition, length),
    lead: fastPosition - slowPosition,
    visitedCount: fastPosition,
    invariant,
  };
}

/**
 * Traces the one-pass two-pointer algorithm from 2009 Q42 without constructing
 * or mutating a linked list. Array indices stand in for stable node identities.
 */
export function traceKthFromEnd(input: KthFromEndInput): KthFromEndTrace {
  validateInput(input);

  const length = input.values.length;
  const steps: LinkedListPointerStep[] = [];
  let fastPosition = 0;
  let slowPosition = 0;

  const pushStep = (
    phase: LinkedListPointerPhase,
    invariant: LinkedListPointerInvariant,
  ): void => {
    steps.push(createStep(
      steps.length,
      phase,
      fastPosition,
      slowPosition,
      length,
      invariant,
    ));
  };

  pushStep('initialize', createInvariant('gap-building', 0, 0, true));

  while (fastPosition < length && fastPosition < input.k) {
    fastPosition += 1;
    const lead = fastPosition - slowPosition;
    const reachedGap = fastPosition === input.k;
    pushStep('advance-fast', createInvariant(
      reachedGap ? 'k-node-gap' : 'gap-building',
      reachedGap ? input.k : fastPosition,
      lead,
      slowPosition === 0 && lead === fastPosition,
    ));
  }

  if (fastPosition < input.k) {
    const lead = fastPosition - slowPosition;
    pushStep('not-found', createInvariant(
      'list-too-short',
      input.k,
      lead,
      fastPosition === length && length < input.k && slowPosition === 0 && lead === length,
    ));
    return {
      length,
      k: input.k,
      steps,
      result: null,
      complexity: { passes: 1, extraSpace: 'O(1)' },
    };
  }

  while (fastPosition < length) {
    fastPosition += 1;
    slowPosition += 1;
    const lead = fastPosition - slowPosition;
    pushStep('advance-together', createInvariant(
      'k-node-gap',
      input.k,
      lead,
      lead === input.k,
    ));
  }

  const lead = fastPosition - slowPosition;
  pushStep('found', createInvariant(
    'k-node-gap',
    input.k,
    lead,
    fastPosition === length && slowPosition === length - input.k && lead === input.k,
  ));

  return {
    length,
    k: input.k,
    steps,
    result: { index: slowPosition, value: input.values[slowPosition]! },
    complexity: { passes: 1, extraSpace: 'O(1)' },
  };
}
