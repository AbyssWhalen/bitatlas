import '@testing-library/jest-dom/vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import {
  emptyContentReviewChecks,
  type ContentPackManifest,
  type ContentReviewRecord,
  type Question,
  type StudySession,
} from '@408os/domain';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { StudyProvider, useStudy } from './StudyContext';

const storageMocks = vi.hoisted(() => ({
  installLocalContent: vi.fn(async () => undefined),
  listPacks: vi.fn(),
  listQuestions: vi.fn(),
  listKnowledgePoints: vi.fn(async () => []),
  listAssets: vi.fn(async () => []),
  getQuestion: vi.fn(),
  listAttempts: vi.fn(async () => []),
  listProgress: vi.fn(async () => []),
  saveSession: vi.fn<(
    session: StudySession,
    expectedUpdatedAt: string | null,
  ) => Promise<void>>(async () => undefined),
  submitAttempt: vi.fn<(
    attempt: unknown,
    session: StudySession,
    expectedUpdatedAt: string | null,
  ) => Promise<void>>(async () => undefined),
  listCollections: vi.fn(async () => []),
  listNotes: vi.fn(async () => []),
  listReviews: vi.fn(),
  getReview: vi.fn(),
  saveReview: vi.fn(),
  approveReview: vi.fn(),
  rejectReview: vi.fn(),
  listMockExams: vi.fn(async () => []),
  subscribeMockExams: vi.fn((onValue: (value: unknown[]) => void = () => undefined) => {
    void onValue;
    return () => undefined;
  }),
}));

vi.mock('./storage', () => ({
  installLocalContent: storageMocks.installLocalContent,
  installVerifiedContentPack: vi.fn(),
  isLocalContentUnavailableError: (reason: unknown) => (
    reason instanceof Error && reason.name === 'LocalContentUnavailableError'
  ),
  storage: {
    contentRepository: {
      listPacks: storageMocks.listPacks,
      listQuestions: storageMocks.listQuestions,
      listKnowledgePoints: storageMocks.listKnowledgePoints,
      listAssets: storageMocks.listAssets,
      getQuestion: storageMocks.getQuestion,
    },
    studyRepository: {
      listAttempts: storageMocks.listAttempts,
      listProgress: storageMocks.listProgress,
      saveSession: storageMocks.saveSession,
      submitAttempt: storageMocks.submitAttempt,
    },
    annotationRepository: {
      listCollections: storageMocks.listCollections,
      listNotes: storageMocks.listNotes,
    },
    contentReviewRepository: {
      list: storageMocks.listReviews,
      get: storageMocks.getReview,
      saveDraft: storageMocks.saveReview,
      approve: storageMocks.approveReview,
      reject: storageMocks.rejectReview,
    },
    mockExamRepository: {
      listExams: storageMocks.listMockExams,
      subscribeExams: storageMocks.subscribeMockExams,
    },
  },
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
  options: ['A', 'B', 'C', 'D'].map((id) => ({
    id: id as 'A' | 'B' | 'C' | 'D',
    content: [{ type: 'text' as const, text: id }],
  })),
  answer: { type: 'choice', optionId: 'A' },
  explanation: [],
  hints: [],
  knowledgePointIds: [],
  assetIds: [],
  source: { question: source, answer: source, crosschecks: [], redistribution: 'unknown' },
  contentVersion: pack.contentVersion,
  reviewStatus: 'needs-review',
};

const approvedRecord: ContentReviewRecord = {
  schemaVersion: 1,
  packId: pack.id,
  packHash: pack.sha256,
  questionId: question.id,
  questionContentVersion: question.contentVersion,
  checks: Object.fromEntries(
    Object.keys(emptyContentReviewChecks()).map((key) => [key, true]),
  ) as ContentReviewRecord['checks'],
  decision: 'approved',
  reviewer: 'reviewer',
  issueNote: '',
  createdAt: '2026-08-14T00:00:00.000Z',
  updatedAt: '2026-08-14T00:00:00.000Z',
  reviewedAt: '2026-08-14T00:00:00.000Z',
};

function ReviewCommitProbe() {
  const { loading, error, approveContentReview, reviewRecords } = useStudy();
  if (loading) return <p>loading</p>;
  if (error) return <p role="alert">{error}</p>;
  return (
    <div>
      <button
        type="button"
        onClick={() => {
          void approveContentReview(question.id, {
            checks: approvedRecord.checks,
            reviewer: approvedRecord.reviewer,
            issueNote: approvedRecord.issueNote,
          }, approvedRecord.updatedAt).then(
            (record) => document.querySelector('[data-outcome]')?.setAttribute('data-outcome', record.decision),
            () => document.querySelector('[data-outcome]')?.setAttribute('data-outcome', 'failed'),
          );
        }}
      >
        approve
      </button>
      <output data-outcome="pending" aria-label="commit outcome" />
      <output aria-label="stored decision">{reviewRecords.get(question.id)?.decision ?? 'missing'}</output>
    </div>
  );
}

function ReviewReloadProbe() {
  const { loading, error, reloadContentReviewRecord, reviewRecords } = useStudy();
  if (loading) return <p>loading</p>;
  if (error) return <p role="alert">{error}</p>;
  return (
    <div>
      <button
        type="button"
        onClick={() => {
          void reloadContentReviewRecord(question.id).then((record) => {
            const output = document.querySelector('[data-reloaded-review]');
            if (output) output.textContent = record?.decision ?? 'missing';
          });
        }}
      >
        reload review
      </button>
      <output data-reloaded-review aria-label="reloaded review" />
      <output aria-label="reloaded stored decision">{reviewRecords.get(question.id)?.decision ?? 'missing'}</output>
    </div>
  );
}

function MockListProbe() {
  const { loading, mockExams } = useStudy();
  if (loading) return <p>loading</p>;
  return <output aria-label="mock list">{mockExams.map((exam) => exam.id).join(',')}</output>;
}

function BootstrapProbe() {
  const { loading, error, packs, questions } = useStudy();
  if (loading) return <p>loading</p>;
  return (
    <div>
      <output aria-label="bootstrap error">{error ?? 'none'}</output>
      <output aria-label="installed packs">{packs.length}</output>
      <output aria-label="loaded questions">{questions.length}</output>
    </div>
  );
}

const studySession: StudySession = {
  id: 'study-session-cas',
  mode: 'practice',
  questionIds: [question.id],
  questionContentVersions: { [question.id]: question.contentVersion },
  currentIndex: 0,
  responses: {},
  submittedQuestionIds: [],
  startedAt: '2026-08-17T00:00:00.000Z',
  updatedAt: '2026-08-17T00:00:10.000Z',
};

function SessionWriteProbe() {
  const {
    loading,
    error,
    saveResponse,
    submitResponse,
    moveSession,
    finishSession,
  } = useStudy();
  if (loading) return <p>loading</p>;
  if (error) return <p role="alert">{error}</p>;
  return (
    <div>
      <button
        type="button"
        onClick={() => {
          void Promise.all([
            saveResponse(studySession, question.id, { type: 'choice', optionId: 'A' }),
            submitResponse(studySession, question, { type: 'choice', optionId: 'A' }, 1_000),
            moveSession(studySession, 0),
            finishSession(studySession),
          ]).then((sessions) => {
            const output = document.querySelector('[data-session-updates]');
            if (output) output.textContent = sessions.map((session) => session.updatedAt).join(',');
          });
        }}
      >
        write session
      </button>
      <output data-session-updates aria-label="session updates" />
    </div>
  );
}

describe('StudyProvider content review commits', () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    vi.clearAllMocks();
  });

  it('keeps the code-only app usable when the local 2009 pack is absent', async () => {
    const missingPack = new Error('本地 2009 题包不可用，请先运行内容生成命令。');
    missingPack.name = 'LocalContentUnavailableError';
    storageMocks.installLocalContent.mockRejectedValueOnce(missingPack);
    storageMocks.listPacks.mockResolvedValue([]);
    storageMocks.listQuestions.mockResolvedValue([]);
    storageMocks.listReviews.mockResolvedValue([]);

    render(<StudyProvider><BootstrapProbe /></StudyProvider>);

    expect(await screen.findByLabelText('bootstrap error')).toHaveTextContent('none');
    expect(screen.getByLabelText('installed packs')).toHaveTextContent('0');
    expect(screen.getByLabelText('loaded questions')).toHaveTextContent('0');
    expect(storageMocks.listAttempts).toHaveBeenCalledOnce();
    expect(storageMocks.listCollections).toHaveBeenCalledOnce();
  });

  it('keeps a durable approval successful when a following repository refresh fails', async () => {
    storageMocks.listPacks.mockResolvedValue([pack]);
    storageMocks.listQuestions.mockResolvedValue([question]);
    storageMocks.getQuestion.mockResolvedValue(question);
    storageMocks.listReviews
      .mockResolvedValueOnce([])
      .mockRejectedValueOnce(new Error('refresh failed'));
    storageMocks.approveReview.mockResolvedValue(approvedRecord);

    render(<StudyProvider><ReviewCommitProbe /></StudyProvider>);
    fireEvent.click(await screen.findByRole('button', { name: 'approve' }));

    await waitFor(() => expect(screen.getByLabelText('commit outcome')).toHaveAttribute('data-outcome', 'approved'));
    expect(screen.getByLabelText('stored decision')).toHaveTextContent('approved');
    expect(storageMocks.approveReview).toHaveBeenCalledTimes(1);
    expect(storageMocks.approveReview.mock.calls[0]![2]).toBe(approvedRecord.updatedAt);
  });

  it('passes the review token and advances it monotonically when the clock moves backwards', async () => {
    storageMocks.listPacks.mockResolvedValue([pack]);
    storageMocks.listQuestions.mockResolvedValue([question]);
    storageMocks.getQuestion.mockResolvedValue(question);
    storageMocks.listReviews.mockResolvedValue([]);
    storageMocks.approveReview.mockResolvedValue({
      ...approvedRecord,
      updatedAt: '2026-08-14T00:00:00.001Z',
      reviewedAt: '2026-08-14T00:00:00.001Z',
    });
    vi.spyOn(Date, 'now').mockReturnValue(Date.parse(approvedRecord.updatedAt) - 1_000);

    render(<StudyProvider><ReviewCommitProbe /></StudyProvider>);
    fireEvent.click(await screen.findByRole('button', { name: 'approve' }));

    await waitFor(() => expect(screen.getByLabelText('commit outcome')).toHaveAttribute('data-outcome', 'approved'));
    expect(storageMocks.approveReview.mock.calls[0]![1]).toBe('2026-08-14T00:00:00.001Z');
    expect(storageMocks.approveReview.mock.calls[0]![2]).toBe(approvedRecord.updatedAt);
  });

  it('reloads one authoritative review record with the installed pack scope', async () => {
    storageMocks.listPacks.mockResolvedValue([pack]);
    storageMocks.listQuestions.mockResolvedValue([question]);
    storageMocks.getQuestion.mockResolvedValue(question);
    storageMocks.listReviews.mockResolvedValue([]);
    storageMocks.getReview.mockResolvedValue(approvedRecord);

    render(<StudyProvider><ReviewReloadProbe /></StudyProvider>);
    fireEvent.click(await screen.findByRole('button', { name: 'reload review' }));

    await waitFor(() => expect(screen.getByLabelText('reloaded review')).toHaveTextContent('approved'));
    expect(screen.getByLabelText('reloaded stored decision')).toHaveTextContent('approved');
    expect(storageMocks.getReview).toHaveBeenCalledWith({
      packId: pack.id,
      packHash: pack.sha256,
      contentVersion: pack.contentVersion,
    }, question.id);
  });

  it('refreshes the mock list from the repository subscription', async () => {
    storageMocks.listPacks.mockResolvedValue([pack]);
    storageMocks.listQuestions.mockResolvedValue([question]);
    storageMocks.listReviews.mockResolvedValue([]);
    let emit!: (value: unknown[]) => void;
    storageMocks.subscribeMockExams.mockImplementationOnce((onValue?: (value: unknown[]) => void) => {
      emit = onValue ?? (() => undefined);
      return () => undefined;
    });

    render(<StudyProvider><MockListProbe /></StudyProvider>);
    expect(await screen.findByLabelText('mock list')).toHaveTextContent('');

    await act(async () => {
      emit([{ id: 'exam-from-peer' }]);
    });
    expect(screen.getByLabelText('mock list')).toHaveTextContent('exam-from-peer');
  });

  it('passes the previous session token to every write and advances time monotonically', async () => {
    storageMocks.listPacks.mockResolvedValue([pack]);
    storageMocks.listQuestions.mockResolvedValue([question]);
    storageMocks.listReviews.mockResolvedValue([]);
    vi.spyOn(Date, 'now').mockReturnValue(Date.parse(studySession.updatedAt) - 1_000);

    render(<StudyProvider><SessionWriteProbe /></StudyProvider>);
    fireEvent.click(await screen.findByRole('button', { name: 'write session' }));

    const expectedNext = '2026-08-17T00:00:10.001Z';
    await waitFor(() => expect(screen.getByLabelText('session updates')).toHaveTextContent(
      [expectedNext, expectedNext, expectedNext, expectedNext].join(','),
    ));
    expect(storageMocks.saveSession).toHaveBeenCalledTimes(3);
    for (const [next, expectedUpdatedAt] of storageMocks.saveSession.mock.calls) {
      expect(expectedUpdatedAt).toBe(studySession.updatedAt);
      expect(next.updatedAt).toBe(expectedNext);
    }
    expect(storageMocks.submitAttempt).toHaveBeenCalledOnce();
    expect(storageMocks.submitAttempt.mock.calls[0]![1].updatedAt).toBe(expectedNext);
    expect(storageMocks.submitAttempt.mock.calls[0]![2]).toBe(studySession.updatedAt);
  });
});
