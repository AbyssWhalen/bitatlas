import type { ContentPack, Question } from '@408os/domain';
import { describe, expect, it } from 'vitest';
import { computeContentPackHash } from './hash';
import { validateContentPack } from './validate';

function createQuestion(number: number): Question {
  const shared = {
    id: `cn408-2009-q${String(number).padStart(2, '0')}`,
    year: 2009,
    number,
    subject: 'data-structures' as const,
    stem: [{ type: 'text' as const, text: `Question ${number}` }],
    explanation: [],
    hints: [],
    knowledgePointIds: [],
    assetIds: [],
    source: {
      question: {
        publisher: 'source',
        title: 'questions',
        url: 'https://example.com/source.pdf',
        fileName: 'source.pdf',
        sha256: 'b'.repeat(64),
        pages: [1],
        locator: 'PDF page 1',
      },
      answer: {
        publisher: 'source',
        title: 'answers',
        url: 'https://example.com/answers.pdf',
        fileName: 'answers.pdf',
        sha256: 'c'.repeat(64),
        pages: [1],
        locator: 'PDF page 1',
      },
      crosschecks: [],
      redistribution: 'unknown' as const,
    },
    contentVersion: '2009.1',
    reviewStatus: 'needs-review' as const,
  };

  if (number <= 40) {
    return {
      ...shared,
      kind: 'single-choice',
      options: ['A', 'B', 'C', 'D'].map((id) => ({
        id: id as 'A' | 'B' | 'C' | 'D',
        content: [{ type: 'text' as const, text: id }],
      })),
      answer: { type: 'choice', optionId: 'A' },
    };
  }

  return {
    ...shared,
    kind: 'comprehensive',
    answer: {
      type: 'comprehensive',
      maxScore: 10,
      rubric: [{ id: `q${number}-r1`, description: 'Reference criterion', points: 10 }],
      reference: [{ type: 'text', text: `Reference answer ${number}` }],
    },
  };
}

function createExamPack(): ContentPack {
  const pack: ContentPack = {
    manifest: {
      id: 'cn408-2009',
      schemaVersion: 1,
      contentVersion: '2009.1',
      title: '2009',
      year: 2009,
      questionCount: 47,
      createdAt: '2026-08-05T00:00:00.000Z',
      sha256: '0'.repeat(64),
      reviewStatus: 'needs-review',
    },
    questions: Array.from({ length: 47 }, (_, index) => createQuestion(index + 1)),
    knowledgePoints: [],
    assets: [
      {
        id: 'cn408-2009-source-questions-page-1',
        path: '/content/cn408-2009/source/questions-1.png',
        mimeType: 'image/png',
        sha256: 'd'.repeat(64),
        sourcePage: 1,
      },
      {
        id: 'cn408-2009-source-answers-page-1',
        path: '/content/cn408-2009/source/answers-1.png',
        mimeType: 'image/png',
        sha256: 'e'.repeat(64),
        sourcePage: 1,
      },
    ],
  };
  pack.manifest.sha256 = computeContentPackHash(pack);
  return pack;
}

function reseal(pack: ContentPack): ContentPack {
  pack.manifest.sha256 = computeContentPackHash(pack);
  return pack;
}

describe('content pack validation', () => {
  it('reports structural and 2009 exam-shape failures', () => {
    const pack = createExamPack();
    pack.questions = [pack.questions[0]!];
    pack.manifest.questionCount = 1;

    const result = validateContentPack(reseal(pack), { requireVerified: true, enforceExamShape: true });

    expect(result.success).toBe(false);
    expect(result.issues.some((issue) => issue.message.includes('47 questions'))).toBe(true);
    expect(result.issues.some((issue) => issue.message.includes('manually verified'))).toBe(true);
  });

  it('accepts the canonical ids of a complete 47-question exam pack', () => {
    expect(validateContentPack(createExamPack(), { enforceExamShape: true })).toEqual({ success: true, issues: [] });
  });

  it('rejects source pages that are missing from the pack asset registry', () => {
    const pack = createExamPack();
    pack.assets = pack.assets.filter((asset) => asset.id !== 'cn408-2009-source-questions-page-1');
    const result = validateContentPack(reseal(pack), { enforceExamShape: true });

    expect(result.issues).toContainEqual({
      path: 'questions.0.source.question.pages.0',
      message: 'Source page asset cn408-2009-source-questions-page-1 is missing.',
    });
  });

  it('rejects source page assets with the wrong media type or source page metadata', () => {
    const pack = createExamPack();
    const asset = pack.assets.find((entry) => entry.id === 'cn408-2009-source-answers-page-1')!;
    asset.mimeType = 'application/pdf';
    asset.sourcePage = 2;
    const issues = validateContentPack(reseal(pack), { enforceExamShape: true }).issues;

    expect(issues).toContainEqual({
      path: 'questions.0.source.answer.pages.0',
      message: 'Source page asset cn408-2009-source-answers-page-1 must be an image.',
    });
    expect(issues).toContainEqual({
      path: 'questions.0.source.answer.pages.0',
      message: 'Source page asset cn408-2009-source-answers-page-1 must declare sourcePage 1.',
    });
  });

  it('rejects a question id carrying a year different from the manifest', () => {
    const pack = createExamPack();
    pack.questions[0]!.id = 'cn408-2010-q01';

    expect(validateContentPack(reseal(pack), { enforceExamShape: true }).issues).toContainEqual({
      path: 'questions.0.id',
      message: 'Question id must be cn408-2009-q01.',
    });
  });

  it('rejects a question id whose numeric suffix differs from question.number', () => {
    const pack = createExamPack();
    pack.questions[0]!.id = 'cn408-2009-q02';

    expect(validateContentPack(reseal(pack), { enforceExamShape: true }).issues).toContainEqual({
      path: 'questions.0.id',
      message: 'Question id must be cn408-2009-q01.',
    });
  });

  it('rejects a question id without two-digit zero padding', () => {
    const pack = createExamPack();
    pack.questions[0]!.id = 'cn408-2009-q1';

    const result = validateContentPack(reseal(pack), { enforceExamShape: true });

    expect(result.success).toBe(false);
    expect(result.issues.some((issue) => issue.path === 'questions.0.id')).toBe(true);
  });

  it('rejects a knowledge point whose parent does not exist', () => {
    const pack = createExamPack();
    pack.knowledgePoints = [
      {
        id: 'cn408-2009-kp-child',
        subject: 'data-structures',
        name: 'child',
        parentId: 'cn408-2009-kp-missing',
      },
    ];

    expect(validateContentPack(reseal(pack)).issues).toContainEqual({
      path: 'knowledgePoints.0.parentId',
      message: 'Knowledge point cn408-2009-kp-child has unknown parent cn408-2009-kp-missing.',
    });
  });

  it('rejects a knowledge point whose parent belongs to another subject', () => {
    const pack = createExamPack();
    pack.knowledgePoints = [
      { id: 'cn408-2009-kp-parent', subject: 'operating-systems', name: 'parent' },
      {
        id: 'cn408-2009-kp-child',
        subject: 'data-structures',
        name: 'child',
        parentId: 'cn408-2009-kp-parent',
      },
    ];

    expect(validateContentPack(reseal(pack)).issues).toContainEqual({
      path: 'knowledgePoints.1.parentId',
      message: 'Knowledge point cn408-2009-kp-child and parent cn408-2009-kp-parent must have the same subject.',
    });
  });

  it('rejects cycles in the knowledge point hierarchy', () => {
    const pack = createExamPack();
    pack.knowledgePoints = [
      {
        id: 'cn408-2009-kp-a',
        subject: 'data-structures',
        name: 'a',
        parentId: 'cn408-2009-kp-b',
      },
      {
        id: 'cn408-2009-kp-b',
        subject: 'data-structures',
        name: 'b',
        parentId: 'cn408-2009-kp-a',
      },
    ];

    expect(validateContentPack(reseal(pack)).issues).toContainEqual({
      path: 'knowledgePoints.1.parentId',
      message: 'Knowledge point hierarchy contains a cycle: cn408-2009-kp-a -> cn408-2009-kp-b -> cn408-2009-kp-a.',
    });
  });

  it('rejects a question referencing a knowledge point from another subject', () => {
    const pack = createExamPack();
    pack.knowledgePoints = [
      { id: 'cn408-2009-kp-os', subject: 'operating-systems', name: 'operating systems' },
    ];
    pack.questions[0]!.knowledgePointIds = ['cn408-2009-kp-os'];

    expect(validateContentPack(reseal(pack)).issues).toContainEqual({
      path: 'questions.0.knowledgePointIds.0',
      message: 'Question cn408-2009-q01 and knowledge point cn408-2009-kp-os must have the same subject.',
    });
  });
});
