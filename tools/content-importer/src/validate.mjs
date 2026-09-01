import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateContentPack } from '@408os/content-schema';
import { validateContentPackAssets } from './release-2009-lib.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const packPath = path.join(root, 'local-data', 'generated', '2009.pack.json');
const metadata = JSON.parse(await readFile(path.join(root, 'content', 'sources', '2009.json'), 'utf8'));
const pack = JSON.parse(await readFile(packPath, 'utf8'));
const result = validateContentPack(pack, { requireVerified: false, enforceExamShape: true });
if (!result.success) {
  console.error(result.issues);
  process.exitCode = 1;
} else {
  await validateContentPackAssets(pack, { publicRoot: path.join(root, 'apps', 'web', 'public') });
  const sources = [metadata.question, metadata.answer, metadata.crosscheck];
  for (const source of sources) {
    const bytes = await readFile(path.join(root, source.localPath));
    const hash = createHash('sha256').update(bytes).digest('hex');
    if (hash !== source.sha256) throw new Error(`Source hash mismatch: ${source.localPath}`);
  }
  const numbers = pack.questions.map((question) => question.number);
  const objective = pack.questions.filter((question) => question.kind === 'single-choice');
  const comprehensive = pack.questions.filter((question) => question.kind === 'comprehensive');
  console.log(`PASS ${pack.manifest.id}: ${numbers.length} questions (${objective.length} objective, ${comprehensive.length} comprehensive)`);
  console.log(`Review status: ${pack.manifest.reviewStatus}; verified ${pack.questions.filter((question) => question.reviewStatus === 'verified').length}/47`);
}
