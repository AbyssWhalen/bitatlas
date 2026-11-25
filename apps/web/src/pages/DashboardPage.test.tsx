import { readFileSync } from 'node:fs';
import path from 'node:path';
import { act, cleanup, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { aggregateStats, buildPersistentDailyPlan, overlayManualMastery, projectCurrentQuestionProgress, type Attempt, type ContentPack, type LearningPack, type ReviewSession, type StudySession } from '@408os/domain';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useStudy } from '../app/StudyContext';
import { DashboardPage } from './DashboardPage';

vi.mock('../app/StudyContext', () => ({ useStudy: vi.fn() }));
vi.mock('../app/useConceptRegister', () => ({
  useConceptRegister: () => ({ concepts: [], subjects: [], todayPlan: { items: [], conceptIds: [] }, objectiveByConcept: new Map(), weeklyStudyDays: 0, loading: false, error: '' }),
}));
const assigned = new Map<string, ReturnType<typeof buildPersistentDailyPlan>>();
let reviewRounds: ReviewSession[] = [];
let studyPractices: StudySession[] = [];
let sessionContexts: Array<{ sessionId: string; dailyPlanId?: string }> = [];
vi.mock('../app/LearningContext', async () => {
  const { useBeijingDate } = await import('../app/useBeijingDate');
  return {
    useLearningCards: () => [],
    useLearning: () => {
      const date = useBeijingDate();
      const current = useStudy();
      if (!assigned.has(date) && current.questions.length) assigned.set(date, buildPersistentDailyPlan(current.questions, current.attempts, [], [], new Date().toISOString()));
      return { plan: assigned.get(date) ?? null, loading: false, error: '', contexts: sessionContexts, practices: studyPractices, rounds: reviewRounds, conflicts: [] };
    },
  };
});

const pack = (year: number) => JSON.parse(readFileSync(path.resolve('apps', 'web', 'public', 'content', `${year}.json`), 'utf8')) as ContentPack;
const question2009 = pack(2009).questions[0]!;
const question2025 = pack(2025).questions[0]!;
const questions = [question2009, question2025];

function study(overrides: Partial<ReturnType<typeof useStudy>> = {}) {
  vi.mocked(useStudy).mockReturnValue({
    attempts: [], packs: [], questions,
    stats: aggregateStats([], new Map()),
    currentProgress: new Map(),
    reviewSummary: { approved: 0, total: 47, rejected: 0, pending: 47, stale: 0 },
    createSession: vi.fn(), getLatestSession: vi.fn(),
    ...overrides,
  } as unknown as ReturnType<typeof useStudy>);
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-10-04T23:59:40+08:00'));
  assigned.clear();
  reviewRounds = [];
  studyPractices = [];
  sessionContexts = [];
  study();
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

function renderDashboard() {
  return render(<MemoryRouter><DashboardPage /></MemoryRouter>);
}

describe('dashboard content availability', () => {
  it.each(['needs-review', 'verified'] as const)('keeps review status out of the dashboard for an installed %s pack', (reviewStatus) => {
    study({ packs: [{ ...pack(2009).manifest, reviewStatus }] });
    renderDashboard();

    expect(screen.queryByText(/AI.*核对|人工复核|正式模考|Verified 题包/)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '查看详情' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /继续学习|继续上次未完练习/ })).not.toBeInTheDocument();
    expect(screen.getByText(/首次学习可先从下方今日任务起步/)).toBeVisible();
    expect(screen.getByRole('button', { name: '开始剩余 2 题' })).toBeEnabled();
  });

  it('shows 继续上次未完练习 only when an unfinished non-daily-plan session exists', () => {
    studyPractices = [{
      id: 'standalone-open',
      mode: 'practice',
      questionIds: [question2009.id],
      questionContentVersions: { [question2009.id]: question2009.contentVersion },
      currentIndex: 0,
      responses: {},
      submittedQuestionIds: [],
      startedAt: '2026-10-04T10:00:00+08:00',
      updatedAt: '2026-10-04T10:05:00+08:00',
    }];
    renderDashboard();
    expect(screen.getByRole('button', { name: '继续上次未完练习' })).toBeEnabled();
  });

  it('does not advertise an absent pack as ready to practice', () => {
    study({ packs: [], questions: [] });
    renderDashboard();

    expect(screen.getByText(/学习包或题包不可用/)).toBeVisible();
    expect(screen.getByRole('link', { name: '实验室' })).toHaveAttribute('href', '/lab');
    expect(screen.getByRole('button', { name: '继续学习' })).toBeDisabled();
    expect(screen.queryByText('AI 核对 47/47')).not.toBeInTheDocument();
  });
});

describe('dashboard calendar and year scope', () => {
  it.each([false, true])('checks a completed card snapshot against its assigned version (old version: %s)', (oldVersion) => {
    const card = (JSON.parse(readFileSync(path.resolve('apps/web/public/content/learning.json'), 'utf8')) as LearningPack).cards[0]!;
    const now = new Date().toISOString();
    const plan = buildPersistentDailyPlan([], [], [card], [], now);
    assigned.set(plan.date, plan);
    reviewRounds = [{
      id: 'version-bound-round', dailyPlanId: plan.id, cards: [{ ...card, version: oldVersion ? card.version : 'new-version' }],
      queue: [card.id], cursor: 1, completedCardIds: [card.id], revision: 1,
      startedAt: now, updatedAt: now, completedAt: now,
    }];
    renderDashboard();
    const tasks = within(screen.getByRole('region', { name: '今日任务' }));
    expect(tasks.getByText(oldVersion ? '已完成' : '不可用：内容缺失、暂停或版本变化')).toBeInTheDocument();
    expect(tasks.queryByText(oldVersion ? '不可用：内容缺失、暂停或版本变化' : '已完成')).not.toBeInTheDocument();
  });

  it.each([false, true])('keeps daily completion bound to the assigned question version (old attempt: %s)', (oldAttempt) => {
    study({ questions: [question2009] });
    const { rerender } = renderDashboard();
    expect(screen.getByRole('button', { name: '开始剩余 1 题' })).toBeEnabled();
    const updated = { ...question2009, contentVersion: '2009.2-draft.1' };
    const attempt: Attempt = {
      id: 'version-bound-attempt', questionId: question2009.id,
      questionContentVersion: oldAttempt ? question2009.contentVersion : updated.contentVersion,
      sessionId: 'version-bound-session', mode: 'practice', response: { type: 'choice', optionId: 'A' },
      correct: true, score: 1, startedAt: '2026-10-04T10:00:00+08:00', submittedAt: '2026-10-04T10:00:01+08:00', durationMs: 1_000,
    };
    study({ questions: [updated], attempts: [attempt] });
    rerender(<MemoryRouter><DashboardPage /></MemoryRouter>);
    const tasks = within(screen.getByRole('region', { name: '今日任务' }));
    expect(tasks.getByText(oldAttempt ? '已完成' : '不可用：内容缺失、暂停或版本变化')).toBeInTheDocument();
    expect(tasks.queryByText(oldAttempt ? '不可用：内容缺失、暂停或版本变化' : '已完成')).not.toBeInTheDocument();
    if (oldAttempt) {
      expect(tasks.getByText('今日计划已全部完成')).toBeVisible();
      expect(tasks.queryByRole('button', { name: /开始剩余/ })).not.toBeInTheDocument();
    } else {
      expect(tasks.getByRole('button', { name: '开始剩余 0 题' })).toBeDisabled();
    }
    expect(assigned.get('2026-10-04')?.items[0]?.contentVersion).toBe(question2009.contentVersion);
  });

  it('reopens the daily plan at Beijing midnight without changing attempts or questions', () => {
    const attempt: Attempt = {
      id: 'today-attempt', questionId: question2009.id, questionContentVersion: question2009.contentVersion,
      sessionId: 'today-session', mode: 'practice', response: { type: 'choice', optionId: 'A' },
      correct: false, score: 0, startedAt: '2026-10-04T10:00:00+08:00', submittedAt: '2026-10-04T10:00:01+08:00', durationMs: 1_000,
    };
    study({ questions: [question2009], attempts: [attempt] });
    renderDashboard();
    expect(screen.getByText('2026-10-04 · DAILY PLAN')).toBeInTheDocument();
    expect(screen.getByText('今日计划已全部完成')).toBeVisible();
    expect(screen.getByRole('link', { name: '复盘待处理错题（1）' })).toHaveAttribute('href', '/wrong');

    act(() => { vi.advanceTimersByTime(90_000); });
    expect(screen.getByText('2026-10-05 · DAILY PLAN')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '开始剩余 1 题' })).toBeEnabled();
  });

  it.each(['visibilitychange', 'pageshow', 'focus'])('refreshes a suspended page on %s and preserves the queue within the same day', (event) => {
    renderDashboard();
    const before = screen.getByRole('region', { name: '今日任务' }).textContent;
    vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible');
    const target = event === 'visibilitychange' ? document : window;
    act(() => { target.dispatchEvent(new Event(event)); });
    expect(screen.getByRole('region', { name: '今日任务' }).textContent).toBe(before);

    // A sleeping tab may resume after multiple days with no timer delivery.
    vi.setSystemTime(new Date('2026-10-07T09:00:00+08:00'));
    act(() => { target.dispatchEvent(new Event(event)); });
    expect(screen.getByText('2026-10-07 · DAILY PLAN')).toBeInTheDocument();
  });

  it('counts actual practice across all years without treating manual mastery as attempted', () => {
    const currentProgress = overlayManualMastery(projectCurrentQuestionProgress([], questions), [{
      questionId: question2025.id, questionContentVersion: question2025.contentVersion,
      mastery: 'mastered', attemptCount: 0, correctCount: 0, wrongCount: 0, consecutiveCorrect: 0, lastCorrect: null,
    }], new Map(questions.map((question) => [question.id, question.contentVersion])));
    study({ currentProgress });
    const { rerender } = renderDashboard();
    expect(screen.getByRole('region', { name: '学习概况' })).toHaveTextContent('已练题目0 / 2');
    currentProgress.set(question2025.id, { ...currentProgress.get(question2025.id)!, attemptCount: 1 });
    study({ currentProgress: new Map(currentProgress) });
    rerender(<MemoryRouter><DashboardPage /></MemoryRouter>);
    expect(screen.getByRole('region', { name: '学习概况' })).toHaveTextContent('已练题目1 / 2');
    expect(screen.queryByText(/2009 全国统考|2028/)).not.toBeInTheDocument();
  });

  it('removes the midnight timer when leaving the dashboard', () => {
    const { unmount } = renderDashboard();
    expect(vi.getTimerCount()).toBeGreaterThan(0);
    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });
});
