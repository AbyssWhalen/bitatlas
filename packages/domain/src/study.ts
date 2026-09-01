import type {
  Attempt,
  Mastery,
  Question,
  QuestionFilter,
  QuestionProgress,
  StudySession,
  StudyStats,
  Subject,
  UserResponse,
} from './types';
import { SUBJECTS } from './types';

export interface Evaluation {
  correct: boolean | null;
  score: number | null;
}

export interface CurrentQuestionProgress extends QuestionProgress {
  evidenceAttemptIds: string[];
}

export function evaluateResponse(question: Question, response: UserResponse): Evaluation {
  if (question.kind === 'single-choice' && question.answer.type === 'choice') {
    if (response.type !== 'choice') return { correct: false, score: 0 };
    const correct = response.optionId === question.answer.optionId;
    return { correct, score: correct ? 1 : 0 };
  }

  if (question.answer.type === 'comprehensive' && response.type === 'comprehensive') {
    const rawScore = response.selfScore;
    if (rawScore === undefined) return { correct: null, score: null };
    if (!Number.isFinite(rawScore)) throw new Error('Comprehensive self score must be finite.');
    if (rawScore < 0 || rawScore > question.answer.maxScore) {
      throw new Error(`Comprehensive self score must be between 0 and ${question.answer.maxScore}.`);
    }
    return {
      correct: null,
      score: rawScore,
    };
  }

  return { correct: null, score: null };
}

export function deriveMastery(previous: QuestionProgress | undefined, correct: boolean | null): Mastery {
  if (correct === null) return previous?.mastery ?? 'learning';
  if (!correct) return 'learning';
  const streak = (previous?.consecutiveCorrect ?? 0) + 1;
  if (streak >= 4) return 'mastered';
  if (streak >= 2) return 'familiar';
  return 'learning';
}

export function applyAttemptToProgress(
  previous: QuestionProgress | undefined,
  attempt: Attempt,
): QuestionProgress {
  if (previous && previous.questionContentVersion !== attempt.questionContentVersion) {
    throw new Error(
      `Cannot merge progress from ${previous.questionContentVersion} into ${attempt.questionContentVersion}.`,
    );
  }
  const correctIncrement = attempt.correct === true ? 1 : 0;
  const wrongIncrement = attempt.correct === false ? 1 : 0;
  return {
    questionId: attempt.questionId,
    questionContentVersion: attempt.questionContentVersion,
    mastery: deriveMastery(previous, attempt.correct),
    attemptCount: (previous?.attemptCount ?? 0) + 1,
    correctCount: (previous?.correctCount ?? 0) + correctIncrement,
    wrongCount: (previous?.wrongCount ?? 0) + wrongIncrement,
    consecutiveCorrect: attempt.correct === true ? (previous?.consecutiveCorrect ?? 0) + 1 : 0,
    lastCorrect: attempt.correct,
    lastAttemptAt: attempt.submittedAt,
    ...(previous?.nextReviewAt ? { nextReviewAt: previous.nextReviewAt } : {}),
  };
}

function blockText(question: Question): string {
  const parts = [...question.stem, ...(question.options?.flatMap((option) => option.content) ?? [])];
  return parts
    .map((block) => {
      if (block.type === 'text') return block.text;
      if (block.type === 'math') return block.expression;
      if (block.type === 'code') return block.code;
      if (block.type === 'table') return `${block.headers.join(' ')} ${block.rows.flat().join(' ')}`;
      return `${block.alt} ${block.caption ?? ''}`;
    })
    .join(' ')
    .toLocaleLowerCase('zh-CN');
}

export function filterQuestions(
  questions: Question[],
  filter: QuestionFilter,
  progressByQuestion: ReadonlyMap<string, QuestionProgress> = new Map(),
  collectedQuestionIds: ReadonlySet<string> = new Set(),
): Question[] {
  const search = filter.search?.trim().toLocaleLowerCase('zh-CN');
  return questions.filter((question) => {
    const progress = progressByQuestion.get(question.id);
    if (filter.year !== undefined && question.year !== filter.year) return false;
    if (filter.subjects?.length && !filter.subjects.includes(question.subject)) return false;
    if (filter.kinds?.length && !filter.kinds.includes(question.kind)) return false;
    if (filter.mastery?.length && !filter.mastery.includes(progress?.mastery ?? 'unseen')) return false;
    if (filter.onlyWrong && progress?.lastCorrect !== false) return false;
    if (filter.onlyCollected && !collectedQuestionIds.has(question.id)) return false;
    if (search && !`${question.number} ${blockText(question)}`.includes(search)) return false;
    return true;
  });
}

export function createStudySession(
  id: string,
  questions: Array<{ id: string; contentVersion: string }>,
  mode: StudySession['mode'],
  timestamp: string,
): StudySession {
  if (questions.length === 0) throw new Error('A study session requires at least one question.');
  if (new Set(questions.map((question) => question.id)).size !== questions.length) {
    throw new Error('A study session cannot contain duplicate questions.');
  }
  if (questions.some((question) => !question.contentVersion.trim())) {
    throw new Error('A study session requires a content version for every question.');
  }
  const questionIds = questions.map((question) => question.id);
  return {
    id,
    mode,
    questionIds: [...questionIds],
    questionContentVersions: Object.fromEntries(
      questions.map((question) => [question.id, question.contentVersion]),
    ),
    currentIndex: 0,
    responses: {},
    submittedQuestionIds: [],
    startedAt: timestamp,
    updatedAt: timestamp,
  };
}

export function seededShuffle<T>(items: readonly T[], seed: number): T[] {
  const result = [...items];
  let state = seed >>> 0;
  for (let index = result.length - 1; index > 0; index -= 1) {
    state = (state * 1664525 + 1013904223) >>> 0;
    const swapIndex = state % (index + 1);
    [result[index], result[swapIndex]] = [result[swapIndex]!, result[index]!];
  }
  return result;
}

function emptySubjectStats(): StudyStats['bySubject'] {
  return Object.fromEntries(
    SUBJECTS.map((subject) => [subject, { attempted: 0, correct: 0, accuracy: null }]),
  ) as Record<Subject, { attempted: number; correct: number; accuracy: number | null }>;
}

export function aggregateStats(attempts: Attempt[], questionsById: ReadonlyMap<string, Question>): StudyStats {
  const currentAttempts = attempts.filter((attempt) => {
    const question = questionsById.get(attempt.questionId);
    return question?.contentVersion === attempt.questionContentVersion;
  });
  const objective = currentAttempts.filter((attempt) => {
    const question = questionsById.get(attempt.questionId);
    return question?.kind === 'single-choice' && question.answer.type === 'choice' && attempt.correct !== null;
  });
  const correct = objective.filter((attempt) => attempt.correct).length;
  const bySubject = emptySubjectStats();

  for (const attempt of objective) {
    const question = questionsById.get(attempt.questionId);
    if (!question) continue;
    const entry = bySubject[question.subject];
    entry.attempted += 1;
    if (attempt.correct) entry.correct += 1;
  }

  for (const entry of Object.values(bySubject)) {
    entry.accuracy = entry.attempted === 0 ? null : entry.correct / entry.attempted;
  }

  return {
    attempted: objective.length,
    correct,
    wrong: objective.length - correct,
    accuracy: objective.length === 0 ? null : correct / objective.length,
    durationMs: currentAttempts.reduce((total, attempt) => total + attempt.durationMs, 0),
    bySubject,
  };
}

export function projectCurrentQuestionProgress(
  attempts: readonly Attempt[],
  questions: readonly Question[],
): Map<string, CurrentQuestionProgress> {
  const questionsById = new Map<string, Question>();
  for (const question of questions) {
    if (questionsById.has(question.id)) throw new Error(`Duplicate question id ${question.id}.`);
    questionsById.set(question.id, question);
  }

  const currentAttempts = attempts
    .filter((attempt) => questionsById.get(attempt.questionId)?.contentVersion === attempt.questionContentVersion)
    .sort((left, right) => left.submittedAt.localeCompare(right.submittedAt) || left.id.localeCompare(right.id));
  const result = new Map<string, CurrentQuestionProgress>();
  for (const attempt of currentAttempts) {
    const previous = result.get(attempt.questionId);
    const next = applyAttemptToProgress(previous, attempt);
    result.set(attempt.questionId, {
      ...next,
      evidenceAttemptIds: [...(previous?.evidenceAttemptIds ?? []), attempt.id],
    });
  }
  return result;
}
