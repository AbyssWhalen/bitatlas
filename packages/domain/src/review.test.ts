import { describe, expect, it } from 'vitest';
import type { ContentPackManifest, ContentReviewRecord, Question } from './types';
import {
  canApproveContentReview,
  emptyContentReviewChecks,
  isContentReviewCurrent,
  summarizeContentReviews,
} from './review';

const manifest: ContentPackManifest = {
  id: 'cn408-2009',
  schemaVersion: 1,
  contentVersion: '2009.1',
  title: '2009',
  year: 2009,
  questionCount: 1,
  createdAt: '2026-08-05T00:00:00.000Z',
  sha256: 'a'.repeat(64),
  reviewStatus: 'needs-review',
};

const question = {
  id: 'cn408-2009-q01',
  contentVersion: manifest.contentVersion,
} as Question;

const record: ContentReviewRecord = {
  schemaVersion: 1,
  packId: manifest.id,
  packHash: manifest.sha256,
  questionId: question.id,
  questionContentVersion: question.contentVersion,
  checks: Object.fromEntries(['stem', 'options', 'answer', 'explanation', 'rubric', 'assets', 'sources', 'knowledgePoints'].map((check) => [check, true])) as ContentReviewRecord['checks'],
  decision: 'approved',
  reviewer: '个人复核',
  issueNote: '',
  createdAt: '2026-08-07T00:00:00.000Z',
  updatedAt: '2026-08-07T00:00:00.000Z',
  reviewedAt: '2026-08-07T00:00:00.000Z',
};

describe('content review domain', () => {
  it('requires every comparison check before approval', () => {
    const checks = emptyContentReviewChecks();
    expect(canApproveContentReview(checks)).toBe(false);
    expect(canApproveContentReview(record.checks)).toBe(true);
  });

  it('invalidates a decision when the pack hash changes', () => {
    expect(isContentReviewCurrent(record, question, manifest)).toBe(true);
    expect(isContentReviewCurrent(record, question, { ...manifest, sha256: 'b'.repeat(64) })).toBe(false);
  });

  it('summarizes current decisions and reports stale records as pending', () => {
    expect(summarizeContentReviews([question], new Map([[question.id, record]]), manifest)).toEqual({
      total: 1,
      approved: 1,
      rejected: 0,
      pending: 0,
      stale: 0,
    });
    expect(summarizeContentReviews([question], new Map([[question.id, record]]), { ...manifest, sha256: 'b'.repeat(64) })).toEqual({
      total: 1,
      approved: 0,
      rejected: 0,
      pending: 1,
      stale: 1,
    });
  });
});
