import {
  CONTENT_REVIEW_CHECKS,
  canApproveContentReview,
  summarizeContentReviews,
  type ContentPackManifest,
  type ContentReviewChecks,
  type ContentReviewLedger,
  type ContentReviewRecord,
  type Question,
} from '@408os/domain';
import { z } from 'zod';
import type { UserDatabase } from './databases';

export const CONTENT_REVIEW_SETTING_PREFIX = 'content-review:v1:';

const checksShape = Object.fromEntries(
  CONTENT_REVIEW_CHECKS.map((check) => [check, z.boolean()]),
) as Record<(typeof CONTENT_REVIEW_CHECKS)[number], z.ZodBoolean>;

export const contentReviewRecordSchema = z.object({
  schemaVersion: z.literal(1),
  packId: z.string().min(1),
  packHash: z.string().regex(/^[a-f0-9]{64}$/i),
  questionId: z.string().min(1),
  questionContentVersion: z.string().min(1),
  checks: z.object(checksShape).strict(),
  decision: z.enum(['pending', 'approved', 'rejected']),
  reviewer: z.string(),
  issueNote: z.string(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
  reviewedAt: z.iso.datetime().optional(),
}).strict().superRefine((record, context) => {
  if (record.decision === 'pending' && record.reviewedAt !== undefined) {
    context.addIssue({ code: 'custom', path: ['reviewedAt'], message: 'Pending review cannot have reviewedAt.' });
  }
  if (record.decision === 'approved') {
    if (!canApproveContentReview(record.checks as ContentReviewChecks)) {
      context.addIssue({ code: 'custom', path: ['checks'], message: 'Approval requires every check.' });
    }
    if (!record.reviewer.trim()) {
      context.addIssue({ code: 'custom', path: ['reviewer'], message: 'Approval requires a reviewer.' });
    }
    if (!record.reviewedAt) {
      context.addIssue({ code: 'custom', path: ['reviewedAt'], message: 'Approval requires reviewedAt.' });
    }
  }
  if (record.decision === 'rejected') {
    if (!record.reviewer.trim()) {
      context.addIssue({ code: 'custom', path: ['reviewer'], message: 'Rejection requires a reviewer.' });
    }
    if (!record.issueNote.trim()) {
      context.addIssue({ code: 'custom', path: ['issueNote'], message: 'Rejection requires an issue note.' });
    }
    if (!record.reviewedAt) {
      context.addIssue({ code: 'custom', path: ['reviewedAt'], message: 'Rejection requires reviewedAt.' });
    }
  }
});

export interface ContentReviewScope {
  packId: string;
  packHash: string;
  contentVersion: string;
}

export interface ContentReviewInput extends ContentReviewScope {
  questionId: string;
  questionContentVersion: string;
  checks: ContentReviewChecks;
  reviewer: string;
  issueNote: string;
}

export interface ContentReviewRepository {
  get(scope: ContentReviewScope, questionId: string): Promise<ContentReviewRecord | undefined>;
  list(scope: ContentReviewScope): Promise<ContentReviewRecord[]>;
  saveDraft(input: ContentReviewInput, timestamp: string, expectedUpdatedAt: string | null): Promise<ContentReviewRecord>;
  approve(input: ContentReviewInput, timestamp: string, expectedUpdatedAt: string | null): Promise<ContentReviewRecord>;
  reject(input: ContentReviewInput, timestamp: string, expectedUpdatedAt: string | null): Promise<ContentReviewRecord>;
  exportLedger(manifest: ContentPackManifest, questions: readonly Question[], timestamp: string): Promise<string>;
}

export class ContentReviewConflictError extends Error {
  constructor(message = '复核记录已在另一标签页更新，请重新读取最新复核记录。') {
    super(message);
    this.name = 'ContentReviewConflictError';
  }
}

const encode = (value: string) => encodeURIComponent(value);

export function contentReviewScopePrefix(scope: ContentReviewScope): string {
  return `${CONTENT_REVIEW_SETTING_PREFIX}${encode(scope.packId)}:${scope.packHash}:${encode(scope.contentVersion)}:`;
}

export function contentReviewSettingKey(record: Pick<ContentReviewRecord, 'packId' | 'packHash' | 'questionContentVersion' | 'questionId'>): string {
  return `${contentReviewScopePrefix({
    packId: record.packId,
    packHash: record.packHash,
    contentVersion: record.questionContentVersion,
  })}${encode(record.questionId)}`;
}

export function parseContentReviewRecord(value: unknown): ContentReviewRecord {
  return contentReviewRecordSchema.parse(value) as ContentReviewRecord;
}

export class DexieContentReviewRepository implements ContentReviewRepository {
  constructor(private readonly database: UserDatabase) {}

  async get(scope: ContentReviewScope, questionId: string): Promise<ContentReviewRecord | undefined> {
    const key = `${contentReviewScopePrefix(scope)}${encode(questionId)}`;
    const setting = await this.database.settings.get(key);
    if (!setting) return undefined;
    const record = parseContentReviewRecord(setting.value);
    if (contentReviewSettingKey(record) !== key) throw new Error('Content review setting key does not match its record.');
    return record;
  }

  async list(scope: ContentReviewScope): Promise<ContentReviewRecord[]> {
    const prefix = contentReviewScopePrefix(scope);
    const settings = await this.database.settings.where('key').startsWith(prefix).toArray();
    return settings.map((setting) => {
      const record = parseContentReviewRecord(setting.value);
      if (contentReviewSettingKey(record) !== setting.key) throw new Error('Content review setting key does not match its record.');
      return record;
    });
  }

  saveDraft(input: ContentReviewInput, timestamp: string, expectedUpdatedAt: string | null): Promise<ContentReviewRecord> {
    return this.save(input, 'pending', timestamp, expectedUpdatedAt);
  }

  async approve(input: ContentReviewInput, timestamp: string, expectedUpdatedAt: string | null): Promise<ContentReviewRecord> {
    if (!canApproveContentReview(input.checks)) throw new Error('请完成全部核对项后再通过。');
    if (!input.reviewer.trim()) throw new Error('请填写复核人。');
    return this.save(input, 'approved', timestamp, expectedUpdatedAt);
  }

  async reject(input: ContentReviewInput, timestamp: string, expectedUpdatedAt: string | null): Promise<ContentReviewRecord> {
    if (!input.reviewer.trim()) throw new Error('请填写复核人。');
    if (!input.issueNote.trim()) throw new Error('请记录具体问题后再标记。');
    return this.save(input, 'rejected', timestamp, expectedUpdatedAt);
  }

  async exportLedger(manifest: ContentPackManifest, questions: readonly Question[], timestamp: string): Promise<string> {
    const scope = { packId: manifest.id, packHash: manifest.sha256, contentVersion: manifest.contentVersion };
    const records = await this.list(scope);
    const numberById = new Map(questions.map((question) => [question.id, question.number]));
    records.sort((left, right) => (numberById.get(left.questionId) ?? Number.MAX_SAFE_INTEGER) - (numberById.get(right.questionId) ?? Number.MAX_SAFE_INTEGER));
    const ledger: ContentReviewLedger = {
      schemaVersion: 1,
      pack: { id: manifest.id, contentVersion: manifest.contentVersion, sha256: manifest.sha256 },
      exportedAt: timestamp,
      summary: summarizeContentReviews(questions, new Map(records.map((record) => [record.questionId, record])), manifest),
      records,
    };
    return JSON.stringify(ledger, null, 2);
  }

  private async save(
    input: ContentReviewInput,
    decision: ContentReviewRecord['decision'],
    timestamp: string,
    expectedUpdatedAt: string | null,
  ): Promise<ContentReviewRecord> {
    if (input.contentVersion !== input.questionContentVersion) {
      throw new Error('题目内容版本与题包版本不一致，不能保存复核记录。');
    }
    const scope = { packId: input.packId, packHash: input.packHash, contentVersion: input.contentVersion };
    const key = `${contentReviewScopePrefix(scope)}${encode(input.questionId)}`;
    return this.database.transaction('rw', this.database.settings, this.database.changeLog, async () => {
      const setting = await this.database.settings.get(key);
      const current = setting ? parseContentReviewRecord(setting.value) : undefined;
      if (current && contentReviewSettingKey(current) !== key) {
        throw new Error('Content review setting key does not match its record.');
      }
      if (expectedUpdatedAt === null ? current !== undefined : current?.updatedAt !== expectedUpdatedAt) {
        throw new ContentReviewConflictError();
      }
      const record = parseContentReviewRecord({
        schemaVersion: 1,
        packId: input.packId,
        packHash: input.packHash,
        questionId: input.questionId,
        questionContentVersion: input.questionContentVersion,
        checks: input.checks,
        decision,
        reviewer: input.reviewer.trim(),
        issueNote: input.issueNote.trim(),
        createdAt: current?.createdAt ?? timestamp,
        updatedAt: timestamp,
        ...(decision === 'pending' ? {} : { reviewedAt: timestamp }),
      });
      if (current && Date.parse(record.updatedAt) <= Date.parse(current.updatedAt)) {
        throw new ContentReviewConflictError('复核记录更新时间必须晚于当前版本，请重新读取后再试。');
      }
      await this.database.settings.put({ key, value: record });
      await this.database.changeLog.put({
        id: crypto.randomUUID(),
        entityType: 'setting',
        entityId: key,
        operation: 'put',
        changedAt: timestamp,
      });
      return record;
    });
  }
}
