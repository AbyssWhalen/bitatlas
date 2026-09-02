import {
  aggregateStats,
  createStudySession,
  evaluateResponse,
  projectCurrentQuestionProgress,
  seededShuffle,
  type AssetRef,
  summarizeContentReviews,
  type Attempt,
  type CollectionEntry,
  type ContentPackManifest,
  type ContentReviewChecks,
  type ContentReviewRecord,
  type ContentReviewSummary,
  type KnowledgePoint,
  type Mastery,
  type MockExam,
  type Note,
  type Question,
  type QuestionProgress,
  type CurrentQuestionProgress,
  type StudyMode,
  type StudySession,
  type StudyStats,
  type UserResponse,
} from '@408os/domain';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  installExtraContent,
  installLocalContent,
  installVerifiedContentPack,
  isLocalContentUnavailableError,
  storage,
} from './storage';
import type {
  CreateFixedMockExamInput,
  MockExamBundle,
  SaveMockExamDraftInput,
  SelfScoreMockExamInput,
  SubmitMockExamInput,
} from '@408os/storage';

export interface ContentReviewDraft {
  checks: ContentReviewChecks;
  reviewer: string;
  issueNote: string;
}

interface StudyContextValue {
  loading: boolean;
  error: string | null;
  contentIssues: string[];
  packs: ContentPackManifest[];
  questions: Question[];
  knowledgePoints: KnowledgePoint[];
  assets: ReadonlyMap<string, AssetRef>;
  attempts: Attempt[];
  progress: Map<string, QuestionProgress>;
  currentProgress: Map<string, CurrentQuestionProgress>;
  collections: Set<string>;
  notes: Map<string, Note>;
  stats: StudyStats;
  reviewRecords: Map<string, ContentReviewRecord>;
  reviewSummary: ContentReviewSummary;
  mockExams: MockExam[];
  reload: () => Promise<void>;
  createSession: (questionIds: string[], mode: StudyMode, shuffle?: boolean) => Promise<string>;
  getSession: (id: string) => Promise<StudySession | undefined>;
  getLatestSession: () => Promise<StudySession | undefined>;
  saveResponse: (session: StudySession, questionId: string, response: UserResponse) => Promise<StudySession>;
  submitResponse: (session: StudySession, question: Question, response: UserResponse, durationMs: number) => Promise<StudySession>;
  moveSession: (session: StudySession, index: number) => Promise<StudySession>;
  finishSession: (session: StudySession) => Promise<StudySession>;
  setMastery: (questionId: string, mastery: Mastery) => Promise<void>;
  toggleCollection: (questionId: string) => Promise<void>;
  saveNote: (questionId: string, body: string) => Promise<void>;
  saveContentReviewDraft: (questionId: string, draft: ContentReviewDraft, expectedUpdatedAt: string | null) => Promise<ContentReviewRecord>;
  approveContentReview: (questionId: string, draft: ContentReviewDraft, expectedUpdatedAt: string | null) => Promise<ContentReviewRecord>;
  rejectContentReview: (questionId: string, draft: ContentReviewDraft, expectedUpdatedAt: string | null) => Promise<ContentReviewRecord>;
  reloadContentReviewRecord: (questionId: string) => Promise<ContentReviewRecord | undefined>;
  exportContentReviewLedger: () => Promise<string>;
  exportBackup: () => Promise<string>;
  importBackup: (json: string) => Promise<void>;
  installVerifiedPack: (json: string) => Promise<void>;
  getMockExam: (id: string) => Promise<MockExamBundle | undefined>;
  subscribeMockExam: (
    id: string,
    onValue: (value: MockExamBundle | undefined) => void,
    onError?: (reason: unknown) => void,
  ) => () => void;
  getLatestMockExam: () => Promise<MockExamBundle | undefined>;
  createMockExam: (input?: Pick<CreateFixedMockExamInput, 'examId' | 'sessionId' | 'startedAt'>) => Promise<MockExamBundle>;
  saveMockExamDraft: (input: SaveMockExamDraftInput) => Promise<MockExamBundle>;
  submitMockExam: (input: Omit<SubmitMockExamInput, 'questions'>) => Promise<MockExamBundle>;
  selfScoreMockExam: (input: Omit<SelfScoreMockExamInput, 'questions'>) => Promise<MockExamBundle>;
}

const StudyContext = createContext<StudyContextValue | null>(null);

const emptyStats = aggregateStats([], new Map());
const emptyReviewSummary: ContentReviewSummary = { total: 0, approved: 0, rejected: 0, pending: 0, stale: 0 };

const reviewScope = (manifest: ContentPackManifest) => ({
  packId: manifest.id,
  packHash: manifest.sha256,
  contentVersion: manifest.contentVersion,
});

const find2009Manifest = (packs: readonly ContentPackManifest[]) => {
  const manifest = packs.find((pack) => pack.year === 2009);
  if (!manifest) throw new Error('未找到 2009 内容包，无法读取或保存人工复核记录。');
  return manifest;
};

function nextStudySessionTimestamp(previous: string): string {
  const previousMs = Date.parse(previous);
  if (!Number.isFinite(previousMs)) throw new Error('Study session update time is invalid.');
  return new Date(Math.max(Date.now(), previousMs + 1)).toISOString();
}

function nextContentReviewTimestamp(previous: string | null): string {
  return previous ? nextStudySessionTimestamp(previous) : new Date().toISOString();
}

export function StudyProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [contentIssues, setContentIssues] = useState<string[]>([]);
  const [packs, setPacks] = useState<ContentPackManifest[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [knowledgePoints, setKnowledgePoints] = useState<KnowledgePoint[]>([]);
  const [assetEntries, setAssetEntries] = useState<AssetRef[]>([]);
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [progressEntries, setProgressEntries] = useState<QuestionProgress[]>([]);
  const [collectionEntries, setCollectionEntries] = useState<CollectionEntry[]>([]);
  const [noteEntries, setNoteEntries] = useState<Note[]>([]);
  const [reviewEntries, setReviewEntries] = useState<ContentReviewRecord[]>([]);
  const [mockExams, setMockExams] = useState<MockExam[]>([]);

  const reload = useCallback(async () => {
    const [
      nextPacks,
      nextQuestions,
      nextKnowledgePoints,
      nextAssets,
      nextAttempts,
      nextProgress,
      nextCollections,
      nextNotes,
    ] = await Promise.all([
      storage.contentRepository.listPacks(),
      storage.contentRepository.listQuestions(),
      storage.contentRepository.listKnowledgePoints(),
      storage.contentRepository.listAssets(),
      storage.studyRepository.listAttempts(),
      storage.studyRepository.listProgress(),
      storage.annotationRepository.listCollections(),
      storage.annotationRepository.listNotes(),
    ]);
    const manifest = nextPacks.find((pack) => pack.year === 2009);
    const nextReviews = manifest
      ? await storage.contentReviewRepository.list(reviewScope(manifest))
      : [];
    setPacks(nextPacks);
    setQuestions(nextQuestions);
    setKnowledgePoints(nextKnowledgePoints);
    setAssetEntries(nextAssets);
    setAttempts(nextAttempts);
    setProgressEntries(nextProgress);
    setCollectionEntries(nextCollections);
    setNoteEntries(nextNotes);
    setReviewEntries(nextReviews);
    if (storage.mockExamRepository) {
      setMockExams(await storage.mockExamRepository.listExams());
    }
  }, []);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        await installLocalContent();
      } catch (reason) {
        if (active && !isLocalContentUnavailableError(reason)) {
          if (active) setError(reason instanceof Error ? reason.message : '初始化失败');
          setLoading(false);
          return;
        }
        // 显式 HTTP 缺失：进入空内容模式，同时仍尝试安装可选扩展年份。
      }
      try {
        const issues = await installExtraContent();
        if (active) setContentIssues(issues);
        if (active) await reload();
      } catch (reason) {
        if (active) setError(reason instanceof Error ? reason.message : '初始化失败');
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [reload]);

  useEffect(() => storage.mockExamRepository.subscribeExams(setMockExams), []);

  const progress = useMemo(() => {
    const currentVersions = new Map(questions.map((question) => [question.id, question.contentVersion]));
    return new Map(
      progressEntries
        .filter((entry) => currentVersions.get(entry.questionId) === entry.questionContentVersion)
        .map((entry) => [entry.questionId, entry]),
    );
  }, [progressEntries, questions]);
  const currentProgress = useMemo(
    () => projectCurrentQuestionProgress(attempts, questions),
    [attempts, questions],
  );
  const assets = useMemo(() => new Map(assetEntries.map((entry) => [entry.id, entry])), [assetEntries]);
  const collections = useMemo(() => new Set(collectionEntries.map((entry) => entry.questionId)), [collectionEntries]);
  const notes = useMemo(() => new Map(noteEntries.map((entry) => [entry.questionId, entry])), [noteEntries]);
  const reviewRecords = useMemo(() => new Map(reviewEntries.map((entry) => [entry.questionId, entry])), [reviewEntries]);
  const reviewSummary = useMemo(() => {
    const manifest = packs.find((pack) => pack.year === 2009);
    if (!manifest) return emptyReviewSummary;
    return summarizeContentReviews(
      questions.filter((question) => question.year === 2009),
      reviewRecords,
      manifest,
    );
  }, [packs, questions, reviewRecords]);
  const stats = useMemo(
    () => (questions.length ? aggregateStats(attempts, new Map(questions.map((question) => [question.id, question]))) : emptyStats),
    [attempts, questions],
  );

  const createSession = useCallback(async (questionIds: string[], mode: StudyMode, shuffle = false) => {
    const timestamp = new Date().toISOString();
    const ids = shuffle ? seededShuffle(questionIds, Date.now()) : questionIds;
    const versionedQuestions = ids.map((questionId) => {
      const question = questions.find((candidate) => candidate.id === questionId);
      if (!question) throw new Error(`未找到题目 ${questionId}，无法创建练习。`);
      return { id: question.id, contentVersion: question.contentVersion };
    });
    const session = createStudySession(crypto.randomUUID(), versionedQuestions, mode, timestamp);
    await storage.studyRepository.saveSession(session, null);
    return session.id;
  }, [questions]);

  const getSession = useCallback((id: string) => storage.studyRepository.getSession(id), []);
  const getLatestSession = useCallback(() => storage.studyRepository.getLatestOpenSession(), []);

  const saveResponse = useCallback(async (session: StudySession, questionId: string, response: UserResponse) => {
    const timestamp = nextStudySessionTimestamp(session.updatedAt);
    const updated: StudySession = {
      ...session,
      responses: { ...session.responses, [questionId]: response },
      updatedAt: timestamp,
    };
    await storage.studyRepository.saveSession(updated, session.updatedAt);
    return updated;
  }, []);

  const submitResponse = useCallback(async (
    session: StudySession,
    question: Question,
    response: UserResponse,
    durationMs: number,
  ) => {
    if (session.submittedQuestionIds.includes(question.id)) return session;
    if (session.questionContentVersions[question.id] !== question.contentVersion) {
      throw new Error(`题目 ${question.id} 的会话题面版本与当前内容不一致，已阻止提交。`);
    }
    const timestamp = nextStudySessionTimestamp(session.updatedAt);
    const evaluation = evaluateResponse(question, response);
    const attempt: Attempt = {
      id: crypto.randomUUID(),
      questionId: question.id,
      questionContentVersion: question.contentVersion,
      sessionId: session.id,
      mode: session.mode,
      response,
      correct: evaluation.correct,
      score: evaluation.score,
      startedAt: new Date(Date.now() - durationMs).toISOString(),
      submittedAt: timestamp,
      durationMs,
    };
    const updated: StudySession = {
      ...session,
      responses: { ...session.responses, [question.id]: response },
      submittedQuestionIds: [...session.submittedQuestionIds, question.id],
      updatedAt: timestamp,
    };
    await storage.studyRepository.submitAttempt(attempt, updated, session.updatedAt);
    await reload();
    return updated;
  }, [reload]);

  const moveSession = useCallback(async (session: StudySession, index: number) => {
    const timestamp = nextStudySessionTimestamp(session.updatedAt);
    const updated = {
      ...session,
      currentIndex: Math.max(0, Math.min(index, session.questionIds.length - 1)),
      updatedAt: timestamp,
    };
    await storage.studyRepository.saveSession(updated, session.updatedAt);
    return updated;
  }, []);

  const finishSession = useCallback(async (session: StudySession) => {
    const timestamp = nextStudySessionTimestamp(session.updatedAt);
    const updated = { ...session, updatedAt: timestamp, completedAt: timestamp };
    await storage.studyRepository.saveSession(updated, session.updatedAt);
    return updated;
  }, []);

  const setMastery = useCallback(async (questionId: string, mastery: Mastery) => {
    const question = questions.find((candidate) => candidate.id === questionId);
    if (!question) throw new Error(`未找到题目 ${questionId}，无法保存掌握度。`);
    await storage.studyRepository.setMastery(questionId, question.contentVersion, mastery);
    await reload();
  }, [questions, reload]);

  const toggleCollection = useCallback(async (questionId: string) => {
    await storage.annotationRepository.setCollected(questionId, !collections.has(questionId), new Date().toISOString());
    await reload();
  }, [collections, reload]);

  const saveNote = useCallback(async (questionId: string, body: string) => {
    const existing = notes.get(questionId);
    if (!body.trim()) {
      await storage.annotationRepository.deleteNote(questionId);
    } else {
      const timestamp = new Date().toISOString();
      await storage.annotationRepository.saveNote({
        id: existing?.id ?? crypto.randomUUID(),
        questionId,
        body: body.trim(),
        createdAt: existing?.createdAt ?? timestamp,
        updatedAt: timestamp,
      });
    }
    await reload();
  }, [notes, reload]);

  const resolveContentReviewInput = useCallback(async (questionId: string, draft: ContentReviewDraft) => {
    const [currentPacks, question] = await Promise.all([
      storage.contentRepository.listPacks(),
      storage.contentRepository.getQuestion(questionId),
    ]);
    const manifest = find2009Manifest(currentPacks);
    if (!question || question.year !== 2009) throw new Error(`未找到 2009 题目 ${questionId}，无法保存人工复核记录。`);
    return {
      ...reviewScope(manifest),
      questionId: question.id,
      questionContentVersion: question.contentVersion,
      checks: draft.checks,
      reviewer: draft.reviewer,
      issueNote: draft.issueNote,
    };
  }, []);

  const reconcileContentReviewRecord = useCallback(async (record: ContentReviewRecord) => {
    setReviewEntries((current) => [
      ...current.filter((entry) => entry.questionId !== record.questionId),
      record,
    ]);
    try {
      await reload();
    } catch {
      // The repository write is already durable. Keep the returned record in
      // context so a transient read failure cannot turn the commit into a
      // rejected promise and trigger a stale pending-draft save.
    }
    return record;
  }, [reload]);

  const reloadContentReviewRecord = useCallback(async (questionId: string) => {
    const [currentPacks, question] = await Promise.all([
      storage.contentRepository.listPacks(),
      storage.contentRepository.getQuestion(questionId),
    ]);
    const manifest = find2009Manifest(currentPacks);
    if (!question || question.year !== 2009) throw new Error(`未找到 2009 题目 ${questionId}，无法读取人工复核记录。`);
    const record = await storage.contentReviewRepository.get(reviewScope(manifest), question.id);
    setReviewEntries((current) => {
      const withoutCurrent = current.filter((entry) => entry.questionId !== question.id);
      return record ? [...withoutCurrent, record] : withoutCurrent;
    });
    return record;
  }, []);

  const saveContentReviewDraft = useCallback(async (
    questionId: string,
    draft: ContentReviewDraft,
    expectedUpdatedAt: string | null,
  ) => {
    const record = await storage.contentReviewRepository.saveDraft(
      await resolveContentReviewInput(questionId, draft),
      nextContentReviewTimestamp(expectedUpdatedAt),
      expectedUpdatedAt,
    );
    return reconcileContentReviewRecord(record);
  }, [reconcileContentReviewRecord, resolveContentReviewInput]);

  const approveContentReview = useCallback(async (
    questionId: string,
    draft: ContentReviewDraft,
    expectedUpdatedAt: string | null,
  ) => {
    const record = await storage.contentReviewRepository.approve(
      await resolveContentReviewInput(questionId, draft),
      nextContentReviewTimestamp(expectedUpdatedAt),
      expectedUpdatedAt,
    );
    return reconcileContentReviewRecord(record);
  }, [reconcileContentReviewRecord, resolveContentReviewInput]);

  const rejectContentReview = useCallback(async (
    questionId: string,
    draft: ContentReviewDraft,
    expectedUpdatedAt: string | null,
  ) => {
    const record = await storage.contentReviewRepository.reject(
      await resolveContentReviewInput(questionId, draft),
      nextContentReviewTimestamp(expectedUpdatedAt),
      expectedUpdatedAt,
    );
    return reconcileContentReviewRecord(record);
  }, [reconcileContentReviewRecord, resolveContentReviewInput]);

  const exportContentReviewLedger = useCallback(async () => {
    const [currentPacks, currentQuestions] = await Promise.all([
      storage.contentRepository.listPacks(),
      storage.contentRepository.listQuestions({ year: 2009 }),
    ]);
    const manifest = find2009Manifest(currentPacks);
    return storage.contentReviewRepository.exportLedger(manifest, currentQuestions, new Date().toISOString());
  }, []);

  const exportBackup = useCallback(() => storage.backupService.exportJson('0.1.0'), []);
  const importBackup = useCallback(async (json: string) => {
    await storage.backupService.importJson(json, 'replace');
    await reload();
  }, [reload]);
  const installVerifiedPack = useCallback(async (json: string) => {
    await installVerifiedContentPack(json);
    await reload();
  }, [reload]);
  const getMockExam = useCallback((id: string) => storage.mockExamRepository.getExam(id), []);
  const subscribeMockExam = useCallback((
    id: string,
    onValue: (value: MockExamBundle | undefined) => void,
    onError?: (reason: unknown) => void,
  ) => storage.mockExamRepository.subscribeExam(id, onValue, onError), []);
  const getLatestMockExam = useCallback(() => storage.mockExamRepository.getLatestOpenExam(), []);
  const createMockExam = useCallback(async (input?: Pick<CreateFixedMockExamInput, 'examId' | 'sessionId' | 'startedAt'>) => {
    const manifest = find2009Manifest(packs);
    const result = await storage.mockExamRepository.createFixedExam({
      examId: input?.examId ?? crypto.randomUUID(),
      sessionId: input?.sessionId ?? crypto.randomUUID(),
      manifest,
      questions: questions.filter((question) => question.year === manifest.year),
      startedAt: input?.startedAt ?? new Date().toISOString(),
    });
    setMockExams((current) => [result.exam, ...current.filter((entry) => entry.id !== result.exam.id)]);
    return result;
  }, [packs, questions]);
  const saveMockExamDraft = useCallback(async (input: SaveMockExamDraftInput) => {
    const result = await storage.mockExamRepository.saveDraft(input);
    setMockExams((current) => [result.exam, ...current.filter((entry) => entry.id !== result.exam.id)]);
    return result;
  }, []);
  const submitMockExam = useCallback(async (input: Omit<SubmitMockExamInput, 'questions'>) => {
    const result = await storage.mockExamRepository.submitExam({
      ...input,
      questions: questions.filter((question) => question.year === 2009),
    });
    setMockExams((current) => [result.exam, ...current.filter((entry) => entry.id !== result.exam.id)]);
    return result;
  }, [questions]);
  const selfScoreMockExam = useCallback(async (input: Omit<SelfScoreMockExamInput, 'questions'>) => {
    const result = await storage.mockExamRepository.selfScoreComprehensive({
      ...input,
      questions: questions.filter((question) => question.year === 2009),
    });
    setMockExams((current) => [result.exam, ...current.filter((entry) => entry.id !== result.exam.id)]);
    return result;
  }, [questions]);

  const value: StudyContextValue = {
    loading,
    error,
    contentIssues,
    packs,
    questions,
    knowledgePoints,
    assets,
    attempts,
    progress,
    currentProgress,
    collections,
    notes,
    stats,
    reviewRecords,
    reviewSummary,
    mockExams,
    reload,
    createSession,
    getSession,
    getLatestSession,
    saveResponse,
    submitResponse,
    moveSession,
    finishSession,
    setMastery,
    toggleCollection,
    saveNote,
    saveContentReviewDraft,
    approveContentReview,
    rejectContentReview,
    reloadContentReviewRecord,
    exportContentReviewLedger,
    exportBackup,
    importBackup,
    installVerifiedPack,
    getMockExam,
    subscribeMockExam,
    getLatestMockExam,
    createMockExam,
    saveMockExamDraft,
    submitMockExam,
    selfScoreMockExam,
  };

  return <StudyContext.Provider value={value}>{children}</StudyContext.Provider>;
}

export function useStudy(): StudyContextValue {
  const value = useContext(StudyContext);
  if (!value) throw new Error('useStudy must be used inside StudyProvider.');
  return value;
}
