// @vitest-environment node
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { expect, it } from 'vitest';
import { canonicalSerialize, computeLearningPackHash, parseLearningPack } from '@408os/content-schema';
import { advanceReviewSession, replayCardSchedule, type CardReviewEvent, type DailyPlan, type FlashcardDefinition, type LearningPack, type ReviewSession } from '@408os/domain';
import { createApp } from './app';

it('publishes added cards without changing saved plans or scores, and retains withdrawn card evidence after rollback', async () => {
  const candidate = parseLearningPack(JSON.parse(readFileSync('apps/web/public/content/learning.json', 'utf8')));
  // Reconstruct the exact historical 156-card release exercised by this upgrade/rollback test.
  candidate.articles = candidate.articles!.filter((article) => ['2026.11.20.1', '2026.11.25.1'].includes(article.version));
  candidate.version = '2026.11.25.1';
  candidate.sha256 = computeLearningPackHash(candidate);
  expect(candidate.sha256).toBe('b66bab4555401943df6e595a39ba3bdf0999e3806f7c12143aaae4d76eb1075f');
  const baseline: LearningPack = structuredClone(candidate);
  baseline.version = '2026.11.20.2';
  baseline.createdAt = '2026-11-20T00:00:00.000Z';
  baseline.cards = baseline.cards.filter((card) => /^card-(ds|co|os|cn)-(0[1-9]|1\d|20)$/.test(card.id));
  for (const article of baseline.articles ?? []) {
    article.version = '2026.11.20.1';
    article.cardIds = article.cardIds.filter((id) => baseline.cards.some((card) => card.id === id));
  }
  baseline.sha256 = computeLearningPackHash(baseline);
  expect(baseline.sha256).toBe('f326d8c217dc1a3f14835d69c2251cee7e2e4f7e7a95ad89b2ad030eaa98cdf6');
  const origin = 'http://127.0.0.1:4310';
  let now = Date.parse('2026-11-25T01:00:00.000Z');
  const server = createApp({ database: ':memory:', files: path.resolve('output/card-release-2026-11-25/fixture-files'), origin, now: () => now });
  try {
    const password = 'synthetic-release-fixture-only';
    const admin = await server.auth.bootstrap('releaseadmin', password);
    const member = randomUUID();
    server.db.prepare('INSERT INTO accounts(id,username,password_hash,role,created_at) VALUES (?,?,?,?,?)')
      .run(member, 'releasemember', await server.auth.hashPassword(password), 'member', new Date(now).toISOString());
    for (let year = 2009; year <= 2025; year++) {
      const pack = JSON.parse(readFileSync(`apps/web/public/content/${year}.json`, 'utf8'));
      server.db.prepare('INSERT INTO content_versions(id,version,kind,digest,title,payload,created_by,created_at,published) VALUES (?,?,?,?,?,?,?,?,1)')
        .run(pack.manifest.id, pack.manifest.contentVersion, 'questions', pack.manifest.sha256, pack.manifest.title, JSON.stringify(pack), admin.id, new Date(now).toISOString());
    }
    async function login(username: string) {
      const response = await server.app.inject({ method: 'POST', url: '/api/v1/auth/login', headers: { origin }, payload: { username, password } });
      expect(response.statusCode).toBe(200);
      return response.headers['set-cookie']!.toString().split(';')[0]!;
    }
    const administrator = await login('releaseadmin');
    const learner = await login('releasemember');
    const request = (cookie: string, url: string, payload?: unknown) => server.app.inject({ method: payload ? 'POST' : 'GET', url, headers: { origin, cookie }, ...(payload ? { payload } : {}) });
    async function publish(pack: LearningPack) {
      const preview = await request(administrator, '/api/v1/admin/content/preview', { kind: 'learning', content: pack });
      expect(preview.statusCode).toBe(200);
      expect(preview.json()).toMatchObject({ digest: pack.sha256, blockers: [], summary: { cards: pack.cards.length, unavailableMappings: [] } });
      const result = await request(administrator, '/api/v1/admin/content/publish', { kind: 'learning', content: pack, expectedDigest: pack.sha256 });
      expect(result.statusCode).toBe(200);
      expect(result.json()).toMatchObject({ version: pack.version, digest: pack.sha256 });
    }
    function ratingBundle(card: FlashcardDefinition, reviewedAt: string) {
      const id = randomUUID();
      const round: ReviewSession = { id, cards: [card], queue: [card.id], cursor: 0, completedCardIds: [], revision: 0, startedAt: reviewedAt, updatedAt: reviewedAt };
      const finished = advanceReviewSession(round, 1, reviewedAt).session;
      const event: CardReviewEvent = { id: JSON.stringify([id, 0]), sessionId: id, cardId: card.id, cardVersion: card.version, rating: 1, ordinal: 1, queueIndex: 0, reviewedAt, activeDurationMs: 5000 };
      return { operationId: randomUUID(), deviceId: randomUUID(), createdAt: reviewedAt, changes: [
        { kind: 'reviewSessions', entityId: id, baseRevision: 0, value: finished },
        { kind: 'cardReviewEvents', entityId: event.id, baseRevision: 0, value: event },
      ] };
    }
    async function sync(bundle: ReturnType<typeof ratingBundle>) {
      const result = await request(learner, '/api/v1/sync/push', bundle);
      expect(result.statusCode, result.body).toBe(200);
      expect(result.json().status).toBe('accepted');
    }
    function events(): CardReviewEvent[] {
      return (server.db.prepare("SELECT payload FROM entities WHERE account_id=? AND kind='cardReviewEvents' ORDER BY entity_id").all(member) as Array<{ payload: string }>).map((row) => JSON.parse(row.payload));
    }
    async function plan(): Promise<DailyPlan> {
      const response = await request(learner, '/api/v1/plans/today', {});
      expect(response.statusCode).toBe(200);
      return response.json();
    }
    await publish(baseline);
    // Learned CN cards sort before the new CN cards. Their future due dates leave room for three new cards.
    for (const card of baseline.cards.filter((entry) => entry.id.startsWith('card-cn-'))) {
      for (const date of ['19', '20', '23']) await sync(ratingBundle(card, `2026-11-${date}T01:00:00.000Z`));
    }
    await sync(ratingBundle(baseline.cards[0]!, '2026-11-24T01:00:00.000Z'));
    const oldEvents = canonicalSerialize(events());
    const oldSchedule = replayCardSchedule(events());
    const today = await plan();
    await publish(candidate);
    expect(canonicalSerialize(events())).toBe(oldEvents);
    expect(replayCardSchedule(events())).toEqual(oldSchedule);
    expect(await plan()).toEqual(today);
    now += 86_400_000;
    const tomorrow = await plan();
    const newItems = tomorrow.items.filter((item) => item.kind === 'card' && item.reason === 'unseen');
    expect(newItems).toHaveLength(3);
    expect(newItems.every((item) => !baseline.cards.some((card) => card.id === item.targetId))).toBe(true);
    const newCard = candidate.cards.find((card) => card.id === newItems[0]!.targetId)!;
    await sync(ratingBundle(newCard, new Date(now).toISOString()));
    const beforeRollback = canonicalSerialize(events());
    const offline = ratingBundle(newCard, new Date(now + 1000).toISOString());
    const rollback = { ...baseline, version: '2026.11.25.2', createdAt: '2026-11-25T00:00:00.000Z' };
    rollback.sha256 = computeLearningPackHash(rollback);
    await publish(rollback);
    expect(canonicalSerialize(events())).toBe(beforeRollback);
    expect(await plan()).toEqual(tomorrow);
    await sync(offline);
    expect(events().filter((event) => event.cardId === newCard.id)).toHaveLength(2);
    expect(server.content.learning()!.cards).toHaveLength(80);
    now += 86_400_000;
    expect((await plan()).items.filter((item) => item.kind === 'card').every((item) => baseline.cards.some((card) => card.id === item.targetId))).toBe(true);
    const downgrade = await request(administrator, '/api/v1/admin/content/publish', { kind: 'learning', content: candidate, expectedDigest: candidate.sha256 });
    expect(downgrade.statusCode).toBe(409);
    expect(downgrade.json().code).toBe('CONTENT_DOWNGRADE');
  } finally { await server.app.close(); }
}, 30_000);
