import type { Attempt, KnowledgePoint, Question, Subject } from './types';
import { SUBJECTS } from './types';

export const RECENT_ATTEMPT_LIMIT = 3;

export interface ActivityCalendarOptions {
  today: Date;
  timeZone: string;
  weeks: number;
}

export interface ActivityCalendarDiagnostic {
  attemptId: string;
  submittedAt: string;
  reason: 'invalid-submitted-at';
}

export interface ActivityCalendarDay {
  date: string;
  weekday: 1 | 2 | 3 | 4 | 5 | 6 | 7;
  count: number;
  level: 0 | 1 | 2 | 3 | 4;
  future: boolean;
  attemptIds: string[];
}

export interface ActivityCalendarWeek {
  startsOn: string;
  days: ActivityCalendarDay[];
}

export interface ActivityCalendar {
  timeZone: string;
  today: string;
  startDate: string;
  endDate: string;
  weeks: ActivityCalendarWeek[];
  diagnostics: ActivityCalendarDiagnostic[];
}

export interface KnowledgeForestNode {
  point: KnowledgePoint;
  childIds: string[];
  directQuestionIds: string[];
  questionIds: string[];
}

export interface KnowledgeForest {
  rootIds: string[];
  nodes: KnowledgeForestNode[];
}

export interface KnowledgePointPerformance {
  knowledgePointId: string;
  subject: Subject;
  questionIds: string[];
  assessedQuestionIds: string[];
  evidenceAttemptIds: string[];
  totalQuestionCount: number;
  assessedQuestionCount: number;
  coverage: number;
  performance: number | null;
  weakness: number | null;
  lastAttemptAt?: string;
}

export interface KnowledgePerformance {
  points: KnowledgePointPerformance[];
  weakPoints: KnowledgePointPerformance[];
  unassessedPoints: KnowledgePointPerformance[];
}

interface QuestionPerformance {
  questionId: string;
  performance: number;
  evidenceAttemptIds: string[];
  lastAttemptAt: string;
}

const MS_PER_DAY = 86_400_000;
const subjectOrder = new Map<Subject, number>(SUBJECTS.map((subject, index) => [subject, index]));

function compareIds(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function questionsById(questions: readonly Question[]): Map<string, Question> {
  const result = new Map<string, Question>();
  for (const question of questions) {
    if (result.has(question.id)) throw new Error(`Duplicate question id ${question.id}.`);
    result.set(question.id, question);
  }
  return result;
}

export function filterCurrentAttempts(
  attempts: readonly Attempt[],
  questions: readonly Question[],
): Attempt[] {
  const currentQuestions = questionsById(questions);
  return attempts.filter((attempt) => (
    currentQuestions.get(attempt.questionId)?.contentVersion === attempt.questionContentVersion
  ));
}

function dateKey(date: Date, formatter: Intl.DateTimeFormat): string {
  const parts = formatter.formatToParts(date);
  const year = parts.find((part) => part.type === 'year')?.value;
  const month = parts.find((part) => part.type === 'month')?.value;
  const day = parts.find((part) => part.type === 'day')?.value;
  if (!year || !month || !day) throw new Error('Unable to format a calendar date.');
  return `${year}-${month}-${day}`;
}

function dateOnlyToEpoch(key: string): number {
  const [year, month, day] = key.split('-').map(Number);
  return Date.UTC(year!, month! - 1, day!);
}

function epochToDateOnly(epoch: number): string {
  return new Date(epoch).toISOString().slice(0, 10);
}

function activityLevel(count: number): ActivityCalendarDay['level'] {
  if (count === 0) return 0;
  if (count <= 4) return 1;
  if (count <= 14) return 2;
  if (count <= 29) return 3;
  return 4;
}

/**
 * Builds complete Monday-to-Sunday calendar weeks. Activity levels use fixed
 * attempt-count bands: 0, 1-4, 5-14, 15-29, and 30+.
 */
export function buildActivityCalendar(
  attempts: readonly Attempt[],
  options: ActivityCalendarOptions,
): ActivityCalendar {
  if (!Number.isInteger(options.weeks) || options.weeks <= 0) {
    throw new Error('Calendar weeks must be a positive integer.');
  }
  if (Number.isNaN(options.today.getTime())) throw new Error('Calendar today must be a valid date.');

  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: options.timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const today = dateKey(options.today, formatter);
  const todayEpoch = dateOnlyToEpoch(today);
  const sundayBasedWeekday = new Date(todayEpoch).getUTCDay();
  const daysSinceMonday = (sundayBasedWeekday + 6) % 7;
  const startEpoch = todayEpoch - (daysSinceMonday + (options.weeks - 1) * 7) * MS_PER_DAY;
  const endEpoch = startEpoch + (options.weeks * 7 - 1) * MS_PER_DAY;
  const counts = new Map<string, string[]>();
  const diagnostics: ActivityCalendarDiagnostic[] = [];

  for (const attempt of attempts) {
    const submittedAt = new Date(attempt.submittedAt);
    if (Number.isNaN(submittedAt.getTime())) {
      diagnostics.push({
        attemptId: attempt.id,
        submittedAt: attempt.submittedAt,
        reason: 'invalid-submitted-at',
      });
      continue;
    }
    const key = dateKey(submittedAt, formatter);
    const epoch = dateOnlyToEpoch(key);
    if (epoch < startEpoch || epoch > todayEpoch) continue;
    const ids = counts.get(key) ?? [];
    ids.push(attempt.id);
    counts.set(key, ids);
  }

  const weeks = Array.from({ length: options.weeks }, (_, weekIndex): ActivityCalendarWeek => {
    const weekStart = startEpoch + weekIndex * 7 * MS_PER_DAY;
    return {
      startsOn: epochToDateOnly(weekStart),
      days: Array.from({ length: 7 }, (_, dayIndex): ActivityCalendarDay => {
        const epoch = weekStart + dayIndex * MS_PER_DAY;
        const key = epochToDateOnly(epoch);
        const future = epoch > todayEpoch;
        const attemptIds = future ? [] : [...(counts.get(key) ?? [])].sort(compareIds);
        return {
          date: key,
          weekday: (dayIndex + 1) as ActivityCalendarDay['weekday'],
          count: attemptIds.length,
          level: activityLevel(attemptIds.length),
          future,
          attemptIds,
        };
      }),
    };
  });

  return {
    timeZone: options.timeZone,
    today,
    startDate: epochToDateOnly(startEpoch),
    endDate: epochToDateOnly(endEpoch),
    weeks,
    diagnostics,
  };
}

function comparePoints(left: KnowledgePoint, right: KnowledgePoint): number {
  const subjectDelta = (subjectOrder.get(left.subject) ?? Number.MAX_SAFE_INTEGER)
    - (subjectOrder.get(right.subject) ?? Number.MAX_SAFE_INTEGER);
  return subjectDelta || compareIds(left.id, right.id);
}

export function buildKnowledgeForest(
  points: readonly KnowledgePoint[],
  questions: readonly Question[],
): KnowledgeForest {
  const pointById = new Map<string, KnowledgePoint>();
  for (const point of points) {
    if (pointById.has(point.id)) throw new Error(`Duplicate knowledge point id ${point.id}.`);
    pointById.set(point.id, point);
  }

  const currentQuestions = questionsById(questions);
  const children = new Map<string, string[]>();
  const directQuestions = new Map<string, Set<string>>();

  for (const point of points) {
    if (!point.parentId) continue;
    const parent = pointById.get(point.parentId);
    if (!parent) throw new Error(`Knowledge point ${point.id} has missing parent ${point.parentId}.`);
    if (parent.subject !== point.subject) {
      throw new Error(`Knowledge point ${point.id} and parent ${parent.id} belong to different subjects.`);
    }
    const childIds = children.get(parent.id) ?? [];
    childIds.push(point.id);
    children.set(parent.id, childIds);
  }

  const visitState = new Map<string, 'visiting' | 'visited'>();
  const visit = (pointId: string): void => {
    const state = visitState.get(pointId);
    if (state === 'visiting') throw new Error(`Knowledge point hierarchy contains a cycle at ${pointId}.`);
    if (state === 'visited') return;
    visitState.set(pointId, 'visiting');
    const parentId = pointById.get(pointId)?.parentId;
    if (parentId) visit(parentId);
    visitState.set(pointId, 'visited');
  };
  for (const point of points) visit(point.id);

  for (const question of currentQuestions.values()) {
    for (const pointId of new Set(question.knowledgePointIds)) {
      const point = pointById.get(pointId);
      if (!point) throw new Error(`Question ${question.id} references unknown knowledge point ${pointId}.`);
      if (point.subject !== question.subject) {
        throw new Error(`Question ${question.id} and knowledge point ${point.id} belong to different subjects.`);
      }
      const ids = directQuestions.get(pointId) ?? new Set<string>();
      ids.add(question.id);
      directQuestions.set(pointId, ids);
    }
  }

  for (const childIds of children.values()) childIds.sort(compareIds);
  const aggregatedQuestions = new Map<string, Set<string>>();
  const collectQuestions = (pointId: string): Set<string> => {
    const existing = aggregatedQuestions.get(pointId);
    if (existing) return existing;
    const result = new Set(directQuestions.get(pointId) ?? []);
    for (const childId of children.get(pointId) ?? []) {
      for (const questionId of collectQuestions(childId)) result.add(questionId);
    }
    aggregatedQuestions.set(pointId, result);
    return result;
  };

  const sortedPoints = [...points].sort(comparePoints);
  const nodes = sortedPoints.map((point): KnowledgeForestNode => ({
    point,
    childIds: [...(children.get(point.id) ?? [])],
    directQuestionIds: [...(directQuestions.get(point.id) ?? [])].sort(compareIds),
    questionIds: [...collectQuestions(point.id)].sort(compareIds),
  }));
  return {
    rootIds: sortedPoints.filter((point) => !point.parentId).map((point) => point.id),
    nodes,
  };
}

function scoreAttempt(question: Question, attempt: Attempt): number | null {
  if (question.kind === 'single-choice' && question.answer.type === 'choice') {
    return attempt.correct === null ? null : attempt.correct ? 1 : 0;
  }
  if (question.kind === 'comprehensive' && question.answer.type === 'comprehensive') {
    if (attempt.score === null) return null;
    if (!Number.isFinite(attempt.score)) {
      throw new Error(`Attempt ${attempt.id} score must be finite for ${question.id}.`);
    }
    if (attempt.score < 0) {
      throw new Error(`Attempt ${attempt.id} score is negative for ${question.id}.`);
    }
    if (attempt.score > question.answer.maxScore) {
      throw new Error(`Attempt ${attempt.id} score exceeds the maximum for ${question.id}.`);
    }
    return attempt.score / question.answer.maxScore;
  }
  return null;
}

function compareAttempts(left: Attempt, right: Attempt): number {
  const timeDelta = new Date(left.submittedAt).getTime() - new Date(right.submittedAt).getTime();
  return timeDelta || compareIds(left.id, right.id);
}

function questionPerformances(
  attempts: readonly Attempt[],
  questions: readonly Question[],
): Map<string, QuestionPerformance> {
  const currentQuestions = questionsById(questions);
  const attemptsByQuestion = new Map<string, Attempt[]>();
  for (const attempt of filterCurrentAttempts(attempts, questions)) {
    const submittedAt = new Date(attempt.submittedAt);
    if (Number.isNaN(submittedAt.getTime())) {
      throw new Error(`Attempt ${attempt.id} has an invalid submittedAt timestamp.`);
    }
    const question = currentQuestions.get(attempt.questionId)!;
    if (scoreAttempt(question, attempt) === null) continue;
    const entries = attemptsByQuestion.get(attempt.questionId) ?? [];
    entries.push(attempt);
    attemptsByQuestion.set(attempt.questionId, entries);
  }

  const result = new Map<string, QuestionPerformance>();
  for (const [questionId, questionAttempts] of attemptsByQuestion) {
    const question = currentQuestions.get(questionId)!;
    const selected = questionAttempts.sort(compareAttempts).slice(-RECENT_ATTEMPT_LIMIT);
    let weightedScore = 0;
    let totalWeight = 0;
    selected.forEach((attempt, index) => {
      const weight = index + 1;
      weightedScore += scoreAttempt(question, attempt)! * weight;
      totalWeight += weight;
    });
    result.set(questionId, {
      questionId,
      performance: weightedScore / totalWeight,
      evidenceAttemptIds: selected.map((attempt) => attempt.id),
      lastAttemptAt: selected.at(-1)!.submittedAt,
    });
  }
  return result;
}

/**
 * Each question is represented by at most its latest three assessable attempts.
 * Within that window, chronological attempts receive weights 1, 2, and 3 (or
 * 1..n when fewer exist). Knowledge points then average their questions equally.
 */
export function aggregateKnowledgePerformance(
  attempts: readonly Attempt[],
  questions: readonly Question[],
  forest: KnowledgeForest,
): KnowledgePerformance {
  const perQuestion = questionPerformances(attempts, questions);
  const points = forest.nodes.map((node): KnowledgePointPerformance => {
    const assessed = node.questionIds
      .map((questionId) => perQuestion.get(questionId))
      .filter((entry): entry is QuestionPerformance => entry !== undefined);
    const performance = assessed.length === 0
      ? null
      : assessed.reduce((sum, entry) => sum + entry.performance, 0) / assessed.length;
    const lastAttemptAt = assessed.reduce<string | undefined>((latest, entry) => (
      latest === undefined || entry.lastAttemptAt > latest ? entry.lastAttemptAt : latest
    ), undefined);
    return {
      knowledgePointId: node.point.id,
      subject: node.point.subject,
      questionIds: [...node.questionIds],
      assessedQuestionIds: assessed.map((entry) => entry.questionId),
      evidenceAttemptIds: assessed.flatMap((entry) => entry.evidenceAttemptIds),
      totalQuestionCount: node.questionIds.length,
      assessedQuestionCount: assessed.length,
      coverage: node.questionIds.length === 0 ? 0 : assessed.length / node.questionIds.length,
      performance,
      weakness: performance === null ? null : 1 - performance,
      ...(lastAttemptAt ? { lastAttemptAt } : {}),
    };
  });

  const weakPoints = points
    .filter((point) => point.weakness !== null)
    .sort((left, right) => (
      right.weakness! - left.weakness!
      || right.assessedQuestionCount - left.assessedQuestionCount
      || compareIds(left.knowledgePointId, right.knowledgePointId)
    ));
  const unassessedPoints = points
    .filter((point) => point.weakness === null)
    .sort((left, right) => compareIds(left.knowledgePointId, right.knowledgePointId));

  return { points, weakPoints, unassessedPoints };
}
