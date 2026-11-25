import { z } from 'zod';
import { SYNC_KINDS, syncEntityId, type SyncMutation } from '@408os/domain';
import { attemptSchema, collectionSchema, mockExamSchema, noteSchema, settingSchema, versionedProgressSchema, versionedSessionSchema } from './backup';
import { cardReviewEventSchema, noteConflictSchema, personalCardSchema, practiceContextSchema, practiceEvidenceSchema, reviewSessionSchema } from './learning-schema';

export const syncPayloadSchemas = {
  attempts: attemptSchema, sessions: versionedSessionSchema, notes: noteSchema, collections: collectionSchema, settings: settingSchema,
  versionedProgresses: versionedProgressSchema, mockExams: mockExamSchema,
  reviewSessions: reviewSessionSchema, cardReviewEvents: cardReviewEventSchema, personalCards: personalCardSchema,
  practiceEvidence: practiceEvidenceSchema, practiceContexts: practiceContextSchema, noteConflicts: noteConflictSchema,
};
const id = z.string().min(1).max(500);
export const syncMutationSchema = z.object({
  operationId: z.uuid(), deviceId: z.uuid(), createdAt: z.iso.datetime(),
  changes: z.array(z.object({ kind: z.enum(SYNC_KINDS), entityId: id, baseRevision: z.int().nonnegative(), value: z.unknown() }).strict()).min(1).max(1000),
}).strict().superRefine((operation, context) => {
  const keys = new Set<string>();
  for (const [index, change] of operation.changes.entries()) {
    const key = JSON.stringify([change.kind, change.entityId]);
    if (keys.has(key)) context.addIssue({ code: 'custom', path: ['changes', index], message: '同步变更重复。' });
    keys.add(key);
    if (change.value === null) {
      if (['attempts', 'cardReviewEvents'].includes(change.kind)) context.addIssue({ code: 'custom', path: ['changes', index], message: '原始作答与评分事件不可删除。' });
      continue;
    }
    const value = syncPayloadSchemas[change.kind].safeParse(change.value);
    if (!value.success || syncEntityId(change.kind, value.data) !== change.entityId) context.addIssue({ code: 'custom', path: ['changes', index], message: '同步数据格式或标识不符。' });
    if (change.kind === 'settings' && /^(migration\.|sync\.|account\.)/.test(change.entityId)) context.addIssue({ code: 'custom', path: ['changes', index], message: '设备内部设置不可同步。' });
  }
});
export function parseSyncMutation(input: unknown): SyncMutation { return syncMutationSchema.parse(input) as SyncMutation; }

/** Keep a round and its immutable evidence together while bounding import/recovery requests. */
export function partitionSyncChanges(changes: SyncMutation['changes']): SyncMutation['changes'][] {
  const grouped = new Map<string, SyncMutation['changes']>();
  for (const change of changes) {
    const value = change.value as { sessionId?: string } | null;
    const key = change.kind === 'sessions' ? `practice:${change.entityId}`
      : change.kind === 'attempts' || change.kind === 'mockExams' ? `practice:${value?.sessionId}`
      : change.kind === 'reviewSessions' ? `review:${change.entityId}`
      : change.kind === 'cardReviewEvents' ? `review:${value?.sessionId}` : `other:${change.kind}:${change.entityId}`;
    grouped.set(key, [...(grouped.get(key) ?? []), change]);
  }
  const groups = [...grouped].sort(([a], [b]) => Number(a.startsWith('other:')) - Number(b.startsWith('other:')));
  const batches: SyncMutation['changes'][] = [];
  let batch: SyncMutation['changes'] = [];
  let bytes = 0;
  for (const [, group] of groups) {
    const size = new TextEncoder().encode(JSON.stringify(group)).length;
    if (group.length > 1000 || size > 6 * 1024 * 1024) throw new Error('单轮记录超过同步上限，已保留原记录，请导出备份后分批处理。');
    if (batch.length + group.length > 1000 || bytes + size > 6 * 1024 * 1024) { batches.push(batch); batch = []; bytes = 0; }
    batch.push(...group); bytes += size;
  }
  if (batch.length) batches.push(batch);
  return batches;
}
