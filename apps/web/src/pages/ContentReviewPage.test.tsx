import '@testing-library/jest-dom/vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { emptyContentReviewChecks, type ContentPackManifest, type ContentReviewRecord, type Question } from '@408os/domain';
import { ContentReviewConflictError } from '@408os/storage';
import { ContentReviewPage } from './ContentReviewPage';

const saveContentReviewDraft = vi.fn();
const approveContentReview = vi.fn(async () => ({ decision: 'approved' }));
const rejectContentReview = vi.fn();
const reloadContentReviewRecord = vi.fn<(
  questionId: string,
) => Promise<ContentReviewRecord | undefined>>(async () => undefined);
let contentAvailable = true;

vi.mock('../app/StudyContext', () => ({
  useStudy: () => ({
    loading: false,
    error: null,
    packs: contentAvailable ? [pack] : [],
    questions: contentAvailable ? questions : [],
    assets: new Map(),
    reviewRecords,
    reviewSummary: { total: 3, approved: 1, rejected: 1, pending: 1, stale: 0 },
    saveContentReviewDraft,
    approveContentReview,
    rejectContentReview,
    reloadContentReviewRecord,
    exportContentReviewLedger: vi.fn(),
  }),
}));

const source = {
  publisher: 'source',
  title: 'source.pdf',
  url: 'https://example.com/source.pdf',
  fileName: 'source.pdf',
  sha256: 'a'.repeat(64),
  pages: [1],
  locator: 'page 1',
};

const pack: ContentPackManifest = {
  id: 'cn408-2009',
  schemaVersion: 1,
  contentVersion: '2009.1',
  title: '2009',
  year: 2009,
  questionCount: 47,
  createdAt: '2026-08-05T00:00:00.000Z',
  sha256: 'b'.repeat(64),
  reviewStatus: 'needs-review',
};

const question: Question = {
  id: 'cn408-2009-q01',
  year: 2009,
  number: 1,
  subject: 'data-structures',
  kind: 'single-choice',
  stem: [{ type: 'text', text: 'test stem' }],
  options: ['A', 'B', 'C', 'D'].map((id) => ({ id: id as 'A' | 'B' | 'C' | 'D', content: [{ type: 'text' as const, text: id }] })),
  answer: { type: 'choice', optionId: 'A' },
  explanation: [],
  hints: [],
  knowledgePointIds: [],
  assetIds: [],
  source: { question: source, answer: source, crosschecks: [], redistribution: 'unknown' },
  contentVersion: '2009.1',
  reviewStatus: 'needs-review',
};

const questions: Question[] = [
  question,
  { ...question, id: 'cn408-2009-q02', number: 2 },
  { ...question, id: 'cn408-2009-q03', number: 3 },
];

const reviewedAt = '2026-08-13T00:00:00.000Z';
const completeChecks = Object.fromEntries(
  Object.keys(emptyContentReviewChecks()).map((key) => [key, true]),
) as ContentReviewRecord['checks'];
const reviewRecords = new Map<string, ContentReviewRecord>([
  [questions[0]!.id, {
    schemaVersion: 1 as const,
    packId: pack.id,
    packHash: pack.sha256,
    questionId: questions[0]!.id,
    questionContentVersion: questions[0]!.contentVersion,
    checks: completeChecks,
    decision: 'approved' as const,
    reviewer: 'reviewer',
    issueNote: '',
    createdAt: reviewedAt,
    updatedAt: reviewedAt,
    reviewedAt,
  }],
  [questions[1]!.id, {
    schemaVersion: 1 as const,
    packId: pack.id,
    packHash: pack.sha256,
    questionId: questions[1]!.id,
    questionContentVersion: questions[1]!.contentVersion,
    checks: emptyContentReviewChecks(),
    decision: 'rejected' as const,
    reviewer: 'reviewer',
    issueNote: 'source conflict',
    createdAt: reviewedAt,
    updatedAt: reviewedAt,
    reviewedAt,
  }],
]);

function LocationProbe() {
  const location = useLocation();
  return <output aria-label="current search">{location.search}</output>;
}

function renderPage(path = '/review/2009?question=1') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/review/2009" element={<ContentReviewPage />} />
      </Routes>
      <LocationProbe />
    </MemoryRouter>,
  );
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((nextResolve, nextReject) => {
    resolve = nextResolve;
    reject = nextReject;
  });
  return { promise, reject, resolve };
}

describe('ContentReviewPage write ordering', () => {
  afterEach(() => {
    cleanup();
    contentAvailable = true;
    vi.useRealTimers();
    vi.clearAllMocks();
    saveContentReviewDraft.mockReset();
    approveContentReview.mockReset();
    approveContentReview.mockResolvedValue({ decision: 'approved' });
    rejectContentReview.mockReset();
    reloadContentReviewRecord.mockReset();
    reloadContentReviewRecord.mockResolvedValue(undefined);
  });

  it('keeps a missing local pack as a recoverable public-repository state', () => {
    contentAvailable = false;
    const view = renderPage('/review/2009');

    expect(screen.getByRole('heading', { name: '本地 2009 题包未安装' })).toBeVisible();
    expect(screen.getByRole('link', { name: '返回总览' })).toHaveAttribute('href', '/');
    expect(screen.getByRole('link', { name: '进入实验' })).toHaveAttribute('href', '/lab');
    expect(screen.getByRole('link', { name: '打开数据设置' })).toHaveAttribute('href', '/settings');
    expect(view.container.querySelector('.fatal-state')).not.toBeInTheDocument();
  });

  it('waits for an in-flight draft before committing approval', async () => {
    vi.useFakeTimers();
    const draftWrite = deferred<unknown>();
    saveContentReviewDraft.mockReturnValueOnce(draftWrite.promise);
    renderPage('/review/2009?question=3');

    fireEvent.click(screen.getByRole('tab', { name: '核对' }));
    for (const checkbox of screen.getAllByRole('checkbox')) fireEvent.click(checkbox);
    fireEvent.change(screen.getByLabelText('复核人'), { target: { value: 'reviewer' } });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(650);
    });
    expect(saveContentReviewDraft).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: '通过复核' }));
    await act(async () => { await Promise.resolve(); });
    expect(approveContentReview).not.toHaveBeenCalled();

    await act(async () => {
      draftWrite.resolve({ decision: 'pending' });
      await draftWrite.promise;
      await Promise.resolve();
    });
    expect(approveContentReview).toHaveBeenCalledTimes(1);
    expect(document.querySelector('.review-save-status')).toHaveTextContent('已通过复核');
  });

  it('freezes question navigation and draft editing while a decision is being committed', async () => {
    const decisionWrite = deferred<{ decision: 'approved' }>();
    approveContentReview.mockReturnValueOnce(decisionWrite.promise);
    renderPage('/review/2009?question=3');

    fireEvent.click(screen.getByRole('tab', { name: '核对' }));
    for (const checkbox of screen.getAllByRole('checkbox')) fireEvent.click(checkbox);
    fireEvent.change(screen.getByLabelText('复核人'), { target: { value: 'reviewer' } });
    fireEvent.click(screen.getByRole('button', { name: '通过复核' }));

    expect(screen.getByRole('button', { name: '下一道待复核' })).toBeDisabled();
    expect(screen.getByRole('button', { name: '第 1 题' })).toBeDisabled();
    expect(screen.getByRole('button', { name: '上一题' })).toBeDisabled();
    expect(screen.getByRole('button', { name: '下一题' })).toBeDisabled();
    for (const checkbox of screen.getAllByRole('checkbox')) expect(checkbox).toBeDisabled();
    expect(screen.getByLabelText('复核人')).toBeDisabled();
    expect(screen.getByLabelText('问题记录')).toBeDisabled();

    await act(async () => {
      decisionWrite.resolve({ decision: 'approved' });
      await decisionWrite.promise;
    });
    expect(screen.getByRole('button', { name: '上一题' })).toBeEnabled();
  });

  it('does not enqueue an unload draft behind an in-flight decision', async () => {
    const decisionWrite = deferred<{ decision: 'approved' }>();
    approveContentReview.mockReturnValueOnce(decisionWrite.promise);
    const view = renderPage('/review/2009?question=3');

    fireEvent.click(screen.getByRole('tab', { name: '核对' }));
    for (const checkbox of screen.getAllByRole('checkbox')) fireEvent.click(checkbox);
    fireEvent.change(screen.getByLabelText('复核人'), { target: { value: 'reviewer' } });
    fireEvent.click(screen.getByRole('button', { name: '通过复核' }));
    await act(async () => { await Promise.resolve(); });
    expect(approveContentReview).toHaveBeenCalledTimes(1);

    view.unmount();
    await act(async () => {
      decisionWrite.resolve({ decision: 'approved' });
      await decisionWrite.promise;
      await Promise.resolve();
    });
    expect(saveContentReviewDraft).not.toHaveBeenCalled();
  });

  it('uses the token returned by an earlier queued draft for a later same-tab save', async () => {
    const firstWrite = deferred<ContentReviewRecord>();
    const firstRecord: ContentReviewRecord = {
      schemaVersion: 1,
      packId: pack.id,
      packHash: pack.sha256,
      questionId: questions[2]!.id,
      questionContentVersion: questions[2]!.contentVersion,
      checks: emptyContentReviewChecks(),
      decision: 'pending',
      reviewer: 'same-tab',
      issueNote: '',
      createdAt: '2026-08-13T00:00:01.000Z',
      updatedAt: '2026-08-13T00:00:01.000Z',
    };
    saveContentReviewDraft
      .mockReturnValueOnce(firstWrite.promise)
      .mockResolvedValueOnce({ ...firstRecord, updatedAt: '2026-08-13T00:00:02.000Z' });
    renderPage('/review/2009?question=3');

    fireEvent.click(screen.getByRole('tab', { name: '核对' }));
    fireEvent.change(screen.getByLabelText('复核人'), { target: { value: 'same-tab' } });
    fireEvent.click(screen.getByRole('button', { name: '保存草稿' }));
    fireEvent.click(screen.getByRole('button', { name: '保存草稿' }));
    await waitFor(() => expect(saveContentReviewDraft).toHaveBeenCalledTimes(1));
    expect(saveContentReviewDraft.mock.calls[0]![2]).toBeNull();

    await act(async () => {
      firstWrite.resolve(firstRecord);
      await firstWrite.promise;
    });

    await waitFor(() => expect(saveContentReviewDraft).toHaveBeenCalledTimes(2));
    expect(saveContentReviewDraft.mock.calls[1]![2]).toBe(firstRecord.updatedAt);
    expect(screen.queryByRole('alert', { name: '复核记录冲突' })).not.toBeInTheDocument();
  });

  it('does not report a queued decision as committed when the in-flight draft conflicts first', async () => {
    const draftWrite = deferred<ContentReviewRecord>();
    saveContentReviewDraft.mockReturnValueOnce(draftWrite.promise);
    renderPage('/review/2009?question=3');

    fireEvent.click(screen.getByRole('tab', { name: '核对' }));
    for (const checkbox of screen.getAllByRole('checkbox')) fireEvent.click(checkbox);
    fireEvent.change(screen.getByLabelText('复核人'), { target: { value: 'tab-b-stale' } });
    fireEvent.click(screen.getByRole('button', { name: '保存草稿' }));
    await waitFor(() => expect(saveContentReviewDraft).toHaveBeenCalledTimes(1));
    fireEvent.click(screen.getByRole('button', { name: '通过复核' }));

    await act(async () => {
      draftWrite.reject(new ContentReviewConflictError());
      await draftWrite.promise.catch(() => undefined);
    });

    expect(approveContentReview).not.toHaveBeenCalled();
    expect(screen.getByRole('alert', { name: '复核记录冲突' })).toBeVisible();
    expect(screen.getByLabelText('复核人')).toHaveValue('tab-b-stale');
    expect(screen.getByRole('status', { name: '复核记录保存状态' })).not.toHaveTextContent('已通过复核');
  });

  it('filters the question palette by review decision and jumps to the next pending question', async () => {
    renderPage();

    expect(screen.getByRole('button', { name: '全部 3' })).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(screen.getByRole('button', { name: '待复核 1' }));

    expect(screen.getByLabelText('current search')).toHaveTextContent('?question=1&status=pending');
    expect(screen.queryByRole('button', { name: '第 1 题' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '第 2 题' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: '第 3 题' })).toBeVisible();

    fireEvent.click(screen.getByRole('button', { name: '下一道待复核' }));
    expect(screen.getByLabelText('current search')).toHaveTextContent('?question=3&status=pending');
    expect(screen.getByText('3 / 47')).toBeVisible();
  });

  it('freezes a stale draft and only explicit authority reload clears the local overlay', async () => {
    saveContentReviewDraft.mockRejectedValueOnce(new ContentReviewConflictError());
    reloadContentReviewRecord.mockResolvedValueOnce(reviewRecords.get(questions[0]!.id));
    renderPage('/review/2009?question=1');

    fireEvent.click(screen.getByRole('tab', { name: '核对' }));
    fireEvent.change(screen.getByLabelText('复核人'), { target: { value: 'tab-b-stale' } });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: '保存草稿' }));
      await Promise.resolve();
    });

    expect(screen.getByRole('alert', { name: '复核记录冲突' })).toHaveTextContent('不会覆盖权威复核记录');
    expect(screen.getByText('当前记录').closest('.review-decision')).toHaveTextContent('待重新读取');
    expect(screen.getByLabelText('复核人')).toHaveValue('tab-b-stale');
    expect(screen.getByLabelText('复核人')).toBeDisabled();
    expect(screen.getByRole('button', { name: '下一题' })).toBeDisabled();
    expect(saveContentReviewDraft).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: '重新读取最新复核记录' }));
    await act(async () => { await Promise.resolve(); });

    expect(reloadContentReviewRecord).toHaveBeenCalledWith(questions[0]!.id);
    expect(screen.getByLabelText('复核人')).toHaveValue('reviewer');
    expect(screen.getByLabelText('复核人')).toBeEnabled();
    expect(screen.queryByRole('button', { name: '重新读取最新复核记录' })).not.toBeInTheDocument();
    expect(screen.getByRole('status', { name: '复核记录保存状态' })).toHaveTextContent('已重新读取最新复核记录');
    expect(saveContentReviewDraft).toHaveBeenCalledTimes(1);
  });

  it('freezes decision writes on a typed conflict and keeps the authority reload path available', async () => {
    approveContentReview.mockRejectedValueOnce(new ContentReviewConflictError());
    renderPage('/review/2009?question=1');

    fireEvent.click(screen.getByRole('tab', { name: '核对' }));
    fireEvent.click(screen.getByRole('button', { name: '通过复核' }));
    await act(async () => { await Promise.resolve(); });

    expect(screen.getByRole('alert', { name: '复核记录冲突' })).toHaveTextContent('不会覆盖权威复核记录');
    expect(screen.getByRole('button', { name: '通过复核' })).toBeDisabled();
    expect(screen.getByRole('button', { name: '重新读取最新复核记录' })).toBeEnabled();
    expect(approveContentReview).toHaveBeenCalledTimes(1);
  });

  it('stays frozen with the local draft intact when authority reload fails', async () => {
    saveContentReviewDraft.mockRejectedValueOnce(new ContentReviewConflictError());
    reloadContentReviewRecord.mockRejectedValueOnce(new Error('authority unavailable'));
    renderPage('/review/2009?question=1');

    fireEvent.click(screen.getByRole('tab', { name: '核对' }));
    fireEvent.change(screen.getByLabelText('复核人'), { target: { value: 'keep-local-draft' } });
    fireEvent.click(screen.getByRole('button', { name: '保存草稿' }));
    await waitFor(() => expect(screen.getByRole('alert', { name: '复核记录冲突' })).toBeVisible());

    fireEvent.click(screen.getByRole('button', { name: '重新读取最新复核记录' }));
    await waitFor(() => expect(screen.getByText('authority unavailable')).toBeVisible());

    expect(screen.getByRole('alert', { name: '复核记录冲突' })).toBeVisible();
    expect(screen.getByLabelText('复核人')).toHaveValue('keep-local-draft');
    expect(screen.getByLabelText('复核人')).toBeDisabled();
    expect(screen.getByRole('button', { name: '重新读取最新复核记录' })).toBeEnabled();
  });
});
