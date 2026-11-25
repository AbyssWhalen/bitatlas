import type {
  AssetRef,
  Attempt,
  CollectionEntry,
  ContentPackManifest,
  LegacyQuestionProgress,
  KnowledgePoint,
  MockExam,
  Note,
  Question,
  QuestionProgress,
  StudySession,
  LearningPack, DailyPlan, ReviewSession, CardReviewEvent, PersonalCard,
  PracticeEvidence, PracticeContext, NoteConflict,
  SyncMutation, SyncConflict,
} from '@408os/domain';
import Dexie, { type EntityTable, type Table, type Transaction } from 'dexie';
import { migrateLegacySession, rebuildVersionedProgress } from './user-schema-v2';
import { sealRecoverySnapshot } from './migration';

async function preserveUpgradeSnapshot(transaction: Transaction, version: number): Promise<void> {
  if (await transaction.table('settings').get('migration.v4.recovery')) return;
  const names = ['attempts', 'sessions', 'progresses', 'notes', 'collections', 'settings', 'changeLog',
    ...(version >= 2 ? ['versionedProgresses'] : []), ...(version >= 3 ? ['mockExams'] : [])];
  const tables = Object.fromEntries(await Promise.all(names.map(async (name) => [name, await transaction.table(name).toArray()])));
  await transaction.table('settings').put({
    key: 'migration.v4.recovery', value: sealRecoverySnapshot(version, tables, new Date().toISOString()),
  });
}

export interface StoredSetting {
  key: string;
  value: unknown;
}

export interface ChangeLogEntry {
  id: string;
  entityType: 'attempt' | 'session' | 'progress' | 'note' | 'collection' | 'setting' | 'mock-exam';
  entityId: string;
  operation: 'put' | 'delete';
  changedAt: string;
}

export interface LearningExtension {
  id: string;
  version: string;
  baseDigest: string;
  pack: LearningPack;
}

export class ContentDatabase extends Dexie {
  cacheEntries!: EntityTable<{ key: string; bytes: number; accessedAt: number; pinned: boolean; unique: boolean }, 'key'>;
  learningPacks!: Table<LearningPack | LearningExtension, string>;
  questions!: EntityTable<Question, 'id'>;
  knowledgePoints!: EntityTable<KnowledgePoint, 'id'>;
  assets!: EntityTable<AssetRef, 'id'>;
  packs!: EntityTable<ContentPackManifest, 'id'>;

  constructor(name = '408-content') {
    super(name);
    this.version(1).stores({
      questions: 'id, [year+number], year, subject, kind, reviewStatus',
      knowledgePoints: 'id, subject, parentId',
      assets: 'id, path',
      packs: 'id, year, contentVersion, reviewStatus',
    });
    this.version(2).stores({ learningPacks: 'id, version' });
    this.version(3).stores({ cacheEntries: 'key, accessedAt' });
    watchDatabaseLifecycle(this);
  }
}

export class UserDatabase extends Dexie {
  outbox!: EntityTable<{ operationId: string; mutation: SyncMutation; queuedAt: number; state: 'pending' | 'conflict' }, 'operationId'>;
  syncHeads!: EntityTable<{ key: string; revision: number }, 'key'>;
  syncConflicts!: EntityTable<SyncConflict, 'id'>;
  syncMeta!: EntityTable<StoredSetting, 'key'>;
  dailyPlans!: EntityTable<DailyPlan, 'id'>;
  reviewSessions!: EntityTable<ReviewSession, 'id'>;
  cardReviewEvents!: EntityTable<CardReviewEvent, 'id'>;
  personalCards!: EntityTable<PersonalCard, 'id'>;
  practiceEvidence!: EntityTable<PracticeEvidence, 'id'>;
  practiceContexts!: EntityTable<PracticeContext, 'sessionId'>;
  noteConflicts!: EntityTable<NoteConflict, 'id'>;
  attempts!: EntityTable<Attempt, 'id'>;
  sessions!: EntityTable<StudySession, 'id'>;
  /** v1 unversioned progress is retained as legacy evidence. */
  progresses!: EntityTable<LegacyQuestionProgress, 'questionId'>;
  /** v2 progress is scoped by question id and exact content version. */
  versionedProgresses!: Table<QuestionProgress, [string, string]>;
  /** v3 lifecycle and immutable blueprint for persisted mock exams. */
  mockExams!: EntityTable<MockExam, 'id'>;
  notes!: EntityTable<Note, 'id'>;
  collections!: EntityTable<CollectionEntry, 'questionId'>;
  settings!: EntityTable<StoredSetting, 'key'>;
  changeLog!: EntityTable<ChangeLogEntry, 'id'>;

  constructor(name = '408-user', readonly accountId?: string) {
    super(name);
    this.version(1).stores({
      attempts: 'id, questionId, sessionId, submittedAt, correct',
      sessions: 'id, mode, updatedAt, completedAt',
      progresses: 'questionId, mastery, lastCorrect, lastAttemptAt, nextReviewAt',
      notes: 'id, questionId, updatedAt',
      collections: 'questionId, createdAt',
      settings: 'key',
      changeLog: 'id, [entityType+entityId], changedAt',
    });
    this.version(2)
      .stores({
        versionedProgresses: '[questionId+questionContentVersion], questionId, questionContentVersion, mastery, lastCorrect, lastAttemptAt, nextReviewAt',
      })
      .upgrade(async (transaction) => {
        await preserveUpgradeSnapshot(transaction, 1);
        const attempts = await transaction.table('attempts').toArray() as Attempt[];
        const sessions = await transaction.table('sessions').toArray() as Array<StudySession & {
          questionContentVersions?: Record<string, string>;
        }>;
        const legacyProgresses = await transaction.table('progresses').toArray() as LegacyQuestionProgress[];

        await transaction.table('versionedProgresses').bulkPut(rebuildVersionedProgress(attempts));
        await transaction.table('sessions').bulkPut(
          sessions.map((session) => migrateLegacySession(session, attempts)),
        );

        // Keep this read explicit: v1 progress contains manual mastery and
        // cannot be assigned to a current content version without evidence.
        // The original `progresses` table remains untouched as legacy data.
        void legacyProgresses;
      });
    this.version(3).stores({
      mockExams: 'id, &sessionId, status, updatedAt, submittedAt',
    }).upgrade(async (transaction) => { await preserveUpgradeSnapshot(transaction, 2); });
    this.version(4).stores({
      dailyPlans: 'id, date',
      reviewSessions: 'id, updatedAt, completedAt',
      cardReviewEvents: 'id, sessionId, [cardId+cardVersion], reviewedAt',
      personalCards: 'id, baseCardId, subject',
      practiceEvidence: 'id, sessionId, questionId, attemptId',
      practiceContexts: 'sessionId, parentSessionId',
      noteConflicts: 'id, questionId, resolvedAt',
    }).upgrade(async (transaction) => {
      await preserveUpgradeSnapshot(transaction, 3);
      const notes = await transaction.table('notes').toArray() as Note[];
      const groups = new Map<string, Note[]>();
      for (const note of notes) groups.set(note.questionId, [...(groups.get(note.questionId) ?? []), note]);
      for (const [questionId, originals] of groups) {
        if (originals.length < 2) continue;
        originals.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt) || a.id.localeCompare(b.id));
        await transaction.table('noteConflicts').put({
          id: `migration-v4:${questionId}`, questionId, originals, createdAt: new Date().toISOString(),
        } satisfies NoteConflict);
        // Every original is durably archived in the same upgrade transaction.
        await transaction.table('notes').bulkDelete(originals.slice(1).map((note) => note.id));
      }
    });
    if (accountId) this.version(5).stores({
      outbox: 'operationId, queuedAt, state',
      syncHeads: 'key',
      syncConflicts: 'id, kind, entityId, resolvedAt',
      syncMeta: 'key',
    }).upgrade(async (transaction) => {
      const names = ['attempts', 'sessions', 'progresses', 'notes', 'collections', 'settings', 'changeLog', 'versionedProgresses',
        'mockExams', 'dailyPlans', 'reviewSessions', 'cardReviewEvents', 'personalCards', 'practiceEvidence', 'practiceContexts', 'noteConflicts'];
      const tables = Object.fromEntries(await Promise.all(names.map(async (name) => [name, await transaction.table(name).toArray()])));
      await transaction.table('syncMeta').put({ key: 'v5-upgrade-recovery', value: sealRecoverySnapshot(4, tables, new Date().toISOString()) });
    });
    watchDatabaseLifecycle(this);
  }
}

function watchDatabaseLifecycle(database: Dexie): void {
  database.on('versionchange', () => {
    database.close();
    if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('bitatlas-storage-closed'));
  });
  database.on('blocked', () => {
    if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('bitatlas-storage-blocked'));
  });
}
