import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execute2009Release, publishReleaseArtifactsAtomically } from './release-2009-lib.mjs';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const draftPath = path.join(projectRoot, 'local-data', 'generated', '2009.pack.json');
const releaseDirectory = path.join(projectRoot, 'local-data', 'released');
const releasedPackPath = path.join(releaseDirectory, '2009.pack.json');
const releaseReportPath = path.join(releaseDirectory, '2009.release.json');
const publicRoot = path.join(projectRoot, 'apps', 'web', 'public');

function parseArguments(args) {
  let ledgerPath;
  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    if (argument !== '--ledger') throw new Error(`Unknown argument: ${argument}`);
    if (ledgerPath !== undefined) throw new Error('--ledger may only be provided once.');
    const value = args[index + 1];
    if (!value || value.startsWith('--')) throw new Error('--ledger requires a file path.');
    ledgerPath = path.resolve(process.cwd(), value);
    index += 1;
  }
  if (!ledgerPath) {
    throw new Error('Missing required --ledger <path>. Export a 47/47 approved ledger from /review/2009 first.');
  }
  return { ledgerPath };
}

async function main() {
  const { ledgerPath } = parseArguments(process.argv.slice(2));
  const [draftText, ledgerText] = await Promise.all([
    readFile(draftPath, 'utf8'),
    readFile(ledgerPath, 'utf8'),
  ]);

  const release = await execute2009Release({
    draftText,
    ledgerText,
    releasedAt: new Date().toISOString(),
    publicRoot,
    writeArtifacts: (artifacts) => publishReleaseArtifactsAtomically(artifacts, {
      releasedPackPath,
      releaseReportPath,
    }),
  });

  console.log(`PASS ${release.report.packId}: 47/47 reviews approved`);
  console.log(`Released pack: ${releasedPackPath}`);
  console.log(`Release report: ${releaseReportPath}`);
  console.log(`Released hash: ${release.report.releasedHash}`);
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Release failed: ${message}`);
  process.exitCode = 1;
});
