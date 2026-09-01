import {
  applyAttemptToProgress,
  createFixedMockExamBlueprint,
  createStudySession,
  evaluateResponse,
  scoreMockExam,
  type Attempt,
  type ContentPackManifest,
  type MockExam,
  type MockExamSubmissionReason,
  type Question,
  type QuestionProgress,
  type StudySession,
  type UserResponse,
} from '@408os/domain';
import { liveQuery } from 'dexie';
import type { UserDatabase } from './databases';

export interface MockExamBundle {
  exam: MockExam;
  session: StudySession;
}

export interface CreateFixedMockExamInput {
  examId: string;
  sessionId: string;
  manifest: ContentPackManifest;
  questions: readonly Question[];
  startedAt: string;
}

export interface SaveMockExamDraftInput {
  examId: string;
  questionId: string;
  response: UserResponse;
  currentIndex: number;
  durationMs: number;
  expectedUpdatedAt: string;
  updatedAt: string;
}

export interface SubmitMockExamInput {
  examId: string;
  questions: readonly Question[];
  expectedUpdatedAt: string;
  submittedAt: string;
  reason: MockExamSubmissionReason;
}

export interface SelfScoreMockExamInput {
  examId: string;
  questionId: string;
  selfScore: number;
  checkedRubricIds: string[];
  questions: readonly Question[];
  expectedUpdatedAt: string;
  assessedAt: string;
}

export class MockExamConflictError extends Error {
  constructor() {
    super('Mock exam changed after it was loaded.');
    this.name = 'MockExamConflictError';
  }
}

function timestampMs(value: string, label: string): number {
  const result = Date.parse(value);
  if (!Number.isFinite(result)) throw new Error(`${label} is not a valid timestamp.`);
  return result;
}

function assertIdentifier(value: string, label: string): void {
  if (!value.trim()) throw new Error(`${label} must not be blank.`);
}

function sameStrings(left: readonly string[], right: readonly string[]): boolean {
  return left.length === right.length && left.every((entry, index) => entry === right[index]);
}

function assertExpectedUpdate(expectedUpdatedAt: string, actualUpdatedAt: string): void {
  if (expectedUpdatedAt !== actualUpdatedAt) throw new MockExamConflictError();
}

function copyExam(exam: MockExam): MockExam {
  return structuredClone(exam);
}

function copySession(session: StudySession): StudySession {
  return structuredClone(session);
}

function questionMap(questions: readonly Question[]): Map<string, Question> {
  const result = new Map<string, Question>();
  for (const question of questions) {
    if (result.has(question.id)) throw new Error(`Duplicate mock exam question: ${question.id}.`);
    result.set(question.id, question);
  }
  return result;
}

export function assertMockExamSessionConsistency(exam: MockExam, session: StudySession): void {
  if (session.id !== exam.sessionId || session.mode !== 'mock') {
    throw new Error('Mock exam does not reference a matching mock session.');
  }
  const questionIds = exam.blueprint.questions.map((entry) => entry.id);
  if (!sameStrings(session.questionIds, questionIds)) {
    throw new Error('Mock exam blueprint questions do not match its session.');
  }
  const versionKeys = Object.keys(session.questionContentVersions);
  const durationKeys = Object.keys(exam.questionDurationsMs);
  if (!sameStrings([...versionKeys].sort(), [...questionIds].sort())) {
    throw new Error('Mock exam session content-version keys do not match its blueprint.');
  }
  if (!sameStrings([...durationKeys].sort(), [...questionIds].sort())) {
    throw new Error('Mock exam duration keys do not match its blueprint.');
  }
  for (const snapshot of exam.blueprint.questions) {
    if (session.questionContentVersions[snapshot.id] !== snapshot.contentVersion) {
      throw new Error(`Mock exam question version mismatch: ${snapshot.id}.`);
    }
    const durationMs = exam.questionDurationsMs[snapshot.id];
    if (typeof durationMs !== 'number' || !Number.isSafeInteger(durationMs) || durationMs < 0) {
      throw new Error(`Mock exam duration is invalid: ${snapshot.id}.`);
    }
  }
  if (!Number.isInteger(session.currentIndex) || session.currentIndex < 0 || session.currentIndex >= questionIds.length) {
    throw new Error('Mock exam current index is invalid.');
  }
  for (const questionId of [...Object.keys(session.responses), ...session.submittedQuestionIds]) {
    if (!questionIds.includes(questionId)) throw new Error(`Mock session contains an unknown question: ${questionId}.`);
  }
  if (new Set(session.submittedQuestionIds).size !== session.submittedQuestionIds.length) {
    throw new Error('Mock session contains duplicate submitted questions.');
  }
  if (session.startedAt !== exam.startedAt || session.updatedAt !== exam.updatedAt) {
    throw new Error('Mock exam timestamps do not match its session.');
  }
  timestampMs(exam.startedAt, 'Mock exam start time');
  timestampMs(exam.updatedAt, 'Mock exam update time');
  if (timestampMs(exam.updatedAt, 'Mock exam update time') < timestampMs(exam.startedAt, 'Mock exam start time')) {
    throw new Error('Mock exam update time precedes its start time.');
  }

  if (exam.status === 'in-progress') {
    if (
      exam.submittedAt !== undefined
      || exam.completedAt !== undefined
      || exam.submissionReason !== undefined
      || exam.score !== undefined
      || session.completedAt !== undefined
      || session.submittedQuestionIds.length > 0
    ) {
      throw new Error('In-progress mock exam contains submitted state.');
    }
    return;
  }

  if (!exam.submittedAt || !exam.submissionReason || !exam.score || session.completedAt !== exam.submittedAt) {
    throw new Error('Submitted mock exam is missing submission evidence.');
  }
  if (timestampMs(exam.submittedAt, 'Mock exam submission time') < timestampMs(exam.startedAt, 'Mock exam start time')) {
    throw new Error('Mock exam submission time precedes its start time.');
  }
  if (exam.status === 'submitted') {
    if (exam.completedAt !== undefined || exam.score.fullySelfScored) {
      throw new Error('Submitted mock exam has inconsistent completion state.');
    }
    return;
  }
  if (!exam.completedAt || !exam.score.fullySelfScored) {
    throw new Error('Completed mock exam is missing final self-scoring evidence.');
  }
  if (timestampMs(exam.completedAt, 'Mock exam completion time') < timestampMs(exam.submittedAt, 'Mock exam submission time')) {
    throw new Error('Mock exam completion time precedes submission.');
  }
}

function responseForDraft(snapshot: MockExam['blueprint']['questions'][number], response: UserResponse): void {
  if (snapshot.kind === 'single-choice') {
    if (response.type !== 'choice') throw new Error('Objective mock questions require a choice response.');
    return;
  }
  if (response.type !== 'comprehensive') {
    throw new Error('Comprehensive mock questions require a text response.');
  }
  if (response.selfScore !== undefined || response.checkedRubricIds.length > 0) {
    throw new Error('Comprehensive self-scoring is available only after submission.');
  }
}

function attemptId(examId: string, questionId: string): string {
  return `mock:${examId}:${questionId}`;
}

function attemptStart(exam: MockExam, submittedAt: string, durationMs: number): string {
  const start = timestampMs(exam.startedAt, 'Mock exam start time');
  const submitted = timestampMs(submittedAt, 'Mock attempt submission time');
  return new Date(Math.max(start, submitted - durationMs)).toISOString();
}

function makeAttempt(
  exam: MockExam,
  question: Question,
  response: UserResponse,
  submittedAt: string,
): Attempt {
  const evaluation = evaluateResponse(question, response);
  const durationMs = exam.questionDurationsMs[question.id] ?? 0;
  return {
    id: attemptId(exam.id, question.id),
    questionId: question.id,
    questionContentVersion: question.contentVersion,
    sessionId: exam.sessionId,
    mode: 'mock',
    response: structuredClone(response),
    correct: evaluation.correct,
    score: evaluation.score,
    startedAt: attemptStart(exam, submittedAt, durationMs),
    submittedAt,
    durationMs,
  };
}

function change(
  entityType: 'attempt' | 'session' | 'progress' | 'mock-exam',
  entityId: string,
  changedAt: string,
) {
  return {
    id: crypto.randomUUID(),
    entityType,
    entityId,
    operation: 'put' as const,
    changedAt,
  };
}

export class DexieMockExamRepository {
  constructor(private readonly database: UserDatabase) {}

  async createFixedExam(input: CreateFixedMockExamInput): Promise<MockExamBundle> {
    assertIdentifier(input.examId, 'Mock exam id');
    assertIdentifier(input.sessionId, 'Mock session id');
    timestampMs(input.startedAt, 'Mock exam start time');
    const blueprint = createFixedMockExamBlueprint(input.manifest, input.questions);
    const session = createStudySession(
      input.sessionId,
      blueprint.questions.map((entry) => ({ id: entry.id, contentVersion: entry.contentVersion })),
      'mock',
      input.startedAt,
    );
    const exam: MockExam = {
      id: input.examId,
      sessionId: input.sessionId,
      blueprint: structuredClone(blueprint),
      status: 'in-progress',
      questionDurationsMs: Object.fromEntries(blueprint.questions.map((entry) => [entry.id, 0])),
      startedAt: input.startedAt,
      updatedAt: input.startedAt,
    };
    assertMockExamSessionConsistency(exam, session);

    await this.database.transaction(
      'rw',
      this.database.mockExams,
      this.database.sessions,
      this.database.changeLog,
      async () => {
        if (await this.database.mockExams.get(input.examId)) throw new Error(`Mock exam already exists: ${input.examId}.`);
        if (await this.database.sessions.get(input.sessionId)) throw new Error(`Mock session already exists: ${input.sessionId}.`);
        await this.database.mockExams.put(exam);
        await this.database.sessions.put(session);
        await this.database.changeLog.bulkPut([
          change('mock-exam', exam.id, input.startedAt),
          change('session', session.id, input.startedAt),
        ]);
      },
    );
    return { exam: copyExam(exam), session: copySession(session) };
  }

  async getExam(examId: string): Promise<MockExamBundle | undefined> {
    const exam = await this.database.mockExams.get(examId);
    if (!exam) return undefined;
    const session = await this.database.sessions.get(exam.sessionId);
    if (!session) throw new Error(`Mock exam session is missing: ${exam.sessionId}.`);
    assertMockExamSessionConsistency(exam, session);
    return { exam: copyExam(exam), session: copySession(session) };
  }

  async listExams(): Promise<MockExam[]> {
    return (await this.database.mockExams.orderBy('updatedAt').reverse().toArray()).map(copyExam);
  }

  subscribeExam(
    examId: string,
    onValue: (value: MockExamBundle | undefined) => void,
    onError: (reason: unknown) => void = () => undefined,
  ): () => void {
    assertIdentifier(examId, 'Mock exam id');
    const subscription = liveQuery(() => this.getExam(examId)).subscribe({ next: onValue, error: onError });
    return () => subscription.unsubscribe();
  }

  subscribeExams(
    onValue: (value: MockExam[]) => void,
    onError: (reason: unknown) => void = () => undefined,
  ): () => void {
    const subscription = liveQuery(() => this.listExams()).subscribe({ next: onValue, error: onError });
    return () => subscription.unsubscribe();
  }

  async getLatestOpenExam(): Promise<MockExamBundle | undefined> {
    const exams = await this.database.mockExams.orderBy('updatedAt').reverse().toArray();
    const exam = exams.find((candidate) => candidate.status !== 'completed');
    return exam ? this.getExam(exam.id) : undefined;
  }

  async saveDraft(input: SaveMockExamDraftInput): Promise<MockExamBundle> {
    return this.database.transaction(
      'rw',
      this.database.mockExams,
      this.database.sessions,
      this.database.changeLog,
      async () => {
        const exam = await this.database.mockExams.get(input.examId);
        if (!exam) throw new Error(`Mock exam does not exist: ${input.examId}.`);
        const session = await this.database.sessions.get(exam.sessionId);
        if (!session) throw new Error(`Mock exam session is missing: ${exam.sessionId}.`);
        assertMockExamSessionConsistency(exam, session);
        if (exam.status !== 'in-progress') throw new Error('Mock exam has already been submitted.');
        assertExpectedUpdate(input.expectedUpdatedAt, exam.updatedAt);

        const snapshot = exam.blueprint.questions.find((entry) => entry.id === input.questionId);
        if (!snapshot) throw new Error(`Question does not belong to mock exam: ${input.questionId}.`);
        responseForDraft(snapshot, input.response);
        if (!Number.isInteger(input.currentIndex) || input.currentIndex < 0 || input.currentIndex >= session.questionIds.length) {
          throw new Error('Mock exam current index is invalid.');
        }
        if (!Number.isSafeInteger(input.durationMs) || input.durationMs < 0) {
          throw new Error('Mock exam question duration is invalid.');
        }
        const updatedAtMs = timestampMs(input.updatedAt, 'Mock exam update time');
        const previousUpdatedAtMs = timestampMs(exam.updatedAt, 'Mock exam previous update time');
        const startedAtMs = timestampMs(exam.startedAt, 'Mock exam start time');
        if (updatedAtMs < previousUpdatedAtMs || updatedAtMs < startedAtMs) {
          throw new Error('Mock exam draft update is stale.');
        }
        if (input.durationMs < exam.questionDurationsMs[input.questionId]!) {
          throw new Error('Mock exam question duration cannot move backwards.');
        }
        if (input.durationMs > updatedAtMs - startedAtMs) {
          throw new Error('Mock exam question duration exceeds elapsed exam time.');
        }

        const nextSession: StudySession = {
          ...session,
          currentIndex: input.currentIndex,
          responses: { ...session.responses, [input.questionId]: structuredClone(input.response) },
          updatedAt: input.updatedAt,
        };
        const nextExam: MockExam = {
          ...exam,
          questionDurationsMs: { ...exam.questionDurationsMs, [input.questionId]: input.durationMs },
          updatedAt: input.updatedAt,
        };
        assertMockExamSessionConsistency(nextExam, nextSession);
        await this.database.sessions.put(nextSession);
        await this.database.mockExams.put(nextExam);
        await this.database.changeLog.bulkPut([
          change('session', nextSession.id, input.updatedAt),
          change('mock-exam', nextExam.id, input.updatedAt),
        ]);
        return { exam: copyExam(nextExam), session: copySession(nextSession) };
      },
    );
  }

  async submitExam(input: SubmitMockExamInput): Promise<MockExamBundle> {
    return this.database.transaction(
      'rw',
      this.database.mockExams,
      this.database.sessions,
      this.database.attempts,
      this.database.versionedProgresses,
      this.database.changeLog,
      async () => {
        const exam = await this.database.mockExams.get(input.examId);
        if (!exam) throw new Error(`Mock exam does not exist: ${input.examId}.`);
        const session = await this.database.sessions.get(exam.sessionId);
        if (!session) throw new Error(`Mock exam session is missing: ${exam.sessionId}.`);
        assertMockExamSessionConsistency(exam, session);
        if (exam.status !== 'in-progress') {
          return { exam: copyExam(exam), session: copySession(session) };
        }
        assertExpectedUpdate(input.expectedUpdatedAt, exam.updatedAt);

        const submittedAtMs = timestampMs(input.submittedAt, 'Mock exam submission time');
        if (submittedAtMs < timestampMs(exam.updatedAt, 'Mock exam update time')) {
          throw new Error('Mock exam submission time precedes its latest draft.');
        }
        const questionsById = questionMap(input.questions);
        const score = scoreMockExam(exam.blueprint, questionsById, session.responses);
        const attempts: Attempt[] = [];
        const progresses: QuestionProgress[] = [];
        const submittedQuestionIds: string[] = [];

        for (const snapshot of exam.blueprint.questions) {
          if (snapshot.kind !== 'single-choice') continue;
          const response = session.responses[snapshot.id];
          if (response?.type !== 'choice') continue;
          const question = questionsById.get(snapshot.id)!;
          const nextAttempt = makeAttempt(exam, question, response, input.submittedAt);
          const existingById = await this.database.attempts.get(nextAttempt.id);
          const existingByQuestion = await this.database.attempts
            .where('sessionId')
            .equals(session.id)
            .and((entry) => entry.questionId === snapshot.id)
            .first();
          if (existingById || existingByQuestion) {
            throw new Error(`In-progress mock exam already has an attempt for ${snapshot.id}.`);
          }
          const previous = await this.database.versionedProgresses.get([
            snapshot.id,
            snapshot.contentVersion,
          ]);
          attempts.push(nextAttempt);
          progresses.push(applyAttemptToProgress(previous, nextAttempt));
          submittedQuestionIds.push(snapshot.id);
        }

        const completed = score.fullySelfScored;
        const nextSession: StudySession = {
          ...session,
          submittedQuestionIds,
          updatedAt: input.submittedAt,
          completedAt: input.submittedAt,
        };
        const nextExam: MockExam = {
          ...exam,
          status: completed ? 'completed' : 'submitted',
          updatedAt: input.submittedAt,
          submittedAt: input.submittedAt,
          submissionReason: input.reason,
          score,
          ...(completed ? { completedAt: input.submittedAt } : {}),
        };
        assertMockExamSessionConsistency(nextExam, nextSession);
        await this.database.attempts.bulkPut(attempts);
        await this.database.versionedProgresses.bulkPut(progresses);
        await this.database.sessions.put(nextSession);
        await this.database.mockExams.put(nextExam);
        await this.database.changeLog.bulkPut([
          ...attempts.map((attempt) => change('attempt', attempt.id, input.submittedAt)),
          ...progresses.map((progress) => change(
            'progress',
            `${progress.questionId}:${progress.questionContentVersion}`,
            input.submittedAt,
          )),
          change('session', nextSession.id, input.submittedAt),
          change('mock-exam', nextExam.id, input.submittedAt),
        ]);
        return { exam: copyExam(nextExam), session: copySession(nextSession) };
      },
    );
  }

  async selfScoreComprehensive(input: SelfScoreMockExamInput): Promise<MockExamBundle> {
    return this.database.transaction(
      'rw',
      this.database.mockExams,
      this.database.sessions,
      this.database.attempts,
      this.database.versionedProgresses,
      this.database.changeLog,
      async () => {
        const exam = await this.database.mockExams.get(input.examId);
        if (!exam) throw new Error(`Mock exam does not exist: ${input.examId}.`);
        const session = await this.database.sessions.get(exam.sessionId);
        if (!session) throw new Error(`Mock exam session is missing: ${exam.sessionId}.`);
        assertMockExamSessionConsistency(exam, session);
        if (exam.status === 'in-progress') throw new Error('Mock exam must be submitted before self-scoring.');

        const snapshot = exam.blueprint.questions.find((entry) => entry.id === input.questionId);
        const questionsById = questionMap(input.questions);
        const question = questionsById.get(input.questionId);
        if (!snapshot || snapshot.kind !== 'comprehensive' || !question || question.kind !== 'comprehensive') {
          throw new Error(`Question is not a comprehensive item in this mock exam: ${input.questionId}.`);
        }
        if (question.contentVersion !== snapshot.contentVersion || question.number !== snapshot.number) {
          throw new Error(`Mock exam question version has changed: ${input.questionId}.`);
        }
        if (!Number.isFinite(input.selfScore) || input.selfScore < 0 || input.selfScore > snapshot.maxScore) {
          throw new Error(`Mock exam self score must be between 0 and ${snapshot.maxScore}.`);
        }
        const rubricIds = question.answer.type === 'comprehensive'
          ? new Set(question.answer.rubric.map((entry) => entry.id))
          : new Set<string>();
        if (
          new Set(input.checkedRubricIds).size !== input.checkedRubricIds.length
          || input.checkedRubricIds.some((id) => !rubricIds.has(id))
        ) {
          throw new Error('Mock exam self-scoring contains an invalid rubric item.');
        }

        const existingResponse = session.responses[input.questionId];
        if (existingResponse?.type === 'comprehensive' && existingResponse.selfScore !== undefined) {
          const sameAssessment = existingResponse.selfScore === input.selfScore
            && sameStrings(existingResponse.checkedRubricIds, input.checkedRubricIds);
          if (!sameAssessment) throw new Error('Mock exam self-score is already completed and immutable.');
          return { exam: copyExam(exam), session: copySession(session) };
        }
        assertExpectedUpdate(input.expectedUpdatedAt, exam.updatedAt);
        if (existingResponse && existingResponse.type !== 'comprehensive') {
          throw new Error('Stored mock exam response kind is inconsistent.');
        }
        const assessedAtMs = timestampMs(input.assessedAt, 'Mock exam assessment time');
        if (assessedAtMs < timestampMs(exam.updatedAt, 'Mock exam update time')) {
          throw new Error('Mock exam assessment time precedes its latest update.');
        }
        const response: UserResponse = {
          type: 'comprehensive',
          text: existingResponse?.text ?? '',
          selfScore: input.selfScore,
          checkedRubricIds: [...input.checkedRubricIds],
        };
        const nextAttempt = makeAttempt(exam, question, response, input.assessedAt);
        const existingAttempt = await this.database.attempts.get(nextAttempt.id);
        if (existingAttempt) throw new Error(`Mock exam attempt already exists for ${input.questionId}.`);
        const previous = await this.database.versionedProgresses.get([
          snapshot.id,
          snapshot.contentVersion,
        ]);
        const progress = applyAttemptToProgress(previous, nextAttempt);
        const nextSessionBase: StudySession = {
          ...session,
          responses: { ...session.responses, [input.questionId]: response },
          submittedQuestionIds: [...session.submittedQuestionIds, input.questionId],
          updatedAt: input.assessedAt,
        };
        const score = scoreMockExam(exam.blueprint, questionsById, nextSessionBase.responses);
        const completed = score.fullySelfScored;
        const nextExam: MockExam = {
          ...exam,
          status: completed ? 'completed' : 'submitted',
          updatedAt: input.assessedAt,
          score,
          ...(completed ? { completedAt: input.assessedAt } : {}),
        };
        assertMockExamSessionConsistency(nextExam, nextSessionBase);
        await this.database.attempts.put(nextAttempt);
        await this.database.versionedProgresses.put(progress);
        await this.database.sessions.put(nextSessionBase);
        await this.database.mockExams.put(nextExam);
        await this.database.changeLog.bulkPut([
          change('attempt', nextAttempt.id, input.assessedAt),
          change('progress', `${progress.questionId}:${progress.questionContentVersion}`, input.assessedAt),
          change('session', nextSessionBase.id, input.assessedAt),
          change('mock-exam', nextExam.id, input.assessedAt),
        ]);
        return { exam: copyExam(nextExam), session: copySession(nextSessionBase) };
      },
    );
  }
}
