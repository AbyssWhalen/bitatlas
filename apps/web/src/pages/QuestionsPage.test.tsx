import type { Question } from '@408os/domain';
import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { QuestionsPage } from './QuestionsPage';

const study = vi.hoisted(() => ({
  packs: [{ id: 'cn408-2009', year: 2009 }, { id: 'cn408-2019', year: 2019 }],
  questions: [] as Question[],
  currentProgress: new Map(),
  collections: new Set<string>(),
  assets: new Map(),
  createSession: vi.fn(),
}));

const settingStore = vi.hoisted(() => ({
  getSetting: vi.fn(),
  saveSetting: vi.fn(),
}));

vi.mock('../app/StudyContext', () => ({
  useStudy: () => study,
}));

vi.mock('../app/LearningContext', () => ({
  useLearning: () => ({
    pack: {
      concepts: [
        { id: 'ds.linear', subject: 'data-structures', level: 'chapter', name: '线性表' },
        { id: 'ds.linear.queue', subject: 'data-structures', level: 'concept', parentId: 'ds.linear', name: '队列' },
      ],
    },
  }),
  useConceptQuestions: () => study.questions,
}));

vi.mock('../app/storage', () => ({
  storage: {
    reviewRepository: settingStore,
  },
}));

vi.mock('../components/LazyContentRenderer', () => ({
  LazyContentRenderer: ({ blocks }: { blocks: Array<{ type: string; text?: string }> }) => (
    <div className="content-blocks">{blocks.map((block, index) => <p key={index}>{block.text ?? block.type}</p>)}</div>
  ),
}));

function makeQuestion(id: string, year: number, number: number, subject: Question['subject'], text: string): Question {
  return {
    id,
    year,
    number,
    subject,
    kind: 'single-choice',
    stem: [{ type: 'text', text }],
    options: ['A', 'B', 'C', 'D'].map((opt) => ({ id: opt as 'A' | 'B' | 'C' | 'D', content: [{ type: 'text' as const, text: opt }] })),
    answer: { type: 'choice', optionId: 'B' },
    explanation: [],
    hints: [],
    knowledgePointIds: ['ds.linear.queue'],
    assetIds: [],
    source: {
      question: { publisher: '来源', title: `${year} 真题`, url: 'https://example.com/q.pdf', fileName: 'q.pdf', sha256: 'a'.repeat(64), pages: [1], locator: '第 1 页' },
      answer: { publisher: '来源', title: `${year} 解析`, url: 'https://example.com/a.pdf', fileName: 'a.pdf', sha256: 'b'.repeat(64), pages: [1], locator: '第 1 页' },
      crosschecks: [],
      redistribution: 'unknown',
    },
    contentVersion: `${year}.0`,
    reviewStatus: 'needs-review',
  };
}

function renderQuestions(initialEntry = '/questions?year=2009') {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route path="/questions" element={<QuestionsPage />} />
        <Route path="/practice/:sessionId" element={<h1>练习会话</h1>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('QuestionsPage layout, filtering, and contracts', () => {
  afterEach(cleanup);

  beforeEach(() => {
    vi.clearAllMocks();
    study.questions = [
      makeQuestion('cn408-2009-q01', 2009, 1, 'data-structures', '打印数据缓冲区逻辑结构'),
      makeQuestion('cn408-2019-q01', 2019, 1, 'operating-systems', '进程调度与时间片轮转'),
    ];
    study.createSession.mockResolvedValue('session-1');
    settingStore.getSetting.mockResolvedValue(undefined);
    settingStore.saveSetting.mockResolvedValue(undefined);
  });

  it('keeps heading, result-summary count, year segmented filter, and single-question start contract', async () => {
    const user = userEvent.setup();
    const { container } = renderQuestions('/questions?year=2009');

    expect(screen.getByRole('heading', { name: '真题浏览' })).toBeVisible();
    await waitFor(() => expect(container.querySelector('.result-summary strong')).toHaveTextContent('1'));
    expect(container.querySelectorAll('.question-list .question-row')).toHaveLength(1);
    expect(screen.getByText('打印数据缓冲区逻辑结构')).toBeVisible();

    await user.click(screen.getByRole('button', { name: '2019' }));
    await waitFor(() => expect(screen.getByText('进程调度与时间片轮转')).toBeVisible());
    expect(container.querySelector('.result-summary strong')).toHaveTextContent('1');

    await user.click(screen.getByRole('button', { name: '开始第 1 题' }));
    await waitFor(() => expect(study.createSession).toHaveBeenCalledWith(['cn408-2019-q01'], 'practice', false));
    expect(await screen.findByRole('heading', { name: '练习会话' })).toBeVisible();
  });

  it('supports resetting filters back to all years and exposes a single primary practice button', async () => {
    const user = userEvent.setup();
    const { container } = renderQuestions('/questions?year=2009');

    await waitFor(() => expect(container.querySelector('.result-summary strong')).toHaveTextContent('1'));
    expect(container.querySelectorAll('.primary-command')).toHaveLength(1);

    await user.click(screen.getByRole('button', { name: /重置/ }));
    await waitFor(() => expect(container.querySelector('.result-summary strong')).toHaveTextContent('2'));
  });
});
