import type { KnowledgePoint } from '@408os/domain';
import { describe, expect, it } from 'vitest';
import {
  projectCanonicalTaxonomy,
  validateCanonicalTaxonomyMappings,
  validateCanonicalTaxonomyProjection,
  type QuestionKnowledgePointMapping,
} from './taxonomy';

const canonical: KnowledgePoint[] = [
  {
    id: 'kp-ds-tree-avl-balance-factor',
    subject: 'data-structures',
    name: 'AVL balance factor',
    parentId: 'kp-ds-tree-avl',
  },
  { id: 'subject-data-structures', subject: 'data-structures', name: 'Data structures' },
  {
    id: 'kp-ds-tree-binary-traversal',
    subject: 'data-structures',
    name: 'Binary tree traversal',
    parentId: 'kp-ds-tree',
  },
  {
    id: 'kp-ds-tree-avl',
    subject: 'data-structures',
    name: 'AVL trees',
    parentId: 'kp-ds-tree',
    description: 'Height-balanced binary search trees.',
  },
  {
    id: 'kp-ds-tree',
    subject: 'data-structures',
    name: 'Trees',
    parentId: 'subject-data-structures',
  },
];

const validMappings: QuestionKnowledgePointMapping[] = [
  {
    questionId: 'cn408-2009-q04',
    knowledgePointIds: ['kp-ds-tree-avl-balance-factor'],
  },
  {
    questionId: 'cn408-2009-q03',
    knowledgePointIds: ['kp-ds-tree-binary-traversal'],
  },
];

describe('canonical taxonomy projection', () => {
  it('rejects empty, duplicate, non-leaf, unknown, and ancestor-redundant mappings', () => {
    const result = validateCanonicalTaxonomyMappings(canonical, [
      { questionId: 'q-empty', knowledgePointIds: [] },
      {
        questionId: 'q-duplicate',
        knowledgePointIds: ['kp-ds-tree-avl-balance-factor', 'kp-ds-tree-avl-balance-factor'],
      },
      { questionId: 'q-non-leaf', knowledgePointIds: ['kp-ds-tree-avl'] },
      { questionId: 'q-unknown', knowledgePointIds: ['kp-missing'] },
      {
        questionId: 'q-redundant',
        knowledgePointIds: ['kp-ds-tree', 'kp-ds-tree-avl-balance-factor'],
      },
    ]);

    expect(result.success).toBe(false);
    expect(result.issues).toEqual(expect.arrayContaining([
      expect.objectContaining({ path: 'mappings.0.knowledgePointIds', message: expect.stringMatching(/at least one/iu) }),
      expect.objectContaining({ path: 'mappings.1.knowledgePointIds.1', message: expect.stringMatching(/duplicate/iu) }),
      expect.objectContaining({ path: 'mappings.2.knowledgePointIds.0', message: expect.stringMatching(/leaf/iu) }),
      expect.objectContaining({ path: 'mappings.3.knowledgePointIds.0', message: expect.stringMatching(/unknown/iu) }),
      expect.objectContaining({ path: 'mappings.4.knowledgePointIds', message: expect.stringMatching(/ancestor/iu) }),
    ]));
  });

  it('projects the referenced leaves and complete ancestor closure in stable order', () => {
    const first = projectCanonicalTaxonomy(canonical, validMappings);
    const second = projectCanonicalTaxonomy(
      [...canonical].reverse(),
      [...validMappings]
        .reverse()
        .map((mapping) => ({ ...mapping, knowledgePointIds: [...mapping.knowledgePointIds].reverse() })),
    );

    expect(first).toEqual(second);
    expect(first.knowledgePoints.map((point) => point.id)).toEqual([
      'kp-ds-tree',
      'kp-ds-tree-avl',
      'kp-ds-tree-avl-balance-factor',
      'kp-ds-tree-binary-traversal',
      'subject-data-structures',
    ]);
    expect(first.mappings.map((mapping) => mapping.questionId)).toEqual([
      'cn408-2009-q03',
      'cn408-2009-q04',
    ]);
    expect(validateCanonicalTaxonomyProjection(canonical, validMappings, first.knowledgePoints)).toEqual({
      success: true,
      issues: [],
    });
  });

  it('requires a supplied projection to contain every ancestor', () => {
    const result = validateCanonicalTaxonomyProjection(
      canonical,
      [validMappings[0]!],
      [canonical[0]!],
    );

    expect(result.success).toBe(false);
    expect(result.issues).toEqual(expect.arrayContaining([
      expect.objectContaining({ path: 'knowledgePoints.0.parentId', message: expect.stringMatching(/ancestor closure/iu) }),
      expect.objectContaining({ path: 'knowledgePoints', message: expect.stringMatching(/missing/iu) }),
    ]));
  });

  it('rejects definitions that drift from the canonical taxonomy and unstable ordering', () => {
    const projection = projectCanonicalTaxonomy(canonical, validMappings);
    const drifted = projection.knowledgePoints.map((point) => (
      point.id === 'kp-ds-tree-avl'
        ? { ...point, name: 'A different definition' }
        : point
    )).reverse();

    const result = validateCanonicalTaxonomyProjection(canonical, validMappings, drifted);

    expect(result.success).toBe(false);
    expect(result.issues.some((issue) => (
      /^knowledgePoints\.\d+$/u.test(issue.path) && /canonical definition/iu.test(issue.message)
    ))).toBe(true);
    expect(result.issues).toContainEqual({
      path: 'knowledgePoints',
      message: 'Projected knowledge points must use stable ascending id order.',
    });
  });

  it('rejects duplicate question mappings and structurally invalid canonical definitions', () => {
    const result = validateCanonicalTaxonomyMappings(
      [
        ...canonical,
        { ...canonical[0]!, name: 'Conflicting duplicate' },
        {
          id: 'kp-cross-subject',
          subject: 'operating-systems',
          name: 'Cross-subject child',
          parentId: 'kp-ds-tree',
        },
      ],
      [validMappings[0]!, validMappings[0]!],
    );

    expect(result.success).toBe(false);
    expect(result.issues).toEqual(expect.arrayContaining([
      expect.objectContaining({ path: 'canonicalKnowledgePoints.5.id', message: expect.stringMatching(/duplicate/iu) }),
      expect.objectContaining({ path: 'canonicalKnowledgePoints.6.parentId', message: expect.stringMatching(/same subject/iu) }),
      expect.objectContaining({ path: 'mappings.1.questionId', message: expect.stringMatching(/duplicate/iu) }),
    ]));
  });
});
