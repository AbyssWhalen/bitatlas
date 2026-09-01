import {
  applyAttemptToProgress,
  filterQuestions,
  LEGACY_CONTENT_VERSION,
  type AssetRef,
  type Attempt,
  type CollectionEntry,
  type ContentPack,
  type ContentPackManifest,
  type KnowledgePoint,
  type Mastery,
  type Note,
  type Question,
  type QuestionFilter,
  type QuestionProgress,
  type StudySession,
} from '@408os/domain';
import { parseContentPack, validateContentPack } from '@408os/content-schema';
import { type ContentDatabase, type UserDatabase } from './databases';
import { assertWritableStudySession } from './user-schema-v2';

export interface ContentRepository {
  installPack(input: unknown, requireVerified?: boolean): Promise<ContentPackManifest>;
  listPacks(): Promise<ContentPackManifest[]>;
  listQuestions(filter?: ContentQuestionFilter): Promise<Question[]>;
  getQuestion(id: string): Promise<Question | undefined>;
  listKnowledgePoints(): Promise<KnowledgePoint[]>;
  getAsset(id: string): Promise<AssetRef | undefined>;
  listAssets(): Promise<AssetRef[]>;
}

export type ContentQuestionFilter = Pick<QuestionFilter, 'year' | 'subjects' | 'kinds' | 'search'>;

const USER_STATE_FILTERS = ['mastery', 'onlyWrong', 'onlyCollected'] as const;

function assertContentQuestionFilter(filter: ContentQuestionFilter): void {
  const input = filter as ContentQuestionFilter & Partial<Pick<QuestionFilter, (typeof USER_STATE_FILTERS)[number]>>;
  const unsupported = USER_STATE_FILTERS.filter((key) => Object.prototype.hasOwnProperty.call(input, key));
  if (unsupported.length) {
    throw new Error(`ContentRepository cannot filter user study state: ${unsupported.join(', ')}.`);
  }
}

function knowledgePointDefinitionsMatch(left: KnowledgePoint, right: KnowledgePoint): boolean {
  return left.id === right.id
    && left.subject === right.subject
    && left.name === right.name
    && left.parentId === right.parentId
    && left.description === right.description;
}

function requiredKnowledgePointIds(
  questions: Question[],
  definitions: Map<string, KnowledgePoint>,
  context: string,
): Set<string> {
  const required = new Set<string>();
  const pending = questions.flatMap((question) => question.knowledgePointIds);

  while (pending.length) {
    const id = pending.pop()!;
    if (required.has(id)) continue;
    const definition = definitions.get(id);
    if (!definition) {
      throw new Error(`Knowledge point ${id} referenced by ${context} is missing its stored definition.`);
    }
    required.add(id);
    if (definition.parentId) pending.push(definition.parentId);
  }

  return required;
}

export interface StudyRepository {
  saveSession(session: StudySession, expectedUpdatedAt: string | null): Promise<void>;
  getSession(id: string): Promise<StudySession | undefined>;
  getLatestOpenSession(): Promise<StudySession | undefined>;
  recordAttempt(attempt: Attempt): Promise<QuestionProgress>;
  submitAttempt(
    attempt: Attempt,
    session: StudySession,
    expectedUpdatedAt: string | null,
  ): Promise<QuestionProgress>;
  listAttempts(): Promise<Attempt[]>;
  listProgress(): Promise<QuestionProgress[]>;
  setMastery(questionId: string, questionContentVersion: string, mastery: Mastery): Promise<QuestionProgress>;
}

export interface AnnotationRepository {
  getNote(questionId: string): Promise<Note | undefined>;
  saveNote(note: Note): Promise<void>;
  deleteNote(questionId: string): Promise<void>;
  listNotes(): Promise<Note[]>;
  isCollected(questionId: string): Promise<boolean>;
  setCollected(questionId: string, collected: boolean, timestamp: string): Promise<void>;
  listCollections(): Promise<CollectionEntry[]>;
}

const change = (entityType: Parameters<UserDatabase['changeLog']['put']>[0]['entityType'], entityId: string, operation: 'put' | 'delete', changedAt: string) => ({
  id: crypto.randomUUID(),
  entityType,
  entityId,
  operation,
  changedAt,
});

function assertNonMockStudySession(session: StudySession): void {
  if (session.mode === 'mock') {
    throw new Error('Mock sessions must be written through the mock exam repository.');
  }
}

function assertGenericStudySession(session: StudySession): void {
  assertNonMockStudySession(session);
  for (const response of Object.values(session.responses)) {
    assertComprehensiveSelfScore(response);
  }
}

export class StudySessionConflictError extends Error {
  constructor() {
    super('Study session changed after it was loaded.');
    this.name = 'StudySessionConflictError';
  }
}

function timestampMs(value: string, label: string): number {
  const result = Date.parse(value);
  if (!Number.isFinite(result)) throw new Error(`${label} is not a valid timestamp.`);
  return result;
}

function assertComprehensiveSelfScore(response: Attempt['response']): void {
  if (
    response.type === 'comprehensive'
    && response.selfScore !== undefined
    && (!Number.isFinite(response.selfScore) || response.selfScore < 0)
  ) {
    throw new Error('Comprehensive self score must be finite and non-negative.');
  }
}

function responsesMatch(left: Attempt['response'], right: Attempt['response']): boolean {
  if (left.type !== right.type) return false;
  if (left.type === 'choice' && right.type === 'choice') return left.optionId === right.optionId;
  if (left.type !== 'comprehensive' || right.type !== 'comprehensive') return false;
  return left.text === right.text
    && left.selfScore === right.selfScore
    && left.checkedRubricIds.length === right.checkedRubricIds.length
    && left.checkedRubricIds.every((id, index) => id === right.checkedRubricIds[index]);
}

function invalidComprehensiveSelfScore(response: Attempt['response']): boolean {
  return response.type === 'comprehensive'
    && response.selfScore !== undefined
    && (!Number.isFinite(response.selfScore) || response.selfScore < 0);
}

function invalidSelfScoresMatch(left: number | undefined, right: number | undefined): boolean {
  return left === right || (Number.isNaN(left) && Number.isNaN(right));
}

function hasUnresolvedStudySessionStructure(session: StudySession, sessionAttempts: readonly Attempt[]): boolean {
  const questionIds = new Set(session.questionIds);
  const versionIds = Object.keys(session.questionContentVersions);
  if (
    questionIds.size !== session.questionIds.length
    || new Set(session.submittedQuestionIds).size !== session.submittedQuestionIds.length
    || versionIds.some((questionId) => !questionIds.has(questionId))
    || session.questionIds.some((questionId) => !Object.hasOwn(session.questionContentVersions, questionId))
    || Object.keys(session.responses).some((questionId) => !questionIds.has(questionId))
    || session.submittedQuestionIds.some((questionId) => (
      !questionIds.has(questionId) || !Object.hasOwn(session.responses, questionId)
    ))
  ) return true;

  const seenAttempts = new Set<string>();
  for (const attempt of sessionAttempts) {
    const key = studyEvidenceKey(attempt.sessionId, attempt.questionId);
    const sessionResponse = session.responses[attempt.questionId];
    if (
      seenAttempts.has(key)
      || attempt.mode !== session.mode
      || !questionIds.has(attempt.questionId)
      || !session.submittedQuestionIds.includes(attempt.questionId)
      || session.questionContentVersions[attempt.questionId] !== attempt.questionContentVersion
      || !sessionResponse
      || !responsesMatch(attempt.response, sessionResponse)
    ) return true;
    seenAttempts.add(key);
  }
  return session.submittedQuestionIds.some((questionId) => (
    !seenAttempts.has(studyEvidenceKey(session.id, questionId))
  ));
}

function repairTimestamp(previous: string, sessionId: string, sessions: readonly StudySession[]): string {
  const previousMs = timestampMs(previous, 'Legacy study session update time');
  const candidateMs = previousMs + 1;
  const blockingTokens = sessions.flatMap((session) => {
    if (session.id === sessionId) return [];
    const peerMs = timestampMs(session.updatedAt, 'Peer study session update time');
    return peerMs >= previousMs && peerMs <= candidateMs ? [session.updatedAt] : [];
  });
  if (!blockingTokens.length) return new Date(candidateMs).toISOString();
  const earliestBlockingToken = blockingTokens.reduce((earliest, token) => token < earliest ? token : earliest);
  if (!earliestBlockingToken.endsWith('Z')) {
    throw new Error('Peer study session update time must use UTC ISO format.');
  }
  return `${earliestBlockingToken.slice(0, -1)}0Z`;
}

const studyEvidenceKey = (sessionId: string, questionId: string) => JSON.stringify([sessionId, questionId]);

export async function repairLegacyStudySelfScores(database: UserDatabase): Promise<{
  sessions: number;
  attempts: number;
}> {
  return database.transaction('rw', database.sessions, database.attempts, database.changeLog, async () => {
    const [sessions, attempts] = await Promise.all([
      database.sessions.toArray(),
      database.attempts.toArray(),
    ]);
    const attemptsBySessionQuestion = new Map<string, Attempt[]>();
    const attemptsBySession = new Map<string, Attempt[]>();
    for (const attempt of attempts) {
      const key = studyEvidenceKey(attempt.sessionId, attempt.questionId);
      const entries = attemptsBySessionQuestion.get(key) ?? [];
      entries.push(attempt);
      attemptsBySessionQuestion.set(key, entries);
      const sessionEntries = attemptsBySession.get(attempt.sessionId) ?? [];
      sessionEntries.push(attempt);
      attemptsBySession.set(attempt.sessionId, sessionEntries);
    }

    const repairedSessions: StudySession[] = [];
    const repairedAttempts: Attempt[] = [];
    const changes: Array<ReturnType<typeof change>> = [];
    let unresolved = 0;

    for (const session of sessions) {
      if (session.mode === 'mock') continue;
      let changed = false;
      const responses = { ...session.responses };
      const sessionAttempts: Attempt[] = [];

      for (const [questionId, response] of Object.entries(session.responses)) {
        if (response.type !== 'comprehensive' || response.selfScore === undefined) continue;
        const candidates = attemptsBySessionQuestion.get(studyEvidenceKey(session.id, questionId)) ?? [];
        if (!session.questionIds.includes(questionId)) {
          unresolved += 1;
          continue;
        }
        if (!session.submittedQuestionIds.includes(questionId)) {
          if (!invalidComprehensiveSelfScore(response)) continue;
          if (!Number.isFinite(response.selfScore)) {
            unresolved += 1;
            continue;
          }
          if (candidates.length) {
            unresolved += 1;
            continue;
          }
          const clearedResponse = { ...response };
          delete clearedResponse.selfScore;
          responses[questionId] = clearedResponse;
          changed = true;
          continue;
        }

        const invalidScore = invalidComprehensiveSelfScore(response);
        if (candidates.length !== 1) {
          if (invalidScore) unresolved += 1;
          continue;
        }
        const attempt = candidates[0]!;
        const attemptResponse = attempt.response;
        const repairedScore = attempt.score;
        const responseScore = response.selfScore;
        const knownNegativeClamp = Number.isFinite(responseScore) && responseScore < 0 && repairedScore === 0;
        const upperClampShape = Number.isFinite(responseScore)
          && responseScore >= 0
          && repairedScore !== null
          && Number.isFinite(repairedScore)
          && responseScore > repairedScore;
        const knownUpperClamp = upperClampShape && repairedScore !== null && repairedScore > 0;
        if (!invalidScore && !upperClampShape) continue;
        if (
          attempt.mode !== session.mode
          || attempt.questionContentVersion !== session.questionContentVersions[questionId]
          || attemptResponse.type !== 'comprehensive'
          || !invalidSelfScoresMatch(response.selfScore, attemptResponse.selfScore)
          || response.text !== attemptResponse.text
          || response.checkedRubricIds.length !== attemptResponse.checkedRubricIds.length
          || !response.checkedRubricIds.every((id, index) => id === attemptResponse.checkedRubricIds[index])
          || attempt.correct !== null
          || repairedScore === null
          || !Number.isFinite(repairedScore)
          || repairedScore < 0
          || (!knownNegativeClamp && !knownUpperClamp)
        ) {
          unresolved += 1;
          continue;
        }

        responses[questionId] = { ...response, selfScore: repairedScore };
        sessionAttempts.push({
          ...attempt,
          response: { ...attemptResponse, selfScore: repairedScore },
        });
        changed = true;
      }

      if (!changed) continue;
      if (hasUnresolvedStudySessionStructure(session, attemptsBySession.get(session.id) ?? [])) {
        unresolved += 1;
        continue;
      }
      const updatedAt = repairTimestamp(session.updatedAt, session.id, sessions);
      repairedSessions.push({ ...session, responses, updatedAt });
      repairedAttempts.push(...sessionAttempts);
      changes.push(change('session', session.id, 'put', updatedAt));
      for (const attempt of sessionAttempts) {
        changes.push(change('attempt', attempt.id, 'put', updatedAt));
      }
    }

    if (unresolved) {
      throw new Error(`Legacy comprehensive self scores require manual recovery (${unresolved} unresolved record${unresolved === 1 ? '' : 's'}).`);
    }

    if (repairedAttempts.length) await database.attempts.bulkPut(repairedAttempts);
    if (repairedSessions.length) await database.sessions.bulkPut(repairedSessions);
    if (changes.length) await database.changeLog.bulkPut(changes);
    return { sessions: repairedSessions.length, attempts: repairedAttempts.length };
  });
}

function stringArraysMatch(left: string[], right: string[]): boolean {
  return left.length === right.length && left.every((id, index) => id === right[index]);
}

function stringRecordsMatch(left: Record<string, string>, right: Record<string, string>): boolean {
  const leftKeys = Object.keys(left);
  const rightKeys = Object.keys(right);
  return leftKeys.length === rightKeys.length
    && leftKeys.every((key) => Object.prototype.hasOwnProperty.call(right, key) && left[key] === right[key]);
}

function assertStudySessionIdentity(current: StudySession, next: StudySession): void {
  if (
    current.mode !== next.mode
    || current.startedAt !== next.startedAt
    || !stringArraysMatch(current.questionIds, next.questionIds)
    || !stringRecordsMatch(current.questionContentVersions, next.questionContentVersions)
  ) {
    throw new StudySessionConflictError();
  }
}

function assertSubmittedEvidenceTransition(
  current: StudySession | undefined,
  next: StudySession,
  submittedQuestionId?: string,
): void {
  const expectedQuestionIds = current
    ? submittedQuestionId
      ? [...current.submittedQuestionIds, submittedQuestionId]
      : current.submittedQuestionIds
    : submittedQuestionId
      ? [submittedQuestionId]
      : next.submittedQuestionIds;
  if (!stringArraysMatch(next.submittedQuestionIds, expectedQuestionIds)) {
    throw new StudySessionConflictError();
  }
  if (!current) return;
  for (const questionId of current.submittedQuestionIds) {
    const currentResponse = current.responses[questionId];
    const nextResponse = next.responses[questionId];
    if (!currentResponse || !nextResponse || !responsesMatch(currentResponse, nextResponse)) {
      throw new StudySessionConflictError();
    }
  }
}

function assertStudySessionWrite(
  current: StudySession | undefined,
  expectedUpdatedAt: string | null,
  next: StudySession,
  submittedQuestionId?: string,
): void {
  if ((current?.updatedAt ?? null) !== expectedUpdatedAt) throw new StudySessionConflictError();
  assertSubmittedEvidenceTransition(current, next, submittedQuestionId);
  if (!current) return;
  assertNonMockStudySession(current);
  assertWritableStudySession(current);
  if (current.completedAt) throw new StudySessionConflictError();
  assertStudySessionIdentity(current, next);
  if (
    timestampMs(next.updatedAt, 'Study session update time')
    <= timestampMs(current.updatedAt, 'Study session previous update time')
  ) {
    throw new Error('Study session update time must advance.');
  }
}

function assertAttemptMatchesSession(attempt: Attempt, session: StudySession | undefined): asserts session is StudySession {
  if (!session) throw new Error('Attempt does not match a submitted response in its study session.');
  assertWritableStudySession(session);
  const sessionResponse = session.responses[attempt.questionId];
  if (
    session.id !== attempt.sessionId ||
    session.mode !== attempt.mode ||
    !session.questionIds.includes(attempt.questionId) ||
    !session.submittedQuestionIds.includes(attempt.questionId) ||
    session.questionContentVersions[attempt.questionId] !== attempt.questionContentVersion ||
    !sessionResponse ||
    !responsesMatch(sessionResponse, attempt.response)
  ) {
    throw new Error('Attempt does not match a submitted response in its study session.');
  }
}

export class DexieContentRepository implements ContentRepository {
  constructor(private readonly database: ContentDatabase) {}

  async installPack(input: unknown, requireVerified = true): Promise<ContentPackManifest> {
    const validation = validateContentPack(input, { requireVerified, enforceExamShape: true });
    if (!validation.success) {
      throw new Error(`Content pack validation failed:\n${validation.issues.map((issue) => `${issue.path}: ${issue.message}`).join('\n')}`);
    }
    const pack = parseContentPack(input) as ContentPack;
    await this.database.transaction(
      'rw',
      this.database.questions,
      this.database.knowledgePoints,
      this.database.assets,
      this.database.packs,
      async () => {
        const [currentQuestions, currentKnowledgePoints] = await Promise.all([
          this.database.questions.toArray(),
          this.database.knowledgePoints.toArray(),
        ]);
        const replacedQuestions = currentQuestions.filter((question) => question.year === pack.manifest.year);
        const otherQuestions = currentQuestions.filter((question) => question.year !== pack.manifest.year);
        const currentDefinitions = new Map(currentKnowledgePoints.map((point) => [point.id, point]));
        const protectedIds = requiredKnowledgePointIds(
          otherQuestions,
          currentDefinitions,
          'an installed question from another year',
        );

        for (const incoming of pack.knowledgePoints) {
          const current = currentDefinitions.get(incoming.id);
          if (current && protectedIds.has(incoming.id) && !knowledgePointDefinitionsMatch(current, incoming)) {
            throw new Error(`Knowledge point ${incoming.id} conflicts with the definition used by another installed year.`);
          }
        }

        const finalDefinitions = new Map(currentDefinitions);
        for (const point of pack.knowledgePoints) finalDefinitions.set(point.id, point);
        const replacedRequiredIds = requiredKnowledgePointIds(
          replacedQuestions,
          currentDefinitions,
          `the installed ${pack.manifest.year} questions being replaced`,
        );
        const finalRequiredIds = requiredKnowledgePointIds(
          [...otherQuestions, ...pack.questions],
          finalDefinitions,
          'the resulting installed questions',
        );
        const orphanedKnowledgePointIds = [...replacedRequiredIds].filter((id) => !finalRequiredIds.has(id));

        await this.database.questions.bulkDelete(replacedQuestions.map((question) => question.id));
        await this.database.questions.bulkPut(pack.questions);
        await this.database.knowledgePoints.bulkPut(pack.knowledgePoints);
        await this.database.knowledgePoints.bulkDelete(orphanedKnowledgePointIds);
        await this.database.assets.bulkPut(pack.assets);
        await this.database.packs.put(pack.manifest);
      },
    );
    return pack.manifest;
  }

  listPacks(): Promise<ContentPackManifest[]> {
    return this.database.packs.orderBy('year').toArray();
  }

  async listQuestions(filter: ContentQuestionFilter = {}): Promise<Question[]> {
    assertContentQuestionFilter(filter);
    const questions = await this.database.questions.orderBy('[year+number]').toArray();
    return filterQuestions(questions, filter);
  }

  getQuestion(id: string): Promise<Question | undefined> {
    return this.database.questions.get(id);
  }

  listKnowledgePoints(): Promise<KnowledgePoint[]> {
    return this.database.knowledgePoints.toArray();
  }

  getAsset(id: string): Promise<AssetRef | undefined> {
    return this.database.assets.get(id);
  }

  listAssets(): Promise<AssetRef[]> {
    return this.database.assets.orderBy('path').toArray();
  }
}

export class DexieStudyRepository implements StudyRepository {
  constructor(private readonly database: UserDatabase) {}

  async saveSession(session: StudySession, expectedUpdatedAt: string | null): Promise<void> {
    assertGenericStudySession(session);
    assertWritableStudySession(session);
    await this.database.transaction('rw', this.database.sessions, this.database.changeLog, async () => {
      const current = await this.database.sessions.get(session.id);
      assertStudySessionWrite(current, expectedUpdatedAt, session);
      await this.database.sessions.put(session);
      await this.database.changeLog.put(change('session', session.id, 'put', session.updatedAt));
    });
  }

  async getSession(id: string): Promise<StudySession | undefined> {
    await repairLegacyStudySelfScores(this.database);
    const session = await this.database.sessions.get(id);
    return session?.mode === 'mock' ? undefined : session;
  }

  async getLatestOpenSession(): Promise<StudySession | undefined> {
    await repairLegacyStudySelfScores(this.database);
    const sessions = await this.database.sessions.orderBy('updatedAt').reverse().toArray();
    return sessions.find((session) => {
      if (session.completedAt || session.mode === 'mock') return false;
      try {
        assertWritableStudySession(session);
        return true;
      } catch {
        return false;
      }
    });
  }

  async recordAttempt(attempt: Attempt): Promise<QuestionProgress> {
    if (attempt.mode === 'mock') {
      throw new Error('Mock attempts must be written through the mock exam repository.');
    }
    assertComprehensiveSelfScore(attempt.response);
    return this.database.transaction(
      'rw',
      this.database.attempts,
      this.database.sessions,
      this.database.versionedProgresses,
      this.database.changeLog,
      async () => {
        const session = await this.database.sessions.get(attempt.sessionId);
        assertAttemptMatchesSession(attempt, session);
        const previous = await this.database.versionedProgresses.get([
          attempt.questionId,
          attempt.questionContentVersion,
        ]);
        const progress = applyAttemptToProgress(previous, attempt);
        await this.database.attempts.put(attempt);
        await this.database.versionedProgresses.put(progress);
        await this.database.changeLog.bulkPut([
          change('attempt', attempt.id, 'put', attempt.submittedAt),
          change('progress', `${attempt.questionId}:${attempt.questionContentVersion}`, 'put', attempt.submittedAt),
        ]);
        return progress;
      },
    );
  }

  async submitAttempt(
    attempt: Attempt,
    session: StudySession,
    expectedUpdatedAt: string | null,
  ): Promise<QuestionProgress> {
    assertGenericStudySession(session);
    if (attempt.mode === 'mock') {
      throw new Error('Mock attempts must be written through the mock exam repository.');
    }
    assertComprehensiveSelfScore(attempt.response);
    assertAttemptMatchesSession(attempt, session);
    return this.database.transaction(
      'rw',
      this.database.attempts,
      this.database.sessions,
      this.database.versionedProgresses,
      this.database.changeLog,
      async () => {
        const currentSession = await this.database.sessions.get(session.id);
        const existing = await this.database.attempts
          .where('sessionId')
          .equals(attempt.sessionId)
          .and((entry) => entry.questionId === attempt.questionId)
          .first();

        if (existing) {
          try {
            assertAttemptMatchesSession(existing, currentSession);
          } catch {
            throw new StudySessionConflictError();
          }
          if (
            existing.mode !== attempt.mode
            || existing.questionContentVersion !== attempt.questionContentVersion
            || !responsesMatch(existing.response, attempt.response)
          ) {
            throw new StudySessionConflictError();
          }
          const progress = await this.database.versionedProgresses.get([
            attempt.questionId,
            attempt.questionContentVersion,
          ]);
          if (!progress) throw new Error('Existing attempt is missing derived progress.');
          return progress;
        }

        assertStudySessionWrite(currentSession, expectedUpdatedAt, session, attempt.questionId);

        const previous = await this.database.versionedProgresses.get([
          attempt.questionId,
          attempt.questionContentVersion,
        ]);
        const progress = applyAttemptToProgress(previous, attempt);
        await this.database.attempts.put(attempt);
        await this.database.versionedProgresses.put(progress);
        await this.database.sessions.put(session);
        await this.database.changeLog.bulkPut([
          change('attempt', attempt.id, 'put', attempt.submittedAt),
          change('progress', `${attempt.questionId}:${attempt.questionContentVersion}`, 'put', attempt.submittedAt),
          change('session', session.id, 'put', session.updatedAt),
        ]);
        return progress;
      },
    );
  }

  listAttempts(): Promise<Attempt[]> {
    return this.database.attempts.orderBy('submittedAt').toArray();
  }

  listProgress(): Promise<QuestionProgress[]> {
    return this.database.versionedProgresses.toArray();
  }

  async setMastery(questionId: string, questionContentVersion: string, mastery: Mastery): Promise<QuestionProgress> {
    const timestamp = new Date().toISOString();
    if (!questionContentVersion.trim() || questionContentVersion === LEGACY_CONTENT_VERSION) {
      throw new Error('Cannot set mastery without a current question content version.');
    }
    return this.database.transaction('rw', this.database.versionedProgresses, this.database.changeLog, async () => {
      const previous = await this.database.versionedProgresses.get([questionId, questionContentVersion]);
      const progress: QuestionProgress = previous ?? {
        questionId,
        questionContentVersion,
        mastery: 'unseen',
        attemptCount: 0,
        correctCount: 0,
        wrongCount: 0,
        consecutiveCorrect: 0,
        lastCorrect: null,
      };
      const updated = { ...progress, mastery };
      await this.database.versionedProgresses.put(updated);
      await this.database.changeLog.put(change('progress', `${questionId}:${questionContentVersion}`, 'put', timestamp));
      return updated;
    });
  }
}

export class DexieAnnotationRepository implements AnnotationRepository {
  constructor(private readonly database: UserDatabase) {}

  getNote(questionId: string): Promise<Note | undefined> {
    return this.database.notes.where('questionId').equals(questionId).first();
  }

  async saveNote(note: Note): Promise<void> {
    await this.database.transaction('rw', this.database.notes, this.database.changeLog, async () => {
      await this.database.notes.put(note);
      await this.database.changeLog.put(change('note', note.id, 'put', note.updatedAt));
    });
  }

  async deleteNote(questionId: string): Promise<void> {
    const note = await this.getNote(questionId);
    if (!note) return;
    const timestamp = new Date().toISOString();
    await this.database.transaction('rw', this.database.notes, this.database.changeLog, async () => {
      await this.database.notes.delete(note.id);
      await this.database.changeLog.put(change('note', note.id, 'delete', timestamp));
    });
  }

  listNotes(): Promise<Note[]> {
    return this.database.notes.orderBy('updatedAt').reverse().toArray();
  }

  async isCollected(questionId: string): Promise<boolean> {
    return (await this.database.collections.get(questionId)) !== undefined;
  }

  async setCollected(questionId: string, collected: boolean, timestamp: string): Promise<void> {
    await this.database.transaction('rw', this.database.collections, this.database.changeLog, async () => {
      if (collected) await this.database.collections.put({ questionId, createdAt: timestamp });
      else await this.database.collections.delete(questionId);
      await this.database.changeLog.put(change('collection', questionId, collected ? 'put' : 'delete', timestamp));
    });
  }

  listCollections(): Promise<CollectionEntry[]> {
    return this.database.collections.orderBy('createdAt').reverse().toArray();
  }
}
