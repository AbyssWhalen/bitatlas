import { createHash, randomUUID } from 'node:crypto';
import * as nodeFileSystem from 'node:fs/promises';
import path from 'node:path';
import { CONTENT_REVIEW_CHECKS, assertContentReviewLedgerCanRelease } from '@408os/domain';
import { computeContentPackHash, parseContentPack, validateContentPack } from '@408os/content-schema';

const SHA256_PATTERN = /^[a-f0-9]{64}$/i;

function assertRecord(value, path) {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`${path} must be an object.`);
  }
  return value;
}

function assertExactKeys(value, path, required, optional = []) {
  for (const key of required) {
    if (!Object.hasOwn(value, key)) throw new Error(`${path}.${key} is required.`);
  }
  const known = new Set([...required, ...optional]);
  const unknown = Object.keys(value).find((key) => !known.has(key));
  if (unknown) throw new Error(`${path} contains unrecognized key ${unknown}.`);
}

function assertString(value, path, allowEmpty = false) {
  if (typeof value !== 'string' || (!allowEmpty && value.length === 0)) {
    throw new Error(`${path} must be ${allowEmpty ? 'a string' : 'a non-empty string'}.`);
  }
  return value;
}

function assertSha256(value, path) {
  const digest = assertString(value, path);
  if (!SHA256_PATTERN.test(digest)) throw new Error(`${path} must be a SHA-256 digest.`);
  return digest;
}

function assertIsoDateTime(value, path) {
  const dateTime = assertString(value, path);
  const date = new Date(dateTime);
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/u.test(dateTime) || Number.isNaN(date.valueOf())) {
    throw new Error(`${path} must be an ISO 8601 UTC date-time.`);
  }
  return dateTime;
}

function assertCount(value, path) {
  if (!Number.isInteger(value) || value < 0) throw new Error(`${path} must be a non-negative integer.`);
  return value;
}

function parseReviewRecord(input, index) {
  const path = `Review ledger.records.${index}`;
  const record = assertRecord(input, path);
  const required = [
    'schemaVersion', 'packId', 'packHash', 'questionId', 'questionContentVersion', 'checks',
    'decision', 'reviewer', 'issueNote', 'createdAt', 'updatedAt',
  ];
  assertExactKeys(record, path, required, ['reviewedAt']);
  if (record.schemaVersion !== 1) throw new Error(`${path}.schemaVersion must be 1.`);
  assertString(record.packId, `${path}.packId`);
  assertSha256(record.packHash, `${path}.packHash`);
  assertString(record.questionId, `${path}.questionId`);
  assertString(record.questionContentVersion, `${path}.questionContentVersion`);

  const checks = assertRecord(record.checks, `${path}.checks`);
  assertExactKeys(checks, `${path}.checks`, [...CONTENT_REVIEW_CHECKS]);
  for (const check of CONTENT_REVIEW_CHECKS) {
    if (typeof checks[check] !== 'boolean') throw new Error(`${path}.checks.${check} must be a boolean.`);
  }
  if (!['pending', 'approved', 'rejected'].includes(record.decision)) {
    throw new Error(`${path}.decision is invalid.`);
  }
  assertString(record.reviewer, `${path}.reviewer`, true);
  assertString(record.issueNote, `${path}.issueNote`, true);
  assertIsoDateTime(record.createdAt, `${path}.createdAt`);
  assertIsoDateTime(record.updatedAt, `${path}.updatedAt`);
  if (record.reviewedAt !== undefined) assertIsoDateTime(record.reviewedAt, `${path}.reviewedAt`);
  return record;
}

function formatValidationIssues(label, issues) {
  const details = issues.map((issue) => `${issue.path || '<root>'}: ${issue.message}`).join('\n');
  return `${label} validation failed:\n${details}`;
}

export function parseJsonDocument(text, label) {
  try {
    return JSON.parse(text);
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    throw new Error(`${label} is not valid JSON: ${reason}`, { cause: error });
  }
}

export function parseContentReviewLedger(input) {
  const ledger = assertRecord(input, 'Review ledger');
  assertExactKeys(ledger, 'Review ledger', ['schemaVersion', 'pack', 'exportedAt', 'summary', 'records']);
  if (ledger.schemaVersion !== 1) throw new Error('Review ledger.schemaVersion must be 1.');

  const pack = assertRecord(ledger.pack, 'Review ledger.pack');
  assertExactKeys(pack, 'Review ledger.pack', ['id', 'contentVersion', 'sha256']);
  assertString(pack.id, 'Review ledger.pack.id');
  assertString(pack.contentVersion, 'Review ledger.pack.contentVersion');
  assertSha256(pack.sha256, 'Review ledger.pack.sha256');
  assertIsoDateTime(ledger.exportedAt, 'Review ledger.exportedAt');

  const summary = assertRecord(ledger.summary, 'Review ledger.summary');
  assertExactKeys(summary, 'Review ledger.summary', ['total', 'approved', 'rejected', 'pending', 'stale']);
  for (const field of ['total', 'approved', 'rejected', 'pending', 'stale']) {
    assertCount(summary[field], `Review ledger.summary.${field}`);
  }
  if (!Array.isArray(ledger.records)) throw new Error('Review ledger.records must be an array.');
  ledger.records.forEach(parseReviewRecord);
  return ledger;
}

export function computeTextSha256(text) {
  return createHash('sha256').update(text, 'utf8').digest('hex');
}

function resolveAssetFilePath(assetPath, packId, publicRoot) {
  const namespace = `/content/${packId}/`;
  if (typeof assetPath !== 'string' || !assetPath.startsWith(namespace)) {
    throw new Error(`Asset path ${String(assetPath)} is outside the required pack namespace ${namespace}.`);
  }
  if (assetPath.includes('\\') || assetPath.includes('?') || assetPath.includes('#')) {
    throw new Error(`Asset path ${assetPath} contains traversal or URL control characters.`);
  }

  let decodedPath;
  try {
    decodedPath = decodeURIComponent(assetPath);
  } catch (error) {
    throw new Error(`Asset path ${assetPath} is not valid URL path encoding.`, { cause: error });
  }
  if (!decodedPath.startsWith(namespace)) {
    throw new Error(`Asset path ${assetPath} escapes the required pack namespace ${namespace}.`);
  }

  const segments = decodedPath.slice(1).split('/');
  if (segments.some((segment) => segment === '' || segment === '.' || segment === '..')) {
    throw new Error(`Asset path ${assetPath} contains path traversal.`);
  }

  const resolvedRoot = path.resolve(publicRoot);
  const resolvedPath = path.resolve(resolvedRoot, ...segments);
  const relativePath = path.relative(resolvedRoot, resolvedPath);
  if (relativePath === '' || relativePath.startsWith(`..${path.sep}`) || path.isAbsolute(relativePath)) {
    throw new Error(`Asset path ${assetPath} contains path traversal outside the public root.`);
  }
  return resolvedPath;
}

export async function validateContentPackAssets(pack, options = {}) {
  const assets = Array.isArray(pack?.assets) ? pack.assets : [];
  if (assets.length === 0) return;
  if (typeof options.publicRoot !== 'string' || options.publicRoot.length === 0) {
    throw new Error('A publicRoot is required to validate content pack assets.');
  }

  const fileSystem = options.fileSystem ?? nodeFileSystem;
  for (const asset of assets) {
    const filePath = resolveAssetFilePath(asset.path, pack.manifest.id, options.publicRoot);
    let bytes;
    try {
      bytes = await fileSystem.readFile(filePath);
    } catch (error) {
      if (error?.code === 'ENOENT') {
        throw new Error(`Asset file is missing for ${asset.id}: ${asset.path}`, { cause: error });
      }
      throw new Error(`Asset file cannot be read for ${asset.id}: ${asset.path}`, { cause: error });
    }
    const digest = createHash('sha256').update(bytes).digest('hex');
    if (digest !== asset.sha256.toLowerCase()) {
      throw new Error(`Asset hash mismatch for ${asset.id}: ${asset.path}`);
    }
  }
}

async function pathExists(fileSystem, filePath) {
  try {
    await fileSystem.lstat(filePath);
    return true;
  } catch (error) {
    if (error?.code === 'ENOENT') return false;
    throw error;
  }
}

async function tryUnlink(fileSystem, filePath) {
  try {
    await fileSystem.unlink(filePath);
  } catch (error) {
    if (error?.code !== 'ENOENT') throw error;
  }
}

async function cleanupOwnFiles(fileSystem, filePaths) {
  await Promise.allSettled(filePaths.map((filePath) => tryUnlink(fileSystem, filePath)));
}

export async function publishReleaseArtifactsAtomically(release, options) {
  const fileSystem = options.fileSystem ?? nodeFileSystem;
  const releasedPackPath = path.resolve(options.releasedPackPath);
  const releaseReportPath = path.resolve(options.releaseReportPath);
  const directory = path.dirname(releasedPackPath);
  if (path.dirname(releaseReportPath) !== directory) {
    throw new Error('Release pack and report must be published in the same directory.');
  }

  const packText = `${JSON.stringify(release.pack, null, 2)}\n`;
  const reportText = `${JSON.stringify(release.report, null, 2)}\n`;
  const transactionId = `${process.pid}-${randomUUID()}`;
  const artifacts = [
    {
      destination: releasedPackPath,
      temporary: path.join(directory, `.${path.basename(releasedPackPath)}.${transactionId}.tmp`),
      backup: path.join(directory, `.${path.basename(releasedPackPath)}.${transactionId}.bak`),
      text: packText,
      backedUp: false,
      installed: false,
    },
    {
      destination: releaseReportPath,
      temporary: path.join(directory, `.${path.basename(releaseReportPath)}.${transactionId}.tmp`),
      backup: path.join(directory, `.${path.basename(releaseReportPath)}.${transactionId}.bak`),
      text: reportText,
      backedUp: false,
      installed: false,
    },
  ];

  await fileSystem.mkdir(directory, { recursive: true });
  try {
    for (const artifact of artifacts) {
      await fileSystem.writeFile(artifact.temporary, artifact.text, { encoding: 'utf8', flag: 'wx' });
    }
    for (const artifact of artifacts) {
      if (await pathExists(fileSystem, artifact.destination)) {
        await fileSystem.rename(artifact.destination, artifact.backup);
        artifact.backedUp = true;
      }
    }
    for (const artifact of artifacts) {
      await fileSystem.rename(artifact.temporary, artifact.destination);
      artifact.installed = true;
    }
  } catch (error) {
    const rollbackErrors = [];
    for (const artifact of [...artifacts].reverse()) {
      if (artifact.installed) {
        try {
          await tryUnlink(fileSystem, artifact.destination);
        } catch (rollbackError) {
          rollbackErrors.push(rollbackError);
        }
      }
      if (artifact.backedUp) {
        try {
          await fileSystem.rename(artifact.backup, artifact.destination);
        } catch (rollbackError) {
          rollbackErrors.push(rollbackError);
        }
      }
    }
    await cleanupOwnFiles(fileSystem, artifacts.map((artifact) => artifact.temporary));
    if (rollbackErrors.length > 0) {
      throw new AggregateError(
        [error, ...rollbackErrors],
        `Release publication failed and rollback was incomplete: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
    throw error;
  }

  await cleanupOwnFiles(fileSystem, artifacts.flatMap((artifact) => [artifact.temporary, artifact.backup]));
}

function parseAndValidateDraft(input) {
  const validation = validateContentPack(input, { requireVerified: false, enforceExamShape: true });
  if (!validation.success) throw new Error(formatValidationIssues('Draft content pack', validation.issues));

  const pack = parseContentPack(input);
  if (pack.manifest.id !== 'cn408-2009' || pack.manifest.year !== 2009) {
    throw new Error('The 2009 release command only accepts the cn408-2009 content pack.');
  }
  if (pack.questions.length !== 47) throw new Error('The 2009 release gate requires exactly 47 questions.');
  return pack;
}

export function createVerified2009Release(draftInput, ledgerInput, options) {
  const draftPack = parseAndValidateDraft(draftInput);
  const ledger = parseContentReviewLedger(ledgerInput);
  const gate = assertContentReviewLedgerCanRelease(draftPack, ledger);
  if (gate.approved !== 47 || gate.total !== 47) {
    throw new Error(`The 2009 release gate requires 47/47 approvals; received ${gate.approved}/${gate.total}.`);
  }

  const releasedAt = assertIsoDateTime(options.releasedAt, 'releasedAt');
  assertSha256(options.ledgerHash, 'ledgerHash');

  const releasedPack = structuredClone(draftPack);
  releasedPack.manifest.reviewStatus = 'verified';
  for (const question of releasedPack.questions) question.reviewStatus = 'verified';
  releasedPack.manifest.sha256 = computeContentPackHash(releasedPack);

  const releasedValidation = validateContentPack(releasedPack, {
    requireVerified: true,
    enforceExamShape: true,
  });
  if (!releasedValidation.success) {
    throw new Error(formatValidationIssues('Released content pack', releasedValidation.issues));
  }

  const reviewers = [...new Set(ledger.records.map((record) => record.reviewer.trim()))].sort();
  const report = {
    schemaVersion: 1,
    packId: releasedPack.manifest.id,
    contentVersion: releasedPack.manifest.contentVersion,
    questionCount: releasedPack.questions.length,
    draftHash: draftPack.manifest.sha256,
    ledgerHash: options.ledgerHash.toLowerCase(),
    releasedHash: releasedPack.manifest.sha256,
    reviewers,
    releasedAt,
  };

  return { pack: releasedPack, report };
}

export function prepare2009Release(draftText, ledgerText, releasedAt) {
  const draftInput = parseJsonDocument(draftText, 'Draft content pack');
  const draftPack = parseAndValidateDraft(draftInput);
  const ledgerInput = parseJsonDocument(ledgerText, 'Review ledger');
  return createVerified2009Release(draftPack, ledgerInput, {
    ledgerHash: computeTextSha256(ledgerText),
    releasedAt,
  });
}

export async function execute2009Release(input) {
  const release = prepare2009Release(input.draftText, input.ledgerText, input.releasedAt);
  await validateContentPackAssets(release.pack, {
    publicRoot: input.publicRoot,
    fileSystem: input.assetFileSystem,
  });
  await input.writeArtifacts(release);
  return release;
}
