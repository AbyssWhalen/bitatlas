export * from './backup';
export * from './content-review';
export * from './databases';
export * from './mock-repository';
export * from './repositories';
export * from './user-schema-v2';

import { BackupService } from './backup';
import { DexieContentReviewRepository } from './content-review';
import { ContentDatabase, UserDatabase } from './databases';
import { DexieMockExamRepository } from './mock-repository';
import { DexieAnnotationRepository, DexieContentRepository, DexieStudyRepository } from './repositories';

export function createStorage(names: { content?: string; user?: string } = {}) {
  const contentDatabase = new ContentDatabase(names.content ?? '408-content');
  const userDatabase = new UserDatabase(names.user ?? '408-user');
  return {
    contentDatabase,
    userDatabase,
    contentRepository: new DexieContentRepository(contentDatabase),
    studyRepository: new DexieStudyRepository(userDatabase),
    mockExamRepository: new DexieMockExamRepository(userDatabase),
    annotationRepository: new DexieAnnotationRepository(userDatabase),
    contentReviewRepository: new DexieContentReviewRepository(userDatabase),
    backupService: new BackupService(userDatabase, contentDatabase),
  };
}
