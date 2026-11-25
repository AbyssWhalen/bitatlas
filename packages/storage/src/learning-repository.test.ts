import 'fake-indexeddb/auto';
import Dexie from 'dexie';
import { afterEach, describe, expect, it } from 'vitest';
import { createStudySession, effectiveCards, practiceEvidenceId, replayCardSchedule, type FlashcardDefinition, type Note, type Attempt } from '@408os/domain';
import { createStorage, inspectLegacyDatabase } from './index';

const now = '2026-11-20T02:00:00.000Z';
const card: FlashcardDefinition = {
  id: 'card', version: '1', subject: 'data-structures', conceptIds: ['ds-list'],
  front: [{ type: 'text', text: '单链表已知前驱时插入的时间复杂度？' }],
  back: [{ type: 'text', text: '只修改相邻指针，为 O(1)；定位前驱可能为 O(n)。' }],
  sources: [], reviewStatus: 'needs-review',
};
const opened: ReturnType<typeof createStorage>[] = [];
const legacy: Dexie[] = [];
function setup(user = `learning-user-${crypto.randomUUID()}`) {
  const store = createStorage({ user, content: `learning-content-${crypto.randomUUID()}` });
  opened.push(store); return store;
}
afterEach(async () => {
  for (const db of legacy.splice(0)) db.close();
  for (const store of opened.splice(0)) { await store.userDatabase.delete(); await store.contentDatabase.delete(); }
});
function note(id: string, body = id): Note { return { id, questionId: 'cn408-2009-q01', body, createdAt: now, updatedAt: now }; }
async function oldDatabase(version: number) {
  const db = new Dexie(`learning-old-${crypto.randomUUID()}`);
  db.version(1).stores({
    attempts: 'id, questionId, sessionId, submittedAt, correct', sessions: 'id, mode, updatedAt, completedAt',
    progresses: 'questionId, mastery, lastCorrect, lastAttemptAt, nextReviewAt',
    notes: 'id, questionId, updatedAt', collections: 'questionId, createdAt', settings: 'key',
    changeLog: 'id, [entityType+entityId], changedAt',
  });
  if (version >= 2) db.version(2).stores({ versionedProgresses: '[questionId+questionContentVersion], questionId, questionContentVersion, mastery, lastCorrect, lastAttemptAt, nextReviewAt' });
  if (version >= 3) db.version(3).stores({ mockExams: 'id, &sessionId, status, updatedAt, submittedAt' });
  await db.open(); legacy.push(db); return db;
}

describe('learning storage and migration contracts', () => {
  it('preserves spacing through pause/resume and freezes a personal copy without overwriting later edits', async () => {
    const store = setup();
    const round = await store.reviewRepository.createSession([card], now);
    await store.reviewRepository.rateCard(round.id, 0, 1, 30, now);
    const paused = { ...card, baseCardId: card.id, suspended: true, revision: 1, updatedAt: now };
    await store.reviewRepository.savePersonalCard(paused, 0);
    expect(effectiveCards([card], await store.reviewRepository.listPersonalCards())).toHaveLength(0);
    const resumed = { ...paused, suspended: false, revision: 2 };
    await store.reviewRepository.savePersonalCard(resumed, 1);
    const cards = effectiveCards([card], await store.reviewRepository.listPersonalCards());
    expect(cards).toHaveLength(1);
    expect(replayCardSchedule(await store.reviewRepository.listEvents())[0]).toMatchObject({ cardId: cards[0]!.id, cardVersion: cards[0]!.version });
    const personalRound = await store.reviewRepository.createSession(cards, now);
    await store.reviewRepository.savePersonalCard({ ...resumed, version: 'personal:3', revision: 3, front: [{ type: 'text', text: '个人修改的问题' }] }, 2);
    expect((await store.reviewRepository.getSession(personalRound.id))?.cards[0]?.front).toEqual(card.front);
    expect(store.backupService.preflight(await store.backupService.exportJson('test')).counts.personalCards).toBe(1);
  });
  it('checkpoints foreground time atomically, prevents forged evidence and rolls failed submissions back', async () => {
    const store = setup();
    const q = { id: 'question', contentVersion: '1' };
    const session = createStudySession('practice', [q], 'practice', now);
    await store.studyRepository.saveSession(session, null);
    await store.reviewRepository.initializePracticeEvidence(session.id, now);
    await Promise.all([100, 250, 120].map((time) => store.reviewRepository.checkpointPracticeTime(session.id, q.id, time)));
    const proof = (await store.reviewRepository.getPracticeEvidence(session.id, q.id))!;
    expect(proof.activeDurationMs).toBe(250);
    const submittedAt = '2026-11-20T02:00:01.000Z';
    const attempt: Attempt = { id: 'answer', sessionId: session.id, questionId: q.id, questionContentVersion: '1', mode: 'practice',
      response: { type: 'choice', optionId: 'A' }, correct: false, score: 0, startedAt: now, submittedAt, durationMs: 250 };
    const next = { ...session, responses: { [q.id]: attempt.response }, submittedQuestionIds: [q.id], updatedAt: submittedAt };
    const evidence = { ...proof, attemptId: attempt.id, firstResponse: attempt.response, revision: proof.revision + 1, updatedAt: submittedAt };
    const fail = () => { throw new Error('storage full'); };
    store.userDatabase.attempts.hook('creating', fail);
    await expect(store.studyRepository.submitAttempt(attempt, next, now, evidence)).rejects.toThrow('storage full');
    expect(await store.reviewRepository.getPracticeEvidence(session.id, q.id)).toEqual(proof);
    expect(await store.userDatabase.attempts.count()).toBe(0);
    store.userDatabase.attempts.hook('creating').unsubscribe(fail);
    await store.studyRepository.submitAttempt(attempt, next, now, evidence);
    await store.studyRepository.submitAttempt(attempt, next, now, evidence);
    expect(await store.userDatabase.attempts.count()).toBe(1);
    await store.reviewRepository.checkpointPracticeTime(session.id, q.id, 999);
    expect((await store.reviewRepository.getPracticeEvidence(session.id, q.id))?.activeDurationMs).toBe(250);
    const old = createStudySession('legacy', [q], 'practice', now);
    await store.studyRepository.saveSession(old, null);
    await expect(store.reviewRepository.savePracticeEvidence({ ...proof, id: practiceEvidenceId(old.id, q.id), sessionId: old.id, revision: 1 }, 0)).rejects.toThrow('不能补造');
    expect(store.backupService.preflight(await store.backupService.exportJson('test')).counts.practiceEvidence).toBe(1);
  });
  it.each(['event-id', 'limits', 'dangling-event'])('rejects %s corruption before replacing anything', async (kind) => {
    const store = setup();
    const round = await store.reviewRepository.createSession([card], now);
    await store.reviewRepository.rateCard(round.id, 0, 1, 20, now);
    const original = await store.backupService.exportJson('test');
    const changed = JSON.parse(original);
    if (kind === 'event-id') changed.data.cardReviewEvents[0].id = 'arbitrary';
    if (kind === 'limits') changed.data.settings.push({ key: 'review.limits', value: { effectiveOn: 'yesterday', next: {} } });
    if (kind === 'dangling-event') changed.data.cardReviewEvents[0].sessionId = 'missing';
    await expect(store.backupService.importJson(JSON.stringify(changed), 'replace')).rejects.toThrow();
    expect((await store.reviewRepository.listEvents())[0]?.sessionId).toBe(round.id);
  });
  it.each([1, 2, 3])('captures v%i without upgrading and retains all duplicate originals in v4', async (version) => {
    const db = await oldDatabase(version);
    await db.table('notes').bulkPut([note('first', '原文一'), note('second', '原文二')]);
    const snapshot = await inspectLegacyDatabase(db.name);
    expect(snapshot?.databaseVersion).toBe(version);
    expect(snapshot?.tables.notes).toHaveLength(2);
    expect(db.verno).toBe(version);
    db.close();
    const store = setup(db.name);
    await store.userDatabase.open();
    expect(store.userDatabase.verno).toBe(4);
    const conflicts = await store.reviewRepository.listNoteConflicts();
    expect(conflicts[0]?.originals.map((value) => value.body).sort()).toEqual(['原文一', '原文二']);
    expect(await store.userDatabase.notes.count()).toBe(1);
    const savedRecovery = await store.userDatabase.settings.get('migration.v4.recovery');
    expect(savedRecovery?.value).toMatchObject({ databaseVersion: version, tables: { notes: [note('first', '原文一'), note('second', '原文二')] } });
    const json = await store.backupService.exportJson('test');
    await store.backupService.importJson(json, 'replace');
    expect(await store.reviewRepository.listNoteConflicts()).toEqual(conflicts);
    await store.backupService.importJson(JSON.stringify(snapshot), 'replace');
    expect((await store.reviewRepository.listNoteConflicts())[0]?.originals).toHaveLength(2);
  });
  it('rolls the entire upgrade back after an injected storage failure', async () => {
    const db = await oldDatabase(3);
    await db.table('notes').bulkPut([note('a'), note('b')]);
    db.close();
    const failing = setup(db.name);
    failing.userDatabase.notes.hook('deleting', () => { throw new Error('injected disk failure'); });
    await expect(failing.userDatabase.open()).rejects.toThrow('injected disk failure');
    const original = new Dexie(db.name); legacy.push(original);
    await original.open();
    expect(original.verno).toBe(3);
    expect(await original.table('notes').count()).toBe(2);
    original.close();
    const recovered = setup(db.name);
    await recovered.userDatabase.open();
    expect(await recovered.userDatabase.noteConflicts.count()).toBe(1);
  });
  it('serializes simultaneous first note saves and refuses stale deletion', async () => {
    const store = setup();
    const results = await Promise.allSettled([store.annotationRepository.saveNote(note('a'), null), store.annotationRepository.saveNote(note('b'), null)]);
    expect(results.filter((entry) => entry.status === 'fulfilled')).toHaveLength(1);
    expect(await store.userDatabase.notes.count()).toBe(1);
    await expect(store.annotationRepository.deleteNote('cn408-2009-q01', null)).rejects.toThrow('另一页面');
    expect(() => store.backupService.preflight('not json')).toThrow('not valid JSON');
    expect(store.backupService.preflight(await store.backupService.exportJson('test')).counts.notes).toBe(1);
  });
  it('keeps plans immutable through reload, content additions and next-day quota changes', async () => {
    const store = setup();
    const plan = await store.reviewRepository.dailyPlan([], [], [card], now);
    await store.reviewRepository.saveReviewLimits({ questions: 12, cards: 20, newCards: 4 }, now);
    expect(await store.reviewRepository.dailyPlan([], [], [], now)).toEqual(plan);
    expect(await store.reviewRepository.reviewLimits(now)).toEqual({ questions: 8, cards: 10, newCards: 3 });
    expect(await store.reviewRepository.reviewLimits('2026-11-20T16:00:00Z')).toEqual({ questions: 12, cards: 20, newCards: 4 });
  });
  it('writes idempotent ratings atomically, bounds retries and roundtrips all new evidence', async () => {
    const store = setup();
    let round = await store.reviewRepository.createSession([card], now);
    for (let index = 0; index < 3; index++) {
      const prior = round.revision;
      round = await store.reviewRepository.rateCard(round.id, prior, 0, 125, now);
      expect(await store.reviewRepository.rateCard(round.id, prior, 0, 125, now)).toEqual(round);
      await expect(store.reviewRepository.rateCard(round.id, prior, 1, 125, now)).rejects.toThrow('另一页面');
    }
    expect(round.completedAt).toBe(now);
    expect(await store.reviewRepository.listEvents()).toHaveLength(3);
    const exported = await store.backupService.exportJson('test');
    await store.backupService.importJson(exported, 'replace');
    expect(await store.reviewRepository.getSession(round.id)).toEqual(round);
    await expect(store.backupService.importJson(exported, 'merge')).rejects.toThrow('ambiguous');
    const broken = JSON.parse(exported);
    broken.data.reviewSessions[0].cursor = 2;
    await expect(store.backupService.importJson(JSON.stringify(broken), 'replace')).rejects.toThrow();
    expect(await store.reviewRepository.listEvents()).toHaveLength(3);
  });
  it('exports a consistent snapshot while writes commit on another connection', async () => {
    const store = setup();
    const peer = setup(store.userDatabase.name);
    await store.userDatabase.open();
    const round = await store.reviewRepository.createSession([card], now);
    const results = await Promise.all([
      store.backupService.exportJson('test'),
      peer.reviewRepository.rateCard(round.id, 0, 1, 120, now),
    ]);
    const data = JSON.parse(results[0]).data;
    expect(data.reviewSessions[0].revision).toBe(data.cardReviewEvents.length);
    expect(() => store.backupService.preflight(results[0])).not.toThrow();
  });
});
