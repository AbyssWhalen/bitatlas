import { describe, expect, it } from 'vitest';
import { buildDailyReviewPlan, replayReviewSchedule } from './review-plan';
import type { Attempt, Question } from './types';

const source = {
  publisher: 'source',
  title: 'source',
  url: 'https://example.com/source.pdf',
  fileName: 'source.pdf',
  sha256: 'a'.repeat(64),
  pages: [1],
  locator: 'page 1',
};

function question(id: string, number: number, kind: Question['kind'] = 'single-choice'): Question {
  return {
    id,
    year: 2009,
    number,
    subject: number % 2 ? 'data-structures' : 'computer-organization',
    kind,
    stem: [{ type: 'text', text: id }],
    ...(kind === 'single-choice' ? {
      options: ['A', 'B', 'C', 'D'].map((optionId) => ({
        id: optionId as 'A' | 'B' | 'C' | 'D',
        content: [{ type: 'text' as const, text: optionId }],
      })),
      answer: { type: 'choice' as const, optionId: 'A' as const },
    } : {
      answer: { type: 'comprehensive' as const, maxScore: 10, rubric: [], reference: [] },
    }),
    explanation: [],
    hints: [],
    knowledgePointIds: [],
    assetIds: [],
    source: { question: source, answer: source, crosschecks: [], redistribution: 'unknown' },
    contentVersion: '2009.1',
    reviewStatus: 'verified',
  };
}

function attempt(
  id: string,
  target: Question,
  submittedAt: string,
  result: boolean | number | null,
  version = target.contentVersion,
): Attempt {
  const comprehensive = target.kind === 'comprehensive';
  return {
    id,
    questionId: target.id,
    questionContentVersion: version,
    sessionId: `session-${id}`,
    mode: 'review',
    response: comprehensive
      ? { type: 'comprehensive', text: '', ...(result === null ? {} : { selfScore: Number(result) }), checkedRubricIds: [] }
      : { type: 'choice', optionId: result ? 'A' : 'B' },
    correct: comprehensive ? null : Boolean(result),
    score: result === null ? null : comprehensive ? Number(result) : result ? 1 : 0,
    startedAt: submittedAt,
    submittedAt,
    durationMs: 1_000,
  };
}

describe('review plan', () => {
  it('replays current-version evidence and resets a failed card to one day', () => {
    const q1 = question('q1', 1);
    const schedules = replayReviewSchedule([
      attempt('old-version', q1, '2026-08-01T01:00:00.000Z', false, '2009.0'),
      attempt('success-1', q1, '2026-08-01T02:00:00.000Z', true),
      attempt('success-2', q1, '2026-08-02T02:00:00.000Z', true),
      attempt('failure', q1, '2026-08-05T02:00:00.000Z', false),
    ], [q1], { timeZone: 'Asia/Shanghai', beforeDate: '2026-08-07' });

    expect(schedules).toHaveLength(1);
    expect(schedules[0]).toMatchObject({
      questionId: 'q1',
      repetitions: 0,
      intervalDays: 1,
      dueOn: '2026-08-06',
      lastQuality: 0,
      evidenceAttemptIds: ['success-1', 'success-2', 'failure'],
    });
  });

  it('uses normalized comprehensive self scores and ignores unscored responses', () => {
    const q = question('q-comprehensive', 42, 'comprehensive');
    const schedules = replayReviewSchedule([
      attempt('unscored', q, '2026-08-01T01:00:00.000Z', null),
      attempt('partial', q, '2026-08-02T01:00:00.000Z', 8),
    ], [q], { timeZone: 'Asia/Shanghai', beforeDate: '2026-08-07' });

    expect(schedules[0]).toMatchObject({
      repetitions: 1,
      intervalDays: 1,
      lastQuality: 0.8,
      evidenceAttemptIds: ['partial'],
    });
  });

  it('ignores non-finite comprehensive scores instead of corrupting the schedule', () => {
    const q = question('q-comprehensive-invalid', 42, 'comprehensive');
    const schedules = replayReviewSchedule([
      attempt('nan', q, '2026-08-01T01:00:00.000Z', Number.NaN),
      attempt('negative', q, '2026-08-02T01:00:00.000Z', -1),
    ], [q], { timeZone: 'Asia/Shanghai', beforeDate: '2026-08-07' });

    expect(schedules).toEqual([]);
    const plan = buildDailyReviewPlan([
      attempt('nan-plan', q, '2026-08-01T01:00:00.000Z', Number.NaN),
    ], [q], {
      today: new Date('2026-08-07T04:00:00.000Z'),
      timeZone: 'Asia/Shanghai',
      dailyLimit: 1,
    });
    expect(plan.items).toEqual([{ questionId: q.id, reason: 'unseen', evidenceAttemptIds: [], completedToday: false }]);
  });

  it('keeps the selected queue stable during the day and only changes completion', () => {
    const questions = [question('q1', 1), question('q2', 2), question('q3', 3), question('q4', 4)];
    const history = [attempt('q1-wrong', questions[0]!, '2026-08-05T02:00:00.000Z', false)];
    const options = { today: new Date('2026-08-07T04:00:00.000Z'), timeZone: 'Asia/Shanghai', dailyLimit: 3 };
    const before = buildDailyReviewPlan(history, questions, options);
    const after = buildDailyReviewPlan([
      ...history,
      attempt('q1-today', questions[0]!, '2026-08-07T05:00:00.000Z', true),
    ], questions, options);

    expect(before.items.map((item) => item.questionId)).toEqual(['q1', 'q2', 'q3']);
    expect(after.items.map((item) => item.questionId)).toEqual(['q1', 'q2', 'q3']);
    expect(before.completedCount).toBe(0);
    expect(after.completedCount).toBe(1);
    expect(after.items[0]).toMatchObject({ reason: 'overdue', completedToday: true });
  });

  it('uses the explicit time zone boundary and deterministic question ordering', () => {
    const questions = [question('q-b', 2), question('q-a', 1)];
    const plan = buildDailyReviewPlan([
      attempt('local-yesterday', questions[1]!, '2026-08-06T15:59:59.000Z', false),
      attempt('local-today', questions[0]!, '2026-08-06T16:00:00.000Z', false),
    ], questions, {
      today: new Date('2026-08-07T04:00:00.000Z'),
      timeZone: 'Asia/Shanghai',
      dailyLimit: 2,
    });

    expect(plan.date).toBe('2026-08-07');
    expect(plan.items.map((item) => item.questionId)).toEqual(['q-a', 'q-b']);
    expect(plan.items[0]).toMatchObject({ reason: 'due', completedToday: false });
    expect(plan.items[1]).toMatchObject({ reason: 'unseen', completedToday: true });
  });

  it('rejects invalid limits and duplicate question ids', () => {
    const q = question('q1', 1);
    expect(() => buildDailyReviewPlan([], [q], {
      today: new Date(), timeZone: 'Asia/Shanghai', dailyLimit: 0,
    })).toThrow(/dailyLimit/u);
    expect(() => buildDailyReviewPlan([], [q, q], {
      today: new Date(), timeZone: 'Asia/Shanghai', dailyLimit: 1,
    })).toThrow(/Duplicate question id/u);
  });
});
