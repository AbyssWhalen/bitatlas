import '@testing-library/jest-dom/vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { MockExam, StudySession } from '@408os/domain';
import { MockExamSessionPage } from './MockExamSessionPage';

const ids = Array.from({ length: 47 }, (_, index) => `q${index + 1}`);
const questions = ids.map((id, index) => index < 40 ? ({
  id,
  year: 2009,
  number: index + 1,
  kind: 'single-choice' as const,
  contentVersion: '2009.1',
  stem: [{ type: 'text' as const, text: `题目 ${index + 1}` }],
  options: ['A', 'B', 'C', 'D'].map((option) => ({ id: option as 'A' | 'B' | 'C' | 'D', content: [{ type: 'text' as const, text: option }] })),
  answer: { type: 'choice' as const, optionId: 'A' as const },
}) : ({
  id,
  year: 2009,
  number: index + 1,
  kind: 'comprehensive' as const,
  contentVersion: '2009.1',
  stem: [{ type: 'text' as const, text: `综合题 ${index + 1}` }],
  answer: { type: 'comprehensive' as const, maxScore: 10, rubric: [{ id: `r-${index + 1}`, description: '评分点', points: 10 }], reference: [] },
}));
const snapshots = questions.map((question) => ({
  id: question.id,
  number: question.number,
  kind: question.kind,
  contentVersion: question.contentVersion,
  maxScore: question.kind === 'single-choice' ? 2 : 10,
}));

function bundle(status: MockExam['status'] = 'in-progress') {
  const startedAt = new Date(Date.now() - 60_000).toISOString();
  const updatedAt = new Date(Date.now() - 30_000).toISOString();
  const submittedAt = new Date(Date.now() - 10_000).toISOString();
  const session: StudySession = {
    id: 'session-1',
    mode: 'mock',
    questionIds: ids,
    questionContentVersions: Object.fromEntries(ids.map((id) => [id, '2009.1'])),
    currentIndex: 0,
    responses: status === 'submitted' ? { q41: { type: 'comprehensive', text: 'answer', checkedRubricIds: [] } } : {},
    submittedQuestionIds: [],
    startedAt,
    updatedAt,
    ...(status !== 'in-progress' ? { completedAt: submittedAt } : {}),
  };
  const exam: MockExam = {
    id: 'exam-1',
    sessionId: session.id,
    blueprint: {
      packId: 'cn408-2009', packHash: 'c'.repeat(64), contentVersion: '2009.1', year: 2009,
      durationMinutes: 180, objectiveMaxScore: 80, comprehensiveMaxScore: 70, totalMaxScore: 150, questions: snapshots,
    },
    status,
    questionDurationsMs: Object.fromEntries(ids.map((id) => [id, 0])),
    startedAt: session.startedAt,
    updatedAt: session.updatedAt,
    ...(status !== 'in-progress' ? {
      submittedAt,
      submissionReason: 'manual' as const,
      score: {
        objectiveScore: 0, comprehensiveScore: 0, totalScore: 0, objectiveAnswered: 0,
        comprehensiveSelfScored: 0, fullySelfScored: false, pendingSelfScoreQuestionIds: ids.slice(40),
      },
    } : {}),
  };
  return { exam, session };
}

const study = vi.hoisted(() => ({
  questions: [] as typeof questions,
  getMockExam: vi.fn(),
  saveMockExamDraft: vi.fn(),
  submitMockExam: vi.fn(),
  selfScoreMockExam: vi.fn(),
  subscribeMockExam: vi.fn(),
}));

study.questions = questions;

let observedExam: ((value: ReturnType<typeof bundle> | undefined) => void) | null = null;
const stopObserving = vi.fn();

function externalAnswer(initial: ReturnType<typeof bundle>, optionId: 'A' | 'B' | 'C' | 'D') {
  const updatedAt = new Date(Date.parse(initial.exam.updatedAt) + 1_000).toISOString();
  return {
    exam: { ...initial.exam, updatedAt },
    session: {
      ...initial.session,
      updatedAt,
      responses: { ...initial.session.responses, q1: { type: 'choice' as const, optionId } },
    },
  };
}

vi.mock('../app/StudyContext', () => ({
  useStudy: () => study,
}));

describe('MockExamSessionPage', () => {
  beforeEach(() => {
    observedExam = null;
    study.subscribeMockExam.mockImplementation((_examId, onValue) => {
      observedExam = onValue;
      return stopObserving;
    });
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('automatically applies an external update when there is no local draft', async () => {
    const initial = bundle();
    study.getMockExam.mockResolvedValueOnce(initial);
    render(<MemoryRouter initialEntries={['/mock/exam-1']}><Routes><Route path="/mock/:examId" element={<MockExamSessionPage />} /></Routes></MemoryRouter>);

    expect(await screen.findByRole('heading', { name: '2009 整卷模考' })).toBeVisible();
    await waitFor(() => expect(study.subscribeMockExam).toHaveBeenCalledWith('exam-1', expect.any(Function), expect.any(Function)));
    await act(async () => { observedExam?.(externalAnswer(initial, 'B')); });

    expect(screen.getByRole('button', { name: '选择 B' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('status')).toHaveTextContent('已同步另一标签页的最新记录');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('preserves a local draft and blocks writes when another tab updates the exam', async () => {
    const initial = bundle();
    study.getMockExam.mockResolvedValueOnce(initial);
    render(<MemoryRouter initialEntries={['/mock/exam-1']}><Routes><Route path="/mock/:examId" element={<MockExamSessionPage />} /></Routes></MemoryRouter>);

    expect(await screen.findByRole('heading', { name: '2009 整卷模考' })).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: '选择 A' }));
    await act(async () => { observedExam?.(externalAnswer(initial, 'B')); });

    expect(screen.getByRole('alert')).toHaveTextContent('另一标签页已更新此模考');
    expect(screen.getByRole('button', { name: '选择 A' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: '保存当前草稿' })).toBeDisabled();
    expect(study.saveMockExamDraft).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: '加载最新记录' }));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: '选择 B' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('loads a persisted exam, saves an answer draft, and submits the paper', async () => {
    const initial = bundle();
    study.getMockExam.mockResolvedValueOnce(initial);
    study.saveMockExamDraft.mockImplementation(async () => initial);
    study.submitMockExam.mockResolvedValueOnce({ ...initial, exam: { ...initial.exam, status: 'submitted' } });
    render(<MemoryRouter initialEntries={['/mock/exam-1']}><Routes><Route path="/mock/:examId" element={<MockExamSessionPage />} /></Routes></MemoryRouter>);

    expect(await screen.findByRole('heading', { name: '2009 整卷模考' })).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: '选择 A' }));
    fireEvent.click(screen.getByRole('button', { name: '保存当前草稿' }));
    await waitFor(() => expect(study.saveMockExamDraft).toHaveBeenCalled());
    fireEvent.click(screen.getByRole('button', { name: '提交整卷' }));
    await waitFor(() => expect(study.submitMockExam).toHaveBeenCalledWith(expect.objectContaining({ examId: 'exam-1', reason: 'manual' })));
  });

  it('shows self-score controls after submit without reopening answer editing', async () => {
    const submitted = bundle('submitted');
    study.getMockExam.mockResolvedValueOnce(submitted);
    study.selfScoreMockExam.mockResolvedValueOnce(submitted);
    render(<MemoryRouter initialEntries={['/mock/exam-1']}><Routes><Route path="/mock/:examId" element={<MockExamSessionPage />} /></Routes></MemoryRouter>);

    expect(await screen.findByText('交卷完成，等待综合题自评')).toBeVisible();
    expect(screen.getByLabelText('综合题自评分')).toBeEnabled();
    expect(screen.getByRole('button', { name: '选择 A' })).toBeDisabled();
  });

  it('fails closed when the persisted exam cannot be found', async () => {
    study.getMockExam.mockResolvedValueOnce(undefined);
    render(<MemoryRouter initialEntries={['/mock/missing']}><Routes><Route path="/mock/:examId" element={<MockExamSessionPage />} /></Routes></MemoryRouter>);

    expect(await screen.findByRole('alert')).toHaveTextContent('未找到持久化模考');
  });

  it('clears a transient load error when retrying persisted recovery', async () => {
    const initial = bundle();
    study.getMockExam.mockRejectedValueOnce(new Error('temporary read failure')).mockResolvedValueOnce(initial);
    render(<MemoryRouter initialEntries={['/mock/exam-1']}><Routes><Route path="/mock/:examId" element={<MockExamSessionPage />} /></Routes></MemoryRouter>);

    expect(await screen.findByRole('alert')).toHaveTextContent('temporary read failure');
    fireEvent.click(screen.getByRole('button', { name: '重新读取' }));
    expect(await screen.findByRole('heading', { name: '2009 整卷模考' })).toBeVisible();
  });

  it('auto-submits an already expired exam only once', async () => {
    const expired = bundle();
    const startedAt = new Date(Date.now() - 181 * 60_000).toISOString();
    expired.exam.startedAt = startedAt;
    expired.session.startedAt = startedAt;
    study.getMockExam.mockResolvedValueOnce(expired);
    study.submitMockExam.mockResolvedValueOnce({ ...expired, exam: { ...expired.exam, status: 'submitted' } });
    render(<MemoryRouter initialEntries={['/mock/exam-1']}><Routes><Route path="/mock/:examId" element={<MockExamSessionPage />} /></Routes></MemoryRouter>);

    await waitFor(() => expect(study.submitMockExam).toHaveBeenCalledTimes(1));
    await new Promise((resolve) => setTimeout(resolve, 30));
    expect(study.submitMockExam).toHaveBeenCalledTimes(1);
    expect(study.submitMockExam).toHaveBeenCalledWith(expect.objectContaining({ reason: 'timeout' }));
  });

  it('stops before rendering answers when a persisted blueprint drifts from current content', async () => {
    const initialQuestions = study.questions;
    study.questions = initialQuestions.map((question) => question.id === 'q1'
      ? { ...question, contentVersion: 'drifted' }
      : question);
    study.getMockExam.mockResolvedValueOnce(bundle());
    render(<MemoryRouter initialEntries={['/mock/exam-1']}><Routes><Route path="/mock/:examId" element={<MockExamSessionPage />} /></Routes></MemoryRouter>);

    expect(await screen.findByRole('alert')).toHaveTextContent('题面版本已变化');
    expect(screen.queryByRole('button', { name: '选择 A' })).not.toBeInTheDocument();
    study.questions = initialQuestions;
  });
});
