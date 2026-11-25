import { describe, expect, it } from 'vitest';
import { advanceReviewSession, beijingDate, replayCardSchedule, summarizePracticeEvidence } from './learning';
import type { CardRating, CardReviewEvent, PracticeEvidence, ReviewSession } from './learning';
import type { Attempt } from './types';

function event(id: string, rating: CardRating, reviewedAt = '2026-11-20T02:00:00Z'): CardReviewEvent {
  return { id, rating, reviewedAt, sessionId: 'round', cardId: 'card', cardVersion: '1', ordinal: 1, queueIndex: 0, activeDurationMs: 1000 };
}
describe('daily minimum review rules', () => {
  it('separates unassisted first answers, hinted answers, subjective ratings and unknown legacy evidence', () => {
    const now = '2026-11-20T02:00:00Z';
    const attempt = (id: string, correct = true): Attempt => ({
      id, sessionId: id, questionId: id, questionContentVersion: '1', mode: 'practice',
      response: { type: 'choice', optionId: 'A' }, correct, score: correct ? 1 : 0,
      startedAt: now, submittedAt: now, durationMs: 9_999_999,
    });
    const attempts = [attempt('right'), attempt('wrong', false), attempt('hinted'), attempt('revealed'), attempt('legacy'), {
      ...attempt('self-rated'), correct: null, score: 8,
      response: { type: 'comprehensive' as const, text: '思路', selfScore: 8, checkedRubricIds: [] },
    }];
    const evidence: PracticeEvidence[] = attempts.filter((value) => value.id !== 'legacy').map((value) => ({
      id: value.id, sessionId: value.sessionId, questionId: value.questionId, questionContentVersion: '1',
      hintsUsed: value.id === 'hinted' ? 1 : 0, evidenceFromStart: true,
      firstResponse: value.response, ...(value.id === 'revealed' ? { answerRevealedAt: now } : {}),
      attemptId: value.id, activeDurationMs: 100, mistakeNote: '', revision: 1, updatedAt: now,
    }));
    expect(summarizePracticeEvidence(attempts, evidence)).toEqual({
      eligible: 2, correct: 1, hinted: 1, hintedCorrect: 1, subjective: 1, unknown: 1, activeDurationMs: 500,
    });
    expect(summarizePracticeEvidence(attempts, [])).toMatchObject({ eligible: 0, correct: 0, unknown: 6, activeDurationMs: 0 });
  });

  it('uses Beijing midnight', () => {
    expect(beijingDate('2026-11-19T15:59:59Z')).toBe('2026-11-19');
    expect(beijingDate('2026-11-19T16:00:00Z')).toBe('2026-11-20');
  });
  it('is order independent and success repetition cannot erase a failure or multiply spacing', () => {
    for (let size = 1; size <= 120; size++) {
      const events = Array.from({ length: size }, (_, i) => event(`e${i}`, 1));
      const once = replayCardSchedule([events[0]!]);
      expect(replayCardSchedule(events)).toEqual(once);
      const failed = [...events, event('fail', 0)];
      expect(replayCardSchedule(failed.reverse())).toEqual(replayCardSchedule(failed));
      expect(replayCardSchedule(failed)[0]).toMatchObject({ repetitions: 0, intervalDays: 1, dueOn: '2026-11-21' });
    }
  });
  it('separates content versions and advances on distinct days', () => {
    expect(replayCardSchedule([
      event('a', 1, '2026-11-18T02:00:00Z'),
      event('b', 1, '2026-11-19T02:00:00Z'),
      { ...event('c', 0), cardVersion: '2' },
    ])).toMatchObject([
      { cardVersion: '1', intervalDays: 3, repetitions: 2, dueOn: '2026-11-22' },
      { cardVersion: '2', intervalDays: 1, repetitions: 0 },
    ]);
  });
  it('bounds every possible three-rating sequence to at most three appearances', () => {
    const now = '2026-11-20T02:00:00Z';
    for (let seed = 0; seed < 81; seed++) {
      let session: ReviewSession = {
        id: 'round', cards: [], queue: ['a', 'b'], cursor: 0, completedCardIds: [], revision: 0, startedAt: now, updatedAt: now,
      };
      let step = 0;
      while (!session.completedAt) {
        const rating = ([0, 0.5, 1] as const)[(seed + step * 7) % 3]!;
        session = advanceReviewSession(session, rating, now).session;
        step++;
        expect(step).toBeLessThanOrEqual(6);
      }
      expect(new Set(session.completedCardIds)).toEqual(new Set(['a', 'b']));
      expect(session.queue.filter((id) => id === 'a').length).toBeLessThanOrEqual(3);
    }
  });
});
