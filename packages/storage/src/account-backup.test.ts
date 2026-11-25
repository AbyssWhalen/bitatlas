import 'fake-indexeddb/auto';
import { afterEach, describe, expect, it } from 'vitest';
import { createStorage } from './index';
import { AccountBackupService } from './account-backup';
import { canonicalSerialize, sha256 } from '@408os/content-schema';
import { inspectLegacyDatabase, UserDatabase } from './index';

const stores: ReturnType<typeof createStorage>[] = [];
function fixture(accountId: string = crypto.randomUUID()) {
  const store = createStorage({ accountId, user: `v5:${crypto.randomUUID()}`, content: `v5-content:${crypto.randomUUID()}` });
  stores.push(store); return store;
}
afterEach(async () => { for (const store of stores.splice(0)) { await store.userDatabase.delete(); await store.contentDatabase.delete(); } });
describe('account backup v5', () => {
  it('round-trips account data and pending operations together, clears stale cursors and retains recovery', async () => {
    const store = fixture();
    const now = '2026-11-20T00:00:00.000Z';
    await store.annotationRepository.saveNote({ id: 'n', questionId: 'q', body: '完整笔记', createdAt: now, updatedAt: now }, null);
    await store.userDatabase.syncMeta.put({ key: 'cursor', value: { epoch: 'before', sequence: 50 } });
    const json = await store.backupService.exportJson('test');
    const data = JSON.parse(json);
    expect(data.schemaVersion).toBe(5);
    expect(data.sync.outbox).toHaveLength(1);
    const target = fixture(store.userDatabase.accountId!);
    expect(target.backupService.preflight(json).schemaVersion).toBe(5);
    await target.backupService.importJson(json, 'replace');
    expect(await target.annotationRepository.listNotes()).toEqual(await store.annotationRepository.listNotes());
    expect(await target.syncRepository.pending()).toEqual(await store.syncRepository.pending());
    expect(await target.syncRepository.cursor()).toBeNull();
    expect(await target.userDatabase.syncMeta.get('last-import-recovery')).toBeDefined();
  });
  it('refuses other accounts, corrupted digests and invalid embedded outbox data without changing local notes', async () => {
    const store = fixture();
    await store.annotationRepository.saveNote({ id: 'n', questionId: 'q', body: 'original', createdAt: '2026-11-20T00:00:00.000Z', updatedAt: '2026-11-20T00:00:00.000Z' }, null);
    const json = await store.backupService.exportJson('test');
    expect(() => fixture().backupService.preflight(json)).toThrow('另一个账号');
    const broken = JSON.parse(json); broken.data.notes[0].body = 'tampered';
    await expect(store.backupService.importJson(JSON.stringify(broken), 'replace')).rejects.toThrow('摘要');
    broken.sync.outbox[0].mutation.changes[0].value = { invalid: true };
    const { sha256: _hash, ...body } = broken; void _hash;
    broken.sha256 = sha256(canonicalSerialize(body));
    await expect(store.backupService.importJson(JSON.stringify(broken), 'replace')).rejects.toThrow();
    expect((await store.annotationRepository.listNotes())[0]!.body).toBe('original');
  });
  it('accepts a valid v4 backup only through explicit account assignment and queues the import', async () => {
    const legacy = createStorage({ user: `legacy:${crypto.randomUUID()}`, content: `legacy-content:${crypto.randomUUID()}` });
    stores.push(legacy);
    await legacy.annotationRepository.saveNote({ id: 'n', questionId: 'q', body: 'legacy', createdAt: '2026-11-20T00:00:00.000Z', updatedAt: '2026-11-20T00:00:00.000Z' }, null);
    const json = await legacy.backupService.exportJson('test');
    const store = fixture();
    expect(store.backupService).toBeInstanceOf(AccountBackupService);
    expect(await store.annotationRepository.listNotes()).toEqual([]);
    await store.backupService.importJson(json, 'merge');
    expect((await store.syncRepository.pending())[0]!.mutation.changes).toMatchObject([{ kind: 'notes', value: { body: 'legacy' } }]);
    expect((await legacy.annotationRepository.listNotes())[0]!.body).toBe('legacy');
  });
  it('preserves an account v4 snapshot before upgrade and rolls back the entire v5 upgrade on failure', async () => {
    const name = `upgrade:${crypto.randomUUID()}`;
    const old = new UserDatabase(name);
    const note = { id: 'n', questionId: 'q', body: 'before upgrade', createdAt: '2026-11-20T00:00:00.000Z', updatedAt: '2026-11-20T00:00:00.000Z' };
    await old.notes.put(note); old.close();
    const snapshot = await inspectLegacyDatabase(name, 5);
    expect(snapshot?.databaseVersion).toBe(4);
    const broken = new UserDatabase(name, crypto.randomUUID());
    broken.version(5).upgrade(() => { throw new Error('upgrade interrupted'); });
    await expect(broken.open()).rejects.toThrow('upgrade interrupted');
    broken.close();
    expect((await inspectLegacyDatabase(name, 5))?.tables.notes).toEqual([note]);
    const store = createStorage({ user: name, accountId: crypto.randomUUID(), content: `upgrade-content:${crypto.randomUUID()}` });
    stores.push(store);
    await store.userDatabase.open();
    expect(await store.userDatabase.syncMeta.get('v5-upgrade-recovery')).toBeDefined();
    expect((await store.annotationRepository.listNotes())[0]).toEqual(note);
    expect(store.backupService.preflight(JSON.stringify(snapshot)).counts.notes).toBe(1);
  });
  it('replaces local data from a v4 snapshot without deleting server evidence and archives the previous state', async () => {
    const store = fixture();
    await store.annotationRepository.saveNote({ id: 'recent', questionId: 'q', body: 'new local original', createdAt: '2026-11-20T00:00:00.000Z', updatedAt: '2026-11-20T00:00:00.000Z' }, null);
    const legacy = createStorage({ user: `legacy:${crypto.randomUUID()}`, content: `legacy-content:${crypto.randomUUID()}` }); stores.push(legacy);
    await legacy.annotationRepository.saveNote({ id: 'old', questionId: 'old-q', body: 'old imported original', createdAt: '2026-11-20T00:00:00.000Z', updatedAt: '2026-11-20T00:00:00.000Z' }, null);
    await store.backupService.importJson(await legacy.backupService.exportJson('test'), 'replace');
    expect((await store.annotationRepository.listNotes())[0]?.id).toBe('old');
    const snapshot = (await store.userDatabase.syncMeta.get('last-import-recovery'))?.value as { tables: { notes: Array<{ body: string }> } };
    expect(snapshot.tables.notes[0]?.body).toBe('new local original');
    expect((await store.syncRepository.pending()).flatMap((op) => op.mutation.changes).every((change) => change.value !== null)).toBe(true);
    expect(store.backupService.preflight(await store.backupService.exportJson('test')).schemaVersion).toBe(5);
  });
});
