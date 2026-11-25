import type { Attempt, ContentBlock, KnowledgePoint, Note, Question, Subject, UserResponse } from './types';
import { buildDailyReviewPlan } from './review-plan';
import { questionAvailability } from './availability';

export const REVIEW_ALGORITHM_VERSION = 'daily-minimum-v1';
export const REVIEW_TIME_ZONE = 'Asia/Shanghai';
export const DEFAULT_REVIEW_LIMITS = { questions: 8, cards: 10, newCards: 3 } as const;
export const MISTAKE_REASONS = ['concept', 'method', 'calculation', 'reading', 'other'] as const;
export type MistakeReason = (typeof MISTAKE_REASONS)[number];
export const MISTAKE_LABELS: Record<MistakeReason, string> = {
  concept: '概念不清', method: '方法不熟', calculation: '计算失误', reading: '审题遗漏', other: '其他',
};

export interface LearningSource {
  questionId: string;
  questionContentVersion: string;
  documentSha256: string;
  pages: number[];
  locator: string;
}
export interface LearningConcept extends KnowledgePoint {
  level: 'subject' | 'chapter' | 'concept';
}
export interface QuestionConceptMapping {
  questionId: string;
  questionContentVersion: string;
  subject: Subject;
  primaryConceptId: string;
  conceptIds: string[];
  legacyNodeIds: string[];
  source: LearningSource;
  reviewStatus: 'needs-review';
}
export interface FlashcardDefinition {
  id: string;
  version: string;
  subject: Subject;
  conceptIds: string[];
  front: ContentBlock[];
  back: ContentBlock[];
  sources: LearningSource[];
  reviewStatus: 'needs-review';
}
export interface ConceptArticle {
  id: string;
  version: string;
  conceptId: string;
  subject: Subject;
  explanation: ContentBlock[];
  workedExample: ContentBlock[];
  commonMistake: ContentBlock[];
  questionIds: string[];
  cardIds: string[];
  labPath?: string;
  sources: LearningSource[];
  authorship: 'ai-assisted';
  reviewStatus: 'needs-review';
}
export type QuestionSupplement = {
  id: string;
  version: string;
  questionId: string;
  questionContentVersion: string;
  body: ContentBlock[];
  sources: Array<LearningSource & { role: 'question' | 'answer' }>;
  authorship: 'ai-assisted';
  reviewStatus: 'needs-review';
} & ({ kind: 'supplement' } | { kind: 'erratum'; sectionId: string; originalExcerpt: string });

interface LearningPackBase {
  id: string;
  version: string;
  sha256: string;
  createdAt: string;
  concepts: LearningConcept[];
  mappings: QuestionConceptMapping[];
  cards: FlashcardDefinition[];
  articles?: ConceptArticle[];
}
export type LearningPack = LearningPackBase & (
  { schemaVersion: 1 } | { schemaVersion: 2; questionSupplements: QuestionSupplement[] }
);
export interface PersonalCard extends FlashcardDefinition {
  baseCardId?: string;
  suspended: boolean;
  revision: number;
  updatedAt: string;
}
export type CardRating = 0 | 0.5 | 1;
export interface CardReviewEvent {
  id: string;
  sessionId: string;
  cardId: string;
  cardVersion: string;
  rating: CardRating;
  ordinal: number;
  queueIndex: number;
  reviewedAt: string;
  activeDurationMs: number;
}
export interface ReviewSession {
  id: string;
  cards: FlashcardDefinition[];
  queue: string[];
  cursor: number;
  completedCardIds: string[];
  revision: number;
  startedAt: string;
  updatedAt: string;
  completedAt?: string;
  dailyPlanId?: string;
}
export interface ReviewLimits { questions: number; cards: number; newCards: number }
export interface DailyPlanItem {
  kind: 'question' | 'card';
  targetId: string;
  contentVersion: string;
  reason: 'overdue' | 'due' | 'unseen';
}
export interface DailyPlan {
  id: string;
  date: string;
  timeZone: typeof REVIEW_TIME_ZONE;
  algorithmVersion: typeof REVIEW_ALGORITHM_VERSION;
  limits: ReviewLimits;
  items: DailyPlanItem[];
  createdAt: string;
}
export interface PracticeEvidence {
  id: string;
  sessionId: string;
  questionId: string;
  questionContentVersion: string;
  hintsUsed: number;
  evidenceFromStart?: boolean;
  firstResponse?: UserResponse;
  answerRevealedAt?: string;
  activeDurationMs: number;
  attemptId?: string;
  mistakeReason?: MistakeReason;
  mistakeNote: string;
  revision: number;
  updatedAt: string;
}
export interface PracticeContext {
  sessionId: string;
  parentSessionId?: string;
  dailyPlanId?: string;
}
export interface NoteConflict {
  id: string;
  questionId: string;
  originals: Note[];
  createdAt: string;
  resolvedAt?: string;
}
export interface CardSchedule {
  cardId: string;
  cardVersion: string;
  repetitions: number;
  intervalDays: number;
  ease: number;
  dueOn: string;
  lastQuality: CardRating;
}

const reviewDateFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: REVIEW_TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit',
});
export function beijingDate(value: string | Date): string {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) throw new Error('无效日期');
  const parts = reviewDateFormatter.formatToParts(date);
  return ['year', 'month', 'day'].map((type) => parts.find((part) => part.type === type)!.value).join('-');
}
export function nextCalendarDate(date: string, days = 1): string {
  return new Date(Date.parse(`${date}T00:00:00Z`) + days * 86_400_000).toISOString().slice(0, 10);
}
export function practiceEvidenceId(sessionId: string, questionId: string): string {
  return JSON.stringify([sessionId, questionId]);
}
export function isUnassistedFirstAnswer(attempt: Attempt, proof?: PracticeEvidence): boolean {
  return attempt.response.type === 'choice' && attempt.correct !== null && proof?.evidenceFromStart === true
    && proof.firstResponse?.type === 'choice' && proof.hintsUsed === 0 && !proof.answerRevealedAt;
}
export function summarizePracticeEvidence(attempts: readonly Attempt[], evidence: readonly PracticeEvidence[]) {
  const proofs = new Map(evidence.flatMap((entry) => entry.attemptId ? [[entry.attemptId, entry] as const] : []));
  const eligible = attempts.filter((attempt) => isUnassistedFirstAnswer(attempt, proofs.get(attempt.id)));
  const hinted = attempts.filter((attempt) => (proofs.get(attempt.id)?.hintsUsed ?? 0) > 0);
  return {
    eligible: eligible.length, correct: eligible.filter((attempt) => attempt.correct === true).length,
    hinted: hinted.length, hintedCorrect: hinted.filter((attempt) => attempt.correct === true).length,
    subjective: attempts.filter((attempt) => attempt.response.type === 'comprehensive').length,
    unknown: attempts.filter((attempt) => !proofs.get(attempt.id)?.evidenceFromStart).length,
    activeDurationMs: attempts.reduce((sum, attempt) => sum + (proofs.get(attempt.id)?.activeDurationMs ?? 0), 0),
  };
}
export function effectiveCards(cards: readonly FlashcardDefinition[], personal: readonly PersonalCard[]): FlashcardDefinition[] {
  const overrides = new Set(personal.flatMap((card) => card.baseCardId ? [card.baseCardId] : []));
  return [...cards.filter((card) => !overrides.has(card.id)), ...personal.filter((card) => !card.suspended)];
}
export function replayCardSchedule(events: readonly CardReviewEvent[], beforeDate?: string): CardSchedule[] {
  const days = new Map<string, { cardId: string; version: string; date: string; quality: CardRating }>();
  const seen = new Set<string>();
  for (const event of events) {
    if (seen.has(event.id)) continue;
    seen.add(event.id);
    const date = beijingDate(event.reviewedAt);
    if (beforeDate && date >= beforeDate) continue;
    const key = JSON.stringify([event.cardId, event.cardVersion, date]);
    const previous = days.get(key);
    days.set(key, { cardId: event.cardId, version: event.cardVersion, date, quality: Math.min(previous?.quality ?? 1, event.rating) as CardRating });
  }
  const schedules = new Map<string, CardSchedule>();
  for (const day of [...days.values()].sort((a, b) => a.date.localeCompare(b.date))) {
    const key = JSON.stringify([day.cardId, day.version]);
    const previous = schedules.get(key);
    const ease = previous?.ease ?? 2.5;
    const repetitions = previous?.repetitions ?? 0;
    const intervalDays = day.quality < 0.6 ? 1 : repetitions === 0 ? 1 : repetitions === 1 ? 3
      : Math.max(1, Math.round((previous?.intervalDays ?? 1) * ease));
    schedules.set(key, {
      cardId: day.cardId, cardVersion: day.version, lastQuality: day.quality,
      repetitions: day.quality < 0.6 ? 0 : repetitions + 1,
      intervalDays, ease: Number(Math.max(1.3, ease + (day.quality < 0.6 ? -0.2 : 0.1)).toFixed(4)),
      dueOn: nextCalendarDate(day.date, intervalDays),
    });
  }
  return [...schedules.values()].sort((a, b) => a.cardId.localeCompare(b.cardId) || a.cardVersion.localeCompare(b.cardVersion));
}
export function buildPersistentDailyPlan(
  questions: readonly Question[], attempts: readonly Attempt[], cards: readonly FlashcardDefinition[],
  events: readonly CardReviewEvent[], now: string, limits: ReviewLimits = DEFAULT_REVIEW_LIMITS,
  evidence: readonly PracticeEvidence[] = [],
): DailyPlan {
  for (const [key, value] of Object.entries(limits)) {
    if (!Number.isInteger(value) || value < 0 || value > 100) throw new Error(`无效的每日额度：${key}`);
  }
  if (limits.questions < 1 || limits.cards < 1 || limits.newCards > limits.cards) throw new Error('每日额度不一致');
  const date = beijingDate(now);
  const questionPlan = buildDailyReviewPlan(attempts, questions.filter((question) => questionAvailability(question).practice), { today: new Date(now), timeZone: REVIEW_TIME_ZONE, dailyLimit: limits.questions, evidence });
  const versions = new Map(questions.map((q) => [q.id, q.contentVersion]));
  const byCard = new Map(cards.map((card) => [card.id, card]));
  const schedules = replayCardSchedule(events, date).filter((state) => byCard.get(state.cardId)?.version === state.cardVersion);
  const seen = new Set(schedules.map((state) => state.cardId));
  const due = schedules.filter((state) => state.dueOn <= date)
    .sort((a, b) => a.dueOn.localeCompare(b.dueOn) || a.lastQuality - b.lastQuality || a.cardId.localeCompare(b.cardId))
    .slice(0, limits.cards);
  const unseen = [...cards].filter((card) => !seen.has(card.id)).sort((a, b) => a.id.localeCompare(b.id))
    .slice(0, Math.min(limits.newCards, Math.max(0, limits.cards - due.length)));
  return {
    id: date, date, timeZone: REVIEW_TIME_ZONE, algorithmVersion: REVIEW_ALGORITHM_VERSION, limits: { ...limits }, createdAt: now,
    items: [
      ...questionPlan.items.map((item): DailyPlanItem => ({ kind: 'question', targetId: item.questionId, contentVersion: versions.get(item.questionId)!, reason: item.reason })),
      ...due.map((state): DailyPlanItem => ({ kind: 'card', targetId: state.cardId, contentVersion: state.cardVersion, reason: state.dueOn < date ? 'overdue' : 'due' })),
      ...unseen.map((card): DailyPlanItem => ({ kind: 'card', targetId: card.id, contentVersion: card.version, reason: 'unseen' })),
    ],
  };
}
export function advanceReviewSession(session: ReviewSession, rating: CardRating, now: string): { session: ReviewSession; ordinal: number } {
  if (![0, 0.5, 1].includes(rating) || session.completedAt) throw new Error('此轮不能再评分');
  const cardId = session.queue[session.cursor];
  if (!cardId) throw new Error('此轮没有待复习卡片');
  const ordinal = session.queue.slice(0, session.cursor + 1).filter((id) => id === cardId).length;
  const queue = [...session.queue];
  const completed = new Set(session.completedCardIds);
  if (rating < 1 && ordinal < 3) queue.push(cardId);
  else completed.add(cardId);
  const cursor = session.cursor + 1;
  return { ordinal, session: {
    ...session, queue, cursor, completedCardIds: [...completed],
    revision: session.revision + 1, updatedAt: now,
    ...(cursor === queue.length ? { completedAt: now } : {}),
  } };
}
