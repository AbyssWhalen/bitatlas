import { describe, expect, it } from 'vitest';
import {
  aggregateKnowledgePerformance,
  buildActivityCalendar,
  buildKnowledgeForest,
  filterCurrentAttempts,
} from './analytics';
import type { Attempt, KnowledgePoint, Question } from './types';

const source = {
  publisher: 'source',
  title: 'source',
  url: 'https://example.com/source.pdf',
  fileName: 'source.pdf',
  sha256: 'a'.repeat(64),
  pages: [1],
  locator: 'page 1',
};

function question(
  id: string,
  subject: Question['subject'],
  knowledgePointIds: string[],
  kind: Question['kind'] = 'single-choice',
): Question {
  return {
    id,
    year: 2009,
    number: Number(id.match(/\d+$/)?.[0] ?? 1),
    subject,
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
    knowledgePointIds,
    assetIds: [],
    source: { question: source, answer: source, crosschecks: [], redistribution: 'unknown' },
    contentVersion: '2009.1',
    reviewStatus: 'verified',
  };
}

function attempt(
  id: string,
  questionId: string,
  submittedAt: string,
  result: boolean | number | null,
  contentVersion = '2009.1',
): Attempt {
  const comprehensive = typeof result === 'number' || result === null;
  return {
    id,
    questionId,
    questionContentVersion: contentVersion,
    sessionId: `session-${id}`,
    mode: 'practice',
    response: comprehensive
      ? { type: 'comprehensive', text: '', ...(result === null ? {} : { selfScore: result }), checkedRubricIds: [] }
      : { type: 'choice', optionId: result ? 'A' : 'B' },
    correct: comprehensive ? null : result,
    score: comprehensive ? result : result ? 1 : 0,
    startedAt: submittedAt,
    submittedAt,
    durationMs: 1_000,
  };
}

const points: KnowledgePoint[] = [
  { id: 'ds-root', subject: 'data-structures', name: '数据结构' },
  { id: 'ds-a', subject: 'data-structures', name: 'A', parentId: 'ds-root' },
  { id: 'ds-b', subject: 'data-structures', name: 'B', parentId: 'ds-root' },
];

describe('analytics', () => {
  it('strictly keeps current-version attempts and ignores unknown questions', () => {
    const questions = [question('q1', 'data-structures', ['ds-a'])];
    const current = attempt('current', 'q1', '2026-08-05T00:00:00.000Z', true);
    const stale = attempt('stale', 'q1', '2026-08-05T00:00:00.000Z', false, '2009.0');
    const unknown = attempt('unknown', 'missing', '2026-08-05T00:00:00.000Z', false);
    expect(filterCurrentAttempts([current, stale, unknown], questions)).toEqual([current]);
  });

  it('groups activity in the explicit time zone and builds aligned complete weeks', () => {
    const calendar = buildActivityCalendar([
      attempt('monday', 'q1', '2026-08-02T16:30:00.000Z', true),
      attempt('future', 'q1', '2026-08-08T00:00:00.000Z', true),
      attempt('invalid', 'q1', 'not-a-date', true),
    ], {
      today: new Date('2026-08-05T04:00:00.000Z'),
      timeZone: 'Asia/Shanghai',
      weeks: 2,
    });

    expect(calendar).toMatchObject({
      today: '2026-08-05',
      startDate: '2026-07-27',
      endDate: '2026-08-09',
    });
    expect(calendar.weeks).toHaveLength(2);
    expect(calendar.weeks.every((week) => week.days.length === 7)).toBe(true);
    expect(calendar.weeks[1]!.days.map((day) => day.weekday)).toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect(calendar.weeks[1]!.days[0]).toMatchObject({ date: '2026-08-03', count: 1, future: false });
    expect(calendar.weeks[1]!.days.slice(3).every((day) => day.future && day.count === 0)).toBe(true);
    expect(calendar.diagnostics).toEqual([
      { attemptId: 'invalid', submittedAt: 'not-a-date', reason: 'invalid-submitted-at' },
    ]);
  });

  it('returns an empty but complete calendar matrix', () => {
    const calendar = buildActivityCalendar([], {
      today: new Date('2024-03-01T00:00:00.000Z'),
      timeZone: 'Asia/Shanghai',
      weeks: 1,
    });
    expect(calendar.startDate).toBe('2024-02-26');
    expect(calendar.endDate).toBe('2024-03-03');
    expect(calendar.weeks[0]!.days.every((day) => day.count === 0)).toBe(true);
  });

  it('aggregates direct and descendant questions without double counting', () => {
    const questions = [
      question('q1', 'data-structures', ['ds-root', 'ds-a']),
      question('q2', 'data-structures', ['ds-b']),
    ];
    const forest = buildKnowledgeForest(points, questions);
    const root = forest.nodes.find((node) => node.point.id === 'ds-root');
    expect(forest.rootIds).toEqual(['ds-root']);
    expect(root).toMatchObject({
      childIds: ['ds-a', 'ds-b'],
      directQuestionIds: ['q1'],
      questionIds: ['q1', 'q2'],
    });
  });

  it.each([
    {
      name: 'missing parents',
      invalidPoints: [{ id: 'child', subject: 'data-structures' as const, name: 'child', parentId: 'missing' }],
      questions: [],
      message: /missing parent/,
    },
    {
      name: 'cycles',
      invalidPoints: [
        { id: 'a', subject: 'data-structures' as const, name: 'a', parentId: 'b' },
        { id: 'b', subject: 'data-structures' as const, name: 'b', parentId: 'a' },
      ],
      questions: [],
      message: /cycle/,
    },
    {
      name: 'cross-subject parents',
      invalidPoints: [
        { id: 'ds', subject: 'data-structures' as const, name: 'ds' },
        { id: 'os', subject: 'operating-systems' as const, name: 'os', parentId: 'ds' },
      ],
      questions: [],
      message: /different subjects/,
    },
    {
      name: 'question and point subject mismatches',
      invalidPoints: [{ id: 'ds', subject: 'data-structures' as const, name: 'ds' }],
      questions: [question('q1', 'operating-systems', ['ds'])],
      message: /different subjects/,
    },
  ])('rejects $name', ({ invalidPoints, questions, message }) => {
    expect(() => buildKnowledgeForest(invalidPoints, questions)).toThrow(message);
  });

  it('uses current attempts, normalized comprehensive scores, and latest-three weights', () => {
    const questions = [
      question('q1', 'data-structures', ['ds-root', 'ds-a']),
      question('q2', 'data-structures', ['ds-root', 'ds-b'], 'comprehensive'),
    ];
    const attempts = [
      attempt('q1-oldest', 'q1', '2026-08-01T00:00:00.000Z', false),
      attempt('q1-a', 'q1', '2026-08-02T00:00:00.000Z', false),
      attempt('q1-b', 'q1', '2026-08-03T00:00:00.000Z', true),
      attempt('q1-c', 'q1', '2026-08-04T00:00:00.000Z', true),
      attempt('q1-stale', 'q1', '2026-08-05T00:00:00.000Z', false, 'old'),
      attempt('q2-a', 'q2', '2026-08-02T12:00:00.000Z', 5),
      attempt('q2-b', 'q2', '2026-08-03T12:00:00.000Z', 8),
      attempt('q2-unscored', 'q2', '2026-08-04T12:00:00.000Z', null),
    ];
    const result = aggregateKnowledgePerformance(attempts, questions, buildKnowledgeForest(points, questions));
    const root = result.points.find((point) => point.knowledgePointId === 'ds-root')!;
    const objective = result.points.find((point) => point.knowledgePointId === 'ds-a')!;
    const comprehensive = result.points.find((point) => point.knowledgePointId === 'ds-b')!;

    expect(objective.performance).toBeCloseTo(5 / 6);
    expect(objective.evidenceAttemptIds).toEqual(['q1-a', 'q1-b', 'q1-c']);
    expect(comprehensive.performance).toBeCloseTo(7 / 10);
    expect(comprehensive.evidenceAttemptIds).toEqual(['q2-a', 'q2-b']);
    expect(root.coverage).toBe(1);
    expect(root.performance).toBeCloseTo(((5 / 6) + (7 / 10)) / 2);
    expect(root.evidenceAttemptIds).not.toContain('q1-stale');
    expect(root.lastAttemptAt).toBe('2026-08-04T00:00:00.000Z');
  });

  it('keeps unassessed points out of weak ranking and uses stable tie breaks', () => {
    const questions = [
      question('q1', 'data-structures', ['ds-a']),
      question('q2', 'data-structures', ['ds-b']),
    ];
    const empty = aggregateKnowledgePerformance([], questions, buildKnowledgeForest(points, questions));
    expect(empty.weakPoints).toEqual([]);
    expect(empty.unassessedPoints.map((point) => point.knowledgePointId)).toEqual(['ds-a', 'ds-b', 'ds-root']);

    const tied = aggregateKnowledgePerformance([
      attempt('a', 'q1', '2026-08-01T00:00:00.000Z', false),
      attempt('b', 'q2', '2026-08-01T00:00:00.000Z', false),
    ], questions, buildKnowledgeForest(points, questions));
    expect(tied.weakPoints.map((point) => point.knowledgePointId)).toEqual(['ds-root', 'ds-a', 'ds-b']);
  });

  it('rejects non-finite comprehensive scores before they reach knowledge performance', () => {
    const questions = [question('q1', 'data-structures', ['ds-a'], 'comprehensive')];
    const malformed = attempt('nan', 'q1', '2026-08-01T00:00:00.000Z', Number.NaN);
    expect(() => aggregateKnowledgePerformance(
      [malformed],
      questions,
      buildKnowledgeForest(points, questions),
    )).toThrow(/finite/iu);
  });
});
