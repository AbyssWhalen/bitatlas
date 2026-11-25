import { z } from 'zod';
import Dexie from 'dexie';
import { canonicalSerialize, sha256 } from '@408os/content-schema';
import { SYNC_KINDS, type SyncConflict } from '@408os/domain';
import { BackupService, backupV4Schema, type BackupImportMode, type BackupPreview } from './backup';
import type { ContentDatabase, UserDatabase } from './databases';
import { AccountSyncRepository } from './account-sync';
import { syncMutationSchema } from './sync-schema';
import { repairLegacyStudySelfScores } from './repositories';
import { sealRecoverySnapshot, recoveryBackupCandidate } from './migration';

const v5Schema = z.object({
  schemaVersion: z.literal(5), accountId: z.uuid(), exportedAt: z.iso.datetime(), appVersion: z.string().min(1),
  data: backupV4Schema.shape.data, sha256: z.string().length(64),
  sync: z.object({
    outbox: z.array(z.object({ operationId: z.uuid(), mutation: syncMutationSchema, queuedAt: z.number().finite(), state: z.enum(['pending', 'conflict']) }).strict()),
    heads: z.array(z.object({ key: z.string(), revision: z.int().nonnegative() }).strict()),
    conflicts: z.array(z.object({
      id: z.string().min(1), kind: z.enum(SYNC_KINDS), entityId: z.string().min(1), local: z.unknown(), remote: z.unknown(),
      remoteRevision: z.int().nonnegative(), createdAt: z.iso.datetime(), resolvedAt: z.iso.datetime().optional(),
    }).strict()),
    meta: z.array(z.object({ key: z.string(), value: z.unknown() }).strict()),
  }).strict(),
}).strict();
function parseV5(json: string) {
  const parsed = v5Schema.parse(JSON.parse(json));
  const { sha256: hash, ...body } = parsed;
  if (hash !== sha256(canonicalSerialize(body))) throw new Error('账号备份摘要不匹配。');
  backupV4Schema.parse({ schemaVersion: 4, exportedAt: parsed.exportedAt, appVersion: parsed.appVersion, data: parsed.data });
  for (const [key, ids] of Object.entries({
    outbox: parsed.sync.outbox.map((entry) => entry.operationId),
    heads: parsed.sync.heads.map((entry) => entry.key), conflicts: parsed.sync.conflicts.map((entry) => entry.id), meta: parsed.sync.meta.map((entry) => entry.key),
  })) if (new Set(ids).size !== ids.length) throw new Error(`备份有重复 ${key} 记录。`);
  if (parsed.sync.outbox.some((entry) => entry.operationId !== entry.mutation.operationId)) throw new Error('待同步操作 ID 不一致。');
  return parsed;
}
export class AccountBackupService extends BackupService {
  constructor(private readonly accountDatabase: UserDatabase, content: ContentDatabase, private readonly sync: AccountSyncRepository) { super(accountDatabase, content); }
  override async exportJson(appVersion: string, schemaVersion: 3 | 4 | 5 = 5): Promise<string> {
    if (schemaVersion !== 5) throw new Error('账号学习数据请使用 v5 完整备份，不能省略未同步记录。');
    await repairLegacyStudySelfScores(this.accountDatabase);
    return this.accountDatabase.transaction('r', this.accountDatabase.tables, async () => {
      const base = JSON.parse(await super.exportJson(appVersion, 4, true)) as z.infer<typeof backupV4Schema>;
      const body = {
        ...base, schemaVersion: 5, accountId: this.accountDatabase.accountId,
        sync: { outbox: await this.accountDatabase.outbox.toArray(), heads: await this.accountDatabase.syncHeads.toArray(),
          conflicts: await this.accountDatabase.syncConflicts.toArray(), meta: await this.accountDatabase.syncMeta.toArray() },
      };
      const json = JSON.stringify({ ...body, sha256: sha256(canonicalSerialize(body)) }, null, 2);
      parseV5(json); return json;
    });
  }
  override preflight(json: string): BackupPreview {
    if ((JSON.parse(json) as { schemaVersion?: number }).schemaVersion !== 5) return super.preflight(json);
    const parsed = parseV5(json);
    if (parsed.accountId !== this.accountDatabase.accountId) throw new Error('此 v5 备份属于另一个账号，不能自动归入当前账号。');
    return { ...super.preflight(JSON.stringify({ schemaVersion: 4, exportedAt: parsed.exportedAt, appVersion: parsed.appVersion, data: parsed.data })), schemaVersion: 5 };
  }
  override async importJson(json: string, mode: BackupImportMode): Promise<BackupPreview> {
    const preview = this.preflight(json);
    if (preview.schemaVersion !== 5) {
      const restore = async () => {
        const prior = mode === 'replace' ? sealRecoverySnapshot(5, Object.fromEntries(await Promise.all(this.accountDatabase.tables.map(async (table) => [table.name, await table.toArray()]))), new Date().toISOString()) : null;
        const existingPlans = await this.accountDatabase.dailyPlans.toArray();
        const existingRounds = new Set(await this.accountDatabase.reviewSessions.toCollection().primaryKeys());
        const existingContexts = new Set(await this.accountDatabase.practiceContexts.toCollection().primaryKeys());
        const result = await super.importJson(json, mode);
        if (prior) {
          for (const table of [this.accountDatabase.outbox, this.accountDatabase.syncHeads, this.accountDatabase.syncConflicts, this.accountDatabase.syncMeta]) await table.clear();
          await this.accountDatabase.syncMeta.put({ key: 'last-import-recovery', value: prior });
        }
        // Anonymous plans belong to a separate planner. Keep the exact source in the recovery archive,
        // but new account tasks must come from the server and imported history must remain portable.
        await this.accountDatabase.syncMeta.put({ key: `legacy-import:${crypto.randomUUID()}`, value: { json, importedAt: new Date().toISOString() } });
        await this.accountDatabase.dailyPlans.clear();
        await this.accountDatabase.dailyPlans.bulkPut(existingPlans);
        for (const round of await this.accountDatabase.reviewSessions.toArray()) {
          if ((mode === 'replace' || !existingRounds.has(round.id)) && round.dailyPlanId) {
            delete round.dailyPlanId; await this.accountDatabase.reviewSessions.put(round);
          }
        }
        for (const context of await this.accountDatabase.practiceContexts.toArray()) {
          if ((mode === 'replace' || !existingContexts.has(context.sessionId)) && context.dailyPlanId) {
            delete context.dailyPlanId; await this.accountDatabase.practiceContexts.put(context);
          }
        }
        if (prior) await this.sync.enqueueSnapshot();
        return result;
      };
      return mode === 'replace' ? this.accountDatabase.transaction('rw', this.accountDatabase.tables, restore) : this.sync.atomic(restore);
    }
    if (mode !== 'replace') throw new Error('账号 v5 的同步队列不能自动合并，请先导出两份完整备份后选择替换。');
    const parsed = parseV5(json);
    await this.accountDatabase.transaction('rw', this.accountDatabase.tables, async () => {
      // Preserve a complete rollback snapshot before replacing any local state.
      const prior = sealRecoverySnapshot(5, Object.fromEntries(await Promise.all(this.accountDatabase.tables.map(async (table) => [table.name, await table.toArray()]))), new Date().toISOString());
      await super.importJson(JSON.stringify({ schemaVersion: 4, exportedAt: parsed.exportedAt, appVersion: parsed.appVersion, data: parsed.data }), 'replace');
      for (const table of [this.accountDatabase.outbox, this.accountDatabase.syncHeads, this.accountDatabase.syncConflicts, this.accountDatabase.syncMeta]) await table.clear();
      await this.accountDatabase.outbox.bulkPut(parsed.sync.outbox);
      await this.accountDatabase.syncHeads.bulkPut(parsed.sync.heads);
      await this.accountDatabase.syncConflicts.bulkPut(parsed.sync.conflicts as SyncConflict[]);
      await this.accountDatabase.syncMeta.bulkPut(parsed.sync.meta);
      // Never reuse an old server cursor after a client restore.
      await this.accountDatabase.syncMeta.delete('cursor');
      await this.accountDatabase.syncMeta.put({ key: 'last-import-recovery', value: prior });
    });
    return preview;
  }
  async previewLegacy(): Promise<{ json: string; preview: BackupPreview; digest: string } | null> {
    if (!await Dexie.exists('408-user')) return null;
    const legacy = new Dexie('408-user');
    try {
      await legacy.open();
      return await legacy.transaction('r', legacy.tables, async () => {
        const tables = Object.fromEntries(await Promise.all(legacy.tables.map(async (table) => [table.name, await table.toArray()])));
        if (!Object.values(tables).some((rows) => (rows as unknown[]).length)) return null;
        const snapshot = sealRecoverySnapshot(legacy.verno, tables, new Date().toISOString());
        let json: string;
        if (legacy.verno < 4) json = JSON.stringify(snapshot);
        else {
          const { schemaVersion: _version, ...base } = recoveryBackupCandidate(snapshot);
          void _version;
          json = JSON.stringify({ ...base, schemaVersion: 4, data: { ...base.data,
            dailyPlans: tables.dailyPlans ?? [], reviewSessions: tables.reviewSessions ?? [], cardReviewEvents: tables.cardReviewEvents ?? [],
            personalCards: tables.personalCards ?? [], practiceEvidence: tables.practiceEvidence ?? [], practiceContexts: tables.practiceContexts ?? [], noteConflicts: tables.noteConflicts ?? [] } });
        }
        return { json, preview: super.preflight(json), digest: snapshot.sha256 };
      });
    } finally { legacy.close(); }
  }
}
