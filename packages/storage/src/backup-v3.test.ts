import 'fake-indexeddb/auto';
import type { MockExam, StudySession } from '@408os/domain';
import { afterEach, describe, expect, it } from 'vitest';
import { createStorage } from './index';

const opened: ReturnType<typeof createStorage>[] = [];
const timestamp = '2026-08-16T00:00:00.000Z';

function setup() {
  const suffix = crypto.randomUUID();
  const storage = createStorage({ content: `backup-v3-content-${suffix}`, user: `backup-v3-user-${suffix}` });
  opened.push(storage);
  return storage;
}

function mockBundle(examId: string, sessionId: string, version = '2009.1'): {
  exam: MockExam;
  session: StudySession;
} {
  const snapshots = Array.from({ length: 47 }, (_, index) => ({
    id: `cn408-2009-q${String(index + 1).padStart(2, '0')}`,
    number: index + 1,
    kind: index < 40 ? 'single-choice' as const : 'comprehensive' as const,
    contentVersion: version,
    maxScore: index < 40 ? 2 : 10,
  }));
  const questionIds = snapshots.map((entry) => entry.id);
  return {
    exam: {
      id: examId,
      sessionId,
      blueprint: {
        packId: 'cn408-2009',
        packHash: 'c'.repeat(64),
        contentVersion: version,
        year: 2009,
        durationMinutes: 180,
        objectiveMaxScore: 80,
        comprehensiveMaxScore: 70,
        totalMaxScore: 150,
        questions: snapshots,
      },
      status: 'in-progress',
      questionDurationsMs: Object.fromEntries(questionIds.map((questionId) => [questionId, 0])),
      startedAt: timestamp,
      updatedAt: timestamp,
    },
    session: {
      id: sessionId,
      mode: 'mock',
      questionIds,
      questionContentVersions: Object.fromEntries(questionIds.map((questionId) => [questionId, version])),
      currentIndex: 0,
      responses: {},
      submittedQuestionIds: [],
      startedAt: timestamp,
      updatedAt: timestamp,
    },
  };
}

async function putBundle(storage: ReturnType<typeof createStorage>, examId: string, sessionId: string, version?: string) {
  const bundle = mockBundle(examId, sessionId, version);
  await storage.userDatabase.transaction(
    'rw',
    storage.userDatabase.mockExams,
    storage.userDatabase.sessions,
    async () => {
      await storage.userDatabase.mockExams.put(bundle.exam);
      await storage.userDatabase.sessions.put(bundle.session);
    },
  );
  return bundle;
}

afterEach(async () => {
  await Promise.all(opened.splice(0).map(async ({ contentDatabase, userDatabase }) => {
    await contentDatabase.delete();
    await userDatabase.delete();
  }));
});

describe('backup schema v3', () => {
  it('exports and restores persisted mock exams with their versioned sessions', async () => {
    const source = setup();
    const target = setup();
    const bundle = await putBundle(source, 'exam-export', 'session-export');

    const json = await source.backupService.exportJson('0.3.0');
    const raw = JSON.parse(json) as {
      schemaVersion: number;
      data: { mockExams?: MockExam[] };
    };
    expect(raw.schemaVersion).toBe(3);
    expect(raw.data.mockExams).toEqual([bundle.exam]);
    expect(source.backupService.preflight(json).counts.mockExams).toBe(1);

    await target.backupService.importJson(json, 'replace');
    expect(await target.userDatabase.mockExams.get(bundle.exam.id)).toEqual(bundle.exam);
    expect(await target.userDatabase.sessions.get(bundle.session.id)).toEqual(bundle.session);
    expect(target.backupService.preflight(await target.backupService.exportJson('0.3.0')).counts).toMatchObject({
      sessions: 1,
      mockExams: 1,
    });
  });

  it('imports v2 mock-mode sessions only as non-resumable legacy evidence', async () => {
    const target = setup();
    const { session } = mockBundle('not-persisted', 'legacy-mock-session');
    const v2 = {
      schemaVersion: 2,
      exportedAt: timestamp,
      appVersion: '0.2.0',
      data: {
        attempts: [],
        sessions: [session],
        progresses: [],
        legacyProgresses: [],
        notes: [],
        collections: [],
        settings: [],
      },
    };

    await target.backupService.importJson(JSON.stringify(v2), 'replace');

    expect(await target.userDatabase.sessions.get(session.id)).toEqual(session);
    expect(await target.userDatabase.mockExams.toArray()).toEqual([]);
    expect(await target.mockExamRepository.getLatestOpenExam()).toBeUndefined();
    expect(await target.studyRepository.getLatestOpenSession()).toBeUndefined();
  });

  it('rejects a v3 backup whose exam blueprint and session versions disagree', async () => {
    const storage = setup();
    await putBundle(storage, 'exam-mismatch', 'session-mismatch');
    const raw = JSON.parse(await storage.backupService.exportJson('0.3.0')) as {
      data: { sessions: StudySession[] };
    };
    raw.data.sessions[0]!.questionContentVersions['cn408-2009-q01'] = '2009.0';

    expect(() => storage.backupService.preflight(JSON.stringify(raw))).toThrow(/mock|blueprint|version/iu);
  });

  it('fails closed before merging a duplicate exam lifecycle into current data', async () => {
    const current = setup();
    const incoming = setup();
    const currentBundle = await putBundle(current, 'exam-overlap', 'session-current');
    await putBundle(incoming, 'exam-overlap', 'session-incoming');

    await expect(current.backupService.importJson(
      await incoming.backupService.exportJson('0.3.0'),
      'merge',
    )).rejects.toThrow(/merge|mock|duplicate/iu);

    expect(await current.userDatabase.mockExams.toArray()).toEqual([currentBundle.exam]);
    expect(await current.userDatabase.sessions.toArray()).toEqual([currentBundle.session]);
  });

  it('keeps deterministic disjoint mock exams valid after merge and export roundtrip', async () => {
    const current = setup();
    const incoming = setup();
    for (let index = 0; index < 12; index += 1) {
      const target = index % 2 === 0 ? current : incoming;
      await putBundle(target, `exam-generated-${index}`, `session-generated-${index}`, `2009.${index}`);
    }

    await current.backupService.importJson(await incoming.backupService.exportJson('0.3.0'), 'merge');
    const merged = await current.backupService.exportJson('0.3.0');

    expect(current.backupService.preflight(merged).counts).toMatchObject({ sessions: 12, mockExams: 12 });
    const raw = JSON.parse(merged) as { data: { mockExams: MockExam[] } };
    expect(new Set(raw.data.mockExams.map((entry) => entry.id)).size).toBe(12);
    expect(new Set(raw.data.mockExams.map((entry) => entry.sessionId)).size).toBe(12);
  });
});
