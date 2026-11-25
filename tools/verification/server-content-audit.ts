import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { questionAvailability, type ContentPack } from '@408os/domain';
import { parseLearningPack } from '@408os/content-schema';
import { answerComparisonCoverage } from '../content-importer/src/build-year.mjs';

const root = path.resolve('.');
const output = path.join(root, 'output', 'server-implementation-2026-11-20');
const learning = parseLearningPack(JSON.parse(await readFile(path.join(root, 'apps/web/public/content/learning.json'), 'utf8')));
const packs: ContentPack[] = [];
for (let year = 2009; year <= 2025; year++) packs.push(JSON.parse(await readFile(path.join(root, 'apps/web/public/content', `${year}.json`), 'utf8')));
const coverage = [];
for (let year = 2010; year <= 2025; year++) {
  const quality = JSON.parse(await readFile(path.join(root, 'local-data/generated', `${year}.quality.json`), 'utf8'));
  coverage.push({ year, ...answerComparisonCoverage(quality.quality) });
}
const questionRows = packs.flatMap((pack) => pack.questions.map((question) => {
  const mapping = learning.mappings.find((row) => row.questionId === question.id);
  const availability = questionAvailability(question, new Map(pack.assets.map((asset) => [asset.id, asset])));
  return { id: question.id, version: question.contentVersion, year: question.year, practiceAvailable: availability.practice,
    explanationMissing: availability.explanationMissing, reviewStatus: question.reviewStatus, mapping };
}));
const report = {
  createdAt: new Date().toISOString(), learningVersion: learning.version, learningDigest: learning.sha256,
  questions: questionRows.length, mapped: questionRows.filter((row) => row.mapping?.questionContentVersion === row.version).length,
  practiceAvailable: questionRows.filter((row) => row.practiceAvailable).length,
  missingExplanations: questionRows.filter((row) => row.explanationMissing).map((row) => row.id),
  humanVerifiedQuestions: questionRows.filter((row) => row.reviewStatus === 'verified').length,
  cards: learning.cards.map((card) => ({ id: card.id, subject: card.subject, reviewStatus: card.reviewStatus, sources: card.sources })),
  articles: learning.articles?.map((article) => ({ id: article.id, conceptId: article.conceptId, subject: article.subject,
    reviewStatus: article.reviewStatus, sources: article.sources.length, questions: article.questionIds.length, cards: article.cardIds, labPath: article.labPath })),
  historicalAnswerComparison: { source: 'Saved importer comparison flags; not a new PDF correctness audit', years: coverage,
    compared: coverage.reduce((sum, entry) => sum + entry.comparedCount, 0), total: 640 },
};
await writeFile(path.join(output, 'content-coverage.json'), JSON.stringify(report, null, 2));
await writeFile(path.join(output, 'question-mapping-coverage.json'), JSON.stringify(questionRows, null, 2));
console.log(JSON.stringify({ questions: report.questions, mapped: report.mapped, practiceAvailable: report.practiceAvailable,
  missingExplanations: report.missingExplanations.length, cards: report.cards.length, articles: report.articles?.length,
  compared: report.historicalAnswerComparison.compared, totalComparedCandidate: 640 }));
