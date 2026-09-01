export type SortCandidateId = 'bubble' | 'insertion' | 'selection' | 'merge-2way';
export type SortOptionId = 'A' | 'B' | 'C' | 'D';
export type SortInvariantId = 'extreme-placement' | 'sorted-prefix' | 'ordered-runs-of-four';
export type SortInvariantVerdict = 'ruled-out' | 'not-ruled-out';
export type SortInvariantSegmentMode = 'all' | 'any';

export interface SortInvariantSegment {
  readonly indices: readonly number[];
  readonly values: readonly number[];
  readonly expectedValues: readonly number[];
  readonly passes: boolean;
}

export interface SortInvariantCheck {
  readonly candidateId: SortCandidateId;
  readonly optionId: SortOptionId;
  readonly invariantId: SortInvariantId;
  readonly segmentMode: SortInvariantSegmentMode;
  readonly verdict: SortInvariantVerdict;
  readonly segments: readonly SortInvariantSegment[];
}

export type SortPassStepKind = 'initial' | 'check-invariant' | 'complete';

export interface SortPassStepState {
  readonly checks: readonly SortInvariantCheck[];
  readonly checkedCandidateIds: readonly SortCandidateId[];
  readonly remainingCandidateIds: readonly SortCandidateId[];
}

export interface SortPassStep {
  readonly id: string;
  readonly sequence: number;
  readonly kind: SortPassStepKind;
  readonly activeCandidateId: SortCandidateId | null;
  readonly state: SortPassStepState;
}

export interface SortPassAnalysisResult {
  readonly conclusion: 'single-listed-candidate' | 'multiple-listed-candidates' | 'no-listed-candidate';
  readonly remainingCandidateIds: readonly SortCandidateId[];
  readonly answerOptionId: SortOptionId | null;
}

export interface SortPassAnalysisTrace {
  readonly passNumber: 2;
  readonly values: readonly number[];
  readonly checks: readonly SortInvariantCheck[];
  readonly steps: readonly SortPassStep[];
  readonly result: SortPassAnalysisResult;
}

const CANDIDATES = [
  ['bubble', 'A'],
  ['insertion', 'B'],
  ['selection', 'C'],
  ['merge-2way', 'D'],
] as const satisfies readonly (readonly [SortCandidateId, SortOptionId])[];

const CANDIDATE_IDS = CANDIDATES.map(([candidateId]) => candidateId);
const MAX_VALUES = 64;

function assertValues(input: unknown): asserts input is readonly number[] {
  if (!Array.isArray(input)) throw new TypeError('values must be an array');
  if (input.length < 3 || input.length > MAX_VALUES) {
    throw new RangeError(`values must contain between 3 and ${MAX_VALUES} items`);
  }
  for (let index = 0; index < input.length; index += 1) {
    if (!(index in input) || !Number.isSafeInteger(input[index])) {
      throw new TypeError('values must be a dense array of safe integers');
    }
  }
}

function equalValues(left: readonly number[], right: readonly number[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function segment(
  values: readonly number[],
  indices: readonly number[],
  expectedValues: readonly number[],
): SortInvariantSegment {
  const actualValues = indices.map((index) => values[index]!);
  return {
    indices: [...indices],
    values: actualValues,
    expectedValues: [...expectedValues],
    passes: equalValues(actualValues, expectedValues),
  };
}

function buildCheck(values: readonly number[], candidateId: SortCandidateId, optionId: SortOptionId): SortInvariantCheck {
  const sorted = [...values].sort((left, right) => left - right);
  let invariantId: SortInvariantId;
  let segmentMode: SortInvariantSegmentMode = 'all';
  let segments: SortInvariantSegment[];

  if (candidateId === 'bubble' || candidateId === 'selection') {
    invariantId = 'extreme-placement';
    segmentMode = 'any';
    const prefixIndices = [0, 1];
    const suffixIndices = [values.length - 2, values.length - 1];
    segments = [
      segment(values, prefixIndices, sorted.slice(0, 2)),
      segment(values, suffixIndices, sorted.slice(-2)),
    ];
  } else if (candidateId === 'insertion') {
    invariantId = 'sorted-prefix';
    const indices = [0, 1, 2];
    const prefix = values.slice(0, 3);
    segments = [segment(values, indices, [...prefix].sort((left, right) => left - right))];
  } else {
    invariantId = 'ordered-runs-of-four';
    segments = [];
    for (let start = 0; start < values.length; start += 4) {
      const indices = Array.from(
        { length: Math.min(4, values.length - start) },
        (_, offset) => start + offset,
      );
      const run = indices.map((index) => values[index]!);
      segments.push(segment(values, indices, [...run].sort((left, right) => left - right)));
    }
  }

  const passes = segments.map((entry) => entry.passes);
  return {
    candidateId,
    optionId,
    invariantId,
    segmentMode,
    verdict: (segmentMode === 'all' ? passes.every(Boolean) : passes.some(Boolean))
      ? 'not-ruled-out'
      : 'ruled-out',
    segments,
  };
}

function cloneCheck(check: SortInvariantCheck): SortInvariantCheck {
  return {
    ...check,
    segments: check.segments.map((entry) => ({
      ...entry,
      indices: [...entry.indices],
      values: [...entry.values],
      expectedValues: [...entry.expectedValues],
    })),
  };
}

function snapshotState(checks: readonly SortInvariantCheck[]): SortPassStepState {
  const clonedChecks = checks.map(cloneCheck);
  return {
    checks: clonedChecks,
    checkedCandidateIds: clonedChecks.map((check) => check.candidateId),
    remainingCandidateIds: CANDIDATE_IDS.filter((candidateId) => {
      const check = clonedChecks.find((entry) => entry.candidateId === candidateId);
      return check?.verdict !== 'ruled-out';
    }),
  };
}

export function analyzeSecondPassInvariants(input: readonly number[]): SortPassAnalysisTrace {
  assertValues(input);
  const values = [...input];
  const checks = CANDIDATES.map(([candidateId, optionId]) => buildCheck(values, candidateId, optionId));
  const steps: SortPassStep[] = [{
    id: 'sort-pass-0-initial',
    sequence: 0,
    kind: 'initial',
    activeCandidateId: null,
    state: snapshotState([]),
  }];

  checks.forEach((check, index) => {
    steps.push({
      id: `sort-pass-${index + 1}-${check.candidateId}`,
      sequence: index + 1,
      kind: 'check-invariant',
      activeCandidateId: check.candidateId,
      state: snapshotState(checks.slice(0, index + 1)),
    });
  });

  const remainingCandidateIds = checks
    .filter((check) => check.verdict === 'not-ruled-out')
    .map((check) => check.candidateId);
  const answerOptionId = remainingCandidateIds.length === 1
    ? checks.find((check) => check.candidateId === remainingCandidateIds[0])!.optionId
    : null;
  const result: SortPassAnalysisResult = {
    conclusion: remainingCandidateIds.length === 1
      ? 'single-listed-candidate'
      : remainingCandidateIds.length === 0
        ? 'no-listed-candidate'
        : 'multiple-listed-candidates',
    remainingCandidateIds: [...remainingCandidateIds],
    answerOptionId,
  };

  steps.push({
    id: 'sort-pass-5-complete',
    sequence: 5,
    kind: 'complete',
    activeCandidateId: null,
    state: snapshotState(checks),
  });

  return {
    passNumber: 2,
    values: [...values],
    checks: checks.map(cloneCheck),
    steps,
    result: {
      conclusion: result.conclusion,
      remainingCandidateIds: [...result.remainingCandidateIds],
      answerOptionId: result.answerOptionId,
    },
  };
}

export const SORT_PASS_Q10_PRESET = {
  sourceQuestionId: 'cn408-2009-q10',
  reviewStatus: 'needs-review',
  passNumber: 2,
  values: [11, 12, 13, 7, 8, 9, 23, 4, 5],
  expectedAnswerOptionId: 'B',
} as const;
