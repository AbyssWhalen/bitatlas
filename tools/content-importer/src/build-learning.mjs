import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { computeLearningPackHash, parseLearningPack } from '@408os/content-schema';
import { concepts, prefixes } from '../../../content/learning/catalog.mjs';
import { articleDrafts } from '../../../content/learning/articles.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const sourceDir = path.join(root, 'content', 'learning');
const publicDir = path.join(root, 'apps', 'web', 'public', 'content');
const assignments = JSON.parse(await readFile(path.join(sourceDir, 'mappings.json'), 'utf8'));
const cardRows = (await readFile(path.join(sourceDir, 'cards.tsv'), 'utf8')).trim().split(/\r?\n/).filter((line) => !line.startsWith('#'));
const questions = [];
for (let year = 2009; year <= 2025; year++) {
  questions.push(...JSON.parse(await readFile(path.join(publicDir, `${year}.json`), 'utf8')).questions);
}
const sourceFor = (question) => ({
  questionId: question.id, questionContentVersion: question.contentVersion,
  documentSha256: question.source.question.sha256, pages: question.source.question.pages, locator: question.source.question.locator,
});
const mappings = questions.map((question) => {
  const assignment = assignments[question.id];
  if (!assignment?.length) throw new Error(`Missing explicit concept mapping: ${question.id}`);
  return {
    questionId: question.id, questionContentVersion: question.contentVersion, subject: concepts.find((concept) => concept.id === assignment[0])?.subject,
    primaryConceptId: assignment[0], conceptIds: assignment,
    legacyNodeIds: question.knowledgePointIds.filter((id) => !id.startsWith('subject-')),
    source: sourceFor(question), reviewStatus: 'needs-review',
  };
});
const cards = cardRows.map((row) => {
  const [id, conceptId, front, back] = row.split('\t');
  if (!id || !front?.trim() || !back?.trim()) throw new Error(`Incomplete card: ${id}`);
  const concept = concepts.find((item) => item.id === conceptId);
  if (!concept) throw new Error(`Unknown card concept: ${conceptId}`);
  const related = mappings.filter((mapping) => mapping.conceptIds.includes(conceptId));
  const byYear = [...new Map(related.map((mapping) => [mapping.questionId.slice(6, 10), mapping])).values()];
  return {
    id, version: '2026.11.20.1', subject: concept.subject, conceptIds: [conceptId],
    front: [{ type: 'text', text: front }], back: [{ type: 'text', text: back }],
    sources: byYear.slice(0, 4).map((mapping) => mapping.source), reviewStatus: 'needs-review',
  };
});
for (const [subject, prefix] of Object.entries(prefixes)) {
  if (cards.filter((card) => card.subject === subject).length !== 20) throw new Error(`Expected 20 ${prefix} cards`);
}
if (Object.keys(assignments).length !== 799 || mappings.length !== 799) throw new Error('Expected exactly 799 mappings');
const selectedConceptIds = Object.keys(prefixes).flatMap((subject) => concepts.filter((concept) => concept.level === 'concept' && concept.subject === subject)
  .map((concept) => {
    const related = mappings.filter((mapping) => mapping.primaryConceptId === concept.id);
    return { id: concept.id, years: new Set(related.map((mapping) => mapping.questionId.slice(6, 10))).size, count: related.length };
  }).sort((a, b) => b.years - a.years || b.count - a.count || a.id.localeCompare(b.id)).slice(0, 5).map((entry) => entry.id));
if (articleDrafts.length !== 20 || new Set(articleDrafts.map((draft) => draft.conceptId)).size !== 20
  || selectedConceptIds.some((id) => !articleDrafts.some((draft) => draft.conceptId === id))) throw new Error('Articles must cover the top five cross-year concepts of each subject');
const articles = [...articleDrafts].sort((a, b) => a.conceptId.localeCompare(b.conceptId)).map((draft) => {
  const concept = concepts.find((entry) => entry.id === draft.conceptId);
  const related = mappings.filter((mapping) => mapping.conceptIds.includes(draft.conceptId));
  return {
    id: `article:${draft.conceptId}`, version: '2026.11.20.1', conceptId: draft.conceptId, subject: concept.subject,
    explanation: [{ type: 'text', text: draft.explanation }],
    workedExample: [{ type: 'text', text: draft.workedExample }],
    commonMistake: [{ type: 'text', text: draft.commonMistake }],
    questionIds: related.map((entry) => entry.questionId),
    cardIds: cards.filter((card) => card.conceptIds.includes(draft.conceptId)).map((card) => card.id),
    ...(draft.labPath ? { labPath: draft.labPath } : {}),
    sources: related.map((entry) => entry.source), authorship: 'ai-assisted', reviewStatus: 'needs-review',
  };
});
const pack = {
  id: 'bitatlas-learning', schemaVersion: 1, version: '2026.11.20.2',
  createdAt: '2026-11-20T00:00:00.000Z', sha256: '0'.repeat(64), concepts, mappings, cards, articles,
};
pack.sha256 = computeLearningPackHash(pack);
parseLearningPack(pack);
const json = `${JSON.stringify(pack)}\n`;
const destination = path.join(publicDir, 'learning.json');
if (process.argv.includes('--check')) {
  if (await readFile(destination, 'utf8') !== json) throw new Error('Learning pack differs from deterministic source build');
} else { await writeFile(destination, json); }
const coverage = concepts.filter((item) => item.level === 'concept').map((concept) => ({
  ...concept,
  questions: mappings.filter((mapping) => mapping.conceptIds.includes(concept.id)).map((mapping) => mapping.questionId),
  cards: cards.filter((card) => card.conceptIds.includes(concept.id)).map((card) => card.id),
}));
await mkdir(path.join(root, 'docs', 'learning'), { recursive: true });
await writeFile(path.join(root, 'docs', 'learning', 'coverage.json'), JSON.stringify({
  version: pack.version, sha256: pack.sha256, questionCount: mappings.length, cardCount: cards.length, articleCount: articles.length,
  articleConceptIds: articles.map((article) => article.conceptId), humanReviewedArticles: 0,
  mappedCoverage: 1, humanReviewedMappings: 0, humanReviewedCards: 0, reviewStatus: 'needs-review', concepts: coverage,
}, null, 2));
console.log(`Learning pack: ${mappings.length} questions, ${cards.length} cards, ${articles.length} articles, ${coverage.length} leaf concepts, sha256 ${pack.sha256}`);
