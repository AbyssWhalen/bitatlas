import { describe, expect, it } from 'vitest';
import {
  aggregateStats,
  applyAttemptToProgress,
  createStudySession,
  evaluateResponse,
  filterQuestions,
  projectCurrentQuestionProgress,
  seededShuffle,
} from './study';
import type { Attempt, Question } from './types';

const question: Question = {
  id: 'cn408-2009-q01',
  year: 2009,
  number: 1,
  subject: 'data-structures',
  kind: 'single-choice',
  stem: [{ type: 'text', text: '线性表测试题' }],
  options: ['A', 'B', 'C', 'D'].map((id) => ({
    id: id as 'A' | 'B' | 'C' | 'D',
    content: [{ type: 'text' as const, text: id }],
  })),
  answer: { type: 'choice', optionId: 'B' },
  explanation: [],
  hints: [],
  knowledgePointIds: [],
  assetIds: [],
  source: {
    question: {
      publisher: 'source',
      title: '2009 questions',
      url: 'https://example.com/2009.pdf',
      fileName: '2009.pdf',
      sha256: 'a'.repeat(64),
      pages: [1],
      locator: 'PDF page 1',
    },
    answer: {
      publisher: 'source',
      title: '2009 answers',
      url: 'https://example.com/2009-answers.pdf',
      fileName: '2009-answers.pdf',
      sha256: 'b'.repeat(64),
      pages: [1],
      locator: 'PDF page 1',
    },
    crosschecks: [],
    redistribution: 'unknown',
  },
  contentVersion: '2009.1',
  reviewStatus: 'verified',
};

function attempt(correct: boolean): Attempt {
  return {
    id: crypto.randomUUID(),
    questionId: question.id,
    questionContentVersion: question.contentVersion,
    sessionId: 'session-1',
    mode: 'practice',
    response: { type: 'choice', optionId: correct ? 'B' : 'A' },
    correct,
    score: correct ? 1 : 0,
    startedAt: '2026-08-05T00:00:00.000Z',
    submittedAt: '2026-08-05T00:00:10.000Z',
    durationMs: 10_000,
  };
}

describe('study domain', () => {
  it('evaluates objective answers', () => {
    expect(evaluateResponse(question, { type: 'choice', optionId: 'B' })).toEqual({ correct: true, score: 1 });
    expect(evaluateResponse(question, { type: 'choice', optionId: 'A' })).toEqual({ correct: false, score: 0 });
  });

  it('rejects non-finite comprehensive self scores', () => {
    const comprehensive: Question = { ...question, kind: 'comprehensive', answer: { type: 'comprehensive', maxScore: 10, rubric: [], reference: [] } };
    expect(() => evaluateResponse(comprehensive, {
      type: 'comprehensive',
      text: 'answer',
      selfScore: Number.NaN,
      checkedRubricIds: [],
    })).toThrow(/finite/iu);
    expect(() => evaluateResponse(comprehensive, {
      type: 'comprehensive',
      text: 'answer',
      selfScore: Number.POSITIVE_INFINITY,
      checkedRubricIds: [],
    })).toThrow(/finite/iu);
  });

  it.each([-1, 10.01])('rejects comprehensive self score %s outside the allowed range', (selfScore) => {
    const comprehensive: Question = { ...question, kind: 'comprehensive', answer: { type: 'comprehensive', maxScore: 10, rubric: [], reference: [] } };
    expect(() => evaluateResponse(comprehensive, {
      type: 'comprehensive',
      text: 'answer',
      selfScore,
      checkedRubricIds: [],
    })).toThrow(/between 0 and 10/iu);
  });

  it.each([0, 10])('preserves comprehensive self score boundary %s', (selfScore) => {
    const comprehensive: Question = { ...question, kind: 'comprehensive', answer: { type: 'comprehensive', maxScore: 10, rubric: [], reference: [] } };
    expect(evaluateResponse(comprehensive, {
      type: 'comprehensive',
      text: 'answer',
      selfScore,
      checkedRubricIds: [],
    })).toEqual({ correct: null, score: selfScore });
  });

  it('promotes and resets mastery deterministically', () => {
    const first = applyAttemptToProgress(undefined, attempt(true));
    const second = applyAttemptToProgress(first, attempt(true));
    const reset = applyAttemptToProgress(second, attempt(false));
    expect(first.mastery).toBe('learning');
    expect(second.mastery).toBe('familiar');
    expect(reset).toMatchObject({ mastery: 'learning', consecutiveCorrect: 0, wrongCount: 1 });
  });

  it('filters by text and wrong state', () => {
    const progress = new Map([[question.id, applyAttemptToProgress(undefined, attempt(false))]]);
    expect(filterQuestions([question], { search: '线性表', onlyWrong: true }, progress)).toEqual([question]);
    expect(filterQuestions([question], { search: '网络' }, progress)).toEqual([]);
  });

  it('creates deterministic shuffles and rejects empty sessions', () => {
    expect(seededShuffle([1, 2, 3, 4], 408)).toEqual(seededShuffle([1, 2, 3, 4], 408));
    expect(() => createStudySession('id', [], 'practice', new Date().toISOString())).toThrow();
  });

  it('aggregates objective statistics', () => {
    const stats = aggregateStats([attempt(true), attempt(false)], new Map([[question.id, question]]));
    expect(stats).toMatchObject({ attempted: 2, correct: 1, wrong: 1, accuracy: 0.5, durationMs: 20_000 });
    expect(stats.bySubject['data-structures'].accuracy).toBe(0.5);
  });

  it('does not count comprehensive attempts as objective statistics', () => {
    const comprehensive: Question = { ...question, kind: 'comprehensive', answer: { type: 'comprehensive', maxScore: 10, rubric: [], reference: [] } };
    const malformed = {
      ...attempt(true),
      questionId: comprehensive.id,
      questionContentVersion: comprehensive.contentVersion,
      correct: true,
      score: 10,
      response: { type: 'comprehensive' as const, text: 'answer', checkedRubricIds: [] },
    };
    const stats = aggregateStats([malformed], new Map([[comprehensive.id, comprehensive]]));
    expect(stats).toMatchObject({ attempted: 0, correct: 0, wrong: 0, accuracy: null, durationMs: 10_000 });
    expect(stats.bySubject['data-structures']).toMatchObject({ attempted: 0, correct: 0, accuracy: null });
  });

  it('excludes attempts from stale question content versions', () => {
    const current = attempt(true);
    const stale = { ...attempt(false), questionContentVersion: '2009.0-draft.0', durationMs: 99_000 };
    const stats = aggregateStats([current, stale], new Map([[question.id, question]]));

    expect(stats).toMatchObject({ attempted: 1, correct: 1, wrong: 0, accuracy: 1, durationMs: 10_000 });
    expect(stats.bySubject['data-structures']).toMatchObject({ attempted: 1, correct: 1, accuracy: 1 });
  });

  it('projects current question state from versioned attempts with deterministic ties', () => {
    const stale = { ...attempt(false), id: 'stale', questionContentVersion: '2009.0' };
    const laterId = { ...attempt(false), id: 'z-last' };
    const earlierId = { ...attempt(true), id: 'a-first' };
    const result = projectCurrentQuestionProgress([laterId, stale, earlierId], [question]);

    expect(result.get(question.id)).toMatchObject({
      attemptCount: 2,
      correctCount: 1,
      wrongCount: 1,
      lastCorrect: false,
      mastery: 'learning',
      evidenceAttemptIds: ['a-first', 'z-last'],
    });
  });
});
