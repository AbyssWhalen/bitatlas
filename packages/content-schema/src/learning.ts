import { z } from 'zod';
import { questionAvailability, questionLabPaths, type LearningPack, type Question } from '@408os/domain';
import { canonicalSerialize, sha256 } from './hash';
import { contentBlockSchema } from './schema';
import { validateCanonicalTaxonomyMappings } from './taxonomy';

const id = z.string().trim().min(1).max(200);
const meaningfulBlocks = z.array(contentBlockSchema).min(1).max(100).refine((blocks) => blocks.some((block) => {
  if (block.type === 'text') return Boolean(block.text.trim());
  if (block.type === 'math') return Boolean(block.expression.trim());
  if (block.type === 'code') return Boolean(block.code.trim());
  if (block.type === 'table') return block.rows.some((row) => row.some((cell) => cell.trim()));
  return false; // Independent cards cannot depend on an unresolved image.
}), '卡片必须有完整文字、公式或表格正文');
export const learningSubjectSchema = z.enum(['data-structures', 'computer-organization', 'operating-systems', 'computer-networks']);
export const learningSourceSchema = z.object({
  questionId: id, questionContentVersion: id, documentSha256: z.string().regex(/^[a-f0-9]{64}$/),
  pages: z.array(z.int().positive()).max(100), locator: z.string().min(1).max(1000),
}).strict();
export const flashcardDefinitionSchema = z.object({
  id, version: id, subject: learningSubjectSchema, conceptIds: z.array(id).min(1).max(20),
  front: meaningfulBlocks, back: meaningfulBlocks,
  sources: z.array(learningSourceSchema).max(100), reviewStatus: z.literal('needs-review'),
}).strict();
const legacyLabPaths: readonly string[] = [
  '/lab/data-structures?module=sort-pass', '/lab/data-structures?module=stack-capacity',
  '/lab/data-structures?module=shortest-path', '/lab?module=riscv', '/lab?module=io-overhead',
  '/lab?module=bus-bandwidth', '/lab?module=signed', '/lab?module=cache',
  '/lab/os-memory?module=memory', '/lab/os-memory?module=hrrn', '/lab/os-memory?module=semaphore',
  '/lab/os-memory?module=filesystem-links', '/lab/network?module=cidr',
  '/lab/network?module=qam-nyquist', '/lab/network?module=gbn', '/lab/network?module=csma-cd',
] as const;
export const ARTICLE_LAB_PATHS = [...new Set([...legacyLabPaths, ...questionLabPaths])];
const articleSchema = z.object({
  id, version: id, conceptId: id, subject: learningSubjectSchema,
  explanation: meaningfulBlocks, workedExample: meaningfulBlocks, commonMistake: meaningfulBlocks,
  questionIds: z.array(id).min(1), cardIds: z.array(id),
  labPath: z.enum(ARTICLE_LAB_PATHS).optional(),
  sources: z.array(learningSourceSchema).min(1),
  authorship: z.literal('ai-assisted'), reviewStatus: z.literal('needs-review'),
}).strict();
const supplement = z.object({
  id, version: z.string().regex(/^\d+(?:\.\d+)*$/), questionId: id, questionContentVersion: id,
  body: meaningfulBlocks.refine((blocks) => blocks.every((block) => block.type !== 'image'), '补充正文不可依赖题图'),
  sources: z.array(learningSourceSchema.extend({ role: z.enum(['question', 'answer']) })).min(1).max(2),
  authorship: z.literal('ai-assisted'), reviewStatus: z.literal('needs-review'),
}).strict();
const questionSupplementSchema = z.discriminatedUnion('kind', [
  supplement.extend({ kind: z.literal('supplement') }),
  supplement.extend({ kind: z.literal('erratum'), sectionId: id, originalExcerpt: z.string().trim().min(1).max(500) }),
]);
const baseSchema = z.object({
  id: z.literal('bitatlas-learning'), schemaVersion: z.literal(1), version: z.string().regex(/^\d+(?:\.\d+)*$/), sha256: z.string().regex(/^[a-f0-9]{64}$/), createdAt: z.iso.datetime(),
  concepts: z.array(z.object({
    id, subject: learningSubjectSchema, name: z.string().min(1).max(200), parentId: id.optional(),
    description: z.string().max(5000).optional(), level: z.enum(['subject', 'chapter', 'concept']),
  }).strict()).min(4).max(2000),
  mappings: z.array(z.object({
    questionId: id, questionContentVersion: id, subject: learningSubjectSchema, primaryConceptId: id,
    conceptIds: z.array(id).min(1).max(20), legacyNodeIds: z.array(id).max(20),
    source: learningSourceSchema, reviewStatus: z.literal('needs-review'),
  }).strict()).max(10000),
  cards: z.array(flashcardDefinitionSchema).max(2000),
  articles: z.array(articleSchema).max(2000).optional(),
}).strict();
export const learningPackSchema = z.discriminatedUnion('schemaVersion', [
  baseSchema, baseSchema.extend({ schemaVersion: z.literal(2), questionSupplements: z.array(questionSupplementSchema).max(10000) }),
]);

export function legacyLearningPack(pack: LearningPack): LearningPack {
  if (pack.schemaVersion === 1 && !pack.articles?.some((a) => a.labPath && !legacyLabPaths.includes(a.labPath))) return pack;
  const base = { ...pack, schemaVersion: 1 as const };
  if ('questionSupplements' in base) Reflect.deleteProperty(base, 'questionSupplements');
  if (pack.articles) base.articles = pack.articles.map((article) => {
    if (!article.labPath || legacyLabPaths.includes(article.labPath)) return article;
    const rest = { ...article };
    delete rest.labPath;
    return rest;
  });
  return { ...base, sha256: computeLearningPackHash(base) };
}

export function supplementBlockers(pack: LearningPack, questions: Map<string, Question>, prior?: LearningPack): string[] {
  if (pack.schemaVersion === 1) return [];
  const blockers: string[] = [];
  const previous = new Map(prior?.schemaVersion === 2 ? prior.questionSupplements.map((s) => [s.id, s]) : []);
  for (const s of pack.questionSupplements) {
    const q = questions.get(s.questionId);
    if (!q || q.contentVersion !== s.questionContentVersion) {
      blockers.push(`${s.id} 题目不存在或版本不符`);
      continue;
    }
    for (const source of s.sources) {
      const doc = q.source[source.role];
      if (source.documentSha256 !== doc.sha256 || source.locator !== doc.locator || canonicalSerialize(source.pages) !== canonicalSerialize(doc.pages)) {
        blockers.push(`${s.id} ${source.role} 来源不符`);
      }
    }
    if (s.kind === 'supplement' && !questionAvailability(q).explanationMissing) blockers.push(`${s.id} 原解析未缺失`);
    if (s.kind === 'erratum' && !q.explanation.find((section) => section.id === s.sectionId)?.content
      .some((block) => block.type === 'text' && block.text.includes(s.originalExcerpt))) blockers.push(`${s.id} 原段或引文不符`);
    const old = previous.get(s.id);
    if (old && canonicalSerialize(old) !== canonicalSerialize(s) && s.version.localeCompare(old.version, 'en', { numeric: true }) <= 0) {
      blockers.push(`${s.id} 修改须提升条目版本`);
    }
  }
  return blockers;
}

export function computeLearningPackHash(pack: LearningPack): string {
  const { sha256: _digest, ...body } = pack;
  void _digest;
  return sha256(canonicalSerialize(body));
}
export function parseLearningPack(input: unknown): LearningPack {
  const pack = learningPackSchema.parse(input) as LearningPack;
  if (pack.sha256 !== computeLearningPackHash(pack)) throw new Error('学习包摘要不匹配');
  const validation = validateCanonicalTaxonomyMappings(pack.concepts, pack.mappings.map((item) => ({
    questionId: item.questionId, knowledgePointIds: item.conceptIds,
  })));
  if (!validation.success) throw new Error(validation.issues.map((issue) => issue.message).join('\n'));
  const concepts = new Map(pack.concepts.map((concept) => [concept.id, concept]));
  const mappings = new Map(pack.mappings.map((mapping) => [mapping.questionId, mapping]));
  if (pack.schemaVersion === 2) {
    const ids = new Set<string>();
    const bound = new Set<string>();
    for (const s of pack.questionSupplements) {
      if (ids.has(s.id) || bound.has(s.questionId)) throw new Error('补充条目或题目绑定重复');
      ids.add(s.id);
      bound.add(s.questionId);
      if (mappings.get(s.questionId)?.questionContentVersion !== s.questionContentVersion) throw new Error('补充条目的映射版本不符');
      const roles = new Set(s.sources.map((source) => source.role));
      if (roles.size !== s.sources.length || !roles.has('answer') || (s.kind === 'supplement' && !roles.has('question'))
        || s.sources.some((source) => source.questionId !== s.questionId || source.questionContentVersion !== s.questionContentVersion)) {
        throw new Error('补充条目来源不完整或绑定不符');
      }
    }
  }
  const aliases = new Map<string, string>();
  for (const concept of pack.concepts) {
    if (concept.level === 'concept' && (/^(?:topic-\d{4}-q|cn408-)/.test(concept.id) || /^第\s*\d+\s*题/.test(concept.name))) throw new Error('题号不能作为概念');
    const parent = concept.parentId ? concepts.get(concept.parentId) : undefined;
    if ((concept.level === 'subject' && parent) || (concept.level === 'chapter' && parent?.level !== 'subject')
      || (concept.level === 'concept' && parent?.level !== 'chapter')) throw new Error(`概念层级不合法：${concept.id}`);
  }
  for (const mapping of pack.mappings) {
    if (!mapping.conceptIds.includes(mapping.primaryConceptId)) throw new Error('主概念不在映射中');
    if (mapping.source.questionId !== mapping.questionId || mapping.source.questionContentVersion !== mapping.questionContentVersion) throw new Error('映射来源版本不一致');
    for (const conceptId of mapping.conceptIds) {
      if (concepts.get(conceptId)?.level !== 'concept' || concepts.get(conceptId)?.subject !== mapping.subject) throw new Error('映射科目或层级不一致');
    }
    for (const alias of mapping.legacyNodeIds) {
      if (aliases.has(alias) && aliases.get(alias) !== mapping.primaryConceptId) throw new Error('旧节点别名冲突');
      aliases.set(alias, mapping.primaryConceptId);
    }
  }
  const ids = new Set<string>();
  for (const card of pack.cards) {
    if (ids.has(card.id)) throw new Error('重复卡片 ID');
    ids.add(card.id);
    if (!card.sources.length) throw new Error('公共卡片缺少来源');
    for (const conceptId of card.conceptIds) {
      if (concepts.get(conceptId)?.level !== 'concept' || concepts.get(conceptId)?.subject !== card.subject) throw new Error('卡片科目或概念不一致');
    }
    for (const source of card.sources) {
      const mapping = mappings.get(source.questionId);
      if (!mapping || mapping.questionContentVersion !== source.questionContentVersion
        || canonicalSerialize(mapping.source) !== canonicalSerialize(source)
        || !mapping.conceptIds.some((conceptId) => card.conceptIds.includes(conceptId))) throw new Error('卡片来源没有相应版本的概念映射');
    }
  }
  const articleIds = new Set<string>();
  const articleConcepts = new Set<string>();
  for (const article of pack.articles ?? []) {
    if (articleIds.has(article.id) || articleConcepts.has(article.conceptId)) throw new Error('重复概念讲解');
    articleIds.add(article.id); articleConcepts.add(article.conceptId);
    const concept = concepts.get(article.conceptId);
    if (concept?.level !== 'concept' || concept.subject !== article.subject) throw new Error('讲解概念不匹配');
    for (const questionId of article.questionIds) {
      if (!mappings.get(questionId)?.conceptIds.includes(article.conceptId)) throw new Error('讲解关联题目不匹配');
    }
    for (const cardId of article.cardIds) {
      if (!pack.cards.some((card) => card.id === cardId && card.conceptIds.includes(article.conceptId))) throw new Error('讲解关联卡片不匹配');
    }
    for (const source of article.sources) {
      if (!article.questionIds.includes(source.questionId)
        || canonicalSerialize(mappings.get(source.questionId)?.source) !== canonicalSerialize(source)) throw new Error('讲解来源或版本不匹配');
    }
    if (article.questionIds.some((questionId) => !article.sources.some((source) => source.questionId === questionId))) throw new Error('讲解关联题目缺少来源');
  }
  return pack;
}
