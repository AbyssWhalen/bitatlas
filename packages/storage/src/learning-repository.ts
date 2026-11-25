import {
  advanceReviewSession, beijingDate, buildPersistentDailyPlan, DEFAULT_REVIEW_LIMITS,
  effectiveCards, nextCalendarDate, practiceEvidenceId,
  type Attempt, type CardRating, type CardReviewEvent, type DailyPlan, type FlashcardDefinition,
  type LearningPack, type PersonalCard, type PracticeContext, type PracticeEvidence,
  type Question, type ReviewLimits, type ReviewSession,
} from '@408os/domain';
import { canonicalSerialize, parseLearningPack } from '@408os/content-schema';
import { liveQuery } from 'dexie';
import type { ContentDatabase, UserDatabase } from './databases';
import {
  dailyPlanSchema, personalCardSchema, practiceContextSchema, practiceEvidenceSchema, reviewLimitsSchema, reviewLimitsSettingSchema, reviewSessionSchema,
} from './learning-schema';

export class LearningConflictError extends Error {
  constructor() { super('内容已在另一页面更新。请重新读取；你的草稿尚未覆盖已保存内容。'); this.name = 'LearningConflictError'; }
}
export class DexieLearningContentRepository {
  constructor(private readonly database: ContentDatabase) {}
  async install(input: unknown): Promise<LearningPack> {
    const pack = parseLearningPack(input);
    await this.database.transaction('rw', this.database.learningPacks, async () => {
      const previous = await this.database.learningPacks.get(pack.id);
      if (previous && pack.version.localeCompare(previous.version, 'en', { numeric: true }) < 0) throw new Error('不能回退学习包版本');
      if (previous?.version === pack.version && previous.sha256 !== pack.sha256) throw new Error('同版本学习包内容发生变化');
      if (previous?.sha256 !== pack.sha256) await this.database.learningPacks.put(pack);
    });
    return pack;
  }
  async get(): Promise<LearningPack | undefined> {
    return this.database.learningPacks.get('bitatlas-learning');
  }
}

export class DexieReviewRepository {
  constructor(private readonly database: UserDatabase) {}
  getDailyPlan(date: string) { return this.database.dailyPlans.get(date); }
  async saveServerPlan(input: unknown) {
    const plan = dailyPlanSchema.parse(input);
    await this.database.transaction('rw', this.database.dailyPlans, async () => {
      const old = await this.database.dailyPlans.get(plan.id);
      if (old && canonicalSerialize(old) !== canonicalSerialize(plan)) throw new Error('今日安排与已保存清单不一致，已保留原清单。');
      if (!old) await this.database.dailyPlans.add(plan);
    });
    return plan;
  }
  listEvents() { return this.database.cardReviewEvents.orderBy('reviewedAt').toArray(); }
  listSessions() { return this.database.reviewSessions.orderBy('updatedAt').reverse().toArray(); }
  getSession(id: string) { return this.database.reviewSessions.get(id); }
  listPersonalCards() { return this.database.personalCards.toArray(); }
  listPracticeEvidence() { return this.database.practiceEvidence.toArray(); }
  listPracticeSessions() { return this.database.sessions.orderBy('updatedAt').reverse().toArray(); }
  listNoteConflicts() { return this.database.noteConflicts.toArray(); }
  getSetting(key: string) { return this.database.settings.get(key); }
  async saveSetting(key: string, value: unknown) { await this.database.settings.put({ key, value }); }
  async snapshot() {
    return this.database.transaction('r', [
      this.database.cardReviewEvents, this.database.reviewSessions, this.database.personalCards,
      this.database.practiceEvidence, this.database.sessions, this.database.noteConflicts, this.database.practiceContexts,
    ], async () => ({
      events: await this.listEvents(), rounds: await this.listSessions(), personal: await this.listPersonalCards(),
      evidence: await this.listPracticeEvidence(), practices: await this.listPracticeSessions(),
      conflicts: await this.listNoteConflicts(), contexts: await this.database.practiceContexts.toArray(),
    }));
  }
  subscribe(onValue: (value: Awaited<ReturnType<DexieReviewRepository['snapshot']>>) => void, onError: (reason: unknown) => void) {
    const subscription = liveQuery(() => this.snapshot()).subscribe({ next: onValue, error: onError });
    return () => subscription.unsubscribe();
  }
  getPracticeEvidence(sessionId: string, questionId: string) {
    return this.database.practiceEvidence.get(practiceEvidenceId(sessionId, questionId));
  }
  async checkpointPracticeTime(sessionId: string, questionId: string, activeDurationMs: number) {
    if (!Number.isFinite(activeDurationMs) || activeDurationMs < 0) throw new Error('无效的有效用时');
    return this.database.transaction('rw', this.database.practiceEvidence, this.database.sessions, async () => {
      const previous = await this.getPracticeEvidence(sessionId, questionId);
      const session = await this.database.sessions.get(sessionId);
      if (!previous || !session || session.completedAt || session.submittedQuestionIds.includes(questionId)
        || previous.activeDurationMs >= activeDurationMs) return previous;
      const updated = { ...previous, activeDurationMs, revision: previous.revision + 1, updatedAt: new Date().toISOString() };
      await this.database.practiceEvidence.put(updated);
      return updated;
    });
  }
  async savePracticeEvidence(value: PracticeEvidence, expectedRevision: number): Promise<PracticeEvidence> {
    const parsed = practiceEvidenceSchema.parse(value) as PracticeEvidence;
    if (parsed.id !== practiceEvidenceId(parsed.sessionId, parsed.questionId)) throw new Error('作答证据标识不一致');
    return this.database.transaction('rw', this.database.practiceEvidence, this.database.sessions, async () => {
      const session = await this.database.sessions.get(parsed.sessionId);
      if (!session || session.questionContentVersions[parsed.questionId] !== parsed.questionContentVersion) throw new Error('证据题面与会话不一致');
      const previous = await this.database.practiceEvidence.get(parsed.id);
      if ((previous?.revision ?? 0) !== expectedRevision || parsed.revision !== expectedRevision + 1) throw new LearningConflictError();
      if (!previous && parsed.evidenceFromStart) throw new Error('旧会话不能补造完整过程证据');
      if (previous && (parsed.hintsUsed < previous.hintsUsed || parsed.activeDurationMs < previous.activeDurationMs
        || Boolean(parsed.evidenceFromStart) !== Boolean(previous.evidenceFromStart)
        || parsed.attemptId !== previous.attemptId
        || (previous.answerRevealedAt && parsed.answerRevealedAt !== previous.answerRevealedAt)
        || (previous.firstResponse && canonicalSerialize(parsed.firstResponse) !== canonicalSerialize(previous.firstResponse)))) {
        throw new Error('首次作答和辅助证据不能回退');
      }
      await this.database.practiceEvidence.put(parsed);
      return parsed;
    });
  }
  async initializePracticeEvidence(sessionId: string, now: string) {
    await this.database.transaction('rw', this.database.practiceEvidence, this.database.sessions, async () => {
      const session = await this.database.sessions.get(sessionId);
      if (!session || session.submittedQuestionIds.length) throw new Error('无法初始化练习证据');
      await this.database.practiceEvidence.bulkAdd(session.questionIds.map((questionId) => ({
        id: practiceEvidenceId(sessionId, questionId), sessionId, questionId,
        questionContentVersion: session.questionContentVersions[questionId]!, hintsUsed: 0, evidenceFromStart: true,
        activeDurationMs: 0, mistakeNote: '', revision: 1, updatedAt: now,
      })));
    });
  }
  async savePracticeContext(value: PracticeContext): Promise<void> {
    const parsed = practiceContextSchema.parse(value) as PracticeContext;
    await this.database.transaction('rw', this.database.practiceContexts, this.database.sessions, this.database.dailyPlans, async () => {
      if (!await this.database.sessions.get(parsed.sessionId)) throw new Error('练习会话不存在');
      if (parsed.parentSessionId && (parsed.parentSessionId === parsed.sessionId || !await this.database.sessions.get(parsed.parentSessionId))) throw new Error('原练习会话不存在');
      if (parsed.dailyPlanId && !await this.database.dailyPlans.get(parsed.dailyPlanId)) throw new Error('每日计划不存在');
      const previous = await this.database.practiceContexts.get(parsed.sessionId);
      if (previous && canonicalSerialize(previous) !== canonicalSerialize(parsed)) throw new LearningConflictError();
      await this.database.practiceContexts.put(parsed);
    });
  }
  async savePersonalCard(card: PersonalCard, expectedRevision: number): Promise<void> {
    const parsed = personalCardSchema.parse(card) as PersonalCard;
    await this.database.transaction('rw', this.database.personalCards, async () => {
      const previous = await this.database.personalCards.get(card.id);
      if ((previous?.revision ?? 0) !== expectedRevision || card.revision !== expectedRevision + 1) throw new LearningConflictError();
      if (card.baseCardId) {
        const peers = await this.database.personalCards.where('baseCardId').equals(card.baseCardId).toArray();
        if (peers.some((peer) => peer.id !== card.id)) throw new LearningConflictError();
      }
      await this.database.personalCards.put(parsed);
    });
  }
  async reviewLimits(now: string): Promise<ReviewLimits> {
    const setting = await this.database.settings.get('review.limits');
    if (!setting) return { ...DEFAULT_REVIEW_LIMITS };
    const value = reviewLimitsSettingSchema.parse(setting.value);
    return reviewLimitsSchema.parse(value.effectiveOn <= beijingDate(now) ? value.next : value.previous);
  }
  async saveReviewLimits(limits: ReviewLimits, now: string): Promise<void> {
    const next = reviewLimitsSchema.parse(limits);
    await this.database.transaction('rw', this.database.settings, async () => {
      const previous = await this.reviewLimits(now);
      await this.database.settings.put({ key: 'review.limits', value: { previous, next, effectiveOn: nextCalendarDate(beijingDate(now)) } });
    });
  }
  async dailyPlan(questions: Question[], attempts: Attempt[], cards: FlashcardDefinition[], now: string): Promise<DailyPlan> {
    return this.database.transaction('rw', [this.database.dailyPlans, this.database.cardReviewEvents, this.database.personalCards, this.database.settings, this.database.practiceEvidence], async () => {
      const existing = await this.database.dailyPlans.get(beijingDate(now));
      if (existing) return existing;
      const versions = new Map(questions.map((question) => [question.id, question.contentVersion]));
      const available = effectiveCards(cards, await this.listPersonalCards()).filter((card) => card.sources.every((source) => versions.get(source.questionId) === source.questionContentVersion));
      const plan = buildPersistentDailyPlan(questions, attempts, available, await this.listEvents(), now, await this.reviewLimits(now), await this.listPracticeEvidence());
      dailyPlanSchema.parse(plan);
      await this.database.dailyPlans.add(plan);
      return plan;
    });
  }
  async createSession(cards: FlashcardDefinition[], now: string, dailyPlanId?: string): Promise<ReviewSession> {
    const session: ReviewSession = {
      id: crypto.randomUUID(), cards: cards.map((card) => structuredClone({
        id: card.id, version: card.version, subject: card.subject, conceptIds: card.conceptIds,
        front: card.front, back: card.back, sources: card.sources, reviewStatus: card.reviewStatus,
      })), queue: cards.map((card) => card.id), cursor: 0,
      completedCardIds: [], revision: 0, startedAt: now, updatedAt: now, ...(dailyPlanId ? { dailyPlanId } : {}),
    };
    reviewSessionSchema.parse(session);
    await this.database.transaction('rw', this.database.reviewSessions, this.database.dailyPlans, async () => {
      if (dailyPlanId && !await this.database.dailyPlans.get(dailyPlanId)) throw new Error('每日计划不存在');
      await this.database.reviewSessions.add(session);
    });
    return session;
  }
  async rateCard(sessionId: string, expectedRevision: number, rating: CardRating, activeDurationMs: number, now: string): Promise<ReviewSession> {
    if (!Number.isFinite(activeDurationMs) || activeDurationMs < 0) throw new Error('无效的有效用时');
    return this.database.transaction('rw', this.database.reviewSessions, this.database.cardReviewEvents, async () => {
      const session = await this.database.reviewSessions.get(sessionId);
      if (!session) throw new Error('复习轮次不存在');
      const id = JSON.stringify([sessionId, expectedRevision]);
      const previous = await this.database.cardReviewEvents.get(id);
      if (previous) {
        if (previous.rating !== rating) throw new LearningConflictError();
        return session;
      }
      if (session.revision !== expectedRevision || now < session.updatedAt) throw new LearningConflictError();
      const card = session.cards.find((entry) => entry.id === session.queue[session.cursor]);
      if (!card) throw new Error('卡片内容缺失，已阻止评分');
      const advanced = advanceReviewSession(session, rating, now);
      const event: CardReviewEvent = {
        id, sessionId, cardId: card.id, cardVersion: card.version, rating, ordinal: advanced.ordinal,
        queueIndex: session.cursor, reviewedAt: now, activeDurationMs,
      };
      reviewSessionSchema.parse(advanced.session);
      await this.database.cardReviewEvents.add(event);
      await this.database.reviewSessions.put(advanced.session);
      return advanced.session;
    });
  }
  async resolveNoteConflict(id: string, body: string, expectedUpdatedAt: string): Promise<void> {
    await this.database.transaction('rw', this.database.noteConflicts, this.database.notes, async () => {
      const conflict = await this.database.noteConflicts.get(id);
      if (!conflict || conflict.resolvedAt) throw new LearningConflictError();
      const note = await this.database.notes.where('questionId').equals(conflict.questionId).first();
      if (!note || note.updatedAt !== expectedUpdatedAt || !body.trim()) throw new LearningConflictError();
      const now = new Date(Math.max(Date.now(), Date.parse(note.updatedAt) + 1)).toISOString();
      await this.database.notes.put({ ...note, body, updatedAt: now });
      await this.database.noteConflicts.put({ ...conflict, resolvedAt: now });
    });
  }
}
