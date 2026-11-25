import type { Attempt, DailyPlan, FlashcardDefinition, PracticeEvidence, Question, ReviewSession, StudySession } from '@408os/domain';
import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PracticeSummaryPage } from './PracticeSummaryPage';

const sampleSource = {
  questionId: 'cn408-2009-q01',
  questionContentVersion: '2009.0',
  documentSha256: 'a'.repeat(64),
  pages: [1],
  locator: 'Q1',
};

const q1: Question = {
  id: 'cn408-2009-q01',
  year: 2009,
  number: 1,
  subject: 'data-structures',
  kind: 'single-choice',
  stem: [{ type: 'text', text: '为解决计算机主机与打印机之间速度不匹配问题，通常设置一个打印数据缓冲区。主机将要输出的数据依次写入该缓冲区。' }],
  options: ['A', 'B', 'C', 'D'].map((id) => ({ id: id as 'A' | 'B' | 'C' | 'D', content: [{ type: 'text' as const, text: id }] })),
  answer: { type: 'choice', optionId: 'B' },
  explanation: [],
  hints: [],
  knowledgePointIds: [],
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

const q2: Question = {
  ...q1,
  id: 'cn408-2009-q02',
  number: 2,
  stem: [{ type: 'text', text: '设栈 S 和队列 Q 的初始状态均为空，元素 a, b, c 依次进入栈 S。' }],
};

const card1: FlashcardDefinition = {
  id: 'card-1',
  version: '1.0',
  subject: 'data-structures',
  conceptIds: ['ds.queue'],
  front: [{ type: 'text', text: '队列特性' }],
  back: [{ type: 'text', text: 'FIFO' }],
  sources: [sampleSource],
  reviewStatus: 'needs-review',
};

const createReviewSession = vi.hoisted(() => vi.fn());
const savePracticeEvidence = vi.hoisted(() => vi.fn());

const studyState = vi.hoisted(() => ({
  questions: [] as Question[],
  attempts: [] as Attempt[],
  createSession: vi.fn(),
}));

const learningState = vi.hoisted(() => ({
  pack: {
    id: 'lp',
    schemaVersion: 1 as const,
    version: '1.0',
    sha256: 'd'.repeat(64),
    createdAt: '2026-11-20T00:00:00.000Z',
    concepts: [{ id: 'ds.queue', subject: 'data-structures' as const, level: 'concept' as const, name: '队列' }],
    mappings: [],
    cards: [] as FlashcardDefinition[],
  },
  plan: null as DailyPlan | null,
  rounds: [] as ReviewSession[],
  personal: [],
  practices: [] as StudySession[],
  evidence: [] as PracticeEvidence[],
  contexts: [] as Array<{ sessionId: string; dailyPlanId?: string; parentSessionId?: string }>,
  loading: false,
  error: '',
}));

vi.mock('../app/StudyContext', () => ({
  useStudy: () => studyState,
}));

vi.mock('../app/LearningContext', () => ({
  useLearning: () => learningState,
}));

vi.mock('../app/storage', () => ({
  storage: {
    reviewRepository: {
      createSession: createReviewSession,
      savePracticeEvidence,
    },
  },
}));

describe('PracticeSummaryPage P2 & P4.2', () => {
  afterEach(cleanup);

  beforeEach(() => {
    vi.clearAllMocks();
    studyState.questions = [q1, q2];
    learningState.pack.cards = [card1];
    learningState.rounds = [];
    createReviewSession.mockResolvedValue({ id: 'round-next' });
  });

  it('collapses objective-correct questions with stem first-sentence excerpt while keeping wrong/annotated questions expanded, and promotes daily cards continuation when all answers are right', async () => {
    const user = userEvent.setup();
    learningState.plan = {
      id: 'plan-today',
      date: '2026-11-25',
      timeZone: 'Asia/Shanghai',
      algorithmVersion: 'daily-minimum-v1',
      createdAt: '2026-11-25T00:00:00.000Z',
      limits: { questions: 8, cards: 10, newCards: 3 },
      items: [
        { kind: 'question', targetId: q1.id, contentVersion: q1.contentVersion, reason: 'unseen' },
        { kind: 'question', targetId: q2.id, contentVersion: q2.contentVersion, reason: 'unseen' },
        { kind: 'card', targetId: card1.id, contentVersion: card1.version, reason: 'unseen' },
      ],
    };
    learningState.contexts = [{ sessionId: 'sess-daily', dailyPlanId: 'plan-today' }];
    learningState.practices = [
      {
        id: 'sess-daily',
        mode: 'review',
        questionIds: [q1.id, q2.id],
        questionContentVersions: { [q1.id]: q1.contentVersion, [q2.id]: q2.contentVersion },
        currentIndex: 1,
        responses: {
          [q1.id]: { type: 'choice', optionId: 'B' },
          [q2.id]: { type: 'choice', optionId: 'B' },
        },
        submittedQuestionIds: [q1.id, q2.id],
        startedAt: '2026-11-25T01:00:00.000Z',
        updatedAt: '2026-11-25T01:02:00.000Z',
        completedAt: '2026-11-25T01:02:00.000Z',
      },
    ];
    studyState.attempts = [
      {
        id: 'att-q1',
        questionId: q1.id,
        questionContentVersion: q1.contentVersion,
        sessionId: 'sess-daily',
        mode: 'review',
        response: { type: 'choice', optionId: 'B' },
        correct: true,
        score: 2,
        startedAt: '2026-11-25T01:00:00.000Z',
        submittedAt: '2026-11-25T01:01:00.000Z',
        durationMs: 20_000,
      },
      {
        id: 'att-q2',
        questionId: q2.id,
        questionContentVersion: q2.contentVersion,
        sessionId: 'sess-daily',
        mode: 'review',
        response: { type: 'choice', optionId: 'B' },
        correct: true,
        score: 2,
        startedAt: '2026-11-25T01:01:00.000Z',
        submittedAt: '2026-11-25T01:02:00.000Z',
        durationMs: 25_000,
      },
    ];
    learningState.evidence = [
      {
        id: JSON.stringify(['sess-daily', q1.id]),
        sessionId: 'sess-daily',
        questionId: q1.id,
        questionContentVersion: q1.contentVersion,
        hintsUsed: 0,
        evidenceFromStart: true,
        firstResponse: { type: 'choice', optionId: 'B' },
        activeDurationMs: 20_000,
        attemptId: 'att-q1',
        mistakeNote: '',
        revision: 1,
        updatedAt: '2026-11-25T01:01:00.000Z',
      },
      {
        id: JSON.stringify(['sess-daily', q2.id]),
        sessionId: 'sess-daily',
        questionId: q2.id,
        questionContentVersion: q2.contentVersion,
        hintsUsed: 0,
        evidenceFromStart: true,
        firstResponse: { type: 'choice', optionId: 'B' },
        activeDurationMs: 25_000,
        attemptId: 'att-q2',
        mistakeReason: 'reading',
        mistakeNote: '练习页已记下的笔记',
        revision: 2,
        updatedAt: '2026-11-25T01:02:00.000Z',
      },
    ];

    render(
      <MemoryRouter initialEntries={['/practice/sess-daily/summary']}>
        <Routes>
          <Route path="/practice/:sessionId/summary" element={<PracticeSummaryPage />} />
          <Route path="/review/cards/:roundId" element={<h1>已进入今日记忆卡轮次</h1>} />
        </Routes>
      </MemoryRouter>,
    );

    // Q1 is objective-correct with no mistake record -> collapsed with first-sentence excerpt, no second sentence!
    expect(screen.getByText(/为解决计算机主机与打印机之间速度不匹配问题/)).toBeVisible();
    expect(screen.queryByText(/依次写入该缓冲区/)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(`错因笔记 ${q1.id}`)).not.toBeInTheDocument();

    // Q2 has recorded mistakeReason & mistakeNote -> expanded by default showing the note saved on PracticePage!
    expect(screen.getByLabelText(`错因笔记 ${q2.id}`)).toHaveValue('练习页已记下的笔记');

    // Manual expand on Q1 reveals MistakeForm
    await user.click(screen.getByRole('button', { name: '展开记录' }));
    expect(screen.getByLabelText(`错因笔记 ${q1.id}`)).toBeVisible();

    // All answers right -> no disabled "重练本轮错题（0）", primary button is "继续今日剩余 1 张记忆卡 →"
    expect(screen.queryByRole('button', { name: /重练本轮错题/ })).not.toBeInTheDocument();
    const continueCardsBtn = screen.getByRole('button', { name: '继续今日剩余 1 张记忆卡 →' });
    expect(continueCardsBtn).toHaveClass('primary-command');

    await user.click(continueCardsBtn);
    await waitFor(() => expect(createReviewSession).toHaveBeenCalledWith([card1], expect.any(String), 'plan-today'));
    expect(await screen.findByRole('heading', { name: '已进入今日记忆卡轮次' })).toBeVisible();
  });
});
