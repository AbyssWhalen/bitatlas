import 'fake-indexeddb/auto';
import Dexie from 'dexie';
import { describe, expect, it } from 'vitest';
import type { Attempt } from '@408os/domain';
import {
  LEGACY_CONTENT_VERSION,
  migrateLegacySession,
  rebuildVersionedProgress,
  studySessionVersionIssue,
} from './user-schema-v2';
import { UserDatabase } from './databases';

const timestamp = '2026-08-16T00:00:00.000Z';

function attempt(
  id: string,
  questionId: string,
  questionContentVersion: string,
  correct: boolean,
): Attempt {
  return {
    id,
    questionId,
    questionContentVersion,
    sessionId: 'legacy-session',
    mode: 'practice',
    response: { type: 'choice', optionId: correct ? 'A' : 'B' },
    correct,
    score: correct ? 1 : 0,
    startedAt: timestamp,
    submittedAt: timestamp,
    durationMs: 1_000,
  };
}

const legacySession = {
  id: 'legacy-session',
  mode: 'practice' as const,
  questionIds: ['q1', 'q2', 'q3'],
  currentIndex: 1,
  responses: {
    q1: { type: 'choice' as const, optionId: 'A' as const },
  },
  submittedQuestionIds: ['q1'],
  startedAt: timestamp,
  updatedAt: timestamp,
};

describe('user schema v2 migration contracts', () => {
  it('derives only proven per-question versions and keeps unknown drafts legacy', () => {
    const migrated = migrateLegacySession(legacySession, [
      attempt('a-q1', 'q1', '2009.1', true),
    ]);

    expect(migrated.questionContentVersions).toEqual({
      q1: '2009.1',
      q2: LEGACY_CONTENT_VERSION,
      q3: LEGACY_CONTENT_VERSION,
    });
    expect(migrated.responses).toEqual(legacySession.responses);
    expect(legacySession).not.toHaveProperty('questionContentVersions');
  });

  it('fails closed when one question has contradictory historical versions', () => {
    const migrated = migrateLegacySession(legacySession, [
      attempt('a-old', 'q1', '2009.0', true),
      attempt('a-new', 'q1', '2009.1', false),
    ]);

    expect(migrated.questionContentVersions.q1).toBe(LEGACY_CONTENT_VERSION);
  });

  it('rebuilds one deterministic progress record per question/version group', () => {
    const generatedAttempts = Array.from({ length: 48 }, (_, index) => {
      const questionId = `q${(index % 4) + 1}`;
      const version = index % 3 === 0 ? '2009.0' : '2009.1';
      return attempt(`a-${index}`, questionId, version, index % 2 === 0);
    });
    const first = rebuildVersionedProgress(generatedAttempts);
    const second = rebuildVersionedProgress(generatedAttempts);

    expect(first).toEqual(second);
    expect(new Set(first.map((entry) => `${entry.questionId}:${entry.questionContentVersion}`)).size).toBe(first.length);
    for (const entry of first) {
      const matching = generatedAttempts.filter(
        (candidate) => candidate.questionId === entry.questionId
          && candidate.questionContentVersion === entry.questionContentVersion,
      );
      expect(entry.attemptCount).toBe(matching.length);
      expect(entry.correctCount).toBe(matching.filter((candidate) => candidate.correct === true).length);
      expect(entry.wrongCount).toBe(matching.filter((candidate) => candidate.correct === false).length);
      expect(entry.questionContentVersion).not.toBe(LEGACY_CONTENT_VERSION);
    }
  });

  it('rejects legacy, missing and mismatched versions before a session can resume', () => {
    const questions = new Map([
      ['q1', { contentVersion: '2009.1' }],
      ['q2', { contentVersion: '2009.1' }],
    ]);
    const questionsWithQ3 = new Map([
      ...questions,
      ['q3', { contentVersion: '2009.1' }],
    ]);
    const base = {
      ...legacySession,
      questionContentVersions: { q1: '2009.1', q2: '2009.1', q3: '2009.1' },
    };

    expect(studySessionVersionIssue(base, questions)).toMatch(/q3.*题目|不存在/iu);
    expect(studySessionVersionIssue({
      ...base,
      questionContentVersions: { q1: LEGACY_CONTENT_VERSION, q2: '2009.1', q3: '2009.1' },
    }, questionsWithQ3)).toMatch(/版本.*未知|legacy/iu);
    expect(studySessionVersionIssue({
      ...base,
      questionContentVersions: { q1: '2009.0', q2: '2009.1', q3: '2009.1' },
    }, questionsWithQ3)).toMatch(/版本.*不一致|mismatch/iu);
    expect(studySessionVersionIssue({
      ...base,
      questionContentVersions: { q1: '2009.1', q2: '2009.1' },
    }, questionsWithQ3)).toMatch(/缺少|missing/iu);
    expect(studySessionVersionIssue({
      ...base,
      questionContentVersions: { q1: '2009.1', q2: '2009.1', q3: '2009.1', extra: '2009.1' },
    }, questionsWithQ3)).toMatch(/多余|extra/iu);
  });

  it('upgrades a v1 database without changing v1 tables and preserves legacy evidence', async () => {
    const name = `schema-v2-${crypto.randomUUID()}`;
    const legacy = new Dexie(name);
    let upgraded: UserDatabase | undefined;
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
      await legacy.open();
      await legacy.table('attempts').put(attempt('a-q1', 'q1', '2009.1', true));
      await legacy.table('sessions').put(legacySession);
      const oldProgress = {
        questionId: 'q1',
        mastery: 'mastered',
        attemptCount: 1,
        correctCount: 1,
        wrongCount: 0,
        consecutiveCorrect: 1,
        lastCorrect: true,
        lastAttemptAt: timestamp,
      };
      await legacy.table('progresses').put(oldProgress);
      legacy.close();

      upgraded = new UserDatabase(name);
      await upgraded.open();
      expect(upgraded.verno).toBeGreaterThanOrEqual(2);
      expect(await upgraded.sessions.get(legacySession.id)).toMatchObject({
        questionContentVersions: {
          q1: '2009.1',
          q2: LEGACY_CONTENT_VERSION,
          q3: LEGACY_CONTENT_VERSION,
        },
      });
      expect(await upgraded.versionedProgresses.toArray()).toEqual([
        expect.objectContaining({ questionId: 'q1', questionContentVersion: '2009.1', attemptCount: 1 }),
      ]);
      expect(await upgraded.progresses.get('q1')).toEqual(oldProgress);
    } finally {
      legacy.close();
      upgraded?.close();
      await Dexie.delete(name);
    }
  });
});
