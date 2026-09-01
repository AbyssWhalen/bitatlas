import type { Attempt, Question } from './types';

export interface ReviewScheduleOptions {
  timeZone: string;
  beforeDate: string;
}

export interface QuestionReviewSchedule {
  questionId: string;
  repetitions: number;
  intervalDays: number;
  easeFactor: number;
  dueOn: string;
  lastReviewedOn: string;
  lastQuality: number;
  evidenceAttemptIds: string[];
}

export interface DailyReviewPlanOptions {
  today: Date;
  timeZone: string;
  dailyLimit: number;
}

export type DailyReviewReason = 'overdue' | 'due' | 'unseen';

export interface DailyReviewPlanItem {
  questionId: string;
  reason: DailyReviewReason;
  dueOn?: string;
  intervalDays?: number;
  lastQuality?: number;
  evidenceAttemptIds: string[];
  completedToday: boolean;
}

export interface DailyReviewPlan {
  date: string;
  timeZone: string;
  dailyLimit: number;
  items: DailyReviewPlanItem[];
  completedCount: number;
  overdueCount: number;
  dueCount: number;
  unseenCount: number;
}

interface ScheduleState {
  questionId: string;
  repetitions: number;
  intervalDays: number;
  easeFactor: number;
  dueOn: string;
  lastReviewedOn: string;
  lastQuality: number;
  evidenceAttemptIds: string[];
}

function questionMap(questions: readonly Question[]): Map<string, Question> {
  const result = new Map<string, Question>();
  for (const question of questions) {
    if (result.has(question.id)) throw new Error(`Duplicate question id ${question.id}.`);
    result.set(question.id, question);
  }
  return result;
}

function dateFormatter(timeZone: string): Intl.DateTimeFormat {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}

function localDateKey(date: Date, formatter: Intl.DateTimeFormat): string | null {
  if (!Number.isFinite(date.getTime())) return null;
  const parts = formatter.formatToParts(date);
  const year = parts.find((part) => part.type === 'year')?.value;
  const month = parts.find((part) => part.type === 'month')?.value;
  const day = parts.find((part) => part.type === 'day')?.value;
  return year && month && day ? `${year}-${month}-${day}` : null;
}

function addCalendarDays(date: string, days: number): string {
  const [year, month, day] = date.split('-').map(Number);
  const epoch = Date.UTC(year!, month! - 1, day! + days);
  return new Date(epoch).toISOString().slice(0, 10);
}

function attemptQuality(attempt: Attempt, question: Question): number | null {
  if (question.kind === 'single-choice') {
    return attempt.correct === null ? null : attempt.correct ? 1 : 0;
  }
  if (attempt.score === null || question.answer.type !== 'comprehensive' || question.answer.maxScore <= 0) return null;
  if (!Number.isFinite(attempt.score) || attempt.score < 0) return null;
  return Math.max(0, Math.min(1, attempt.score / question.answer.maxScore));
}

function nextSchedule(previous: ScheduleState | undefined, questionId: string, reviewedOn: string, quality: number): ScheduleState {
  const evidenceAttemptIds = previous ? [...previous.evidenceAttemptIds] : [];
  let repetitions = previous?.repetitions ?? 0;
  let intervalDays = previous?.intervalDays ?? 0;
  let easeFactor = previous?.easeFactor ?? 2.5;

  if (quality < 0.6) {
    repetitions = 0;
    intervalDays = 1;
    easeFactor = Math.max(1.3, easeFactor - 0.2);
  } else {
    intervalDays = repetitions === 0 ? 1 : repetitions === 1 ? 3 : Math.max(1, Math.round(intervalDays * easeFactor));
    repetitions += 1;
    const miss = 1 - quality;
    easeFactor = Math.max(1.3, easeFactor + 0.1 - miss * (0.08 + miss * 0.02));
  }

  return {
    questionId,
    repetitions,
    intervalDays,
    easeFactor: Number(easeFactor.toFixed(4)),
    dueOn: addCalendarDays(reviewedOn, intervalDays),
    lastReviewedOn: reviewedOn,
    lastQuality: quality,
    evidenceAttemptIds,
  };
}

export function replayReviewSchedule(
  attempts: readonly Attempt[],
  questions: readonly Question[],
  options: ReviewScheduleOptions,
): QuestionReviewSchedule[] {
  const questionsById = questionMap(questions);
  const formatter = dateFormatter(options.timeZone);
  const datedAttempts = attempts.flatMap((attempt) => {
    const question = questionsById.get(attempt.questionId);
    if (!question || question.contentVersion !== attempt.questionContentVersion) return [];
    const timestamp = new Date(attempt.submittedAt);
    const reviewedOn = localDateKey(timestamp, formatter);
    if (!reviewedOn || reviewedOn >= options.beforeDate) return [];
    const quality = attemptQuality(attempt, question);
    return quality === null ? [] : [{ attempt, timestamp: timestamp.getTime(), reviewedOn, quality }];
  }).sort((left, right) => left.timestamp - right.timestamp || left.attempt.id.localeCompare(right.attempt.id));

  const states = new Map<string, ScheduleState>();
  for (const entry of datedAttempts) {
    const state = nextSchedule(states.get(entry.attempt.questionId), entry.attempt.questionId, entry.reviewedOn, entry.quality);
    state.evidenceAttemptIds.push(entry.attempt.id);
    states.set(entry.attempt.questionId, state);
  }

  return [...states.values()].sort((left, right) => left.questionId.localeCompare(right.questionId));
}

function compareQuestions(left: Question, right: Question): number {
  return left.year - right.year || left.number - right.number || left.id.localeCompare(right.id);
}

export function buildDailyReviewPlan(
  attempts: readonly Attempt[],
  questions: readonly Question[],
  options: DailyReviewPlanOptions,
): DailyReviewPlan {
  if (!Number.isInteger(options.dailyLimit) || options.dailyLimit < 1) {
    throw new Error('dailyLimit must be a positive integer.');
  }
  const questionsById = questionMap(questions);
  const formatter = dateFormatter(options.timeZone);
  const date = localDateKey(options.today, formatter);
  if (!date) throw new Error('today must be a valid date.');

  const schedules = replayReviewSchedule(attempts, questions, { timeZone: options.timeZone, beforeDate: date });
  const scheduleByQuestion = new Map(schedules.map((schedule) => [schedule.questionId, schedule]));
  const completedToday = new Set<string>();
  for (const attempt of attempts) {
    const question = questionsById.get(attempt.questionId);
    if (!question || question.contentVersion !== attempt.questionContentVersion) continue;
    const submittedOn = localDateKey(new Date(attempt.submittedAt), formatter);
    if (submittedOn === date && attemptQuality(attempt, question) !== null) completedToday.add(question.id);
  }

  const dueItems = schedules
    .filter((schedule) => schedule.dueOn <= date)
    .sort((left, right) => (
      Number(left.lastQuality >= 0.6) - Number(right.lastQuality >= 0.6)
      || left.dueOn.localeCompare(right.dueOn)
      || left.lastQuality - right.lastQuality
      || left.questionId.localeCompare(right.questionId)
    ))
    .map<DailyReviewPlanItem>((schedule) => ({
      questionId: schedule.questionId,
      reason: schedule.dueOn < date ? 'overdue' : 'due',
      dueOn: schedule.dueOn,
      intervalDays: schedule.intervalDays,
      lastQuality: schedule.lastQuality,
      evidenceAttemptIds: [...schedule.evidenceAttemptIds],
      completedToday: completedToday.has(schedule.questionId),
    }));

  const remaining = Math.max(0, options.dailyLimit - dueItems.length);
  const unseenItems = [...questions]
    .filter((question) => !scheduleByQuestion.has(question.id))
    .sort(compareQuestions)
    .slice(0, remaining)
    .map<DailyReviewPlanItem>((question) => ({
      questionId: question.id,
      reason: 'unseen',
      evidenceAttemptIds: [],
      completedToday: completedToday.has(question.id),
    }));
  const items = [...dueItems, ...unseenItems].slice(0, options.dailyLimit);

  return {
    date,
    timeZone: options.timeZone,
    dailyLimit: options.dailyLimit,
    items,
    completedCount: items.filter((item) => item.completedToday).length,
    overdueCount: items.filter((item) => item.reason === 'overdue').length,
    dueCount: items.filter((item) => item.reason === 'due').length,
    unseenCount: items.filter((item) => item.reason === 'unseen').length,
  };
}
