import { z } from 'zod';
import { FIXED_MOCK_EXAM_RULES } from '@408os/domain';
import type {
  Attempt,
  CollectionEntry,
  LegacyQuestionProgress,
  LegacyStudySession,
  MockExam,
  Note,
  QuestionProgress,
  StudySession,
  UserResponse,
} from '@408os/domain';
import type { ContentDatabase, StoredSetting, UserDatabase } from './databases';
import {
  CONTENT_REVIEW_SETTING_PREFIX,
  contentReviewRecordSchema,
  contentReviewSettingKey,
} from './content-review';
import { migrateLegacySession, rebuildVersionedProgress } from './user-schema-v2';
import { assertMockExamSessionConsistency } from './mock-repository';
import { repairLegacyStudySelfScores } from './repositories';

const timestampSchema = z.iso.datetime();
const userResponseSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('choice'), optionId: z.enum(['A', 'B', 'C', 'D']) }).strict(),
  z.object({
    type: z.literal('comprehensive'),
    text: z.string(),
    selfScore: z.number().finite().nonnegative().optional(),
    checkedRubricIds: z.array(z.string().min(1)),
  }).strict(),
]);

const attemptSchema = z.object({
  id: z.string().min(1),
  questionId: z.string().min(1),
  questionContentVersion: z.string().min(1),
  sessionId: z.string().min(1),
  mode: z.enum(['practice', 'review', 'mock']),
  response: userResponseSchema,
  correct: z.boolean().nullable(),
  score: z.number().finite().nonnegative().nullable(),
  startedAt: timestampSchema,
  submittedAt: timestampSchema,
  durationMs: z.number().finite().nonnegative(),
}).strict();

const sessionSchema = z.object({
  id: z.string().min(1),
  mode: z.enum(['practice', 'review', 'mock']),
  questionIds: z.array(z.string().min(1)).min(1),
  currentIndex: z.int().nonnegative(),
  responses: z.record(z.string().min(1), userResponseSchema),
  submittedQuestionIds: z.array(z.string().min(1)),
  startedAt: timestampSchema,
  updatedAt: timestampSchema,
  completedAt: timestampSchema.optional(),
}).strict().superRefine((session, context) => {
  const questionIds = new Set(session.questionIds);
  if (questionIds.size !== session.questionIds.length) {
    context.addIssue({ code: 'custom', path: ['questionIds'], message: 'Question ids must be unique.' });
  }
  if (session.currentIndex >= session.questionIds.length) {
    context.addIssue({ code: 'custom', path: ['currentIndex'], message: 'Current index is outside the session.' });
  }
  if (new Set(session.submittedQuestionIds).size !== session.submittedQuestionIds.length) {
    context.addIssue({ code: 'custom', path: ['submittedQuestionIds'], message: 'Submitted question ids must be unique.' });
  }
  for (const questionId of [...session.submittedQuestionIds, ...Object.keys(session.responses)]) {
    if (!questionIds.has(questionId)) {
      context.addIssue({ code: 'custom', path: ['questionIds'], message: `Unknown session question ${questionId}.` });
    }
  }
  for (const [index, questionId] of session.submittedQuestionIds.entries()) {
    if (!Object.hasOwn(session.responses, questionId)) {
      context.addIssue({
        code: 'custom',
        path: ['submittedQuestionIds', index],
        message: `Submitted question ${questionId} is missing a response.`,
      });
    }
  }
});

const progressSchema = z.object({
  questionId: z.string().min(1),
  mastery: z.enum(['unseen', 'learning', 'familiar', 'mastered']),
  attemptCount: z.int().nonnegative(),
  correctCount: z.int().nonnegative(),
  wrongCount: z.int().nonnegative(),
  consecutiveCorrect: z.int().nonnegative(),
  lastCorrect: z.boolean().nullable(),
  lastAttemptAt: timestampSchema.optional(),
  nextReviewAt: timestampSchema.optional(),
}).strict().superRefine((progress, context) => {
  if (progress.correctCount + progress.wrongCount > progress.attemptCount) {
    context.addIssue({ code: 'custom', path: ['attemptCount'], message: 'Outcome counts exceed attempt count.' });
  }
  if (progress.consecutiveCorrect > progress.correctCount) {
    context.addIssue({ code: 'custom', path: ['consecutiveCorrect'], message: 'Correct streak exceeds correct count.' });
  }
});

const noteSchema = z.object({
  id: z.string().min(1),
  questionId: z.string().min(1),
  body: z.string().min(1),
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
}).strict();

const collectionSchema = z.object({
  questionId: z.string().min(1),
  createdAt: timestampSchema,
}).strict();

const settingSchema = z.object({ key: z.string().min(1), value: z.unknown() }).strict().superRefine((setting, context) => {
  if (!setting.key.startsWith(CONTENT_REVIEW_SETTING_PREFIX)) return;
  const parsed = contentReviewRecordSchema.safeParse(setting.value);
  if (!parsed.success) {
    context.addIssue({ code: 'custom', path: ['value'], message: 'Content review setting is invalid.' });
    return;
  }
  if (contentReviewSettingKey(parsed.data) !== setting.key) {
    context.addIssue({ code: 'custom', path: ['key'], message: 'Content review setting key does not match its value.' });
  }
});

function responsesEqual(left: UserResponse, right: UserResponse): boolean {
  if (left.type !== right.type) return false;
  if (left.type === 'choice' && right.type === 'choice') return left.optionId === right.optionId;
  if (left.type !== 'comprehensive' || right.type !== 'comprehensive') return false;
  return left.text === right.text
    && left.selfScore === right.selfScore
    && left.checkedRubricIds.length === right.checkedRubricIds.length
    && left.checkedRubricIds.every((id, index) => id === right.checkedRubricIds[index]);
}

function sameStringArrays(left: readonly string[], right: readonly string[]): boolean {
  return left.length === right.length && left.every((entry, index) => entry === right[index]);
}

const sessionQuestionKey = (sessionId: string, questionId: string) => `${sessionId}\u0000${questionId}`;

const backupSchema = z.object({
  schemaVersion: z.literal(1),
  exportedAt: timestampSchema,
  appVersion: z.string().min(1),
  data: z.object({
    attempts: z.array(attemptSchema),
    sessions: z.array(sessionSchema),
    progresses: z.array(progressSchema),
    notes: z.array(noteSchema),
    collections: z.array(collectionSchema),
    settings: z.array(settingSchema),
  }).strict(),
}).strict().superRefine((backup, context) => {
  const primaryKeys = [
    ['attempts', backup.data.attempts.map((entry) => entry.id)],
    ['sessions', backup.data.sessions.map((entry) => entry.id)],
    ['progresses', backup.data.progresses.map((entry) => entry.questionId)],
    ['notes', backup.data.notes.map((entry) => entry.id)],
    ['noteQuestions', backup.data.notes.map((entry) => entry.questionId)],
    ['collections', backup.data.collections.map((entry) => entry.questionId)],
    ['settings', backup.data.settings.map((entry) => entry.key)],
  ] as const;
  for (const [name, values] of primaryKeys) {
    if (new Set(values).size !== values.length) {
      context.addIssue({ code: 'custom', path: ['data', name], message: `Duplicate ${name} key.` });
    }
  }

  const sessionsById = new Map(backup.data.sessions.map((session) => [session.id, session]));
  const attemptsBySessionQuestion = new Map<string, number>();
  const attemptsByQuestion = new Map<string, Array<(typeof backup.data.attempts)[number]>>();

  for (const [attemptIndex, attempt] of backup.data.attempts.entries()) {
    const session = sessionsById.get(attempt.sessionId);
    if (!session) {
      context.addIssue({
        code: 'custom',
        path: ['data', 'attempts', attemptIndex, 'sessionId'],
        message: `Attempt references missing session ${attempt.sessionId}.`,
      });
    } else {
      if (attempt.mode !== session.mode) {
        context.addIssue({
          code: 'custom',
          path: ['data', 'attempts', attemptIndex, 'mode'],
          message: `Attempt mode does not match session ${session.id}.`,
        });
      }
      if (!session.questionIds.includes(attempt.questionId)) {
        context.addIssue({
          code: 'custom',
          path: ['data', 'attempts', attemptIndex, 'questionId'],
          message: `Attempt question ${attempt.questionId} does not belong to session ${session.id}.`,
        });
      }
      if (!session.submittedQuestionIds.includes(attempt.questionId)) {
        context.addIssue({
          code: 'custom',
          path: ['data', 'attempts', attemptIndex, 'questionId'],
          message: `Attempt question ${attempt.questionId} is not marked submitted by session ${session.id}.`,
        });
      }
      const sessionResponse = session.responses[attempt.questionId];
      if (!sessionResponse || !responsesEqual(attempt.response as UserResponse, sessionResponse as UserResponse)) {
        context.addIssue({
          code: 'custom',
          path: ['data', 'attempts', attemptIndex, 'response'],
          message: `Attempt response does not match session ${session.id}.`,
        });
      }
    }

    const key = sessionQuestionKey(attempt.sessionId, attempt.questionId);
    const previousAttemptIndex = attemptsBySessionQuestion.get(key);
    if (previousAttemptIndex !== undefined) {
      context.addIssue({
        code: 'custom',
        path: ['data', 'attempts', attemptIndex],
        message: `Duplicate attempt for session ${attempt.sessionId} question ${attempt.questionId}; first seen at attempts.${previousAttemptIndex}.`,
      });
    } else {
      attemptsBySessionQuestion.set(key, attemptIndex);
    }
    const questionAttempts = attemptsByQuestion.get(attempt.questionId) ?? [];
    questionAttempts.push(attempt);
    attemptsByQuestion.set(attempt.questionId, questionAttempts);
  }

  for (const [sessionIndex, session] of backup.data.sessions.entries()) {
    for (const [submittedIndex, questionId] of session.submittedQuestionIds.entries()) {
      if (!attemptsBySessionQuestion.has(sessionQuestionKey(session.id, questionId))) {
        context.addIssue({
          code: 'custom',
          path: ['data', 'sessions', sessionIndex, 'submittedQuestionIds', submittedIndex],
          message: `Submitted question ${questionId} is missing its attempt.`,
        });
      }
    }
  }

  const progressesByQuestion = new Map(backup.data.progresses.map((progress, index) => [progress.questionId, { progress, index }]));
  for (const [attemptIndex, attempt] of backup.data.attempts.entries()) {
    if (!progressesByQuestion.has(attempt.questionId)) {
      context.addIssue({
        code: 'custom',
        path: ['data', 'attempts', attemptIndex],
        message: `Attempt is missing derived progress for question ${attempt.questionId}.`,
      });
    }
  }

  for (const [progressIndex, progress] of backup.data.progresses.entries()) {
    const attempts = attemptsByQuestion.get(progress.questionId) ?? [];
    const correctCount = attempts.filter((attempt) => attempt.correct === true).length;
    const wrongCount = attempts.filter((attempt) => attempt.correct === false).length;
    if (
      progress.attemptCount !== attempts.length
      || progress.correctCount !== correctCount
      || progress.wrongCount !== wrongCount
    ) {
      context.addIssue({
        code: 'custom',
        path: ['data', 'progresses', progressIndex],
        message: `Progress counters do not match attempts for question ${progress.questionId}.`,
      });
    }

    if (attempts.length === 0) {
      if (progress.lastAttemptAt !== undefined || progress.lastCorrect !== null) {
        context.addIssue({
          code: 'custom',
          path: ['data', 'progresses', progressIndex],
          message: `Progress without attempts cannot declare a last attempt for question ${progress.questionId}.`,
        });
      }
      continue;
    }

    const latestSubmittedAt = attempts.reduce((latest, attempt) => (
      attempt.submittedAt > latest ? attempt.submittedAt : latest
    ), attempts[0]!.submittedAt);
    const latestOutcomes = attempts
      .filter((attempt) => attempt.submittedAt === latestSubmittedAt)
      .map((attempt) => attempt.correct);
    if (progress.lastAttemptAt !== latestSubmittedAt || !latestOutcomes.includes(progress.lastCorrect)) {
      context.addIssue({
        code: 'custom',
        path: ['data', 'progresses', progressIndex],
        message: `Progress latest outcome does not match attempts for question ${progress.questionId}.`,
      });
    }
  }
});

type BackupData = z.infer<typeof backupSchema>;

const versionedSessionSchema = z.object({
  id: z.string().min(1),
  mode: z.enum(['practice', 'review', 'mock']),
  questionIds: z.array(z.string().min(1)).min(1),
  questionContentVersions: z.record(z.string().min(1), z.string().min(1)),
  currentIndex: z.int().nonnegative(),
  responses: z.record(z.string().min(1), userResponseSchema),
  submittedQuestionIds: z.array(z.string().min(1)),
  startedAt: timestampSchema,
  updatedAt: timestampSchema,
  completedAt: timestampSchema.optional(),
}).strict().superRefine((session, context) => {
  const questionIds = new Set(session.questionIds);
  const versionIds = new Set(Object.keys(session.questionContentVersions));
  if (questionIds.size !== session.questionIds.length) {
    context.addIssue({ code: 'custom', path: ['questionIds'], message: 'Question ids must be unique.' });
  }
  if (session.currentIndex >= session.questionIds.length) {
    context.addIssue({ code: 'custom', path: ['currentIndex'], message: 'Current index is outside the session.' });
  }
  if (new Set(session.submittedQuestionIds).size !== session.submittedQuestionIds.length) {
    context.addIssue({ code: 'custom', path: ['submittedQuestionIds'], message: 'Submitted question ids must be unique.' });
  }
  for (const questionId of [...session.submittedQuestionIds, ...Object.keys(session.responses)]) {
    if (!questionIds.has(questionId)) {
      context.addIssue({ code: 'custom', path: ['questionIds'], message: `Unknown session question ${questionId}.` });
    }
  }
  for (const questionId of session.questionIds) {
    if (!versionIds.has(questionId)) {
      context.addIssue({ code: 'custom', path: ['questionContentVersions'], message: `Missing version for ${questionId}.` });
    }
  }
  for (const questionId of versionIds) {
    if (!questionIds.has(questionId)) {
      context.addIssue({ code: 'custom', path: ['questionContentVersions'], message: `Extra version for ${questionId}.` });
    }
  }
  for (const [index, questionId] of session.submittedQuestionIds.entries()) {
    if (!Object.hasOwn(session.responses, questionId)) {
      context.addIssue({
        code: 'custom',
        path: ['submittedQuestionIds', index],
        message: `Submitted question ${questionId} is missing a response.`,
      });
    }
  }
});

const versionedProgressSchema = z.object({
  questionId: z.string().min(1),
  questionContentVersion: z.string().min(1),
  mastery: z.enum(['unseen', 'learning', 'familiar', 'mastered']),
  attemptCount: z.int().nonnegative(),
  correctCount: z.int().nonnegative(),
  wrongCount: z.int().nonnegative(),
  consecutiveCorrect: z.int().nonnegative(),
  lastCorrect: z.boolean().nullable(),
  lastAttemptAt: timestampSchema.optional(),
  nextReviewAt: timestampSchema.optional(),
}).strict().superRefine((progress, context) => {
  if (progress.questionContentVersion === '__legacy_unversioned__') {
    context.addIssue({ code: 'custom', path: ['questionContentVersion'], message: 'Legacy progress belongs in legacyProgresses.' });
  }
  if (progress.correctCount + progress.wrongCount > progress.attemptCount) {
    context.addIssue({ code: 'custom', path: ['attemptCount'], message: 'Outcome counts exceed attempt count.' });
  }
  if (progress.consecutiveCorrect > progress.correctCount) {
    context.addIssue({ code: 'custom', path: ['consecutiveCorrect'], message: 'Correct streak exceeds correct count.' });
  }
});

const backupV2Schema = z.object({
  schemaVersion: z.literal(2),
  exportedAt: timestampSchema,
  appVersion: z.string().min(1),
  data: z.object({
    attempts: z.array(attemptSchema),
    sessions: z.array(versionedSessionSchema),
    progresses: z.array(versionedProgressSchema),
    legacyProgresses: z.array(progressSchema),
    notes: z.array(noteSchema),
    collections: z.array(collectionSchema),
    settings: z.array(settingSchema),
  }).strict(),
}).strict().superRefine((backup, context) => {
  const keyGroups = [
    ['attempts', backup.data.attempts.map((entry) => entry.id)],
    ['sessions', backup.data.sessions.map((entry) => entry.id)],
    ['progresses', backup.data.progresses.map((entry) => `${entry.questionId}\u0000${entry.questionContentVersion}`)],
    ['legacyProgresses', backup.data.legacyProgresses.map((entry) => entry.questionId)],
    ['notes', backup.data.notes.map((entry) => entry.id)],
    ['noteQuestions', backup.data.notes.map((entry) => entry.questionId)],
    ['collections', backup.data.collections.map((entry) => entry.questionId)],
    ['settings', backup.data.settings.map((entry) => entry.key)],
  ] as const;
  for (const [name, values] of keyGroups) {
    if (new Set(values).size !== values.length) {
      context.addIssue({ code: 'custom', path: ['data', name], message: `Duplicate ${name} key.` });
    }
  }

  const sessionsById = new Map(backup.data.sessions.map((session) => [session.id, session]));
  const attemptsBySessionQuestion = new Map<string, number>();
  const attemptsByVersionedQuestion = new Map<string, Array<(typeof backup.data.attempts)[number]>>();

  for (const [attemptIndex, attempt] of backup.data.attempts.entries()) {
    const session = sessionsById.get(attempt.sessionId);
    if (!session) {
      context.addIssue({
        code: 'custom',
        path: ['data', 'attempts', attemptIndex, 'sessionId'],
        message: `Attempt references missing session ${attempt.sessionId}.`,
      });
    } else {
      if (attempt.mode !== session.mode) {
        context.addIssue({ code: 'custom', path: ['data', 'attempts', attemptIndex, 'mode'], message: `Attempt mode does not match session ${session.id}.` });
      }
      if (!session.questionIds.includes(attempt.questionId)) {
        context.addIssue({ code: 'custom', path: ['data', 'attempts', attemptIndex, 'questionId'], message: `Attempt question ${attempt.questionId} does not belong to session ${session.id}.` });
      }
      if (!session.submittedQuestionIds.includes(attempt.questionId)) {
        context.addIssue({ code: 'custom', path: ['data', 'attempts', attemptIndex, 'questionId'], message: `Attempt question ${attempt.questionId} is not marked submitted by session ${session.id}.` });
      }
      if (session.questionContentVersions[attempt.questionId] !== attempt.questionContentVersion) {
        context.addIssue({ code: 'custom', path: ['data', 'attempts', attemptIndex, 'questionContentVersion'], message: `Attempt version does not match session ${session.id}.` });
      }
      const sessionResponse = session.responses[attempt.questionId];
      if (!sessionResponse || !responsesEqual(attempt.response as UserResponse, sessionResponse as UserResponse)) {
        context.addIssue({ code: 'custom', path: ['data', 'attempts', attemptIndex, 'response'], message: `Attempt response does not match session ${session.id}.` });
      }
    }

    const sessionKey = sessionQuestionKey(attempt.sessionId, attempt.questionId);
    if (attemptsBySessionQuestion.has(sessionKey)) {
      context.addIssue({ code: 'custom', path: ['data', 'attempts', attemptIndex], message: `Duplicate attempt for session ${attempt.sessionId} question ${attempt.questionId}.` });
    } else {
      attemptsBySessionQuestion.set(sessionKey, attemptIndex);
    }
    const versionedKey = `${attempt.questionId}\u0000${attempt.questionContentVersion}`;
    const questionAttempts = attemptsByVersionedQuestion.get(versionedKey) ?? [];
    questionAttempts.push(attempt);
    attemptsByVersionedQuestion.set(versionedKey, questionAttempts);
  }

  for (const [sessionIndex, session] of backup.data.sessions.entries()) {
    for (const [submittedIndex, questionId] of session.submittedQuestionIds.entries()) {
      if (!attemptsBySessionQuestion.has(sessionQuestionKey(session.id, questionId))) {
        context.addIssue({ code: 'custom', path: ['data', 'sessions', sessionIndex, 'submittedQuestionIds', submittedIndex], message: `Submitted question ${questionId} is missing its attempt.` });
      }
    }
  }

  const progressesByKey = new Map(backup.data.progresses.map((progress, index) => [
    `${progress.questionId}\u0000${progress.questionContentVersion}`,
    { progress, index },
  ]));
  for (const [attemptIndex, attempt] of backup.data.attempts.entries()) {
    const key = `${attempt.questionId}\u0000${attempt.questionContentVersion}`;
    if (!progressesByKey.has(key)) {
      context.addIssue({ code: 'custom', path: ['data', 'attempts', attemptIndex], message: `Attempt is missing derived progress for ${key}.` });
    }
  }
  for (const [progressKey, { progress, index }] of progressesByKey) {
    const attempts = attemptsByVersionedQuestion.get(progressKey) ?? [];
    const correctCount = attempts.filter((attempt) => attempt.correct === true).length;
    const wrongCount = attempts.filter((attempt) => attempt.correct === false).length;
    if (
      progress.attemptCount !== attempts.length
      || progress.correctCount !== correctCount
      || progress.wrongCount !== wrongCount
    ) {
      context.addIssue({ code: 'custom', path: ['data', 'progresses', index], message: `Progress counters do not match attempts for ${progressKey}.` });
    }
    if (attempts.length === 0) {
      if (progress.lastAttemptAt !== undefined || progress.lastCorrect !== null) {
        context.addIssue({ code: 'custom', path: ['data', 'progresses', index], message: `Progress without attempts cannot declare a last attempt for ${progressKey}.` });
      }
      continue;
    }
    const latestSubmittedAt = attempts.reduce((latest, attempt) => (
      attempt.submittedAt > latest ? attempt.submittedAt : latest
    ), attempts[0]!.submittedAt);
    const latestOutcomes = attempts.filter((attempt) => attempt.submittedAt === latestSubmittedAt).map((attempt) => attempt.correct);
    if (progress.lastAttemptAt !== latestSubmittedAt || !latestOutcomes.includes(progress.lastCorrect)) {
      context.addIssue({ code: 'custom', path: ['data', 'progresses', index], message: `Progress latest outcome does not match attempts for ${progressKey}.` });
    }
  }
});

type BackupV2Data = z.infer<typeof backupV2Schema>;

const mockExamQuestionSnapshotSchema = z.object({
  id: z.string().min(1),
  number: z.int().positive(),
  kind: z.enum(['single-choice', 'comprehensive']),
  contentVersion: z.string().min(1),
  maxScore: z.number().finite().positive(),
}).strict();

const mockExamBlueprintSchema = z.object({
  packId: z.string().min(1),
  packHash: z.string().regex(/^[a-f\d]{64}$/iu),
  contentVersion: z.string().min(1),
  year: z.int().positive(),
  durationMinutes: z.number().finite().positive(),
  objectiveMaxScore: z.number().finite().nonnegative(),
  comprehensiveMaxScore: z.number().finite().nonnegative(),
  totalMaxScore: z.number().finite().positive(),
  questions: z.array(mockExamQuestionSnapshotSchema),
}).strict().superRefine((blueprint, context) => {
  const rules = FIXED_MOCK_EXAM_RULES;
  if (
    blueprint.durationMinutes !== rules.durationMinutes
    || blueprint.objectiveMaxScore !== rules.objectiveMaxScore
    || blueprint.comprehensiveMaxScore !== rules.comprehensiveMaxScore
    || blueprint.totalMaxScore !== rules.totalMaxScore
    || blueprint.questions.length !== rules.questionCount
  ) {
    context.addIssue({ code: 'custom', path: ['questions'], message: 'Mock exam blueprint does not match fixed-paper rules.' });
  }
  if (new Set(blueprint.questions.map((entry) => entry.id)).size !== blueprint.questions.length) {
    context.addIssue({ code: 'custom', path: ['questions'], message: 'Mock exam question ids must be unique.' });
  }
  let comprehensiveScore = 0;
  for (const [index, snapshot] of blueprint.questions.entries()) {
    const expectedNumber = index + 1;
    const expectedKind = expectedNumber <= rules.objectiveCount ? 'single-choice' : 'comprehensive';
    if (snapshot.number !== expectedNumber || snapshot.kind !== expectedKind) {
      context.addIssue({ code: 'custom', path: ['questions', index], message: 'Mock exam question order or kind is invalid.' });
    }
    if (snapshot.contentVersion !== blueprint.contentVersion) {
      context.addIssue({ code: 'custom', path: ['questions', index, 'contentVersion'], message: 'Mock exam question version differs from its pack snapshot.' });
    }
    if (snapshot.kind === 'single-choice' && snapshot.maxScore !== rules.objectivePointsPerQuestion) {
      context.addIssue({ code: 'custom', path: ['questions', index, 'maxScore'], message: 'Mock objective score is invalid.' });
    }
    if (snapshot.kind === 'comprehensive') comprehensiveScore += snapshot.maxScore;
  }
  if (comprehensiveScore !== rules.comprehensiveMaxScore) {
    context.addIssue({ code: 'custom', path: ['questions'], message: 'Mock comprehensive scores do not sum to the fixed-paper maximum.' });
  }
});

const mockExamScoreSchema = z.object({
  objectiveScore: z.number().finite().nonnegative(),
  comprehensiveScore: z.number().finite().nonnegative(),
  totalScore: z.number().finite().nonnegative(),
  objectiveAnswered: z.int().nonnegative(),
  comprehensiveSelfScored: z.int().nonnegative(),
  fullySelfScored: z.boolean(),
  pendingSelfScoreQuestionIds: z.array(z.string().min(1)),
}).strict();

const mockExamSchema = z.object({
  id: z.string().min(1),
  sessionId: z.string().min(1),
  blueprint: mockExamBlueprintSchema,
  status: z.enum(['in-progress', 'submitted', 'completed']),
  questionDurationsMs: z.record(z.string().min(1), z.int().nonnegative()),
  startedAt: timestampSchema,
  updatedAt: timestampSchema,
  submittedAt: timestampSchema.optional(),
  completedAt: timestampSchema.optional(),
  submissionReason: z.enum(['manual', 'timeout']).optional(),
  score: mockExamScoreSchema.optional(),
}).strict();

const backupV3Schema = z.object({
  schemaVersion: z.literal(3),
  exportedAt: timestampSchema,
  appVersion: z.string().min(1),
  data: z.object({
    attempts: z.array(attemptSchema),
    sessions: z.array(versionedSessionSchema),
    progresses: z.array(versionedProgressSchema),
    legacyProgresses: z.array(progressSchema),
    notes: z.array(noteSchema),
    collections: z.array(collectionSchema),
    settings: z.array(settingSchema),
    mockExams: z.array(mockExamSchema),
  }).strict(),
}).strict().superRefine((backup, context) => {
  const v2Result = backupV2Schema.safeParse({
    schemaVersion: 2,
    exportedAt: backup.exportedAt,
    appVersion: backup.appVersion,
    data: {
      attempts: backup.data.attempts,
      sessions: backup.data.sessions,
      progresses: backup.data.progresses,
      legacyProgresses: backup.data.legacyProgresses,
      notes: backup.data.notes,
      collections: backup.data.collections,
      settings: backup.data.settings,
    },
  });
  if (!v2Result.success) {
    for (const issue of v2Result.error.issues) {
      context.addIssue({ code: 'custom', path: issue.path, message: issue.message });
    }
  }

  const examIds = backup.data.mockExams.map((entry) => entry.id);
  const examSessionIds = backup.data.mockExams.map((entry) => entry.sessionId);
  if (new Set(examIds).size !== examIds.length) {
    context.addIssue({ code: 'custom', path: ['data', 'mockExams'], message: 'Duplicate mock exam id.' });
  }
  if (new Set(examSessionIds).size !== examSessionIds.length) {
    context.addIssue({ code: 'custom', path: ['data', 'mockExams'], message: 'Duplicate mock exam session id.' });
  }

  const sessionsById = new Map(backup.data.sessions.map((session) => [session.id, session]));
  const attemptsBySession = new Map<string, typeof backup.data.attempts>();
  for (const attempt of backup.data.attempts) {
    const entries = attemptsBySession.get(attempt.sessionId) ?? [];
    entries.push(attempt);
    attemptsBySession.set(attempt.sessionId, entries);
  }

  for (const [examIndex, exam] of backup.data.mockExams.entries()) {
    const session = sessionsById.get(exam.sessionId);
    if (!session) {
      context.addIssue({ code: 'custom', path: ['data', 'mockExams', examIndex, 'sessionId'], message: `Mock exam references missing session ${exam.sessionId}.` });
      continue;
    }
    try {
      assertMockExamSessionConsistency(exam as MockExam, session as StudySession);
    } catch (reason) {
      context.addIssue({
        code: 'custom',
        path: ['data', 'mockExams', examIndex],
        message: reason instanceof Error ? reason.message : 'Mock exam/session consistency check failed.',
      });
      continue;
    }

    if (!exam.score) continue;
    const snapshots = new Map(exam.blueprint.questions.map((entry) => [entry.id, entry]));
    const sessionAttempts = attemptsBySession.get(session.id) ?? [];
    let objectiveScore = 0;
    let objectiveAnswered = 0;
    let comprehensiveScore = 0;
    let comprehensiveSelfScored = 0;
    const pendingSelfScoreQuestionIds: string[] = [];

    for (const snapshot of exam.blueprint.questions) {
      const response = session.responses[snapshot.id];
      const attempt = sessionAttempts.find((entry) => entry.questionId === snapshot.id);
      if (snapshot.kind === 'single-choice') {
        if (response?.type === 'choice') objectiveAnswered += 1;
        if (attempt) {
          if (attempt.id !== `mock:${exam.id}:${snapshot.id}` || attempt.correct === null || attempt.score !== (attempt.correct ? 1 : 0)) {
            context.addIssue({ code: 'custom', path: ['data', 'attempts'], message: `Mock objective attempt is inconsistent for ${snapshot.id}.` });
          }
          if (attempt.correct) objectiveScore += FIXED_MOCK_EXAM_RULES.objectivePointsPerQuestion;
        }
        continue;
      }

      if (response?.type !== 'comprehensive' || response.selfScore === undefined) {
        pendingSelfScoreQuestionIds.push(snapshot.id);
        continue;
      }
      comprehensiveSelfScored += 1;
      const score = Math.min(snapshot.maxScore, Math.max(0, response.selfScore));
      comprehensiveScore += score;
      if (
        !attempt
        || attempt.id !== `mock:${exam.id}:${snapshot.id}`
        || attempt.correct !== null
        || attempt.score !== score
      ) {
        context.addIssue({ code: 'custom', path: ['data', 'attempts'], message: `Mock comprehensive attempt is inconsistent for ${snapshot.id}.` });
      }
    }

    const expectedFullySelfScored = pendingSelfScoreQuestionIds.length === 0;
    if (
      exam.score.objectiveScore !== objectiveScore
      || exam.score.objectiveAnswered !== objectiveAnswered
      || exam.score.comprehensiveScore !== comprehensiveScore
      || exam.score.comprehensiveSelfScored !== comprehensiveSelfScored
      || exam.score.totalScore !== objectiveScore + comprehensiveScore
      || exam.score.fullySelfScored !== expectedFullySelfScored
      || !sameStringArrays(exam.score.pendingSelfScoreQuestionIds, pendingSelfScoreQuestionIds)
    ) {
      context.addIssue({ code: 'custom', path: ['data', 'mockExams', examIndex, 'score'], message: 'Mock exam score does not match its persisted responses and attempts.' });
    }
    for (const attempt of sessionAttempts) {
      if (!snapshots.has(attempt.questionId)) {
        context.addIssue({ code: 'custom', path: ['data', 'attempts'], message: `Mock attempt references a question outside exam ${exam.id}.` });
      }
    }
  }
});

type BackupV3Data = z.infer<typeof backupV3Schema>;
type AnyBackupData = BackupData | BackupV2Data | BackupV3Data;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function sameStringArrayValues(left: unknown, right: unknown): boolean {
  return Array.isArray(left)
    && Array.isArray(right)
    && left.length === right.length
    && left.every((value, index) => value === right[index]);
}

function legacyResponseEvidenceMatches(
  session: Record<string, unknown>,
  questionId: string,
  response: Record<string, unknown>,
  attempt: Record<string, unknown>,
): boolean {
  const attemptResponse = attempt.response;
  if (!isRecord(attemptResponse) || attemptResponse.type !== 'comprehensive') return false;
  if (
    attempt.mode !== session.mode
    || attempt.sessionId !== session.id
    || attempt.questionId !== questionId
    || attempt.correct !== null
    || response.text !== attemptResponse.text
    || response.selfScore !== attemptResponse.selfScore
    || !sameStringArrayValues(response.checkedRubricIds, attemptResponse.checkedRubricIds)
  ) return false;
  const versions = session.questionContentVersions;
  return !isRecord(versions) || versions[questionId] === attempt.questionContentVersion;
}

/**
 * Older study writes could clamp comprehensive scores after persisting the raw
 * response. Repair only the two observable clamp shapes; all other damage is
 * rejected before the strict backup schema runs.
 */
function migrateLegacyInvalidSelfScores(raw: unknown): unknown {
  if (!isRecord(raw) || !isRecord(raw.data)) return raw;
  const sessions = raw.data.sessions;
  const attempts = raw.data.attempts;
  if (!Array.isArray(sessions) || !Array.isArray(attempts)) return raw;

  const attemptsBySessionQuestion = new Map<string, Record<string, unknown>[]>();
  for (const attempt of attempts) {
    if (!isRecord(attempt) || typeof attempt.sessionId !== 'string' || typeof attempt.questionId !== 'string') continue;
    const key = `${attempt.sessionId}\u0000${attempt.questionId}`;
    const entries = attemptsBySessionQuestion.get(key) ?? [];
    entries.push(attempt);
    attemptsBySessionQuestion.set(key, entries);
  }

  let unresolved = 0;
  for (const session of sessions) {
    if (!isRecord(session) || session.mode === 'mock' || !isRecord(session.responses)) continue;
    const submittedQuestionIds = Array.isArray(session.submittedQuestionIds) ? session.submittedQuestionIds : [];
    for (const [questionId, response] of Object.entries(session.responses)) {
      if (!isRecord(response) || response.type !== 'comprehensive' || !Object.hasOwn(response, 'selfScore')) continue;
      const score = response.selfScore;
      const invalidScore = typeof score === 'number' && (!Number.isFinite(score) || score < 0);
      const candidates = typeof session.id === 'string'
        ? attemptsBySessionQuestion.get(`${session.id}\u0000${questionId}`) ?? []
        : [];
      if (!submittedQuestionIds.includes(questionId)) {
        if (typeof score === 'number' && Number.isFinite(score) && score < 0 && candidates.length === 0) {
          delete response.selfScore;
        }
        else if (typeof score === 'number' && Number.isFinite(score) && score < 0) unresolved += 1;
        else if (invalidScore) unresolved += 1;
        continue;
      }

      const attempt = candidates.length === 1 ? candidates[0] : undefined;
      const attemptScore = attempt?.score;
      const knownNegativeClamp = typeof score === 'number'
        && Number.isFinite(score)
        && score < 0
        && attemptScore === 0;
      const upperClampShape = typeof score === 'number'
        && Number.isFinite(score)
        && score >= 0
        && typeof attemptScore === 'number'
        && Number.isFinite(attemptScore)
        && score > attemptScore;
      const knownUpperClamp = upperClampShape
        && typeof attemptScore === 'number'
        && attemptScore > 0;
      if (!invalidScore && !upperClampShape) continue;
      if (
        !attempt
        || !legacyResponseEvidenceMatches(session, questionId, response, attempt)
        || typeof attemptScore !== 'number'
        || !Number.isFinite(attemptScore)
        || (!knownNegativeClamp && !knownUpperClamp)
      ) {
        unresolved += 1;
        continue;
      }

      response.selfScore = attemptScore;
      if (isRecord(attempt.response)) attempt.response.selfScore = attemptScore;
    }
  }

  if (unresolved) {
    throw new Error(`Legacy comprehensive self scores require manual recovery (${unresolved} unresolved record${unresolved === 1 ? '' : 's'}).`);
  }
  return raw;
}

function parseAnyBackup(json: string): AnyBackupData {
  let raw: unknown;
  try {
    raw = JSON.parse(json);
  } catch {
    throw new Error('Backup is not valid JSON.');
  }
  raw = migrateLegacyInvalidSelfScores(raw);
  const schemaVersion = typeof raw === 'object' && raw !== null && 'schemaVersion' in raw
    ? raw.schemaVersion
    : undefined;
  const schema = schemaVersion === 3
    ? backupV3Schema
    : schemaVersion === 2
      ? backupV2Schema
      : backupSchema;
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const path = issue?.path.join('.') || 'root';
    throw new Error(`Backup data is invalid at ${path}: ${issue?.message ?? 'Unknown schema error.'}`);
  }
  return parsed.data as AnyBackupData;
}

function previewAnyBackup(backup: AnyBackupData): BackupPreview {
  return {
    schemaVersion: backup.schemaVersion,
    exportedAt: backup.exportedAt,
    counts: {
      attempts: backup.data.attempts.length,
      sessions: backup.data.sessions.length,
      progresses: backup.data.progresses.length,
      legacyProgresses: backup.schemaVersion === 2 ? backup.data.legacyProgresses.length : 0,
      notes: backup.data.notes.length,
      collections: backup.data.collections.length,
      settings: backup.data.settings.length,
      mockExams: backup.schemaVersion === 3 ? backup.data.mockExams.length : 0,
    },
  };
}

function migrateV1Backup(backup: BackupData): BackupV2Data {
  const attempts = backup.data.attempts as Attempt[];
  const sessions = backup.data.sessions as LegacyStudySession[];
  return backupV2Schema.parse({
    schemaVersion: 2,
    exportedAt: backup.exportedAt,
    appVersion: backup.appVersion,
    data: {
      attempts,
      sessions: sessions.map((session) => migrateLegacySession(session, attempts)),
      progresses: rebuildVersionedProgress(attempts),
      legacyProgresses: backup.data.progresses,
      notes: backup.data.notes,
      collections: backup.data.collections,
      settings: backup.data.settings,
    },
  }) as BackupV2Data;
}

function migrateBackupToV3(backup: BackupData | BackupV2Data): BackupV3Data {
  const v2 = backup.schemaVersion === 1 ? migrateV1Backup(backup) : backup;
  return backupV3Schema.parse({
    schemaVersion: 3,
    exportedAt: v2.exportedAt,
    appVersion: v2.appVersion,
    data: {
      ...v2.data,
      mockExams: [],
    },
  }) as BackupV3Data;
}

export interface BackupPreview {
  schemaVersion: 1 | 2 | 3;
  exportedAt: string;
  counts: Record<
    'attempts' | 'sessions' | 'progresses' | 'legacyProgresses' | 'notes' | 'collections' | 'settings' | 'mockExams',
    number
  >;
}

export type BackupImportMode = 'merge' | 'replace';

export class BackupService {
  constructor(
    private readonly userDatabase: UserDatabase,
    private readonly contentDatabase: ContentDatabase,
  ) {}

  async exportJson(appVersion: string): Promise<string> {
    await repairLegacyStudySelfScores(this.userDatabase);
    const [attempts, sessions, progresses, legacyProgresses, notes, collections, settings, mockExams] = await Promise.all([
      this.userDatabase.attempts.toArray(),
      this.userDatabase.sessions.toArray(),
      this.userDatabase.versionedProgresses.toArray(),
      this.userDatabase.progresses.toArray(),
      this.userDatabase.notes.toArray(),
      this.userDatabase.collections.toArray(),
      this.userDatabase.settings.toArray(),
      this.userDatabase.mockExams.toArray(),
    ]);
    const json = JSON.stringify(
      {
        schemaVersion: 3,
        exportedAt: new Date().toISOString(),
        appVersion,
        data: { attempts, sessions, progresses, legacyProgresses, notes, collections, settings, mockExams },
      },
      null,
      2,
    );
    parseAnyBackup(json);
    return json;
  }

  preflight(json: string): BackupPreview {
    return previewAnyBackup(parseAnyBackup(json));
  }

  async importJson(json: string, mode: BackupImportMode): Promise<BackupPreview> {
    if (mode !== 'merge' && mode !== 'replace') {
      throw new Error(`Backup import mode is invalid: ${String(mode)}.`);
    }
    const parsed = parseAnyBackup(json);
    const preview = previewAnyBackup(parsed);
    const backup = parsed.schemaVersion === 3 ? parsed : migrateBackupToV3(parsed);
    const tables = [
      this.userDatabase.attempts,
      this.userDatabase.sessions,
      this.userDatabase.progresses,
      this.userDatabase.versionedProgresses,
      this.userDatabase.notes,
      this.userDatabase.collections,
      this.userDatabase.settings,
      this.userDatabase.mockExams,
      this.userDatabase.changeLog,
    ] as const;
    await this.userDatabase.transaction('rw', tables, async () => {
      if (mode === 'merge') {
        const [attempts, sessions, progresses, legacyProgresses, notes, collections, settings, mockExams] = await Promise.all([
          this.userDatabase.attempts.toArray(),
          this.userDatabase.sessions.toArray(),
          this.userDatabase.versionedProgresses.toArray(),
          this.userDatabase.progresses.toArray(),
          this.userDatabase.notes.toArray(),
          this.userDatabase.collections.toArray(),
          this.userDatabase.settings.toArray(),
          this.userDatabase.mockExams.toArray(),
        ]);
        const merged = backupV3Schema.safeParse({
          schemaVersion: 3,
          exportedAt: backup.exportedAt,
          appVersion: backup.appVersion,
          data: {
            attempts: [...attempts, ...backup.data.attempts],
            sessions: [...sessions, ...backup.data.sessions],
            progresses: [...progresses, ...backup.data.progresses],
            legacyProgresses: [...legacyProgresses, ...backup.data.legacyProgresses],
            notes: [...notes, ...backup.data.notes],
            collections: [...collections, ...backup.data.collections],
            settings: [...settings, ...backup.data.settings],
            mockExams: [...mockExams, ...backup.data.mockExams],
          },
        });
        if (!merged.success) {
          const issue = merged.error.issues[0];
          const path = issue?.path.join('.') || 'root';
          throw new Error(
            `Backup merge is ambiguous at ${path}: ${issue?.message ?? 'Combined data is invalid.'}`,
          );
        }
      }
      if (mode === 'replace') await Promise.all(tables.map((table) => table.clear()));
      await this.userDatabase.attempts.bulkPut(backup.data.attempts as Attempt[]);
      await this.userDatabase.sessions.bulkPut(backup.data.sessions as StudySession[]);
      await this.userDatabase.versionedProgresses.bulkPut(backup.data.progresses as QuestionProgress[]);
      await this.userDatabase.progresses.bulkPut(backup.data.legacyProgresses as LegacyQuestionProgress[]);
      await this.userDatabase.notes.bulkPut(backup.data.notes as Note[]);
      await this.userDatabase.collections.bulkPut(backup.data.collections as CollectionEntry[]);
      await this.userDatabase.settings.bulkPut(backup.data.settings as StoredSetting[]);
      await this.userDatabase.mockExams.bulkPut(backup.data.mockExams as MockExam[]);
    });
    return preview;
  }

  async contentPackSummary(): Promise<Array<{ id: string; contentVersion: string; sha256: string }>> {
    const packs = await this.contentDatabase.packs.toArray();
    return packs.map(({ id, contentVersion, sha256 }) => ({ id, contentVersion, sha256 }));
  }
}
