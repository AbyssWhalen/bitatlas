export interface StackCapacityConfig {
  readonly inputOrder: readonly string[];
  readonly outputOrder: readonly string[];
}

export type StackCapacityAction = 'initial' | 'push' | 'pop';

export interface StackCapacityStep {
  readonly id: string;
  readonly action: StackCapacityAction;
  readonly value: string | null;
  readonly targetOutput: string | null;
  readonly inputIndex: number;
  readonly stack: readonly string[];
  readonly produced: readonly string[];
  readonly depth: number;
  readonly peakDepth: number;
}

export interface StackCapacityResult {
  readonly minimumCapacity: number;
  readonly operationCount: number;
  readonly outputOrder: readonly string[];
}

export interface StackCapacityTrace {
  readonly steps: readonly StackCapacityStep[];
  readonly result: StackCapacityResult;
}

const MAX_STACK_ITEMS = 64;
const MAX_STACK_TOKEN_LENGTH = 32;

function assertToken(token: unknown, label: string): asserts token is string {
  if (typeof token !== 'string' || token.length === 0 || token.length > MAX_STACK_TOKEN_LENGTH) {
    throw new RangeError(`${label} must be a non-empty token of at most ${MAX_STACK_TOKEN_LENGTH} characters`);
  }
  const hasControlCharacter = [...token].some((character) => {
    const codePoint = character.codePointAt(0)!;
    return codePoint < 32 || codePoint === 127;
  });
  if (hasControlCharacter || /[\s,]/u.test(token)) {
    throw new RangeError(`${label} must not contain whitespace, commas, or control characters`);
  }
}

function validateConfig(config: StackCapacityConfig): void {
  if (!Array.isArray(config.inputOrder) || !Array.isArray(config.outputOrder)) {
    throw new TypeError('inputOrder and outputOrder must be arrays');
  }
  if (config.inputOrder.length === 0) {
    throw new RangeError('inputOrder must contain at least one element');
  }
  if (config.inputOrder.length > MAX_STACK_ITEMS || config.outputOrder.length > MAX_STACK_ITEMS) {
    throw new RangeError(`stack traces support at most ${MAX_STACK_ITEMS} elements`);
  }
  if (config.inputOrder.length !== config.outputOrder.length) {
    throw new RangeError('inputOrder and outputOrder must have the same length');
  }

  for (let index = 0; index < config.inputOrder.length; index += 1) {
    assertToken(config.inputOrder[index], `inputOrder[${index}]`);
    assertToken(config.outputOrder[index], `outputOrder[${index}]`);
  }
  if (new Set(config.inputOrder).size !== config.inputOrder.length) {
    throw new RangeError('inputOrder must contain distinct elements');
  }
  if (new Set(config.outputOrder).size !== config.outputOrder.length) {
    throw new RangeError('outputOrder must contain distinct elements');
  }
  const inputElements = new Set(config.inputOrder);
  if (config.outputOrder.some((token) => !inputElements.has(token))) {
    throw new RangeError('inputOrder and outputOrder must contain the same elements');
  }
}

function snapshotStep(
  index: number,
  action: StackCapacityAction,
  value: string | null,
  targetOutput: string | null,
  inputIndex: number,
  stack: readonly string[],
  produced: readonly string[],
  peakDepth: number,
): StackCapacityStep {
  return {
    id: `stack-capacity-${index}`,
    action,
    value,
    targetOutput,
    inputIndex,
    stack: [...stack],
    produced: [...produced],
    depth: stack.length,
    peakDepth,
  };
}

export function traceStackCapacity(config: StackCapacityConfig): StackCapacityTrace {
  validateConfig(config);
  const inputOrder = [...config.inputOrder];
  const outputOrder = [...config.outputOrder];
  let inputIndex = 0;
  let stack: string[] = [];
  let produced: string[] = [];
  let peakDepth = 0;
  const steps: StackCapacityStep[] = [snapshotStep(
    0,
    'initial',
    null,
    outputOrder[0]!,
    inputIndex,
    stack,
    produced,
    peakDepth,
  )];

  for (const expected of outputOrder) {
    const existingIndex = stack.lastIndexOf(expected);
    if (existingIndex >= 0 && existingIndex !== stack.length - 1) {
      throw new Error(`cannot produce expected ${expected}: stack top is ${stack.at(-1)}`);
    }

    while (stack.at(-1) !== expected) {
      const nextInput = inputOrder[inputIndex];
      if (nextInput === undefined) {
        throw new Error(`cannot produce expected ${expected}: stack top is ${stack.at(-1) ?? 'empty'}`);
      }
      inputIndex += 1;
      stack = [...stack, nextInput];
      peakDepth = Math.max(peakDepth, stack.length);
      steps.push(snapshotStep(
        steps.length,
        'push',
        nextInput,
        expected,
        inputIndex,
        stack,
        produced,
        peakDepth,
      ));
    }

    stack = stack.slice(0, -1);
    produced = [...produced, expected];
    steps.push(snapshotStep(
      steps.length,
      'pop',
      expected,
      expected,
      inputIndex,
      stack,
      produced,
      peakDepth,
    ));
  }

  return {
    steps,
    result: {
      minimumCapacity: peakDepth,
      operationCount: steps.length - 1,
      outputOrder: [...produced],
    },
  };
}

export const STACK_CAPACITY_Q2_PRESET = {
  sourceQuestionId: 'cn408-2009-q02',
  reviewStatus: 'needs-review',
  config: {
    inputOrder: ['a', 'b', 'c', 'd', 'e', 'f', 'g'],
    outputOrder: ['b', 'd', 'c', 'f', 'e', 'a', 'g'],
  },
} as const satisfies {
  readonly sourceQuestionId: string;
  readonly reviewStatus: 'needs-review';
  readonly config: StackCapacityConfig;
};
