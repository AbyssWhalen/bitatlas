// @vitest-environment node
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { createApp } from './app';
import { SyncService } from './sync';
import type { Account } from './auth';
import type { SyncChange, SyncMutation } from '@408os/domain';
import { advanceReviewSession, type FlashcardDefinition, type ReviewSession } from '@408os/domain';

const servers: Array<ReturnType<typeof createApp>> = [];
afterEach(async () => { for (const item of servers.splice(0)) await item.app.close(); });
async function fixture() {
  const server = createApp({ database: ':memory:', files: path.resolve('output/server-implementation-2026-11-20/sync-files'), origin: 'http://127.0.0.1:4310' });
  servers.push(server);
  const admin = await server.auth.bootstrap('admin', 'test-only-password-408');
  const other: Account = { ...admin, id: randomUUID(), username: 'other', role: 'member' };
  server.db.prepare('INSERT INTO accounts(id,username,password_hash,role,created_at) VALUES (?,?,?,?,?)').run(other.id, other.username, 'test', other.role, new Date().toISOString());
  return { ...server, admin, other, sync: new SyncService(server.auth, server.content) };
}
const time = '2026-11-20T00:00:00.000Z';
const note = (body: string, baseRevision = 0): SyncChange => ({ kind: 'notes', entityId: 'note', baseRevision,
  value: { id: 'note', questionId: 'cn408-2009-q01', body, createdAt: time, updatedAt: time } });
const operation = (changes: SyncChange[]): SyncMutation => ({ operationId: randomUUID(), deviceId: randomUUID(), createdAt: time, changes });
describe('account sync contract', () => {
  it('is idempotent by account and operation and rejects reused IDs with changed payloads', async () => {
    const { sync, admin, other, db } = await fixture();
    const op = operation([note('original')]);
    const first = sync.push(admin, op);
    for (let repeat = 0; repeat < 30; repeat++) expect(sync.push(admin, op)).toEqual(first);
    expect(db.prepare('SELECT * FROM sync_events WHERE account_id=?').all(admin.id)).toHaveLength(1);
    expect(() => sync.push(admin, { ...op, changes: [note('changed')] })).toThrow('相同操作 ID');
    expect(sync.push(other, op).status).toBe('accepted');
    expect(db.prepare('SELECT * FROM entities').all()).toHaveLength(2);
  });
  it('retains both full note versions and every change in an atomic conflicting operation', async () => {
    const { sync, admin, db } = await fixture();
    sync.push(admin, operation([note('remote original')]));
    const result = sync.push(admin, operation([note('local original'), { ...note('second'), entityId: 'note2', value: { ...(note('').value as object), id: 'note2', body: 'second' } }]));
    expect(result.status).toBe('conflict');
    if (result.status !== 'conflict') throw new Error('Expected conflict');
    expect(result.conflicts).toHaveLength(2);
    expect(result.conflicts[0]).toMatchObject({ local: { body: 'local original' }, remote: { body: 'remote original' } });
    expect(db.prepare('SELECT * FROM entities').all()).toHaveLength(1);
    expect(db.prepare('SELECT * FROM conflicts').all()).toHaveLength(2);
  });
  it('detects concurrent new notes with different IDs for the same question', async () => {
    const { sync, admin, db } = await fixture();
    sync.push(admin, operation([note('first device')]));
    const result = sync.push(admin, operation([{ ...note('second device'), entityId: 'another-id',
      value: { ...(note('second device').value as object), id: 'another-id' } }]));
    expect(result.status).toBe('conflict');
    if (result.status === 'conflict') expect(result.conflicts[0]).toMatchObject({ entityId: 'note', local: { id: 'another-id', body: 'second device' }, remote: { id: 'note', body: 'first device' } });
    expect(db.prepare("SELECT * FROM entities WHERE kind='notes'").all()).toHaveLength(1);
  });
  it('rejects dangling attempts and commits session submission together with its immutable evidence', async () => {
    const { sync, admin, db } = await fixture();
    const session = { id: 's', mode: 'practice', questionIds: ['q'], questionContentVersions: { q: '1' }, currentIndex: 0, responses: { q: { type: 'choice', optionId: 'A' } }, submittedQuestionIds: ['q'], startedAt: time, updatedAt: time };
    const attempt = { id: 'a', sessionId: 's', questionId: 'q', questionContentVersion: '1', mode: 'practice', response: session.responses.q, correct: true, score: 1, durationMs: 10, startedAt: time, submittedAt: time };
    const change: SyncChange = { kind: 'attempts', entityId: 'a', baseRevision: 0, value: attempt };
    expect(() => sync.push(admin, operation([change]))).toThrow('一起保存');
    expect(db.prepare('SELECT * FROM operations').all()).toHaveLength(0);
    expect(sync.push(admin, operation([{ kind: 'sessions', entityId: 's', baseRevision: 0, value: session }, change])).status).toBe('accepted');
    expect(() => sync.push(admin, operation([{ ...change, baseRevision: 1, value: { ...attempt, correct: false } }]))).toThrow('原始作答');
    expect(db.prepare('SELECT * FROM entity_history').all()).toHaveLength(3);
  });
  it('scopes cursors to the account and requests reconciliation after a restore epoch', async () => {
    const { sync, auth, admin, other, app, db } = await fixture();
    sync.push(admin, operation([note('private')]));
    sync.push(other, operation([note('other private')]));
    const login = await auth.login({ username: 'admin', password: 'test-only-password-408' }, 'test');
    const cookie = login.cookie.split(';')[0]!;
    const first = (await app.inject({ url: '/api/v1/sync/pull', headers: { cookie } })).json();
    expect(first.reconcile).toBe(true);
    expect(first.entities).toHaveLength(1);
    expect(first.entities[0].value.body).toBe('private');
    db.prepare("UPDATE meta SET value=? WHERE key='sync_epoch'").run(randomUUID());
    const restored = (await app.inject({ url: `/api/v1/sync/pull?epoch=${first.cursor.epoch}&sequence=${first.cursor.sequence}`, headers: { cookie } })).json();
    expect(restored.reconcile).toBe(true);
    expect(restored.cursor.epoch).not.toBe(first.cursor.epoch);
  });
  it('replays every card event and rejects invented completion, wrong ordinal and rollback', async () => {
    const { sync, admin } = await fixture();
    const card: FlashcardDefinition = { id: 'card', version: '1', subject: 'data-structures', conceptIds: ['ds-list'],
      front: [{ type: 'text', text: '单链表如何插入？' }], back: [{ type: 'text', text: '先连接新结点，再修改前驱。' }], sources: [], reviewStatus: 'needs-review' };
    const initial: ReviewSession = { id: 'round', cards: [card], queue: ['card'], cursor: 0, completedCardIds: [], revision: 0, startedAt: time, updatedAt: time };
    const finished = advanceReviewSession(initial, 1, time).session;
    const event = { id: JSON.stringify(['round', 0]), sessionId: 'round', cardId: 'card', cardVersion: '1', rating: 1, ordinal: 1, queueIndex: 0, reviewedAt: time, activeDurationMs: 5 };
    const roundChange: SyncChange = { kind: 'reviewSessions', entityId: 'round', baseRevision: 0, value: finished };
    const eventChange: SyncChange = { kind: 'cardReviewEvents', entityId: event.id, baseRevision: 0, value: event };
    expect(() => sync.push(admin, operation([roundChange]))).toThrow('重试过程不一致');
    expect(() => sync.push(admin, operation([roundChange, { ...eventChange, value: { ...event, ordinal: 2 } }]))).toThrow('重试过程不一致');
    expect(sync.push(admin, operation([roundChange, eventChange])).status).toBe('accepted');
    expect(() => sync.push(admin, operation([{ ...roundChange, baseRevision: 1, value: initial }]))).toThrow('不能回退');
  });
});
