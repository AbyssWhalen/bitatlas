import 'fake-indexeddb/auto';
import { afterEach, describe, expect, it } from 'vitest';
import {
  CONTENT_REVIEW_CHECKS,
  emptyContentReviewChecks,
  LEGACY_CONTENT_VERSION,
  type AssetRef,
  type Attempt,
  type ContentPack,
  type ContentPackManifest,
  type ContentReviewChecks,
  type KnowledgePoint,
  type LegacyQuestionProgress,
  type LegacyStudySession,
  type Note,
  type Question,
  type StudySession,
} from '@408os/domain';
import { computeContentPackHash } from '@408os/content-schema';
import { CONTENT_REVIEW_SETTING_PREFIX } from './content-review';
import { ContentReviewConflictError, createStorage, StudySessionConflictError } from './index';

const opened: ReturnType<typeof createStorage>[] = [];

function setup() {
  const suffix = crypto.randomUUID();
  const storage = createStorage({ content: `test-content-${suffix}`, user: `test-user-${suffix}` });
  opened.push(storage);
  return storage;
}

function createContentPack(
  year: number,
  contentVersion: string,
  knowledgePoints: KnowledgePoint[],
  knowledgePointIds = knowledgePoints.map((point) => point.id),
): ContentPack {
  const id = `cn408-${year}`;
  const questionAssetId = `${id}-source-questions-page-1`;
  const answerAssetId = `${id}-source-answers-page-1`;
  const pack: ContentPack = {
    manifest: {
      id,
      schemaVersion: 1,
      contentVersion,
      title: `${year}`,
      year,
      questionCount: 1,
      createdAt: '2026-08-05T00:00:00.000Z',
      sha256: '0'.repeat(64),
      reviewStatus: 'needs-review',
    },
    questions: [{
      id: `${id}-q01`,
      year,
      number: 1,
      subject: 'data-structures',
      kind: 'single-choice',
      stem: [{ type: 'text', text: 'Test question' }],
      options: ['A', 'B', 'C', 'D'].map((option) => ({
        id: option as 'A' | 'B' | 'C' | 'D',
        content: [{ type: 'text' as const, text: option }],
      })),
      answer: { type: 'choice', optionId: 'A' },
      explanation: [],
      hints: [],
      knowledgePointIds,
      assetIds: [],
      source: {
        question: {
          publisher: 'Test publisher',
          title: `${year} questions`,
          url: `https://example.test/${year}-questions.pdf`,
          fileName: `${year}-questions.pdf`,
          sha256: 'a'.repeat(64),
          pages: [1],
          locator: 'page 1',
        },
        answer: {
          publisher: 'Test publisher',
          title: `${year} answers`,
          url: `https://example.test/${year}-answers.pdf`,
          fileName: `${year}-answers.pdf`,
          sha256: 'b'.repeat(64),
          pages: [1],
          locator: 'page 1',
        },
        crosschecks: [],
        redistribution: 'unknown',
      },
      contentVersion,
      reviewStatus: 'needs-review',
    }],
    knowledgePoints,
    assets: [
      {
        id: questionAssetId,
        path: `/content/${id}/source/questions-1.png`,
        mimeType: 'image/png',
        sha256: 'c'.repeat(64),
        sourcePage: 1,
        width: 100,
        height: 100,
      },
      {
        id: answerAssetId,
        path: `/content/${id}/source/answers-1.png`,
        mimeType: 'image/png',
        sha256: 'd'.repeat(64),
        sourcePage: 1,
        width: 100,
        height: 100,
      },
    ],
  };
  pack.manifest.sha256 = computeContentPackHash(pack);
  return pack;
}

const backupTimestamp = '2026-08-05T00:00:10.000Z';

interface SemanticBackupFixture {
  schemaVersion: 1;
  exportedAt: string;
  appVersion: string;
  data: {
    attempts: Attempt[];
    sessions: LegacyStudySession[];
    progresses: LegacyQuestionProgress[];
    notes: Note[];
    collections: Array<{ questionId: string; createdAt: string }>;
    settings: Array<{ key: string; value: unknown }>;
  };
}

function createSemanticBackupFixture(): SemanticBackupFixture {
  const questionId = 'cn408-2009-q01';
  const response = { type: 'choice' as const, optionId: 'A' as const };
  return {
    schemaVersion: 1,
    exportedAt: backupTimestamp,
    appVersion: '0.1.0',
    data: {
      attempts: [{
        id: 'attempt-semantic-1',
        questionId,
        questionContentVersion: '2009.1',
        sessionId: 'session-semantic-1',
        mode: 'practice',
        response,
        correct: true,
        score: 1,
        startedAt: '2026-08-05T00:00:00.000Z',
        submittedAt: backupTimestamp,
        durationMs: 10_000,
      }],
      sessions: [{
        id: 'session-semantic-1',
        mode: 'practice',
        questionIds: [questionId],
        currentIndex: 0,
        responses: { [questionId]: response },
        submittedQuestionIds: [questionId],
        startedAt: '2026-08-05T00:00:00.000Z',
        updatedAt: backupTimestamp,
      }],
      progresses: [{
        questionId,
        mastery: 'learning',
        attemptCount: 1,
        correctCount: 1,
        wrongCount: 0,
        consecutiveCorrect: 1,
        lastCorrect: true,
        lastAttemptAt: backupTimestamp,
      }],
      notes: [],
      collections: [],
      settings: [],
    },
  };
}

const semanticCorruptionCases: Array<{
  name: string;
  mutate: (backup: SemanticBackupFixture) => void;
  message: RegExp;
}> = [
  {
    name: 'a submitted question without a saved response',
    mutate: (backup) => { backup.data.sessions[0]!.responses = {}; },
    message: /submittedQuestionIds.*response/iu,
  },
  {
    name: 'a response for a question outside the session',
    mutate: (backup) => {
      backup.data.sessions[0]!.responses['cn408-2009-q02'] = { type: 'choice', optionId: 'B' };
    },
    message: /Unknown session question/iu,
  },
  {
    name: 'a current index outside the session',
    mutate: (backup) => { backup.data.sessions[0]!.currentIndex = 1; },
    message: /Current index is outside/iu,
  },
  {
    name: 'an attempt whose session is missing',
    mutate: (backup) => { backup.data.sessions = []; },
    message: /attempts\.0\.sessionId.*session/iu,
  },
  {
    name: 'an attempt for a question outside its session',
    mutate: (backup) => {
      const session = backup.data.sessions[0]!;
      session.questionIds = ['cn408-2009-q02'];
      session.responses = { 'cn408-2009-q02': { type: 'choice', optionId: 'A' } };
      session.submittedQuestionIds = ['cn408-2009-q02'];
    },
    message: /attempts\.0\.questionId.*session/iu,
  },
  {
    name: 'an attempt not marked submitted by its session',
    mutate: (backup) => { backup.data.sessions[0]!.submittedQuestionIds = []; },
    message: /attempts\.0.*submitted/iu,
  },
  {
    name: 'an attempt whose response differs from the session response',
    mutate: (backup) => {
      backup.data.sessions[0]!.responses['cn408-2009-q01'] = { type: 'choice', optionId: 'B' };
    },
    message: /attempts\.0.*response/iu,
  },
  {
    name: 'a submitted session question without an attempt',
    mutate: (backup) => {
      backup.data.attempts = [];
      const progress = backup.data.progresses[0]!;
      progress.attemptCount = 0;
      progress.correctCount = 0;
      progress.consecutiveCorrect = 0;
      progress.lastCorrect = null;
      delete progress.lastAttemptAt;
    },
    message: /sessions\.0\.submittedQuestionIds.*attempt/iu,
  },
  {
    name: 'an attempt without derived progress',
    mutate: (backup) => { backup.data.progresses = []; },
    message: /attempts\.0.*progress/iu,
  },
  {
    name: 'progress counters that contradict attempts',
    mutate: (backup) => {
      backup.data.progresses[0] = {
        ...backup.data.progresses[0]!,
        correctCount: 0,
        wrongCount: 1,
        consecutiveCorrect: 0,
        lastCorrect: false,
      };
    },
    message: /progresses\.0.*attempt/iu,
  },
];

afterEach(async () => {
  await Promise.all(opened.splice(0).map(async ({ contentDatabase, userDatabase }) => {
    await contentDatabase.delete();
    await userDatabase.delete();
  }));
});

describe('storage contracts', () => {
  const reviewManifest: ContentPackManifest = {
    id: 'cn408-2009',
    schemaVersion: 1,
    contentVersion: '2009.0-draft.1',
    title: '2009',
    year: 2009,
    questionCount: 1,
    createdAt: '2026-08-05T00:00:00.000Z',
    sha256: 'a'.repeat(64),
    reviewStatus: 'needs-review',
  };
  const reviewQuestion = { id: 'cn408-2009-q01', number: 1, contentVersion: reviewManifest.contentVersion } as Question;
  const reviewScope = {
    packId: reviewManifest.id,
    packHash: reviewManifest.sha256,
    contentVersion: reviewManifest.contentVersion,
  };
  const reviewInput = {
    ...reviewScope,
    questionId: reviewQuestion.id,
    questionContentVersion: reviewQuestion.contentVersion,
    checks: emptyContentReviewChecks(),
    reviewer: '',
    issueNote: '',
  };
  const completeReviewChecks = Object.fromEntries(
    CONTENT_REVIEW_CHECKS.map((check) => [check, true]),
  ) as ContentReviewChecks;
  it('rejects a conflicting knowledge point definition still referenced by another year atomically', async () => {
    const { contentDatabase, contentRepository } = setup();
    const shared: KnowledgePoint = {
      id: 'kp-shared',
      subject: 'data-structures',
      name: 'Shared definition',
      description: 'Canonical definition',
    };
    await contentRepository.installPack(createContentPack(2010, '2010.1', [shared]), false);

    const conflicting = { ...shared, name: 'Conflicting definition' };
    await expect(
      contentRepository.installPack(createContentPack(2011, '2011.1', [conflicting]), false),
    ).rejects.toThrow(/knowledge point.*kp-shared.*conflict/iu);

    expect(await contentRepository.listPacks()).toEqual([
      expect.objectContaining({ id: 'cn408-2010', year: 2010 }),
    ]);
    expect(await contentRepository.listQuestions()).toEqual([
      expect.objectContaining({ id: 'cn408-2010-q01', year: 2010 }),
    ]);
    expect(await contentRepository.listKnowledgePoints()).toEqual([shared]);
    expect(await contentDatabase.assets.count()).toBe(2);
  });

  it('removes only replaced-year knowledge points that are no longer referenced', async () => {
    const { contentRepository } = setup();
    const shared: KnowledgePoint = {
      id: 'kp-shared',
      subject: 'data-structures',
      name: 'Shared definition',
    };
    const oldOnly: KnowledgePoint = {
      id: 'kp-old-only',
      subject: 'data-structures',
      name: 'Old only',
    };
    const replacement: KnowledgePoint = {
      id: 'kp-replacement',
      subject: 'data-structures',
      name: 'Replacement',
    };
    await contentRepository.installPack(
      createContentPack(2010, '2010.1', [oldOnly, shared]),
      false,
    );
    await contentRepository.installPack(createContentPack(2011, '2011.1', [shared]), false);

    await contentRepository.installPack(createContentPack(2010, '2010.2', [replacement]), false);

    expect((await contentRepository.listKnowledgePoints()).map((point) => point.id).sort()).toEqual([
      'kp-replacement',
      'kp-shared',
    ]);
  });

  it('reuses an identical knowledge point definition across years', async () => {
    const { contentRepository } = setup();
    const shared: KnowledgePoint = {
      id: 'kp-shared',
      subject: 'data-structures',
      name: 'Shared definition',
      parentId: 'kp-parent',
      description: 'Canonical definition',
    };
    const parent: KnowledgePoint = {
      id: 'kp-parent',
      subject: 'data-structures',
      name: 'Parent definition',
    };
    await contentRepository.installPack(createContentPack(2010, '2010.1', [parent, shared], [shared.id]), false);
    await contentRepository.installPack(createContentPack(2011, '2011.1', [parent, shared], [shared.id]), false);

    expect(await contentRepository.listPacks()).toHaveLength(2);
    expect(await contentRepository.listQuestions()).toHaveLength(2);
    expect((await contentRepository.listKnowledgePoints()).map((point) => point.id).sort()).toEqual([
      'kp-parent',
      'kp-shared',
    ]);
  });

  it('records attempt and derived progress atomically', async () => {
    const { studyRepository } = setup();
    const attempt: Attempt = {
      id: crypto.randomUUID(),
      questionId: 'cn408-2009-q01',
      questionContentVersion: '2009.1',
      sessionId: 'session-1',
      mode: 'practice',
      response: { type: 'choice', optionId: 'A' },
      correct: false,
      score: 0,
      startedAt: '2026-08-05T00:00:00.000Z',
      submittedAt: '2026-08-05T00:00:10.000Z',
      durationMs: 10_000,
    };
    await studyRepository.saveSession({
      id: attempt.sessionId,
      mode: attempt.mode,
      questionIds: [attempt.questionId],
      questionContentVersions: { [attempt.questionId]: attempt.questionContentVersion },
      currentIndex: 0,
      responses: { [attempt.questionId]: attempt.response },
      submittedQuestionIds: [attempt.questionId],
      startedAt: attempt.startedAt,
      updatedAt: attempt.submittedAt,
    }, null);
    const progress = await studyRepository.recordAttempt(attempt);
    expect(progress).toMatchObject({ questionId: attempt.questionId, attemptCount: 1, wrongCount: 1, lastCorrect: false });
    expect(await studyRepository.listAttempts()).toEqual([attempt]);
  });

  it.each([
    ['negative', -1],
    ['NaN', Number.NaN],
    ['positive infinity', Number.POSITIVE_INFINITY],
  ])('rejects a %s comprehensive draft before writing a session or change log', async (_label, selfScore) => {
    const { studyRepository, userDatabase, backupService } = setup();
    const questionId = 'cn408-2009-q44';
    const session: StudySession = {
      id: 'session-negative-draft',
      mode: 'practice',
      questionIds: [questionId],
      questionContentVersions: { [questionId]: '2009.1' },
      currentIndex: 0,
      responses: {
        [questionId]: {
          type: 'comprehensive',
          text: 'answer',
          selfScore,
          checkedRubricIds: [],
        },
      },
      submittedQuestionIds: [],
      startedAt: '2026-08-05T00:00:00.000Z',
      updatedAt: '2026-08-05T00:00:10.000Z',
    };

    await expect(studyRepository.saveSession(session, null)).rejects.toThrow(/self score.*non-negative/iu);
    expect(await studyRepository.getSession(session.id)).toBeUndefined();
    expect(await userDatabase.changeLog.toArray()).toEqual([]);
    expect(backupService.preflight(await backupService.exportJson('0.1.0')).counts).toMatchObject({
      attempts: 0,
      sessions: 0,
      progresses: 0,
    });
  });

  it.each([
    ['negative', -1],
    ['NaN', Number.NaN],
    ['positive infinity', Number.POSITIVE_INFINITY],
  ])('rejects a %s comprehensive attempt before any study write', async (_label, selfScore) => {
    const { studyRepository, userDatabase, backupService } = setup();
    const questionId = 'cn408-2009-q44';
    const response = {
      type: 'comprehensive' as const,
      text: 'answer',
      selfScore,
      checkedRubricIds: [],
    };
    const attempt: Attempt = {
      id: 'attempt-negative-score',
      questionId,
      questionContentVersion: '2009.1',
      sessionId: 'session-negative-score',
      mode: 'practice',
      response,
      correct: null,
      score: 0,
      startedAt: '2026-08-05T00:00:00.000Z',
      submittedAt: '2026-08-05T00:00:10.000Z',
      durationMs: 10_000,
    };
    const session: StudySession = {
      id: attempt.sessionId,
      mode: attempt.mode,
      questionIds: [questionId],
      questionContentVersions: { [questionId]: attempt.questionContentVersion },
      currentIndex: 0,
      responses: { [questionId]: response },
      submittedQuestionIds: [questionId],
      startedAt: attempt.startedAt,
      updatedAt: attempt.submittedAt,
    };

    await expect(studyRepository.submitAttempt(attempt, session, null)).rejects.toThrow(/self score.*non-negative/iu);
    expect(await studyRepository.getSession(session.id)).toBeUndefined();
    expect(await studyRepository.listAttempts()).toEqual([]);
    expect(await studyRepository.listProgress()).toEqual([]);
    expect(await userDatabase.changeLog.toArray()).toEqual([]);
    expect(backupService.preflight(await backupService.exportJson('0.1.0')).counts).toMatchObject({
      attempts: 0,
      sessions: 0,
      progresses: 0,
    });
  });

  it.each([
    ['negative', -1],
    ['NaN', Number.NaN],
    ['positive infinity', Number.POSITIVE_INFINITY],
  ])('rejects a %s comprehensive response through the legacy recordAttempt entry', async (_label, selfScore) => {
    const { studyRepository, userDatabase } = setup();
    const questionId = 'cn408-2009-q44';
    const response = {
      type: 'comprehensive' as const,
      text: 'answer',
      selfScore,
      checkedRubricIds: [],
    };
    const attempt: Attempt = {
      id: `attempt-record-invalid-${String(selfScore)}`,
      questionId,
      questionContentVersion: '2009.1',
      sessionId: `session-record-invalid-${String(selfScore)}`,
      mode: 'practice',
      response,
      correct: null,
      score: 0,
      startedAt: '2026-08-05T00:00:00.000Z',
      submittedAt: '2026-08-05T00:00:10.000Z',
      durationMs: 10_000,
    };
    await userDatabase.sessions.put({
      id: attempt.sessionId,
      mode: attempt.mode,
      questionIds: [questionId],
      questionContentVersions: { [questionId]: attempt.questionContentVersion },
      currentIndex: 0,
      responses: { [questionId]: response },
      submittedQuestionIds: [questionId],
      startedAt: attempt.startedAt,
      updatedAt: attempt.submittedAt,
    });

    await expect(studyRepository.recordAttempt(attempt)).rejects.toThrow(/self score.*non-negative/iu);
    expect(await studyRepository.listAttempts()).toEqual([]);
    expect(await studyRepository.listProgress()).toEqual([]);
    expect(await userDatabase.changeLog.toArray()).toEqual([]);
  });

  it('allows a valid exact-token update to repair a legacy negative self score', async () => {
    const { studyRepository, userDatabase, backupService } = setup();
    const questionId = 'cn408-2009-q44';
    const legacy: StudySession = {
      id: 'session-repair-negative-score',
      mode: 'practice',
      questionIds: [questionId],
      questionContentVersions: { [questionId]: '2009.1' },
      currentIndex: 0,
      responses: {
        [questionId]: {
          type: 'comprehensive',
          text: 'answer',
          selfScore: -1,
          checkedRubricIds: [],
        },
      },
      submittedQuestionIds: [],
      startedAt: '2026-08-05T00:00:00.000Z',
      updatedAt: '2026-08-05T00:00:10.000Z',
    };
    const repaired: StudySession = {
      ...legacy,
      responses: {
        [questionId]: {
          type: 'comprehensive',
          text: 'answer',
          checkedRubricIds: [],
        },
      },
      updatedAt: '2026-08-05T00:00:11.000Z',
    };
    await userDatabase.sessions.put(legacy);

    await studyRepository.saveSession(repaired, legacy.updatedAt);

    expect(await studyRepository.getSession(legacy.id)).toEqual(repaired);
    expect(await userDatabase.changeLog.toArray()).toEqual([
      expect.objectContaining({ entityType: 'session', entityId: legacy.id, operation: 'put' }),
    ]);
    expect(backupService.preflight(await backupService.exportJson('0.1.0')).counts).toMatchObject({
      attempts: 0,
      sessions: 1,
      progresses: 0,
    });
  });

  it('repairs legacy submitted negative evidence before exporting a backup', async () => {
    const { studyRepository, userDatabase, backupService } = setup();
    const questionId = 'cn408-2009-q44';
    const invalidResponse = {
      type: 'comprehensive' as const,
      text: 'answer',
      selfScore: -1,
      checkedRubricIds: [],
    };
    const attempt: Attempt = {
      id: 'attempt-repair-submitted-score',
      questionId,
      questionContentVersion: '2009.1',
      sessionId: 'session-repair-submitted-score',
      mode: 'practice',
      response: invalidResponse,
      correct: null,
      score: 0,
      startedAt: '2026-08-05T00:00:00.000Z',
      submittedAt: '2026-08-05T00:00:10.000Z',
      durationMs: 10_000,
    };
    const session: StudySession = {
      id: attempt.sessionId,
      mode: attempt.mode,
      questionIds: [questionId],
      questionContentVersions: { [questionId]: attempt.questionContentVersion },
      currentIndex: 0,
      responses: { [questionId]: invalidResponse },
      submittedQuestionIds: [questionId],
      startedAt: attempt.startedAt,
      updatedAt: attempt.submittedAt,
    };
    await userDatabase.sessions.put(session);
    await userDatabase.attempts.put(attempt);
    await userDatabase.versionedProgresses.put({
      questionId,
      questionContentVersion: attempt.questionContentVersion,
      mastery: 'learning',
      attemptCount: 1,
      correctCount: 0,
      wrongCount: 0,
      consecutiveCorrect: 0,
      lastCorrect: null,
      lastAttemptAt: attempt.submittedAt,
    });

    const json = await backupService.exportJson('0.1.0');

    expect(backupService.preflight(json).counts).toMatchObject({ attempts: 1, sessions: 1 });
    expect(await studyRepository.getSession(session.id)).toMatchObject({
      responses: { [questionId]: expect.objectContaining({ selfScore: 0 }) },
      updatedAt: expect.not.stringMatching(session.updatedAt),
    });
    expect(await studyRepository.listAttempts()).toEqual([
      expect.objectContaining({
        id: attempt.id,
        score: 0,
        response: expect.objectContaining({ selfScore: 0 }),
      }),
    ]);
    const changesAfterRepair = await userDatabase.changeLog.toArray();
    expect(changesAfterRepair).toEqual(expect.arrayContaining([
      expect.objectContaining({ entityType: 'session', entityId: session.id, operation: 'put' }),
      expect.objectContaining({ entityType: 'attempt', entityId: attempt.id, operation: 'put' }),
    ]));

    await backupService.exportJson('0.1.0');
    expect(await userDatabase.changeLog.toArray()).toEqual(changesAfterRepair);
  });

  it.each([['NaN', Number.NaN], ['positive infinity', Number.POSITIVE_INFINITY]])(
    'fails closed for a submitted legacy %s without one matching attempt',
    async (_label, selfScore) => {
      const { studyRepository, userDatabase } = setup();
      const questionId = 'cn408-2009-q44';
      await userDatabase.sessions.put({
        id: `session-unresolved-${String(selfScore)}`,
        mode: 'practice',
        questionIds: [questionId],
        questionContentVersions: { [questionId]: '2009.1' },
        currentIndex: 0,
        responses: {
          [questionId]: {
            type: 'comprehensive',
            text: 'answer',
            selfScore,
            checkedRubricIds: [],
          },
        },
        submittedQuestionIds: [questionId],
        startedAt: '2026-08-05T00:00:00.000Z',
        updatedAt: '2026-08-05T00:00:10.000Z',
      });

      await expect(studyRepository.getSession(`session-unresolved-${String(selfScore)}`))
        .rejects.toThrow(/manual recovery/iu);
    },
  );

  it('rolls back every legacy repair when one response lacks sufficient evidence', async () => {
    const { studyRepository, userDatabase } = setup();
    const repairableQuestionId = 'cn408-2009-q44';
    const unresolvedQuestionId = 'cn408-2009-q46';
    const legacy: StudySession = {
      id: 'session-mixed-legacy-repair',
      mode: 'practice',
      questionIds: [repairableQuestionId, unresolvedQuestionId],
      questionContentVersions: {
        [repairableQuestionId]: '2009.1',
        [unresolvedQuestionId]: '2009.1',
      },
      currentIndex: 0,
      responses: {
        [repairableQuestionId]: {
          type: 'comprehensive',
          text: 'draft',
          selfScore: -1,
          checkedRubricIds: [],
        },
        [unresolvedQuestionId]: {
          type: 'comprehensive',
          text: 'submitted',
          selfScore: Number.NaN,
          checkedRubricIds: [],
        },
      },
      submittedQuestionIds: [unresolvedQuestionId],
      startedAt: '2026-08-05T00:00:00.000Z',
      updatedAt: '2026-08-05T00:00:10.000Z',
    };
    await userDatabase.sessions.put(legacy);

    await expect(studyRepository.getSession(legacy.id)).rejects.toThrow(/manual recovery/iu);
    expect(await userDatabase.sessions.get(legacy.id)).toEqual(legacy);
    expect(await userDatabase.changeLog.toArray()).toEqual([]);
  });

  it('does not treat an objective outcome as proof for repairing a comprehensive score', async () => {
    const { studyRepository, userDatabase } = setup();
    const questionId = 'cn408-2009-q44';
    const invalidResponse = {
      type: 'comprehensive' as const,
      text: 'answer',
      selfScore: -1,
      checkedRubricIds: [],
    };
    const session: StudySession = {
      id: 'session-invalid-objective-evidence',
      mode: 'practice',
      questionIds: [questionId],
      questionContentVersions: { [questionId]: '2009.1' },
      currentIndex: 0,
      responses: { [questionId]: invalidResponse },
      submittedQuestionIds: [questionId],
      startedAt: '2026-08-05T00:00:00.000Z',
      updatedAt: '2026-08-05T00:00:10.000Z',
    };
    await userDatabase.sessions.put(session);
    await userDatabase.attempts.put({
      id: 'attempt-invalid-objective-evidence',
      questionId,
      questionContentVersion: '2009.1',
      sessionId: session.id,
      mode: session.mode,
      response: invalidResponse,
      correct: false,
      score: 0,
      startedAt: session.startedAt,
      submittedAt: session.updatedAt,
      durationMs: 10_000,
    });

    await expect(studyRepository.getSession(session.id)).rejects.toThrow(/manual recovery/iu);
    expect(await userDatabase.sessions.get(session.id)).toEqual(session);
  });

  it.each([['negative', -1], ['zero', 0]])(
    'does not repair an upper-clamp response from a %s attempt score',
    async (_label, attemptScore) => {
    const { studyRepository, userDatabase } = setup();
    const questionId = 'cn408-2009-q44';
    const invalidResponse = {
      type: 'comprehensive' as const,
      text: 'answer',
      selfScore: 99,
      checkedRubricIds: [],
    };
    const session: StudySession = {
      id: 'session-negative-attempt-score',
      mode: 'practice',
      questionIds: [questionId],
      questionContentVersions: { [questionId]: '2009.1' },
      currentIndex: 0,
      responses: { [questionId]: invalidResponse },
      submittedQuestionIds: [questionId],
      startedAt: '2026-08-05T00:00:00.000Z',
      updatedAt: '2026-08-05T00:00:10.000Z',
    };
    await userDatabase.sessions.put(session);
    await userDatabase.attempts.put({
      id: 'attempt-negative-score-evidence',
      questionId,
      questionContentVersion: '2009.1',
      sessionId: session.id,
      mode: session.mode,
      response: invalidResponse,
      correct: null,
      score: attemptScore,
      startedAt: session.startedAt,
      submittedAt: session.updatedAt,
      durationMs: 10_000,
    });

    await expect(studyRepository.getSession(session.id)).rejects.toThrow(/manual recovery/iu);
    expect(await userDatabase.sessions.get(session.id)).toEqual(session);
    },
  );

  it('does not repair negative infinity as a proven legacy clamp', async () => {
    const { studyRepository, userDatabase } = setup();
    const questionId = 'cn408-2009-q44';
    const invalidResponse = {
      type: 'comprehensive' as const,
      text: 'answer',
      selfScore: Number.NEGATIVE_INFINITY,
      checkedRubricIds: [],
    };
    const session: StudySession = {
      id: 'session-negative-infinity-evidence',
      mode: 'practice',
      questionIds: [questionId],
      questionContentVersions: { [questionId]: '2009.1' },
      currentIndex: 0,
      responses: { [questionId]: invalidResponse },
      submittedQuestionIds: [questionId],
      startedAt: '2026-08-05T00:00:00.000Z',
      updatedAt: '2026-08-05T00:00:10.000Z',
    };
    await userDatabase.sessions.put(session);
    await userDatabase.attempts.put({
      id: 'attempt-negative-infinity-evidence',
      questionId,
      questionContentVersion: '2009.1',
      sessionId: session.id,
      mode: session.mode,
      response: invalidResponse,
      correct: null,
      score: 0,
      startedAt: session.startedAt,
      submittedAt: session.updatedAt,
      durationMs: 10_000,
    });

    await expect(studyRepository.getSession(session.id)).rejects.toThrow(/manual recovery/iu);
    expect(await userDatabase.sessions.get(session.id)).toEqual(session);
  });

  it('does not clear an unsubmitted legacy score while an orphan attempt still references it', async () => {
    const { studyRepository, userDatabase } = setup();
    const questionId = 'cn408-2009-q44';
    const invalidResponse = {
      type: 'comprehensive' as const,
      text: 'answer',
      selfScore: -1,
      checkedRubricIds: [],
    };
    const session: StudySession = {
      id: 'session-orphan-attempt-evidence',
      mode: 'practice',
      questionIds: [questionId],
      questionContentVersions: { [questionId]: '2009.1' },
      currentIndex: 0,
      responses: { [questionId]: invalidResponse },
      submittedQuestionIds: [],
      startedAt: '2026-08-05T00:00:00.000Z',
      updatedAt: '2026-08-05T00:00:10.000Z',
    };
    await userDatabase.sessions.put(session);
    await userDatabase.attempts.put({
      id: 'attempt-orphan-evidence',
      questionId,
      questionContentVersion: '2009.1',
      sessionId: session.id,
      mode: session.mode,
      response: invalidResponse,
      correct: null,
      score: 0,
      startedAt: session.startedAt,
      submittedAt: session.updatedAt,
      durationMs: 10_000,
    });

    await expect(studyRepository.getSession(session.id)).rejects.toThrow(/manual recovery/iu);
    expect(await userDatabase.sessions.get(session.id)).toEqual(session);
    expect(await userDatabase.attempts.get('attempt-orphan-evidence')).toMatchObject({ response: invalidResponse });
    expect(await userDatabase.changeLog.toArray()).toEqual([]);
  });

  it('does not repair a score for a response outside the session question set', async () => {
    const { studyRepository, userDatabase } = setup();
    const questionId = 'cn408-2009-q44';
    const extraQuestionId = 'cn408-2009-q46';
    const invalidResponse = {
      type: 'comprehensive' as const,
      text: 'answer',
      selfScore: -1,
      checkedRubricIds: [],
    };
    const session: StudySession = {
      id: 'session-extra-response-question',
      mode: 'practice',
      questionIds: [questionId],
      questionContentVersions: {
        [questionId]: '2009.1',
        [extraQuestionId]: '2009.1',
      },
      currentIndex: 0,
      responses: { [extraQuestionId]: invalidResponse },
      submittedQuestionIds: [extraQuestionId],
      startedAt: '2026-08-05T00:00:00.000Z',
      updatedAt: '2026-08-05T00:00:10.000Z',
    };
    await userDatabase.sessions.put(session);
    await userDatabase.attempts.put({
      id: 'attempt-extra-response-question',
      questionId: extraQuestionId,
      questionContentVersion: '2009.1',
      sessionId: session.id,
      mode: session.mode,
      response: invalidResponse,
      correct: null,
      score: 0,
      startedAt: session.startedAt,
      submittedAt: session.updatedAt,
      durationMs: 10_000,
    });

    await expect(studyRepository.getSession(session.id)).rejects.toThrow(/manual recovery/iu);
    expect(await userDatabase.sessions.get(session.id)).toEqual(session);
    expect(await userDatabase.changeLog.toArray()).toEqual([]);
  });

  it.each(['choice response', 'attempt'] as const)(
    'rolls back a repair when the session also has an extra %s outside its question set',
    async (extraKind) => {
      const { studyRepository, userDatabase } = setup();
      const questionId = 'cn408-2009-q44';
      const extraQuestionId = 'cn408-2009-q46';
      const startedAt = '2026-08-05T00:00:00.000Z';
      const updatedAt = '2026-08-05T00:00:10.000Z';
      const invalidResponse = {
        type: 'comprehensive' as const,
        text: 'draft',
        selfScore: -1,
        checkedRubricIds: [],
      };
      const extraResponse = { type: 'choice' as const, optionId: 'A' as const };
      const legacy: StudySession = {
        id: `session-repair-with-extra-${extraKind.replace(' ', '-')}`,
        mode: 'practice',
        questionIds: [questionId],
        questionContentVersions: { [questionId]: '2009.1' },
        currentIndex: 0,
        responses: {
          [questionId]: invalidResponse,
          ...(extraKind === 'choice response' ? { [extraQuestionId]: extraResponse } : {}),
        },
        submittedQuestionIds: [],
        startedAt,
        updatedAt,
      };
      const extraAttempt: Attempt = {
        id: 'attempt-extra-question-during-repair',
        questionId: extraQuestionId,
        questionContentVersion: '2009.1',
        sessionId: legacy.id,
        mode: legacy.mode,
        response: extraResponse,
        correct: true,
        score: 1,
        startedAt,
        submittedAt: updatedAt,
        durationMs: 10_000,
      };
      await userDatabase.sessions.put(legacy);
      if (extraKind === 'attempt') await userDatabase.attempts.put(extraAttempt);
      const attemptsBefore = await userDatabase.attempts.toArray();

      await expect(studyRepository.getSession(legacy.id)).rejects.toThrow(/manual recovery/iu);
      expect(await userDatabase.sessions.get(legacy.id)).toEqual(legacy);
      expect(await userDatabase.attempts.toArray()).toEqual(attemptsBefore);
      expect(await userDatabase.changeLog.toArray()).toEqual([]);
    },
  );

  it.each([
    ['NaN', Number.NaN],
    ['positive infinity', Number.POSITIVE_INFINITY],
    ['negative infinity', Number.NEGATIVE_INFINITY],
  ])('does not guess away an unsubmitted legacy %s score', async (_label, selfScore) => {
    const { studyRepository, userDatabase } = setup();
    const questionId = 'cn408-2009-q44';
    const session: StudySession = {
      id: `session-unsubmitted-${String(selfScore)}`,
      mode: 'practice',
      questionIds: [questionId],
      questionContentVersions: { [questionId]: '2009.1' },
      currentIndex: 0,
      responses: {
        [questionId]: {
          type: 'comprehensive',
          text: 'answer',
          selfScore,
          checkedRubricIds: [],
        },
      },
      submittedQuestionIds: [],
      startedAt: '2026-08-05T00:00:00.000Z',
      updatedAt: '2026-08-05T00:00:10.000Z',
    };
    await userDatabase.sessions.put(session);

    await expect(studyRepository.getSession(session.id)).rejects.toThrow(/manual recovery/iu);
    expect(await userDatabase.sessions.get(session.id)).toEqual(session);
    expect(await userDatabase.changeLog.toArray()).toEqual([]);
  });

  it('repairs a legacy submitted over-limit score only with matching clamped attempt evidence', async () => {
    const { studyRepository, userDatabase, backupService } = setup();
    const questionId = 'cn408-2009-q44';
    const invalidResponse = {
      type: 'comprehensive' as const,
      text: 'answer',
      selfScore: 99,
      checkedRubricIds: [],
    };
    const attempt: Attempt = {
      id: 'attempt-repair-over-limit-score',
      questionId,
      questionContentVersion: '2009.1',
      sessionId: 'session-repair-over-limit-score',
      mode: 'practice',
      response: invalidResponse,
      correct: null,
      score: 10,
      startedAt: '2026-08-05T00:00:00.000Z',
      submittedAt: '2026-08-05T00:00:10.000Z',
      durationMs: 10_000,
    };
    const session: StudySession = {
      id: attempt.sessionId,
      mode: attempt.mode,
      questionIds: [questionId],
      questionContentVersions: { [questionId]: attempt.questionContentVersion },
      currentIndex: 0,
      responses: { [questionId]: invalidResponse },
      submittedQuestionIds: [questionId],
      startedAt: attempt.startedAt,
      updatedAt: attempt.submittedAt,
    };
    await userDatabase.sessions.put(session);
    await userDatabase.attempts.put(attempt);
    await userDatabase.versionedProgresses.put({
      questionId,
      questionContentVersion: attempt.questionContentVersion,
      mastery: 'learning',
      attemptCount: 1,
      correctCount: 0,
      wrongCount: 0,
      consecutiveCorrect: 0,
      lastCorrect: null,
      lastAttemptAt: attempt.submittedAt,
    });

    expect(backupService.preflight(await backupService.exportJson('0.1.0')).counts).toMatchObject({
      attempts: 1,
      sessions: 1,
    });
    expect(await studyRepository.getSession(session.id)).toMatchObject({
      responses: { [questionId]: expect.objectContaining({ selfScore: 10 }) },
    });
    expect(await studyRepository.listAttempts()).toEqual([
      expect.objectContaining({
        id: attempt.id,
        response: expect.objectContaining({ selfScore: 10 }),
        score: 10,
      }),
    ]);
  });

  it('does not move an older repaired session ahead of a newer open session', async () => {
    const { studyRepository, userDatabase, backupService } = setup();
    const questionId = 'cn408-2009-q44';
    await userDatabase.sessions.bulkPut([
      {
        id: 'z-session-old-repair-order',
        mode: 'practice',
        questionIds: [questionId],
        questionContentVersions: { [questionId]: '2009.1' },
        currentIndex: 0,
        responses: {
          [questionId]: {
            type: 'comprehensive',
            text: 'old',
            selfScore: -1,
            checkedRubricIds: [],
          },
        },
        submittedQuestionIds: [],
        startedAt: '2026-08-05T00:00:00.000Z',
        updatedAt: '2026-08-05T00:00:10.000Z',
      },
      {
        id: 'a-session-new-open',
        mode: 'practice',
        questionIds: [questionId],
        questionContentVersions: { [questionId]: '2009.1' },
        currentIndex: 0,
        responses: {},
        submittedQuestionIds: [],
        startedAt: '2026-08-05T00:00:00.001Z',
        updatedAt: '2026-08-05T00:00:10.001Z',
      },
    ]);

    await expect(studyRepository.getLatestOpenSession()).resolves.toMatchObject({ id: 'a-session-new-open' });
    const repaired = await userDatabase.sessions.get('z-session-old-repair-order');
    expect(repaired?.updatedAt).not.toBe('2026-08-05T00:00:10.000Z');
    expect(repaired?.updatedAt).not.toBe('2026-08-05T00:00:10.001Z');
    expect(repaired?.updatedAt.localeCompare('2026-08-05T00:00:10.001Z')).toBeLessThan(0);
    expect(repaired?.responses[questionId]).not.toHaveProperty('selfScore');
    expect(backupService.preflight(await backupService.exportJson('0.3.0')).counts.sessions).toBe(2);
  });

  it('rejects an attempt that is not backed by a submitted session response', async () => {
    const { studyRepository } = setup();
    const attempt: Attempt = {
      id: crypto.randomUUID(),
      questionId: 'cn408-2009-q01',
      questionContentVersion: '2009.1',
      sessionId: 'missing-session',
      mode: 'practice',
      response: { type: 'choice', optionId: 'A' },
      correct: false,
      score: 0,
      startedAt: '2026-08-05T00:00:00.000Z',
      submittedAt: '2026-08-05T00:00:10.000Z',
      durationMs: 10_000,
    };

    await expect(studyRepository.recordAttempt(attempt)).rejects.toThrow(/study session/);
    expect(await studyRepository.listAttempts()).toEqual([]);
    expect(await studyRepository.listProgress()).toEqual([]);
  });

  it('submits an attempt, progress and session in one idempotent transaction', async () => {
    const { studyRepository } = setup();
    const attempt: Attempt = {
      id: 'attempt-1',
      questionId: 'cn408-2009-q01',
      questionContentVersion: '2009.1',
      sessionId: 'session-1',
      mode: 'practice',
      response: { type: 'choice', optionId: 'A' },
      correct: false,
      score: 0,
      startedAt: '2026-08-05T00:00:00.000Z',
      submittedAt: '2026-08-05T00:00:10.000Z',
      durationMs: 10_000,
    };
    const session: StudySession = {
      id: attempt.sessionId,
      mode: 'practice',
      questionIds: [attempt.questionId],
      questionContentVersions: { [attempt.questionId]: attempt.questionContentVersion },
      currentIndex: 0,
      responses: { [attempt.questionId]: attempt.response },
      submittedQuestionIds: [attempt.questionId],
      startedAt: attempt.startedAt,
      updatedAt: attempt.submittedAt,
    };

    await studyRepository.submitAttempt(attempt, session, null);
    await studyRepository.submitAttempt({ ...attempt, id: 'attempt-duplicate' }, session, null);

    expect(await studyRepository.listAttempts()).toEqual([attempt]);
    expect(await studyRepository.listProgress()).toEqual([
      expect.objectContaining({ questionId: attempt.questionId, attemptCount: 1, wrongCount: 1 }),
    ]);
    expect(await studyRepository.getSession(session.id)).toEqual(session);
  });

  it('keeps progress and change-log scope isolated across question content versions', async () => {
    const { studyRepository, userDatabase } = setup();
    const questionId = 'cn408-2009-q-versioned';
    const makeAttempt = (id: string, version: string, submittedAt: string, optionId: 'A' | 'B'): Attempt => ({
      id,
      questionId,
      questionContentVersion: version,
      sessionId: `session-${version}`,
      mode: 'practice',
      response: { type: 'choice', optionId },
      correct: optionId === 'A',
      score: optionId === 'A' ? 1 : 0,
      startedAt: '2026-08-05T00:00:00.000Z',
      submittedAt,
      durationMs: 1_000,
    });
    const makeSession = (attempt: Attempt): StudySession => ({
      id: attempt.sessionId,
      mode: attempt.mode,
      questionIds: [questionId],
      questionContentVersions: { [questionId]: attempt.questionContentVersion },
      currentIndex: 0,
      responses: { [questionId]: attempt.response },
      submittedQuestionIds: [questionId],
      startedAt: attempt.startedAt,
      updatedAt: attempt.submittedAt,
    });
    const first = makeAttempt('attempt-version-old', '2009.0', '2026-08-05T00:00:10.000Z', 'A');
    const second = makeAttempt('attempt-version-new', '2009.1', '2026-08-05T00:00:11.000Z', 'B');

    await studyRepository.submitAttempt(first, makeSession(first), null);
    await studyRepository.submitAttempt(second, makeSession(second), null);
    expect(await studyRepository.listProgress()).toEqual([
      expect.objectContaining({ questionId, questionContentVersion: '2009.0', attemptCount: 1, mastery: 'learning' }),
      expect.objectContaining({ questionId, questionContentVersion: '2009.1', attemptCount: 1, mastery: 'learning' }),
    ]);

    await studyRepository.setMastery(questionId, '2009.0', 'mastered');
    expect(await userDatabase.versionedProgresses.get([questionId, '2009.1'])).toMatchObject({ mastery: 'learning' });
    const progressChanges = await userDatabase.changeLog.where('entityType').equals('progress').toArray();
    expect(progressChanges.map((entry) => entry.entityId)).toEqual(expect.arrayContaining([
      `${questionId}:2009.0`,
      `${questionId}:2009.1`,
    ]));
  });

  it('rejects version-mismatched attempts and unresolved legacy sessions', async () => {
    const { studyRepository, userDatabase } = setup();
    const questionId = 'cn408-2009-q-version-guard';
    const session: StudySession = {
      id: 'session-version-guard',
      mode: 'practice',
      questionIds: [questionId],
      questionContentVersions: { [questionId]: '2009.1' },
      currentIndex: 0,
      responses: { [questionId]: { type: 'choice', optionId: 'A' } },
      submittedQuestionIds: [questionId],
      startedAt: '2026-08-05T00:00:00.000Z',
      updatedAt: '2026-08-05T00:00:10.000Z',
    };
    const mismatched: Attempt = {
      id: 'attempt-version-guard',
      questionId,
      questionContentVersion: '2009.0',
      sessionId: session.id,
      mode: session.mode,
      response: { type: 'choice', optionId: 'A' },
      correct: true,
      score: 1,
      startedAt: session.startedAt,
      submittedAt: session.updatedAt,
      durationMs: 1_000,
    };

    await expect(studyRepository.submitAttempt(mismatched, session, null)).rejects.toThrow(/study session/iu);
    expect(await studyRepository.listAttempts()).toEqual([]);
    await expect(studyRepository.saveSession({
      ...session,
      questionContentVersions: { [questionId]: LEGACY_CONTENT_VERSION },
    }, null)).rejects.toThrow(/legacy version/iu);
    await expect(studyRepository.saveSession({
      ...session,
      questionContentVersions: { [questionId]: '   ' },
    }, null)).rejects.toThrow(/content version/iu);
    await expect(studyRepository.setMastery(questionId, LEGACY_CONTENT_VERSION, 'mastered')).rejects.toThrow(/current question content version/iu);

    await userDatabase.sessions.put({
      ...session,
      id: 'legacy-open-session',
      questionContentVersions: { [questionId]: LEGACY_CONTENT_VERSION },
      updatedAt: '2026-08-05T00:00:20.000Z',
    });
    await userDatabase.sessions.put({
      ...session,
      id: 'blank-version-open-session',
      questionContentVersions: { [questionId]: '   ' },
      updatedAt: '2026-08-05T00:00:21.000Z',
    });
    await studyRepository.saveSession(session, null);
    expect(await studyRepository.getLatestOpenSession()).toEqual(session);
  });

  it('does not overwrite a committed response when an idempotent retry carries a stale session', async () => {
    const { studyRepository, userDatabase, backupService } = setup();
    const attempt: Attempt = {
      id: 'attempt-concurrent',
      questionId: 'cn408-2009-q01',
      questionContentVersion: '2009.1',
      sessionId: 'session-concurrent',
      mode: 'practice',
      response: { type: 'choice', optionId: 'A' },
      correct: false,
      score: 0,
      startedAt: '2026-08-05T00:00:00.000Z',
      submittedAt: '2026-08-05T00:00:10.000Z',
      durationMs: 10_000,
    };
    const committed: StudySession = {
      id: attempt.sessionId,
      mode: attempt.mode,
      questionIds: [attempt.questionId],
      questionContentVersions: { [attempt.questionId]: attempt.questionContentVersion },
      currentIndex: 0,
      responses: { [attempt.questionId]: attempt.response },
      submittedQuestionIds: [attempt.questionId],
      startedAt: attempt.startedAt,
      updatedAt: attempt.submittedAt,
    };
    const competingAttempt: Attempt = {
      ...attempt,
      id: 'competing-attempt',
      response: { type: 'choice', optionId: 'B' },
      correct: true,
      score: 1,
    };
    const competingSession: StudySession = {
      ...committed,
      responses: { [attempt.questionId]: competingAttempt.response },
      updatedAt: '2026-08-05T00:00:11.000Z',
    };

    await studyRepository.submitAttempt(attempt, committed, null);
    const progressBefore = await studyRepository.listProgress();
    const changesBefore = await userDatabase.changeLog.toArray();
    await expect(studyRepository.submitAttempt(
      competingAttempt,
      competingSession,
      committed.updatedAt,
    )).rejects.toBeInstanceOf(StudySessionConflictError);

    expect(await studyRepository.getSession(committed.id)).toEqual(committed);
    expect(await studyRepository.listAttempts()).toEqual([attempt]);
    expect(await studyRepository.listProgress()).toEqual(progressBefore);
    expect(await userDatabase.changeLog.toArray()).toEqual(changesBefore);
    expect(backupService.preflight(await backupService.exportJson('0.1.0')).counts).toMatchObject({
      attempts: 1,
      sessions: 1,
      progresses: 1,
    });
  });

  it.each([
    {
      name: 'response draft',
      staleUpdate: (session: StudySession, updatedAt: string): StudySession => ({
        ...session,
        responses: { 'cn408-2009-q02': { type: 'choice', optionId: 'B' } },
        updatedAt,
      }),
    },
    {
      name: 'question move',
      staleUpdate: (session: StudySession, updatedAt: string): StudySession => ({
        ...session,
        currentIndex: 1,
        updatedAt,
      }),
    },
    {
      name: 'session finish',
      staleUpdate: (session: StudySession, updatedAt: string): StudySession => ({
        ...session,
        completedAt: updatedAt,
        updatedAt,
      }),
    },
  ])('rejects a stale $name without breaking submitted evidence or backup recovery', async ({ staleUpdate }) => {
    const { studyRepository, userDatabase, backupService } = setup();
    const expectedUpdatedAt = '2026-08-05T00:00:00.000Z';
    const submittedAt = '2026-08-05T00:00:10.000Z';
    const staleWriteAt = '2026-08-05T00:00:20.000Z';
    const questionIds = ['cn408-2009-q01', 'cn408-2009-q02'];
    const staleSession: StudySession = {
      id: 'session-stale-save',
      mode: 'practice',
      questionIds,
      questionContentVersions: Object.fromEntries(questionIds.map((id) => [id, '2009.1'])),
      currentIndex: 0,
      responses: {},
      submittedQuestionIds: [],
      startedAt: expectedUpdatedAt,
      updatedAt: expectedUpdatedAt,
    };
    const attempt: Attempt = {
      id: 'attempt-stale-save',
      questionId: questionIds[0]!,
      questionContentVersion: '2009.1',
      sessionId: staleSession.id,
      mode: staleSession.mode,
      response: { type: 'choice', optionId: 'A' },
      correct: true,
      score: 1,
      startedAt: staleSession.startedAt,
      submittedAt,
      durationMs: 10_000,
    };
    const committedSession: StudySession = {
      ...staleSession,
      responses: { [attempt.questionId]: attempt.response },
      submittedQuestionIds: [attempt.questionId],
      updatedAt: submittedAt,
    };
    await studyRepository.saveSession(staleSession, null);
    await studyRepository.submitAttempt(attempt, committedSession, staleSession.updatedAt);
    const progressBefore = await studyRepository.listProgress();
    const changesBefore = await userDatabase.changeLog.toArray();

    await expect(studyRepository.saveSession(
      staleUpdate(staleSession, staleWriteAt),
      expectedUpdatedAt,
    )).rejects.toBeInstanceOf(StudySessionConflictError);
    expect(await studyRepository.getSession(staleSession.id)).toEqual(committedSession);
    expect(await studyRepository.listAttempts()).toEqual([attempt]);
    expect(await studyRepository.listProgress()).toEqual(progressBefore);
    expect(await userDatabase.changeLog.toArray()).toEqual(changesBefore);
    expect(backupService.preflight(await backupService.exportJson('0.1.0')).counts).toMatchObject({
      attempts: 1,
      sessions: 1,
      progresses: 1,
    });
  });

  it('rejects a second-tab submission from a stale base without orphaning either attempt', async () => {
    const { studyRepository, userDatabase, backupService } = setup();
    const expectedUpdatedAt = '2026-08-05T00:00:00.000Z';
    const questionIds = ['cn408-2009-q01', 'cn408-2009-q02'];
    const initialSession: StudySession = {
      id: 'session-concurrent-questions',
      mode: 'practice',
      questionIds,
      questionContentVersions: Object.fromEntries(questionIds.map((id) => [id, '2009.1'])),
      currentIndex: 0,
      responses: {},
      submittedQuestionIds: [],
      startedAt: expectedUpdatedAt,
      updatedAt: expectedUpdatedAt,
    };
    const attemptFor = (questionId: string, optionId: 'A' | 'B', submittedAt: string): Attempt => ({
      id: `attempt-${questionId}`,
      questionId,
      questionContentVersion: '2009.1',
      sessionId: initialSession.id,
      mode: initialSession.mode,
      response: { type: 'choice', optionId },
      correct: optionId === 'A',
      score: optionId === 'A' ? 1 : 0,
      startedAt: initialSession.startedAt,
      submittedAt,
      durationMs: Date.parse(submittedAt) - Date.parse(initialSession.startedAt),
    });
    const firstAttempt = attemptFor(questionIds[0]!, 'A', '2026-08-05T00:00:10.000Z');
    const secondAttempt = attemptFor(questionIds[1]!, 'B', '2026-08-05T00:00:20.000Z');
    const submittedSession = (attempt: Attempt, currentIndex: number): StudySession => ({
      ...initialSession,
      currentIndex,
      responses: { [attempt.questionId]: attempt.response },
      submittedQuestionIds: [attempt.questionId],
      updatedAt: attempt.submittedAt,
    });
    await studyRepository.saveSession(initialSession, null);
    await studyRepository.submitAttempt(firstAttempt, submittedSession(firstAttempt, 0), expectedUpdatedAt);
    const progressBefore = await studyRepository.listProgress();
    const changesBefore = await userDatabase.changeLog.toArray();

    await expect(studyRepository.submitAttempt(
      secondAttempt,
      submittedSession(secondAttempt, 1),
      expectedUpdatedAt,
    )).rejects.toBeInstanceOf(StudySessionConflictError);
    expect(await studyRepository.getSession(initialSession.id)).toEqual(submittedSession(firstAttempt, 0));
    expect(await studyRepository.listAttempts()).toEqual([firstAttempt]);
    expect(await studyRepository.listProgress()).toEqual(progressBefore);
    expect(await userDatabase.changeLog.toArray()).toEqual(changesBefore);
    expect(backupService.preflight(await backupService.exportJson('0.1.0')).counts).toMatchObject({
      attempts: 1,
      sessions: 1,
      progresses: 1,
    });
  });

  it('treats a null expected version as create-only', async () => {
    const { studyRepository } = setup();
    const session: StudySession = {
      id: 'session-create-only',
      mode: 'practice',
      questionIds: ['cn408-2009-q01', 'cn408-2009-q02'],
      questionContentVersions: {
        'cn408-2009-q01': '2009.1',
        'cn408-2009-q02': '2009.1',
      },
      currentIndex: 0,
      responses: {},
      submittedQuestionIds: [],
      startedAt: '2026-08-05T00:00:00.000Z',
      updatedAt: '2026-08-05T00:00:00.000Z',
    };
    await studyRepository.saveSession(session, null);
    await expect(studyRepository.saveSession({
      ...session,
      currentIndex: 1,
      updatedAt: '2026-08-05T00:00:01.000Z',
    }, null)).rejects.toThrow(/changed after it was loaded/iu);
    expect(await studyRepository.getSession(session.id)).toEqual(session);
  });

  it.each([
    {
      name: 'submitted marker',
      mutate: (session: StudySession): StudySession => ({ ...session, submittedQuestionIds: [] }),
    },
    {
      name: 'submitted response',
      mutate: (session: StudySession): StudySession => ({ ...session, responses: {} }),
    },
    {
      name: 'submitted response value',
      mutate: (session: StudySession): StudySession => ({
        ...session,
        responses: { 'cn408-2009-q01': { type: 'choice', optionId: 'B' } },
      }),
    },
    {
      name: 'session mode',
      mutate: (session: StudySession): StudySession => ({ ...session, mode: 'review' }),
    },
    {
      name: 'question set',
      mutate: (session: StudySession): StudySession => ({
        ...session,
        questionIds: [...session.questionIds, 'cn408-2009-q02'],
        questionContentVersions: {
          ...session.questionContentVersions,
          'cn408-2009-q02': '2009.1',
        },
      }),
    },
    {
      name: 'question content version',
      mutate: (session: StudySession): StudySession => ({
        ...session,
        questionContentVersions: { ...session.questionContentVersions, 'cn408-2009-q01': '2009.2' },
      }),
    },
    {
      name: 'session start time',
      mutate: (session: StudySession): StudySession => ({
        ...session,
        startedAt: '2026-08-05T00:00:01.000Z',
      }),
    },
  ])('does not let a current token change the $name', async ({ mutate }) => {
    const { studyRepository, userDatabase, backupService } = setup();
    const startedAt = '2026-08-05T00:00:00.000Z';
    const submittedAt = '2026-08-05T00:00:10.000Z';
    const questionId = 'cn408-2009-q01';
    const response = { type: 'choice' as const, optionId: 'A' as const };
    const openSession: StudySession = {
      id: 'session-committed-transition',
      mode: 'practice',
      questionIds: [questionId],
      questionContentVersions: { [questionId]: '2009.1' },
      currentIndex: 0,
      responses: {},
      submittedQuestionIds: [],
      startedAt,
      updatedAt: startedAt,
    };
    const attempt: Attempt = {
      id: 'attempt-committed-transition',
      questionId,
      questionContentVersion: '2009.1',
      sessionId: openSession.id,
      mode: openSession.mode,
      response,
      correct: true,
      score: 1,
      startedAt,
      submittedAt,
      durationMs: 10_000,
    };
    const committedSession: StudySession = {
      ...openSession,
      responses: { [questionId]: response },
      submittedQuestionIds: [questionId],
      updatedAt: submittedAt,
    };
    await studyRepository.saveSession(openSession, null);
    await studyRepository.submitAttempt(attempt, committedSession, openSession.updatedAt);
    const changesBefore = await userDatabase.changeLog.toArray();
    const attemptsBefore = await studyRepository.listAttempts();
    const progressBefore = await studyRepository.listProgress();

    await expect(studyRepository.saveSession({
      ...mutate(committedSession),
      updatedAt: '2026-08-05T00:00:20.000Z',
    }, committedSession.updatedAt)).rejects.toBeInstanceOf(StudySessionConflictError);

    expect(await studyRepository.getSession(openSession.id)).toEqual(committedSession);
    expect(await studyRepository.listAttempts()).toEqual(attemptsBefore);
    expect(await studyRepository.listProgress()).toEqual(progressBefore);
    expect(await userDatabase.changeLog.toArray()).toEqual(changesBefore);
    expect(backupService.preflight(await backupService.exportJson('0.1.0')).counts).toMatchObject({
      attempts: 1,
      sessions: 1,
      progresses: 1,
    });
  });

  it.each(['save', 'submit'] as const)(
    'treats a completed session as a terminal state for a later %s',
    async (operation) => {
      const { studyRepository, userDatabase, backupService } = setup();
      const startedAt = '2026-08-05T00:00:00.000Z';
      const completedAt = '2026-08-05T00:00:10.000Z';
      const attemptedAt = '2026-08-05T00:00:20.000Z';
      const questionIds = ['cn408-2009-q01', 'cn408-2009-q02'];
      const openSession: StudySession = {
        id: `session-completed-${operation}`,
        mode: 'practice',
        questionIds,
        questionContentVersions: Object.fromEntries(questionIds.map((id) => [id, '2009.1'])),
        currentIndex: 0,
        responses: {},
        submittedQuestionIds: [],
        startedAt,
        updatedAt: startedAt,
      };
      const completedSession: StudySession = {
        ...openSession,
        completedAt,
        updatedAt: completedAt,
      };
      await studyRepository.saveSession(openSession, null);
      await studyRepository.saveSession(completedSession, openSession.updatedAt);
      const changesBefore = await userDatabase.changeLog.toArray();

      if (operation === 'save') {
        await expect(studyRepository.saveSession({
          ...completedSession,
          updatedAt: attemptedAt,
        }, completedSession.updatedAt)).rejects.toBeInstanceOf(StudySessionConflictError);
      } else {
        const response = { type: 'choice' as const, optionId: 'A' as const };
        const attempt: Attempt = {
          id: 'attempt-after-completion',
          questionId: questionIds[0]!,
          questionContentVersion: '2009.1',
          sessionId: completedSession.id,
          mode: completedSession.mode,
          response,
          correct: true,
          score: 1,
          startedAt,
          submittedAt: attemptedAt,
          durationMs: 20_000,
        };
        await expect(studyRepository.submitAttempt(attempt, {
          ...completedSession,
          responses: { [attempt.questionId]: response },
          submittedQuestionIds: [attempt.questionId],
          updatedAt: attemptedAt,
        }, completedSession.updatedAt)).rejects.toBeInstanceOf(StudySessionConflictError);
      }

      expect(await studyRepository.getSession(completedSession.id)).toEqual(completedSession);
      expect(await studyRepository.listAttempts()).toEqual([]);
      expect(await studyRepository.listProgress()).toEqual([]);
      expect(await userDatabase.changeLog.toArray()).toEqual(changesBefore);
      expect(backupService.preflight(await backupService.exportJson('0.1.0')).counts).toMatchObject({
        attempts: 0,
        sessions: 1,
        progresses: 0,
      });
    },
  );

  it('rejects missing-row updates with a typed conflict and no partial writes', async () => {
    const { studyRepository, userDatabase, backupService } = setup();
    const expectedUpdatedAt = '2026-08-05T00:00:00.000Z';
    const updatedAt = '2026-08-05T00:00:01.000Z';
    const response = { type: 'choice' as const, optionId: 'A' as const };
    const missingSave: StudySession = {
      id: 'missing-save-session',
      mode: 'practice',
      questionIds: ['cn408-2009-q01'],
      questionContentVersions: { 'cn408-2009-q01': '2009.1' },
      currentIndex: 0,
      responses: {},
      submittedQuestionIds: [],
      startedAt: expectedUpdatedAt,
      updatedAt,
    };
    const missingSubmit: StudySession = {
      ...missingSave,
      id: 'missing-submit-session',
      responses: { 'cn408-2009-q01': response },
      submittedQuestionIds: ['cn408-2009-q01'],
    };
    const attempt: Attempt = {
      id: 'missing-submit-attempt',
      questionId: 'cn408-2009-q01',
      questionContentVersion: '2009.1',
      sessionId: missingSubmit.id,
      mode: missingSubmit.mode,
      response,
      correct: true,
      score: 1,
      startedAt: expectedUpdatedAt,
      submittedAt: updatedAt,
      durationMs: 1_000,
    };

    await expect(studyRepository.saveSession(missingSave, expectedUpdatedAt))
      .rejects.toBeInstanceOf(StudySessionConflictError);
    await expect(studyRepository.submitAttempt(attempt, missingSubmit, expectedUpdatedAt))
      .rejects.toBeInstanceOf(StudySessionConflictError);

    expect(await userDatabase.sessions.toArray()).toEqual([]);
    expect(await studyRepository.listAttempts()).toEqual([]);
    expect(await studyRepository.listProgress()).toEqual([]);
    expect(await userDatabase.changeLog.toArray()).toEqual([]);
    expect(backupService.preflight(await backupService.exportJson('0.1.0')).counts).toMatchObject({
      attempts: 0,
      sessions: 0,
      progresses: 0,
    });
  });

  it('requires every accepted session update to advance its version timestamp', async () => {
    const { studyRepository } = setup();
    const session: StudySession = {
      id: 'session-monotonic-version',
      mode: 'practice',
      questionIds: ['cn408-2009-q01', 'cn408-2009-q02'],
      questionContentVersions: {
        'cn408-2009-q01': '2009.1',
        'cn408-2009-q02': '2009.1',
      },
      currentIndex: 0,
      responses: {},
      submittedQuestionIds: [],
      startedAt: '2026-08-05T00:00:00.000Z',
      updatedAt: '2026-08-05T00:00:00.000Z',
    };
    await studyRepository.saveSession(session, null);
    await expect(studyRepository.saveSession({
      ...session,
      currentIndex: 1,
    }, session.updatedAt)).rejects.toThrow(/advance/iu);
    expect(await studyRepository.getSession(session.id)).toEqual(session);

    const updated = {
      ...session,
      currentIndex: 1,
      updatedAt: '2026-08-05T00:00:00.001Z',
    };
    await studyRepository.saveSession(updated, session.updatedAt);
    expect(await studyRepository.getSession(session.id)).toEqual(updated);
  });

  it('rejects an atomic submission whose attempt and session disagree', async () => {
    const { studyRepository } = setup();
    const attempt: Attempt = {
      id: 'attempt-mismatch',
      questionId: 'cn408-2009-q01',
      questionContentVersion: '2009.1',
      sessionId: 'session-1',
      mode: 'practice',
      response: { type: 'choice', optionId: 'A' },
      correct: false,
      score: 0,
      startedAt: '2026-08-05T00:00:00.000Z',
      submittedAt: '2026-08-05T00:00:10.000Z',
      durationMs: 10_000,
    };
    const session: StudySession = {
      id: 'different-session',
      mode: attempt.mode,
      questionIds: [attempt.questionId],
      questionContentVersions: { [attempt.questionId]: attempt.questionContentVersion },
      currentIndex: 0,
      responses: { [attempt.questionId]: attempt.response },
      submittedQuestionIds: [attempt.questionId],
      startedAt: attempt.startedAt,
      updatedAt: attempt.submittedAt,
    };

    await expect(studyRepository.submitAttempt(attempt, session, null)).rejects.toThrow(/study session/);
    expect(await studyRepository.listAttempts()).toEqual([]);
    expect(await studyRepository.getSession(session.id)).toBeUndefined();
  });

  it('rolls back the attempt and progress if the session write fails', async () => {
    const { studyRepository } = setup();
    const attempt: Attempt = {
      id: 'attempt-rollback',
      questionId: 'cn408-2009-q01',
      questionContentVersion: '2009.1',
      sessionId: 'session-rollback',
      mode: 'practice',
      response: { type: 'choice', optionId: 'A' },
      correct: true,
      score: 1,
      startedAt: '2026-08-05T00:00:00.000Z',
      submittedAt: '2026-08-05T00:00:10.000Z',
      durationMs: 10_000,
    };
    const invalidSession = {
      mode: 'practice',
      questionIds: [attempt.questionId],
      questionContentVersions: { [attempt.questionId]: attempt.questionContentVersion },
      currentIndex: 0,
      responses: { [attempt.questionId]: attempt.response },
      submittedQuestionIds: [attempt.questionId],
      startedAt: attempt.startedAt,
      updatedAt: attempt.submittedAt,
    } as unknown as StudySession;

    await expect(studyRepository.submitAttempt(attempt, invalidSession, null)).rejects.toThrow();
    expect(await studyRepository.listAttempts()).toEqual([]);
    expect(await studyRepository.listProgress()).toEqual([]);
  });

  it('persists sessions, notes and collections', async () => {
    const { studyRepository, annotationRepository } = setup();
    const session: StudySession = {
      id: 'session-1',
      mode: 'practice',
      questionIds: ['cn408-2009-q01'],
      questionContentVersions: { 'cn408-2009-q01': '2009.1' },
      currentIndex: 0,
      responses: {},
      submittedQuestionIds: [],
      startedAt: '2026-08-05T00:00:00.000Z',
      updatedAt: '2026-08-05T00:00:00.000Z',
    };
    const note: Note = {
      id: 'note-1',
      questionId: 'cn408-2009-q01',
      body: '复习线性表',
      createdAt: session.startedAt,
      updatedAt: session.updatedAt,
    };
    await studyRepository.saveSession(session, null);
    await annotationRepository.saveNote(note);
    await annotationRepository.setCollected(note.questionId, true, note.updatedAt);
    expect(await studyRepository.getLatestOpenSession()).toEqual(session);
    expect(await annotationRepository.getNote(note.questionId)).toEqual(note);
    expect(await annotationRepository.isCollected(note.questionId)).toBe(true);
  });

  it('reads content assets and rejects filters that require user study state', async () => {
    const { contentDatabase, contentRepository } = setup();
    const assets: AssetRef[] = [
      {
        id: 'cn408-2010/source-questions-page-2',
        path: '/content/2010/source/questions-2.png',
        mimeType: 'image/png',
        sha256: 'b'.repeat(64),
        sourcePage: 2,
      },
      {
        id: 'cn408-2009/source-questions-page-1',
        path: '/content/2009/source/questions-1.png',
        mimeType: 'image/png',
        sha256: 'a'.repeat(64),
        sourcePage: 1,
      },
    ];
    await contentDatabase.assets.bulkPut(assets);

    expect(await contentRepository.getAsset(assets[0]!.id)).toEqual(assets[0]);
    expect(await contentRepository.getAsset('missing')).toBeUndefined();
    expect(await contentRepository.listAssets()).toEqual([assets[1], assets[0]]);
    await expect(contentRepository.listQuestions({ onlyWrong: true } as never)).rejects.toThrow(
      'cannot filter user study state: onlyWrong',
    );
  });

  it('stores scoped content review evidence without changing content status', async () => {
    const { contentDatabase, contentReviewRepository } = setup();
    await contentDatabase.packs.put(reviewManifest);
    const input = {
      packId: reviewManifest.id,
      packHash: reviewManifest.sha256,
      contentVersion: reviewManifest.contentVersion,
      questionId: reviewQuestion.id,
      questionContentVersion: reviewQuestion.contentVersion,
      checks: emptyContentReviewChecks(),
      reviewer: '',
      issueNote: '',
    };
    const timestamp = '2026-08-07T00:00:00.000Z';

    const draft = await contentReviewRepository.saveDraft(input, timestamp, null);
    expect(draft).toMatchObject({ decision: 'pending', reviewer: '', packHash: reviewManifest.sha256 });
    await expect(contentReviewRepository.approve(input, timestamp, draft.updatedAt)).rejects.toThrow('全部核对项');
    await expect(contentReviewRepository.reject(input, timestamp, draft.updatedAt)).rejects.toThrow('复核人');
    await expect(contentReviewRepository.saveDraft({
      ...input,
      questionContentVersion: 'different-version',
    }, timestamp, draft.updatedAt)).rejects.toThrow('版本不一致');

    const checks = Object.fromEntries(CONTENT_REVIEW_CHECKS.map((check) => [check, true])) as ContentReviewChecks;
    const approvedAt = '2026-08-07T00:00:01.000Z';
    const approved = await contentReviewRepository.approve(
      { ...input, checks, reviewer: '个人复核' },
      approvedAt,
      draft.updatedAt,
    );
    expect(approved).toMatchObject({ decision: 'approved', reviewer: '个人复核', reviewedAt: approvedAt });
    expect(await contentReviewRepository.list({
      packId: reviewManifest.id,
      packHash: reviewManifest.sha256,
      contentVersion: reviewManifest.contentVersion,
    })).toEqual([approved]);
    expect(await contentReviewRepository.get({
      packId: reviewManifest.id,
      packHash: 'b'.repeat(64),
      contentVersion: reviewManifest.contentVersion,
    }, reviewQuestion.id)).toBeUndefined();
    expect(await contentDatabase.packs.get(reviewManifest.id)).toEqual(reviewManifest);

    const ledger = JSON.parse(await contentReviewRepository.exportLedger(reviewManifest, [reviewQuestion], timestamp));
    expect(ledger).toMatchObject({ summary: { total: 1, approved: 1, rejected: 0, pending: 0 }, pack: { sha256: reviewManifest.sha256 } });
  });

  it('rejects a stale draft after another tab approves without downgrading the ledger', async () => {
    const { contentReviewRepository, userDatabase } = setup();
    const base = await contentReviewRepository.saveDraft(reviewInput, '2026-08-07T00:00:00.000Z', null);
    const approved = await contentReviewRepository.approve({
      ...reviewInput,
      checks: completeReviewChecks,
      reviewer: 'tab-a-reviewer',
    }, '2026-08-07T00:00:01.000Z', base.updatedAt);
    const changeLogBeforeConflict = await userDatabase.changeLog.toArray();

    await expect(contentReviewRepository.saveDraft({
      ...reviewInput,
      issueNote: 'tab-b-stale-draft',
    }, '2026-08-07T00:00:02.000Z', base.updatedAt)).rejects.toBeInstanceOf(ContentReviewConflictError);

    expect(await contentReviewRepository.get(reviewScope, reviewQuestion.id)).toEqual(approved);
    expect(await userDatabase.changeLog.toArray()).toEqual(changeLogBeforeConflict);
    const ledger = JSON.parse(await contentReviewRepository.exportLedger(
      reviewManifest,
      [reviewQuestion],
      '2026-08-07T00:00:03.000Z',
    ));
    expect(ledger).toMatchObject({ summary: { approved: 1, rejected: 0, pending: 0 } });
  });

  it('treats a null content-review token as create-only', async () => {
    const { contentReviewRepository, userDatabase } = setup();
    const base = await contentReviewRepository.saveDraft(reviewInput, '2026-08-07T00:00:00.000Z', null);
    const changeLogBeforeConflict = await userDatabase.changeLog.toArray();

    await expect(contentReviewRepository.saveDraft({
      ...reviewInput,
      issueNote: 'must-not-overwrite',
    }, '2026-08-07T00:00:01.000Z', null)).rejects.toBeInstanceOf(ContentReviewConflictError);

    expect(await contentReviewRepository.get(reviewScope, reviewQuestion.id)).toEqual(base);
    expect(await userDatabase.changeLog.toArray()).toEqual(changeLogBeforeConflict);
  });

  it('rejects a content-review update when the expected current row is missing', async () => {
    const { contentReviewRepository, userDatabase } = setup();

    await expect(contentReviewRepository.saveDraft(
      reviewInput,
      '2026-08-07T00:00:01.000Z',
      '2026-08-07T00:00:00.000Z',
    )).rejects.toBeInstanceOf(ContentReviewConflictError);

    expect(await contentReviewRepository.get(reviewScope, reviewQuestion.id)).toBeUndefined();
    expect(await userDatabase.changeLog.toArray()).toEqual([]);
  });

  it('requires a content-review update token to advance strictly', async () => {
    const { contentReviewRepository, userDatabase } = setup();
    const base = await contentReviewRepository.saveDraft(reviewInput, '2026-08-07T00:00:00.000Z', null);
    const changeLogBeforeConflict = await userDatabase.changeLog.toArray();

    await expect(contentReviewRepository.saveDraft({
      ...reviewInput,
      issueNote: 'same-token-update',
    }, base.updatedAt, base.updatedAt)).rejects.toBeInstanceOf(ContentReviewConflictError);

    expect(await contentReviewRepository.get(reviewScope, reviewQuestion.id)).toEqual(base);
    expect(await userDatabase.changeLog.toArray()).toEqual(changeLogBeforeConflict);
  });

  it.each([
    {
      decision: 'approve',
      input: { ...reviewInput, checks: completeReviewChecks, reviewer: 'stale-reviewer' },
    },
    {
      decision: 'reject',
      input: { ...reviewInput, reviewer: 'stale-reviewer', issueNote: 'stale-rejection' },
    },
  ] as const)('rejects a stale $decision decision without replacing a newer draft', async ({ decision, input }) => {
    const { contentReviewRepository, userDatabase } = setup();
    const base = await contentReviewRepository.saveDraft(reviewInput, '2026-08-07T00:00:00.000Z', null);
    const current = await contentReviewRepository.saveDraft({
      ...reviewInput,
      issueNote: 'newer-tab-draft',
    }, '2026-08-07T00:00:01.000Z', base.updatedAt);
    const changeLogBeforeConflict = await userDatabase.changeLog.toArray();

    await expect(contentReviewRepository[decision](
      input,
      '2026-08-07T00:00:02.000Z',
      base.updatedAt,
    )).rejects.toBeInstanceOf(ContentReviewConflictError);

    expect(await contentReviewRepository.get(reviewScope, reviewQuestion.id)).toEqual(current);
    expect(await userDatabase.changeLog.toArray()).toEqual(changeLogBeforeConflict);
  });

  it('preflights and restores a backup without touching data on invalid JSON', async () => {
    const { userDatabase, backupService } = setup();
    await userDatabase.settings.put({ key: 'theme', value: 'dark' });
    const json = await backupService.exportJson('0.1.0');
    const preview = backupService.preflight(json);
    expect(preview.counts.settings).toBe(1);
    await userDatabase.settings.clear();
    await backupService.importJson(json, 'replace');
    expect(await userDatabase.settings.get('theme')).toEqual({ key: 'theme', value: 'dark' });
    expect(() => backupService.preflight('{bad')).toThrow('valid JSON');
    expect(await userDatabase.settings.count()).toBe(1);
  });

  it('rejects structurally invalid backup data before replace clears existing data', async () => {
    const { userDatabase, backupService } = setup();
    await userDatabase.settings.put({ key: 'keep-me', value: true });
    const invalid = JSON.stringify({
      schemaVersion: 1,
      exportedAt: '2026-08-05T00:00:00.000Z',
      appVersion: '0.1.0',
      data: {
        attempts: [{ id: 'missing-required-fields' }],
        sessions: [],
        progresses: [],
        notes: [],
        collections: [],
        settings: [],
      },
    });

    await expect(backupService.importJson(invalid, 'replace')).rejects.toThrow('Backup data is invalid');
    expect(await userDatabase.settings.get('keep-me')).toEqual({ key: 'keep-me', value: true });
  });

  it('refuses to export malformed reserved review settings', async () => {
    const { userDatabase, backupService } = setup();
    await userDatabase.settings.put({ key: `${CONTENT_REVIEW_SETTING_PREFIX}broken`, value: { decision: 'approved' } });
    await expect(backupService.exportJson('0.1.0')).rejects.toThrow('Backup data is invalid');
  });

  it('accepts a backup whose session, attempt and progress relationships are consistent', () => {
    const { backupService } = setup();
    const preview = backupService.preflight(JSON.stringify(createSemanticBackupFixture()));

    expect(preview.counts).toMatchObject({ attempts: 1, sessions: 1, progresses: 1 });
  });

  it.each(semanticCorruptionCases)('rejects $name before replacing user data', ({ mutate, message }) => {
    const { backupService } = setup();
    const backup = createSemanticBackupFixture();
    mutate(backup);

    expect(() => backupService.preflight(JSON.stringify(backup))).toThrow(message);
  });

  it('does not clear existing data when replace import fails semantic validation', async () => {
    const { userDatabase, backupService } = setup();
    await userDatabase.settings.put({ key: 'keep-me', value: true });
    const backup = createSemanticBackupFixture();
    backup.data.sessions[0]!.responses = {};

    await expect(backupService.importJson(JSON.stringify(backup), 'replace')).rejects.toThrow(
      /submittedQuestionIds.*response/iu,
    );
    expect(await userDatabase.settings.get('keep-me')).toEqual({ key: 'keep-me', value: true });
  });
});
