export const SYNC_KINDS = ['sessions', 'attempts', 'notes', 'collections', 'settings', 'versionedProgresses',
  'reviewSessions', 'cardReviewEvents', 'personalCards', 'practiceEvidence', 'practiceContexts', 'noteConflicts', 'mockExams'] as const;
export type SyncKind = (typeof SYNC_KINDS)[number];
export interface SyncChange { kind: SyncKind; entityId: string; baseRevision: number; value: unknown | null }
export interface SyncMutation { operationId: string; deviceId: string; createdAt: string; changes: SyncChange[] }
export interface SyncCursor { epoch: string; sequence: number }
export interface SyncEntity { kind: SyncKind | 'dailyPlans'; entityId: string; revision: number; value: unknown | null }
export interface SyncConflict {
  id: string; kind: SyncKind; entityId: string; local: unknown | null; remote: unknown | null;
  remoteRevision: number; createdAt: string; resolvedAt?: string;
}
export type SyncResult = { status: 'accepted'; entities: SyncEntity[] } | { status: 'conflict'; conflicts: SyncConflict[] };
export function syncEntityId(kind: SyncKind | 'dailyPlans', value: unknown): string {
  const row = value as Record<string, unknown>;
  if (kind === 'versionedProgresses') return JSON.stringify([row.questionId, row.questionContentVersion]);
  return String(kind === 'collections' ? row.questionId : kind === 'settings' ? row.key : kind === 'practiceContexts' ? row.sessionId : row.id);
}
