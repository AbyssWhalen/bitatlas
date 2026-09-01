import type { KnowledgePoint } from '@408os/domain';

export interface QuestionKnowledgePointMapping {
  questionId: string;
  knowledgePointIds: readonly string[];
}

export interface TaxonomyProjectionIssue {
  path: string;
  message: string;
}

export interface TaxonomyProjectionValidationResult {
  success: boolean;
  issues: TaxonomyProjectionIssue[];
}

export interface CanonicalTaxonomyProjection {
  knowledgePoints: KnowledgePoint[];
  mappings: Array<{ questionId: string; knowledgePointIds: string[] }>;
}

interface IndexedKnowledgePoint {
  point: KnowledgePoint;
  index: number;
}

interface CanonicalTaxonomyIndex {
  byId: Map<string, IndexedKnowledgePoint>;
  childrenById: Map<string, string[]>;
  issues: TaxonomyProjectionIssue[];
}

function compareIds(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function definitionsMatch(left: KnowledgePoint, right: KnowledgePoint): boolean {
  return left.id === right.id
    && left.subject === right.subject
    && left.name === right.name
    && left.parentId === right.parentId
    && left.description === right.description;
}

function indexCanonicalTaxonomy(points: readonly KnowledgePoint[]): CanonicalTaxonomyIndex {
  const issues: TaxonomyProjectionIssue[] = [];
  const byId = new Map<string, IndexedKnowledgePoint>();
  const childrenById = new Map<string, string[]>();

  for (const [index, point] of points.entries()) {
    if (byId.has(point.id)) {
      issues.push({
        path: `canonicalKnowledgePoints.${index}.id`,
        message: `Duplicate canonical knowledge point id ${point.id}.`,
      });
      continue;
    }
    byId.set(point.id, { point, index });
  }

  for (const { point, index } of byId.values()) {
    if (!point.parentId) continue;
    const parent = byId.get(point.parentId)?.point;
    if (!parent) {
      issues.push({
        path: `canonicalKnowledgePoints.${index}.parentId`,
        message: `Canonical knowledge point ${point.id} has unknown parent ${point.parentId}.`,
      });
      continue;
    }
    if (parent.subject !== point.subject) {
      issues.push({
        path: `canonicalKnowledgePoints.${index}.parentId`,
        message: `Canonical knowledge point ${point.id} and parent ${parent.id} must have the same subject.`,
      });
    }
    const children = childrenById.get(parent.id) ?? [];
    children.push(point.id);
    childrenById.set(parent.id, children);
  }

  const visitState = new Map<string, 'visiting' | 'visited'>();
  const stack: string[] = [];
  const visit = (pointId: string): void => {
    if (visitState.get(pointId) === 'visited') return;
    visitState.set(pointId, 'visiting');
    stack.push(pointId);
    const entry = byId.get(pointId)!;
    const parentId = entry.point.parentId;
    if (parentId && byId.has(parentId)) {
      if (visitState.get(parentId) === 'visiting') {
        const cycleStart = stack.indexOf(parentId);
        issues.push({
          path: `canonicalKnowledgePoints.${entry.index}.parentId`,
          message: `Canonical taxonomy contains a cycle: ${[...stack.slice(cycleStart), parentId].join(' -> ')}.`,
        });
      } else {
        visit(parentId);
      }
    }
    stack.pop();
    visitState.set(pointId, 'visited');
  };
  for (const pointId of byId.keys()) visit(pointId);

  for (const children of childrenById.values()) children.sort(compareIds);
  return { byId, childrenById, issues };
}

function isAncestor(
  possibleAncestorId: string,
  pointId: string,
  byId: ReadonlyMap<string, IndexedKnowledgePoint>,
): boolean {
  const visited = new Set<string>();
  let currentId: string | undefined = pointId;
  while (currentId && !visited.has(currentId)) {
    visited.add(currentId);
    const parentId: string | undefined = byId.get(currentId)?.point.parentId;
    if (parentId === possibleAncestorId) return true;
    currentId = parentId;
  }
  return false;
}

function validateMappings(
  mappings: readonly QuestionKnowledgePointMapping[],
  index: CanonicalTaxonomyIndex,
): TaxonomyProjectionIssue[] {
  const issues: TaxonomyProjectionIssue[] = [];
  const questionIds = new Set<string>();

  for (const [mappingIndex, mapping] of mappings.entries()) {
    if (questionIds.has(mapping.questionId)) {
      issues.push({
        path: `mappings.${mappingIndex}.questionId`,
        message: `Duplicate mapping for question ${mapping.questionId}.`,
      });
    }
    questionIds.add(mapping.questionId);

    if (mapping.knowledgePointIds.length === 0) {
      issues.push({
        path: `mappings.${mappingIndex}.knowledgePointIds`,
        message: `Question ${mapping.questionId} must map to at least one canonical leaf.`,
      });
      continue;
    }

    const seen = new Set<string>();
    const knownUniqueIds: string[] = [];
    for (const [pointIndex, pointId] of mapping.knowledgePointIds.entries()) {
      if (seen.has(pointId)) {
        issues.push({
          path: `mappings.${mappingIndex}.knowledgePointIds.${pointIndex}`,
          message: `Duplicate knowledge point ${pointId} in question ${mapping.questionId}.`,
        });
        continue;
      }
      seen.add(pointId);
      const canonical = index.byId.get(pointId);
      if (!canonical) {
        issues.push({
          path: `mappings.${mappingIndex}.knowledgePointIds.${pointIndex}`,
          message: `Question ${mapping.questionId} references unknown canonical knowledge point ${pointId}.`,
        });
        continue;
      }
      knownUniqueIds.push(pointId);
      if ((index.childrenById.get(pointId)?.length ?? 0) > 0) {
        issues.push({
          path: `mappings.${mappingIndex}.knowledgePointIds.${pointIndex}`,
          message: `Question ${mapping.questionId} must reference a leaf, but ${pointId} has children.`,
        });
      }
    }

    for (let leftIndex = 0; leftIndex < knownUniqueIds.length; leftIndex += 1) {
      for (let rightIndex = leftIndex + 1; rightIndex < knownUniqueIds.length; rightIndex += 1) {
        const left = knownUniqueIds[leftIndex]!;
        const right = knownUniqueIds[rightIndex]!;
        const ancestor = isAncestor(left, right, index.byId)
          ? left
          : isAncestor(right, left, index.byId)
            ? right
            : undefined;
        if (ancestor) {
          issues.push({
            path: `mappings.${mappingIndex}.knowledgePointIds`,
            message: `Question ${mapping.questionId} redundantly maps both ancestor ${ancestor} and its descendant.`,
          });
        }
      }
    }
  }
  return issues;
}

export function validateCanonicalTaxonomyMappings(
  canonicalKnowledgePoints: readonly KnowledgePoint[],
  mappings: readonly QuestionKnowledgePointMapping[],
): TaxonomyProjectionValidationResult {
  const index = indexCanonicalTaxonomy(canonicalKnowledgePoints);
  const issues = [...index.issues, ...validateMappings(mappings, index)];
  return { success: issues.length === 0, issues };
}

function requiredKnowledgePointIds(
  mappings: readonly QuestionKnowledgePointMapping[],
  byId: ReadonlyMap<string, IndexedKnowledgePoint>,
): Set<string> {
  const required = new Set<string>();
  for (const mapping of mappings) {
    for (const mappedId of mapping.knowledgePointIds) {
      let currentId: string | undefined = mappedId;
      while (currentId && !required.has(currentId)) {
        required.add(currentId);
        currentId = byId.get(currentId)?.point.parentId;
      }
    }
  }
  return required;
}

export function projectCanonicalTaxonomy(
  canonicalKnowledgePoints: readonly KnowledgePoint[],
  mappings: readonly QuestionKnowledgePointMapping[],
): CanonicalTaxonomyProjection {
  const index = indexCanonicalTaxonomy(canonicalKnowledgePoints);
  const issues = [...index.issues, ...validateMappings(mappings, index)];
  if (issues.length > 0) {
    throw new Error(`Canonical taxonomy projection failed:\n${issues.map((issue) => `${issue.path}: ${issue.message}`).join('\n')}`);
  }

  const requiredIds = [...requiredKnowledgePointIds(mappings, index.byId)].sort(compareIds);
  return {
    knowledgePoints: requiredIds.map((id) => ({ ...index.byId.get(id)!.point })),
    mappings: [...mappings]
      .sort((left, right) => compareIds(left.questionId, right.questionId))
      .map((mapping) => ({
        questionId: mapping.questionId,
        knowledgePointIds: [...mapping.knowledgePointIds].sort(compareIds),
      })),
  };
}

export function validateCanonicalTaxonomyProjection(
  canonicalKnowledgePoints: readonly KnowledgePoint[],
  mappings: readonly QuestionKnowledgePointMapping[],
  knowledgePoints: readonly KnowledgePoint[],
): TaxonomyProjectionValidationResult {
  const canonicalIndex = indexCanonicalTaxonomy(canonicalKnowledgePoints);
  const issues = [...canonicalIndex.issues, ...validateMappings(mappings, canonicalIndex)];
  const projectedById = new Map<string, IndexedKnowledgePoint>();

  for (const [index, point] of knowledgePoints.entries()) {
    if (projectedById.has(point.id)) {
      issues.push({
        path: `knowledgePoints.${index}.id`,
        message: `Duplicate projected knowledge point id ${point.id}.`,
      });
      continue;
    }
    projectedById.set(point.id, { point, index });
    const canonical = canonicalIndex.byId.get(point.id)?.point;
    if (!canonical) {
      issues.push({
        path: `knowledgePoints.${index}`,
        message: `Projected knowledge point ${point.id} is not in the canonical taxonomy.`,
      });
    } else if (!definitionsMatch(point, canonical)) {
      issues.push({
        path: `knowledgePoints.${index}`,
        message: `Projected knowledge point ${point.id} does not match its canonical definition.`,
      });
    }
  }

  for (const { point, index } of projectedById.values()) {
    if (point.parentId && !projectedById.has(point.parentId)) {
      issues.push({
        path: `knowledgePoints.${index}.parentId`,
        message: `Projected knowledge point ${point.id} is missing parent ${point.parentId} from its ancestor closure.`,
      });
    }
  }

  const actualIds = [...projectedById.keys()];
  const stableIds = [...actualIds].sort(compareIds);
  if (actualIds.some((id, index) => id !== stableIds[index])) {
    issues.push({
      path: 'knowledgePoints',
      message: 'Projected knowledge points must use stable ascending id order.',
    });
  }

  if (canonicalIndex.issues.length === 0 && validateMappings(mappings, canonicalIndex).length === 0) {
    const requiredIds = requiredKnowledgePointIds(mappings, canonicalIndex.byId);
    const missingIds = [...requiredIds].filter((id) => !projectedById.has(id)).sort(compareIds);
    const unusedIds = actualIds.filter((id) => !requiredIds.has(id)).sort(compareIds);
    if (missingIds.length > 0) {
      issues.push({
        path: 'knowledgePoints',
        message: `Projected taxonomy is missing required knowledge points: ${missingIds.join(', ')}.`,
      });
    }
    if (unusedIds.length > 0) {
      issues.push({
        path: 'knowledgePoints',
        message: `Projected taxonomy contains knowledge points not required by the mappings: ${unusedIds.join(', ')}.`,
      });
    }
  }

  return { success: issues.length === 0, issues };
}
