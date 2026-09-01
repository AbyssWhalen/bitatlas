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
} from '@408os/domain';
import Dexie, { type EntityTable, type Table } from 'dexie';
import { migrateLegacySession, rebuildVersionedProgress } from './user-schema-v2';

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

export class ContentDatabase extends Dexie {
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
  }
}

export class UserDatabase extends Dexie {
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

  constructor(name = '408-user') {
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
    });
  }
}
