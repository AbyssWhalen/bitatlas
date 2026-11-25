import type { CardReviewEvent, ReviewSession } from '@408os/domain';
import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CardReviewPage } from './CardReviewPage';

const learningState = vi.hoisted(() => ({
  rounds: [] as ReviewSession[],
  events: [] as CardReviewEvent[],
  error: '',
  loading: false,
}));

const rateCard = vi.hoisted(() => vi.fn());

vi.mock('../app/LearningContext', () => ({
  useLearning: () => learningState,
}));

vi.mock('../app/storage', () => ({
  storage: {
    reviewRepository: {
      rateCard,
    },
  },
}));

vi.mock('../components/LazyContentRenderer', () => ({
  LazyContentRenderer: ({ blocks }: { blocks: Array<{ type: string; text?: string; alt?: string }> }) => (
    <>
      {blocks.map((block, index) => (
        block.type === 'image'
          ? <img key={index} src="data:image/gif;base64,R0lGODlhAQABAAAAACw=" alt={block.alt ?? '卡片图'} />
          : <span key={index}>{block.text ?? block.type}</span>
      ))}
    </>
  ),
}));

const activeRound: ReviewSession = {
  id: 'round-1',
  cards: [
    {
      id: 'card-queue',
      version: '1.0',
      subject: 'data-structures',
      conceptIds: ['ds.foundations.queue'],
      front: [{ type: 'text', text: '循环队列判满的常见条件是什么？' }],
      back: [{ type: 'text', text: '(rear + 1) % maxSize == front' }],
      sources: [
        {
          questionId: 'cn408-2009-q01',
          questionContentVersion: '2009.0-draft.2',
          documentSha256: 'a'.repeat(64),
          pages: [1],
          locator: '第 1 页',
        },
      ],
      reviewStatus: 'needs-review',
    },
    {
      id: 'card-cache',
      version: '1.0',
      subject: 'computer-organization',
      conceptIds: ['co.memory.cache'],
      front: [{ type: 'text', text: '组相联映射的地址划分由哪三部分组成？' }],
      back: [{ type: 'text', text: '标记（Tag）、组号（Index）、块内偏移（Offset）' }],
      sources: [],
      reviewStatus: 'needs-review',
    },
  ],
  queue: ['card-queue', 'card-cache'],
  cursor: 0,
  completedCardIds: [],
  revision: 1,
  startedAt: '2026-11-23T00:00:00.000Z',
  updatedAt: '2026-11-23T00:00:00.000Z',
};

function renderCardReview(roundId = 'round-1') {
  return render(
    <MemoryRouter initialEntries={[`/review/cards/${roundId}`]}>
      <Routes>
        <Route path="/review/cards/:roundId" element={<CardReviewPage />} />
        <Route path="/review" element={<h1>复习中心</h1>} />
        <Route path="/" element={<h1>今日学习</h1>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('CardReviewPage reading layer and keyboard flow', () => {
  afterEach(cleanup);

  beforeEach(() => {
    vi.clearAllMocks();
    learningState.rounds = [activeRound];
    learningState.events = [];
    learningState.error = '';
    learningState.loading = false;
    rateCard.mockImplementation(async (_id: string, revision: number, rating: 0 | 0.5 | 1) => ({
      ...activeRound,
      cursor: 1,
      completedCardIds: rating === 1 ? ['card-queue'] : [],
      queue: rating < 1 ? ['card-queue', 'card-cache', 'card-queue'] : activeRound.queue,
      revision: revision + 1,
    }));
  });

  it('keeps recall-first order and disables 1/2/3 shortcuts before the back is revealed', async () => {
    renderCardReview();

    expect(screen.getByText('循环队列判满的常见条件是什么？')).toBeVisible();
    expect(screen.queryByText('(rear + 1) % maxSize == front')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^忘记$/u })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^模糊$/u })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^记得$/u })).not.toBeInTheDocument();

    fireEvent.keyDown(window, { key: '1' });
    fireEvent.keyDown(window, { key: '2' });
    fireEvent.keyDown(window, { key: '3' });
    expect(rateCard).not.toHaveBeenCalled();

    fireEvent.keyDown(window, { key: ' ' });
    expect(await screen.findByText('(rear + 1) % maxSize == front')).toBeVisible();
    expect(screen.getByRole('button', { name: /^忘记$/u })).toBeEnabled();
    expect(screen.getByRole('button', { name: /^模糊$/u })).toBeEnabled();
    expect(screen.getByRole('button', { name: /^记得$/u })).toBeEnabled();
  });

  it('rates cards via keyboard 1/2/3 only when revealed and ignores editable/IME/modifier events', async () => {
    renderCardReview();

    // Modifier keys should not reveal
    fireEvent.keyDown(window, { key: 'Enter', ctrlKey: true });
    expect(screen.queryByRole('button', { name: /^记得$/u })).not.toBeInTheDocument();

    // IME composing should not reveal
    fireEvent.keyDown(window, { key: 'Enter', isComposing: true });
    expect(screen.queryByRole('button', { name: /^记得$/u })).not.toBeInTheDocument();

    // Reveal with Enter
    fireEvent.keyDown(window, { key: 'Enter' });
    expect(await screen.findByRole('button', { name: /^记得$/u })).toBeVisible();

    // Editable target should ignore '3'
    const input = document.createElement('input');
    document.body.appendChild(input);
    fireEvent.keyDown(input, { key: '3' });
    expect(rateCard).not.toHaveBeenCalled();
    input.remove();

    // Modifier key should ignore '3'
    fireEvent.keyDown(window, { key: '3', metaKey: true });
    expect(rateCard).not.toHaveBeenCalled();

    // Valid '3' submits rating 1 and advances to next card unrevealed
    fireEvent.keyDown(window, { key: '3' });
    await waitFor(() => expect(rateCard).toHaveBeenCalledWith('round-1', 1, 1, expect.any(Number), expect.any(String)));
    expect(await screen.findByText('组相联映射的地址划分由哪三部分组成？')).toBeVisible();
    expect(screen.queryByRole('button', { name: /^记得$/u })).not.toBeInTheDocument();
  });

  it('supports click rating for 忘记 (0) and 模糊 (0.5) via exact accessible button names', async () => {
    const user = userEvent.setup();
    renderCardReview();

    await user.click(screen.getByRole('button', { name: '查看解释' }));
    await user.click(screen.getByRole('button', { name: /^模糊$/u }));

    await waitFor(() => expect(rateCard).toHaveBeenCalledWith('round-1', 1, 0.5, expect.any(Number), expect.any(String)));
  });

  it('renders completed summary when the round is finished', () => {
    learningState.rounds = [
      {
        ...activeRound,
        completedCardIds: ['card-queue', 'card-cache'],
        completedAt: '2026-11-23T00:05:00.000Z',
      },
    ];
    learningState.events = [
      {
        id: 'ev-1',
        sessionId: 'round-1',
        cardId: 'card-queue',
        cardVersion: '1.0',
        rating: 0.5,
        ordinal: 1,
        queueIndex: 0,
        reviewedAt: '2026-11-23T00:01:00.000Z',
        activeDurationMs: 1200,
      },
      {
        id: 'ev-2',
        sessionId: 'round-1',
        cardId: 'card-cache',
        cardVersion: '1.0',
        rating: 1,
        ordinal: 1,
        queueIndex: 1,
        reviewedAt: '2026-11-23T00:02:00.000Z',
        activeDurationMs: 900,
      },
    ];

    renderCardReview();

    expect(screen.getByRole('heading', { name: '本轮复习总结' })).toBeVisible();
    expect(screen.getByText(/1 张出现过“忘记”或“模糊”/)).toBeVisible();
    expect(screen.getByRole('link', { name: '回到今日任务 →' })).toBeVisible();
  });
});
