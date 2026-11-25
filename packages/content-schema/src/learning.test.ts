import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import type { ContentPack, LearningPack } from '@408os/domain';
import { canonicalSerialize, sha256 } from './hash';
import { computeLearningPackHash, parseLearningPack } from './learning';

const pack = JSON.parse(readFileSync(path.resolve('apps/web/public/content/learning.json'), 'utf8')) as LearningPack;
const questions = Array.from({ length: 17 }, (_, i) => JSON.parse(readFileSync(path.resolve(`apps/web/public/content/${i + 2009}.json`), 'utf8')) as ContentPack).flatMap((entry) => entry.questions);
describe('independent cross-year learning content', () => {
  it('maps all 799 exact question versions and original sources to leaf concepts', () => {
    expect(parseLearningPack(pack)).toEqual(pack);
    expect(pack.mappings).toHaveLength(799);
    expect(new Set(pack.mappings.map((entry) => entry.questionId)).size).toBe(799);
    const mappings = new Map(pack.mappings.map((entry) => [entry.questionId, entry]));
    for (const question of questions) {
      const mapping = mappings.get(question.id)!;
      expect(mapping.questionContentVersion).toBe(question.contentVersion);
      expect(mapping.source).toEqual({
        questionId: question.id, questionContentVersion: question.contentVersion,
        documentSha256: question.source.question.sha256, pages: question.source.question.pages, locator: question.source.question.locator,
      });
      expect(mapping.reviewStatus).toBe('needs-review');
    }
  });
  it.each(pack.cards.map((card) => [card.id, card] as const))('%s contains substantive front/back and traceable references', (_, card) => {
    expect(card.front.some((block) => block.type === 'text' && block.text.length >= 10)).toBe(true);
    expect(card.back.some((block) => block.type === 'text' && block.text.length >= 30)).toBe(true);
    expect(card.sources.length).toBeGreaterThan(0);
    expect(card.reviewStatus).toBe('needs-review');
    expect(card.sources.every((source) => questions.some((question) => question.id === source.questionId && question.contentVersion === source.questionContentVersion))).toBe(true);
  });
  it('contains the approved card quota per subject', () => {
    expect(pack.cards).toHaveLength(156);
    for (const [subject, count] of Object.entries({ 'data-structures': 39, 'computer-organization': 39, 'operating-systems': 36, 'computer-networks': 42 })) {
      expect(pack.cards.filter((card) => card.subject === subject)).toHaveLength(count);
    }
  });
  it('preserves the original 80 card objects and the explicit draft sources', () => {
    const legacy = pack.cards.filter((card) => /^card-(ds|co|os|cn)-(0[1-9]|1\d|20)$/.test(card.id));
    expect(legacy).toHaveLength(80);
    expect(sha256(canonicalSerialize(legacy))).toBe('8ae3ebad82e7e0c5588a8990535abd7b5178971be395c76b855c096d7b2f554f');
    const drafts = readFileSync(path.resolve('content/learning/drafts/cards-draft-2026-11-25.tsv'), 'utf8').trim().split(/\r?\n/).slice(1).map((row) => row.split('\t'));
    for (const [id, , , back, sources] of drafts) {
      const card = pack.cards.find((entry) => entry.id === id);
      if (!back?.trim() || !sources?.trim()) { expect(card).toBeUndefined(); continue; }
      expect(card?.version).toBe('2026.11.25.1');
      expect(card?.sources.map((source) => source.questionId)).toEqual(sources.split(','));
    }
  });
  it('contains five complete articles per subject with exact source and card links', () => {
    expect(pack.articles).toHaveLength(20);
    for (const subject of new Set(pack.concepts.map((concept) => concept.subject))) {
      expect(pack.articles!.filter((article) => article.subject === subject)).toHaveLength(5);
    }
    for (const article of pack.articles!) {
      for (const blocks of [article.explanation, article.workedExample, article.commonMistake]) {
        expect(blocks.some((block) => block.type === 'text' && block.text.length >= 70)).toBe(true);
      }
      expect(article.sources.map((source) => source.questionId)).toEqual(article.questionIds);
      expect(article.reviewStatus).toBe('needs-review');
      expect(article.authorship).toBe('ai-assisted');
    }
  });
  it.each(['article-version', 'article-source', 'article-card', 'article-lab', 'article-blank'])('rejects %s corruption', (kind) => {
    const bad = structuredClone(pack);
    const article = bad.articles![0]!;
    if (kind === 'article-version') article.sources[0]!.questionContentVersion = 'unknown';
    if (kind === 'article-source') article.sources = [];
    if (kind === 'article-card') article.cardIds = ['missing'];
    if (kind === 'article-lab') article.labPath = '//untrusted.example/path';
    if (kind === 'article-blank') article.explanation = [{ type: 'text', text: '   ' }];
    bad.sha256 = computeLearningPackHash(bad);
    expect(() => parseLearningPack(bad)).toThrow();
  });
  it.each(['cycle', 'dangling', 'root', 'version', 'blank', 'question-node', 'source', 'hash'])('rejects %s corruption even with a regenerated digest', (kind) => {
    const bad = structuredClone(pack);
    const leaf = bad.concepts.find((concept) => concept.level === 'concept')!;
    if (kind === 'cycle') leaf.parentId = leaf.id;
    if (kind === 'dangling') bad.mappings[0]!.conceptIds.push('missing');
    if (kind === 'root') bad.mappings[0]!.conceptIds.push(bad.concepts.find((concept) => concept.level === 'subject')!.id);
    if (kind === 'version') bad.cards[0]!.sources[0]!.questionContentVersion = 'missing';
    if (kind === 'blank') bad.cards[0]!.back = [{ type: 'text', text: '   ' }];
    if (kind === 'question-node') leaf.name = '第 1 题';
    if (kind === 'source') bad.cards[0]!.sources[0]!.locator = 'unrelated';
    bad.sha256 = kind === 'hash' ? '0'.repeat(64) : computeLearningPackHash(bad);
    expect(() => parseLearningPack(bad)).toThrow();
  });
});
