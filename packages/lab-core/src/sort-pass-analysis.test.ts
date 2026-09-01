import { describe, expect, it } from 'vitest';

import {
  SORT_PASS_Q10_PRESET,
  analyzeSecondPassInvariants,
  type SortCandidateId,
} from './sort-pass-analysis';

const q10State = [11, 12, 13, 7, 8, 9, 23, 4, 5] as const;
const candidateOrder: readonly SortCandidateId[] = ['bubble', 'insertion', 'selection', 'merge-2way'];

describe('Q10 second-pass invariant analysis', () => {
  it('keeps the source preset in needs-review and concludes option B among the four listed methods', () => {
    const trace = analyzeSecondPassInvariants(q10State);

    expect(SORT_PASS_Q10_PRESET).toEqual({
      sourceQuestionId: 'cn408-2009-q10',
      reviewStatus: 'needs-review',
      passNumber: 2,
      values: q10State,
      expectedAnswerOptionId: 'B',
    });
    expect(trace.result).toEqual({
      conclusion: 'single-listed-candidate',
      remainingCandidateIds: ['insertion'],
      answerOptionId: 'B',
    });
  });

  it('checks only necessary invariants and rules out bubble, selection, and two-way merge', () => {
    const trace = analyzeSecondPassInvariants(q10State);

    expect(trace.checks.map((check) => [check.candidateId, check.optionId, check.verdict])).toEqual([
      ['bubble', 'A', 'ruled-out'],
      ['insertion', 'B', 'not-ruled-out'],
      ['selection', 'C', 'ruled-out'],
      ['merge-2way', 'D', 'ruled-out'],
    ]);

    expect(trace.checks[0]).toMatchObject({
      invariantId: 'extreme-placement',
      segmentMode: 'any',
      segments: [
        { indices: [0, 1], values: [11, 12], expectedValues: [4, 5], passes: false },
        { indices: [7, 8], values: [4, 5], expectedValues: [13, 23], passes: false },
      ],
    });
    expect(trace.checks[1]).toMatchObject({
      invariantId: 'sorted-prefix',
      segments: [{ indices: [0, 1, 2], values: [11, 12, 13], expectedValues: [11, 12, 13], passes: true }],
    });
    expect(trace.checks[2]).toMatchObject({
      invariantId: 'extreme-placement',
      segmentMode: 'any',
      segments: [
        { indices: [0, 1], values: [11, 12], expectedValues: [4, 5], passes: false },
        { indices: [7, 8], values: [4, 5], expectedValues: [13, 23], passes: false },
      ],
    });
    expect(trace.checks[3]).toMatchObject({
      invariantId: 'ordered-runs-of-four',
      segmentMode: 'all',
      segments: [
        { indices: [0, 1, 2, 3], values: [11, 12, 13, 7], expectedValues: [7, 11, 12, 13], passes: false },
        { indices: [4, 5, 6, 7], values: [8, 9, 23, 4], expectedValues: [4, 8, 9, 23], passes: false },
        { indices: [8], values: [5], expectedValues: [5], passes: true },
      ],
    });
  });

  it('reveals one fixed candidate check per step without fabricating earlier sorting states', () => {
    const trace = analyzeSecondPassInvariants(q10State);

    expect(trace.steps.map((step) => step.kind)).toEqual([
      'initial',
      'check-invariant',
      'check-invariant',
      'check-invariant',
      'check-invariant',
      'complete',
    ]);
    expect(trace.steps.map((step) => step.activeCandidateId)).toEqual([
      null,
      'bubble',
      'insertion',
      'selection',
      'merge-2way',
      null,
    ]);
    expect(trace.steps.map((step) => step.state.checkedCandidateIds)).toEqual([
      [],
      ['bubble'],
      ['bubble', 'insertion'],
      ['bubble', 'insertion', 'selection'],
      candidateOrder,
      candidateOrder,
    ]);
    expect(trace.steps.map((step) => step.state.remainingCandidateIds)).toEqual([
      candidateOrder,
      ['insertion', 'selection', 'merge-2way'],
      ['insertion', 'selection', 'merge-2way'],
      ['insertion', 'merge-2way'],
      ['insertion'],
      ['insertion'],
    ]);
    expect(Object.keys(trace)).toEqual(['passNumber', 'values', 'checks', 'steps', 'result']);
  });

  it('does not promote a necessary condition to proof when several listed methods remain possible', () => {
    const trace = analyzeSecondPassInvariants([1, 2, 3, 4]);

    expect(trace.checks.every((check) => check.verdict === 'not-ruled-out')).toBe(true);
    expect(trace.result).toEqual({
      conclusion: 'multiple-listed-candidates',
      remainingCandidateIds: candidateOrder,
      answerOptionId: null,
    });
  });

  it('handles duplicate and negative safe integers by multiset position rather than uniqueness assumptions', () => {
    const trace = analyzeSecondPassInvariants([-2, -2, 0, 1, 1]);

    expect(trace.checks.find((check) => check.candidateId === 'selection')?.segments[0]).toMatchObject({
      values: [-2, -2],
      expectedValues: [-2, -2],
      passes: true,
    });
    expect(trace.checks.find((check) => check.candidateId === 'bubble')?.segments[1]).toMatchObject({
      values: [1, 1],
      expectedValues: [1, 1],
      passes: true,
    });
  });

  it.each([
    { values: [1, 2, 5, 4, 3] },
    { values: [3, 2, 1, 4, 5] },
  ])('does not rule out bubble or selection solely because of an unstated direction convention: $values', ({ values }) => {
    const trace = analyzeSecondPassInvariants(values);

    expect(trace.checks.find((check) => check.candidateId === 'bubble')?.verdict).toBe('not-ruled-out');
    expect(trace.checks.find((check) => check.candidateId === 'selection')?.verdict).toBe('not-ruled-out');
  });

  it('requires aligned four-item runs after the second bottom-up merge pass', () => {
    const trace = analyzeSecondPassInvariants([2, 3, 0, 1, 4]);
    const merge = trace.checks.find((check) => check.candidateId === 'merge-2way');

    expect(merge).toMatchObject({
      invariantId: 'ordered-runs-of-four',
      verdict: 'ruled-out',
    });
    expect(merge?.segments[0]).toEqual({
      indices: [0, 1, 2, 3],
      values: [2, 3, 0, 1],
      expectedValues: [0, 1, 2, 3],
      passes: false,
    });
    expect(trace.result).not.toEqual(expect.objectContaining({ answerOptionId: 'D' }));
  });

  it('is deterministic, leaves input untouched, and isolates nested snapshots', () => {
    const input = [...q10State];
    const first = analyzeSecondPassInvariants(input);
    const second = analyzeSecondPassInvariants(input);

    expect(second).toEqual(first);
    expect(input).toEqual(q10State);
    expect(first.values).not.toBe(input);
    expect(first.checks[0]?.segments).not.toBe(first.steps[1]?.state.checks[0]?.segments);
    expect(first.steps[4]?.state.checks).not.toBe(first.steps[5]?.state.checks);
    expect(first.steps[5]?.state.remainingCandidateIds).not.toBe(first.result.remainingCandidateIds);
  });
});

describe('second-pass invariant input validation', () => {
  it.each([
    null,
    undefined,
    '11,12,13',
    {},
    [],
    [1],
    [1, 2],
    [1, Number.NaN, 3],
    [1, Number.POSITIVE_INFINITY, 3],
    [1, 2.5, 3],
    [1, Number.MAX_SAFE_INTEGER + 1, 3],
  ])('rejects invalid input %j', (input) => {
    expect(() => analyzeSecondPassInvariants(input as readonly number[])).toThrow(/array|3|64|safe integer/u);
  });

  it('rejects sparse arrays and inputs above the visualization limit', () => {
    const sparse = [1, 2, 3];
    delete sparse[1];

    expect(() => analyzeSecondPassInvariants(sparse)).toThrow(/dense|safe integer/u);
    expect(() => analyzeSecondPassInvariants(Array.from({ length: 65 }, (_, index) => index))).toThrow(/64/u);
  });
});
