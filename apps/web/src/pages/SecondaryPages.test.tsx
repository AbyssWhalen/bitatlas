import type { Attempt, PracticeEvidence, Question, StudySession } from '@408os/domain';
import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MorePage } from './MorePage';
import { PracticeSummaryPage } from './PracticeSummaryPage';
import { StatsPage } from './StatsPage';
import { WrongPage } from './WrongPage';

const studyState = vi.hoisted(() => ({
  questions: [] as Question[],
  attempts: [] as Attempt[],
  currentProgress: new Map(),
  stats: {
    attempted: 2,
    correct: 1,
    accuracy: 0.5,
    durationMs: 120_000,
    bySubject: {
      'data-structures': { attempted: 2, correct: 1, accuracy: 0.5 },
      'computer-organization': { attempted: 0, correct: 0, accuracy: null },
      'operating-systems': { attempted: 0, correct: 0, accuracy: null },
      'computer-networks': { attempted: 0, correct: 0, accuracy: null },
    },
  },
  createSession: vi.fn(),
}));

const learningState = vi.hoisted(() => ({
  pack: {
    concepts: [
      { id: 'ds', subject: 'data-structures', level: 'subject', name: '数据结构' },
      { id: 'ds.queue', subject: 'data-structures', level: 'concept', parentId: 'ds', name: '队列' },
    ],
    mappings: [
      {
        questionId: 'cn408-2009-q01',
        questionContentVersion: '2009.0',
        subject: 'data-structures',
        primaryConceptId: 'ds.queue',
        conceptIds: ['ds.queue'],
        legacyNodeIds: [],
      },
    ],
  },
  practices: [] as StudySession[],
  evidence: [] as PracticeEvidence[],
  contexts: [],
  events: [],
  loading: false,
  error: '',
}));

const savePracticeEvidence = vi.hoisted(() => vi.fn());

vi.mock('../app/StudyContext', () => ({
  useStudy: () => studyState,
}));

vi.mock('../app/LearningContext', () => ({
  useLearning: () => learningState,
  useConceptQuestions: () => studyState.questions,
}));

vi.mock('../app/storage', () => ({
  storage: {
    reviewRepository: {
      savePracticeEvidence,
    },
  },
}));

vi.mock('../components/LazyContentRenderer', () => ({
  LazyContentRenderer: ({ blocks }: { blocks: Array<{ type: string; text?: string }> }) => (
    <div className="content-blocks">{blocks.map((block, index) => <p key={index}>{block.text ?? block.type}</p>)}</div>
  ),
}));

const sampleQuestion: Question = {
  id: 'cn408-2009-q01',
  year: 2009,
  number: 1,
  subject: 'data-structures',
  kind: 'single-choice',
  stem: [{ type: 'text', text: '打印机数据缓冲区' }],
  options: ['A', 'B', 'C', 'D'].map((id) => ({ id: id as 'A' | 'B' | 'C' | 'D', content: [{ type: 'text' as const, text: id }] })),
  answer: { type: 'choice', optionId: 'B' },
  explanation: [],
  hints: [],
  knowledgePointIds: ['ds.queue'],
  assetIds: [],
  source: {
    question: { publisher: '来源', title: '2009', url: '', fileName: 'q.pdf', sha256: 'a'.repeat(64), pages: [1], locator: '第 1 页' },
    answer: { publisher: '来源', title: '2009', url: '', fileName: 'a.pdf', sha256: 'b'.repeat(64), pages: [1], locator: '第 1 页' },
    crosschecks: [],
    redistribution: 'unknown',
  },
  contentVersion: '2009.0',
  reviewStatus: 'needs-review',
};

describe('Stage 2b secondary pages contracts', () => {
  afterEach(cleanup);

  beforeEach(() => {
    vi.clearAllMocks();
    studyState.questions = [sampleQuestion];
    studyState.currentProgress = new Map([
      ['cn408-2009-q01', { lastCorrect: false, wrongCount: 1, mastery: 'learning', attemptCount: 1 }],
    ]);
    studyState.attempts = [
      {
        id: 'att-1',
        questionId: 'cn408-2009-q01',
        questionContentVersion: '2009.0',
        sessionId: 'sess-1',
        mode: 'practice',
        response: { type: 'choice', optionId: 'A' },
        correct: false,
        score: 0,
        startedAt: '2026-11-24T01:00:00.000Z',
        submittedAt: '2026-11-24T01:01:00.000Z',
        durationMs: 60_000,
      },
    ];
    studyState.createSession.mockResolvedValue('sess-retry');
    learningState.practices = [
      {
        id: 'sess-1',
        mode: 'practice',
        questionIds: ['cn408-2009-q01'],
        questionContentVersions: { 'cn408-2009-q01': '2009.0' },
        currentIndex: 0,
        responses: { 'cn408-2009-q01': { type: 'choice', optionId: 'A' } },
        submittedQuestionIds: ['cn408-2009-q01'],
        startedAt: '2026-11-24T01:00:00.000Z',
        updatedAt: '2026-11-24T01:01:00.000Z',
        completedAt: '2026-11-24T01:01:00.000Z',
      },
    ];
    learningState.evidence = [
      {
        id: JSON.stringify(['sess-1', 'cn408-2009-q01']),
        sessionId: 'sess-1',
        questionId: 'cn408-2009-q01',
        questionContentVersion: '2009.0',
        hintsUsed: 0,
        evidenceFromStart: true,
        firstResponse: { type: 'choice', optionId: 'A' },
        activeDurationMs: 60_000,
        attemptId: 'att-1',
        mistakeNote: '',
        revision: 1,
        updatedAt: '2026-11-24T01:01:00.000Z',
      },
    ];
    savePracticeEvidence.mockResolvedValue(undefined);
  });

  it('WrongPage preserves heading, wrong-list row text, and sibling 复习 | 错题 switcher', () => {
    const { container } = render(
      <MemoryRouter initialEntries={['/wrong']}>
        <WrongPage />
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { name: '错题重练' })).toBeVisible();
    expect(screen.getByRole('navigation', { name: '复习与错题切换' })).toBeVisible();
    const row = container.querySelector('.wrong-list .question-row');
    expect(row).toHaveTextContent('错误 1 次');
    expect(row).toHaveTextContent('打印机数据缓冲区');
  });

  it('PracticeSummaryPage preserves 本轮总结, 本轮证据, exact mistake labels, and 相关卡片 link', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={['/practice/sess-1/summary']}>
        <Routes>
          <Route path="/practice/:sessionId/summary" element={<PracticeSummaryPage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { name: '本轮总结' })).toBeVisible();
    expect(screen.getByRole('region', { name: '本轮证据' })).toHaveTextContent('1 次有效客观首答');
    expect(screen.getByRole('link', { name: '相关卡片' })).toBeVisible();

    await user.selectOptions(screen.getByLabelText('错因 cn408-2009-q01'), 'concept');
    await user.type(screen.getByLabelText('错因笔记 cn408-2009-q01'), '混淆了队列和栈');
    await user.click(screen.getByRole('button', { name: '保存错因' }));

    await waitFor(() => expect(savePracticeEvidence).toHaveBeenCalled());
    expect(screen.getByRole('status')).toHaveTextContent('已保存');
  });

  it('StatsPage preserves metric-grid ordering (有效作答 then 答对题次) and 84 heatmap cells', () => {
    const { container } = render(
      <MemoryRouter initialEntries={['/stats']}>
        <StatsPage />
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { name: '学习统计' })).toBeVisible();
    const metrics = container.querySelectorAll('.metric-grid article');
    expect(metrics[0]).toHaveTextContent('有效作答');
    expect(metrics[1]).toHaveTextContent('答对题次');
    expect(container.querySelectorAll('.heatmap span')).toHaveLength(84);
  });

  it('MorePage preserves .more-grid and 更多工具 navigation contract', () => {
    const { container } = render(
      <MemoryRouter initialEntries={['/more']}>
        <MorePage />
      </MemoryRouter>,
    );

    const nav = screen.getByRole('navigation', { name: '更多工具' });
    expect(nav).toHaveClass('more-grid');
    expect(container.querySelectorAll('.more-grid a')).toHaveLength(9);
  });
});
