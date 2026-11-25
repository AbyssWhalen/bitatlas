import type { Attempt, Note, PracticeEvidence, Question, StudySession } from '@408os/domain';
import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
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
  notes: new Map<string, Note>(),
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
  personal: [],
  plan: null,
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
    studyState.notes = new Map();
    learningState.loading = false;
    learningState.error = '';
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
    const weakness = container.querySelector('.weakness-section')!;
    expect(weakness).toHaveTextContent('队列');
    expect(weakness).toHaveTextContent('练习中');
    expect(weakness).toHaveTextContent('已练 1/1 题');
    expect(weakness).not.toHaveTextContent('%');
  });

  it('WrongPage combines subject, reason and year filters and retries only the matching IDs', async () => {
    const user = userEvent.setup();
    const network = { ...sampleQuestion, id: 'network', year: 2020, subject: 'computer-networks' as const, stem: [{ type: 'text' as const, text: '子网题' }] };
    const unmarked = { ...network, id: 'unmarked', year: 2021 };
    studyState.questions.push(network, unmarked);
    studyState.currentProgress.set(network.id, { lastCorrect: false, wrongCount: 2, mastery: 'learning' });
    studyState.currentProgress.set(unmarked.id, { lastCorrect: false, wrongCount: 1, mastery: 'learning' });
    learningState.evidence[0]!.mistakeReason = 'concept';
    learningState.evidence.push({ ...learningState.evidence[0]!, id: 'network-proof', questionId: network.id, mistakeReason: 'calculation' });
    render(<MemoryRouter><WrongPage /></MemoryRouter>);
    expect(screen.getByRole('button', { name: '开始重练 3 题' })).toBeEnabled();
    await user.click(within(screen.getByRole('group', { name: '错题科目' })).getByRole('button', { name: '计算机网络' }));
    expect(screen.getByRole('button', { name: '开始重练 2 题' })).toBeEnabled();
    await user.click(within(screen.getByRole('group', { name: '错因筛选' })).getByRole('button', { name: '计算' }));
    expect(screen.getByRole('region', { name: '错题列表' })).toHaveTextContent('错因：计算');
    await user.selectOptions(screen.getByLabelText('错题年份'), '2021');
    expect(screen.getByRole('button', { name: '开始重练 0 题' })).toBeDisabled();
    expect(screen.getByText('没有符合筛选条件的错题')).toBeVisible();
    await user.selectOptions(screen.getByLabelText('错题年份'), '2020');
    await user.click(screen.getByRole('button', { name: '开始重练 1 题' }));
    await waitFor(() => expect(studyState.createSession).toHaveBeenCalledWith(['network'], 'review'));
  });

  it('WrongPage uses the latest current-version record, preserves cleared tags, and expands both note texts', async () => {
    const user = userEvent.setup();
    const proof = learningState.evidence[0]!;
    proof.mistakeReason = 'method';
    learningState.evidence.push(
      { ...proof, id: 'latest', updatedAt: '2026-11-24T03:00:00Z', mistakeReason: 'reading', mistakeNote: '看漏了条件\n第二行完整说明' },
      { ...proof, id: 'old-version', updatedAt: '2026-11-24T04:00:00Z', questionContentVersion: 'old', mistakeReason: 'calculation', mistakeNote: '旧题面笔记不可显示' },
    );
    studyState.notes.set(sampleQuestion.id, { id: 'note', questionId: sampleQuestion.id, body: '个人长笔记\n原文保留', createdAt: proof.updatedAt, updatedAt: proof.updatedAt });
    const { container, rerender } = render(<MemoryRouter><WrongPage /></MemoryRouter>);
    expect(screen.getByRole('region', { name: '错题列表' })).toHaveTextContent('错因：审题');
    expect(screen.queryByText('旧题面笔记不可显示')).not.toBeInTheDocument();
    const details = container.querySelectorAll('details');
    expect(details).toHaveLength(2);
    for (const detail of details) {
      expect(detail).not.toHaveAttribute('open');
      await user.click(detail.querySelector('summary')!);
      expect(detail).toHaveAttribute('open');
    }
    expect(details[0]!.querySelector('p')!.textContent).toBe('看漏了条件\n第二行完整说明');
    expect(details[1]!.querySelector('p')!.textContent).toBe('个人长笔记\n原文保留');
    const cleared = { ...proof };
    delete cleared.mistakeReason;
    learningState.evidence = [...learningState.evidence, { ...cleared, id: 'cleared', updatedAt: '2026-11-24T05:00:00Z' }];
    rerender(<MemoryRouter><WrongPage /></MemoryRouter>);
    await user.click(within(screen.getByRole('group', { name: '错因筛选' })).getByRole('button', { name: '未标错因' }));
    expect(screen.getByRole('button', { name: '开始重练 1 题' })).toBeEnabled();
    expect(screen.getByRole('region', { name: '错题列表' })).toHaveTextContent('未标错因');
    await user.click(within(screen.getByRole('group', { name: '错因筛选' })).getByRole('button', { name: '方法' }));
    expect(screen.getByRole('button', { name: '开始重练 0 题' })).toBeDisabled();
    await user.click(screen.getByRole('button', { name: '清除筛选' }));
    expect(screen.getByRole('button', { name: '开始重练 1 题' })).toBeEnabled();
  });

  it.each(['missing', 'hinted', 'old-version', 'correct'] as const)('StatsPage does not label %s evidence as an objectively weak concept', (scenario) => {
    if (scenario === 'missing') learningState.evidence = [];
    if (scenario === 'hinted') learningState.evidence[0]!.hintsUsed = 1;
    if (scenario === 'old-version') studyState.attempts[0]!.questionContentVersion = 'old';
    if (scenario === 'correct') studyState.attempts[0]!.correct = true;
    const { container } = render(<MemoryRouter><StatsPage /></MemoryRouter>);
    expect(container.querySelector('.weakness-list')).not.toBeInTheDocument();
    expect(container.querySelector('.weakness-section')).not.toHaveTextContent('%');
    expect(screen.getByText('当前没有需要复习的客观错答概念；未检测不代表已掌握。')).toBeVisible();
  });

  it('StatsPage shows loading and failed evidence reads rather than a reassuring empty state', () => {
    learningState.loading = true;
    const { rerender } = render(<MemoryRouter><StatsPage /></MemoryRouter>);
    expect(screen.getByRole('status')).toHaveTextContent('正在读取概念证据');
    learningState.loading = false;
    learningState.error = '读取失败';
    rerender(<MemoryRouter><StatsPage /></MemoryRouter>);
    expect(screen.getByRole('alert')).toHaveTextContent('读取失败');
    expect(screen.queryByText('当前没有需要复习的客观错答概念；未检测不代表已掌握。')).not.toBeInTheDocument();
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
