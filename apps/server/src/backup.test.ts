// @vitest-environment node
import { describe, expect, it } from 'vitest';
import path from 'node:path';
import { finalizeRestoredDatabase, retentionCandidates } from './backup';
import { openDatabase } from './database';

function restoreFixture() {
  const database = openDatabase(':memory:');
  const hash = 'a'.repeat(64);
  database.prepare('INSERT INTO accounts(id,username,password_hash,role,created_at) VALUES (?,?,?,?,?)')
    .run('admin', 'admin', 'disposable-test-hash', 'admin', '2026-11-20T00:00:00.000Z');
  database.prepare('INSERT INTO auth_sessions VALUES (?,?,?,?)').run('session', 'admin', 1, 2);
  database.prepare('INSERT INTO invitations(token_hash,created_by,role,expires_at) VALUES (?,?,?,?)').run('invite', 'admin', 'member', 2);
  database.prepare('INSERT INTO files VALUES (?,?,?,?,?,?,?,?,?)')
    .run('pdf', '测试.pdf', hash, 16, 'application/pdf', 'admin', '2026-11-20T00:00:00.000Z', 1, 'objects\\old-host-path');
  for (const state of ['open', 'complete']) {
    database.prepare('INSERT INTO uploads VALUES (?,?,?,?,?,?,?,?,?)')
      .run(state, '测试.pdf', hash, 16, 'application/pdf', 'admin', '2026-11-20T00:00:00.000Z', state, state === 'complete' ? 'pdf' : null);
    database.prepare('INSERT INTO upload_chunks VALUES (?,?,?,?)').run(state, 0, hash, 16);
  }
  return { database, objects: [{ path: `files/objects/${hash}`, sha256: hash, bytes: 16 }] };
}

describe('restored server database validation', () => {
  it('rotates epoch, revokes access, normalizes object paths and resets only unfinished upload chunks', () => {
    const { database, objects } = restoreFixture();
    try {
      const previous = database.prepare("SELECT value FROM meta WHERE key='sync_epoch'").get();
      const epoch = finalizeRestoredDatabase(database, objects);
      expect(database.prepare("SELECT value FROM meta WHERE key='sync_epoch'").get()).toEqual({ value: epoch });
      expect({ value: epoch }).not.toEqual(previous);
      expect(database.prepare('SELECT * FROM auth_sessions').all()).toEqual([]);
      expect(database.prepare('SELECT revoked FROM invitations').get()).toEqual({ revoked: 1 });
      expect(database.prepare('SELECT relative_path FROM files').get()).toEqual({ relative_path: path.join('objects', objects[0]!.sha256) });
      expect(database.prepare('SELECT upload_id FROM upload_chunks').all()).toEqual([{ upload_id: 'complete' }]);
    } finally { database.close(); }
  });
  it('rejects missing, extra and length-mismatched objects before changing the database', () => {
    const { database, objects } = restoreFixture();
    try {
      const epoch = database.prepare("SELECT value FROM meta WHERE key='sync_epoch'").get();
      const extraHash = 'b'.repeat(64);
      for (const input of [[], [{ ...objects[0]!, bytes: 17 }], [...objects, { path: `files/objects/${extraHash}`, sha256: extraHash, bytes: 4 }]]) {
        expect(() => finalizeRestoredDatabase(database, input)).toThrow('数据库与资料清单不一致');
        expect(database.prepare("SELECT value FROM meta WHERE key='sync_epoch'").get()).toEqual(epoch);
        expect(database.prepare('SELECT token_hash FROM auth_sessions').all()).toHaveLength(1);
      }
    } finally { database.close(); }
  });
  it('rejects duplicate digests and object names inconsistent with their digest', () => {
    const { database, objects } = restoreFixture();
    try {
      expect(() => finalizeRestoredDatabase(database, [...objects, ...objects])).toThrow('重复摘要');
      expect(() => finalizeRestoredDatabase(database, [{ ...objects[0]!, path: `files/objects/${'b'.repeat(64)}` }])).toThrow('不匹配的对象路径');
    } finally { database.close(); }
  });
  it('rolls back revocation, cursor rotation and upload reset if finalization is interrupted', () => {
    const { database, objects } = restoreFixture();
    try {
      const previous = database.prepare("SELECT value FROM meta WHERE key='sync_epoch'").get();
      database.exec("CREATE TRIGGER interrupt_restore BEFORE UPDATE ON files BEGIN SELECT RAISE(ABORT, 'injected interruption'); END");
      expect(() => finalizeRestoredDatabase(database, objects)).toThrow('injected interruption');
      expect(database.prepare("SELECT value FROM meta WHERE key='sync_epoch'").get()).toEqual(previous);
      expect(database.prepare('SELECT token_hash FROM auth_sessions').all()).toHaveLength(1);
      expect(database.prepare('SELECT revoked FROM invitations').get()).toEqual({ revoked: 0 });
      expect(database.prepare('SELECT upload_id FROM upload_chunks').all()).toHaveLength(2);
    } finally { database.close(); }
  });
});
describe('backup retention planning', () => {
  it('keeps seven distinct days and four distinct weeks without deleting files', () => {
    const records = Array.from({ length: 60 }, (_, index) => ({
      id: `snapshot-${index}`, createdAt: new Date(Date.UTC(2026, 10, 20) - index * 86400000).toISOString(),
    }));
    const plan = retentionCandidates(records);
    expect(plan.deletesFiles).toBe(false);
    expect(plan.keep.slice(0, 7).map((entry) => entry.id)).toEqual(records.slice(0, 7).map((entry) => entry.id));
    expect(plan.keep.length).toBeGreaterThanOrEqual(7);
    expect(plan.keep.length + plan.candidates.length).toBe(60);
    expect(new Set([...plan.keep, ...plan.candidates].map((entry) => entry.id)).size).toBe(60);
    expect(retentionCandidates([...records].reverse())).toEqual(plan);
  });
});
