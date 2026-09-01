import 'fake-indexeddb/auto';
import {
  createFixedMockExamBlueprint,
  type ContentPackManifest,
  type Question,
  type StudySession,
} from '@408os/domain';
import Dexie from 'dexie';
import { afterEach, describe, expect, it } from 'vitest';
import { UserDatabase } from './databases';
import { createStorage } from './index';
import { DexieMockExamRepository } from './mock-repository';

const opened: ReturnType<typeof createStorage>[] = [];
const startedAt = '2026-08-16T00:00:00.000Z';
const submittedAt = '2026-08-16T01:00:00.000Z';

function setup() {
  const suffix = crypto.randomUUID();
  const storage = createStorage({ content: `mock-v3-content-${suffix}`, user: `mock-v3-user-${suffix}` });
  opened.push(storage);
  return {
    ...storage,
    mockRepository: new DexieMockExamRepository(storage.userDatabase),
  };
}

const source = {
  question: {
    publisher: 'source',
    title: 'questions',
    url: 'https://example.com/questions.pdf',
    fileName: 'questions.pdf',
    sha256: 'a'.repeat(64),
    pages: [1],
    locator: 'page 1',
  },
  answer: {
    publisher: 'source',
    title: 'answers',
    url: 'https://example.com/answers.pdf',
    fileName: 'answers.pdf',
    sha256: 'b'.repeat(64),
    pages: [1],
    locator: 'page 1',
  },
  crosschecks: [],
  redistribution: 'unknown' as const,
};

function question(number: number): Question {
  const base = {
    id: `cn408-2009-q${String(number).padStart(2, '0')}`,
    year: 2009,
    number,
    subject: number <= 10 ? 'data-structures' as const : 'computer-organization' as const,
    stem: [{ type: 'text' as const, text: `Question ${number}` }],
    explanation: [],
    hints: [],
    knowledgePointIds: [],
    assetIds: [],
    source,
    contentVersion: '2009.1',
    reviewStatus: 'verified' as const,
  };

  if (number <= 40) {
    return {
      ...base,
      kind: 'single-choice',
      options: ['A', 'B', 'C', 'D'].map((id) => ({
        id: id as 'A' | 'B' | 'C' | 'D',
        content: [{ type: 'text' as const, text: id }],
      })),
      answer: { type: 'choice', optionId: 'A' },
    };
  }

  return {
    ...base,
    kind: 'comprehensive',
    answer: {
      type: 'comprehensive',
      maxScore: 10,
      rubric: [{ id: `r-${number}`, description: '评分点', points: 10 }],
      reference: [],
    },
  };
}

const questions = Array.from({ length: 47 }, (_, index) => question(index + 1));
const manifest: ContentPackManifest = {
  id: 'cn408-2009',
  schemaVersion: 1,
  contentVersion: '2009.1',
  title: '2009',
  year: 2009,
  questionCount: 47,
  createdAt: startedAt,
  sha256: 'c'.repeat(64),
  reviewStatus: 'verified',
};

afterEach(async () => {
  await Promise.all(opened.splice(0).map(async ({ contentDatabase, userDatabase }) => {
    await contentDatabase.delete();
    await userDatabase.delete();
  }));
});

describe('408-user schema v3 mock exam contracts', () => {
  it('upgrades an exact v2 database without rewriting existing evidence', async () => {
    const name = `mock-v3-upgrade-${crypto.randomUUID()}`;
    const legacy = new Dexie(name);
    let upgraded: UserDatabase | undefined;
    const session: StudySession = {
      id: 'existing-session',
      mode: 'practice',
      questionIds: ['q1'],
      questionContentVersions: { q1: '2009.1' },
      currentIndex: 0,
      responses: {},
      submittedQuestionIds: [],
      startedAt,
      updatedAt: startedAt,
    };

    try {
      legacy.version(1).stores({
        attempts: 'id, questionId, sessionId, submittedAt, correct',
        sessions: 'id, mode, updatedAt, completedAt',
        progresses: 'questionId, mastery, lastCorrect, lastAttemptAt, nextReviewAt',
        notes: 'id, questionId, updatedAt',
        collections: 'questionId, createdAt',
        settings: 'key',
        changeLog: 'id, [entityType+entityId], changedAt',
      });
      legacy.version(2).stores({
        versionedProgresses: '[questionId+questionContentVersion], questionId, questionContentVersion, mastery, lastCorrect, lastAttemptAt, nextReviewAt',
      });
      await legacy.open();
      await legacy.table('sessions').put(session);
      await legacy.table('settings').put({ key: 'preserved', value: { nested: true } });
      legacy.close();

      upgraded = new UserDatabase(name);
      await upgraded.open();

      expect(upgraded.verno).toBe(3);
      expect(upgraded.tables.map((table) => table.name)).toContain('mockExams');
      expect(await upgraded.sessions.get(session.id)).toEqual(session);
      expect(await upgraded.settings.get('preserved')).toEqual({ key: 'preserved', value: { nested: true } });
      expect(await upgraded.mockExams.toArray()).toEqual([]);
    } finally {
      legacy.close();
      upgraded?.close();
      await Dexie.delete(name);
    }
  });

  it('creates exam and session atomically only from a verified fixed paper', async () => {
    const { mockRepository, userDatabase } = setup();

    await expect(mockRepository.createFixedExam({
      examId: 'exam-rejected',
      sessionId: 'session-rejected',
      manifest: { ...manifest, reviewStatus: 'needs-review' },
      questions,
      startedAt,
    })).rejects.toThrow(/verified/iu);
    expect(await userDatabase.sessions.count()).toBe(0);
    expect(await userDatabase.mockExams.count()).toBe(0);

    const created = await mockRepository.createFixedExam({
      examId: 'exam-1',
      sessionId: 'session-1',
      manifest,
      questions,
      startedAt,
    });

    expect(created.exam).toMatchObject({
      id: 'exam-1',
      sessionId: 'session-1',
      status: 'in-progress',
      startedAt,
      updatedAt: startedAt,
      blueprint: createFixedMockExamBlueprint(manifest, questions),
    });
    expect(created.exam.questionDurationsMs).toEqual(Object.fromEntries(questions.map((entry) => [entry.id, 0])));
    expect(created.session).toMatchObject({
      id: 'session-1',
      mode: 'mock',
      questionIds: questions.map((entry) => entry.id),
      questionContentVersions: Object.fromEntries(questions.map((entry) => [entry.id, entry.contentVersion])),
    });
  });

  it('prevents the generic study repository from bypassing mock lifecycle writes', async () => {
    const { mockRepository, studyRepository, userDatabase } = setup();
    const { session } = await mockRepository.createFixedExam({
      examId: 'exam-guard',
      sessionId: 'session-guard',
      manifest,
      questions,
      startedAt,
    });

    await expect(studyRepository.saveSession({
      ...session,
      responses: { [questions[0]!.id]: { type: 'choice', optionId: 'A' } },
      updatedAt: submittedAt,
    }, session.updatedAt)).rejects.toThrow(/mock/iu);
    expect((await userDatabase.sessions.get(session.id))?.responses).toEqual({});
  });

  it('rejects a stale draft without overwriting a newer tab', async () => {
    const { mockRepository, userDatabase } = setup();
    const created = await mockRepository.createFixedExam({
      examId: 'exam-stale-draft',
      sessionId: 'session-stale-draft',
      manifest,
      questions,
      startedAt,
    });
    const fresh = await mockRepository.saveDraft({
      examId: created.exam.id,
      questionId: questions[0]!.id,
      response: { type: 'choice', optionId: 'A' },
      currentIndex: 0,
      durationMs: 1_000,
      expectedUpdatedAt: created.exam.updatedAt,
      updatedAt: '2026-08-16T00:01:00.000Z',
    });

    await expect(mockRepository.saveDraft({
      examId: created.exam.id,
      questionId: questions[0]!.id,
      response: { type: 'choice', optionId: 'B' },
      currentIndex: 1,
      durationMs: 2_000,
      expectedUpdatedAt: created.exam.updatedAt,
      updatedAt: '2026-08-16T00:02:00.000Z',
    })).rejects.toThrow(/changed|conflict|stale/iu);

    expect(await mockRepository.getExam(created.exam.id)).toEqual(fresh);
    expect((await userDatabase.sessions.get(created.session.id))?.responses[questions[0]!.id]).toEqual({
      type: 'choice',
      optionId: 'A',
    });
  });

  it('rejects stale submit and self-score transitions without partial writes', async () => {
    const { mockRepository, userDatabase } = setup();
    const created = await mockRepository.createFixedExam({
      examId: 'exam-stale-transition',
      sessionId: 'session-stale-transition',
      manifest,
      questions,
      startedAt,
    });
    const drafted = await mockRepository.saveDraft({
      examId: created.exam.id,
      questionId: questions[0]!.id,
      response: { type: 'choice', optionId: 'A' },
      currentIndex: 0,
      durationMs: 1_000,
      expectedUpdatedAt: created.exam.updatedAt,
      updatedAt: '2026-08-16T00:01:00.000Z',
    });

    await expect(mockRepository.submitExam({
      examId: created.exam.id,
      questions,
      expectedUpdatedAt: created.exam.updatedAt,
      submittedAt,
      reason: 'manual',
    })).rejects.toThrow(/changed|conflict|stale/iu);
    expect(await userDatabase.attempts.count()).toBe(0);
    expect(await userDatabase.mockExams.get(created.exam.id)).toMatchObject({ status: 'in-progress' });

    const submitted = await mockRepository.submitExam({
      examId: created.exam.id,
      questions,
      expectedUpdatedAt: drafted.exam.updatedAt,
      submittedAt,
      reason: 'manual',
    });
    const firstScore = await mockRepository.selfScoreComprehensive({
      examId: created.exam.id,
      questionId: questions[40]!.id,
      selfScore: 4,
      checkedRubricIds: ['r-41'],
      questions,
      expectedUpdatedAt: submitted.exam.updatedAt,
      assessedAt: '2026-08-16T01:10:00.000Z',
    });

    await expect(mockRepository.selfScoreComprehensive({
      examId: created.exam.id,
      questionId: questions[41]!.id,
      selfScore: 5,
      checkedRubricIds: ['r-42'],
      questions,
      expectedUpdatedAt: submitted.exam.updatedAt,
      assessedAt: '2026-08-16T01:11:00.000Z',
    })).rejects.toThrow(/changed|conflict|stale/iu);
    expect(await mockRepository.getExam(created.exam.id)).toEqual(firstScore);
    expect(await userDatabase.attempts.get(`mock:${created.exam.id}:${questions[41]!.id}`)).toBeUndefined();
  });

  it('observes exam and list changes through repository subscriptions', async () => {
    const { mockRepository } = setup();
    const created = await mockRepository.createFixedExam({
      examId: 'exam-observed',
      sessionId: 'session-observed',
      manifest,
      questions,
      startedAt,
    });
    let resolveExam!: (value: string) => void;
    let resolveList!: (value: string) => void;
    const examUpdated = new Promise<string>((resolve) => { resolveExam = resolve; });
    const listUpdated = new Promise<string>((resolve) => { resolveList = resolve; });
    const stopExam = mockRepository.subscribeExam(created.exam.id, (value) => {
      if (value?.exam.updatedAt !== created.exam.updatedAt) resolveExam(value?.exam.updatedAt ?? 'missing');
    });
    const stopList = mockRepository.subscribeExams((value) => {
      if (value[0]?.updatedAt !== created.exam.updatedAt) resolveList(value[0]?.updatedAt ?? 'missing');
    });

    const updatedAt = '2026-08-16T00:01:00.000Z';
    await mockRepository.saveDraft({
      examId: created.exam.id,
      questionId: questions[0]!.id,
      response: { type: 'choice', optionId: 'A' },
      currentIndex: 0,
      durationMs: 1_000,
      expectedUpdatedAt: created.exam.updatedAt,
      updatedAt,
    });

    await expect(examUpdated).resolves.toBe(updatedAt);
    await expect(listUpdated).resolves.toBe(updatedAt);
    stopExam();
    stopList();
  });

  it('freezes submitted answers, scores objective responses once, and keeps submit idempotent', async () => {
    const { mockRepository, userDatabase } = setup();
    const created = await mockRepository.createFixedExam({
      examId: 'exam-submit',
      sessionId: 'session-submit',
      manifest,
      questions,
      startedAt,
    });
    const firstDraft = await mockRepository.saveDraft({
      examId: 'exam-submit',
      questionId: questions[0]!.id,
      response: { type: 'choice', optionId: 'A' },
      currentIndex: 1,
      durationMs: 12_000,
      expectedUpdatedAt: created.exam.updatedAt,
      updatedAt: '2026-08-16T00:10:00.000Z',
    });
    const secondDraft = await mockRepository.saveDraft({
      examId: 'exam-submit',
      questionId: questions[1]!.id,
      response: { type: 'choice', optionId: 'B' },
      currentIndex: 2,
      durationMs: 8_000,
      expectedUpdatedAt: firstDraft.exam.updatedAt,
      updatedAt: '2026-08-16T00:11:00.000Z',
    });

    const first = await mockRepository.submitExam({
      examId: 'exam-submit',
      questions,
      expectedUpdatedAt: secondDraft.exam.updatedAt,
      submittedAt,
      reason: 'manual',
    });
    const second = await mockRepository.submitExam({
      examId: 'exam-submit',
      questions,
      expectedUpdatedAt: first.exam.updatedAt,
      submittedAt: '2026-08-16T01:01:00.000Z',
      reason: 'timeout',
    });

    expect(first.exam).toMatchObject({
      status: 'submitted',
      submittedAt,
      submissionReason: 'manual',
      score: {
        objectiveScore: 2,
        objectiveAnswered: 2,
        comprehensiveSelfScored: 0,
        fullySelfScored: false,
      },
    });
    expect(second).toEqual(first);
    expect(await userDatabase.attempts.count()).toBe(2);
    expect(await userDatabase.versionedProgresses.count()).toBe(2);
    expect((await userDatabase.attempts.get(`mock:exam-submit:${questions[0]!.id}`))?.durationMs).toBe(12_000);

    await expect(mockRepository.saveDraft({
      examId: 'exam-submit',
      questionId: questions[0]!.id,
      response: { type: 'choice', optionId: 'B' },
      currentIndex: 0,
      durationMs: 13_000,
      expectedUpdatedAt: first.exam.updatedAt,
      updatedAt: '2026-08-16T01:02:00.000Z',
    })).rejects.toThrow(/submitted|in-progress|交卷/iu);
    expect((await userDatabase.sessions.get('session-submit'))?.responses[questions[0]!.id]).toEqual({
      type: 'choice',
      optionId: 'A',
    });
  });

  it('allows post-submit comprehensive self-scoring without changing answer text', async () => {
    const { mockRepository, userDatabase } = setup();
    let current = await mockRepository.createFixedExam({
      examId: 'exam-score',
      sessionId: 'session-score',
      manifest,
      questions,
      startedAt,
    });
    for (const [offset, entry] of questions.slice(40).entries()) {
      current = await mockRepository.saveDraft({
        examId: 'exam-score',
        questionId: entry.id,
        response: { type: 'comprehensive', text: `answer-${entry.number}`, checkedRubricIds: [] },
        currentIndex: 40 + offset,
        durationMs: 60_000 + offset,
        expectedUpdatedAt: current.exam.updatedAt,
        updatedAt: `2026-08-16T00:${String(20 + offset).padStart(2, '0')}:00.000Z`,
      });
    }
    const submitted = await mockRepository.submitExam({
      examId: 'exam-score',
      questions,
      expectedUpdatedAt: current.exam.updatedAt,
      submittedAt,
      reason: 'manual',
    });

    let result = submitted;
    for (const [offset, entry] of questions.slice(40).entries()) {
      result = await mockRepository.selfScoreComprehensive({
        examId: 'exam-score',
        questionId: entry.id,
        selfScore: offset + 4,
        checkedRubricIds: [`r-${entry.number}`],
        questions,
        expectedUpdatedAt: result.exam.updatedAt,
        assessedAt: `2026-08-16T01:${String(10 + offset).padStart(2, '0')}:00.000Z`,
      });
    }

    expect(result?.exam).toMatchObject({
      status: 'completed',
      score: {
        comprehensiveScore: 49,
        comprehensiveSelfScored: 7,
        fullySelfScored: true,
        pendingSelfScoreQuestionIds: [],
      },
    });
    expect(result?.session.responses[questions[40]!.id]).toMatchObject({
      text: 'answer-41',
      selfScore: 4,
      checkedRubricIds: ['r-41'],
    });
    expect(await userDatabase.attempts.count()).toBe(7);

    const idempotent = await mockRepository.selfScoreComprehensive({
      examId: 'exam-score',
      questionId: questions[40]!.id,
      selfScore: 4,
      checkedRubricIds: ['r-41'],
      questions,
      expectedUpdatedAt: result.exam.updatedAt,
      assessedAt: '2026-08-16T02:00:00.000Z',
    });
    expect(idempotent).toEqual(result);
    await expect(mockRepository.selfScoreComprehensive({
      examId: 'exam-score',
      questionId: questions[40]!.id,
      selfScore: 3,
      checkedRubricIds: ['r-41'],
      questions,
      expectedUpdatedAt: result.exam.updatedAt,
      assessedAt: '2026-08-16T02:01:00.000Z',
    })).rejects.toThrow(/already|immutable|已完成|自评/iu);
  });

  it('rejects question drift before an atomic submission writes attempts or completion state', async () => {
    const { mockRepository, userDatabase } = setup();
    const created = await mockRepository.createFixedExam({
      examId: 'exam-drift',
      sessionId: 'session-drift',
      manifest,
      questions,
      startedAt,
    });
    const drafted = await mockRepository.saveDraft({
      examId: 'exam-drift',
      questionId: questions[0]!.id,
      response: { type: 'choice', optionId: 'A' },
      currentIndex: 0,
      durationMs: 1_000,
      expectedUpdatedAt: created.exam.updatedAt,
      updatedAt: '2026-08-16T00:01:00.000Z',
    });
    const drifted = questions.map((entry, index) => (
      index === 0 ? { ...entry, contentVersion: '2009.2' } : entry
    ));

    await expect(mockRepository.submitExam({
      examId: 'exam-drift',
      questions: drifted,
      expectedUpdatedAt: drafted.exam.updatedAt,
      submittedAt,
      reason: 'manual',
    })).rejects.toThrow(/版本|version/iu);
    expect(await userDatabase.attempts.count()).toBe(0);
    expect(await userDatabase.versionedProgresses.count()).toBe(0);
    expect(await userDatabase.mockExams.get('exam-drift')).toMatchObject({ status: 'in-progress' });
    expect(await userDatabase.sessions.get('session-drift')).not.toHaveProperty('completedAt');
  });

  it('preserves one attempt per answered question under deterministic concurrent submission samples', async () => {
    const { mockRepository, userDatabase } = setup();
    let current = await mockRepository.createFixedExam({
      examId: 'exam-concurrent',
      sessionId: 'session-concurrent',
      manifest,
      questions,
      startedAt,
    });
    for (let index = 0; index < 24; index += 1) {
      current = await mockRepository.saveDraft({
        examId: 'exam-concurrent',
        questionId: questions[index]!.id,
        response: { type: 'choice', optionId: index % 3 === 0 ? 'B' : 'A' },
        currentIndex: index,
        durationMs: 1_000 + index,
        expectedUpdatedAt: current.exam.updatedAt,
        updatedAt: `2026-08-16T00:${String(index + 1).padStart(2, '0')}:00.000Z`,
      });
    }

    const [left, right] = await Promise.all([
      mockRepository.submitExam({ examId: 'exam-concurrent', questions, expectedUpdatedAt: current.exam.updatedAt, submittedAt, reason: 'manual' }),
      mockRepository.submitExam({ examId: 'exam-concurrent', questions, expectedUpdatedAt: current.exam.updatedAt, submittedAt, reason: 'manual' }),
    ]);

    expect(left).toEqual(right);
    const attempts = await userDatabase.attempts.toArray();
    expect(attempts).toHaveLength(24);
    expect(new Set(attempts.map((entry) => `${entry.sessionId}:${entry.questionId}`)).size).toBe(24);
    expect(await userDatabase.versionedProgresses.count()).toBe(24);
    expect(attempts.every((entry) => entry.mode === 'mock')).toBe(true);
  });
});
