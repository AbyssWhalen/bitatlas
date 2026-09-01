import { z } from 'zod';

const sha256Schema = z.string().regex(/^[a-f0-9]{64}$/i, 'Expected a SHA-256 hash.');
const optionIdSchema = z.enum(['A', 'B', 'C', 'D']);
const subjectSchema = z.enum([
  'data-structures',
  'computer-organization',
  'operating-systems',
  'computer-networks',
]);
const reviewStatusSchema = z.enum(['draft', 'needs-review', 'verified']);

const normalizedCropSchema = z
  .object({
    x: z.number().min(0).max(1),
    y: z.number().min(0).max(1),
    width: z.number().positive().max(1),
    height: z.number().positive().max(1),
  })
  .superRefine((crop, context) => {
    if (crop.x + crop.width > 1) {
      context.addIssue({ code: 'custom', path: ['width'], message: 'Crop x + width must not exceed 1.' });
    }
    if (crop.y + crop.height > 1) {
      context.addIssue({ code: 'custom', path: ['height'], message: 'Crop y + height must not exceed 1.' });
    }
  });

export const contentBlockSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('text'), text: z.string().min(1) }),
  z.object({ type: z.literal('math'), expression: z.string().min(1), display: z.boolean().optional() }),
  z.object({ type: z.literal('code'), code: z.string().min(1), language: z.string().min(1).optional() }),
  z.object({
    type: z.literal('image'),
    assetId: z.string().min(1),
    alt: z.string().min(1),
    caption: z.string().min(1).optional(),
    crop: normalizedCropSchema.optional(),
  }),
  z.object({
    type: z.literal('table'),
    headers: z.array(z.string()).min(1),
    rows: z.array(z.array(z.string()).min(1)).min(1),
  }),
]);

const sourceDocumentSchema = z.object({
  publisher: z.string().min(1),
  title: z.string().min(1),
  url: z.url(),
  fileName: z.string().min(1),
  sha256: sha256Schema,
  pages: z.array(z.int().positive()),
  locator: z.string().min(1),
});

const sourceRefSchema = z.object({
  question: sourceDocumentSchema,
  answer: sourceDocumentSchema,
  crosschecks: z.array(sourceDocumentSchema),
  redistribution: z.enum(['unknown', 'allowed', 'restricted']),
});

const choiceAnswerSchema = z.object({ type: z.literal('choice'), optionId: optionIdSchema });
const comprehensiveAnswerSchema = z.object({
  type: z.literal('comprehensive'),
  maxScore: z.number().positive(),
  rubric: z.array(z.object({ id: z.string().min(1), description: z.string().min(1), points: z.number().positive() })),
  reference: z.array(contentBlockSchema),
});

export const questionSchema = z
  .object({
    id: z.string().regex(/^cn408-\d{4}-q\d{2}$/),
    year: z.int().min(2009).max(2100),
    number: z.int().positive(),
    subject: subjectSchema,
    kind: z.enum(['single-choice', 'comprehensive']),
    stem: z.array(contentBlockSchema).min(1),
    options: z
      .array(z.object({ id: optionIdSchema, content: z.array(contentBlockSchema).min(1) }))
      .optional(),
    answer: z.discriminatedUnion('type', [choiceAnswerSchema, comprehensiveAnswerSchema]),
    explanation: z.array(
      z.object({ id: z.string().min(1), title: z.string().min(1), content: z.array(contentBlockSchema).min(1) }),
    ),
    hints: z.array(z.array(contentBlockSchema).min(1)).max(2),
    knowledgePointIds: z.array(z.string().min(1)),
    assetIds: z.array(z.string().min(1)),
    source: sourceRefSchema,
    contentVersion: z.string().min(1),
    reviewStatus: reviewStatusSchema,
  })
  .superRefine((question, context) => {
    if (question.kind === 'single-choice') {
      if (question.answer.type !== 'choice') {
        context.addIssue({ code: 'custom', path: ['answer'], message: 'Choice questions require a choice answer.' });
      }
      if (question.options?.length !== 4 || new Set(question.options.map((option) => option.id)).size !== 4) {
        context.addIssue({ code: 'custom', path: ['options'], message: 'Choice questions require unique A-D options.' });
      }
    }
    if (question.kind === 'comprehensive' && question.answer.type !== 'comprehensive') {
      context.addIssue({ code: 'custom', path: ['answer'], message: 'Comprehensive questions require a rubric answer.' });
    }
  });

export const contentPackSchema = z.object({
  manifest: z.object({
    id: z.string().min(1),
    schemaVersion: z.literal(1),
    contentVersion: z.string().min(1),
    title: z.string().min(1),
    year: z.int().min(2009).max(2100),
    questionCount: z.int().positive(),
    createdAt: z.iso.datetime(),
    sha256: sha256Schema,
    reviewStatus: reviewStatusSchema,
  }),
  questions: z.array(questionSchema).min(1),
  knowledgePoints: z.array(
    z.object({
      id: z.string().min(1),
      subject: subjectSchema,
      name: z.string().min(1),
      parentId: z.string().min(1).optional(),
      description: z.string().min(1).optional(),
    }),
  ),
  assets: z.array(
    z.object({
      id: z.string().min(1),
      path: z.string().min(1),
      mimeType: z.enum(['image/png', 'image/jpeg', 'application/pdf']),
      sha256: sha256Schema,
      sourcePage: z.int().positive(),
      width: z.int().positive().optional(),
      height: z.int().positive().optional(),
    }),
  ),
});
