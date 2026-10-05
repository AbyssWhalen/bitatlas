import type { ContentPackManifest } from '@408os/domain';

// Presentation evidence from docs/2009-source-audit-2026-10-04.md. This does not
// approve review records or unlock mock exams. Any content change invalidates it.
const sourceAudit2009 = {
  packId: 'cn408-2009',
  year: 2009,
  contentVersion: '2009.0-draft.3',
  sha256: '372a9f91b59501108d17f15815104854469d31fa3b254cc8e36c3f2b72d78bc3',
  questionCount: 47,
  completedAt: '2026-10-05',
} as const;

export function getSourceAudit(manifest: ContentPackManifest | undefined) {
  if (manifest?.id !== sourceAudit2009.packId
    || manifest.year !== sourceAudit2009.year
    || manifest.contentVersion !== sourceAudit2009.contentVersion
    || manifest.sha256 !== sourceAudit2009.sha256
    || manifest.questionCount !== sourceAudit2009.questionCount) return undefined;
  return sourceAudit2009;
}
