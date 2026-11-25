import { mkdir, readFile, realpath, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { canonicalSerialize, computeLearningPackHash, parseLearningPack, supplementBlockers } from '@408os/content-schema';

const { values } = parseArgs({ options: {
  baseline: { type: 'string' }, input: { type: 'string' }, output: { type: 'string' }, check: { type: 'boolean' },
} });
if (!values.baseline || !values.input || !values.output) throw new Error('Specify --baseline, --input and --output');
const outputDir = await realpath(values.output);
const privateRoots = await Promise.all(['local-data', 'output'].map((dir) => realpath(dir)));
if (!privateRoots.some((dir) => outputDir === dir || outputDir.startsWith(dir + path.sep))) throw new Error('Private learning packs require local-data/ or output/');
const json = async (file) => JSON.parse(await readFile(file, 'utf8'));
const prior = parseLearningPack(await json(values.baseline));
const release = await json(values.input);
if (release.expectedCurrentDigest !== prior.sha256 || release.version.localeCompare(prior.version, 'en', { numeric: true }) <= 0) {
  throw new Error('Candidate baseline or release version mismatch');
}
const articles = new Map(prior.articles?.map((article) => [article.conceptId, article]));
for (const draft of release.articles) {
  const previous = articles.get(draft.conceptId);
  if (previous && draft.version.localeCompare(previous.version, 'en', { numeric: true }) <= 0) throw new Error('Article version must increase');
  const sources = draft.sourceQuestionIds.map((questionId) => prior.mappings.find((m) => m.questionId === questionId)?.source);
  articles.set(draft.conceptId, {
    id: 'article:' + draft.conceptId, conceptId: draft.conceptId, version: draft.version,
    subject: prior.concepts.find((concept) => concept.id === draft.conceptId)?.subject,
    explanation: [{ type: 'text', text: draft.explanation }], workedExample: [{ type: 'text', text: draft.workedExample }],
    commonMistake: [{ type: 'text', text: draft.commonMistake }], questionIds: draft.sourceQuestionIds,
    cardIds: prior.cards.filter((card) => card.conceptIds.includes(draft.conceptId)).map((card) => card.id),
    ...(draft.labPath ? { labPath: draft.labPath } : {}), sources, authorship: 'ai-assisted', reviewStatus: 'needs-review',
  });
}
const pack = { ...prior, schemaVersion: 2, version: release.version, createdAt: release.createdAt,
  articles: [...articles.values()].sort((a, b) => a.conceptId.localeCompare(b.conceptId)),
  questionSupplements: release.questionSupplements.sort((a, b) => a.id.localeCompare(b.id)),
};
pack.sha256 = computeLearningPackHash(pack);
parseLearningPack(pack);
const questions = new Map();
for (const year of new Set(pack.questionSupplements.map((s) => s.questionId.match(/^cn408-(\d{4})-q\d+$/)?.[1]))) {
  const paper = await json(path.join('apps/web/public/content', year + '.json'));
  for (const question of paper.questions) questions.set(question.id, question);
}
const blockers = supplementBlockers(pack, questions, prior);
if (blockers.length) throw new Error(blockers.join('\n'));
const destination = path.join(outputDir, 'learning.json');
if (values.check) {
  if (canonicalSerialize(await json(destination)) !== canonicalSerialize(pack)) throw new Error('Non-deterministic learning pack');
} else {
  await mkdir(outputDir, { recursive: true });
  await writeFile(destination, JSON.stringify(pack) + '\n');
}
console.log(pack.version, pack.sha256, pack.articles.length, pack.questionSupplements.length);
