import Dexie from 'dexie';
import { canonicalSerialize, sha256 } from '@408os/content-schema';

export interface RecoverySnapshot {
  format: 'bitatlas-recovery-v1';
  databaseVersion: number;
  createdAt: string;
  tables: Record<string, unknown[]>;
  sha256: string;
}

export function sealRecoverySnapshot(databaseVersion: number, tables: Record<string, unknown[]>, createdAt: string): RecoverySnapshot {
  const body = { format: 'bitatlas-recovery-v1' as const, databaseVersion, createdAt, tables };
  return { ...body, sha256: sha256(canonicalSerialize(body)) };
}

export function parseRecoverySnapshot(json: string): RecoverySnapshot {
  const snapshot = JSON.parse(json) as RecoverySnapshot;
  if (snapshot.format !== 'bitatlas-recovery-v1' || ![1, 2, 3, 4].includes(snapshot.databaseVersion)
    || !snapshot.tables || Object.values(snapshot.tables).some((rows) => !Array.isArray(rows))) throw new Error('无效的升级前恢复快照');
  const { sha256: digest, ...body } = snapshot;
  if (digest !== sha256(canonicalSerialize(body))) throw new Error('恢复快照摘要不匹配');
  return snapshot;
}

/** Open dynamically: defining a new version here would upgrade before backup. */
export async function inspectLegacyDatabase(name = '408-user', targetVersion = 4): Promise<RecoverySnapshot | null> {
  if (!await Dexie.exists(name)) return null;
  const database = new Dexie(name);
  try {
    await database.open();
    if (database.verno >= targetVersion) return null;
    return await database.transaction('r', database.tables, async () => {
      const tables: Record<string, unknown[]> = Object.fromEntries(await Promise.all(database.tables.map(async (table) => [table.name, await table.toArray()] as const)));
      if (Object.values(tables).every((rows) => rows.length === 0)) return null;
      return sealRecoverySnapshot(database.verno, tables, new Date().toISOString());
    });
  } finally { database.close(); }
}

export function recoveryBackupCandidate(snapshot: RecoverySnapshot) {
  const rows = (name: string) => snapshot.tables[name] ?? [];
  const data = {
    attempts: rows('attempts'), sessions: rows('sessions'),
    progresses: rows(snapshot.databaseVersion === 1 ? 'progresses' : 'versionedProgresses'),
    notes: rows('notes'), collections: rows('collections'), settings: rows('settings'),
    ...(snapshot.databaseVersion >= 2 ? { legacyProgresses: rows('progresses') } : {}),
    ...(snapshot.databaseVersion >= 3 ? { mockExams: rows('mockExams') } : {}),
    ...(snapshot.databaseVersion >= 4 ? {
      dailyPlans: rows('dailyPlans'), reviewSessions: rows('reviewSessions'), cardReviewEvents: rows('cardReviewEvents'),
      personalCards: rows('personalCards'), practiceEvidence: rows('practiceEvidence'), practiceContexts: rows('practiceContexts'), noteConflicts: rows('noteConflicts'),
    } : {}),
  };
  return { schemaVersion: snapshot.databaseVersion, exportedAt: snapshot.createdAt, appVersion: 'pre-v4-recovery', data };
}
