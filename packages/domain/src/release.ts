import {
  CONTENT_REVIEW_CHECKS,
  type ContentPack,
  type ContentReviewLedger,
  type ContentReviewRecord,
} from './types';

export interface ContentReleaseGateResult {
  approved: number;
  total: number;
}

function assertRecordCanRelease(record: ContentReviewRecord, pack: ContentPack): void {
  const question = pack.questions.find((entry) => entry.id === record.questionId);
  if (!question) throw new Error(`Review record references unknown question ${record.questionId}.`);
  if (record.packId !== pack.manifest.id) throw new Error(`Review record ${record.questionId} has the wrong pack id.`);
  if (record.packHash !== pack.manifest.sha256) throw new Error(`Review record ${record.questionId} has a stale pack hash.`);
  if (record.questionContentVersion !== question.contentVersion) {
    throw new Error(`Review record ${record.questionId} has a stale question content version.`);
  }
  if (record.decision !== 'approved') throw new Error(`Review record ${record.questionId} is not approved.`);
  if (!record.reviewer.trim() || !record.reviewedAt) {
    throw new Error(`Review record ${record.questionId} is missing reviewer evidence.`);
  }
  if (!CONTENT_REVIEW_CHECKS.every((check) => record.checks[check])) {
    throw new Error(`Review record ${record.questionId} has incomplete checks.`);
  }
}

export function assertContentReviewLedgerCanRelease(
  pack: ContentPack,
  ledger: ContentReviewLedger,
): ContentReleaseGateResult {
  if (pack.manifest.reviewStatus === 'verified') throw new Error('Source pack is already verified.');
  if (ledger.pack.id !== pack.manifest.id) throw new Error('Ledger pack id does not match the source pack.');
  if (ledger.pack.contentVersion !== pack.manifest.contentVersion) {
    throw new Error('Ledger content version does not match the source pack.');
  }
  if (ledger.pack.sha256 !== pack.manifest.sha256) throw new Error('Ledger pack hash does not match the source pack.');
  if (ledger.records.length !== pack.questions.length) {
    throw new Error('Ledger must contain exactly one review record for every question.');
  }

  const recordIds = new Set<string>();
  for (const record of ledger.records) {
    if (recordIds.has(record.questionId)) throw new Error(`Duplicate review record for ${record.questionId}.`);
    recordIds.add(record.questionId);
    assertRecordCanRelease(record, pack);
  }
  for (const question of pack.questions) {
    if (!recordIds.has(question.id)) throw new Error(`Ledger is missing review record ${question.id}.`);
  }

  const expectedSummary = {
    total: pack.questions.length,
    approved: pack.questions.length,
    rejected: 0,
    pending: 0,
    stale: 0,
  };
  for (const [field, value] of Object.entries(expectedSummary)) {
    if (ledger.summary[field as keyof typeof expectedSummary] !== value) {
      throw new Error(`Ledger summary ${field} does not match its review records.`);
    }
  }

  return { approved: pack.questions.length, total: pack.questions.length };
}
