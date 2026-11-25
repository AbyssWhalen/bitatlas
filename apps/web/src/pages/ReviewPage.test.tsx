import type { FlashcardDefinition, PersonalCard, Question, ReviewSession } from '@408os/domain';
import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ReviewPage } from './ReviewPage';

const mockCards = vi.hoisted(() => [] as FlashcardDefinition[]);
const mockLearning = vi.hoisted(() => ({
  pack: {
    concepts: [
      { id: 'ds.foundations.queue', subject: 'data-structures', level: 'concept', name: '循环队列' },
    ],
  },
  plan: { id: '2026-11-24', limits: { questions: 8, cards: 10, newCards: 3 }, items: [] },
  personal: [] as PersonalCard[],
  rounds: [] as ReviewSession[],
  practices: [],
  loading: false,
  error: '',
}));

const mockStudy = vi.hoisted(() => ({
  questions: [] as Question[],
  currentProgress: new Map(),
}));

const reviewRepo = vi.hoisted(() => ({
  createSession: vi.fn(),
  savePersonalCard: vi.fn(),
  saveReviewLimits: vi.fn(),
}));

vi.mock('../app/LearningContext', () => ({
  useLearning: () => mockLearning,
  useLearningCards: () => mockCards,
}));

vi.mock('../app/StudyContext', () => ({
  useStudy: () => mockStudy,
}));

vi.mock('../app/storage', () => ({
  storage: {
    reviewRepository: reviewRepo,
  },
}));

vi.mock('../components/DailyTasks', () => ({
  DailyTasks: () => (
    <section className="task-board" aria-label="今日任务">
      <button type="button" className="primary-command">开始剩余 8 题</button>
    </section>
  ),
}));

vi.mock('../components/LazyContentRenderer', () => ({
  LazyContentRenderer: ({ blocks }: { blocks: Array<{ type: string; text?: string }> }) => (
    <div className="content-blocks">{blocks.map((block, index) => <p key={index}>{block.text ?? block.type}</p>)}</div>
  ),
}));

function renderReview(initialEntry = '/review') {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route path="/review" element={<ReviewPage />} />
        <Route path="/wrong" element={<h1>错题重练</h1>} />
        <Route path="/review/cards/:roundId" element={<h1>卡片复习</h1>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('ReviewPage switcher, readable labels, and contracts', () => {
  afterEach(cleanup);

  beforeEach(() => {
    vi.clearAllMocks();
    mockStudy.questions = [
      {
        id: 'cn408-2009-q01',
        year: 2009,
        number: 1,
        subject: 'data-structures',
        kind: 'single-choice',
        stem: [{ type: 'text', text: '队列缓冲题' }],
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
      },
    ];
    mockStudy.currentProgress = new Map([
      ['cn408-2009-q01', { lastCorrect: false, attemptCount: 1, mastery: 'learning' }],
    ]);
    mockCards.splice(0, mockCards.length, {
      id: 'card-ds-queue-01',
      version: '1.0',
      subject: 'data-structures',
      conceptIds: ['ds.foundations.queue'],
      front: [{ type: 'text', text: '循环队列判满条件是什么？' }],
      back: [{ type: 'text', text: '(rear + 1) % maxSize == front' }],
      sources: [
        {
          questionId: 'cn408-2009-q01',
          questionContentVersion: '2009.0',
          documentSha256: 'a'.repeat(64),
          pages: [1],
          locator: '第 1 页',
        },
      ],
      reviewStatus: 'needs-review',
    });
    mockLearning.personal = [
      {
        id: 'personal:card-ds-queue-02',
        baseCardId: 'card-ds-queue-02',
        version: 'personal:1',
        subject: 'data-structures',
        conceptIds: ['ds.foundations.queue'],
        front: [{ type: 'text', text: '循环队列判空条件' }],
        back: [{ type: 'text', text: 'front == rear' }],
        sources: [],
        reviewStatus: 'needs-review',
        suspended: true,
        revision: 1,
        updatedAt: '2026-11-24T00:00:00.000Z',
      },
    ];
    reviewRepo.createSession.mockResolvedValue({ id: 'round-new' });
    reviewRepo.saveReviewLimits.mockResolvedValue(undefined);
  });

  it('renders top-level 复习 | 错题 switcher, keeps single primary CTA via DailyTasks, and replaces internal IDs with readable labels', async () => {
    const user = userEvent.setup();
    const { container } = renderReview();

    expect(screen.getByRole('heading', { name: '复习中心' })).toBeVisible();
    const switcher = screen.getByRole('navigation', { name: '复习与错题切换' });
    expect(switcher).toHaveTextContent('复习');
    expect(switcher).toHaveTextContent('错题');
    expect(switcher).toHaveTextContent('1');

    // Only DailyTasks renders a .primary-command red CTA
    expect(container.querySelectorAll('.primary-command')).toHaveLength(1);

    // Readable labels instead of raw internal IDs
    expect(screen.queryByText(/cn408-2009-q01/)).not.toBeInTheDocument();
    expect(screen.queryByText(/personal:card-ds-queue-02/)).not.toBeInTheDocument();
    expect(screen.getByText('2009 年第 1 题 · 第 1 页')).toBeInTheDocument();
    expect(screen.getByText('循环队列 · 循环队列判空条件')).toBeVisible();

    // Extra practice session button preserved
    await user.click(screen.getByRole('button', { name: '加练本组 1 张' }));
    await waitFor(() => expect(reviewRepo.createSession).toHaveBeenCalledTimes(1));
    expect(await screen.findByRole('heading', { name: '卡片复习' })).toBeVisible();
  });

  it('saves daily limits for tomorrow without changing today plan', async () => {
    const user = userEvent.setup();
    renderReview();

    await user.clear(screen.getByLabelText('每日题目'));
    await user.type(screen.getByLabelText('每日题目'), '12');
    await user.click(screen.getByRole('button', { name: '保存明日额度' }));

    await waitFor(() => expect(reviewRepo.saveReviewLimits).toHaveBeenCalled());
    expect(screen.getByRole('status')).toHaveTextContent('明天生效');
  });
});
