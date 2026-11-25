import { describe, expect, it } from 'vitest';
import {
  DEFAULT_REVIEW_LIMITS, REVIEW_ALGORITHM_VERSION, REVIEW_TIME_ZONE, SUBJECTS,
  type Attempt, type CardRating, type CardReviewEvent, type DailyPlan, type FlashcardDefinition,
  type LearningPack, type PersonalCard, type PracticeEvidence, type Question, type QuestionConceptMapping,
} from '@408os/domain';
import { buildConceptCatalog, selectConceptActivity, selectPlanConcepts, selectSubjectConceptCounts } from './concept-register';
import { questionLabLink } from './lab-links';

const today = '2026-11-24', subject = SUBJECTS[0];
const stamp = (day: number) => `2026-11-${day}T02:00:00Z`;
const source = { publisher: 'fixture', title: 'fixture', url: '', fileName: '', sha256: 'a'.repeat(64), pages: [1], locator: '1' };
const q: Question = {
  id: 'cn408-2009-q02', year: 2009, number: 2, kind: 'single-choice', subject, contentVersion: 'q1', knowledgePointIds: ['old-node'],
  stem: [], answer: { type: 'choice', optionId: 'A' }, explanation: [], hints: [], assetIds: [], reviewStatus: 'needs-review',
  source: { question: source, answer: source, crosschecks: [], redistribution: 'unknown' },
};
const essay: Question = { ...q, id: 'essay', kind: 'comprehensive', answer: { type: 'comprehensive', maxScore: 10, rubric: [], reference: [] } };
const mapping = (question: Question, ...ids: string[]): QuestionConceptMapping => ({
  subject, primaryConceptId: ids[0]!, conceptIds: ids, questionId: question.id, questionContentVersion: question.contentVersion,
  legacyNodeIds: ['old-node'], reviewStatus: 'needs-review',
  source: { questionId: question.id, questionContentVersion: question.contentVersion, documentSha256: source.sha256, pages: [1], locator: '1' },
});
const card: FlashcardDefinition = { id: 'card', version: 'c1', subject, conceptIds: ['a'], front: [], back: [], sources: [], reviewStatus: 'needs-review' };
const pack: LearningPack = {
  id: 'pack', schemaVersion: 1, version: 'v1', sha256: source.sha256, createdAt: stamp(20), cards: [card], mappings: [mapping(q, 'a')],
  concepts: [
    { id: 'root', subject, name: 'Root', level: 'subject' },
    { id: 'a', subject, name: 'A', level: 'concept', parentId: 'root' },
    { id: 'b', subject: SUBJECTS[1], name: 'B', level: 'concept' },
  ],
};
const answer = (id: string, day = 23, correct = true, question = q): Attempt => ({
  id, sessionId: `s-${id}`, questionId: question.id, questionContentVersion: question.contentVersion, mode: 'practice',
  response: { type: 'choice', optionId: correct ? 'A' : 'B' }, correct, score: correct ? 1 : 0,
  startedAt: stamp(day), submittedAt: stamp(day), durationMs: 100,
});
const proof = (a: Attempt): PracticeEvidence => ({
  id: `p-${a.id}`, attemptId: a.id, sessionId: a.sessionId, questionId: a.questionId, questionContentVersion: a.questionContentVersion,
  hintsUsed: 0, evidenceFromStart: true, firstResponse: a.response, mistakeNote: '', activeDurationMs: 100, revision: 1, updatedAt: a.submittedAt,
});
const event = (id: string, day = 23, rating: CardRating = 1): CardReviewEvent => ({
  id, cardId: card.id, cardVersion: card.version, sessionId: 'round', ordinal: 1, queueIndex: 0, activeDurationMs: 100, reviewedAt: stamp(day), rating,
});
const base = buildConceptCatalog(pack, [q], []);
const result = (attempts: Attempt[] = [], events: CardReviewEvent[] = [], evidence = attempts.map(proof), catalog = base, date = today) =>
  selectConceptActivity(catalog, attempts, events, evidence, date);
const good = [answer('q1', 22), answer('q2', 23)];
const spacedCards = [event('c1', 22), event('c2', 23)];
const personal = (overrides: Partial<PersonalCard> = {}): PersonalCard =>
  ({ ...card, baseCardId: card.id, revision: 1, suspended: false, updatedAt: stamp(23), ...overrides });

describe('concept evidence', () => {
  it('keeps untested leaves with zero counts and a null date; drafts and plan membership do not start them', () => {
    const activity = result([], [], [proof(answer('unsubmitted'))]);
    expect(activity.concepts.map((c) => c.conceptId)).toEqual(['a', 'b']);
    expect(activity.concepts[0]).toEqual({ conceptId: 'a', name: 'A', subject, state: 'unstarted', questionCount: 1,
      attemptedQuestions: 0, cardCount: 1, dueCards: 0, labIds: [questionLabLink(q.id)!.destination], lastActivityAt: null });
    expect(activity.objectiveByConcept.get('a')).toBe('untested');
    expect(result([answer('miss', 24, false)]).concepts[0]?.state).toBe('practicing');
  });
  it('distinguishes untested activity from measured poor performance even when their tiles are both practicing', () => {
    for (const activity of [result([], [event('card')]), result([answer('legacy')], [], [])]) {
      expect(activity.concepts[0]?.state).toBe('practicing');
      expect(activity.objectiveByConcept.get('a')).toBe('untested');
    }
    const measured = result([answer('wrong', 23, false)]);
    expect(measured.concepts[0]).toMatchObject({ state: 'practicing', attemptedQuestions: 1 });
    expect(measured.objectiveByConcept.get('a')).toBe('needs-review');
  });
  it('counts scored comprehensive work as activity only, including zero; ignores unscored responses', () => {
    const catalog = buildConceptCatalog({ ...pack, mappings: [mapping(essay, 'a')] }, [essay], []);
    const a: Attempt = { ...answer('essay', 24, true, essay), correct: null, score: 0, response: { type: 'comprehensive', text: 'work', checkedRubricIds: [], selfScore: 0 } };
    expect(result([a], [], [proof(a)], catalog).concepts[0]).toMatchObject({ state: 'practicing', attemptedQuestions: 1 });
    expect(result([{ ...a, score: null }], [], [], catalog).concepts[0]).toMatchObject({ state: 'unstarted', attemptedQuestions: 0 });
    expect(result([{ ...a, score: 10 }], [], [], catalog).objectiveByConcept.get('a')).toBe('untested');
  });
  it.each([
    { hintsUsed: 1 }, { evidenceFromStart: false }, { answerRevealedAt: stamp(23) },
    { questionContentVersion: 'old' }, { sessionId: 'other' }, { questionId: 'other' },
    { firstResponse: { type: 'choice' as const, optionId: 'B' as const } },
  ])('never promotes an assisted or unbound proof (%j)', (change) => {
    const a = answer('a');
    expect(result([a], [], [{ ...proof(a), ...change }]).objectiveByConcept.get('a')).toBe('untested');
  });
  it('consolidates after a genuine first success without sufficient spacing or without a card channel', () => {
    const positive = result([answer('only')], spacedCards);
    expect(positive.concepts[0]?.state).toBe('consolidating');
    expect(positive.objectiveByConcept.get('a')).toBe('positive');
    expect(result(good, [], good.map(proof), buildConceptCatalog({ ...pack, cards: [] }, [q], [])).concepts[0]?.state).toBe('consolidating');
    expect(result([], spacedCards, [], buildConceptCatalog({ ...pack, mappings: [] }, [], [])).concepts[0])
      .toMatchObject({ questionCount: 0, cardCount: 1, state: 'practicing' });
  });
  it('requires both spaced, non-due channels and falls back exactly on their due date', () => {
    expect(result(good, spacedCards).concepts[0]).toMatchObject({ state: 'stable', attemptedQuestions: 1, dueCards: 0 });
    expect(result(good, [event('old1', 20), event('old2', 21)]).concepts[0]).toMatchObject({ state: 'consolidating', dueCards: 1 });
    expect(result([answer('o1', 20), answer('o2', 21)], spacedCards).concepts[0]).toMatchObject({ state: 'consolidating', dueCards: 0 });
    expect(result(good, []).concepts[0]).toMatchObject({ state: 'consolidating', dueCards: 0 });
  });
  it('requires breadth where two objective questions exist and an independent check of every active card', () => {
    const q2 = { ...q, id: 'other' };
    const two = buildConceptCatalog({ ...pack, mappings: [...pack.mappings, mapping(q2, 'a')] }, [q, q2], []);
    expect(result(good, spacedCards, good.map(proof), two).concepts[0]?.state).toBe('consolidating');
    const both = [...good, answer('q3', 22, true, q2), answer('q4', 23, true, q2)];
    expect(result(both, spacedCards, both.map(proof), two).concepts[0]?.state).toBe('stable');
    const extraCard = buildConceptCatalog({ ...pack, cards: [card, { ...card, id: 'unseen' }] }, [q], []);
    expect(result(good, spacedCards, good.map(proof), extraCard).concepts[0]?.state).toBe('consolidating');
  });
  it('uses the lowest daily quality; same-day retries, duplicates and ordering cannot hide a failure', () => {
    const attempts = [...good, answer('miss', 23, false)];
    expect(result(attempts, spacedCards).concepts[0]?.state).toBe('practicing');
    const events = [...spacedCards, event('again', 23, 0.5)];
    expect(result(good, events).concepts[0]).toMatchObject({ state: 'consolidating', dueCards: 1 });
    expect(result([...good, ...good].reverse(), [...events, ...events].reverse())).toEqual(result(good, events));
    const assisted = answer('hint', 23);
    expect(result([...good, assisted], spacedCards, [...good.map(proof), { ...proof(assisted), hintsUsed: 1 }]).concepts[0]?.state).toBe('consolidating');
  });
  it('filters old questions, stale mappings, card overrides and changed source-question versions independently', () => {
    const v2 = { ...q, contentVersion: 'q2' };
    const old = result(good, spacedCards, good.map(proof), buildConceptCatalog({ ...pack, mappings: [mapping(v2, 'a')] }, [v2], [personal({ version: 'c2' })]));
    expect(old.concepts[0]).toMatchObject({ questionCount: 1, cardCount: 1, state: 'unstarted', lastActivityAt: null });
    expect(old.weeklyStudyDays).toBe(0);
    const unmapped = buildConceptCatalog({ ...pack, cards: [{ ...card, sources: [pack.mappings[0]!.source] }] }, [v2], []);
    const current = result([answer('v2', 24, true, v2)], spacedCards, [], unmapped);
    expect(current.concepts[0]).toMatchObject({ questionCount: 0, cardCount: 0, state: 'unstarted', labIds: [] });
    expect(current.weeklyStudyDays).toBe(1);
  });
  it('keeps past activity on a suspended current version, excluding its tasks, denominator and due count', () => {
    const paused = buildConceptCatalog(pack, [q], [personal({ suspended: true })]);
    const r = result([], [event('actual', 23)], [], paused);
    expect(r.concepts[0]).toMatchObject({ state: 'practicing', cardCount: 0, dueCards: 0, lastActivityAt: '2026-11-23T02:00:00.000Z' });
    expect(r.weeklyStudyDays).toBe(1);
    expect(result(good, spacedCards, good.map(proof), paused).concepts[0]?.state).toBe('consolidating');
  });
});

describe('register projections', () => {
  const plan: DailyPlan = {
    id: today, date: today, timeZone: REVIEW_TIME_ZONE, algorithmVersion: REVIEW_ALGORITHM_VERSION,
    createdAt: stamp(24), limits: DEFAULT_REVIEW_LIMITS, items: [
      { kind: 'question', targetId: q.id, contentVersion: 'q1', reason: 'due' },
      { kind: 'card', targetId: card.id, contentVersion: 'c1', reason: 'unseen' },
      { kind: 'question', targetId: q.id, contentVersion: 'q0', reason: 'overdue' },
      { kind: 'card', targetId: 'missing', contentVersion: 'v0', reason: 'due' },
    ],
  };
  it('maps only current leaves, preserving every fixed task even if unavailable, and deduplicates the union', () => {
    const catalog = buildConceptCatalog({ ...pack, mappings: [mapping(q, 'b', 'root', 'b', 'a')] }, [q], []);
    const mapped = selectPlanConcepts(catalog, plan, today);
    expect(mapped.items.map((i) => i.conceptIds)).toEqual([['b', 'a'], ['a'], [], []]);
    expect(mapped.items.map(({ targetId }) => targetId)).toEqual(plan.items.map((i) => i.targetId));
    expect(mapped.conceptIds).toEqual(['b', 'a']);
    expect(selectPlanConcepts(buildConceptCatalog(pack, [q], [personal({ suspended: true })]), plan, today).items[1]?.conceptIds).toEqual([]);
    for (const p of [null, { ...plan, date: '2026-11-23' }]) expect(selectPlanConcepts(catalog, p, today)).toEqual({ items: [], conceptIds: [] });
  });
  it('returns each subject once in canonical order and counts each leaf in exactly one state', () => {
    const r = result(good, spacedCards);
    const counts = selectSubjectConceptCounts(r.concepts);
    expect(counts.map((c) => c.subject)).toEqual([...SUBJECTS]);
    expect(counts[0]).toEqual({ subject, unstarted: 0, practicing: 0, consolidating: 0, stable: 1 });
    expect(counts[1]?.unstarted).toBe(1);
    expect(counts[2]).toMatchObject({ unstarted: 0, practicing: 0, consolidating: 0, stable: 0 });
    expect(selectConceptActivity(buildConceptCatalog(null, [], []), [], [], [], today).concepts).toEqual([]);
  });
  it('counts Monday midnight in Beijing, deduplicates both event types, and excludes next day, invalid times and unscored work', () => {
    const dates = ['2026-11-22T15:59:59.999Z', '2026-11-22T16:00:00Z', '2026-11-23T16:00:00Z', '2026-11-24T16:00:00Z', 'invalid'];
    const a = dates.map((submittedAt, n) => ({ ...answer(String(n)), submittedAt }));
    const events = [event('same', 23), { ...event('bad'), reviewedAt: 'invalid' }];
    const r = result(a, events, []);
    expect(r.weeklyStudyDays).toBe(2);
    expect(r.concepts[0]?.lastActivityAt).toBe('2026-11-23T16:00:00.000Z');
    expect(result(a, events, [], base, '2026-11-23').weeklyStudyDays).toBe(1);
    expect(result([{ ...answer('ungraded', 24), correct: null }], [], []).weeklyStudyDays).toBe(0);
    expect(result([{ ...answer('offset'), submittedAt: '2027-01-03T15:59:59Z' }], [], [], base, '2027-01-04').weeklyStudyDays).toBe(0);
  });
});
