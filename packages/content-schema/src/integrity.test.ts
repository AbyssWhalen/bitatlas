import { createHash } from 'node:crypto';
import type { ContentBlock, ContentPack } from '@408os/domain';
import { describe, expect, it } from 'vitest';
import { canonicalSerialize, computeContentPackHash, verifyContentPackHash } from './hash';
import { contentBlockSchema, contentPackSchema } from './schema';
import { validateContentPack } from './validate';

const PACK_ID = 'cn408-2009';
const ASSET_ID = `${PACK_ID}-source-page-1`;

function imageBlock(): ContentBlock {
  return { type: 'image', assetId: ASSET_ID, alt: 'source diagram' };
}

function createPack(): ContentPack {
  return {
    manifest: {
      id: PACK_ID,
      schemaVersion: 1,
      contentVersion: '2009.1',
      title: '2009',
      year: 2009,
      questionCount: 1,
      createdAt: '2026-08-05T00:00:00.000Z',
      sha256: '0'.repeat(64),
      reviewStatus: 'needs-review',
    },
    questions: [
      {
        id: 'cn408-2009-q01',
        year: 2009,
        number: 1,
        subject: 'data-structures',
        kind: 'single-choice',
        stem: [{ type: 'text', text: 'test' }],
        options: ['A', 'B', 'C', 'D'].map((id) => ({
          id: id as 'A' | 'B' | 'C' | 'D',
          content: [{ type: 'text' as const, text: id }],
        })),
        answer: { type: 'choice', optionId: 'A' },
        explanation: [],
        hints: [],
        knowledgePointIds: [`${PACK_ID}-kp-root`],
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
          redistribution: 'unknown',
        },
        contentVersion: '2009.1',
        reviewStatus: 'needs-review',
      },
    ],
    knowledgePoints: [
      { id: `${PACK_ID}-kp-root`, subject: 'data-structures', name: 'root' },
    ],
    assets: [
      {
        id: `${PACK_ID}-source-questions-page-1`,
        path: `/content/${PACK_ID}/source/questions-1.png`,
        mimeType: 'image/png',
        sha256: '1'.repeat(64),
        sourcePage: 1,
      },
      {
        id: `${PACK_ID}-source-answers-page-1`,
        path: `/content/${PACK_ID}/source/answers-1.png`,
        mimeType: 'image/png',
        sha256: '2'.repeat(64),
        sourcePage: 1,
      },
    ],
  };
}

function seal(pack: ContentPack): ContentPack {
  pack.manifest.sha256 = computeContentPackHash(pack);
  return pack;
}

describe('canonical content pack hashing', () => {
  it('sorts object keys while preserving array order', () => {
    expect(canonicalSerialize({ z: [2, 1], a: { d: true, c: null } })).toBe(
      '{"a":{"c":null,"d":true},"z":[2,1]}',
    );
  });

  it('hashes every pack field except manifest.sha256', () => {
    const pack = createPack();
    const expectedPayload = {
      ...pack,
      manifest: {
        id: pack.manifest.id,
        schemaVersion: pack.manifest.schemaVersion,
        contentVersion: pack.manifest.contentVersion,
        title: pack.manifest.title,
        year: pack.manifest.year,
        questionCount: pack.manifest.questionCount,
        createdAt: pack.manifest.createdAt,
        reviewStatus: pack.manifest.reviewStatus,
      },
    };
    const expected = createHash('sha256').update(canonicalSerialize(expectedPayload)).digest('hex');

    expect(computeContentPackHash(pack)).toBe(expected);
    pack.manifest.sha256 = 'f'.repeat(64);
    expect(computeContentPackHash(pack)).toBe(expected);
    pack.manifest.title = '2009 年全国硕士研究生招生考试';
    expectedPayload.manifest.title = pack.manifest.title;
    expect(computeContentPackHash(pack)).toBe(
      createHash('sha256').update(canonicalSerialize(expectedPayload)).digest('hex'),
    );
  });

  it('verifies the hash by default during validation', () => {
    const pack = seal(createPack());
    expect(verifyContentPackHash(pack)).toBe(true);
    expect(validateContentPack(pack).success).toBe(true);

    pack.questions[0]!.stem = [{ type: 'text', text: 'tampered' }];
    expect(verifyContentPackHash(pack)).toBe(false);
    expect(validateContentPack(pack).issues).toContainEqual({
      path: 'manifest.sha256',
      message: 'Manifest hash does not match the canonical content pack hash.',
    });
  });
});

describe('content integrity validation', () => {
  it('requires every nested image reference to exist and be listed by its question', () => {
    const pack = createPack();
    const question = pack.questions[0]!;
    question.kind = 'comprehensive';
    question.options = [
      { id: 'A', content: [imageBlock()] },
      { id: 'B', content: [{ type: 'text', text: 'B' }] },
      { id: 'C', content: [{ type: 'text', text: 'C' }] },
      { id: 'D', content: [{ type: 'text', text: 'D' }] },
    ];
    question.stem = [imageBlock()];
    question.answer = {
      type: 'comprehensive',
      maxScore: 5,
      rubric: [{ id: 'r1', description: 'answer', points: 5 }],
      reference: [imageBlock()],
    };
    question.explanation = [{ id: 'e1', title: 'explanation', content: [imageBlock()] }];
    question.hints = [[imageBlock()]];

    const result = validateContentPack(seal(pack));
    const imageIssues = result.issues.filter((issue) => issue.path.endsWith('.assetId'));
    expect(imageIssues).toHaveLength(10);
    expect(imageIssues.every((issue) => issue.message.includes(ASSET_ID))).toBe(true);

    pack.assets.push({
      id: ASSET_ID,
      path: `/content/${PACK_ID}/source/page-1.png`,
      mimeType: 'image/png',
      sha256: 'd'.repeat(64),
      sourcePage: 1,
    });
    question.assetIds.push(ASSET_ID, `${PACK_ID}-extra-asset`);
    pack.assets.push({
      id: `${PACK_ID}-extra-asset`,
      path: `/content/${PACK_ID}/source/extra.png`,
      mimeType: 'image/png',
      sha256: 'e'.repeat(64),
      sourcePage: 1,
    });
    expect(validateContentPack(seal(pack)).issues.filter((issue) => issue.path.endsWith('.assetId'))).toEqual([]);
  });

  it('rejects duplicate ids, duplicate paths, and assets outside the pack namespace', () => {
    const pack = createPack();
    pack.knowledgePoints.push({ ...pack.knowledgePoints[0]! });
    pack.assets.push(
      {
        id: ASSET_ID,
        path: `/content/${PACK_ID}/source/page-1.png`,
        mimeType: 'image/png',
        sha256: 'd'.repeat(64),
        sourcePage: 1,
      },
      {
        id: ASSET_ID,
        path: `/content/${PACK_ID}/source/page-1.png`,
        mimeType: 'image/png',
        sha256: 'e'.repeat(64),
        sourcePage: 2,
      },
      {
        id: 'source-page-2',
        path: '/content/other-pack/source/page-2.png',
        mimeType: 'image/png',
        sha256: 'f'.repeat(64),
        sourcePage: 2,
      },
    );

    const messages = validateContentPack(seal(pack)).issues.map((issue) => issue.message);
    expect(messages).toContain(`Duplicate knowledge point id ${PACK_ID}-kp-root.`);
    expect(messages).toContain(`Duplicate asset id ${ASSET_ID}.`);
    expect(messages).toContain(`Duplicate asset path /content/${PACK_ID}/source/page-1.png.`);
    expect(messages).toContain(`Asset id must start with the pack namespace ${PACK_ID}-.`);
    expect(messages).toContain(`Asset path must be inside /content/${PACK_ID}/.`);
  });

  it('requires comprehensive rubric points to equal maxScore', () => {
    const pack = createPack();
    const question = pack.questions[0]!;
    question.kind = 'comprehensive';
    question.answer = {
      type: 'comprehensive',
      maxScore: 10,
      rubric: [
        { id: 'r1', description: 'first', points: 4 },
        { id: 'r2', description: 'second', points: 5 },
      ],
      reference: [{ type: 'text', text: 'answer' }],
    };

    expect(validateContentPack(seal(pack)).issues).toContainEqual({
      path: 'questions.0.answer.rubric',
      message: 'Comprehensive rubric points (9) must equal maxScore (10).',
    });
  });

  it('rejects obvious placeholders in verified content', () => {
    const pack = createPack();
    const question = pack.questions[0]!;
    question.reviewStatus = 'verified';
    question.stem = [{ type: 'text', text: '图示选项 A，请查看原卷第 1 页' }];
    question.explanation = [{ id: 'e1', title: 'explanation', content: [{ type: 'text', text: '内容待核对' }] }];

    const issues = validateContentPack(seal(pack)).issues.filter((issue) => issue.message.includes('placeholder'));
    expect(issues).toHaveLength(2);
  });
});

describe('source image crop schema', () => {
  it('accepts normalized crop rectangles and positive source dimensions', () => {
    expect(contentBlockSchema.safeParse({
      type: 'image',
      assetId: ASSET_ID,
      alt: 'diagram',
      crop: { x: 0.1, y: 0.2, width: 0.4, height: 0.5 },
    }).success).toBe(true);

    const pack = seal(createPack());
    pack.assets.push({
      id: ASSET_ID,
      path: `/content/${PACK_ID}/source/page-1.png`,
      mimeType: 'image/png',
      sha256: 'd'.repeat(64),
      sourcePage: 1,
      width: 1200,
      height: 1800,
    });
    expect(contentPackSchema.safeParse(pack).success).toBe(true);
  });

  it('rejects crop rectangles outside the source image', () => {
    const result = contentBlockSchema.safeParse({
      type: 'image',
      assetId: ASSET_ID,
      alt: 'diagram',
      crop: { x: 0.8, y: 0.2, width: 0.3, height: 0.9 },
    });
    expect(result.success).toBe(false);
  });
});
