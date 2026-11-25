import 'fake-indexeddb/auto';
import { afterEach, describe, expect, it } from 'vitest';
import { createStorage } from './index';
import { partitionSyncChanges } from './sync-schema';
import type { SyncChange } from '@408os/domain';
const stores: ReturnType<typeof createStorage>[] = [];
function fixture() {
  const accountId = crypto.randomUUID();
  const store = createStorage({ accountId, user: `account-test:${accountId}`, content: `content-test:${accountId}` });
  stores.push(store); return store;
}
afterEach(async () => { for (const store of stores.splice(0)) { await store.userDatabase.delete(); await store.contentDatabase.delete(); } });
const now = '2026-11-20T00:00:00.000Z';
describe('transactional account outbox', () => {
  it('stores a note and complete sync payload together; failed writes produce neither', async () => {
    const store = fixture();
    const note = { id: 'note', questionId: 'q', body: '完整原文', createdAt: now, updatedAt: now };
    await store.annotationRepository.saveNote(note, null);
    expect((await store.syncRepository.pending())[0]!.mutation.changes).toMatchObject([{ kind: 'notes', entityId: 'note', baseRevision: 0, value: note }]);
    await expect(store.write(async () => {
      await store.annotationRepository.saveNote({ ...note, id: 'another', questionId: 'other' }, null);
      throw new Error('模拟中断');
    })).rejects.toThrow('模拟中断');
    expect(await store.annotationRepository.getNote('other')).toBeUndefined();
    expect(await store.syncRepository.pending()).toHaveLength(1);
  });
  it('commits associated session and attempt in one operation and isolates accounts', async () => {
    const store = fixture();
    const other = fixture();
    const session = { id: 's', mode: 'practice' as const, questionIds: ['q'], questionContentVersions: { q: '1' }, currentIndex: 0, responses: {}, submittedQuestionIds: [], startedAt: now, updatedAt: now };
    await store.studyRepository.saveSession(session, null);
    const response = { type: 'choice' as const, optionId: 'A' as const };
    const later = '2026-11-20T00:00:01.000Z';
    await store.studyRepository.submitAttempt({ id: 'a', sessionId: 's', questionId: 'q', questionContentVersion: '1', mode: 'practice', response, correct: true, score: 1, startedAt: now, submittedAt: later, durationMs: 1000 },
      { ...session, responses: { q: response }, submittedQuestionIds: ['q'], updatedAt: later }, now);
    const pending = await store.syncRepository.pending();
    expect(pending).toHaveLength(2);
    expect(pending[1]!.mutation.changes.map((change) => change.kind)).toEqual(expect.arrayContaining(['attempts', 'sessions']));
    expect(await other.studyRepository.listAttempts()).toEqual([]);
    expect(await other.syncRepository.pending()).toEqual([]);
    store.syncRepository.lock();
    await expect(store.annotationRepository.setCollected('q', true, later)).rejects.toThrow('已锁定');
  });
  it('preserves newer local edits during acknowledgement and rollback reconciliation', async () => {
    const store = fixture();
    const note = { id: 'note', questionId: 'q', body: 'first', createdAt: now, updatedAt: now };
    await store.annotationRepository.saveNote(note, null);
    await store.annotationRepository.saveNote({ ...note, body: 'second', updatedAt: '2026-11-20T00:00:01.000Z' }, now);
    const first = (await store.syncRepository.pending())[0]!;
    await store.syncRepository.acknowledge(first.operationId, { status: 'accepted', entities: [{ kind: 'notes', entityId: note.id, revision: 1, value: note }] });
    expect((await store.annotationRepository.getNote('q'))?.body).toBe('second');
    await store.syncRepository.pull({ reconcile: true, cursor: { epoch: 'new', sequence: 0 }, entities: [], more: false });
    expect((await store.annotationRepository.getNote('q'))?.body).toBe('second');
    expect(await store.syncRepository.pending()).toHaveLength(1);
  });
  it('partitions large recovery data without splitting submitted sessions from attempts', async () => {
    const store = fixture();
    const rows = Array.from({ length: 2105 }, (_, index) => ({ id: `n${index}`, questionId: `q${index}`, body: `original ${index}`, createdAt: now, updatedAt: now }));
    await store.userDatabase.notes.bulkPut(rows);
    await store.syncRepository.pull({ reconcile: true, cursor: { epoch: 'restored', sequence: 0 }, entities: [], more: false });
    const operations = await store.syncRepository.pending();
    expect(operations).toHaveLength(3);
    expect(operations.flatMap((op) => op.mutation.changes).map((change) => change.value)).toEqual(rows.sort((a, b) => a.id.localeCompare(b.id)));
    const changes: SyncChange[] = Array.from({ length: 998 }, (_, index) => ({ kind: 'notes', entityId: `n${index}`, baseRevision: 0, value: {} }));
    changes.push({ kind: 'sessions', entityId: 'round', baseRevision: 0, value: {} });
    changes.push(...Array.from({ length: 47 }, (_, index): SyncChange => ({ kind: 'attempts', entityId: `a${index}`, baseRevision: 0, value: { sessionId: 'round' } })));
    const batch = partitionSyncChanges(changes).find((items) => items.some((item) => item.kind === 'sessions'))!;
    expect(batch.filter((item) => item.kind === 'attempts')).toHaveLength(47);
    expect(partitionSyncChanges(changes).every((items) => items.length <= 1000)).toBe(true);
  });
  it('rebases dependent pending revisions when an accepted no-op does not increment the server head', async () => {
    const store = fixture();
    const note = { id: 'n', questionId: 'q', body: 'first', createdAt: now, updatedAt: now };
    await store.annotationRepository.saveNote(note, null);
    await store.annotationRepository.saveNote({ ...note, body: 'next', updatedAt: '2026-11-20T00:00:01.000Z' }, now);
    const [first, second] = await store.syncRepository.pending();
    await store.syncRepository.acknowledge(first!.operationId, { status: 'accepted', entities: [{ kind: 'notes', entityId: 'n', revision: 4, value: note }] });
    expect((await store.syncRepository.getPending(second!.operationId))?.mutation.changes[0]?.baseRevision).toBe(4);
    expect((await store.annotationRepository.getNote('q'))?.body).toBe('next');
  });
  it('preserves a merged note and the complete rejected operations while allowing later edits', async () => {
    const store = fixture();
    const note = { id: 'n', questionId: 'q', body: 'local', createdAt: now, updatedAt: now };
    await store.annotationRepository.saveNote(note, null);
    const op = (await store.syncRepository.pending())[0]!;
    await store.syncRepository.acknowledge(op.operationId, { status: 'conflict', conflicts: [{ id: 'c', kind: 'notes', entityId: 'n', local: note, remote: { ...note, body: 'remote' }, remoteRevision: 3, createdAt: now }] });
    await store.syncRepository.resolveTextConflict('c', 'local + remote');
    const merged = (await store.syncRepository.pending())[0]!;
    expect(merged.mutation.changes[0]?.baseRevision).toBe(3);
    const value = merged.mutation.changes[0]!.value;
    await store.syncRepository.acknowledge(merged.operationId, { status: 'accepted', entities: [{ kind: 'notes', entityId: 'n', revision: 4, value }] });
    expect(await store.syncRepository.pending()).toHaveLength(0);
    expect((await store.annotationRepository.getNote('q'))?.body).toBe('local + remote');
    expect(await store.userDatabase.syncMeta.get(`resolved-operation:${op.operationId}`)).toBeDefined();
    expect(store.backupService.preflight(await store.backupService.exportJson('test')).schemaVersion).toBe(5);
  });
  it.each([false, true])('keeps same-question notes with different IDs exportable during pull (reconcile=%s)', async (reconcile) => {
    const store = fixture();
    const local = { id: 'local-note', questionId: 'q', body: '本机尚未同步原文', createdAt: now, updatedAt: now };
    const remote = { ...local, id: 'server-note', body: '另一设备原文' };
    await store.annotationRepository.saveNote(local, null);
    await store.syncRepository.pull({ reconcile, cursor: { epoch: 'remote', sequence: 1 }, more: false,
      entities: [{ kind: 'notes', entityId: remote.id, revision: 1, value: remote }] });
    expect(await store.userDatabase.notes.toArray()).toEqual([local]);
    const conflicts = (await store.syncRepository.status()).conflicts;
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0]).toMatchObject({ entityId: remote.id, local, remote, remoteRevision: 1 });
    expect(await store.syncRepository.pending()).toHaveLength(0);
    const json = await store.backupService.exportJson('test');
    expect(store.backupService.preflight(json).schemaVersion).toBe(5);
    await store.backupService.importJson(json, 'replace');
    expect((await store.syncRepository.status()).conflicts[0]).toMatchObject({ local, remote });
    await store.syncRepository.resolveTextConflict(conflicts[0]!.id, '本机尚未同步原文 + 另一设备原文');
    expect(await store.userDatabase.notes.toArray()).toEqual([{ ...remote, body: '本机尚未同步原文 + 另一设备原文', updatedAt: expect.any(String) }]);
    expect((await store.syncRepository.pending())[0]!.mutation.changes).toMatchObject([{ entityId: remote.id, baseRevision: 1 }]);
  });
  it('retains a conflicting practice as an independent copy with original attempt evidence', async () => {
    const store = fixture();
    const response = { type: 'choice' as const, optionId: 'A' as const };
    const session = { id: 's', mode: 'practice' as const, questionIds: ['q'], questionContentVersions: { q: '1' }, currentIndex: 0, responses: { q: response },
      submittedQuestionIds: ['q'], startedAt: now, updatedAt: now };
    const attempt = { id: 'a', sessionId: 's', questionId: 'q', questionContentVersion: '1', mode: 'practice' as const, response, correct: true, score: 1, startedAt: now, submittedAt: now, durationMs: 0 };
    await store.write(async () => { await store.userDatabase.sessions.put(session); await store.userDatabase.attempts.put(attempt); });
    const remote = { ...session, responses: {}, submittedQuestionIds: [] };
    const op = (await store.syncRepository.pending())[0]!;
    await store.syncRepository.acknowledge(op.operationId, { status: 'conflict', conflicts: [{ id: 'c', kind: 'sessions', entityId: 's', local: session, remote, remoteRevision: 1, createdAt: now }] });
    const copy = await store.syncRepository.retainRoundCopy('c', [{ kind: 'sessions', entityId: 's', revision: 1, value: remote }]);
    expect(await store.userDatabase.sessions.get('s')).toEqual(remote);
    const kept = (await store.studyRepository.listAttempts())[0]!;
    expect(kept).toMatchObject({ ...attempt, id: kept.id, sessionId: copy });
    expect(kept.id).not.toBe('a');
    expect((await store.syncRepository.pending())[0]!.mutation.changes.map((entry) => entry.kind)).toEqual(expect.arrayContaining(['sessions', 'attempts']));
    expect(store.backupService.preflight(await store.backupService.exportJson('test')).schemaVersion).toBe(5);
  });
});
