import {
  sourcePageAssetId,
  type AssetRef,
  type ContentBlock,
  type ContentPack,
  type KnowledgePoint,
} from '@408os/domain';
import { computeContentPackHash } from './hash';
import { contentPackSchema } from './schema';

export interface ContentIssue {
  path: string;
  message: string;
}

export interface ContentValidationResult {
  success: boolean;
  issues: ContentIssue[];
}

export interface ValidationOptions {
  requireVerified?: boolean;
  enforceExamShape?: boolean;
  verifyHash?: boolean;
}

interface ContentRoot {
  path: string;
  value: unknown;
}

const VERIFIED_PLACEHOLDERS = [
  /内容待核对/u,
  /图示选项[^。；\n]*请查看原卷/u,
  /\b(?:TODO|TBD|PLACEHOLDER)\b/iu,
];

function walkContent(
  value: unknown,
  path: string,
  visitImage: (block: Extract<ContentBlock, { type: 'image' }>, path: string) => void,
  visitText: (text: string, path: string) => void,
): void {
  if (typeof value === 'string') {
    visitText(value, path);
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) => walkContent(item, `${path}.${index}`, visitImage, visitText));
    return;
  }
  if (value === null || typeof value !== 'object') return;

  if ('type' in value && value.type === 'image' && 'assetId' in value && typeof value.assetId === 'string') {
    visitImage(value as Extract<ContentBlock, { type: 'image' }>, path);
  }
  for (const [key, item] of Object.entries(value)) {
    walkContent(item, `${path}.${key}`, visitImage, visitText);
  }
}

function contentRoots(pack: ContentPack, questionIndex: number): ContentRoot[] {
  const question = pack.questions[questionIndex]!;
  const roots: ContentRoot[] = [
    { path: `questions.${questionIndex}.stem`, value: question.stem },
    { path: `questions.${questionIndex}.options`, value: question.options ?? [] },
    { path: `questions.${questionIndex}.explanation`, value: question.explanation },
    { path: `questions.${questionIndex}.hints`, value: question.hints },
  ];
  if (question.answer.type === 'comprehensive') {
    roots.push(
      { path: `questions.${questionIndex}.answer.reference`, value: question.answer.reference },
      { path: `questions.${questionIndex}.answer.rubric`, value: question.answer.rubric },
    );
  }
  return roots;
}

export function validateContentPack(input: unknown, options: ValidationOptions = {}): ContentValidationResult {
  const parsed = contentPackSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      issues: parsed.error.issues.map((issue) => ({ path: issue.path.join('.'), message: issue.message })),
    };
  }

  const pack = parsed.data as ContentPack;
  const issues: ContentIssue[] = [];
  const add = (path: string, message: string) => issues.push({ path, message });
  const ids = new Set<string>();
  const numbers = new Set<number>();
  const knowledgePointIds = new Set<string>();
  const knowledgePointsById = new Map<string, { point: KnowledgePoint; index: number }>();
  const assetIds = new Set<string>();
  const assetPaths = new Set<string>();
  const assetsById = new Map<string, AssetRef>();

  if (options.verifyHash !== false && computeContentPackHash(pack) !== pack.manifest.sha256.toLowerCase()) {
    add('manifest.sha256', 'Manifest hash does not match the canonical content pack hash.');
  }

  if (pack.manifest.questionCount !== pack.questions.length) {
    add('manifest.questionCount', 'Manifest count does not match the number of questions.');
  }

  for (const [index, point] of pack.knowledgePoints.entries()) {
    if (knowledgePointIds.has(point.id)) {
      add(`knowledgePoints.${index}.id`, `Duplicate knowledge point id ${point.id}.`);
    } else {
      knowledgePointsById.set(point.id, { point, index });
    }
    knowledgePointIds.add(point.id);
  }

  for (const [index, point] of pack.knowledgePoints.entries()) {
    if (!point.parentId) continue;
    const parent = knowledgePointsById.get(point.parentId)?.point;
    if (!parent) {
      add(`knowledgePoints.${index}.parentId`, `Knowledge point ${point.id} has unknown parent ${point.parentId}.`);
    } else if (parent.subject !== point.subject) {
      add(
        `knowledgePoints.${index}.parentId`,
        `Knowledge point ${point.id} and parent ${parent.id} must have the same subject.`,
      );
    }
  }

  const knowledgePointVisitState = new Map<string, 'visiting' | 'visited'>();
  const knowledgePointStack: string[] = [];
  const visitKnowledgePoint = (pointId: string): void => {
    if (knowledgePointVisitState.get(pointId) === 'visited') return;
    knowledgePointVisitState.set(pointId, 'visiting');
    knowledgePointStack.push(pointId);

    const current = knowledgePointsById.get(pointId)!;
    const parentId = current.point.parentId;
    if (parentId && knowledgePointsById.has(parentId)) {
      if (knowledgePointVisitState.get(parentId) === 'visiting') {
        const cycleStart = knowledgePointStack.indexOf(parentId);
        const cycle = [...knowledgePointStack.slice(cycleStart), parentId];
        add(
          `knowledgePoints.${current.index}.parentId`,
          `Knowledge point hierarchy contains a cycle: ${cycle.join(' -> ')}.`,
        );
      } else {
        visitKnowledgePoint(parentId);
      }
    }

    knowledgePointStack.pop();
    knowledgePointVisitState.set(pointId, 'visited');
  };
  for (const pointId of knowledgePointsById.keys()) visitKnowledgePoint(pointId);

  const assetIdNamespace = `${pack.manifest.id}-`;
  const assetPathNamespace = `/content/${pack.manifest.id}/`;
  for (const [index, asset] of pack.assets.entries()) {
    if (assetIds.has(asset.id)) add(`assets.${index}.id`, `Duplicate asset id ${asset.id}.`);
    if (assetPaths.has(asset.path)) add(`assets.${index}.path`, `Duplicate asset path ${asset.path}.`);
    if (!asset.id.startsWith(assetIdNamespace)) {
      add(`assets.${index}.id`, `Asset id must start with the pack namespace ${assetIdNamespace}.`);
    }
    if (!asset.path.startsWith(assetPathNamespace)) {
      add(`assets.${index}.path`, `Asset path must be inside ${assetPathNamespace}.`);
    }
    assetIds.add(asset.id);
    assetPaths.add(asset.path);
    assetsById.set(asset.id, asset);
  }

  for (const [index, question] of pack.questions.entries()) {
    if (ids.has(question.id)) add(`questions.${index}.id`, `Duplicate question id ${question.id}.`);
    if (numbers.has(question.number)) add(`questions.${index}.number`, `Duplicate question number ${question.number}.`);
    ids.add(question.id);
    numbers.add(question.number);

    if (options.enforceExamShape) {
      const expectedQuestionId = `cn408-${pack.manifest.year}-q${String(question.number).padStart(2, '0')}`;
      if (question.id !== expectedQuestionId) {
        add(`questions.${index}.id`, `Question id must be ${expectedQuestionId}.`);
      }
    }
    if (question.year !== pack.manifest.year) add(`questions.${index}.year`, 'Question year differs from manifest.');
    if (question.source.question.pages.length === 0) add(`questions.${index}.source.question.pages`, 'Question PDF page is required.');
    if (question.source.answer.pages.length === 0) add(`questions.${index}.source.answer.pages`, 'Answer PDF page is required.');
    for (const [document, source] of [
      ['questions', question.source.question],
      ['answers', question.source.answer],
    ] as const) {
      source.pages.forEach((page, pageIndex) => {
        const expectedAssetId = sourcePageAssetId(pack.manifest.id, document, page);
        const sourceAsset = assetsById.get(expectedAssetId);
        const issuePath = `questions.${index}.source.${document === 'questions' ? 'question' : 'answer'}.pages.${pageIndex}`;
        if (!sourceAsset) {
          add(issuePath, `Source page asset ${expectedAssetId} is missing.`);
          return;
        }
        if (!sourceAsset.mimeType.startsWith('image/')) {
          add(issuePath, `Source page asset ${expectedAssetId} must be an image.`);
        }
        if (sourceAsset.sourcePage !== page) {
          add(issuePath, `Source page asset ${expectedAssetId} must declare sourcePage ${page}.`);
        }
      });
    }
    if (question.contentVersion !== pack.manifest.contentVersion) {
      add(`questions.${index}.contentVersion`, 'Question content version differs from manifest.');
    }
    if (options.requireVerified && question.reviewStatus !== 'verified') {
      add(`questions.${index}.reviewStatus`, 'Question has not been manually verified.');
    }
    for (const [pointIndex, pointId] of question.knowledgePointIds.entries()) {
      if (!knowledgePointIds.has(pointId)) {
        add(`questions.${index}.knowledgePointIds`, `Unknown knowledge point ${pointId}.`);
        continue;
      }
      const point = knowledgePointsById.get(pointId)?.point;
      if (point && point.subject !== question.subject) {
        add(
          `questions.${index}.knowledgePointIds.${pointIndex}`,
          `Question ${question.id} and knowledge point ${point.id} must have the same subject.`,
        );
      }
    }
    for (const assetId of question.assetIds) {
      if (!assetIds.has(assetId)) add(`questions.${index}.assetIds`, `Unknown asset ${assetId}.`);
    }

    const declaredQuestionAssets = new Set(question.assetIds);
    for (const root of contentRoots(pack, index)) {
      walkContent(
        root.value,
        root.path,
        (block, blockPath) => {
          if (!assetIds.has(block.assetId)) {
            add(`${blockPath}.assetId`, `Image references unknown asset ${block.assetId}.`);
          }
          if (!declaredQuestionAssets.has(block.assetId)) {
            add(`${blockPath}.assetId`, `Image asset ${block.assetId} must be listed in question.assetIds.`);
          }
        },
        (text, textPath) => {
          if (question.reviewStatus !== 'verified') return;
          const placeholder = VERIFIED_PLACEHOLDERS.find((pattern) => pattern.test(text));
          if (placeholder) add(textPath, 'Verified content contains placeholder text.');
        },
      );
    }

    if (question.answer.type === 'comprehensive') {
      const rubricPoints = question.answer.rubric.reduce((total, item) => total + item.points, 0);
      if (Math.abs(rubricPoints - question.answer.maxScore) > 1e-9) {
        add(
          `questions.${index}.answer.rubric`,
          `Comprehensive rubric points (${rubricPoints}) must equal maxScore (${question.answer.maxScore}).`,
        );
      }
    }
  }

  if (options.requireVerified && pack.manifest.reviewStatus !== 'verified') {
    add('manifest.reviewStatus', 'Content pack has not been manually verified.');
  }

  if (options.enforceExamShape && pack.manifest.year === 2009) {
    const expected = Array.from({ length: 47 }, (_, index) => index + 1);
    if (pack.questions.length !== 47) add('questions', 'The 2009 pack must contain exactly 47 questions.');
    for (const number of expected) {
      if (!numbers.has(number)) add('questions', `Missing question ${number}.`);
    }
    for (const question of pack.questions) {
      const expectedKind = question.number <= 40 ? 'single-choice' : 'comprehensive';
      if (question.kind !== expectedKind) add(`questions.${question.number}.kind`, `Question ${question.number} has the wrong kind.`);
    }
  }

  return { success: issues.length === 0, issues };
}

export function parseContentPack(input: unknown): ContentPack {
  return contentPackSchema.parse(input) as ContentPack;
}
