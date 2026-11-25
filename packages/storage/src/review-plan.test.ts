import 'fake-indexeddb/auto';
import { buildPersistentDailyPlan, SUBJECTS, type Question } from '@408os/domain';
import { expect, it } from 'vitest';
import { createStorage } from './index';

it('retains a saved legacy year/number queue after reload; only a new day gets subject rotation', async () => {
  const source = { publisher: 'fixture', title: 'fixture', url: 'https://example.com/source', fileName: 'source.pdf', sha256: 'a'.repeat(64), pages: [1], locator: 'page 1' };
  const questions: Question[] = SUBJECTS.flatMap((subject, index) => Array.from({ length: 8 }, (_, offset) => ({
    id: `q-${index}-${offset}`, number: index * 10 + offset + 1, year: 2009, subject,
    kind: 'single-choice', contentVersion: '1', reviewStatus: 'needs-review',
    stem: [{ type: 'text', text: 'Question' }],
    options: ['A', 'B', 'C', 'D'].map((id) => ({ id: id as 'A' | 'B' | 'C' | 'D', content: [{ type: 'text', text: id }] })),
    answer: { type: 'choice', optionId: 'A' }, explanation: [], hints: [], knowledgePointIds: [], assetIds: [],
    source: { question: source, answer: source, crosschecks: [], redistribution: 'unknown' },
  })));
  const now = '2026-11-25T02:00:00.000Z';
  const limits = { questions: 8, cards: 10, newCards: 3 };
  const saved = buildPersistentDailyPlan(questions, [], [], [], now, limits);
  const oldOrder = [...questions].sort((a, b) => a.year - b.year || a.number - b.number).slice(0, 8);
  saved.items = oldOrder.map((q) => ({ kind: 'question', targetId: q.id, contentVersion: q.contentVersion, reason: 'unseen' }));
  const names = { user: `review-plan-user-${crypto.randomUUID()}`, content: `review-plan-content-${crypto.randomUUID()}` };
  const first = createStorage(names);
  const reopened = createStorage(names);
  try {
    await first.reviewRepository.saveServerPlan(saved);
    first.userDatabase.close();
    const changed = questions.map((q) => ({ ...q, contentVersion: `${q.contentVersion}.next` })).reverse();
    expect(await reopened.reviewRepository.dailyPlan(changed, [], [], now)).toEqual(saved);
    const tomorrow = await reopened.reviewRepository.dailyPlan(questions, [], [], '2026-11-26T02:00:00.000Z');
    expect(tomorrow.items.map((item) => questions.find((q) => q.id === item.targetId)?.subject)).toEqual([
      'data-structures', 'computer-organization', 'operating-systems', 'computer-networks',
      'data-structures', 'computer-organization', 'operating-systems', 'computer-networks',
    ]);
    expect(await reopened.reviewRepository.getDailyPlan(saved.date)).toEqual(saved);
  } finally {
    first.userDatabase.close();
    first.contentDatabase.close();
    await reopened.userDatabase.delete();
    await reopened.contentDatabase.delete();
  }
});
