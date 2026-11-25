import type { LearningPack, Question } from '@408os/domain';
import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { LearningContext, empty } from '../app/LearningContext';
import { PracticeConceptBridge } from './PracticeConceptBridge';

const question2024: Question = {
  id: 'cn408-2024-q12',
  year: 2024,
  number: 12,
  subject: 'computer-organization',
  kind: 'single-choice',
  stem: [{ type: 'text', text: 'short/int 符号扩展题干' }],
  options: ['A', 'B', 'C', 'D'].map((id) => ({ id: id as 'A' | 'B' | 'C' | 'D', content: [{ type: 'text' as const, text: id }] })),
  answer: { type: 'choice', optionId: 'B' },
  explanation: [],
  hints: [],
  knowledgePointIds: ['co.data.integer'],
  assetIds: [],
  source: {
    question: { publisher: '来源', title: '2024', url: '', fileName: 'q.pdf', sha256: 'a'.repeat(64), pages: [2], locator: '第 2 页' },
    answer: { publisher: '来源', title: '2024', url: '', fileName: 'a.pdf', sha256: 'b'.repeat(64), pages: [2], locator: '第 2 页' },
    crosschecks: [],
    redistribution: 'unknown',
  },
  contentVersion: '2024.0',
  reviewStatus: 'needs-review',
};

const question2009Q12: Question = {
  ...question2024,
  id: 'cn408-2009-q12',
  year: 2009,
  contentVersion: '2009.0',
};

vi.mock('../app/StudyContext', () => ({
  useStudy: () => ({
    questions: [question2009Q12, question2024],
    attempts: [
      {
        id: 'att-wrong',
        questionId: 'cn408-2024-q12',
        questionContentVersion: '2024.0',
        sessionId: 'sess-1',
        mode: 'practice',
        response: { type: 'choice', optionId: 'A' },
        correct: false,
        score: 0,
        startedAt: '2026-11-25T01:00:00.000Z',
        submittedAt: '2026-11-25T01:01:00.000Z',
        durationMs: 30_000,
      },
    ],
    error: null,
  }),
}));

const sampleSource = {
  questionId: 'cn408-2009-q12',
  questionContentVersion: '2009.0',
  documentSha256: 'a'.repeat(64),
  pages: [2],
  locator: 'Q12',
};

const samplePack: LearningPack = {
  id: 'learning-pack',
  schemaVersion: 1,
  version: '2026.11.20.2',
  sha256: 'd'.repeat(64),
  createdAt: '2026-11-20T00:00:00.000Z',
  concepts: [
    { id: 'co', subject: 'computer-organization', level: 'subject', name: '组成原理' },
    { id: 'co.data.integer', subject: 'computer-organization', level: 'concept', parentId: 'co', name: '整数编码、扩展与溢出' },
    { id: 'co.data.alu', subject: 'computer-organization', level: 'concept', parentId: 'co', name: 'ALU 与加减乘除' },
  ],
  mappings: [
    {
      questionId: 'cn408-2009-q12',
      questionContentVersion: '2009.0',
      subject: 'computer-organization',
      primaryConceptId: 'co.data.integer',
      conceptIds: ['co.data.integer'],
      legacyNodeIds: [],
      source: sampleSource,
      reviewStatus: 'needs-review',
    },
    {
      questionId: 'cn408-2024-q12',
      questionContentVersion: '2024.0',
      subject: 'computer-organization',
      primaryConceptId: 'co.data.integer',
      conceptIds: ['co.data.integer', 'co.data.alu'],
      legacyNodeIds: [],
      source: { ...sampleSource, questionId: 'cn408-2024-q12', questionContentVersion: '2024.0' },
      reviewStatus: 'needs-review',
    },
  ],
  cards: [
    {
      id: 'card-co-01',
      version: '1.0',
      subject: 'computer-organization',
      conceptIds: ['co.data.integer'],
      front: [{ type: 'text', text: '符号扩展规则' }],
      back: [{ type: 'text', text: '高位移入符号位' }],
      sources: [sampleSource],
      reviewStatus: 'needs-review',
    },
  ],
  articles: [
    {
      id: 'art-int',
      version: '1.0',
      conceptId: 'co.data.integer',
      subject: 'computer-organization',
      explanation: [{ type: 'text', text: '补码符号扩展保持真值不变。' }],
      workedExample: [{ type: 'text', text: '0x8009 扩至 32 位高 16 位全 1。' }],
      commonMistake: [{ type: 'text', text: '不要误填 0。' }],
      questionIds: ['cn408-2009-q12', 'cn408-2024-q12'],
      cardIds: ['card-co-01'],
      labPath: '/lab?module=signed',
      sources: [sampleSource],
      authorship: 'ai-assisted',
      reviewStatus: 'needs-review',
    },
  ],
};

vi.mock('./LazyContentRenderer', () => ({
  LazyContentRenderer: ({ blocks }: { blocks: Array<{ type: string; text?: string }> }) => (
    <div>{blocks.map((block, index) => <span key={index}>{block.text ?? block.type}</span>)}</div>
  ),
}));

describe('PracticeConceptBridge', () => {
  afterEach(cleanup);

  it('renders 4-state concept info without percentages, expands unreviewed AI short article, and falls back to concept lab on non-2009 questions', async () => {
    const user = userEvent.setup();
    const onOpenLab = vi.fn();

    render(
      <MemoryRouter>
        <LearningContext.Provider
          value={{
            ...empty,
            pack: samplePack,
            plan: null,
            loading: false,
            error: '',
            evidence: [
              {
                id: 'ev-1',
                sessionId: 'sess-1',
                questionId: 'cn408-2024-q12',
                questionContentVersion: '2024.0',
                hintsUsed: 0,
                evidenceFromStart: true,
                firstResponse: { type: 'choice', optionId: 'A' },
                activeDurationMs: 30_000,
                attemptId: 'att-wrong',
                mistakeNote: '',
                revision: 1,
                updatedAt: '2026-11-25T01:01:00.000Z',
              },
            ],
          }}
        >
          <PracticeConceptBridge question={question2024} onOpenLab={onOpenLab} />
        </LearningContext.Provider>
      </MemoryRouter>,
    );

    const region = screen.getByRole('region', { name: '关联概念与巩固' });
    expect(region).toHaveTextContent('关联概念：整数编码、扩展与溢出');
    expect(region).toHaveTextContent('练习中');
    expect(region).toHaveTextContent('已练 1 / 2 题 · 记忆卡 1 张');
    expect(region.textContent).not.toMatch(/%/);

    // Expand short explanation article and verify unreviewed AI boundary text
    await user.click(screen.getByText('展开概念短讲解：整数编码、扩展与溢出'));
    expect(screen.getByText('补码符号扩展保持真值不变。')).toBeVisible();
    expect(screen.getByText(/AI 辅助原创讲解 · 待审核/)).toBeVisible();

    // Non-2009 question falls back to concept lab (/lab?module=signed)
    await user.click(screen.getByRole('button', { name: '去概念实验验证' }));
    expect(onOpenLab).toHaveBeenCalledWith('/lab?module=signed');

    // Related cards link
    expect(screen.getByRole('link', { name: '关联记忆卡（1 张）' })).toHaveAttribute('href', '/review?concept=co.data.integer');

    // Multi-concept tab switches to secondary concept cleanly
    await user.click(screen.getByRole('button', { name: 'ALU 与加减乘除' }));
    expect(region).toHaveTextContent('关联概念：ALU 与加减乘除');
    expect(region).toHaveTextContent('已练 1 / 1 题 · 记忆卡 0 张');
    expect(screen.queryByText(/展开概念短讲解/)).not.toBeInTheDocument();
  });
});
