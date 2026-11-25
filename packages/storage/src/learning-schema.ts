import { z } from 'zod';
import { canonicalSerialize, flashcardDefinitionSchema } from '@408os/content-schema';
import { advanceReviewSession, MISTAKE_REASONS, REVIEW_ALGORITHM_VERSION, REVIEW_TIME_ZONE, type CardReviewEvent, type ReviewSession } from '@408os/domain';

/** Shared by backup preflight and sync. A structurally valid round is not sufficient evidence. */
export function validateReviewEvidence(round: ReviewSession, input: readonly CardReviewEvent[]) {
  const events = [...input].sort((a, b) => a.queueIndex - b.queueIndex);
  let replay: ReviewSession = { id: round.id, cards: round.cards, queue: round.cards.map((card) => card.id), cursor: 0,
    completedCardIds: [], revision: 0, startedAt: round.startedAt, updatedAt: round.startedAt };
  for (const event of events) {
    const card = replay.cards.find((candidate) => candidate.id === replay.queue[replay.cursor]);
    if (event.sessionId !== round.id || event.id !== JSON.stringify([event.sessionId, event.queueIndex])
      || event.queueIndex !== replay.cursor || card?.id !== event.cardId || card.version !== event.cardVersion
      || event.reviewedAt < replay.updatedAt) throw new Error('Review event order, version or time mismatch.');
    const result = advanceReviewSession(replay, event.rating, event.reviewedAt);
    if (result.ordinal !== event.ordinal) throw new Error('Review event ordinal mismatch.');
    replay = result.session;
  }
  for (const field of ['queue', 'cursor', 'completedCardIds', 'revision', 'updatedAt'] as const) {
    if (canonicalSerialize(round[field]) !== canonicalSerialize(replay[field])) throw new Error(`Review session ${field} does not match events.`);
  }
  if (round.completedAt !== replay.completedAt) throw new Error('Review completion time mismatch.');
}

const id = z.string().min(1).max(500);
const timestamp = z.iso.datetime();
const date = z.iso.date();
export const reviewLimitsSchema = z.object({
  questions: z.int().min(1).max(100), cards: z.int().min(1).max(100), newCards: z.int().min(0).max(100),
}).strict().refine((value) => value.newCards <= value.cards, '新卡数超过每日卡片数');
export const reviewLimitsSettingSchema = z.object({
  effectiveOn: date, next: reviewLimitsSchema, previous: reviewLimitsSchema,
}).strict();
export const dailyPlanSchema = z.object({
  id: date, date, timeZone: z.literal(REVIEW_TIME_ZONE), algorithmVersion: z.literal(REVIEW_ALGORITHM_VERSION),
  limits: reviewLimitsSchema,
  items: z.array(z.object({
    kind: z.enum(['question', 'card']), targetId: id, contentVersion: id, reason: z.enum(['overdue', 'due', 'unseen']),
  }).strict()).max(200), createdAt: timestamp,
}).strict().superRefine((plan, ctx) => {
  if (plan.id !== plan.date) ctx.addIssue({ code: 'custom', message: '计划日期不一致' });
  const keys = plan.items.map((item) => JSON.stringify([item.kind, item.targetId]));
  if (new Set(keys).size !== keys.length) ctx.addIssue({ code: 'custom', message: '重复每日任务' });
  if (plan.items.filter((item) => item.kind === 'question').length > plan.limits.questions
    || plan.items.filter((item) => item.kind === 'card').length > plan.limits.cards
    || plan.items.filter((item) => item.kind === 'card' && item.reason === 'unseen').length > plan.limits.newCards) {
    ctx.addIssue({ code: 'custom', message: '每日任务超过额度' });
  }
});
export const personalCardSchema = flashcardDefinitionSchema.extend({
  baseCardId: id.optional(), suspended: z.boolean(), revision: z.int().min(1), updatedAt: timestamp,
}).strict();
export const cardReviewEventSchema = z.object({
  id, sessionId: id, cardId: id, cardVersion: id, rating: z.union([z.literal(0), z.literal(0.5), z.literal(1)]),
  ordinal: z.int().min(1).max(3), queueIndex: z.int().min(0).max(29), reviewedAt: timestamp,
  activeDurationMs: z.number().finite().nonnegative(),
}).strict();
export const reviewSessionSchema = z.object({
  id, cards: z.array(flashcardDefinitionSchema).min(1).max(10), queue: z.array(id).min(1).max(30),
  cursor: z.int().min(0).max(30), completedCardIds: z.array(id).max(10),
  revision: z.int().nonnegative(), startedAt: timestamp, updatedAt: timestamp, completedAt: timestamp.optional(),
  dailyPlanId: date.optional(),
}).strict().superRefine((session, ctx) => {
  const cardIds = session.cards.map((card) => card.id);
  const ids = new Set(cardIds);
  if (ids.size !== cardIds.length || session.queue.some((cardId) => !ids.has(cardId))
    || session.cursor > session.queue.length || session.completedCardIds.some((cardId) => !ids.has(cardId))
    || new Set(session.completedCardIds).size !== session.completedCardIds.length
    || cardIds.some((cardId) => session.queue.filter((entry) => entry === cardId).length > 3)
    || session.revision !== session.cursor
    || Boolean(session.completedAt) !== (session.cursor === session.queue.length)) {
    ctx.addIssue({ code: 'custom', message: '复习轮次结构不一致' });
  }
});
const responseSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('choice'), optionId: z.enum(['A', 'B', 'C', 'D']) }).strict(),
  z.object({ type: z.literal('comprehensive'), text: z.string(), checkedRubricIds: z.array(id), selfScore: z.number().finite().nonnegative().optional() }).strict(),
]);
export const practiceEvidenceSchema = z.object({
  id, sessionId: id, questionId: id, questionContentVersion: id, hintsUsed: z.int().min(0).max(2),
  evidenceFromStart: z.boolean().optional(),
  firstResponse: responseSchema.optional(), answerRevealedAt: timestamp.optional(),
  activeDurationMs: z.number().finite().nonnegative(), attemptId: id.optional(),
  mistakeReason: z.enum(MISTAKE_REASONS).optional(), mistakeNote: z.string().max(20000),
  revision: z.int().min(1), updatedAt: timestamp,
}).strict();
export const practiceContextSchema = z.object({
  sessionId: id, parentSessionId: id.optional(), dailyPlanId: date.optional(),
}).strict();
export const noteConflictSchema = z.object({
  id, questionId: id, originals: z.array(z.object({
    id, questionId: id, body: z.string(), createdAt: timestamp, updatedAt: timestamp,
  }).strict()).min(1), createdAt: timestamp, resolvedAt: timestamp.optional(),
}).strict().refine((entry) => entry.originals.every((note) => note.questionId === entry.questionId), '冲突笔记题号不一致');
export const learningUserDataSchema = z.object({
  dailyPlans: z.array(dailyPlanSchema), reviewSessions: z.array(reviewSessionSchema),
  cardReviewEvents: z.array(cardReviewEventSchema), personalCards: z.array(personalCardSchema),
  practiceEvidence: z.array(practiceEvidenceSchema), practiceContexts: z.array(practiceContextSchema),
  noteConflicts: z.array(noteConflictSchema),
}).strict();
export const emptyLearningUserData = () => ({
  dailyPlans: [], reviewSessions: [], cardReviewEvents: [], personalCards: [],
  practiceEvidence: [], practiceContexts: [], noteConflicts: [],
});
