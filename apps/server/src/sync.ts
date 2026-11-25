import { randomUUID, createHash } from 'node:crypto';
import { canonicalSerialize } from '@408os/content-schema';
import {
  beijingDate, buildPersistentDailyPlan, effectiveCards, DEFAULT_REVIEW_LIMITS, practiceEvidenceId,
  type Attempt, type CardReviewEvent, type PersonalCard, type PracticeEvidence, type ReviewSession,
  type StudySession, type SyncChange, type SyncConflict, type SyncEntity, type SyncResult, type Note, type QuestionProgress,
} from '@408os/domain';
import { parseSyncMutation } from '../../../packages/storage/src/sync-schema';
import { reviewLimitsSettingSchema, validateReviewEvidence } from '../../../packages/storage/src/learning-schema';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { AuthService, type Account } from './auth';
import { ContentService } from './content';
import { ApiError } from './errors';
import { rebuildVersionedProgress } from '../../../packages/storage/src/user-schema-v2';

interface EntityRow { kind: SyncEntity['kind']; entity_id: string; revision: number; payload: string | null; deleted: number }
const entityValue = (row: EntityRow | undefined): unknown | null => row && !row.deleted && row.payload ? JSON.parse(row.payload) as unknown : null;
const toEntity = (row: EntityRow): SyncEntity => ({ kind: row.kind, entityId: row.entity_id, revision: row.revision, value: entityValue(row) });
const lastWriterKinds = new Set(['collections', 'settings', 'versionedProgresses']);

export class SyncService {
  constructor(readonly auth: AuthService, readonly content: ContentService) {}
  private get(account: string, kind: string, id: string) {
    return this.auth.db.prepare('SELECT * FROM entities WHERE account_id=? AND kind=? AND entity_id=?').get(account, kind, id) as EntityRow | undefined;
  }
  private list<T>(account: string, kind: string): T[] {
    return (this.auth.db.prepare('SELECT * FROM entities WHERE account_id=? AND kind=? AND deleted=0').all(account, kind) as EntityRow[]).map((row) => entityValue(row) as T);
  }
  private store(account: string, entity: SyncEntity, operationId: string) {
    const now = new Date(this.auth.now()).toISOString();
    const payload = entity.value === null ? null : JSON.stringify(entity.value);
    const deleted = Number(entity.value === null);
    this.auth.db.prepare('INSERT INTO entities(account_id,kind,entity_id,revision,payload,deleted,updated_at) VALUES (?,?,?,?,?,?,?) ON CONFLICT(account_id,kind,entity_id) DO UPDATE SET revision=excluded.revision,payload=excluded.payload,deleted=excluded.deleted,updated_at=excluded.updated_at')
      .run(account, entity.kind, entity.entityId, entity.revision, payload, deleted, now);
    this.auth.db.prepare('INSERT INTO entity_history(account_id,kind,entity_id,revision,payload,deleted,updated_at) VALUES (?,?,?,?,?,?,?)')
      .run(account, entity.kind, entity.entityId, entity.revision, payload, deleted, now);
    this.auth.db.prepare('INSERT INTO sync_events(account_id,kind,entity_id,revision,payload,deleted,operation_id) VALUES (?,?,?,?,?,?,?)')
      .run(account, entity.kind, entity.entityId, entity.revision, payload, deleted, operationId);
  }
  private validateBundle(account: Account, changes: SyncChange[]) {
    const after = <T>(kind: SyncChange['kind'], id: string): T | null => {
      const changed = changes.find((change) => change.kind === kind && change.entityId === id);
      return (changed ? changed.value : entityValue(this.get(account.id, kind, id))) as T | null;
    };
    for (const change of changes) {
      const old = this.get(account.id, change.kind, change.entityId);
      if (['attempts', 'cardReviewEvents'].includes(change.kind) && old && canonicalSerialize(entityValue(old)) !== canonicalSerialize(change.value)) {
        throw new ApiError(409, 'IMMUTABLE_EVIDENCE', '原始作答或卡片评分不能被覆盖；更正必须保留原始证据。');
      }
      if (change.kind === 'attempts' && change.value) {
        const attempt = change.value as Attempt;
        const session = after<StudySession>('sessions', attempt.sessionId);
        if (!session || session.mode !== attempt.mode || !session.submittedQuestionIds.includes(attempt.questionId)
          || session.questionContentVersions[attempt.questionId] !== attempt.questionContentVersion
          || canonicalSerialize(session.responses[attempt.questionId]) !== canonicalSerialize(attempt.response)) throw new ApiError(400, 'ATTEMPT_SESSION', '作答与练习轮次必须一致、一起保存。');
      }
      if (change.kind === 'sessions' && change.value) {
        const session = change.value as StudySession;
        const previous = entityValue(old) as StudySession | null;
        if (previous && (canonicalSerialize(previous.questionContentVersions) !== canonicalSerialize(session.questionContentVersions)
          || canonicalSerialize(previous.questionIds) !== canonicalSerialize(session.questionIds)
          || previous.submittedQuestionIds.some((id) => !session.submittedQuestionIds.includes(id))
          || (previous.completedAt && previous.completedAt !== session.completedAt))) throw new ApiError(409, 'SESSION_EVIDENCE', '轮次题面或已提交证据不能回退。');
        const attempts = [...this.list<Attempt>(account.id, 'attempts'), ...changes.filter((item) => item.kind === 'attempts' && item.value).map((item) => item.value as Attempt)];
        for (const questionId of session.submittedQuestionIds) {
          const matching = new Map(attempts.filter((attempt) => attempt.sessionId === session.id && attempt.questionId === questionId).map((attempt) => [attempt.id, attempt]));
          const attempt = [...matching.values()][0];
          if (matching.size !== 1 || attempt?.mode !== session.mode
            || attempt.questionContentVersion !== session.questionContentVersions[questionId]
            || canonicalSerialize(attempt.response) !== canonicalSerialize(session.responses[questionId])) {
            throw new ApiError(400, 'SESSION_ATTEMPT', '已提交题目必须对应唯一且一致的原始作答。');
          }
        }
      }
      if (change.kind === 'cardReviewEvents' && change.value) {
        const event = change.value as CardReviewEvent;
        const round = after<ReviewSession>('reviewSessions', event.sessionId);
        if (!round || round.cursor <= event.queueIndex || round.queue[event.queueIndex] !== event.cardId
          || !round.cards.some((card) => card.id === event.cardId && card.version === event.cardVersion)) throw new ApiError(400, 'CARD_ROUND', '卡片评分与复习轮次必须一起保存。');
      }
      if (change.kind === 'settings' && change.entityId.startsWith('content-review:') && account.role !== 'admin') throw new ApiError(403, 'ADMIN_REQUIRED', '审核记录仅限管理员。');
      if (change.kind === 'practiceEvidence' && change.value) {
        const evidence = change.value as PracticeEvidence;
        const previous = entityValue(old) as PracticeEvidence | null;
        const session = after<StudySession>('sessions', evidence.sessionId);
        const attempt = evidence.attemptId ? after<Attempt>('attempts', evidence.attemptId) : null;
        if (!session || evidence.id !== practiceEvidenceId(evidence.sessionId, evidence.questionId)
          || session.questionContentVersions[evidence.questionId] !== evidence.questionContentVersion
          || (evidence.attemptId && (!attempt || attempt.sessionId !== evidence.sessionId || attempt.questionId !== evidence.questionId
            || attempt.questionContentVersion !== evidence.questionContentVersion
            || (attempt.response.type === 'choice' && evidence.firstResponse && canonicalSerialize(evidence.firstResponse) !== canonicalSerialize(attempt.response))))) {
          throw new ApiError(400, 'PRACTICE_EVIDENCE', '首答证据与轮次或作答不一致。');
        }
        if (previous && (evidence.hintsUsed < previous.hintsUsed || evidence.activeDurationMs < previous.activeDurationMs
          || (previous.firstResponse && canonicalSerialize(previous.firstResponse) !== canonicalSerialize(evidence.firstResponse))
          || (previous.answerRevealedAt && previous.answerRevealedAt !== evidence.answerRevealedAt)
          || (previous.attemptId && previous.attemptId !== evidence.attemptId))) {
          throw new ApiError(409, 'PRACTICE_EVIDENCE', '提示、首答和有效停留证据不能回退。');
        }
      }
      if (['sessions', 'reviewSessions'].includes(change.kind) && change.value === null) {
        throw new ApiError(409, 'SESSION_EVIDENCE', '含学习过程的轮次不能通过同步删除。');
      }
    }
    const affectedRounds = new Set(changes.flatMap((change) => change.kind === 'reviewSessions' ? [change.entityId]
      : change.kind === 'cardReviewEvents' && change.value ? [(change.value as CardReviewEvent).sessionId] : []));
    if (affectedRounds.size) {
      const events = new Map(this.list<CardReviewEvent>(account.id, 'cardReviewEvents').map((event) => [event.id, event]));
      for (const change of changes) if (change.kind === 'cardReviewEvents' && change.value) events.set(change.entityId, change.value as CardReviewEvent);
      for (const id of affectedRounds) {
        const round = after<ReviewSession>('reviewSessions', id);
        if (!round) throw new ApiError(400, 'CARD_ROUND', '复习轮次缺失。');
        const prior = entityValue(this.get(account.id, 'reviewSessions', id)) as ReviewSession | null;
        if (prior && (canonicalSerialize(prior.cards) !== canonicalSerialize(round.cards) || prior.startedAt !== round.startedAt
          || prior.cursor > round.cursor)) throw new ApiError(409, 'CARD_ROUND', '复习轮次的卡片版本或原始过程不能回退。');
        try { validateReviewEvidence(round, [...events.values()].filter((event) => event.sessionId === id)); }
        catch { throw new ApiError(400, 'CARD_ROUND', '复习队列、首次评分与重试过程不一致。'); }
      }
    }
  }
  push(account: Account, input: unknown): SyncResult {
    const mutation = parseSyncMutation(input);
    const hash = createHash('sha256').update(canonicalSerialize(mutation)).digest('hex');
    return this.auth.db.transaction(() => {
      const previous = this.auth.db.prepare('SELECT digest,result FROM operations WHERE account_id=? AND operation_id=?').get(account.id, mutation.operationId) as { digest: string; result: string } | undefined;
      if (previous) {
        if (previous.digest !== hash) throw new ApiError(409, 'OPERATION_REUSED', '相同操作 ID 不能携带不同数据。');
        return JSON.parse(previous.result) as SyncResult;
      }
      const stale = mutation.changes.filter((change) => !lastWriterKinds.has(change.kind)
        && (this.get(account.id, change.kind, change.entityId)?.revision ?? 0) !== change.baseRevision
        && canonicalSerialize(entityValue(this.get(account.id, change.kind, change.entityId))) !== canonicalSerialize(change.value));
      const aliases = new Map<string, EntityRow>();
      for (const change of mutation.changes) {
        if (!change.value || !['notes', 'personalCards'].includes(change.kind)) continue;
        const row = change.value as Note & PersonalCard;
        const collision = change.kind === 'notes'
          ? this.list<Note>(account.id, 'notes').find((note) => note.questionId === row.questionId && note.id !== change.entityId)
          : row.baseCardId ? this.list<PersonalCard>(account.id, 'personalCards').find((card) => card.baseCardId === row.baseCardId && card.id !== change.entityId) : undefined;
        if (collision) aliases.set(JSON.stringify([change.kind, change.entityId]), this.get(account.id, change.kind, collision.id)!);
      }
      let result: SyncResult;
      if (stale.length || aliases.size) {
        // Preserve the whole transaction, including attempts belonging to a conflicting session.
        const conflicts: SyncConflict[] = mutation.changes.map((change) => {
          const current = aliases.get(JSON.stringify([change.kind, change.entityId])) ?? this.get(account.id, change.kind, change.entityId);
          const conflict = { id: randomUUID(), kind: change.kind, entityId: current?.entity_id ?? change.entityId, local: change.value,
            remote: entityValue(current), remoteRevision: current?.revision ?? 0, createdAt: new Date(this.auth.now()).toISOString() };
          this.auth.db.prepare('INSERT INTO conflicts(id,account_id,kind,entity_id,local_payload,remote_payload,remote_revision,created_at) VALUES (?,?,?,?,?,?,?,?)')
            .run(conflict.id, account.id, change.kind, change.entityId, JSON.stringify(conflict.local), JSON.stringify(conflict.remote), conflict.remoteRevision, conflict.createdAt);
          return conflict;
        });
        result = { status: 'conflict', conflicts };
      } else {
        this.validateBundle(account, mutation.changes);
        const entities = mutation.changes.map((change): SyncEntity => {
          const current = this.get(account.id, change.kind, change.entityId);
          if (current && canonicalSerialize(entityValue(current)) === canonicalSerialize(change.value)) return toEntity(current);
          const value = { kind: change.kind, entityId: change.entityId, revision: (current?.revision ?? 0) + 1, value: change.value };
          this.store(account.id, value, mutation.operationId);
          return value;
        });
        if (mutation.changes.some((change) => ['attempts', 'versionedProgresses'].includes(change.kind))) {
          for (const progress of rebuildVersionedProgress(this.list<Attempt>(account.id, 'attempts'))) {
            const entityId = JSON.stringify([progress.questionId, progress.questionContentVersion]);
            const old = this.get(account.id, 'versionedProgresses', entityId);
            const prior = entityValue(old) as QuestionProgress | null;
            const value = prior ? { ...progress, mastery: prior.mastery } : progress;
            if (canonicalSerialize(value) === canonicalSerialize(prior)) continue;
            const derived: SyncEntity = { kind: 'versionedProgresses', entityId, revision: (old?.revision ?? 0) + 1, value };
            this.store(account.id, derived, mutation.operationId);
            const index = entities.findIndex((entity) => entity.kind === derived.kind && entity.entityId === entityId);
            if (index >= 0) entities[index] = derived; else entities.push(derived);
          }
        }
        result = { status: 'accepted', entities };
      }
      this.auth.db.prepare('INSERT INTO operations(account_id,operation_id,digest,result) VALUES (?,?,?,?)').run(account.id, mutation.operationId, hash, JSON.stringify(result));
      return result;
    })();
  }
  private epoch() { return (this.auth.db.prepare("SELECT value FROM meta WHERE key='sync_epoch'").get() as { value: string }).value; }
  routes(app: FastifyInstance) {
    app.post('/api/v1/sync/push', { bodyLimit: 8 * 1024 * 1024 }, async (request) => this.push(this.auth.require(request), request.body));
    app.get('/api/v1/sync/pull', async (request) => {
      const account = this.auth.require(request);
      const { epoch, sequence } = z.object({ epoch: z.string().default(''), sequence: z.coerce.number().int().min(0).default(0) }).parse(request.query);
      return this.auth.db.transaction(() => {
        const currentEpoch = this.epoch();
        const high = (this.auth.db.prepare('SELECT COALESCE(MAX(sequence),0) AS n FROM sync_events WHERE account_id=?').get(account.id) as { n: number }).n;
        if (epoch !== currentEpoch || sequence > high) {
          return { reconcile: true, cursor: { epoch: currentEpoch, sequence: high }, entities: (this.auth.db.prepare('SELECT * FROM entities WHERE account_id=? ORDER BY kind,entity_id').all(account.id) as EntityRow[]).map(toEntity), more: false };
        }
        const events = this.auth.db.prepare('SELECT * FROM sync_events WHERE account_id=? AND sequence>? ORDER BY sequence LIMIT 500').all(account.id, sequence) as Array<EntityRow & { sequence: number; operation_id: string }>;
        const last = events.at(-1);
        if (events.length === 500 && last) events.push(...this.auth.db.prepare('SELECT * FROM sync_events WHERE account_id=? AND sequence>? AND operation_id=? ORDER BY sequence')
          .all(account.id, last.sequence, last.operation_id) as typeof events);
        const next = events.at(-1)?.sequence ?? high;
        return { reconcile: false, cursor: { epoch: currentEpoch, sequence: next }, entities: events.map(toEntity), more: next < high };
      })();
    });
    app.get('/api/v1/sync/conflicts', async (request) => {
      const account = this.auth.require(request);
      return this.auth.db.prepare('SELECT id,kind,entity_id,local_payload,remote_payload,remote_revision,created_at,resolved_at FROM conflicts WHERE account_id=? ORDER BY created_at').all(account.id);
    });
    app.post('/api/v1/sync/conflicts/:id/resolve', async (request) => {
      const account = this.auth.require(request);
      const { id } = z.object({ id: z.uuid() }).parse(request.params);
      // Merging itself is a normal revision-checked sync operation. This endpoint only acknowledges it.
      this.auth.db.prepare('UPDATE conflicts SET resolved_at=? WHERE id=? AND account_id=?').run(new Date(this.auth.now()).toISOString(), id, account.id);
      return { ok: true };
    });
    app.post('/api/v1/plans/today', async (request) => {
      const account = this.auth.require(request);
      return this.auth.db.transaction(() => {
        const now = new Date(this.auth.now()).toISOString();
        const date = beijingDate(now);
        const previous = this.get(account.id, 'dailyPlans', date);
        if (previous) return entityValue(previous);
        const packs = this.content.questions();
        const learning = this.content.learning();
        if (!packs.length || !learning) throw new ApiError(409, 'CONTENT_REQUIRED', '题包与学习包尚未发布。');
        const versions = new Map(learning.mappings.map((mapping) => [mapping.questionId, mapping.questionContentVersion]));
        const questions = packs.flatMap((pack) => pack.questions).filter((question) => versions.get(question.id) === question.contentVersion);
        const settings = entityValue(this.get(account.id, 'settings', 'review.limits')) as { value?: unknown } | null;
        const limitsSetting = reviewLimitsSettingSchema.safeParse(settings?.value);
        const limits = limitsSetting.success ? date >= limitsSetting.data.effectiveOn ? limitsSetting.data.next : limitsSetting.data.previous : DEFAULT_REVIEW_LIMITS;
        const cards = effectiveCards(learning.cards, this.list<PersonalCard>(account.id, 'personalCards'))
          .filter((card) => card.sources.every((source) => questions.some((question) => question.id === source.questionId && question.contentVersion === source.questionContentVersion)));
        const plan = buildPersistentDailyPlan(questions, this.list<Attempt>(account.id, 'attempts'), cards, this.list<CardReviewEvent>(account.id, 'cardReviewEvents'), now, limits, this.list<PracticeEvidence>(account.id, 'practiceEvidence'));
        this.store(account.id, { kind: 'dailyPlans', entityId: date, revision: 1, value: plan }, `plan:${date}`);
        return plan;
      })();
    });
  }
}
