import Dexie, { liveQuery } from 'dexie';
import { canonicalSerialize } from '@408os/content-schema';
import { SYNC_KINDS, syncEntityId, practiceEvidenceId, type Attempt, type CardReviewEvent, type Note, type PersonalCard, type PracticeContext, type PracticeEvidence, type ReviewSession, type StudySession, type SyncChange, type SyncEntity, type SyncResult, type SyncCursor } from '@408os/domain';
import type { UserDatabase } from './databases';
import { parseSyncMutation, partitionSyncChanges, syncPayloadSchemas } from './sync-schema';
import { dailyPlanSchema } from './learning-schema';
import { rebuildVersionedProgress } from './user-schema-v2';

const syncKey = (kind: string, id: string) => JSON.stringify([kind, id]);
const internalSetting = (id: string) => /^(migration\.|sync\.|account\.)/.test(id);
async function snapshot(database: UserDatabase) {
  const result = new Map<string, { kind: SyncChange['kind']; entityId: string; value: unknown }>();
  for (const kind of SYNC_KINDS) {
    const rows = await database.table(kind).toArray() as unknown[];
    for (const row of rows) {
      const entityId = syncEntityId(kind, row);
      if (kind === 'settings' && internalSetting(entityId)) continue;
      result.set(syncKey(kind, entityId), { kind, entityId, value: row });
    }
  }
  return result;
}
const ownedTransactions = new WeakSet<object>();
export class AccountSyncRepository {
  private locked = false;
  constructor(readonly database: UserDatabase) {}
  lock() { this.locked = true; }
  private async queueChanges(changes: SyncChange[]) {
    if (!changes.length) return;
    let device = await this.database.syncMeta.get('device');
    if (!device) { device = { key: 'device', value: crypto.randomUUID() }; await this.database.syncMeta.put(device); }
    for (const [index, batch] of partitionSyncChanges(changes).entries()) {
      const mutation = parseSyncMutation({ operationId: crypto.randomUUID(), deviceId: device.value, createdAt: new Date().toISOString(), changes: batch });
      await this.database.outbox.add({ operationId: mutation.operationId, mutation, queuedAt: Date.now() + index, state: 'pending' });
    }
    await this.database.syncHeads.bulkPut(changes.map((change) => ({ key: syncKey(change.kind, change.entityId), revision: change.baseRevision + 1 })));
  }
  private async rebuildProgress() {
    const current = new Map((await this.database.versionedProgresses.toArray()).map((row) => [JSON.stringify([row.questionId, row.questionContentVersion]), row]));
    const derived = rebuildVersionedProgress(await this.database.attempts.toArray());
    await this.database.versionedProgresses.bulkPut(derived.map((row) => {
      const old = current.get(JSON.stringify([row.questionId, row.questionContentVersion]));
      return old ? { ...row, mastery: old.mastery } : row;
    }));
  }
  async atomic<T>(job: () => Promise<T>): Promise<T> {
    if (this.locked) throw new Error('账号已退出，本地记录已锁定。');
    if (!this.database.accountId) return this.database.transaction('rw', this.database.tables, job);
    const active = Dexie.currentTransaction;
    if (active && ownedTransactions.has(active)) return job();
    return this.database.transaction('rw', this.database.tables, async (transaction) => {
      ownedTransactions.add(transaction);
      const before = await snapshot(this.database);
      const result = await job();
      const after = await snapshot(this.database);
      const changes: SyncChange[] = [];
      for (const key of new Set([...before.keys(), ...after.keys()])) {
        const old = before.get(key);
        const current = after.get(key);
        if (canonicalSerialize(old?.value ?? null) === canonicalSerialize(current?.value ?? null)) continue;
        const row = current ?? old!;
        const head = await this.database.syncHeads.get(key);
        changes.push({ kind: row.kind, entityId: row.entityId, baseRevision: head?.revision ?? 0, value: current?.value ?? null });
      }
      await this.queueChanges(changes);
      return result;
    });
  }
  wrap<T extends object>(repository: T, methods: readonly (keyof T)[]): T {
    return new Proxy(repository, { get: (target, key, receiver) => {
      const value = Reflect.get(target, key, receiver) as unknown;
      if (typeof value !== 'function') return value;
      if (!methods.includes(key as keyof T)) return value.bind(target) as unknown;
      return (...args: unknown[]) => this.atomic(() => value.apply(target, args) as Promise<unknown>);
    } });
  }
  pending() { return this.database.outbox.orderBy('queuedAt').filter((item) => item.state === 'pending').toArray(); }
  async getPending(id: string) {
    const operation = await this.database.outbox.get(id);
    return operation?.state === 'pending' ? operation : undefined;
  }
  async enqueueSnapshot() {
    await this.queueChanges([...await snapshot(this.database)].map(([, row]) => ({ ...row, baseRevision: 0 })));
  }
  private pendingCount() { return this.database.outbox.where('state').equals('pending').count(); }
  subscribePendingCount(onValue: (count: number | null) => void) {
    const subscription = liveQuery<number | null>(() => this.locked || !this.database.accountId ? null : this.pendingCount())
      .subscribe({ next: onValue, error: () => onValue(null) });
    return () => subscription.unsubscribe();
  }
  async status() {
    if (!this.database.accountId) return { pending: 0, conflicts: [] };
    return { pending: await this.pendingCount(), conflicts: await this.database.syncConflicts.filter((entry) => !entry.resolvedAt).toArray() };
  }
  async cursor(): Promise<SyncCursor | null> { return (await this.database.syncMeta.get('cursor'))?.value as SyncCursor | null ?? null; }
  private async writeEntity(entity: SyncEntity) {
    const key = entity.kind === 'versionedProgresses' ? JSON.parse(entity.entityId) as string[] : entity.entityId;
    if (entity.value === null) await this.database.table(entity.kind).delete(key);
    else {
      const parsed = entity.kind === 'dailyPlans' ? dailyPlanSchema.parse(entity.value) : syncPayloadSchemas[entity.kind].parse(entity.value);
      if (syncEntityId(entity.kind, parsed) !== entity.entityId) throw new Error('服务端同步标识不匹配。');
      await this.database.table(entity.kind).put(parsed);
    }
    await this.database.syncHeads.put({ key: syncKey(entity.kind, entity.entityId), revision: entity.revision });
  }
  async acknowledge(operationId: string, result: SyncResult) {
    await this.database.transaction('rw', this.database.tables, async () => {
      const operation = await this.database.outbox.get(operationId);
      if (!operation) return;
      if (result.status === 'conflict') {
        await this.database.syncConflicts.bulkPut(result.conflicts);
        await this.database.outbox.update(operationId, { state: 'conflict' });
        // Every dependent operation stays preserved and stops retrying until explicit reconciliation.
        const ids = new Set(operation.mutation.changes.map((change) => syncKey(change.kind, change.entityId)));
        let expanded = true;
        const remaining = await this.pending();
        while (expanded) {
          expanded = false;
          for (const next of remaining) if (next.state === 'pending' && next.mutation.changes.some((change) => ids.has(syncKey(change.kind, change.entityId)))) {
            await this.database.outbox.update(next.operationId, { state: 'conflict' });
            next.state = 'conflict'; expanded = true;
            for (const change of next.mutation.changes) ids.add(syncKey(change.kind, change.entityId));
          }
        }
        return;
      }
      await this.database.outbox.delete(operationId);
      const remaining = await this.database.outbox.toArray();
      for (const entity of result.entities) {
        const dependents = remaining.filter((item) => item.state === 'pending' && item.mutation.changes.some((change) => change.kind === entity.kind && change.entityId === entity.entityId))
          .sort((a, b) => a.queuedAt - b.queuedAt);
        let revision = entity.revision;
        for (const item of dependents) {
          const change = item.mutation.changes.find((entry) => entry.kind === entity.kind && entry.entityId === entity.entityId)!;
          change.baseRevision = revision++;
          await this.database.outbox.put(item);
        }
        if (dependents.length) await this.database.syncHeads.put({ key: syncKey(entity.kind, entity.entityId), revision });
        else if (!remaining.some((item) => item.mutation.changes.some((change) => change.kind === entity.kind && change.entityId === entity.entityId))) await this.writeEntity(entity);
      }
      await this.rebuildProgress();
    });
  }
  async pull(input: { reconcile: boolean; cursor: SyncCursor; entities: SyncEntity[]; more: boolean }) {
    if (!input || typeof input.reconcile !== 'boolean' || !Array.isArray(input.entities)
      || typeof input.cursor?.epoch !== 'string' || !Number.isSafeInteger(input.cursor?.sequence) || input.cursor.sequence < 0) throw new Error('同步响应格式错误。');
    await this.database.transaction('rw', this.database.tables, async () => {
      const queued = await this.database.outbox.toArray();
      const pendingKeys = new Set(queued.flatMap((item) => item.mutation.changes.map((change) => syncKey(change.kind, change.entityId))));
      for (const entity of input.entities) {
        if (!Number.isSafeInteger(entity.revision) || entity.revision < 1) throw new Error('同步版本无效。');
        const key = syncKey(entity.kind, entity.entityId);
        if (pendingKeys.has(key)) continue;
        if (entity.value && (entity.kind === 'notes' || entity.kind === 'personalCards')) {
          const remote = syncPayloadSchemas[entity.kind].parse(entity.value) as Note & PersonalCard;
          if (remote.id !== entity.entityId) throw new Error('服务端同步标识不匹配。');
          const local = entity.kind === 'notes'
            ? await this.database.notes.where('questionId').equals(remote.questionId).filter((note) => note.id !== remote.id).first()
            : remote.baseCardId ? await this.database.personalCards.filter((card) => card.baseCardId === remote.baseCardId && card.id !== remote.id).first() : undefined;
          if (local) {
            // A second device may create a different ID for the same logical note/card.
            // Preserve the remote text in the conflict, never create duplicate live rows
            // that would make the recovery backup invalid before the user can merge.
            const conflict = { id: JSON.stringify(['alias', entity.kind, local.id, remote.id, entity.revision]),
              kind: entity.kind, entityId: entity.entityId, local, remote, remoteRevision: entity.revision, createdAt: new Date().toISOString() };
            await this.database.syncConflicts.put(conflict);
            pendingKeys.add(syncKey(entity.kind, local.id));
            for (const operation of queued) if (operation.mutation.changes.some((change) => change.kind === entity.kind && change.entityId === local.id)) {
              await this.acknowledge(operation.operationId, { status: 'conflict', conflicts: [conflict] });
            }
            continue;
          }
        }
        if (input.reconcile) {
          const currentKey = entity.kind === 'versionedProgresses' ? JSON.parse(entity.entityId) as string[] : entity.entityId;
          const local = await this.database.table(entity.kind).get(currentKey) as unknown;
          if (local && canonicalSerialize(local) !== canonicalSerialize(entity.value)) {
            if (entity.kind !== 'dailyPlans') await this.database.syncConflicts.put({
              id: crypto.randomUUID(), kind: entity.kind, entityId: entity.entityId, local, remote: entity.value,
              remoteRevision: entity.revision, createdAt: new Date().toISOString(),
            });
          }
        }
        await this.writeEntity(entity);
      }
      if (input.reconcile) {
        // Restore epoch: retain locally unique records, queue them for reconciliation instead of clearing IndexedDB.
        const remoteKeys = new Set(input.entities.map((entity) => syncKey(entity.kind, entity.entityId)));
        const rows = await snapshot(this.database);
        const device = (await this.database.syncMeta.get('device'))?.value ?? crypto.randomUUID();
        await this.database.syncMeta.put({ key: 'device', value: device });
        const changes = [...rows.entries()].filter(([key]) => !remoteKeys.has(key) && !pendingKeys.has(key)).map(([, row]) => ({ ...row, baseRevision: 0 }));
        await this.queueChanges(changes);
      }
      await this.database.syncMeta.put({ key: 'cursor', value: input.cursor });
      await this.rebuildProgress();
    });
  }
  async resolveTextConflict(id: string, text: string, front?: string) {
    const conflict = await this.database.syncConflicts.get(id);
    if (!conflict || !['notes', 'personalCards'].includes(conflict.kind)) throw new Error('此冲突需要保留轮次副本处理。');
    await this.database.transaction('rw', this.database.tables, async () => {
      const value = structuredClone(conflict.remote ?? conflict.local) as Record<string, unknown>;
      const localId = (conflict.local as { id?: string } | null)?.id;
      if (conflict.kind === 'notes') value.body = text;
      else {
        value.back = [{ type: 'text', text }];
        if (front?.trim()) value.front = [{ type: 'text', text: front }];
        value.revision = Number(value.revision ?? 0) + 1;
        value.version = `personal:${String(value.revision)}`;
      }
      value.updatedAt = new Date().toISOString();
      const deviceId = String((await this.database.syncMeta.get('device'))!.value);
      const mutation = parseSyncMutation({ operationId: crypto.randomUUID(), deviceId, createdAt: value.updatedAt,
        changes: [{ kind: conflict.kind, entityId: conflict.entityId, baseRevision: conflict.remoteRevision, value }] });
      await this.database.outbox.add({ operationId: mutation.operationId, mutation, queuedAt: Date.now(), state: 'pending' });
      await this.database.table(conflict.kind).put(value);
      if (localId && localId !== conflict.entityId) await this.database.table(conflict.kind).delete(localId);
      await this.database.syncHeads.put({ key: syncKey(conflict.kind, conflict.entityId), revision: conflict.remoteRevision + 1 });
      // Archive complete old operations before removing them from the live queue.
      for (const operation of await this.database.outbox.toArray()) {
        if (operation.state !== 'conflict') continue;
        const remaining = operation.mutation.changes.filter((change) => change.kind !== conflict.kind || (change.entityId !== conflict.entityId && change.entityId !== localId));
        if (remaining.length !== operation.mutation.changes.length) {
          await this.database.syncMeta.put({ key: `resolved-operation:${operation.operationId}`, value: operation });
          if (remaining.length) await this.database.outbox.update(operation.operationId, { mutation: { ...operation.mutation, changes: remaining } });
          else await this.database.outbox.delete(operation.operationId);
        }
      }
      await this.database.syncConflicts.update(id, { resolvedAt: new Date().toISOString() });
    });
  }
  async retainRoundCopy(id: string, remote: SyncEntity[]): Promise<string> {
    const conflict = await this.database.syncConflicts.get(id);
    if (!conflict || !['sessions', 'reviewSessions'].includes(conflict.kind)) throw new Error('请选择练习或卡片轮次冲突。');
    return this.database.transaction('rw', this.database.tables, async () => {
      const sourceId = conflict.entityId;
      const copyId = crypto.randomUUID();
      const copies: SyncChange[] = [];
      const family = (kind: string, entityId: string, value: unknown) => {
        const row = value as { sessionId?: string } | null;
        return kind === conflict.kind ? entityId === sourceId
          : conflict.kind === 'sessions' ? ['attempts', 'practiceEvidence', 'practiceContexts', 'mockExams'].includes(kind) && row?.sessionId === sourceId
            : kind === 'cardReviewEvents' && row?.sessionId === sourceId;
      };
      const rows = await snapshot(this.database);
      const originals = [...rows.values()].filter((row) => family(row.kind, row.entityId, row.value));
      const add = (kind: SyncChange['kind'], value: unknown) => copies.push({ kind, entityId: syncEntityId(kind, value), value, baseRevision: 0 });
      if (conflict.kind === 'sessions') {
        const session = await this.database.sessions.get(sourceId);
        if (!session || session.mode === 'mock' || originals.some((row) => row.kind === 'mockExams')) throw new Error('模考冲突请保留完整备份，不能改写为普通练习。');
        const attemptIds = new Map(originals.filter((row) => row.kind === 'attempts').map((row) => [row.entityId, crypto.randomUUID()]));
        add('sessions', { ...session, id: copyId } satisfies StudySession);
        for (const row of originals) {
          if (row.kind === 'attempts') add('attempts', { ...row.value as Attempt, id: attemptIds.get(row.entityId)!, sessionId: copyId });
          if (row.kind === 'practiceEvidence') {
            const evidence = row.value as PracticeEvidence;
            add('practiceEvidence', { ...evidence, id: practiceEvidenceId(copyId, evidence.questionId), sessionId: copyId,
              ...(evidence.attemptId ? { attemptId: attemptIds.get(evidence.attemptId)! } : {}) });
          }
        }
        add('practiceContexts', { sessionId: copyId, ...(conflict.remote ? { parentSessionId: sourceId } : {}) } satisfies PracticeContext);
      } else {
        const round = await this.database.reviewSessions.get(sourceId);
        if (!round) throw new Error('本机复习轮次不存在。');
        const { dailyPlanId: _plan, ...copy } = round; void _plan;
        add('reviewSessions', { ...copy, id: copyId } satisfies ReviewSession);
        for (const row of originals) if (row.kind === 'cardReviewEvents') {
          const event = row.value as CardReviewEvent;
          add('cardReviewEvents', { ...event, id: JSON.stringify([copyId, event.queueIndex]), sessionId: copyId });
        }
      }
      await this.database.syncMeta.put({ key: `retained-round:${copyId}`, value: { sourceId, originals, conflict, savedAt: new Date().toISOString() } });
      const remoteMap = new Map(remote.map((row) => [syncKey(row.kind, row.entityId), row]));
      for (const original of originals) {
        const current = remoteMap.get(syncKey(original.kind, original.entityId));
        if (current) await this.writeEntity(current);
        else {
          await this.database.table(original.kind).delete(original.entityId);
          await this.database.syncHeads.delete(syncKey(original.kind, original.entityId));
        }
      }
      for (const entity of remote) if (family(entity.kind, entity.entityId, entity.value)) await this.writeEntity(entity);
      for (const operation of await this.database.outbox.toArray()) {
        const remaining = operation.mutation.changes.filter((change) => !family(change.kind, change.entityId, change.value));
        if (remaining.length === operation.mutation.changes.length) continue;
        await this.database.syncMeta.put({ key: `resolved-operation:${operation.operationId}`, value: operation });
        if (remaining.length) await this.database.outbox.update(operation.operationId, { mutation: { ...operation.mutation, changes: remaining } });
        else await this.database.outbox.delete(operation.operationId);
      }
      for (const entry of await this.database.syncConflicts.toArray()) {
        if (family(entry.kind, entry.entityId, entry.local)) await this.database.syncConflicts.update(entry.id, { resolvedAt: new Date().toISOString() });
      }
      for (const copy of copies) await this.database.table(copy.kind).put(copy.value);
      await this.rebuildProgress();
      await this.queueChanges(copies);
      return copyId;
    });
  }
}
