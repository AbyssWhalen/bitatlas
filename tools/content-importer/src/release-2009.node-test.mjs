import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import * as fileSystem from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { describe, it } from 'node:test';
import { CONTENT_REVIEW_CHECKS } from '@408os/domain';
import { computeContentPackHash, validateContentPack } from '@408os/content-schema';
import {
  computeTextSha256,
  createVerified2009Release,
  execute2009Release,
  parseContentReviewLedger,
  publishReleaseArtifactsAtomically,
  validateContentPackAssets,
} from './release-2009-lib.mjs';

const timestamp = '2026-08-07T00:00:00.000Z';
const sourcePageFixtures = [
  {
    id: 'cn408-2009-source-questions-page-1',
    path: '/content/cn408-2009/source/questions-1.png',
    bytes: Buffer.from('question source page'),
  },
  {
    id: 'cn408-2009-source-answers-page-1',
    path: '/content/cn408-2009/source/answers-1.png',
    bytes: Buffer.from('answer source page'),
  },
];
const sourceDocument = {
  publisher: 'Test publisher',
  title: 'Test source',
  url: 'https://example.com/2009.pdf',
  fileName: '2009.pdf',
  sha256: 'a'.repeat(64),
  pages: [1],
  locator: 'page 1',
};

function createDraftPack() {
  const contentVersion = '2009.0-draft.test';
  const questions = Array.from({ length: 47 }, (_, index) => {
    const number = index + 1;
    const base = {
      id: `cn408-2009-q${String(number).padStart(2, '0')}`,
      year: 2009,
      number,
      subject: 'data-structures',
      stem: [{ type: 'text', text: `Question ${number}` }],
      explanation: [{ id: 'main', title: 'Explanation', content: [{ type: 'text', text: 'Checked explanation.' }] }],
      hints: [],
      knowledgePointIds: ['data-structures'],
      assetIds: [],
      source: {
        question: sourceDocument,
        answer: sourceDocument,
        crosschecks: [],
        redistribution: 'unknown',
      },
      contentVersion,
      reviewStatus: 'needs-review',
    };
    if (number <= 40) {
      return {
        ...base,
        kind: 'single-choice',
        options: ['A', 'B', 'C', 'D'].map((id) => ({ id, content: [{ type: 'text', text: `Option ${id}` }] })),
        answer: { type: 'choice', optionId: 'A' },
      };
    }
    return {
      ...base,
      kind: 'comprehensive',
      answer: {
        type: 'comprehensive',
        maxScore: 10,
        rubric: [{ id: 'r1', description: 'Complete answer', points: 10 }],
        reference: [{ type: 'text', text: 'Reference answer.' }],
      },
    };
  });
  const pack = {
    manifest: {
      id: 'cn408-2009',
      schemaVersion: 1,
      contentVersion,
      title: '2009 test pack',
      year: 2009,
      questionCount: 47,
      createdAt: timestamp,
      sha256: '',
      reviewStatus: 'needs-review',
    },
    questions,
    knowledgePoints: [{ id: 'data-structures', subject: 'data-structures', name: 'Data structures' }],
    assets: sourcePageFixtures.map((fixture) => ({
      id: fixture.id,
      path: fixture.path,
      mimeType: 'image/png',
      sha256: createHash('sha256').update(fixture.bytes).digest('hex'),
      sourcePage: 1,
      width: 1,
      height: 1,
    })),
  };
  pack.manifest.sha256 = computeContentPackHash(pack);
  return pack;
}

function createApprovedLedger(pack) {
  const checks = Object.fromEntries(CONTENT_REVIEW_CHECKS.map((check) => [check, true]));
  return {
    schemaVersion: 1,
    pack: {
      id: pack.manifest.id,
      contentVersion: pack.manifest.contentVersion,
      sha256: pack.manifest.sha256,
    },
    exportedAt: timestamp,
    summary: { total: 47, approved: 47, rejected: 0, pending: 0, stale: 0 },
    records: pack.questions.map((question, index) => ({
      schemaVersion: 1,
      packId: pack.manifest.id,
      packHash: pack.manifest.sha256,
      questionId: question.id,
      questionContentVersion: question.contentVersion,
      checks,
      decision: 'approved',
      reviewer: index === 0 ? 'Reviewer B' : 'Reviewer A',
      issueNote: '',
      createdAt: timestamp,
      updatedAt: timestamp,
      reviewedAt: timestamp,
    })),
  };
}

function addAsset(pack, assetPath, bytes, digest = createHash('sha256').update(bytes).digest('hex')) {
  pack.assets.push({
    id: `${pack.manifest.id}-source-test-page-1`,
    path: assetPath,
    mimeType: 'image/png',
    sha256: digest,
    sourcePage: 1,
    width: 1,
    height: 1,
  });
  pack.manifest.sha256 = computeContentPackHash(pack);
  return pack;
}

async function withTemporaryDirectory(run) {
  const directory = await fileSystem.mkdtemp(path.join(os.tmpdir(), '408os-release-test-'));
  try {
    return await run(directory);
  } finally {
    await fileSystem.rm(directory, { recursive: true, force: true });
  }
}

async function writeSourcePageFixtures(publicRoot) {
  for (const fixture of sourcePageFixtures) {
    const filePath = path.join(publicRoot, ...fixture.path.slice(1).split('/'));
    await fileSystem.mkdir(path.dirname(filePath), { recursive: true });
    await fileSystem.writeFile(filePath, fixture.bytes);
  }
}

describe('2009 release preparation', () => {
  it('creates a separately hashed verified pack and an auditable report', () => {
    const draft = createDraftPack();
    const ledger = createApprovedLedger(draft);
    const draftSnapshot = structuredClone(draft);
    const ledgerHash = computeTextSha256(JSON.stringify(ledger));
    const release = createVerified2009Release(draft, ledger, { ledgerHash, releasedAt: timestamp });

    assert.deepEqual(draft, draftSnapshot);
    assert.equal(release.pack.manifest.reviewStatus, 'verified');
    assert.ok(release.pack.questions.every((question) => question.reviewStatus === 'verified'));
    assert.notEqual(release.pack.manifest.sha256, draft.manifest.sha256);
    assert.equal(release.pack.manifest.sha256, computeContentPackHash(release.pack));
    assert.equal(validateContentPack(release.pack, { requireVerified: true, enforceExamShape: true }).success, true);
    assert.deepEqual(release.report.reviewers, ['Reviewer A', 'Reviewer B']);
    assert.equal(release.report.draftHash, draft.manifest.sha256);
    assert.equal(release.report.ledgerHash, ledgerHash);
    assert.equal(release.report.releasedHash, release.pack.manifest.sha256);
  });

  it('strictly rejects malformed ledger objects', () => {
    const draft = createDraftPack();
    const ledger = { ...createApprovedLedger(draft), unexpected: true };
    assert.throws(() => parseContentReviewLedger(ledger), /unrecognized key/i);
  });

  it('does not call the output writer when the 47/47 gate fails', async () => {
    const draft = createDraftPack();
    const ledger = createApprovedLedger(draft);
    ledger.records[0].decision = 'rejected';
    ledger.summary = { total: 47, approved: 46, rejected: 1, pending: 0, stale: 0 };
    let writes = 0;

    await assert.rejects(
      execute2009Release({
        draftText: JSON.stringify(draft),
        ledgerText: JSON.stringify(ledger),
        releasedAt: timestamp,
        writeArtifacts: async () => { writes += 1; },
      }),
      /not approved/,
    );
    assert.equal(writes, 0);
  });

  it('validates the draft hash before considering ledger approval', () => {
    const draft = createDraftPack();
    const ledger = createApprovedLedger(draft);
    draft.manifest.title = 'Tampered title';
    ledger.unexpected = true;

    assert.throws(
      () => createVerified2009Release(draft, ledger, { ledgerHash: 'b'.repeat(64), releasedAt: timestamp }),
      /Draft content pack validation failed.*hash/is,
    );
  });

  it('rejects missing assets and false asset digests before writing a release', async () => {
    await withTemporaryDirectory(async (publicRoot) => {
      await writeSourcePageFixtures(publicRoot);
      const bytes = Buffer.from('real image bytes');
      const assetPath = '/content/cn408-2009/source/test.png';
      const diskPath = path.join(publicRoot, 'content', 'cn408-2009', 'source', 'test.png');
      await fileSystem.mkdir(path.dirname(diskPath), { recursive: true });

      const missingDraft = addAsset(createDraftPack(), assetPath, bytes);
      let writes = 0;
      await assert.rejects(
        execute2009Release({
          draftText: JSON.stringify(missingDraft),
          ledgerText: JSON.stringify(createApprovedLedger(missingDraft)),
          releasedAt: timestamp,
          publicRoot,
          writeArtifacts: async () => { writes += 1; },
        }),
        /asset file is missing/i,
      );

      await fileSystem.writeFile(diskPath, bytes);
      const falseDigestDraft = addAsset(createDraftPack(), assetPath, bytes, '0'.repeat(64));
      await assert.rejects(
        execute2009Release({
          draftText: JSON.stringify(falseDigestDraft),
          ledgerText: JSON.stringify(createApprovedLedger(falseDigestDraft)),
          releasedAt: timestamp,
          publicRoot,
          writeArtifacts: async () => { writes += 1; },
        }),
        /asset hash mismatch/i,
      );
      assert.equal(writes, 0);
    });
  });

  it('rejects asset paths outside the exact pack namespace or containing traversal', async () => {
    await withTemporaryDirectory(async (publicRoot) => {
      await writeSourcePageFixtures(publicRoot);
      const bytes = Buffer.from('asset');
      for (const assetPath of [
        '/content/another-pack/source/test.png',
        '/content/cn408-2009/../outside.png',
        '/content/cn408-2009/%2e%2e/outside.png',
      ]) {
        const pack = addAsset(createDraftPack(), assetPath, bytes);
        await assert.rejects(
          validateContentPackAssets(pack, { publicRoot }),
          /asset path.*(?:namespace|traversal)/i,
        );
      }
    });
  });

  it('publishes pack and report together without leaving transaction files', async () => {
    await withTemporaryDirectory(async (directory) => {
      const releasedPackPath = path.join(directory, '2009.pack.json');
      const releaseReportPath = path.join(directory, '2009.release.json');
      const release = { pack: { version: 'new' }, report: { version: 'new' } };

      await publishReleaseArtifactsAtomically(release, { releasedPackPath, releaseReportPath });

      assert.deepEqual(JSON.parse(await fileSystem.readFile(releasedPackPath, 'utf8')), release.pack);
      assert.deepEqual(JSON.parse(await fileSystem.readFile(releaseReportPath, 'utf8')), release.report);
      assert.deepEqual((await fileSystem.readdir(directory)).sort(), ['2009.pack.json', '2009.release.json']);
    });
  });

  it('rolls back both existing artifacts when the second install rename fails', async () => {
    await withTemporaryDirectory(async (directory) => {
      const releasedPackPath = path.join(directory, '2009.pack.json');
      const releaseReportPath = path.join(directory, '2009.release.json');
      await fileSystem.writeFile(releasedPackPath, 'old pack\n');
      await fileSystem.writeFile(releaseReportPath, 'old report\n');
      let renameCalls = 0;
      const failingFileSystem = {
        ...fileSystem,
        rename: async (...args) => {
          renameCalls += 1;
          if (renameCalls === 4) throw new Error('injected second-install failure');
          return fileSystem.rename(...args);
        },
      };

      await assert.rejects(
        publishReleaseArtifactsAtomically(
          { pack: { version: 'new' }, report: { version: 'new' } },
          { releasedPackPath, releaseReportPath, fileSystem: failingFileSystem },
        ),
        /injected second-install failure/,
      );

      assert.equal(await fileSystem.readFile(releasedPackPath, 'utf8'), 'old pack\n');
      assert.equal(await fileSystem.readFile(releaseReportPath, 'utf8'), 'old report\n');
      assert.deepEqual((await fileSystem.readdir(directory)).sort(), ['2009.pack.json', '2009.release.json']);
    });
  });

  it('preserves the old backup when rollback itself cannot restore it', async () => {
    await withTemporaryDirectory(async (directory) => {
      const releasedPackPath = path.join(directory, '2009.pack.json');
      const releaseReportPath = path.join(directory, '2009.release.json');
      await fileSystem.writeFile(releasedPackPath, 'old pack\n');
      await fileSystem.writeFile(releaseReportPath, 'old report\n');
      let renameCalls = 0;
      const failingFileSystem = {
        ...fileSystem,
        rename: async (...args) => {
          renameCalls += 1;
          if (renameCalls === 4) throw new Error('injected install failure');
          if (renameCalls === 5) throw new Error('injected restore failure');
          return fileSystem.rename(...args);
        },
      };

      await assert.rejects(
        publishReleaseArtifactsAtomically(
          { pack: { version: 'new' }, report: { version: 'new' } },
          { releasedPackPath, releaseReportPath, fileSystem: failingFileSystem },
        ),
        /rollback was incomplete.*injected install failure/i,
      );

      assert.equal(await fileSystem.readFile(releasedPackPath, 'utf8'), 'old pack\n');
      const remainingNames = await fileSystem.readdir(directory);
      const reportBackupName = remainingNames.find((name) => name.includes('2009.release.json') && name.endsWith('.bak'));
      assert.ok(reportBackupName, 'the only remaining copy of the old report must be preserved');
      assert.equal(await fileSystem.readFile(path.join(directory, reportBackupName), 'utf8'), 'old report\n');
      assert.ok(remainingNames.every((name) => !name.endsWith('.tmp')));
    });
  });

  it('does not touch existing artifacts when staging the second file fails', async () => {
    await withTemporaryDirectory(async (directory) => {
      const releasedPackPath = path.join(directory, '2009.pack.json');
      const releaseReportPath = path.join(directory, '2009.release.json');
      await fileSystem.writeFile(releasedPackPath, 'old pack\n');
      await fileSystem.writeFile(releaseReportPath, 'old report\n');
      let writeCalls = 0;
      const failingFileSystem = {
        ...fileSystem,
        writeFile: async (...args) => {
          writeCalls += 1;
          if (writeCalls === 2) throw new Error('injected staging failure');
          return fileSystem.writeFile(...args);
        },
      };

      await assert.rejects(
        publishReleaseArtifactsAtomically(
          { pack: { version: 'new' }, report: { version: 'new' } },
          { releasedPackPath, releaseReportPath, fileSystem: failingFileSystem },
        ),
        /injected staging failure/,
      );

      assert.equal(await fileSystem.readFile(releasedPackPath, 'utf8'), 'old pack\n');
      assert.equal(await fileSystem.readFile(releaseReportPath, 'utf8'), 'old report\n');
      assert.deepEqual((await fileSystem.readdir(directory)).sort(), ['2009.pack.json', '2009.release.json']);
    });
  });
});
