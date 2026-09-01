import { describe, expect, it } from 'vitest';
import { assertContentReviewLedgerCanRelease } from './release';
import { CONTENT_REVIEW_CHECKS, type ContentPack, type ContentReviewLedger } from './types';

const pack = {
  manifest: {
    id: 'cn408-2009',
    schemaVersion: 1,
    contentVersion: '2009.0-draft.2',
    title: '2009',
    year: 2009,
    questionCount: 2,
    createdAt: '2026-08-05T00:00:00.000Z',
    sha256: 'a'.repeat(64),
    reviewStatus: 'needs-review',
  },
  questions: [1, 2].map((number) => ({
    id: `cn408-2009-q0${number}`,
    number,
    contentVersion: '2009.0-draft.2',
    reviewStatus: 'needs-review',
  })),
} as ContentPack;

const allChecks = Object.fromEntries(CONTENT_REVIEW_CHECKS.map((check) => [check, true]));
const ledger = {
  schemaVersion: 1,
  pack: { id: pack.manifest.id, contentVersion: pack.manifest.contentVersion, sha256: pack.manifest.sha256 },
  exportedAt: '2026-08-07T00:00:00.000Z',
  summary: { total: 2, approved: 2, rejected: 0, pending: 0, stale: 0 },
  records: pack.questions.map((question) => ({
    schemaVersion: 1,
    packId: pack.manifest.id,
    packHash: pack.manifest.sha256,
    questionId: question.id,
    questionContentVersion: question.contentVersion,
    checks: allChecks,
    decision: 'approved',
    reviewer: '个人复核',
    issueNote: '',
    createdAt: '2026-08-07T00:00:00.000Z',
    updatedAt: '2026-08-07T00:00:00.000Z',
    reviewedAt: '2026-08-07T00:00:00.000Z',
  })),
} as ContentReviewLedger;

describe('content release gate', () => {
  it('accepts an exact, current, fully approved ledger', () => {
    expect(assertContentReviewLedgerCanRelease(pack, ledger)).toEqual({ approved: 2, total: 2 });
  });

  it('rejects stale, incomplete, duplicated and non-approved records', () => {
    expect(() => assertContentReviewLedgerCanRelease(pack, {
      ...ledger,
      pack: { ...ledger.pack, sha256: 'b'.repeat(64) },
    })).toThrow('hash');
    expect(() => assertContentReviewLedgerCanRelease(pack, {
      ...ledger,
      records: ledger.records.slice(0, 1),
    })).toThrow('exactly one');
    expect(() => assertContentReviewLedgerCanRelease(pack, {
      ...ledger,
      records: [ledger.records[0]!, ledger.records[0]!],
    })).toThrow('Duplicate');
    expect(() => assertContentReviewLedgerCanRelease(pack, {
      ...ledger,
      records: ledger.records.map((record, index) => index === 0 ? { ...record, decision: 'rejected' as const } : record),
    })).toThrow('approved');
  });

  it('does not trust a forged summary or partial checks', () => {
    expect(() => assertContentReviewLedgerCanRelease(pack, {
      ...ledger,
      summary: { ...ledger.summary, approved: 1, pending: 1 },
    })).toThrow('summary');
    expect(() => assertContentReviewLedgerCanRelease(pack, {
      ...ledger,
      records: ledger.records.map((record, index) => index === 0
        ? { ...record, checks: { ...record.checks, assets: false } }
        : record),
    })).toThrow('checks');
  });
});
