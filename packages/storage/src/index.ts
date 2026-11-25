export * from './backup';
export * from './content-review';
export * from './databases';
export * from './mock-repository';
export * from './repositories';
export * from './user-schema-v2';
export * from './learning-repository';
export * from './migration';
export * from './account-sync';
export * from './sync-schema';
export * from './learning-schema';
export * from './account-backup';

import { BackupService } from './backup';
import { DexieContentReviewRepository } from './content-review';
import { ContentDatabase, UserDatabase } from './databases';
import { DexieMockExamRepository } from './mock-repository';
import { DexieAnnotationRepository, DexieContentRepository, DexieStudyRepository } from './repositories';
import { DexieLearningContentRepository, DexieReviewRepository } from './learning-repository';
import { AccountSyncRepository } from './account-sync';
import { AccountBackupService } from './account-backup';

export function createStorage(names: { content?: string; user?: string; accountId?: string } = {}) {
  const contentDatabase = new ContentDatabase(names.content ?? '408-content');
  const userDatabase = new UserDatabase(names.user ?? '408-user', names.accountId);
  const syncRepository = new AccountSyncRepository(userDatabase);
  const wrap = <T extends object>(repository: T, methods: readonly (keyof T)[]) => names.accountId ? syncRepository.wrap(repository, methods) : repository;
  return {
    contentDatabase,
    userDatabase,
    contentRepository: new DexieContentRepository(contentDatabase),
    syncRepository,
    write: <T>(job: () => Promise<T>) => syncRepository.atomic(job),
    studyRepository: wrap(new DexieStudyRepository(userDatabase), ['saveSession', 'recordAttempt', 'submitAttempt', 'setMastery']),
    mockExamRepository: wrap(new DexieMockExamRepository(userDatabase), ['createFixedExam', 'saveDraft', 'submitExam', 'selfScoreComprehensive']),
    annotationRepository: wrap(new DexieAnnotationRepository(userDatabase), ['saveNote', 'deleteNote', 'setCollected']),
    contentReviewRepository: wrap(new DexieContentReviewRepository(userDatabase), ['saveDraft', 'approve', 'reject']),
    backupService: names.accountId ? new AccountBackupService(userDatabase, contentDatabase, syncRepository) : new BackupService(userDatabase, contentDatabase),
    learningContentRepository: new DexieLearningContentRepository(contentDatabase),
    reviewRepository: wrap(new DexieReviewRepository(userDatabase), ['saveSetting', 'checkpointPracticeTime', 'savePracticeEvidence',
      'initializePracticeEvidence', 'savePracticeContext', 'savePersonalCard', 'saveReviewLimits', 'createSession', 'rateCard', 'resolveNoteConflict']),
  };
}
