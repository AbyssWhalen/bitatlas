import 'fake-indexeddb/auto';
import { afterEach, describe, expect, it } from 'vitest';
import type { Attempt, StudySession } from '@408os/domain';
import { createStorage } from './index';

const opened: ReturnType<typeof createStorage>[] = [];
const timestamp = '2026-08-16T00:00:00.000Z';

function setup() {
  const suffix = crypto.randomUUID();
  const storage = createStorage({ content: `backup-v2-content-${suffix}`, user: `backup-v2-user-${suffix}` });
  opened.push(storage);
  return storage;
}

function versionedSession(questionId = 'q1', version = '2009.1'): StudySession {
  return {
    id: 'session-v2',
    mode: 'practice',
    questionIds: [questionId],
    questionContentVersions: { [questionId]: version },
    currentIndex: 0,
    responses: { [questionId]: { type: 'choice', optionId: 'A' } },
    submittedQuestionIds: [questionId],
    startedAt: timestamp,
    updatedAt: timestamp,
  };
}

function attempt(): Attempt {
  return {
    id: 'attempt-v2',
    questionId: 'q1',
    questionContentVersion: '2009.1',
    sessionId: 'session-v2',
    mode: 'practice',
    response: { type: 'choice', optionId: 'A' },
    correct: true,
    score: 1,
    startedAt: timestamp,
    submittedAt: timestamp,
    durationMs: 1_000,
  };
}

function importedSession(questionId = 'q1', version = '2009.1'): StudySession {
  return {
    ...versionedSession(questionId, version),
    id: 'session-imported',
    responses: { [questionId]: { type: 'choice', optionId: 'B' } },
  };
}

function importedAttempt(questionId = 'q1', version = '2009.1'): Attempt {
  return {
    ...attempt(),
    id: 'attempt-imported',
    questionId,
    questionContentVersion: version,
    sessionId: 'session-imported',
    response: { type: 'choice', optionId: 'B' },
    correct: false,
    score: 0,
    startedAt: '2026-08-16T01:00:00.000Z',
    submittedAt: '2026-08-16T01:00:00.000Z',
  };
}

afterEach(async () => {
  await Promise.all(opened.splice(0).map(async ({ contentDatabase, userDatabase }) => {
    await contentDatabase.delete();
    await userDatabase.delete();
  }));
});

describe('backup schema v2 compatibility', () => {
  it('exports version-scoped progress and preserves legacy progress separately', async () => {
    const { studyRepository, backupService, userDatabase } = setup();
    await studyRepository.submitAttempt(attempt(), versionedSession(), null);
    await userDatabase.progresses.put({
      questionId: 'legacy-q',
      mastery: 'mastered',
      attemptCount: 3,
      correctCount: 3,
      wrongCount: 0,
      consecutiveCorrect: 3,
      lastCorrect: true,
      lastAttemptAt: timestamp,
    });

    const exported = JSON.parse(await backupService.exportJson('0.2.0'));
    expect(exported.schemaVersion).toBe(3);
    expect(exported.data.mockExams).toEqual([]);
    expect(exported.data.sessions[0].questionContentVersions).toEqual({ q1: '2009.1' });
    expect(exported.data.progresses).toEqual([
      expect.objectContaining({ questionId: 'q1', questionContentVersion: '2009.1' }),
    ]);
    expect(exported.data.legacyProgresses).toEqual([
      expect.objectContaining({ questionId: 'legacy-q', mastery: 'mastered' }),
    ]);
  });

  it('imports a v1 backup by deriving proven versions and retaining unversioned progress', async () => {
    const { backupService, studyRepository, userDatabase } = setup();
    const v1 = {
      schemaVersion: 1,
      exportedAt: timestamp,
      appVersion: '0.1.0',
      data: {
        attempts: [attempt()],
        sessions: [{
          id: 'session-v2',
          mode: 'practice',
          questionIds: ['q1', 'q2'],
          currentIndex: 1,
          responses: { q1: { type: 'choice', optionId: 'A' } },
          submittedQuestionIds: ['q1'],
          startedAt: timestamp,
          updatedAt: timestamp,
        }],
        progresses: [{
          questionId: 'q1',
          mastery: 'mastered',
          attemptCount: 1,
          correctCount: 1,
          wrongCount: 0,
          consecutiveCorrect: 1,
          lastCorrect: true,
          lastAttemptAt: timestamp,
        }],
        notes: [],
        collections: [],
        settings: [],
      },
    };

    await backupService.importJson(JSON.stringify(v1), 'replace');
    expect(await studyRepository.getSession('session-v2')).toMatchObject({
      questionContentVersions: { q1: '2009.1', q2: '__legacy_unversioned__' },
    });
    expect(await studyRepository.listProgress()).toEqual([
      expect.objectContaining({ questionId: 'q1', questionContentVersion: '2009.1', attemptCount: 1 }),
    ]);
    expect(await userDatabase.progresses.get('q1')).toMatchObject({ mastery: 'mastered' });
  });

  it('imports a previously exported v3 backup with a legacy negative draft score', async () => {
    const source = setup();
    await source.userDatabase.sessions.put({
      id: 'legacy-draft-session',
      mode: 'practice',
      questionIds: ['cn408-2009-q44'],
      questionContentVersions: { 'cn408-2009-q44': '2009.1' },
      currentIndex: 0,
      responses: {},
      submittedQuestionIds: [],
      startedAt: timestamp,
      updatedAt: timestamp,
    });
    const exported = JSON.parse(await source.backupService.exportJson('0.3.0')) as {
      data: { sessions: Array<{ responses: Record<string, unknown> }> };
    };
    exported.data.sessions[0]!.responses['cn408-2009-q44'] = {
      type: 'comprehensive',
      text: 'draft',
      selfScore: -1,
      checkedRubricIds: [],
    };

    const target = setup();
    await target.backupService.importJson(JSON.stringify(exported), 'replace');

    await expect(target.studyRepository.getSession('legacy-draft-session')).resolves.toMatchObject({
      responses: {
        'cn408-2009-q44': {
          type: 'comprehensive',
          text: 'draft',
          checkedRubricIds: [],
        },
      },
    });
    expect(target.backupService.preflight(await target.backupService.exportJson('0.3.0')).counts).toMatchObject({
      sessions: 1,
      attempts: 0,
    });
  });

  it.each([
    ['negative clamp', -1, 0],
    ['upper clamp', 99, 10],
  ])('imports a submitted v3 backup with proven legacy %s evidence', async (_label, legacyScore, repairedScore) => {
    const source = setup();
    const questionId = 'cn408-2009-q44';
    const response = {
      type: 'comprehensive' as const,
      text: 'submitted answer',
      selfScore: repairedScore,
      checkedRubricIds: ['rubric-1'],
    };
    const session: StudySession = {
      id: `legacy-submitted-session-${String(legacyScore)}`,
      mode: 'practice',
      questionIds: [questionId],
      questionContentVersions: { [questionId]: '2009.1' },
      currentIndex: 0,
      responses: { [questionId]: response },
      submittedQuestionIds: [questionId],
      startedAt: timestamp,
      updatedAt: timestamp,
    };
    const submittedAttempt: Attempt = {
      id: `legacy-submitted-attempt-${String(legacyScore)}`,
      questionId,
      questionContentVersion: '2009.1',
      sessionId: session.id,
      mode: session.mode,
      response,
      correct: null,
      score: repairedScore,
      startedAt: timestamp,
      submittedAt: timestamp,
      durationMs: 1_000,
    };
    await source.studyRepository.submitAttempt(submittedAttempt, session, null);
    const exported = JSON.parse(await source.backupService.exportJson('0.3.0')) as {
      data: {
        attempts: Array<{ response: { selfScore?: number } }>;
        sessions: Array<{ responses: Record<string, { selfScore?: number }> }>;
      };
    };
    exported.data.sessions[0]!.responses[questionId]!.selfScore = legacyScore;
    exported.data.attempts[0]!.response.selfScore = legacyScore;

    const target = setup();
    await target.backupService.importJson(JSON.stringify(exported), 'replace');

    await expect(target.studyRepository.getSession(session.id)).resolves.toMatchObject({
      responses: { [questionId]: expect.objectContaining({ selfScore: repairedScore }) },
    });
    expect(await target.studyRepository.listAttempts()).toEqual([
      expect.objectContaining({
        id: submittedAttempt.id,
        score: repairedScore,
        response: expect.objectContaining({ selfScore: repairedScore }),
      }),
    ]);
  });

  it('rejects legacy repair when session and attempt raw scores disagree', async () => {
    const source = setup();
    const questionId = 'cn408-2009-q44';
    const response = {
      type: 'comprehensive' as const,
      text: 'submitted answer',
      selfScore: 10,
      checkedRubricIds: ['rubric-1'],
    };
    const session: StudySession = {
      id: 'legacy-mismatched-score-session',
      mode: 'practice',
      questionIds: [questionId],
      questionContentVersions: { [questionId]: '2009.1' },
      currentIndex: 0,
      responses: { [questionId]: response },
      submittedQuestionIds: [questionId],
      startedAt: timestamp,
      updatedAt: timestamp,
    };
    await source.studyRepository.submitAttempt({
      id: 'legacy-mismatched-score-attempt',
      questionId,
      questionContentVersion: '2009.1',
      sessionId: session.id,
      mode: session.mode,
      response,
      correct: null,
      score: 10,
      startedAt: timestamp,
      submittedAt: timestamp,
      durationMs: 1_000,
    }, session, null);
    const exported = JSON.parse(await source.backupService.exportJson('0.3.0')) as {
      data: {
        attempts: Array<{ response: { selfScore?: number } }>;
        sessions: Array<{ responses: Record<string, { selfScore?: number }> }>;
      };
    };
    exported.data.sessions[0]!.responses[questionId]!.selfScore = 99;
    exported.data.attempts[0]!.response.selfScore = 5;

    const target = setup();
    await expect(target.backupService.importJson(JSON.stringify(exported), 'replace'))
      .rejects.toThrow(/manual recovery/iu);
    expect(await target.userDatabase.sessions.count()).toBe(0);
    expect(await target.userDatabase.attempts.count()).toBe(0);
  });

  it('rejects an upper-clamp backup whose attempt score is zero', async () => {
    const source = setup();
    const questionId = 'cn408-2009-q44';
    const response = {
      type: 'comprehensive' as const,
      text: 'submitted answer',
      selfScore: 0,
      checkedRubricIds: [],
    };
    const session: StudySession = {
      id: 'legacy-zero-clamp-session',
      mode: 'practice',
      questionIds: [questionId],
      questionContentVersions: { [questionId]: '2009.1' },
      currentIndex: 0,
      responses: { [questionId]: response },
      submittedQuestionIds: [questionId],
      startedAt: timestamp,
      updatedAt: timestamp,
    };
    await source.studyRepository.submitAttempt({
      id: 'legacy-zero-clamp-attempt',
      questionId,
      questionContentVersion: '2009.1',
      sessionId: session.id,
      mode: session.mode,
      response,
      correct: null,
      score: 0,
      startedAt: timestamp,
      submittedAt: timestamp,
      durationMs: 1_000,
    }, session, null);
    const exported = JSON.parse(await source.backupService.exportJson('0.3.0')) as {
      data: {
        attempts: Array<{ response: { selfScore?: number } }>;
        sessions: Array<{ responses: Record<string, { selfScore?: number }> }>;
      };
    };
    exported.data.sessions[0]!.responses[questionId]!.selfScore = 99;
    exported.data.attempts[0]!.response.selfScore = 99;

    const target = setup();
    await expect(target.backupService.importJson(JSON.stringify(exported), 'replace'))
      .rejects.toThrow(/manual recovery/iu);
    expect(await target.userDatabase.sessions.count()).toBe(0);
    expect(await target.userDatabase.attempts.count()).toBe(0);
  });

  it('rejects a v2 backup whose attempt version disagrees with its session snapshot', async () => {
    const { studyRepository, backupService } = setup();
    await studyRepository.submitAttempt(attempt(), versionedSession(), null);
    const exported = JSON.parse(await backupService.exportJson('0.2.0')) as {
      data: { attempts: Array<{ questionContentVersion: string }> };
    };
    exported.data.attempts[0]!.questionContentVersion = '2009.0';

    expect(() => backupService.preflight(JSON.stringify(exported))).toThrow(/version/iu);
  });

  it('fails closed before merge can make overlapping versioned progress disagree with attempts', async () => {
    const current = setup();
    const incoming = setup();
    await current.studyRepository.submitAttempt(attempt(), versionedSession(), null);
    await incoming.studyRepository.submitAttempt(importedAttempt(), importedSession(), null);
    const json = await incoming.backupService.exportJson('0.2.0');

    await expect(current.backupService.importJson(json, 'merge')).rejects.toThrow(/merge|duplicate|overlap/iu);

    expect(await current.studyRepository.listAttempts()).toEqual([attempt()]);
    expect(await current.studyRepository.listProgress()).toEqual([
      expect.objectContaining({
        questionId: 'q1',
        questionContentVersion: '2009.1',
        attemptCount: 1,
        correctCount: 1,
        wrongCount: 0,
      }),
    ]);
  });

  it('allows merge only when the incoming backup is a disjoint semantic union', async () => {
    const current = setup();
    const incoming = setup();
    await current.studyRepository.submitAttempt(attempt(), versionedSession(), null);
    await incoming.studyRepository.submitAttempt(
      importedAttempt('q2', '2009.2'),
      importedSession('q2', '2009.2'),
      null,
    );

    await current.backupService.importJson(await incoming.backupService.exportJson('0.2.0'), 'merge');

    expect((await current.studyRepository.listAttempts()).map((entry) => entry.id).sort()).toEqual([
      'attempt-imported',
      'attempt-v2',
    ]);
    expect(await current.studyRepository.listProgress()).toEqual(expect.arrayContaining([
      expect.objectContaining({ questionId: 'q1', questionContentVersion: '2009.1', attemptCount: 1 }),
      expect.objectContaining({ questionId: 'q2', questionContentVersion: '2009.2', attemptCount: 1 }),
    ]));
  });

  it('rejects a merge that would create two notes for one question', async () => {
    const current = setup();
    const incoming = setup();
    await current.userDatabase.notes.put({
      id: 'note-current',
      questionId: 'q-note',
      body: 'current',
      createdAt: timestamp,
      updatedAt: timestamp,
    });
    await incoming.userDatabase.notes.put({
      id: 'note-incoming',
      questionId: 'q-note',
      body: 'incoming',
      createdAt: timestamp,
      updatedAt: timestamp,
    });

    await expect(current.backupService.importJson(
      await incoming.backupService.exportJson('0.2.0'),
      'merge',
    )).rejects.toThrow(/merge|note/iu);
    expect(await current.userDatabase.notes.toArray()).toEqual([
      expect.objectContaining({ id: 'note-current', body: 'current' }),
    ]);
  });

  it('keeps deterministic disjoint version samples valid after export and preflight', async () => {
    const current = setup();
    const incoming = setup();
    for (let index = 0; index < 24; index += 1) {
      const questionId = `q-generated-${Math.floor(index / 2)}`;
      const version = `2009.${index % 2}`;
      const sessionId = `session-generated-${index}`;
      const optionId = index % 3 === 0 ? 'B' : 'A';
      const session: StudySession = {
        id: sessionId,
        mode: 'practice',
        questionIds: [questionId],
        questionContentVersions: { [questionId]: version },
        currentIndex: 0,
        responses: { [questionId]: { type: 'choice', optionId } },
        submittedQuestionIds: [questionId],
        startedAt: timestamp,
        updatedAt: timestamp,
      };
      const generatedAttempt: Attempt = {
        id: `attempt-generated-${index}`,
        questionId,
        questionContentVersion: version,
        sessionId,
        mode: 'practice',
        response: { type: 'choice', optionId },
        correct: optionId === 'A',
        score: optionId === 'A' ? 1 : 0,
        startedAt: timestamp,
        submittedAt: timestamp,
        durationMs: index,
      };
      const target = index % 2 === 0 ? current : incoming;
      await target.studyRepository.submitAttempt(generatedAttempt, session, null);
    }

    await current.backupService.importJson(await incoming.backupService.exportJson('0.2.0'), 'merge');
    const mergedJson = await current.backupService.exportJson('0.2.0');

    expect(current.backupService.preflight(mergedJson).counts).toMatchObject({
      attempts: 24,
      sessions: 24,
      progresses: 24,
    });
  });

  it('rejects an unknown import mode instead of treating it as merge', async () => {
    const current = setup();
    const incoming = setup();
    await incoming.studyRepository.submitAttempt(attempt(), versionedSession(), null);

    await expect(current.backupService.importJson(
      await incoming.backupService.exportJson('0.2.0'),
      'append' as never,
    )).rejects.toThrow(/mode/iu);
    expect(await current.studyRepository.listAttempts()).toEqual([]);
  });
});
