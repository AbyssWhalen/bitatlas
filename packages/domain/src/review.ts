import {
  CONTENT_REVIEW_CHECKS,
  type ContentPackManifest,
  type ContentReviewChecks,
  type ContentReviewRecord,
  type ContentReviewSummary,
  type Question,
} from './types';

export function emptyContentReviewChecks(): ContentReviewChecks {
  return Object.fromEntries(CONTENT_REVIEW_CHECKS.map((check) => [check, false])) as ContentReviewChecks;
}

export function canApproveContentReview(checks: ContentReviewChecks): boolean {
  return CONTENT_REVIEW_CHECKS.every((check) => checks[check]);
}

export function isContentReviewCurrent(
  record: ContentReviewRecord,
  question: Question,
  manifest: ContentPackManifest,
): boolean {
  return record.packId === manifest.id
    && record.packHash === manifest.sha256
    && record.questionId === question.id
    && record.questionContentVersion === question.contentVersion;
}

export function summarizeContentReviews(
  questions: readonly Question[],
  recordsByQuestion: ReadonlyMap<string, ContentReviewRecord>,
  manifest: ContentPackManifest,
): ContentReviewSummary {
  let approved = 0;
  let rejected = 0;
  let stale = 0;

  for (const question of questions) {
    const record = recordsByQuestion.get(question.id);
    if (!record) continue;
    if (!isContentReviewCurrent(record, question, manifest)) {
      stale += 1;
      continue;
    }
    if (record.decision === 'approved') approved += 1;
    if (record.decision === 'rejected') rejected += 1;
  }

  return {
    total: questions.length,
    approved,
    rejected,
    pending: questions.length - approved - rejected,
    stale,
  };
}
