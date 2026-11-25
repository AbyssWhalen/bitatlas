import { cleanup, renderHook } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import type { Attempt, DailyPlan } from '@408os/domain';
import { DEFAULT_REVIEW_LIMITS, REVIEW_ALGORITHM_VERSION, REVIEW_TIME_ZONE } from '@408os/domain';
import { useConceptRegister } from './useConceptRegister';

const data = vi.hoisted(() => ({
  study: { questions: [], attempts: [] as Attempt[], error: null as string | null },
  learning: { pack: null, personal: [], events: [], evidence: [], plan: null as DailyPlan | null, loading: false, error: '' },
  today: '2026-11-24',
}));
vi.mock('./StudyContext', () => ({ useStudy: () => data.study }));
vi.mock('./LearningContext', () => ({ useLearning: () => data.learning }));
vi.mock('./useBeijingDate', () => ({ useBeijingDate: () => data.today }));
afterEach(cleanup);

it('reuses the register on unrelated renders or plan changes; a new Beijing date invalidates due status', () => {
  const { result, rerender } = renderHook(useConceptRegister);
  const first = result.current;
  data.study.error = 'content read failed';
  rerender();
  expect(result.current.error).toBe('content read failed');
  expect(result.current.concepts).toBe(first.concepts);
  expect(result.current.subjects).toBe(first.subjects);
  expect(result.current.objectiveByConcept).toBe(first.objectiveByConcept);
  data.learning.plan = { id: 'fixed', date: data.today, timeZone: REVIEW_TIME_ZONE, createdAt: '', limits: DEFAULT_REVIEW_LIMITS,
    algorithmVersion: REVIEW_ALGORITHM_VERSION, items: [{ kind: 'card', targetId: 'missing', contentVersion: '1', reason: 'unseen' }] };
  rerender();
  expect(result.current.todayPlan.items).toHaveLength(1);
  expect(result.current.concepts).toBe(first.concepts);
  data.today = '2026-11-25';
  rerender();
  expect(result.current.concepts).not.toBe(first.concepts);
  expect(result.current.todayPlan.items).toEqual([]);
});
