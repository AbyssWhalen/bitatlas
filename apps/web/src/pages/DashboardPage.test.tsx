import { readFileSync } from 'node:fs';
import path from 'node:path';
import { act, cleanup, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { aggregateStats, overlayManualMastery, projectCurrentQuestionProgress, type Attempt, type ContentPack } from '@408os/domain';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useStudy } from '../app/StudyContext';
import { DashboardPage } from './DashboardPage';

vi.mock('../app/StudyContext', () => ({ useStudy: vi.fn() }));

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

describe('dashboard source audit status', () => {
  it('shows completed source checking without claiming human approval', () => {
    study({ packs: [pack(2009).manifest] });
    renderDashboard();

    expect(screen.getByText('2009 题包已完成 AI 来源核对，可开始练习。')).toBeVisible();
    expect(screen.getByText('AI 核对 47/47')).toBeVisible();
    expect(screen.getByText('正式模考仍待人工审核。')).toBeVisible();
    expect(screen.queryByText('2009 题包等待逐题人工复核。')).not.toBeInTheDocument();
    expect(screen.queryByText('0/47')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: '查看详情' })).toBeEnabled();
  });

  it.each(['sha256', 'contentVersion'] as const)('does not reuse audit evidence when the installed %s differs', (field) => {
    const manifest = { ...pack(2009).manifest, [field]: 'different' };
    study({ packs: [manifest] });
    renderDashboard();

    expect(screen.queryByText('AI 核对 47/47')).not.toBeInTheDocument();
    expect(screen.getByText('2009 题包可用于练习，正式模考待审核。')).toBeVisible();
  });

  it('retains the verified state without an outstanding audit message', () => {
    study({ packs: [{ ...pack(2009).manifest, reviewStatus: 'verified' }] });
    renderDashboard();

    expect(screen.getByText('2009 Verified 题包已激活。')).toBeVisible();
    expect(screen.queryByText('正式模考仍待人工审核。')).not.toBeInTheDocument();
    expect(screen.queryByText('AI 核对 47/47')).not.toBeInTheDocument();
  });

  it('does not advertise an absent pack as ready to practice', () => {
    study({ packs: [], questions: [] });
    renderDashboard();

    expect(screen.getByText('本地 2009 题包未安装。')).toBeVisible();
    expect(screen.getByRole('button', { name: '进入实验' })).toBeEnabled();
    expect(screen.getByRole('button', { name: '继续学习' })).toBeDisabled();
    expect(screen.queryByText('AI 核对 47/47')).not.toBeInTheDocument();
  });
});

describe('dashboard calendar and year scope', () => {
  it('reopens the daily plan at Beijing midnight without changing attempts or questions', () => {
    const attempt: Attempt = {
      id: 'today-attempt', questionId: question2009.id, questionContentVersion: question2009.contentVersion,
      sessionId: 'today-session', mode: 'practice', response: { type: 'choice', optionId: 'A' },
      correct: false, score: 0, startedAt: '2026-10-04T10:00:00+08:00', submittedAt: '2026-10-04T10:00:01+08:00', durationMs: 1_000,
    };
    study({ questions: [question2009], attempts: [attempt] });
    renderDashboard();
    expect(screen.getByText('DAILY REVIEW / 2026-10-04')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '今日已完成' })).toBeDisabled();

    act(() => { vi.advanceTimersByTime(90_000); });
    expect(screen.getByText('DAILY REVIEW / 2026-10-05')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '开始剩余 1 题' })).toBeEnabled();
  });

  it.each(['visibilitychange', 'pageshow', 'focus'])('refreshes a suspended page on %s and preserves the queue within the same day', (event) => {
    renderDashboard();
    const before = screen.getByRole('region', { name: '今日复习计划' }).textContent;
    vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible');
    const target = event === 'visibilitychange' ? document : window;
    act(() => { target.dispatchEvent(new Event(event)); });
    expect(screen.getByRole('region', { name: '今日复习计划' }).textContent).toBe(before);

    // A sleeping tab may resume after multiple days with no timer delivery.
    vi.setSystemTime(new Date('2026-10-07T09:00:00+08:00'));
    act(() => { target.dispatchEvent(new Event(event)); });
    expect(screen.getByText('DAILY REVIEW / 2026-10-07')).toBeInTheDocument();
  });

  it('counts mastery only for 2009 while retaining evidence-only global practice counts', () => {
    const currentProgress = overlayManualMastery(projectCurrentQuestionProgress([], questions), [{
      questionId: question2025.id, questionContentVersion: question2025.contentVersion,
      mastery: 'mastered', attemptCount: 0, correctCount: 0, wrongCount: 0, consecutiveCorrect: 0, lastCorrect: null,
    }], new Map(questions.map((question) => [question.id, question.contentVersion])));
    study({ currentProgress });
    const { container, rerender } = renderDashboard();
    const yearCard = container.querySelector('.year-band')! as HTMLElement;
    expect(within(yearCard).getByText('已掌握', { exact: false }).textContent).toBe('0 已掌握');
    expect(screen.getByRole('region', { name: '学习指标' })).toHaveTextContent('已练题目0 / 2');

    currentProgress.set(question2009.id, { ...currentProgress.get(question2025.id)!, questionId: question2009.id, questionContentVersion: question2009.contentVersion });
    study({ currentProgress: new Map(currentProgress) });
    rerender(<MemoryRouter><DashboardPage /></MemoryRouter>);
    expect(within(yearCard).getByText('已掌握', { exact: false }).textContent).toBe('1 已掌握');
    expect(screen.getByRole('region', { name: '学习指标' })).toHaveTextContent('已练题目0 / 2');
  });

  it('removes the midnight timer when leaving the dashboard', () => {
    const { unmount } = renderDashboard();
    expect(vi.getTimerCount()).toBeGreaterThan(0);
    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });
});
